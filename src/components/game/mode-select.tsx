'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Zap, Camera, ArrowLeft, ChevronRight, Target, BarChart3, HelpCircle, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/stores/game-store';
import { DIFFICULTY_CONFIG } from '@/constants/letters';
import type { Difficulty } from '@/types/game';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.09, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 22, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: [0.32, 0.72, 0, 1] as const } },
};

const difficulties: { key: Difficulty; label: string; active: string }[] = [
  { key: 'easy', label: 'Fácil', active: 'bg-emerald-400/15 text-emerald-200 border-emerald-300/30' },
  { key: 'medium', label: 'Medio', active: 'bg-amber-400/15 text-amber-200 border-amber-300/30' },
  { key: 'hard', label: 'Difícil', active: 'bg-rose-400/15 text-rose-200 border-rose-300/30' },
];

function difficultyDesc(key: Difficulty): string {
  const c = DIFFICULTY_CONFIG[key];
  return `${c.letterCount} letras · ${c.timeLimit}s`;
}

export function ModeSelectScreen() {
  const navigate = useGameStore((s) => s.navigate);
  const goBack = useGameStore((s) => s.goBack);
  const startChallenge = useGameStore((s) => s.startChallenge);
  const isDeveloper = useGameStore((s) => s.isDeveloper);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium');

  const handleStartChallenge = () => {
    startChallenge(selectedDifficulty);
  };

  return (
    <main className="aaa-stage flex-1 flex flex-col px-4 py-8">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="w-full max-w-md mx-auto flex flex-col gap-4"
      >
        {/* Floating glass header */}
        <motion.div variants={item} className="glass-regular glass-highlight squircle depth-1 flex items-center gap-3 p-3 pr-5">
          <Button variant="ghost" size="icon" onClick={goBack} className="h-11 w-11 rounded-2xl hover:bg-white/5" aria-label="Volver">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Menú</h1>
            <p className="text-xs text-game-text-secondary">Practica, juega y revisa tu progreso</p>
          </div>
        </motion.div>

        {/* Practice */}
        <motion.div variants={item} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.985 }}>
          <div
            className="glass-regular glass-highlight squircle panel-float depth-1 p-5 flex items-center gap-4 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
            onClick={() => navigate('letter-browser')}
            role="button"
            tabIndex={0}
            aria-label="Ir a práctica de letras"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('letter-browser');
              }
            }}
          >
            <div className="w-14 h-14 rounded-[1.1rem] bg-gradient-to-b from-teal-400/25 to-teal-500/10 border border-teal-300/20 flex items-center justify-center flex-shrink-0 depth-teal">
              <BookOpen className="w-7 h-7 text-teal-200" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-extrabold tracking-tight">Práctica</h2>
              <p className="text-sm text-game-text-secondary">Aprende cada letra paso a paso</p>
            </div>
            <ChevronRight className="w-5 h-5 text-game-text-muted flex-shrink-0" aria-hidden="true" />
          </div>
        </motion.div>

        {/* Challenge */}
        <motion.div variants={item}>
          <div className="glass-regular glass-highlight squircle-lg depth-2 p-5 sm:p-6 relative overflow-hidden">
            <div aria-hidden="true" className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-orange-500/15 blur-3xl" />
            <div className="flex items-center gap-4 mb-5 relative">
              <div className="w-14 h-14 rounded-[1.1rem] bg-gradient-to-b from-orange-400/25 to-orange-500/10 border border-orange-300/20 flex items-center justify-center flex-shrink-0 depth-orange">
                <Zap className="w-7 h-7 text-orange-200" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-extrabold tracking-tight">Desafío</h2>
                <p className="text-sm text-game-text-secondary">Pon a prueba tu conocimiento</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 relative">
              <p className="text-[11px] font-bold text-game-text-muted uppercase tracking-[0.14em]">
                Dificultad
              </p>
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Elegir dificultad">
                {difficulties.map((d) => (
                  <motion.button
                    key={d.key}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedDifficulty(d.key)}
                    aria-pressed={selectedDifficulty === d.key}
                    aria-label={`Dificultad ${d.label}: ${difficultyDesc(d.key)}`}
                    className={`rounded-2xl border px-2 py-3 text-center transition-all duration-300 ${
                      selectedDifficulty === d.key
                        ? `${d.active} border-current scale-[1.02] depth-1`
                        : 'border-white/10 bg-white/[0.03] text-game-text-secondary hover:bg-white/[0.06]'
                    }`}
                  >
                    <span className="text-sm font-bold">{d.label}</span>
                    <span className="block text-[10px] opacity-70 mt-0.5">{difficultyDesc(d.key)}</span>
                  </motion.button>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs text-game-text-muted">
                <Target className="w-3.5 h-3.5" aria-hidden="true" />
                {difficultyDesc(selectedDifficulty)} · rachas multiplican puntos
              </div>

              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}>
                <Button
                  size="lg"
                  className="btn-premium btn-premium-orange w-full h-13 py-3.5 text-base font-extrabold gap-2 text-white rounded-2xl border-0"
                  onClick={handleStartChallenge}
                >
                  <Zap className="w-4 h-4" aria-hidden="true" />
                  ¡Desafío!
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Free Play */}
        <motion.div variants={item} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.985 }}>
          <div
            className="glass-regular glass-highlight squircle panel-float depth-1 p-5 flex items-center gap-4 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
            onClick={() => navigate('free-play')}
            role="button"
            tabIndex={0}
            aria-label="Ir a juego libre"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('free-play');
              }
            }}
          >
            <div className="w-14 h-14 rounded-[1.1rem] bg-gradient-to-b from-teal-400/25 to-teal-500/10 border border-teal-300/20 flex items-center justify-center flex-shrink-0">
              <Camera className="w-7 h-7 text-teal-200" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-extrabold tracking-tight">Juego Libre</h2>
              <p className="text-sm text-game-text-secondary">Practica libremente con la cámara</p>
            </div>
            <ChevronRight className="w-5 h-5 text-game-text-muted flex-shrink-0" aria-hidden="true" />
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={item} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.985 }}>
          <div
            className="glass-regular glass-highlight squircle panel-float depth-1 p-5 flex items-center gap-4 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
            onClick={() => navigate('stats')}
            role="button"
            tabIndex={0}
            aria-label="Ver estadísticas"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('stats');
              }
            }}
          >
            <div className="w-14 h-14 rounded-[1.1rem] bg-gradient-to-b from-teal-400/25 to-teal-500/10 border border-teal-300/20 flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-7 h-7 text-teal-200" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-extrabold tracking-tight">Ver estadísticas</h2>
              <p className="text-sm text-game-text-secondary">Tu progreso y letras dominadas</p>
            </div>
            <ChevronRight className="w-5 h-5 text-game-text-muted flex-shrink-0" aria-hidden="true" />
          </div>
        </motion.div>

        {/* How to play */}
        <motion.div variants={item} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.985 }}>
          <div
            className="glass-regular glass-highlight squircle panel-float depth-1 p-5 flex items-center gap-4 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
            onClick={() => navigate('how-to-play')}
            role="button"
            tabIndex={0}
            aria-label="Cómo jugar"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('how-to-play');
              }
            }}
          >
            <div className="w-14 h-14 rounded-[1.1rem] bg-gradient-to-b from-teal-400/25 to-teal-500/10 border border-teal-300/20 flex items-center justify-center flex-shrink-0">
              <HelpCircle className="w-7 h-7 text-teal-200" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-extrabold tracking-tight">¿Cómo jugar?</h2>
              <p className="text-sm text-game-text-secondary">Aprende las reglas en un minuto</p>
            </div>
            <ChevronRight className="w-5 h-5 text-game-text-muted flex-shrink-0" aria-hidden="true" />
          </div>
        </motion.div>

        {/* Developer training */}
        {isDeveloper && (
          <motion.div variants={item} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.985 }}>
            <div
              className="glass-regular glass-highlight squircle panel-float depth-1 p-5 flex items-center gap-4 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
              onClick={() => navigate('train')}
              role="button"
              tabIndex={0}
              aria-label="Entrenar modelo IA"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate('train');
                }
              }}
            >
              <div className="w-14 h-14 rounded-[1.1rem] bg-gradient-to-b from-orange-400/25 to-orange-500/10 border border-orange-300/20 flex items-center justify-center flex-shrink-0">
                <Brain className="w-7 h-7 text-orange-200" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-extrabold tracking-tight">Entrenar IA</h2>
                <p className="text-sm text-game-text-secondary">Graba señas para el modelo</p>
              </div>
              <ChevronRight className="w-5 h-5 text-game-text-muted flex-shrink-0" aria-hidden="true" />
            </div>
          </motion.div>
        )}
      </motion.div>
    </main>
  );
}
