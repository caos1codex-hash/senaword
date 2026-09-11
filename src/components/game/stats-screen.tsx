'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Gamepad2, Flame, Zap, Target, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/stores/game-store';
import { AVAILABLE_LETTERS, isDynamicLetter } from '@/constants/letters';

export function StatsScreen() {
  const goBack = useGameStore((s) => s.goBack);
  const learnedCount = useGameStore((s) => s.getLearnedCount());
  const totalGamesPlayed = useGameStore((s) => s.totalGamesPlayed);
  const totalPoints = useGameStore((s) => s.totalPoints);
  const bestStreak = useGameStore((s) => s.bestStreak);
  const totalCorrectSigns = useGameStore((s) => s.totalCorrectSigns);
  const totalSignsAttempted = useGameStore((s) => s.totalSignsAttempted);
  const letterProgress = useGameStore((s) => s.letterProgress);
  const customWords = useGameStore((s) => s.customWords);
  const getCaptureMode = useGameStore((s) => s.getCaptureMode);

  const accuracy = useMemo(() => {
    if (totalSignsAttempted === 0) return 0;
    return Math.round((totalCorrectSigns / totalSignsAttempted) * 100);
  }, [totalCorrectSigns, totalSignsAttempted]);

  const progressPercent = Math.round((learnedCount / AVAILABLE_LETTERS.length) * 100);
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  const cards = [
    { icon: Gamepad2, value: totalGamesPlayed, label: 'Partidas Jugadas', tint: 'text-teal-200 bg-teal-400/10 border-teal-300/20' },
    { icon: Flame, value: totalPoints, label: 'Puntos Totales', tint: 'text-orange-200 bg-orange-400/10 border-orange-300/20' },
    { icon: Zap, value: bestStreak, label: 'Mejor Racha', tint: 'text-orange-200 bg-orange-400/10 border-orange-300/20' },
    { icon: Target, value: `${accuracy}%`, label: 'Precisión Global', tint: 'text-teal-200 bg-teal-400/10 border-teal-300/20' },
  ];

  return (
    <main className="aaa-stage flex-1 flex flex-col px-4 py-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
        className="w-full max-w-2xl mx-auto flex flex-col gap-5"
      >
        <div className="glass-regular glass-highlight squircle depth-1 flex items-center gap-3 p-3 pr-5">
          <Button variant="ghost" size="icon" onClick={goBack} className="h-11 w-11 rounded-2xl hover:bg-white/5" aria-label="Volver">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Estadísticas</h1>
            <p className="text-xs text-game-text-secondary">Tu progreso general</p>
          </div>
        </div>

        {/* Hero ring */}
        <div className="glass-regular glass-highlight squircle-lg depth-2 flex flex-col items-center gap-3 py-7 relative overflow-hidden">
          <div aria-hidden="true" className="absolute -top-16 left-1/2 -translate-x-1/2 w-72 h-40 bg-teal-400/15 blur-3xl" />
          <div className="relative w-40 h-40" role="img" aria-label={`${learnedCount} de ${AVAILABLE_LETTERS.length} letras dominadas`}>
            <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140" aria-hidden="true">
              <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
              <circle
                cx="70" cy="70" r={radius} fill="none"
                stroke="url(#aaaRing)" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                className="transition-all duration-700 ease-out"
              />
              <defs>
                <linearGradient id="aaaRing" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#5EEAD4" />
                  <stop offset="100%" stopColor="#0D9488" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black tracking-tight tabular-nums">{learnedCount}</span>
              <span className="text-[11px] text-white/40 font-semibold">de {AVAILABLE_LETTERS.length}</span>
            </div>
          </div>
          <p className="text-sm font-semibold text-white/60 relative">
            {learnedCount} de {AVAILABLE_LETTERS.length} letras dominadas
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {cards.map((c, i) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.07, duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
              whileHover={{ scale: 1.02, y: -2 }}
              className="glass-regular glass-highlight squircle-sm depth-1 p-4 flex flex-col items-center gap-2"
            >
              <span className={`flex items-center justify-center w-11 h-11 rounded-2xl border ${c.tint}`}>
                <c.icon className="w-5 h-5" aria-hidden="true" />
              </span>
              <span className="text-2xl font-black tabular-nums">{c.value}</span>
              <span className="text-xs text-white/45 font-semibold">{c.label}</span>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col gap-3 pb-8">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight">Progreso por letra</h2>
            <p className="text-sm text-white/45 mt-0.5">Detalle de cada letra</p>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
            {AVAILABLE_LETTERS.map((letter, i) => {
              const progress = letterProgress[letter];
              const isLearned = progress?.learned ?? false;
              const practiceCount = progress?.practiceCount ?? 0;
              const successCount = progress?.successCount ?? 0;
              const successRate = practiceCount > 0 ? (successCount / practiceCount) * 100 : 0;

              return (
                <motion.div
                  key={letter}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.min(i * 0.02, 0.4), duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                  className={`card-solid relative overflow-hidden rounded-[1.2rem] p-3 flex flex-col items-center gap-2 depth-1 ${isLearned ? 'border-emerald-300/25' : ''}`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-2xl font-black tracking-tight">{letter}</span>
                    {getCaptureMode(letter) === 'video' && <span className="text-[10px]" title="Requiere movimiento" aria-label="Con movimiento">🎥</span>}
                    {isDynamicLetter(letter) && getCaptureMode(letter) !== 'video' && <span className="text-[10px]" title="Requiere movimiento" aria-label="Letra con movimiento">〰️</span>}
                    {isLearned && <Check className="w-4 h-4 text-emerald-300" aria-label="Aprendida" />}
                  </span>
                  <span className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden" role="progressbar" aria-valuenow={Math.round(successRate)} aria-valuemin={0} aria-valuemax={100} aria-label={`Progreso letra ${letter}`}>
                    <span
                      className={`block h-full rounded-full transition-all duration-500 ${isLearned ? 'bg-gradient-to-r from-emerald-300 to-emerald-400' : practiceCount > 0 ? 'bg-gradient-to-r from-teal-300 to-teal-400' : 'bg-white/20'}`}
                      style={{ width: `${successRate}%` }}
                    />
                  </span>
                  {practiceCount > 0 && (
                    <span className="text-[10px] font-semibold text-white/40 tabular-nums">{successCount}/{practiceCount}</span>
                  )}
                </motion.div>
              );
            })}
          </div>

          {customWords.length > 0 && (
            <div className="flex flex-col gap-3">
              <div>
                <h2 className="text-lg font-extrabold tracking-tight">Mis palabras</h2>
                <p className="text-sm text-white/45 mt-0.5">{customWords.length} personalizadas</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {customWords.map((word) => {
                  const progress = letterProgress[word];
                  const isLearned = progress?.learned ?? false;
                  const practiceCount = progress?.practiceCount ?? 0;
                  const successCount = progress?.successCount ?? 0;
                  const successRate = practiceCount > 0 ? (successCount / practiceCount) * 100 : 0;
                  return (
                    <div
                      key={word}
                      className={`card-solid relative overflow-hidden rounded-[1.2rem] p-3 flex flex-col items-center gap-2 depth-1 ${isLearned ? 'border-emerald-300/25' : ''}`}
                    >
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span className={`font-black tracking-tight truncate ${word.length > 6 ? 'text-base' : 'text-xl'}`}>{word}</span>
                        {getCaptureMode(word) === 'video' && <span className="text-[10px]" aria-label="Con movimiento">🎥</span>}
                        {isLearned && <Check className="w-4 h-4 text-emerald-300 shrink-0" aria-label="Aprendida" />}
                      </span>
                      <span className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <span
                          className={`block h-full rounded-full transition-all duration-500 ${isLearned ? 'bg-gradient-to-r from-emerald-300 to-emerald-400' : practiceCount > 0 ? 'bg-gradient-to-r from-teal-300 to-teal-400' : 'bg-white/20'}`}
                          style={{ width: `${successRate}%` }}
                        />
                      </span>
                      {practiceCount > 0 && (
                        <span className="text-[10px] font-semibold text-white/40 tabular-nums">{successCount}/{practiceCount}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </main>
  );
}
