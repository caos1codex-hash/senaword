'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, EyeOff, Info, RotateCcw, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/stores/game-store';
import { CameraView } from './camera-view';
import { ConfettiEffect } from './confetti-effect';
import { useSoundEffects } from '@/hooks/use-sound-effects';
import { isDynamicLetter } from '@/constants/letters';

export function PracticeScreen() {
  const practice = useGameStore((s) => s.practice);
  const goBack = useGameStore((s) => s.goBack);
  const toggleReference = useGameStore((s) => s.toggleReference);
  const setPracticeResult = useGameStore((s) => s.setPracticeResult);
  const updateLetterProgress = useGameStore((s) => s.updateLetterProgress);
  const nextPracticeLetter = useGameStore((s) => s.nextPracticeLetter);
  const prevPracticeLetter = useGameStore((s) => s.prevPracticeLetter);
  const startPractice = useGameStore((s) => s.startPractice);
  const getLetterData = useGameStore((s) => s.getLetterData);
  const getCaptureMode = useGameStore((s) => s.getCaptureMode);

  const { playCorrect, playWrong } = useSoundEffects();

  const [showConfetti, setShowConfetti] = useState(false);
  const confettiRef = useRef(false);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastWrongRef = useRef(0);

  const letterInfo = getLetterData(practice.currentLetter);
  const isCorrect = practice.lastResult?.isCorrect ?? false;
  const hasResult = practice.lastResult !== null;
  const needsMotion = getCaptureMode(practice.currentLetter) === 'video';

  const handleDetected = useCallback(
    (letter: string, confidence: number, isCorrectDetected: boolean) => {
      if (practice.lastResult?.isCorrect) return;

      if (isCorrectDetected) {
        setPracticeResult({ letter, confidence, isCorrect: isCorrectDetected });
        updateLetterProgress(practice.currentLetter, true);
        playCorrect();

        if (!confettiRef.current) {
          confettiRef.current = true;
          setShowConfetti(true);
          setTimeout(() => {
            setShowConfetti(false);
            confettiRef.current = false;
          }, 2100);
        }

        advanceTimerRef.current = setTimeout(() => {
          setPracticeResult(null);
          nextPracticeLetter();
        }, 2000);
      } else {
        const now = Date.now();
        if (now - lastWrongRef.current < 2000) return;
        lastWrongRef.current = now;
        setPracticeResult({ letter, confidence, isCorrect: false });
        updateLetterProgress(practice.currentLetter, false);
        playWrong();
      }
    },
    [practice.currentLetter, practice.lastResult, setPracticeResult, updateLetterProgress, nextPracticeLetter, playCorrect, playWrong]
  );

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setPracticeResult(null);
    confettiRef.current = false;
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }, [practice.currentLetter, setPracticeResult]);

  const triggerManualCorrect = () => {
    updateLetterProgress(practice.currentLetter, true);
    setPracticeResult({ letter: practice.currentLetter, confidence: 1, isCorrect: true });
    setShowConfetti(true);
    confettiRef.current = true;
    setTimeout(() => {
      setShowConfetti(false);
      confettiRef.current = false;
    }, 2100);
    advanceTimerRef.current = setTimeout(() => {
      setPracticeResult(null);
      nextPracticeLetter();
    }, 2000);
  };

  return (
    <div className="aaa-stage flex-1 flex flex-col min-h-0">
      <ConfettiEffect active={showConfetti} />

      {/* Floating toolbar */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
        className="mx-3 mt-3 glass-regular glass-highlight squircle depth-1 flex items-center justify-between px-2 py-2"
      >
        <Button variant="ghost" size="icon" onClick={goBack} className="h-11 w-11 rounded-2xl hover:bg-white/5" aria-label="Volver">
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={prevPracticeLetter}
            className="h-10 w-10 rounded-2xl hover:bg-white/5"
            disabled={isCorrect}
            aria-label="Letra anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-12 text-center px-3 py-1.5 rounded-2xl bg-teal-400/10 border border-teal-300/20">
            <span className="text-lg font-extrabold text-teal-100 tabular-nums">
              {practice.currentLetter}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={nextPracticeLetter}
            className="h-10 w-10 rounded-2xl hover:bg-white/5"
            disabled={isCorrect}
            aria-label="Letra siguiente"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleReference}
          className="h-11 w-11 rounded-2xl hover:bg-white/5"
          title={practice.showReference ? 'Ocultar referencia' : 'Mostrar referencia'}
          aria-label={practice.showReference ? 'Ocultar referencia' : 'Mostrar referencia'}
        >
          {practice.showReference ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </Button>
      </motion.div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Hero letter */}
        <div className="px-4 pt-4 pb-2 flex-shrink-0 text-center">
          <motion.div
            key={practice.currentLetter}
            initial={{ scale: 0.85, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          >
            <span className="text-7xl sm:text-8xl font-black tracking-tighter gradient-text leading-none">
              {practice.currentLetter}
            </span>
            {isDynamicLetter(practice.currentLetter) && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-orange-400/10 border border-orange-300/25 px-3 py-1">
                <span className="text-xs" aria-hidden="true">〰️</span>
                <span className="text-[11px] font-bold text-orange-200 uppercase tracking-wider">
                  Con movimiento · mantén la seña y haz el trazo (~2s)
                </span>
              </div>
            )}
            {!isDynamicLetter(practice.currentLetter) && needsMotion && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-orange-400/10 border border-orange-300/25 px-3 py-1">
                <span className="text-xs" aria-hidden="true">🎥</span>
                <span className="text-[11px] font-bold text-orange-200 uppercase tracking-wider">
                  Modo video · haz el movimiento entrenado (~2s)
                </span>
              </div>
            )}
          </motion.div>

          <AnimatePresence>
            {practice.showReference && letterInfo && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                className="overflow-hidden"
              >
                <div className="glass-thin glass-highlight squircle-sm mt-3 p-4 text-left depth-1 max-w-2xl mx-auto">
                  <p className="text-sm text-white/85 leading-relaxed font-medium">
                    {letterInfo.description}
                  </p>
                  {letterInfo.movement && (
                    <p className="text-xs text-orange-200/90 leading-relaxed mt-1.5 font-semibold">
                      Movimiento: {letterInfo.movement}
                    </p>
                  )}
                  <div className="flex items-start gap-2 mt-2">
                    <Info className="w-4 h-4 text-orange-300 mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <p className="text-xs text-white/50 leading-relaxed">{letterInfo.tip}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 pb-2 min-h-0">
          <CameraView
            targetLetter={practice.currentLetter}
            onDetected={handleDetected}
            size="md"
            enabled={!isCorrect}
            showOverlay
            forceDynamic={needsMotion}
          />
        </div>

        {/* Bottom dock */}
        <div className="px-4 pb-4 pt-2 flex-shrink-0 max-w-3xl mx-auto w-full">
          <AnimatePresence mode="wait">
            {isCorrect ? (
              <motion.div
                key="correct"
                initial={{ y: 20, opacity: 0, scale: 0.97 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                className="rounded-[1.6rem] bg-emerald-400/10 border border-emerald-300/25 p-4 text-center depth-1"
              >
                <motion.div initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="text-2xl font-black text-emerald-300 success-burst">
                  ¡Correcto!
                </motion.div>
                <p className="text-sm text-emerald-200/70 mt-1">Avanzando a la siguiente letra...</p>
              </motion.div>
            ) : hasResult && practice.lastResult ? (
              <motion.div
                key="wrong"
                initial={{ y: 20, opacity: 0, scale: 0.97 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 20, opacity: 0 }}
                className="rounded-[1.6rem] bg-rose-400/10 border border-rose-300/25 p-4 text-center depth-1"
              >
                <p className="text-base font-extrabold text-rose-200">Intenta de nuevo</p>
                <p className="text-xs text-white/50 mt-1">
                  Se detectó: <span className="font-bold text-white/80">{practice.lastResult.letter}</span>
                </p>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPracticeResult(null)}
                    className="h-9 rounded-xl text-xs text-white/60 hover:text-white hover:bg-white/5"
                  >
                    Seguir intentando
                  </Button>
                  <Button
                    size="sm"
                    onClick={triggerManualCorrect}
                    className="h-9 rounded-xl gap-1.5 bg-emerald-400/15 border border-emerald-300/30 text-emerald-200 hover:bg-emerald-400/25"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" aria-hidden="true" />
                    <span className="text-xs font-bold">Lo logré</span>
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="instruction"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="glass-regular glass-highlight squircle flex items-center justify-between p-4 depth-1"
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-11 h-11 rounded-2xl bg-teal-400/15 border border-teal-300/20 flex items-center justify-center"
                  >
                    <span className="text-xl" aria-hidden="true">✋</span>
                  </motion.div>
                  <div>
                    <p className="text-sm font-bold text-white">Muestra la seña</p>
                    <p className="text-xs text-white/50 tabular-nums">
                      Letra: {practice.currentLetter}
                      {isDynamicLetter(practice.currentLetter) ? ' · haz el trazo completo' : ''} · Intento #{practice.attempts + 1}
                    </p>
                  </div>
                </div>
                {practice.attempts > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startPractice(practice.currentLetter)}
                      className="h-10 w-10 rounded-2xl hover:bg-white/5"
                      title="Reiniciar intentos"
                      aria-label="Reiniciar intentos"
                    >
                      <RotateCcw className="w-4 h-4 text-white/50" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={triggerManualCorrect}
                      className="h-10 rounded-2xl gap-1.5 bg-emerald-400/15 border border-emerald-300/30 text-emerald-200 hover:bg-emerald-400/25 font-bold"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" aria-hidden="true" />
                      <span className="text-xs">Lo logré</span>
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
