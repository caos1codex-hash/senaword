import type { LetterData, Difficulty, ChallengeConfig } from '@/types/game';

export const AVAILABLE_LETTERS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K',
  'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U',
  'V', 'W', 'X', 'Y',
] as const;

export type AvailableLetter = (typeof AVAILABLE_LETTERS)[number];

export const LETTER_INFO: Record<string, Omit<LetterData, 'learned' | 'practiceCount' | 'successCount'>> = {
  A: {
    letter: 'A',
    description: 'Puño cerrado con el pulgar extendido hacia un lado',
    handshape: 'fist-thumb-side',
    tip: 'Mantén los dedos cerrados y el pulgar paralelo al índice.',
  },
  B: {
    letter: 'B',
    description: 'Mano abierta con los dedos juntos y el pulgar doblado',
    handshape: 'flat-hand-thumb-tucked',
    tip: 'Extiende los cuatro dedos y dobla el pulgar sobre la palma.',
  },
  C: {
    letter: 'C',
    description: 'Mano en forma de C curvando los dedos',
    handshape: 'c-curve',
    tip: 'Curva todos los dedos como si sostuvieras una taza pequeña.',
  },
  D: {
    letter: 'D',
    description: 'Índice extendido hacia arriba, otros dedos tocando el pulgar',
    handshape: 'point-up-touch',
    tip: 'Extiende solo el índice. El pulgar toca la punta del meñique.',
  },
  E: {
    letter: 'E',
    description: 'Todos los dedos curvados hacia abajo, pulgar debajo',
    handshape: 'claw-down',
    tip: 'Curva todos los dedos hacia la palma con el pulgar envolviendo.',
  },
  F: {
    letter: 'F',
    description: 'Índice y pulgar forman un círculo, otros tres extendidos',
    handshape: 'ok-three-up',
    tip: 'Une la punta del pulgar y el índice. Extiende medio, anular y meñique.',
  },
  G: {
    letter: 'G',
    description: 'Índice y pulgar apuntando al frente, paralelos',
    handshape: 'gun-horizontal',
    tip: 'Extiende índice y pulgar hacia adelante, como apuntando.',
  },
  H: {
    letter: 'H',
    description: 'Índice y medio extendidos hacia un lado, paralelos',
    handshape: 'two-fingers-side',
    tip: 'Extiende índice y medio juntos hacia un lado.',
  },
  I: {
    letter: 'I',
    description: 'Solo el meñique extendido hacia arriba',
    handshape: 'pinky-up',
    tip: 'Cierra todos los dedos excepto el meñique, que apunta hacia arriba.',
  },
  K: {
    letter: 'K',
    description: 'Índice y medio en V, pulgar entre medio',
    handshape: 'v-thumb-between',
    tip: 'Forma una V con índice y medio, con el pulgar entre ellos.',
  },
  L: {
    letter: 'L',
    description: 'Pulgar e índice forman una L',
    handshape: 'l-shape',
    tip: 'Extiende el pulgar a un lado y el índice hacia arriba.',
  },
  M: {
    letter: 'M',
    description: 'Tres dedos sobre el pulgar doblado',
    handshape: 'three-over-thumb',
    tip: 'Coloca los tres primeros dedos doblados sobre el pulgar.',
  },
  N: {
    letter: 'N',
    description: 'Dos dedos sobre el pulgar doblado',
    handshape: 'two-over-thumb',
    tip: 'Coloca índice y medio doblados sobre el pulgar.',
  },
  O: {
    letter: 'O',
    description: 'Todos los dedos curvados formando una O',
    handshape: 'o-curve',
    tip: 'Curva todos los dedos y el pulgar para formar una O redonda.',
  },
  P: {
    letter: 'P',
    description: 'Como K pero apuntando hacia abajo',
    handshape: 'k-pointing-down',
    tip: 'Como la K pero con los dedos apuntando hacia abajo.',
  },
  Q: {
    letter: 'Q',
    description: 'Como G pero apuntando hacia abajo',
    handshape: 'g-pointing-down',
    tip: 'Como la G pero con los dedos apuntando hacia abajo.',
  },
  R: {
    letter: 'R',
    description: 'Índice y medio cruzados',
    handshape: 'crossed-fingers',
    tip: 'Cruza el dedo medio sobre el índice.',
  },
  S: {
    letter: 'S',
    description: 'Puño cerrado con el pulgar sobre los dedos',
    handshape: 'fist-thumb-over',
    tip: 'Cierra la mano en puño con el pulgar cruzado sobre los dedos.',
  },
  T: {
    letter: 'T',
    description: 'Pulgar entre índice y medio',
    handshape: 'thumb-between-fingers',
    tip: 'Meté el pulgar entre el índice y el medio doblados.',
  },
  U: {
    letter: 'U',
    description: 'Índice y medio extendidos juntos hacia arriba',
    handshape: 'two-fingers-up',
    tip: 'Extiende el índice y el medio juntos hacia arriba.',
  },
  V: {
    letter: 'V',
    description: 'Índice y medio extendidos en V',
    handshape: 'v-shape',
    tip: 'Separa el índice y el medio formando una V.',
  },
  W: {
    letter: 'W',
    description: 'Índice, medio y anular extendidos separados',
    handshape: 'three-fingers-spread',
    tip: 'Extiende tres dedos separados como una W.',
  },
  X: {
    letter: 'X',
    description: 'Índice doblado como un gancho',
    handshape: 'hook-index',
    tip: 'Dobla solo el índice como un gancho, los demás cerrados.',
  },
  Y: {
    letter: 'Y',
    description: 'Pulgar y meñique extendidos',
    handshape: 'thumb-pinky-out',
    tip: 'Extiende el pulgar y el meñique, cierra los demás.',
  },
};

export const DIFFICULTY_CONFIG: Record<Difficulty, ChallengeConfig> = {
  easy: {
    difficulty: 'easy',
    timeLimit: 60,
    letterCount: 5,
    targetScore: 100,
  },
  medium: {
    difficulty: 'medium',
    timeLimit: 45,
    letterCount: 10,
    targetScore: 250,
  },
  hard: {
    difficulty: 'hard',
    timeLimit: 30,
    letterCount: 15,
    targetScore: 500,
  },
};

export const POINTS_PER_CORRECT: Record<Difficulty, number> = {
  easy: 10,
  medium: 25,
  hard: 50,
};

export const STREAK_MULTIPLIER = {
  3: 1.5,
  5: 2,
  10: 3,
} as const;

export const RECOGNITION_THRESHOLD = 0.5;
export const CONFIDENCE_REQUIRED = 0.40;

export const GAME_COLORS = {
  primary: '#0D9488',
  primaryLight: '#14B8A6',
  primaryDark: '#0F766E',
  accent: '#F97316',
  accentLight: '#FB923C',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#EAB308',
  bgDark: '#0F172A',
  bgCard: '#1E293B',
  bgCardHover: '#334155',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  border: '#334155',
} as const;