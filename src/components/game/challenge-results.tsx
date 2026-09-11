'use client';

import { motion } from 'framer-motion';
import { Home, RotateCcw, Star, Target, TrendingUp, Zap, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/stores/game-store';

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
  const startChallenge = useGameStore((s) => s.startChallenge);
  const totalPoints = useGameStore((s) => s.totalPoints);

  const score = challenge?.score ?? { points: 0, streak: 0, bestStreak: 0, correct: 0, total: 0, accuracy: 0 };
  const accuracy = score.accuracy;
  const starCount = getStarCount(accuracy);
  const starLabel = getStarLabel(starCount);
  const lastDifficulty = challenge?.config.difficulty;

  if (!challenge) {
    return (
      <main className="aaa-stage flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="glass-regular glass-highlight squircle depth-1 p-8 text-center max-w-sm">
          <p className="text-white/60 text-sm mb-4">No hay resultados de desafío.</p>
          <Button
            size="lg"
            className="btn-premium btn-premium-teal h-12 font-bold gap-2 text-white rounded-2xl border-0"
            onClick={() => navigate('mode-select')}
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            Elegir desafío
          </Button>
        </div>
      </main>
    );
  }

  const stats = [
    { icon: Target, value: `${score.correct}/${score.total}`, label: 'Correctas', tint: 'text-teal-200 bg-teal-400/10 border-teal-300/20' },
    { icon: TrendingUp, value: `${Math.round(accuracy * 100)}%`, label: 'Precisión', tint: 'text-emerald-200 bg-emerald-400/10 border-emerald-300/20' },
    { icon: Zap, value: `${score.bestStreak}`, label: 'Mejor racha', tint: 'text-orange-200 bg-orange-400/10 border-orange-300/20' },
    { icon: Award, value: `${totalPoints}`, label: 'Total puntos', tint: 'text-amber-200 bg-amber-400/10 border-amber-300/20' },
  ];

  return (
    <main className="aaa-stage flex-1 flex flex-col items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
        className="w-full max-w-md flex flex-col items-center gap-5"
      >
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4" role="img" aria-label={`${starCount} de 3 estrellas`}>
            {[1, 2, 3].map((star) => (
              <motion.div
                key={star}
                initial={{ scale: 0, rotate: -120 }}
                animate={{ scale: star <= starCount ? 1 : 0.65, rotate: 0 }}
                transition={{ delay: 0.25 + star * 0.15, type: 'spring', stiffness: 260, damping: 16 }}
              >
                <span className={`w-14 h-14 rounded-2xl flex items-center justify-center border depth-1 ${
                  star <= starCount
                    ? 'bg-amber-400/15 border-amber-300/30'
                    : 'bg-white/[0.03] border-white/10'
                }`}>
                  <Star
                    aria-hidden="true"
                    className={`w-7 h-7 ${star <= starCount ? 'fill-amber-300 text-amber-300' : 'fill-white/10 text-white/20'}`}
                  />
                </span>
              </motion.div>
            ))}
          </div>
          <h1 className="text-4xl font-black tracking-tighter gradient-text">{starLabel}</h1>
          <p className="text-white/50 text-sm mt-1 font-medium">Desafío completado</p>
        </div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 220, damping: 18 }}
          className="glass-regular glass-highlight squircle-lg depth-2 px-10 py-6 text-center relative overflow-hidden"
        >
          <div aria-hidden="true" className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-24 bg-orange-400/20 blur-3xl" />
          <div className="text-6xl font-black tracking-tighter text-orange-200 tabular-nums relative">{score.points}</div>
          <div className="text-[11px] text-white/40 font-bold tracking-[0.2em] mt-1 relative">PUNTOS</div>
        </motion.div>

        <div className="w-full grid grid-cols-2 gap-3">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.08, duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
              className="glass-regular glass-highlight squircle-sm depth-1 p-4 text-center"
            >
              <span className={`inline-flex w-10 h-10 rounded-2xl border items-center justify-center mb-2 ${s.tint}`}>
                <s.icon className="w-5 h-5" aria-hidden="true" />
              </span>
              <div className="text-2xl font-extrabold text-white tabular-nums">{s.value}</div>
              <div className="text-xs text-white/45 mt-0.5 font-medium">{s.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="w-full flex flex-col gap-2.5 mt-1">
          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}>
            <Button
              size="lg"
              className="btn-premium btn-premium-orange w-full h-13 py-3.5 text-base font-extrabold gap-2 text-white rounded-2xl border-0"
              onClick={() => {
                if (lastDifficulty) startChallenge(lastDifficulty);
                else navigate('mode-select');
              }}
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              Jugar de nuevo
            </Button>
          </motion.div>
          <Button
            size="lg"
            variant="outline"
            className="w-full h-12 text-base font-bold gap-2 rounded-2xl border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:bg-white/[0.07]"
            onClick={() => navigate('home')}
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            Inicio
          </Button>
        </div>
      </motion.div>
    </main>
  );
}
