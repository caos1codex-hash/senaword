import type { AvailableLetter } from '@/constants/letters';

interface TrainingDataFormat {
  format: string;
  version: number;
  exportedAt: string;
  letterCount: number;
  exampleCount: number;
  data: Record<string, number[][]>;
  /**
   * Datos dinámicos (v2): secuencias de features por letra.
   * Cada ejemplo es una secuencia de frames: number[][][] =
   *   ejemplos[letra][ejemploIdx][frameIdx][featureIdx]
   * Opcional para compatibilidad con el JSON v1 actual (solo estático).
   */
  dynamicData?: Record<string, number[][][]>;
}

let _trainingData: TrainingDataFormat | null = null;
let _loading: Promise<TrainingDataFormat> | null = null;

function getBasePath(): string {
  if (typeof window === 'undefined') return '';
  const segments = window.location.pathname.split('/').filter(Boolean);
  if (segments[0] === 'senaword') return '/senaword';
  return '';
}

function serverHint(): string {
  return 'Abre la app desde el servidor local con INICIAR_SENAWORD.bat (http://localhost:3000/senaword), no como archivo.';
}

async function loadTrainingData(): Promise<TrainingDataFormat> {
  if (_trainingData) return _trainingData;
  if (_loading) return _loading;

  const base = getBasePath();
  const url = `${base}/data/senaword-training.json`;
  _loading = (async () => {
    let res: Response;
    try {
      res = await fetch(url);
    } catch {
      _loading = null;
      if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
        throw new Error(serverHint());
      }
      throw new Error(`No se pudo descargar los datos de entrenamiento. Revisa que el servidor local este corriendo. ${serverHint()}`);
    }
    if (!res.ok) {
      _loading = null;
      throw new Error(`No se encontraron los datos de entrenamiento (error ${res.status}). ${serverHint()}`);
    }
    let data: TrainingDataFormat;
    try {
      data = await res.json();
    } catch {
      _loading = null;
      throw new Error('Los datos de entrenamiento están corruptos (JSON inválido). Reinstala el proyecto.');
    }
    if (!data || typeof data.data !== 'object') {
      _loading = null;
      throw new Error('Los datos de entrenamiento estan corruptos. Reinstala el proyecto.');
    }
    _trainingData = data;
    return data;
  })();
  return _loading;
}

function getTrainingData(): TrainingDataFormat {
  if (!_trainingData) {
    throw new Error('Training data not loaded yet. Call loadTrainingData() first.');
  }
  return _trainingData;
}

export async function initializeTrainingData(): Promise<void> {
  await loadTrainingData();
}

export function getAvailableLetters(): AvailableLetter[] {
  return Object.keys(getTrainingData().data).sort() as AvailableLetter[];
}

export function getLetterExamples(letter: string): number[][] {
  const data = getTrainingData().data;
  if (!(letter in data)) return [];
  return data[letter];
}

export function getAllExamples(): Record<string, number[][]> {
  return getTrainingData().data;
}

/**
 * Ejemplos fusionados para el clasificador: estáticos + frames
 * aplanados de los clips dinámicos. Así una palabra entrenada
 * solo con video (ej. HOLA) también tiene media estática y el
 * k-NN la reconoce por forma base; el módulo de movimiento
 * exige además el trazo.
 */
export function getMergedExamples(): Record<string, number[][]> {
  const d = getTrainingData();
  const merged: Record<string, number[][]> = {};
  for (const [k, v] of Object.entries(d.data)) {
    merged[k] = [...v];
  }
  if (d.dynamicData) {
    for (const [k, clips] of Object.entries(d.dynamicData)) {
      if (!Array.isArray(clips)) continue;
      if (!merged[k]) merged[k] = [];
      for (const clip of clips) {
        if (!Array.isArray(clip)) continue;
        for (const frame of clip) {
          if (Array.isArray(frame) && frame.length > 0) merged[k].push(frame);
        }
      }
    }
  }
  return merged;
}

/** Versión segura (no lanza si aún no cargó): para el hook de detección. */
export function tryGetCounts(letter: string): { staticCount: number; dynamicCount: number } {
  try {
    return { staticCount: getExampleCount(letter), dynamicCount: getDynamicExamples(letter).length };
  } catch {
    return { staticCount: 0, dynamicCount: 0 };
  }
}

export function getExampleCount(letter: string): number {
  return getLetterExamples(letter).length;
}

export function getDynamicExamples(letter: string): number[][][] {
  const d = getTrainingData().dynamicData;
  if (!d || !(letter in d)) return [];
  return d[letter];
}

/** ¿La letra tiene al menos 1 ejemplo (estático o dinámico)? */
export function hasTrainingDataFor(letter: string): boolean {
  return getExampleCount(letter) > 0 || getDynamicExamples(letter).length > 0;
}

export function getTotalExamples(): number {
  return getTrainingData().exampleCount;
}

export function getTrainingMetadata(): { format: string; version: number; exportedAt: string; letterCount: number; exampleCount: number } {
  const d = getTrainingData();
  return {
    format: d.format,
    version: d.version,
    exportedAt: d.exportedAt,
    letterCount: d.letterCount,
    exampleCount: d.exampleCount,
  };
}