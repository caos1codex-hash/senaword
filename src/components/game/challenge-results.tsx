'use client';

import { motion } from 'framer-motion';
import { Home, RotateCcw, Star, Target, TrendingUp, Zap, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useGameStore } from '@/stores/game-store';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

function getStarCount(accuracy: number): number {
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.7) return 2;
  if (accuracy >= 0.4) return 1;
  return 0;
}

function getStarLabel(count: number): string {
  switch (count) {
    case 3: return '¡Excelente!';
    case 2: return '¡Muy bien!';
    case 1: return '¡Buen intento!';
    default: return '¡Sigue practicando!';
  }
}

export function ChallengeResultsScreen() {
  const navigate = useGameStore((s) => s.navigate);
  const challenge = useGameStore((s) => s.challenge);
  const totalPoints = useGameStore((s) => s.totalPoints);

  const score = challenge?.score ?? { points: 0, streak: 0, bestStreak: 0, correct: 0, total: 0, accuracy: 0 };
  const accuracy = score.accuracy;
  const starCount = getStarCount(accuracy);
  const starLabel = getStarLabel(starCount);

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 bg-mesh">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="w-full max-w-md flex flex-col items-center gap-5"
      >
        <motion.div variants={item} className="text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            {[1, 2, 3].map((star) => (
              <motion.div
                key={star}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: star <= starCount ? 1 : 0.6, rotate: 0 }}
                transition={{ delay: 0.3 + star * 0.2, type: 'spring', stiffness: 200 }}
              >
                <Star
                  className={`w-10 h-10 ${
                    star <= starCount
                      ? 'fill-game-warning text-game-warning'
                      : 'fill-game-border text-game-border'
                  }`}
                />
              </motion.div>
            ))}
          </div>
          <h1 className="text-3xl font-black gradient-text">{starLabel}</h1>
          <p className="text-game-text-secondary text-sm mt-1">Desafío completado</p>
        </motion.div>

        <motion.div variants={item} className="relative">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
            className="text-center"
          >
            <div className="text-6xl font-black text-game-orange">{score.points}</div>
            <div className="text-sm text-game-text-muted font-medium">PUNTOS</div>
          </motion.div>
        </motion.div>

        <motion.div variants={item} className="w-full grid grid-cols-2 gap-3">
          <Card className="bg-game-card border-game-border">
            <CardContent className="p-4 text-center">
              <Target className="w-5 h-5 text-game-teal mx-auto mb-2" />
              <div className="text-2xl font-bold text-game-text">
                {score.correct}/{score.total}
              </div>
              <div className="text-xs text-game-text-muted mt-0.5">Correctas</div>
            </CardContent>
          </Card>
          <Card className="bg-game-card border-game-border">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-5 h-5 text-game-success mx-auto mb-2" />
              <div className="text-2xl font-bold text-game-text">
                {Math.round(accuracy * 100)}%
              </div>
              <div className="text-xs text-game-text-muted mt-0.5">Precisión</div>
            </CardContent>
          </Card>
          <Card className="bg-game-card border-game-border">
            <CardContent className="p-4 text-center">
              <Zap className="w-5 h-5 text-game-orange mx-auto mb-2" />
              <div className="text-2xl font-bold text-game-text">
                {score.bestStreak}
              </div>
              <div className="text-xs text-game-text-muted mt-0.5">Mejor racha</div>
            </CardContent>
          </Card>
          <Card className="bg-game-card border-game-border">
            <CardContent className="p-4 text-center">
              <Award className="w-5 h-5 text-game-warning mx-auto mb-2" />
              <div className="text-2xl font-bold text-game-text">
                {totalPoints}
              </div>
              <div className="text-xs text-game-text-muted mt-0.5">Total puntos</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} className="w-full flex flex-col gap-3 mt-2">
          <Button
            size="lg"
            className="w-full h-12 text-base font-bold gap-2 bg-game-orange hover:bg-game-orange-light text-white"
            onClick={() => navigate('mode-select')}
          >
            <RotateCcw className="w-4 h-4" />
            Jugar de nuevo
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full h-12 text-base font-bold gap-2 border-game-border text-game-text-secondary hover:bg-game-card"
            onClick={() => navigate('home')}
          >
            <Home className="w-4 h-4" />
            Inicio
          </Button>
        </motion.div>
      </motion.div>
    </main>
  );
}