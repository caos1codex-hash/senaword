'use client';

import { motion } from 'framer-motion';
import { BookOpen, Camera, HelpCircle, Trophy, Flame, Gamepad2, BarChart3, Settings, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useGameStore } from '@/stores/game-store';
import { AVAILABLE_LETTERS } from '@/constants/letters';
import { useSoundEffects } from '@/hooks/use-sound-effects';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export function HomeScreen() {
  const navigate = useGameStore((s) => s.navigate);
  const learnedCount = useGameStore((s) => s.getLearnedCount());
  const totalPoints = useGameStore((s) => s.totalPoints);
  const totalGamesPlayed = useGameStore((s) => s.totalGamesPlayed);
  const { playClick } = useSoundEffects();

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 bg-mesh relative">
      {/* Settings button */}
      <motion.div variants={item} className="absolute top-4 right-4">
        <Button
          variant="ghost"
          size="icon"
          className="text-game-text-muted hover:text-game-text-secondary hover:bg-game-card/50"
          onClick={() => { playClick(); navigate('settings'); }}
        >
          <Settings className="w-5 h-5" />
        </Button>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="w-full max-w-md flex flex-col items-center gap-6"
      >
        {/* Animated hand icon */}
        <motion.div
          variants={item}
          className="float-animation text-7xl sm:text-8xl select-none"
        >
          🤟
        </motion.div>

        {/* Title */}
        <motion.div variants={item} className="text-center space-y-2">
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight gradient-text">
            MÍMICA
          </h1>
          <p className="text-game-text-secondary text-base sm:text-lg font-medium">
            Aprende el alfabeto en lengua de señas
          </p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div variants={item} className="w-full flex flex-col gap-3 mt-2">
          <Button
            size="lg"
            className="w-full h-14 text-lg font-bold gap-3 bg-game-teal hover:bg-game-teal-dark text-white shadow-lg shadow-game-teal/20"
            onClick={() => { playClick(); navigate('mode-select'); }}
          >
            <BookOpen className="w-5 h-5" />
            Aprender
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full h-14 text-lg font-bold gap-3 border-game-orange/40 text-game-orange hover:bg-game-orange/10 hover:text-game-orange-light"
            onClick={() => { playClick(); navigate('free-play'); }}
          >
            <Camera className="w-5 h-5" />
            Jugar Libre
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full h-14 text-lg font-bold gap-3 border-game-teal/30 text-game-teal hover:bg-game-teal/10"
            onClick={() => { playClick(); navigate('train'); }}
          >
            <Brain className="w-5 h-5" />
            Entrenar IA
          </Button>
        </motion.div>

        {/* How to play link */}
        <motion.div variants={item}>
          <button
            onClick={() => { playClick(); navigate('how-to-play'); }}
            className="flex items-center gap-1.5 text-game-text-muted hover:text-game-text-secondary transition-colors text-sm font-medium py-2 px-3"
          >
            <HelpCircle className="w-4 h-4" />
            ¿Cómo jugar?
          </button>
        </motion.div>

        {/* Stats bar */}
        <motion.div variants={item} className="w-full mt-2">
          <Separator className="bg-game-border mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex flex-col items-center gap-1 py-2">
              <div className="flex items-center gap-1.5 text-game-teal">
                <Trophy className="w-4 h-4" />
                <span className="text-lg font-bold">{learnedCount}</span>
              </div>
              <span className="text-xs text-game-text-muted">
                de {AVAILABLE_LETTERS.length}
              </span>
              <span className="text-xs text-game-text-secondary font-medium">
                Aprendidas
              </span>
            </div>
            <div className="flex flex-col items-center gap-1 py-2">
              <div className="flex items-center gap-1.5 text-game-orange">
                <Flame className="w-4 h-4" />
                <span className="text-lg font-bold">{totalPoints}</span>
              </div>
              <span className="text-xs text-game-text-muted">puntos</span>
              <span className="text-xs text-game-text-secondary font-medium">
                Total
              </span>
            </div>
            <div className="flex flex-col items-center gap-1 py-2">
              <div className="flex items-center gap-1.5 text-game-teal-light">
                <Gamepad2 className="w-4 h-4" />
                <span className="text-lg font-bold">{totalGamesPlayed}</span>
              </div>
              <span className="text-xs text-game-text-muted">partidas</span>
              <span className="text-xs text-game-text-secondary font-medium">
                Jugadas
              </span>
            </div>
            <button
              onClick={() => { playClick(); navigate('stats'); }}
              className="flex flex-col items-center gap-1 py-2 rounded-lg hover:bg-game-card/50 transition-colors"
            >
              <div className="flex items-center gap-1.5 text-game-teal-light">
                <BarChart3 className="w-4 h-4" />
              </div>
              <span className="text-xs text-game-text-muted">ver más</span>
              <span className="text-xs text-game-text-secondary font-medium">
                Estadísticas
              </span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </main>
  );
}