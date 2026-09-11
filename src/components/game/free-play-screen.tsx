'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Shuffle, CheckCircle2, XCircle, Sparkles, Camera, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/stores/game-store';
import { AVAILABLE_LETTERS, isDynamicLetter } from '@/constants/letters';
import { CameraView } from './camera-view';
import { ConfettiEffect } from './confetti-effect';

export function FreePlayScreen() {
  const goBack = useGameStore((s) => s.goBack);
  const updateLetterProgress = useGameStore((s) => s.updateLetterProgress);
  const setFreePlayResult = useGameStore((s) => s.setFreePlayResult);
  const getLetterData = useGameStore((s) => s.getLetterData);
  const getCaptureMode = useGameStore((s) => s.getCaptureMode);

  const pickFrom = useCallback(() => {
    const pool = [...AVAILABLE_LETTERS, ...useGameStore.getState().customWords] as string[];
    return pool[Math.floor(Math.random() * pool.length)];
  }, []);

  const [suggestedLetter, setSuggestedLetter] = useState<string>(() => pickFrom());
  const [showConfetti, setShowConfetti] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [lastWrong, setLastWrong] = useState(false);
  const [detectedCount, setDetectedCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showStartOverlay, setShowStartOverlay] = useState(true);
  const hasProcessedRef = useRef(false);
  const confettiRef = useRef(false);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrongTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrongCountRef = useRef(0);

  const letterInfo = getLetterData(suggestedLetter);
  const needsMotion = getCaptureMode(suggestedLetter) === 'video';

  const pickNewLetter = useCallback(() => {
    let next: string;
    const pool = [...AVAILABLE_LETTERS, ...useGameStore.getState().customWords] as string[];
    do {
      next = pool[Math.floor(Math.random() * pool.length)];
    } while (next === suggestedLetter && pool.length > 1);
    setSuggestedLetter(next);
    setLastCorrect(false);
    setLastWrong(false);
    hasProcessedRef.current = false;
    wrongCountRef.current = 0;
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    if (wrongTimerRef.current) {
      clearTimeout(wrongTimerRef.current);
      wrongTimerRef.current = null;
    }
  }, [suggestedLetter]);

  const fireCorrect = useCallback(() => {
    if (hasProcessedRef.current) return;
    hasProcessedRef.current = true;
    setLastCorrect(true);
    setLastWrong(false);
    setDetectedCount((c) => c + 1);
    setStreak((s) => s + 1);
    updateLetterProgress(suggestedLetter, true);
    wrongCountRef.current = 0;

    if (!confettiRef.current) {
      confettiRef.current = true;
      setShowConfetti(true);
      setTimeout(() => {
        setShowConfetti(false);
        confettiRef.current = false;
      }, 2100);
    }

    advanceTimerRef.current = setTimeout(() => {
      pickNewLetter();
    }, 2000);
  }, [suggestedLetter, updateLetterProgress, pickNewLetter]);

  const handleDetected = useCallback(
    (letter: string, confidence: number, isCorrect: boolean) => {
      if (hasProcessedRef.current) return;

      if (isCorrect) {
        fireCorrect();
      } else {
        wrongCountRef.current++;
        if (wrongCountRef.current >= 8) {
          setLastWrong(true);
          setStreak(0);
          updateLetterProgress(suggestedLetter, false);
          if (wrongTimerRef.current) clearTimeout(wrongTimerRef.current);
          wrongTimerRef.current = setTimeout(() => {
            setLastWrong(false);
            wrongCountRef.current = 0;
          }, 1200);
        }
      }
    },
    [suggestedLetter, updateLetterProgress, fireCorrect]
  );

  useEffect(() => {
    return () => {
      setFreePlayResult(null, 0);
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      if (wrongTimerRef.current) clearTimeout(wrongTimerRef.current);
    };
  }, [setFreePlayResult]);

  const handleStartPlaying = () => {
    setShowStartOverlay(false);
  };

  return (
    <div className="aaa-stage flex-1 flex flex-col min-h-0">
      <ConfettiEffect active={showConfetti} />

      {/* Floating HUD */}
      <div className="mx-3 mt-3 glass-regular glass-highlight squircle depth-1 flex items-center justify-between px-2 py-2">
        <Button variant="ghost" size="icon" onClick={goBack} className="h-11 w-11 rounded-2xl hover:bg-white/5" aria-label="Volver">
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-2">
          <Badge className="bg-teal-400/10 border border-teal-300/20 text-teal-100 px-3 py-1.5 rounded-full">
            <Sparkles className="w-3 h-3 mr-1" aria-hidden="true" />
            <span className="text-xs font-bold">Juego Libre</span>
          </Badge>
          {streak >= 2 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              className="text-xs font-extrabold text-orange-200 bg-orange-400/10 border border-orange-300/20 px-2.5 py-1.5 rounded-full tabular-nums"
            >
              🔥 x{streak}
            </motion.span>
          )}
        </div>

        <span className="text-xs text-white/45 font-semibold tabular-nums pr-2">
          {detectedCount} aciertos
        </span>
      </div>

      {/* Target */}
      <div className="px-4 pt-4 pb-2 flex-shrink-0 text-center">
        <motion.div
          key={suggestedLetter}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={lastWrong
            ? { x: [-8, 8, -8, 8, 0], transition: { duration: 0.5 } }
            : { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
          }
          className="relative inline-block"
        >
          <p className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em] mb-1">Forma esta seña</p>
          <span className="text-7xl sm:text-8xl font-black tracking-tighter gradient-text leading-none">
            {suggestedLetter}
          </span>
          {isDynamicLetter(suggestedLetter) && (
            <div className="mt-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-400/10 border border-orange-300/25 px-3 py-1 text-[11px] font-bold text-orange-200 uppercase tracking-wider">
                〰️ Con movimiento · haz el trazo (~2s)
              </span>
            </div>
          )}
        </motion.div>

        <AnimatePresence>
          {letterInfo && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="text-sm text-white/55 mt-2 leading-relaxed px-4 max-w-xl mx-auto"
            >
              {letterInfo.description}
              {letterInfo.movement ? ` · ${letterInfo.movement}` : ''}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-2 min-h-0">
        <CameraView
          targetLetter={suggestedLetter}
          onDetected={handleDetected}
          size="md"
          autoStart={!showStartOverlay}
          showOverlay
          enabled={!lastCorrect && !showStartOverlay}
          forceDynamic={needsMotion}
        />
      </div>

      {/* Dock */}
      <div className="px-4 pb-4 pt-2 flex-shrink-0 max-w-3xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {lastCorrect ? (
            <motion.div
              key="correct"
              initial={{ y: 20, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0 }}
                className="rounded-[1.6rem] bg-emerald-400/10 border border-emerald-300/25 p-4 text-center depth-1"
            >
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-300" aria-hidden="true" />
                <span className="text-lg font-extrabold text-emerald-200">¡Correcto!</span>
              </div>
              <p className="text-xs text-emerald-200/60 mt-1">Siguiente letra...</p>
            </motion.div>
          ) : lastWrong ? (
            <motion.div
              key="wrong"
              initial={{ y: 20, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0 }}
                className="rounded-[1.6rem] bg-rose-400/10 border border-rose-300/25 p-4 text-center depth-1"
            >
              <div className="flex items-center justify-center gap-2">
                <XCircle className="w-5 h-5 text-rose-300" aria-hidden="true" />
                <span className="text-base font-extrabold text-rose-200">Intenta de nuevo</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="controls"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="glass-regular glass-highlight squircle flex items-center justify-between gap-2 p-4 depth-1"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-11 h-11 rounded-2xl bg-teal-400/15 border border-teal-300/20 flex items-center justify-center flex-shrink-0">
                  <Camera className="w-5 h-5 text-teal-200" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    Muestra la seña <span className="text-teal-200">{suggestedLetter}</span>
                  </p>
                  <p className="text-xs text-white/45 truncate">La IA reconocerá tu seña en tiempo real</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={pickNewLetter}
                  aria-label="Cambiar a otra letra"
                  className="h-10 rounded-2xl gap-1.5 border-white/10 bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08]"
                >
                  <Shuffle className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="text-xs font-bold hidden sm:inline">Otra letra</span>
                </Button>
                <Button
                  size="sm"
                  onClick={fireCorrect}
                  aria-label="Marcar como logrado"
                  className="h-10 rounded-2xl gap-1.5 bg-emerald-400/15 border border-emerald-300/30 text-emerald-200 hover:bg-emerald-400/25 font-bold"
                >
                  <ThumbsUp className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="text-xs">Lo logré</span>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Welcome */}
      <AnimatePresence>
        {showStartOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-[#0B1220]/90 px-4"
            role="dialog"
            aria-modal="true"
            aria-label="Bienvenido a juego libre"
          >
            <motion.div
              initial={{ scale: 0.92, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 24 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
              className="w-full max-w-sm"
            >
              <div className="glass-thick glass-highlight squircle-lg depth-3 p-7 text-center space-y-5">
                <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} className="text-5xl" aria-hidden="true">✋</motion.div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Juego Libre</h2>
                  <p className="text-sm text-white/55 mt-1.5 leading-relaxed">
                    Se te mostrará una letra. Fórmala con tu mano frente a la cámara y la IA la reconocerá al instante.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    <Button
                      size="lg"
                      className="btn-premium btn-premium-teal w-full h-13 py-3.5 text-base font-extrabold gap-2 text-white rounded-2xl border-0"
                      onClick={handleStartPlaying}
                    >
                      <Camera className="w-4 h-4" aria-hidden="true" />
                      ¡Comenzar!
                    </Button>
                  </motion.div>
                  <Button variant="ghost" size="sm" onClick={goBack} className="text-white/40 hover:text-white rounded-xl">
                    Volver al inicio
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
