import type { RecognitionResult } from '@/types/game';

/**
 * Target-aware K-Nearest Neighbors classifier for sign language letter recognition.
 *
 * When a target letter is specified, uses a multi-signal approach:
 * 1. KNN voting among k nearest neighbors
 * 2. Distance-to-mean comparison (target vs. others)
 * 3. Ranking-based check (is target in top-N closest means?)
 * 4. Generous target matching with progressive confidence
 *
 * Returns a RecognitionResult with letter, confidence, and isCorrect flag.
 */

interface ClassifierCache {
  allLetters: string[];
  allFeatures: number[][];
  featureMeans: Map<string, number[]>;
  featureStds: Map<string, number[]>;
  letterCount: number;
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
  const featureStds = new Map<string, number[]>();

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

    // Compute standard deviation for each feature
    const std = new Array(dim).fill(0);
    for (const example of examples) {
      for (let i = 0; i < dim; i++) {
        std[i] += (example[i] - mean[i]) ** 2;
      }
    }
    for (let i = 0; i < dim; i++) {
      std[i] = Math.sqrt(std[i] / examples.length);
    }
    featureStds.set(letter, std);
  }

  return { allLetters, allFeatures, featureMeans, featureStds, letterCount: allLetters.length };
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

/**
 * Weighted Euclidean distance using per-feature standard deviations.
 * Features with higher variance get lower weight (more forgiving).
 */
function weightedDistance(a: number[], b: number[], stds: number[]): number {
  let sum = 0;
  const len = Math.min(a.length, b.length, stds.length);
  for (let i = 0; i < len; i++) {
    const effectiveStd = Math.max(stds[i], 0.01); // Prevent division by zero
    const diff = (a[i] - b[i]) / effectiveStd;
    sum += diff * diff;
  }
  return Math.sqrt(sum / len); // Normalize by dimension
}

interface DistEntry {
  letter: string;
  dist: number;
  weightedDist: number;
}

function getAllDistances(features: number[], cache: ClassifierCache): DistEntry[] {
  const result: DistEntry[] = [];

  for (const [letter, mean] of cache.featureMeans.entries()) {
    const stds = cache.featureStds.get(letter) || mean.map(() => 1);
    result.push({
      letter,
      dist: euclideanDistance(features, mean),
      weightedDist: weightedDistance(features, mean, stds),
    });
  }

  result.sort((a, b) => a.dist - b.dist);
  return result;
}

function findKNNLetter(features: number[], k: number, cache: ClassifierCache): { letter: string; votes: Record<string, number> } {
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

  return { letter: bestLetter, votes };
}

