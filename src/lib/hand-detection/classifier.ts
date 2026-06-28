import type { RecognitionResult } from '@/types/game';

/**
 * K-Nearest Neighbors classifier for sign language letter recognition.
 *
 * Compares extracted feature vectors against training data using
 * Euclidean distance and returns the most likely letter with confidence.
 */

interface ClassifierCache {
  allLetters: string[];
  allFeatures: number[][];
  featureMeans: Map<string, number[]>;
}

let _cache: ClassifierCache | null = null;

function buildCache(data: Record<string, number[][]>): ClassifierCache {
  const allLetters: string[] = [];
  const allFeatures: number[][] = [];

  for (const [letter, examples] of Object.entries(data)) {
    for (const example of examples) {
      allLetters.push(letter);
      allFeatures.push(example);
    }
  }

  const featureMeans = new Map<string, number[]>();
  for (const [letter, examples] of Object.entries(data)) {
    if (examples.length === 0) continue;
    const dim = examples[0].length;
    const mean = new Array(dim).fill(0);
    for (const example of examples) {
      for (let i = 0; i < dim; i++) {
        mean[i] += example[i] / examples.length;
      }
    }
    featureMeans.set(letter, mean);
  }

  return { allLetters, allFeatures, featureMeans };
}

export function initializeClassifier(data: Record<string, number[][]>): void {
  _cache = buildCache(data);
}

export function isClassifierReady(): boolean {
  return _cache !== null;
}

function getCache(): ClassifierCache {
  if (!_cache) {
    throw new Error('Classifier not initialized. Call initializeClassifier() with training data first.');
  }
  return _cache;
}

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export function classifyFeatures(
  features: number[],
  k: number = 5,
  targetLetter?: string
): RecognitionResult {
  const cache = getCache();

  if (targetLetter) {
    const targetMean = cache.featureMeans.get(targetLetter);
    if (targetMean) {
      const distToTarget = euclideanDistance(features, targetMean);

      // Find distances to ALL other letter means, sorted
      const otherDists: { letter: string; dist: number }[] = [];
      for (const [letter, mean] of cache.featureMeans.entries()) {
        if (letter !== targetLetter) {
          otherDists.push({ letter, dist: euclideanDistance(features, mean) });
        }
      }
      otherDists.sort((a, b) => a.dist - b.dist);

      // Use 2nd-nearest mean to avoid single-outlier false negatives
      const nearestOther = otherDists[0]?.dist ?? Infinity;
      const secondOther = otherDists[1]?.dist ?? nearestOther;
      const minOtherDist = (nearestOther + secondOther) / 2;

      // Also check KNN vote for the target
      const knnLetter = findNearestLetter(features, k, cache);
      const knnAgrees = knnLetter === targetLetter;

      // More generous correct check: target closer OR KNN agrees with small margin
      const isCorrect = distToTarget < minOtherDist * 1.3 || (knnAgrees && distToTarget < nearestOther * 1.5);

      // Confidence with boost when KNN agrees
      let confidence: number;
      if (isCorrect) {
        confidence = 1 - (distToTarget / (distToTarget + minOtherDist));
        if (knnAgrees) confidence = Math.min(1, confidence + 0.15);
        // Minimum confidence floor for correct detections
        confidence = Math.max(confidence, 0.35);
      } else {
        confidence = Math.max(0, 1 - (nearestOther / (distToTarget + nearestOther)));
      }

      return {
        letter: isCorrect ? targetLetter : knnLetter,
        confidence: Math.max(0, Math.min(1, confidence)),
        isCorrect,
        features,
      };
    }
  }

  const letter = findNearestLetter(features, k, cache);
  const conf = computeConfidence(features, letter, cache);

  return {
    letter,
    confidence: conf,
    isCorrect: false,
    features,
  };
}

function findNearestLetter(features: number[], k: number, cache: ClassifierCache): string {
  const distances: { letter: string; dist: number }[] = [];
  for (let i = 0; i < cache.allFeatures.length; i++) {
    distances.push({
      letter: cache.allLetters[i],
      dist: euclideanDistance(features, cache.allFeatures[i]),
    });
  }

  distances.sort((a, b) => a.dist - b.dist);
  const kNearest = distances.slice(0, k);

  const votes: Record<string, number> = {};
  for (const item of kNearest) {
    votes[item.letter] = (votes[item.letter] || 0) + 1;
  }

  let bestLetter = '';
  let bestVotes = 0;
  for (const [letter, count] of Object.entries(votes)) {
    if (count > bestVotes) {
      bestVotes = count;
      bestLetter = letter;
    }
  }

  return bestLetter;
}

function computeConfidence(features: number[], predictedLetter: string, cache: ClassifierCache): number {
  const targetMean = cache.featureMeans.get(predictedLetter);
  if (!targetMean) return 0;

  const distToTarget = euclideanDistance(features, targetMean);

  let minOtherDist = Infinity;
  for (const [letter, mean] of cache.featureMeans.entries()) {
    if (letter !== predictedLetter) {
      const d = euclideanDistance(features, mean);
      if (d < minOtherDist) minOtherDist = d;
    }
  }

  if (minOtherDist === Infinity || distToTarget + minOtherDist === 0) return 0;

  return Math.max(0, Math.min(1, 1 - (distToTarget / (distToTarget + minOtherDist))));
}

export function clearClassifierCache(): void {
  _cache = null;
}