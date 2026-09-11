import type { GameScreen, ChallengeState, PracticeState, CameraState, Difficulty, LetterData, HandPreference } from '@/types/game';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AVAILABLE_LETTERS, LETTER_INFO, DIFFICULTY_CONFIG, POINTS_PER_CORRECT, isDynamicLetter } from '@/constants/letters';

export type CaptureMode = 'foto' | 'video';

function normalizeWord(raw: string): string {
  const PLACEHOLDER = '\u0001';
  // Preserva la Ñ antes de quitar tildes (NFD la descompone en N + ~)
  const withPlaceholder = raw.trim().toUpperCase().replace(/Ñ/g, PLACEHOLDER);
  const cleaned = withPlaceholder
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z \u0001]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 15)
    .trim()
    .replace(/\u0001/g, 'Ñ');
  return cleaned;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface LetterProgress {
  learned: boolean;
  practiceCount: number;
  successCount: number;
}

interface GameStore {
  // Navigation
  currentScreen: GameScreen;
  previousScreen: GameScreen | null;
  navigate: (screen: GameScreen) => void;
  goBack: () => void;

  // Camera
  camera: CameraState;
  setCameraActive: (active: boolean) => void;
  setCameraLoading: (loading: boolean) => void;
  setCameraError: (error: string | null) => void;

  // Practice Mode
  practice: PracticeState;
  startPractice: (letter: string) => void;
  setPracticeResult: (result: { letter: string; confidence: number; isCorrect: boolean } | null) => void;
  setPracticeRecognizing: (recognizing: boolean) => void;
  toggleReference: () => void;
  nextPracticeLetter: () => void;
  prevPracticeLetter: () => void;

  // Challenge Mode
  challenge: ChallengeState | null;
  startChallenge: (difficulty: Difficulty) => void;
  updateChallengeScore: (correct: boolean) => void;
  nextChallengeLetter: () => void;
  pauseChallenge: () => void;
  resumeChallenge: () => void;
  endChallenge: () => void;

  // Free Play
  freePlayLetter: string | null;
  freePlayConfidence: number;
  setFreePlayResult: (letter: string | null, confidence: number) => void;

  // Letter Progress (persisted)
  letterProgress: Record<string, LetterProgress>;
  updateLetterProgress: (letter: string, success: boolean) => void;

  // Custom letter texts (persisted, edited by developers in Train screen)
  letterTextOverrides: Record<string, { description?: string; tip?: string }>;
  updateLetterText: (letter: string, text: { description?: string; tip?: string }) => void;
  resetLetterText: (letter: string) => void;

  // Palabras personalizadas (persisted, creadas en Train screen: ej. HOLA)
  customWords: string[];
  addCustomWord: (raw: string) => string | null;
  removeCustomWord: (word: string) => void;

  // Modo de captura por item (persisted): 'foto' = 1 frame, 'video' = clip 2.5s.
  // Si no hay override, default = video para J/Ñ/Z, foto para el resto.
  captureModes: Record<string, CaptureMode>;
  setCaptureMode: (item: string, mode: CaptureMode) => void;
  getCaptureMode: (item: string) => CaptureMode;
  getAllTrainableItems: () => string[];

  // Tema visual (persisted)
  activeTheme: string;
  setActiveTheme: (name: string) => void;

  // Mano dominante (persisted): qué mano seguir si se ven las dos.
  preferredHand: HandPreference;
  setPreferredHand: (hand: HandPreference) => void;

  // Stats (persisted)
  totalGamesPlayed: number;
  totalCorrectSigns: number;
  totalSignsAttempted: number;
  bestStreak: number;
  totalPoints: number;
  incrementGamesPlayed: () => void;
  incrementCorrectSigns: () => void;
  incrementSignsAttempted: () => void;
  updateBestStreak: (streak: number) => void;
  addPoints: (points: number) => void;

  // Helpers
  getLetterData: (letter: string) => LetterData;
  getLettersForDifficulty: (difficulty: Difficulty) => string[];
  isLetterLearned: (letter: string) => boolean;
  getLearnedCount: () => number;

  // Developer access (session only, never persisted)
  isDeveloper: boolean;
  unlockDeveloper: (password: string) => boolean;
  lockDeveloper: () => void;
}

const defaultCamera: CameraState = {
  isActive: false,
  isLoading: false,
  error: null,
  facingMode: 'user',
};