export function classifyFeatures(
  features: number[],
  k: number = 5,
  targetLetter?: string
): RecognitionResult {
  const cache = getCache();
  const allDists = getAllDistances(features, cache);
  const knnResult = findKNNLetter(features, k, cache);

  if (!targetLetter) {
    // No target: just return KNN result
    const targetMean = cache.featureMeans.get(knnResult.letter);
    let conf = 0;
    if (targetMean) {
      const distToPredicted = euclideanDistance(features, targetMean);
      let minOtherDist = Infinity;
      for (const [letter, mean] of cache.featureMeans.entries()) {
        if (letter !== knnResult.letter) {
          const d = euclideanDistance(features, mean);
          if (d < minOtherDist) minOtherDist = d;
        }
      }
      if (minOtherDist < Infinity && distToPredicted + minOtherDist > 0) {
        conf = 1 - (distToPredicted / (distToPredicted + minOtherDist));
      }
    }
    return {
      letter: knnResult.letter,
      confidence: Math.max(0, Math.min(1, conf)),
      isCorrect: false,
      features,
    };
  }

  // === TARGET-AWARE CLASSIFICATION ===
  const targetDist = allDists.find(d => d.letter === targetLetter);
  const targetWeightedDist = targetDist?.weightedDist ?? Infinity;
  const targetEuclDist = targetDist?.dist ?? Infinity;

  // Get the ranking of the target letter among all means
  const targetRank = allDists.findIndex(d => d.letter === targetLetter) + 1; // 1-based
  const totalLetters = allDists.length;

  // Signal 1: Is the target in the top-3 closest means?
  const isTop3 = targetRank <= 3;
  const isTop5 = targetRank <= 5;

  // Signal 2: KNN vote analysis
  const knnTargetVotes = knnResult.votes[targetLetter] || 0;
  const knnTotalVotes = Object.values(knnResult.votes).reduce((a, b) => a + b, 0);
  const knnAgrees = knnResult.letter === targetLetter;
  const knnPartialAgree = knnTargetVotes >= 2; // At least 2 out of K neighbors agree

  // Signal 3: Distance ratio analysis
  const nearestOther = allDists.find(d => d.letter !== targetLetter);
  const nearestOtherDist = nearestOther?.dist ?? Infinity;
  const distRatio = nearestOtherDist > 0.001 ? targetEuclDist / nearestOtherDist : 999;

  // Signal 4: Weighted distance (normalized by per-letter std)
  // A value < 2.0 means the user's hand is within ~2 std devs of the target's mean
  const isWithinStd = targetWeightedDist < 2.5;

  // === MULTI-SIGNAL CORRECTNESS CHECK ===
  // Use multiple signals with generous thresholds

  // Condition A: KNN agrees → very likely correct
  // Condition B: Target is nearest mean AND within 1.5x of second nearest → correct
  // Condition C: KNN partially agrees (2+ votes) AND target in top 3 → correct
  // Condition D: Target in top 2 means AND within reasonable distance → correct
  // Condition E: Target is top-3 AND KNN has at least 1 vote for target AND weighted dist is close → correct

  let isCorrect = false;

  if (knnAgrees) {
    // Strongest signal: KNN says it's the target
    isCorrect = true;
  } else if (targetRank === 1 && distRatio < 1.8) {
    // Target is the closest mean and reasonably closer than alternatives
    isCorrect = true;
  } else if (knnPartialAgree && isTop3) {
    // KNN partially agrees AND target is top-3 closest
    isCorrect = true;
  } else if (targetRank <= 2 && distRatio < 1.5) {
    // Target is 2nd closest and very close to 1st
    isCorrect = true;
  } else if (isTop3 && knnTargetVotes >= 1 && isWithinStd) {
    // Target is top-3, at least 1 KNN vote, and within statistical range
    isCorrect = true;
  } else if (isTop5 && knnPartialAgree && isWithinStd) {
    // More relaxed: top-5, partial KNN agree, within range
    isCorrect = true;
  }

  // === CONFIDENCE CALCULATION ===
  let confidence: number;

  if (isCorrect) {
    // Confidence based on how strong the match is
    if (knnAgrees && targetRank === 1) {
      // Strongest: KNN agrees AND target is nearest mean
      confidence = 0.85 + 0.15 * (1 - Math.min(distRatio, 1));
    } else if (knnAgrees) {
      // Strong: KNN agrees
      confidence = 0.75;
    } else if (targetRank === 1) {
      // Good: target is nearest mean
      confidence = 0.65;
    } else if (isTop3 && knnPartialAgree) {
      // Moderate: top-3 and partial KNN
      confidence = 0.55;
    } else {
      // Weaker but still accepted
      confidence = 0.45;
    }

    // Bonus for very close distance ratio
    if (distRatio < 0.8) confidence = Math.min(1, confidence + 0.1);
    // Bonus for weighted distance being very close
    if (targetWeightedDist < 1.5) confidence = Math.min(1, confidence + 0.05);
  } else {
    // Not correct - return what KNN thinks
    confidence = 0;
  }

  return {
    letter: isCorrect ? targetLetter : knnResult.letter,
    confidence: Math.max(0, Math.min(1, confidence)),
    isCorrect,
    features,
  };
}

export function clearClassifierCache(): void {
  _cache = null;
}