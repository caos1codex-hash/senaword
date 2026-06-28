import type { AvailableLetter } from '@/constants/letters';

interface TrainingDataFormat {
  format: string;
  version: number;
  exportedAt: string;
  letterCount: number;
  exampleCount: number;
  data: Record<string, number[][]>;
}

let _trainingData: TrainingDataFormat | null = null;
let _loading: Promise<TrainingDataFormat> | null = null;

async function loadTrainingData(): Promise<TrainingDataFormat> {
  if (_trainingData) return _trainingData;
  if (_loading) return _loading;

  _loading = fetch('/data/senaword-training.json')
    .then((res) => res.json())
    .then((data: TrainingDataFormat) => {
      _trainingData = data;
      return data;
    });
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

export function getExampleCount(letter: string): number {
  return getLetterExamples(letter).length;
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