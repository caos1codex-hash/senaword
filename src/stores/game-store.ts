import type { GameScreen, GameMode, GameScore, ChallengeState, PracticeState, CameraState, Difficulty, LetterData } from '@/types/game';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AVAILABLE_LETTERS, LETTER_INFO, DIFFICULTY_CONFIG, POINTS_PER_CORRECT } from '@/constants/letters';

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
          const idx = AVAILABLE_LETTERS.indexOf(state.practice.currentLetter as typeof AVAILABLE_LETTERS[number]);
          const nextIdx = (idx + 1) % AVAILABLE_LETTERS.length;
          return {
            practice: { ...defaultPractice, currentLetter: AVAILABLE_LETTERS[nextIdx] },
          };
        }),
      prevPracticeLetter: () =>
        set((state) => {
          const idx = AVAILABLE_LETTERS.indexOf(state.practice.currentLetter as typeof AVAILABLE_LETTERS[number]);
          const prevIdx = (idx - 1 + AVAILABLE_LETTERS.length) % AVAILABLE_LETTERS.length;
          return {
            practice: { ...defaultPractice, currentLetter: AVAILABLE_LETTERS[prevIdx] },
          };
        }),

      // Challenge
      challenge: null,
      startChallenge: (difficulty) => {
        const config = DIFFICULTY_CONFIG[difficulty];
        const letters = get().getLettersForDifficulty(difficulty);
        const shuffled = [...letters].sort(() => Math.random() - 0.5).slice(0, config.letterCount);
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
            return { challenge: { ...state.challenge, isComplete: true }, currentScreen: 'challenge-results' };
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
        if (challenge) {
          state.incrementGamesPlayed();
          state.addPoints(challenge.score.points);
          state.incrementCorrectSigns();
          state.incrementSignsAttempted();
          if (challenge.score.bestStreak > state.bestStreak) {
            state.updateBestStreak(challenge.score.bestStreak);
          }
        }
        set({ challenge: null, currentScreen: 'challenge-results' });
      },

      // Free Play
      freePlayLetter: null,
      freePlayConfidence: 0,
      setFreePlayResult: (letter, confidence) =>
        set({ freePlayLetter: letter, freePlayConfidence: confidence }),

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
        const progress = get().letterProgress[letter];
        return {
          letter: info?.letter || letter,
          description: info?.description || '',
          handshape: info?.handshape || '',
          tip: info?.tip || '',
          learned: progress?.learned || false,
          practiceCount: progress?.practiceCount || 0,
          successCount: progress?.successCount || 0,
        };
      },
      getLettersForDifficulty: (difficulty) => {
        switch (difficulty) {
          case 'easy':
            return AVAILABLE_LETTERS.filter((l) => ['A', 'B', 'C', 'D', 'E', 'S', 'L', 'U', 'V', 'Y'].includes(l));
          case 'medium':
            return AVAILABLE_LETTERS.filter((l) => !['I', 'K', 'P', 'Q', 'R', 'X'].includes(l));
          case 'hard':
            return [...AVAILABLE_LETTERS];
        }
      },
      isLetterLearned: (letter) => get().letterProgress[letter]?.learned || false,
      getLearnedCount: () => Object.values(get().letterProgress).filter((p) => p.learned).length,
    }),
    {
      name: 'mimica-game-storage',
      partialize: (state) => ({
        letterProgress: state.letterProgress,
        totalGamesPlayed: state.totalGamesPlayed,
        totalCorrectSigns: state.totalCorrectSigns,
        totalSignsAttempted: state.totalSignsAttempted,
        bestStreak: state.bestStreak,
        totalPoints: state.totalPoints,
      }),
    }
  )
);