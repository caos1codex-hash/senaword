import type { HandLandmark, HandPreference } from '@/types/game';

export type HandSide = 'left' | 'right';

export interface PickedHand {
  index: number;
  side: HandSide;
  landmarks: HandLandmark[];
}

/**
 * Lateralidad geométrica: con la palma al frente (selfie sin espejar,
 * como la ve otra persona), la mano DERECHA tiene la punta del pulgar
 * a la DERECHA del meñique, y la IZQUIERDA al revés.
 * No depende de la etiqueta de MediaPipe (que en cámara frontal sale
 * invertida según versión) y funciona igual con cualquier mano porque
 * las features de clasificación son distancias (invariantes al espejo).
 */
export function geometricHandedness(landmarks: HandLandmark[]): HandSide | null {
  if (!landmarks || landmarks.length < 21) return null;
  const dx = landmarks[4].x - landmarks[20].x; // pulgar vs meñique
  if (!Number.isFinite(dx) || Math.abs(dx) < 0.03) return null; // de canto / ambiguo
  return dx > 0 ? 'right' : 'left';
}

/**
 * Etiqueta de MediaPipe corregida para cámara frontal: el fotograma que
 * recibe el modelo es la imagen del sensor sin espejar, así que la
 * etiqueta anatómica llega invertida y hay que voltearla.
 * Solo se usa cuando la geometría no decide (puño de canto, etc.).
 */
export function correctedLabel(raw: unknown): HandSide | null {
  let name = '';
  if (typeof raw === 'string') {
    name = raw;
  } else if (Array.isArray(raw)) {
    const first = raw[0] as { categoryName?: unknown } | undefined;
    if (first && typeof first.categoryName === 'string') name = first.categoryName;
  } else if (raw && typeof raw === 'object' && 'categoryName' in raw) {
    const v = (raw as { categoryName: unknown }).categoryName;
    if (typeof v === 'string') name = v;
  }
  const n = name.toLowerCase();
  if (n !== 'left' && n !== 'right') return null;
  return n === 'left' ? 'right' : 'left';
}

export function resolveHandedness(landmarks: HandLandmark[], rawLabel: unknown): HandSide {
  return geometricHandedness(landmarks) ?? correctedLabel(rawLabel) ?? 'right';
}

/**
 * Elige qué mano seguir cuando se ven 0-2 manos.
 * - 'any': la primera detectada (comportamiento de siempre).
 * - 'left'/'right': la que coincida; si solo está la otra, devuelve
 *   `otherSidePresent` para avisar ("muestra tu mano derecha").
 */
export function selectHand(
  allHands: HandLandmark[][],
  rawLabels: unknown[],
  preferred: HandPreference
): { picked: PickedHand | null; otherSidePresent: HandSide | null } {
  const resolved: PickedHand[] = [];
  for (let i = 0; i < allHands.length; i++) {
    const lm = allHands[i];
    if (!lm || lm.length < 21) continue;
    resolved.push({ index: i, side: resolveHandedness(lm, rawLabels[i]), landmarks: lm });
  }
  if (resolved.length === 0) return { picked: null, otherSidePresent: null };
  if (preferred === 'any') return { picked: resolved[0], otherSidePresent: null };

  const match = resolved.find((h) => h.side === preferred) ?? null;
  if (match) {
    const other = resolved.find((h) => h.side !== preferred)?.side ?? null;
    return { picked: match, otherSidePresent: other };
  }
  return { picked: null, otherSidePresent: resolved[0].side };
}

export function handLabel(side: HandSide): string {
  return side === 'right' ? 'derecha' : 'izquierda';
}
