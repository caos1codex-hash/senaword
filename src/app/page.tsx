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
import { ThemeScreen } from '@/components/game/theme-screen';
import { ThemeEffect } from '@/components/game/theme-effect';
import { AnimatePresence, motion } from 'framer-motion';

export default function Home() {
  const currentScreen = useGameStore((s) => s.currentScreen);

  return (
    <div className="aaa-stage min-h-screen flex flex-col">
      <ThemeEffect />
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScreen}
          initial={{ opacity: 0, y: 14, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.99 }}
          transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
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
          {currentScreen === 'themes' && <ThemeScreen />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
