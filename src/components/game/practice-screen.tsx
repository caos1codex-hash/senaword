'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, EyeOff, Info, RotateCcw, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useGameStore } from '@/stores/game-store';
import { LETTER_INFO, AVAILABLE_LETTERS } from '@/constants/letters';
import { CameraView } from './camera-view';
import { ConfettiEffect } from './confetti-effect';
import { useSoundEffects } from '@/hooks/use-sound-effects';

export function PracticeScreen() {
  const practice = useGameStore((s) => s.practice);
  const goBack = useGameStore((s) => s.goBack);
  const toggleReference = useGameStore((s) => s.toggleReference);
  const setPracticeResult = useGameStore((s) => s.setPracticeResult);
  const updateLetterProgress = useGameStore((s) => s.updateLetterProgress);
  const nextPracticeLetter = useGameStore((s) => s.nextPracticeLetter);
  const prevPracticeLetter = useGameStore((s) => s.prevPracticeLetter);
  const startPractice = useGameStore((s) => s.startPractice);

  const { playCorrect, playWrong } = useSoundEffects();

  const [showConfetti, setShowConfetti] = useState(false);
  const confettiRef = useRef(false);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const letterInfo = LETTER_INFO[practice.currentLetter];
  const isCorrect = practice.lastResult?.isCorrect ?? false;
  const hasResult = practice.lastResult !== null;

  const handleDetected = useCallback(
    (letter: string, confidence: number, isCorrectDetected: boolean) => {
      // Only process if we haven't already shown a result
      if (practice.lastResult?.isCorrect) return;

      setPracticeResult({ letter, confidence, isCorrect: isCorrectDetected });

      if (isCorrectDetected) {
        updateLetterProgress(practice.currentLetter, true);
        playCorrect();

        // Trigger confetti
        if (!confettiRef.current) {
          confettiRef.current = true;
          setShowConfetti(true);
          setTimeout(() => {
            setShowConfetti(false);
            confettiRef.current = false;
          }, 2100);
        }

        // Auto-advance after 2s
        advanceTimerRef.current = setTimeout(() => {
          setPracticeResult(null);
          nextPracticeLetter();
        }, 2000);
      } else {
        updateLetterProgress(practice.currentLetter, false);
        playWrong();
      }
    },
    [practice.currentLetter, practice.lastResult, setPracticeResult, updateLetterProgress, nextPracticeLetter, playCorrect, playWrong]
  );

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  // Reset result when letter changes
  useEffect(() => {
    setPracticeResult(null);
    confettiRef.current = false;
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }, [practice.currentLetter, setPracticeResult]);

  return (
    <div className="flex-1 flex flex-col bg-game-bg relative">
      <ConfettiEffect active={showConfetti} />

      {/* Top Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-3 py-3 border-b border-game-border bg-game-card/80 backdrop-blur-sm"
      >
        <Button variant="ghost" size="icon" onClick={goBack} className="h-10 w-10">
          <ArrowLeft className="w-5 h-5" />
        </Button>

        {/* Letter navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={prevPracticeLetter}
            className="h-9 w-9"
            disabled={hasResult}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="w-10 text-center">
            <span className="text-lg font-bold text-game-teal">
              {practice.currentLetter}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={nextPracticeLetter}
            className="h-9 w-9"
            disabled={hasResult}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleReference}
          className="h-10 w-10"
          title={practice.showReference ? 'Ocultar referencia' : 'Mostrar referencia'}
        >
          {practice.showReference ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </Button>
      </motion.div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Target letter + Reference */}
        <div className="px-4 pt-4 pb-2 flex-shrink-0">
          <motion.div
            key={practice.currentLetter}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="text-center mb-2"
          >
            <span className="text-8xl font-black gradient-text">
              {practice.currentLetter}
            </span>
          </motion.div>

          <AnimatePresence>
            {practice.showReference && letterInfo && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <Card className="bg-game-card/80 border-game-border mb-2">
                  <CardContent className="p-3 space-y-2">
                    <p className="text-sm text-game-text-secondary leading-relaxed">
                      {letterInfo.description}
                    </p>
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-game-orange mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-game-text-muted leading-relaxed">
                        {letterInfo.tip}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Camera View - takes remaining space */}
        <div className="flex-1 flex items-center justify-center px-4 pb-2 min-h-0">
          <CameraView
            targetLetter={practice.currentLetter}
            onDetected={handleDetected}
            size="full"
            enabled={!isCorrect}
            showOverlay
          />
        </div>

        {/* Bottom feedback panel */}
        <div className="px-4 pb-4 pt-2 flex-shrink-0">
          <AnimatePresence mode="wait">
            {isCorrect ? (
              <motion.div
                key="correct"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                className="rounded-2xl bg-game-success/10 border border-game-success/30 p-4 text-center glow-success"
              >
                <motion.div
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  className="text-2xl font-black text-game-success success-burst"
                >
                  ¡Correcto!
                </motion.div>
                <p className="text-sm text-game-success/80 mt-1">
                  Avanzando a la siguiente letra...
                </p>
              </motion.div>
            ) : hasResult && practice.lastResult ? (
              <motion.div
                key="wrong"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                className="rounded-2xl bg-game-error/10 border border-game-error/30 p-4 text-center"
              >
                <p className="text-base font-bold text-game-error">
                  Intenta de nuevo
                </p>
                <p className="text-xs text-game-text-muted mt-1">
                  Se detectó: <span className="font-bold text-game-text-secondary">{practice.lastResult.letter}</span>
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="instruction"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-between rounded-2xl bg-game-card border border-game-border p-4"
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-10 h-10 rounded-xl bg-game-teal/10 flex items-center justify-center"
                  >
                    <span className="text-xl">✋</span>
                  </motion.div>
                  <div>
                    <p className="text-sm font-semibold text-game-text">
                      Muestra la seña
                    </p>
                    <p className="text-xs text-game-text-muted">
                      Letra: {practice.currentLetter} · Intento #{practice.attempts + 1}
                    </p>
                  </div>
                </div>
                {practice.attempts > 0 && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startPractice(practice.currentLetter)}
                      className="h-9 w-9"
                      title="Reiniciar intentos"
                    >
                      <RotateCcw className="w-4 h-4 text-game-text-muted" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        updateLetterProgress(practice.currentLetter, true);
                        setShowConfetti(true);
                        confettiRef.current = true;
                        setTimeout(() => {
                          setShowConfetti(false);
                          confettiRef.current = false;
                        }, 2100);
                        setTimeout(() => {
                          setPracticeResult(null);
                          nextPracticeLetter();
                        }, 2000);
                      }}
                      className="h-9 gap-1.5 bg-game-success/15 border border-game-success/30 text-game-success hover:bg-game-success/25"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">Lo logré</span>
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