const defaultPractice: PracticeState = {
  currentLetter: AVAILABLE_LETTERS[0],
  showReference: true,
  attempts: 0,
  lastResult: null,
  isRecognizing: false,
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      // Navigation
      currentScreen: 'home',
      previousScreen: null,
      navigate: (screen) =>
        set((state) => ({
          previousScreen: state.currentScreen,
          currentScreen: screen,
          camera: screen === 'free-play' || screen === 'practice' || screen === 'challenge'
            ? { ...state.camera, isActive: true }
            : { ...state.camera, isActive: false },
        })),
      goBack: () =>
        set((state) => ({
          currentScreen: state.previousScreen || 'home',
          previousScreen: null,
        })),

      // Camera
      camera: defaultCamera,
      setCameraActive: (active) =>
        set((state) => ({ camera: { ...state.camera, isActive: active } })),
      setCameraLoading: (loading) =>
        set((state) => ({ camera: { ...state.camera, isLoading: loading } })),
      setCameraError: (error) =>
        set((state) => ({ camera: { ...state.camera, error } })),

      // Practice
      practice: defaultPractice,
      startPractice: (letter) =>
        set({
          practice: { ...defaultPractice, currentLetter: letter },
          currentScreen: 'practice',
        }),
      setPracticeResult: (result) =>
        set((state) => {
          if (!result) {
            return { practice: { ...state.practice, lastResult: null, isRecognizing: false } };
          }
          const newPractice = {
            ...state.practice,
            lastResult: result,
            attempts: state.practice.attempts + 1,
            isRecognizing: false,
          };
          return {
            practice: newPractice,
          };
        }),
      setPracticeRecognizing: (recognizing) =>
        set((state) => ({ practice: { ...state.practice, isRecognizing: recognizing } })),
      toggleReference: () =>
        set((state) => ({ practice: { ...state.practice, showReference: !state.practice.showReference } })),
      nextPracticeLetter: () =>
        set((state) => {
          const list = [...AVAILABLE_LETTERS, ...state.customWords] as string[];
          const idx = list.indexOf(state.practice.currentLetter);
          const nextIdx = (idx + 1 + list.length) % list.length;
          return {
            practice: { ...defaultPractice, currentLetter: list[nextIdx] },
          };
        }),
      prevPracticeLetter: () =>
        set((state) => {
          const list = [...AVAILABLE_LETTERS, ...state.customWords] as string[];
          const idx = list.indexOf(state.practice.currentLetter);
          const prevIdx = (idx - 1 + list.length) % list.length;
          return {
            practice: { ...defaultPractice, currentLetter: list[prevIdx] },
          };
        }),

      // Challenge
      challenge: null,
      startChallenge: (difficulty) => {
        const config = DIFFICULTY_CONFIG[difficulty];
        const letters = get().getLettersForDifficulty(difficulty);
        const shuffled = shuffleArray(letters).slice(0, config.letterCount);
        set({
          challenge: {
            config,
            currentLetter: shuffled[0],
            timeRemaining: config.timeLimit,
            score: { points: 0, streak: 0, bestStreak: 0, correct: 0, total: 0, accuracy: 0 },
            isPaused: false,
            isComplete: false,
            letters: shuffled,
            letterIndex: 0,
          },
          currentScreen: 'challenge',
          camera: { ...get().camera, isActive: true },
        });
      },
      updateChallengeScore: (correct) =>
        set((state) => {
          if (!state.challenge) return state;
          const score = { ...state.challenge.score };
          score.total += 1;
          if (correct) {
            score.correct += 1;
            score.streak += 1;
            if (score.streak > score.bestStreak) score.bestStreak = score.streak;
            const basePoints = POINTS_PER_CORRECT[state.challenge.config.difficulty];
            let multiplier = 1;
            if (score.streak >= 10) multiplier = 3;
            else if (score.streak >= 5) multiplier = 2;
            else if (score.streak >= 3) multiplier = 1.5;
            score.points += Math.round(basePoints * multiplier);
          } else {
            score.streak = 0;
          }
          score.accuracy = score.total > 0 ? score.correct / score.total : 0;
          return { challenge: { ...state.challenge, score } };
        }),
      nextChallengeLetter: () =>
        set((state) => {
          if (!state.challenge) return state;
          const nextIdx = state.challenge.letterIndex + 1;
          if (nextIdx >= state.challenge.letters.length) {
            // Completar todas las letras también debe guardar stats (antes se perdían).
            // Solo sumar si aún no estaba completo para evitar doble conteo.
            if (state.challenge.isComplete) {
              return { challenge: { ...state.challenge, isComplete: true }, currentScreen: 'challenge-results' };
            }
            return {
              challenge: { ...state.challenge, isComplete: true },
              currentScreen: 'challenge-results',
              totalGamesPlayed: state.totalGamesPlayed + 1,
              totalPoints: state.totalPoints + state.challenge.score.points,
              totalCorrectSigns: state.totalCorrectSigns + state.challenge.score.correct,
              totalSignsAttempted: state.totalSignsAttempted + state.challenge.score.total,
              bestStreak: Math.max(state.bestStreak, state.challenge.score.bestStreak),
            };
          }
          return {
            challenge: {
              ...state.challenge,
              letterIndex: nextIdx,
              currentLetter: state.challenge.letters[nextIdx],
            },
          };
        }),
      pauseChallenge: () =>
        set((state) => ({
          challenge: state.challenge ? { ...state.challenge, isPaused: true } : null,
        })),
      resumeChallenge: () =>
        set((state) => ({
          challenge: state.challenge ? { ...state.challenge, isPaused: false } : null,
        })),
      endChallenge: () => {
        const state = get();
        const challenge = state.challenge;
        if (!challenge || challenge.isComplete) return;
        set({
          challenge: { ...challenge, isComplete: true },
          currentScreen: 'challenge-results',
          totalGamesPlayed: state.totalGamesPlayed + 1,
          totalPoints: state.totalPoints + challenge.score.points,
          totalCorrectSigns: state.totalCorrectSigns + challenge.score.correct,
          totalSignsAttempted: state.totalSignsAttempted + challenge.score.total,
          bestStreak: Math.max(state.bestStreak, challenge.score.bestStreak),
        });
      },

      // Free Play
      freePlayLetter: null,
      freePlayConfidence: 0,
      setFreePlayResult: (letter, confidence) =>
        set({ freePlayLetter: letter, freePlayConfidence: confidence }),

      // Palabras personalizadas
      customWords: [],
      addCustomWord: (raw) => {
        const word = normalizeWord(raw);
        if (word.length < 2) return null;
        // No duplicar letras del abecedario ni palabras existentes
        if ((AVAILABLE_LETTERS as readonly string[]).includes(word)) return null;
        const existing = get().customWords;
        if (existing.includes(word)) return null;
        if (existing.length >= 30) return null;
        set({ customWords: [...existing, word] });
        return word;
      },
      removeCustomWord: (word) =>
        set((state) => {
          const letterProgress = { ...state.letterProgress };
          delete letterProgress[word];
          const letterTextOverrides = { ...state.letterTextOverrides };
          delete letterTextOverrides[word];
          const captureModes = { ...state.captureModes };
          delete captureModes[word];
          return {
            customWords: state.customWords.filter((w) => w !== word),
            letterProgress,
            letterTextOverrides,
            captureModes,
            practice:
              state.practice.currentLetter === word
                ? { ...state.practice, currentLetter: AVAILABLE_LETTERS[0] }
                : state.practice,
          };
        }),

      // Modo de captura
      captureModes: {},
      setCaptureMode: (item, mode) =>
        set((state) => ({ captureModes: { ...state.captureModes, [item]: mode } })),
      getCaptureMode: (item) => {
        const override = get().captureModes[item];
        if (override) return override;
        return isDynamicLetter(item) ? 'video' : 'foto';
      },
      getAllTrainableItems: () => [...AVAILABLE_LETTERS, ...get().customWords] as string[],

      // Tema visual
      activeTheme: 'Clásico',
      setActiveTheme: (name) => set({ activeTheme: name }),

      // Mano dominante
      preferredHand: 'any',
      setPreferredHand: (hand) => set({ preferredHand: hand }),

      // Custom letter texts (developer-defined, override LETTER_INFO)
      letterTextOverrides: {},
      updateLetterText: (letter, text) =>
        set((state) => ({
          letterTextOverrides: {
            ...state.letterTextOverrides,
            [letter]: { ...state.letterTextOverrides[letter], ...text },
          },
        })),
      resetLetterText: (letter) =>
        set((state) => {
          const next = { ...state.letterTextOverrides };
          delete next[letter];
          return { letterTextOverrides: next };
        }),

      // Letter Progress
      letterProgress: {},
      updateLetterProgress: (letter, success) =>
        set((state) => {
          const current = state.letterProgress[letter] || { learned: false, practiceCount: 0, successCount: 0 };
          const newCount = current.practiceCount + 1;
          const newSuccess = current.successCount + (success ? 1 : 0);
          const learned = newSuccess >= 3 && (newSuccess / newCount) >= 0.5;
          return {
            letterProgress: {
              ...state.letterProgress,
              [letter]: { learned, practiceCount: newCount, successCount: newSuccess },
            },
          };
        }),

      // Stats
      totalGamesPlayed: 0,
      totalCorrectSigns: 0,
      totalSignsAttempted: 0,
      bestStreak: 0,
      totalPoints: 0,
      incrementGamesPlayed: () => set((state) => ({ totalGamesPlayed: state.totalGamesPlayed + 1 })),
      incrementCorrectSigns: () => set((state) => ({ totalCorrectSigns: state.totalCorrectSigns + 1 })),
      incrementSignsAttempted: () => set((state) => ({ totalSignsAttempted: state.totalSignsAttempted + 1 })),
      updateBestStreak: (streak) => set({ bestStreak: Math.max(get().bestStreak, streak) }),
      addPoints: (points) => set((state) => ({ totalPoints: state.totalPoints + points })),

      // Helpers
      getLetterData: (letter) => {
        const info = LETTER_INFO[letter];
        const override = get().letterTextOverrides[letter];
        const progress = get().letterProgress[letter];
        const isCustom = get().customWords.includes(letter);
        const captureMode = get().getCaptureMode(letter);
        return {
          letter: info?.letter || letter,
          description:
            override?.description ||
            info?.description ||
            (isCustom ? `Seña personalizada para "${letter}". Entrénala con fotos o video.` : ''),
          handshape: info?.handshape || (isCustom ? 'custom' : ''),
          tip:
            override?.tip ||
            info?.tip ||
            (isCustom ? 'Agrega una descripción desde Entrenar para recordar cómo hacerla.' : ''),
          learned: progress?.learned || false,
          practiceCount: progress?.practiceCount || 0,
          successCount: progress?.successCount || 0,
          dynamic: info?.dynamic ?? captureMode === 'video',
          movement: info?.movement,
        };
      },
      getLettersForDifficulty: (difficulty) => {
        switch (difficulty) {
          case 'easy':
            // Solo estáticas fáciles (sin movimiento para empezar)
            return AVAILABLE_LETTERS.filter((l) => ['A', 'B', 'C', 'D', 'E', 'S', 'L', 'U', 'V', 'Y'].includes(l));
          case 'medium':
            // Estáticas intermedias (excluye difíciles + dinámicas)
            return AVAILABLE_LETTERS.filter((l) => !['I', 'K', 'P', 'Q', 'R', 'X', 'J', 'Ñ', 'Z'].includes(l));
          case 'hard':
            return [...AVAILABLE_LETTERS];
        }
      },
      isLetterLearned: (letter) => get().letterProgress[letter]?.learned || false,
      getLearnedCount: () => Object.values(get().letterProgress).filter((p) => p.learned).length,

      // Developer access (session only: not included in persist partialize)
      isDeveloper: false,
      unlockDeveloper: (password) => {
        if (password.trim().toLowerCase() === 'hola mundo') {
          set({ isDeveloper: true });
          return true;
        }
        return false;
      },
      lockDeveloper: () => set({ isDeveloper: false }),
    }),
    {
      name: 'mimica-game-storage',
      partialize: (state) => ({
        letterProgress: state.letterProgress,
        letterTextOverrides: state.letterTextOverrides,
        customWords: state.customWords,
        captureModes: state.captureModes,
        activeTheme: state.activeTheme,
        preferredHand: state.preferredHand,
        totalGamesPlayed: state.totalGamesPlayed,
        totalCorrectSigns: state.totalCorrectSigns,
        totalSignsAttempted: state.totalSignsAttempted,
        bestStreak: state.bestStreak,
        totalPoints: state.totalPoints,
      }),
    }
  )
);