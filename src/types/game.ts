/** Core game types for MÍMICA */

export type GameScreen =
  | 'home'
  | 'mode-select'
  | 'letter-browser'
  | 'practice'
  | 'challenge'
  | 'free-play'
  | 'challenge-results'
  | 'how-to-play'
  | 'stats'
  | 'settings'
  | 'train'
  | 'themes';

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
  /** True si la seña requiere movimiento (J, Z, Ñ). */
  dynamic?: boolean;
  /** Descripción del movimiento a realizar (solo dinámicas). */
  movement?: string;
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

/** Mano que el usuario quiere usar. 'any' = la primera que se vea. */
export type HandPreference = 'any' | 'left' | 'right';

export interface MotionPoint {
  /** Posición normalizada (0-1) del punto de referencia (muñeca o punta). */
  x: number;
  y: number;
  t: number;
}

export interface MotionSignature {
  /** Recorrido total acumulado (normalizado). */
  pathLength: number;
  /** Desplazamiento neto inicio→fin. */
  displacement: number;
  /** Tamaño del bounding box del trazo. */
  bboxWidth: number;
  bboxHeight: number;
  /** Nº de cambios bruscos de dirección (>60°). */
  directionChanges: number;
  /** Energía de movimiento media por segundo. */
  energy: number;
  /** Duración de la ventana en ms. */
  durationMs: number;
  /** Cobertura: ¿hubo suficiente movimiento? */
  hasMotion: boolean;
}

export interface DynamicResult {
  isDynamic: boolean;
  signature: MotionSignature;
  /** Confianza 0-1 de que el movimiento corresponde a la letra objetivo. */
  motionConfidence: number;
  /** Letra dinámica más probable según el trazo. */
  bestGuess: string | null;
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