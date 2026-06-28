'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Zap, Camera, ArrowLeft, ChevronRight, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useGameStore } from '@/stores/game-store';
import type { Difficulty } from '@/types/game';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const difficulties: { key: Difficulty; label: string; color: string; desc: string }[] = [
  { key: 'easy', label: 'Fácil', color: 'bg-game-success/20 text-game-success border-game-success/30', desc: '5 letras · 60s' },
  { key: 'medium', label: 'Medio', color: 'bg-game-warning/20 text-game-warning border-game-warning/30', desc: '10 letras · 45s' },
  { key: 'hard', label: 'Difícil', color: 'bg-game-error/20 text-game-error border-game-error/30', desc: '15 letras · 30s' },
];

export function ModeSelectScreen() {
  const navigate = useGameStore((s) => s.navigate);
  const goBack = useGameStore((s) => s.goBack);
  const startChallenge = useGameStore((s) => s.startChallenge);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium');

  const handleStartChallenge = () => {
    startChallenge(selectedDifficulty);
  };

  return (
    <main className="flex-1 flex flex-col px-4 py-6 bg-mesh">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="w-full max-w-md mx-auto flex flex-col gap-5"
      >
        {/* Header */}
        <motion.div variants={item} className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={goBack} className="h-10 w-10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Elige un modo</h1>
        </motion.div>

        {/* Practice Card */}
        <motion.div variants={item}>
          <Card
            className="letter-card bg-game-card border-game-border cursor-pointer group"
            onClick={() => navigate('letter-browser')}
          >
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-game-teal/10 flex items-center justify-center flex-shrink-0 group-hover:bg-game-teal/20 transition-colors">
                <BookOpen className="w-7 h-7 text-game-teal" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-game-text">Práctica</h2>
                <p className="text-sm text-game-text-secondary">
                  Aprende cada letra paso a paso
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-game-text-muted group-hover:text-game-teal transition-colors flex-shrink-0" />
            </CardContent>
          </Card>
        </motion.div>

        {/* Challenge Card */}
        <motion.div variants={item}>
          <Card className="bg-game-card border-game-border overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-game-orange/10 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-7 h-7 text-game-orange" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-game-text">Desafío</h2>
                  <p className="text-sm text-game-text-secondary">
                    Pon a prueba tu conocimiento
                  </p>
                </div>
              </div>

              {/* Difficulty picker */}
              <div className="flex flex-col gap-2.5">
                <p className="text-xs font-semibold text-game-text-muted uppercase tracking-wider">
                  Dificultad
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {difficulties.map((d) => (
                    <button
                      key={d.key}
                      onClick={() => setSelectedDifficulty(d.key)}
                      className={`rounded-xl border px-2 py-2.5 text-center transition-all ${
                        selectedDifficulty === d.key
                          ? d.color + ' border-current scale-[1.02]'
                          : 'border-game-border bg-game-bg/50 text-game-text-secondary hover:border-game-text-muted'
                      }`}
                    >
                      <span className="text-sm font-bold">{d.label}</span>
                    </button>
                  ))}
                </div>

                {/* Selected difficulty info */}
                <div className="flex items-center gap-3 mt-1 text-xs text-game-text-muted">
                  <span className="flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    {difficulties.find((d) => d.key === selectedDifficulty)?.desc}
                  </span>
                </div>

                <Button
                  size="lg"
                  className="w-full h-12 text-base font-bold gap-2 bg-game-orange hover:bg-game-orange-light text-white mt-1"
                  onClick={handleStartChallenge}
                >
                  <Zap className="w-4 h-4" />
                  ¡Desafío!
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Free Play Card */}
        <motion.div variants={item}>
          <Card
            className="letter-card bg-game-card border-game-border cursor-pointer group"
            onClick={() => navigate('free-play')}
          >
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-game-teal/10 flex items-center justify-center flex-shrink-0 group-hover:bg-game-teal/20 transition-colors">
                <Camera className="w-7 h-7 text-game-teal" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-game-text">Juego Libre</h2>
                <p className="text-sm text-game-text-secondary">
                  Practica libremente con la cámara
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-game-text-muted group-hover:text-game-teal transition-colors flex-shrink-0" />
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </main>
  );
}