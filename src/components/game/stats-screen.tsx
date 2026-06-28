'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Gamepad2, Flame, Zap, Target, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useGameStore } from '@/stores/game-store';
import { AVAILABLE_LETTERS } from '@/constants/letters';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const letterContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.03, delayChildren: 0.1 },
  },
};

const letterItem = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
};

export function StatsScreen() {
  const goBack = useGameStore((s) => s.goBack);
  const learnedCount = useGameStore((s) => s.getLearnedCount());
  const totalGamesPlayed = useGameStore((s) => s.totalGamesPlayed);
  const totalPoints = useGameStore((s) => s.totalPoints);
  const bestStreak = useGameStore((s) => s.bestStreak);
  const totalCorrectSigns = useGameStore((s) => s.totalCorrectSigns);
  const totalSignsAttempted = useGameStore((s) => s.totalSignsAttempted);
  const letterProgress = useGameStore((s) => s.letterProgress);

  const accuracy = useMemo(() => {
    if (totalSignsAttempted === 0) return 0;
    return Math.round((totalCorrectSigns / totalSignsAttempted) * 100);
  }, [totalCorrectSigns, totalSignsAttempted]);

  const progressPercent = Math.round((learnedCount / AVAILABLE_LETTERS.length) * 100);

  // SVG circular progress
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <main className="flex-1 flex flex-col px-4 py-6 bg-mesh overflow-y-auto">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="w-full max-w-2xl mx-auto flex flex-col gap-6"
      >
        {/* Header */}
        <motion.div variants={item} className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={goBack} className="h-10 w-10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Estadísticas</h1>
            <p className="text-sm text-game-text-secondary">
              Tu progreso general
            </p>
          </div>
        </motion.div>

        {/* Overall Progress */}
        <motion.div variants={item} className="flex flex-col items-center gap-3 py-4">
          <div className="relative w-40 h-40">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
              {/* Background circle */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                className="text-game-border"
              />
              {/* Progress circle */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke="#0D9488"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-game-text">{learnedCount}</span>
              <span className="text-xs text-game-text-muted font-medium">
                de {AVAILABLE_LETTERS.length}
              </span>
            </div>
          </div>
          <p className="text-game-text-secondary text-sm font-medium">
            {learnedCount} de {AVAILABLE_LETTERS.length} letras dominadas
          </p>
        </motion.div>

        <Separator className="bg-game-border" />

        {/* Stats Cards Grid (2x2) */}
        <motion.div variants={item} className="grid grid-cols-2 gap-3">
          <Card className="bg-game-card border-game-border">
            <CardContent className="p-4 flex flex-col items-center gap-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-game-teal/15">
                <Gamepad2 className="w-5 h-5 text-game-teal" />
              </div>
              <span className="text-2xl font-black text-game-text">{totalGamesPlayed}</span>
              <span className="text-xs text-game-text-secondary font-medium">
                Partidas Jugadas
              </span>
            </CardContent>
          </Card>

          <Card className="bg-game-card border-game-border">
            <CardContent className="p-4 flex flex-col items-center gap-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-game-orange/15">
                <Flame className="w-5 h-5 text-game-orange" />
              </div>
              <span className="text-2xl font-black text-game-text">{totalPoints}</span>
              <span className="text-xs text-game-text-secondary font-medium">
                Puntos Totales
              </span>
            </CardContent>
          </Card>

          <Card className="bg-game-card border-game-border">
            <CardContent className="p-4 flex flex-col items-center gap-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-game-orange/15">
                <Zap className="w-5 h-5 text-game-orange" />
              </div>
              <span className="text-2xl font-black text-game-text">{bestStreak}</span>
              <span className="text-xs text-game-text-secondary font-medium">
                Mejor Racha
              </span>
            </CardContent>
          </Card>

          <Card className="bg-game-card border-game-border">
            <CardContent className="p-4 flex flex-col items-center gap-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-game-teal/15">
                <Target className="w-5 h-5 text-game-teal" />
              </div>
              <span className="text-2xl font-black text-game-text">{accuracy}%</span>
              <span className="text-xs text-game-text-secondary font-medium">
                Precisión Global
              </span>
            </CardContent>
          </Card>
        </motion.div>

        <Separator className="bg-game-border" />

        {/* Per-Letter Progress */}
        <motion.div variants={item} className="flex flex-col gap-4 pb-8">
          <div>
            <h2 className="text-lg font-bold">Progreso por letra</h2>
            <p className="text-sm text-game-text-secondary mt-0.5">
              Detalle de cada letra
            </p>
          </div>

          <motion.div
            variants={letterContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3"
          >
            {AVAILABLE_LETTERS.map((letter) => {
              const progress = letterProgress[letter];
              const isLearned = progress?.learned ?? false;
              const practiceCount = progress?.practiceCount ?? 0;
              const successCount = progress?.successCount ?? 0;
              const successRate = practiceCount > 0 ? (successCount / practiceCount) * 100 : 0;

              const barColor = isLearned
                ? 'bg-game-success'
                : practiceCount > 0
                  ? 'bg-game-teal'
                  : 'bg-game-text-muted';

              return (
                <motion.div key={letter} variants={letterItem}>
                  <Card className="bg-game-card border-game-border relative overflow-hidden">
                    <CardContent className="p-3 flex flex-col items-center gap-2">
                      {/* Letter with optional checkmark */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-2xl font-black text-game-text">
                          {letter}
                        </span>
                        {isLearned && (
                          <Check className="w-4 h-4 text-game-success" />
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="w-full h-1.5 rounded-full bg-game-border overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                          style={{ width: `${successRate}%` }}
                        />
                      </div>

                      {/* Practice count */}
                      {practiceCount > 0 && (
                        <span className="text-[10px] text-game-text-muted">
                          {successCount}/{practiceCount}
                        </span>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>
      </motion.div>
    </main>
  );
}