'use client';

import type { HandLandmark, MotionPoint, MotionSignature, DynamicResult } from '@/types/game';
import { MOTION_CONFIG } from '@/constants/letters';

/**
 * Tracker de movimiento para letras dinámicas (J, Ñ, Z).
 *
 * Idea: NO grabar video de 3s para todas las letras.
 * - Estáticas: 1 frame → 17 features → k-NN (rápido, liviano).
 * - Dinámicas: ventana ~2.2s de posiciones (muñeca + punta índice)
 *   → firma de movimiento (recorrido, desplazamiento, cambios de dirección).
 *
 * Solo guardamos puntos (x, y, t), no video: privado y liviano.
 */

function dist2D(a: MotionPoint, b: MotionPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function getMotionSignature(points: MotionPoint[]): MotionSignature {
  if (!points || points.length < 2) {
    return {
      pathLength: 0,
      displacement: 0,
      bboxWidth: 0,
      bboxHeight: 0,
      directionChanges: 0,
      energy: 0,
      durationMs: 0,
      hasMotion: false,
    };
  }

  const first = points[0];
  const last = points[points.length - 1];
  let pathLength = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  for (let i = 1; i < points.length; i++) {
    pathLength += dist2D(points[i - 1], points[i]);
  }

  const displacement = dist2D(first, last);
  const durationMs = last.t - first.t;
  const durationSec = Math.max(durationMs / 1000, 0.1);
  const energy = pathLength / durationSec;

  // Cambios de dirección: ángulo entre segmentos consecutivos > 60°
  let directionChanges = 0;
  for (let i = 2; i < points.length; i++) {
    const ax = points[i - 1].x - points[i - 2].x;
    const ay = points[i - 1].y - points[i - 2].y;
    const bx = points[i].x - points[i - 1].x;
    const by = points[i].y - points[i - 1].y;
    const magA = Math.sqrt(ax * ax + ay * ay);
    const magB = Math.sqrt(bx * bx + by * by);
    if (magA < 0.004 || magB < 0.004) continue; // ruido
    const cos = (ax * bx + ay * by) / (magA * magB);
    const clamped = Math.max(-1, Math.min(1, cos));
    const angle = (Math.acos(clamped) * 180) / Math.PI;
    if (angle > 60) directionChanges++;
  }

  const hasMotion =
    points.length >= MOTION_CONFIG.minPoints &&
    pathLength >= MOTION_CONFIG.minPathLength &&
    (displacement >= MOTION_CONFIG.minDisplacement || directionChanges >= 1);

  return {
    pathLength,
    displacement,
    bboxWidth: maxX - minX,
    bboxHeight: maxY - minY,
    directionChanges,
    energy,
    durationMs,
    hasMotion,
  };
}

/**
 * Heurística por letra sobre la firma de movimiento.
 * Devuelve confianza 0-1. Diseñada para ser generosa (el juego
 * combina esto con la forma estática base vía k-NN).
 */
function motionConfidenceFor(letter: string, sig: MotionSignature): number {
  if (!sig.hasMotion) return 0;

  switch (letter) {
    case 'Z': {
      // Zigzag: recorrido largo + al menos 2 giros bruscos + ancho dominante
      let c = 0.3;
      if (sig.directionChanges >= 2) c += 0.35;
      else if (sig.directionChanges === 1) c += 0.15;
      if (sig.pathLength > 0.25) c += 0.2;
      else if (sig.pathLength > 0.15) c += 0.1;
      if (sig.bboxWidth > 0.08) c += 0.15;
      return Math.min(1, c);
    }
    case 'J': {
      // Gancho/J: recorrido medio, desplazamiento vertical, 0-1 giros
      // (curva suave, no zigzag)
      let c = 0.3;
      if (sig.pathLength > 0.15 && sig.pathLength < 0.8) c += 0.25;
      else if (sig.pathLength >= 0.12) c += 0.12;
      if (sig.bboxHeight > 0.08) c += 0.2;
      if (sig.directionChanges <= 2) c += 0.15;
      if (sig.directionChanges >= 3) c -= 0.25; // parece Z, no J
      return Math.max(0, Math.min(1, c));
    }
    case 'Ñ': {
      // Vaivén: oscilaciones laterales, varios giros pequeños,
      // desplazamiento neto bajo pero recorrido alto
      let c = 0.3;
      if (sig.directionChanges >= 2) c += 0.3;
      else if (sig.directionChanges === 1) c += 0.12;
      if (sig.bboxWidth > 0.06) c += 0.2;
      if (sig.displacement < sig.pathLength * 0.5) c += 0.1; // va y vuelve
      return Math.min(1, c);
    }
    default:
      return 0;
  }
}

export function classifyDynamicLetter(
  points: MotionPoint[],
  targetLetter?: string
): DynamicResult {
  const signature = getMotionSignature(points);
  const candidates = ['J', 'Ñ', 'Z'];

  let bestGuess: string | null = null;
  let bestConf = 0;
  const confs: Record<string, number> = {};
  for (const c of candidates) {
    const v = motionConfidenceFor(c, signature);
    confs[c] = v;
    if (v > bestConf) {
      bestConf = v;
      bestGuess = c;
    }
  }

  const motionConfidence = targetLetter ? (confs[targetLetter] ?? 0) : bestConf;

  return {
    isDynamic: true,
    signature,
    motionConfidence,
    bestGuess: motionConfidence > 0.25 ? (targetLetter ?? bestGuess) : bestGuess,
  };
}

/**
 * Buffer circular de posiciones para la ventana de movimiento.
 * Uso: push() cada frame detectado (~11fps), window() para clasificar.
 */
export class MotionTracker {
  private points: MotionPoint[] = [];
  private readonly windowMs: number;

  constructor(windowMs: number = MOTION_CONFIG.windowMs) {
    this.windowMs = windowMs;
  }

  push(landmarks: HandLandmark[], now: number = performance.now()): void {
    if (!landmarks || landmarks.length < 21) return;
    // Punto de referencia: promedio muñeca (0) + punta índice (8).
    // La muñeca da el trazo global, el índice capta el dibujo fino.
    const wrist = landmarks[0];
    const indexTip = landmarks[8];
    const x = (wrist.x + indexTip.x) / 2;
    const y = (wrist.y + indexTip.y) / 2;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    const last = this.points[this.points.length - 1];
    // Evita duplicados cuando la mano está quieta (ahorra memoria y ruido)
    if (last && Math.abs(last.x - x) < 0.002 && Math.abs(last.y - y) < 0.002) {
      return;
    }
    this.points.push({ x, y, t: now });
    this.prune(now);
  }

  /** Movimiento decaído: si no hay mano, envejece la ventana. */
  decay(noHand: boolean): void {
    if (noHand && this.points.length > 0) {
      // Elimina puntos viejos agresivamente cuando se pierde la mano
      const now = performance.now();
      this.points = this.points.filter((p) => now - p.t < this.windowMs / 2);
    }
  }

  reset(): void {
    this.points = [];
  }

  window(): MotionPoint[] {
    return [...this.points];
  }

  get pointCount(): number {
    return this.points.length;
  }

  private prune(now: number): void {
    const cutoff = now - this.windowMs;
    let drop = 0;
    while (drop < this.points.length && this.points[drop].t < cutoff) drop++;
    if (drop > 0) this.points.splice(0, drop);
    // Seguridad: nunca más de 60 puntos (~5.5s a 11fps)
    if (this.points.length > 60) {
      this.points.splice(0, this.points.length - 60);
    }
  }
}
