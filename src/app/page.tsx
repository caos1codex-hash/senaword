'use client';

import { useGameStore } from '@/stores/game-store';
import { HomeScreen } from '@/components/game/home-screen';
import { HowToPlay } from '@/components/game/how-to-play';
import { ModeSelectScreen } from '@/components/game/mode-select';
import { LetterBrowser } from '@/components/game/letter-browser';
import { PracticeScreen } from '@/components/game/practice-screen';
import { ChallengeScreen } from '@/components/game/challenge-screen';
import { ChallengeResultsScreen } from '@/components/game/challenge-results';
import { FreePlayScreen } from '@/components/game/free-play-screen';
import { StatsScreen } from '@/components/game/stats-screen';
import { SettingsScreen } from '@/components/game/settings-screen';
import { TrainScreen } from '@/components/game/train-screen';
import { AnimatePresence, motion } from 'framer-motion';

const gameModes = ['practice', 'challenge', 'free-play'] as const;

export default function Home() {
  const currentScreen = useGameStore((s) => s.currentScreen);

  const showFooter = !gameModes.includes(currentScreen as typeof gameModes[number]);

  return (
    <div className="min-h-screen flex flex-col bg-game-bg">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScreen}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="flex-1 flex flex-col"
        >
          {currentScreen === 'home' && <HomeScreen />}
          {currentScreen === 'how-to-play' && <HowToPlay />}
          {currentScreen === 'mode-select' && <ModeSelectScreen />}
          {currentScreen === 'letter-browser' && <LetterBrowser />}
          {currentScreen === 'practice' && <PracticeScreen />}
          {currentScreen === 'challenge' && <ChallengeScreen />}
          {currentScreen === 'challenge-results' && <ChallengeResultsScreen />}
          {currentScreen === 'free-play' && <FreePlayScreen />}
          {currentScreen === 'stats' && <StatsScreen />}
          {currentScreen === 'settings' && <SettingsScreen />}
          {currentScreen === 'train' && <TrainScreen />}
        </motion.div>
      </AnimatePresence>

      {showFooter && (
        <footer className="mt-auto bg-game-card border-t border-game-border text-game-text-muted text-center text-xs py-3 px-4">
          MÍMICA © 2025 · Aprende Lengua de Señas
        </footer>
      )}
    </div>
  );
}