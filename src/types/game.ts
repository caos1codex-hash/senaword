/** Core game types for MÍMICA */

export type GameScreen =
  | 'home'
  | 'mode-select'
  | 'letter-browser'
  | 'practice'
  | 'challenge'
  | 'free-play'
  | 'challenge-results'
  | 'how-to-play';

export type GameMode = 'practice' | 'challenge' | 'free-play';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface LetterData {
  letter: string;
  description: string;
  handshape: string;
  tip: string;
  learned: boolean;
  practiceCount: number;
  successCount: number;
}

export interface RecognitionResult {
  letter: string;
  confidence: number;
  isCorrect: boolean;
  features?: number[];
}

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface DetectedHand {
  landmarks: HandLandmark[];
  handedness: 'left' | 'right' | 'unknown';
  features: number[];
}

export interface GameScore {
  points: number;
  streak: number;
  bestStreak: number;
  correct: number;
  total: number;
  accuracy: number;
}

export interface ChallengeConfig {
  difficulty: Difficulty;
  timeLimit: number;
  letterCount: number;
  targetScore: number;
}

export interface ChallengeState {
  config: ChallengeConfig;
  currentLetter: string;
  timeRemaining: number;
  score: GameScore;
  isPaused: boolean;
  isComplete: boolean;
  letters: string[];
  letterIndex: number;
}

export interface PracticeState {
  currentLetter: string;
  showReference: boolean;
  attempts: number;
  lastResult: RecognitionResult | null;
  isRecognizing: boolean;
}

export type GameStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'complete';

export interface CameraState {
  isActive: boolean;
  isLoading: boolean;
  error: string | null;
  facingMode: 'user' | 'environment';
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  color: string;
  size: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}