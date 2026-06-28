'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Shuffle, CheckCircle2, XCircle, Sparkles, Camera, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/stores/game-store';
import { LETTER_INFO, AVAILABLE_LETTERS } from '@/constants/letters';
import { CameraView } from './camera-view';
import { ConfettiEffect } from './confetti-effect';

export function FreePlayScreen() {
  const goBack = useGameStore((s) => s.goBack);
  const updateLetterProgress = useGameStore((s) => s.updateLetterProgress);
  const setFreePlayResult = useGameStore((s) => s.setFreePlayResult);

  const [suggestedLetter, setSuggestedLetter] = useState<string>(
    () => AVAILABLE_LETTERS[Math.floor(Math.random() * AVAILABLE_LETTERS.length)]
  );
  const [showConfetti, setShowConfetti] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [lastWrong, setLastWrong] = useState(false);
  const [detectedCount, setDetectedCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showStartOverlay, setShowStartOverlay] = useState(true);
  const hasProcessedRef = useRef(false);
  const confettiRef = useRef(false);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const letterInfo = LETTER_INFO[suggestedLetter];

  const pickNewLetter = useCallback(() => {
    let next: string;
    do {
      next = AVAILABLE_LETTERS[Math.floor(Math.random() * AVAILABLE_LETTERS.length)];
    } while (next === suggestedLetter && AVAILABLE_LETTERS.length > 1);
    setSuggestedLetter(next);
    setLastCorrect(false);
    setLastWrong(false);
    hasProcessedRef.current = false;
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }, [suggestedLetter]);

  const handleDetected = useCallback(
    (letter: string, confidence: number, isCorrect: boolean) => {
      if (hasProcessedRef.current) return;

      if (isCorrect) {
        hasProcessedRef.current = true;
        setLastCorrect(true);
        setLastWrong(false);
        setDetectedCount((c) => c + 1);
        setStreak((s) => s + 1);
        updateLetterProgress(suggestedLetter, true);

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
      } else {
        setLastWrong(true);
        setStreak(0);
        updateLetterProgress(suggestedLetter, false);
        setTimeout(() => setLastWrong(false), 1200);
      }
    },
    [suggestedLetter, updateLetterProgress, pickNewLetter]
  );

  useEffect(() => {
    return () => {
      setFreePlayResult(null, 0);
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, [setFreePlayResult]);

  const handleStartPlaying = () => {
    setShowStartOverlay(false);
  };

  const handleManualCorrect = useCallback(() => {
    if (hasProcessedRef.current) return;
    hasProcessedRef.current = true;
    setLastCorrect(true);
    setLastWrong(false);
    setDetectedCount((c) => c + 1);
    setStreak((s) => s + 1);
    updateLetterProgress(suggestedLetter, true);

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

  return (
    <div className="flex-1 flex flex-col bg-game-bg relative">
      <ConfettiEffect active={showConfetti} />

      {/* Top Bar */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-game-border bg-game-card/80 backdrop-blur-sm">
        <Button variant="ghost" size="icon" onClick={goBack} className="h-10 w-10">
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-2">
          <Badge className="bg-game-teal/15 border-0 text-game-teal px-2.5 py-1">
            <Sparkles className="w-3 h-3 mr-1" />
            <span className="text-xs font-semibold">Juego Libre</span>
          </Badge>
          {streak >= 2 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-xs font-bold text-game-orange bg-game-orange/10 px-2 py-1 rounded-full"
            >
              🔥 x{streak}
            </motion.div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-game-text-muted font-medium">
            {detectedCount} aciertos
          </span>
        </div>
      </div>

      {/* Target Letter */}
      <div className="px-4 pt-4 pb-2 flex-shrink-0 text-center">
        <motion.div
          key={suggestedLetter}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={lastWrong
            ? { x: [-8, 8, -8, 8, 0], transition: { duration: 0.5 } }
            : { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } }
          }
          className="relative inline-block"
        >
          <p className="text-xs font-semibold text-game-text-muted uppercase tracking-wider mb-1">
            Forma esta seña
          </p>
          <span className="text-7xl sm:text-8xl font-black gradient-text">
            {suggestedLetter}
          </span>
        </motion.div>

        <AnimatePresence>
          {letterInfo && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="text-sm text-game-text-secondary mt-2 leading-relaxed px-4"
            >
              {letterInfo.description}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Camera View */}
      <div className="flex-1 flex items-center justify-center px-4 pb-2 min-h-0">
        <CameraView
          targetLetter={suggestedLetter}
          onDetected={handleDetected}
          size="full"
          autoStart
          showOverlay
          enabled={!lastCorrect}
        />
      </div>

      {/* Feedback + Controls */}
      <div className="px-4 pb-4 pt-2 flex-shrink-0">
        <AnimatePresence mode="wait">
          {lastCorrect ? (
            <motion.div
              key="correct"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="rounded-2xl bg-game-success/10 border border-game-success/30 p-3 text-center glow-success"
            >
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-game-success" />
                <span className="text-lg font-bold text-game-success">¡Correcto!</span>
              </div>
              <p className="text-xs text-game-success/70 mt-1">Siguiente letra...</p>
            </motion.div>
          ) : lastWrong ? (
            <motion.div
              key="wrong"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="rounded-2xl bg-game-error/10 border border-game-error/30 p-3 text-center"
            >
              <div className="flex items-center justify-center gap-2">
                <XCircle className="w-5 h-5 text-game-error" />
                <span className="text-base font-bold text-game-error">Intenta de nuevo</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="controls"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-10 h-10 rounded-xl bg-game-teal/10 flex items-center justify-center"
                >
                  <Camera className="w-5 h-5 text-game-teal" />
                </motion.div>
                <div>
                  <p className="text-sm font-semibold text-game-text">
                    Muestra la seña <span className="text-game-teal">{suggestedLetter}</span>
                  </p>
                  <p className="text-xs text-game-text-muted">
                    La IA reconocerá tu seña en tiempo real
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={pickNewLetter}
                className="h-9 gap-1.5 border-game-border text-game-text-secondary hover:bg-game-card shrink-0"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span className="text-xs font-medium hidden sm:inline">Otra letra</span>
              </Button>
              <Button
                size="sm"
                onClick={handleManualCorrect}
                className="h-9 gap-1.5 bg-game-success/15 border border-game-success/30 text-game-success hover:bg-game-success/25 shrink-0"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Lo logré</span>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Welcome overlay */}
      <AnimatePresence>
        {showStartOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-game-bg/85 backdrop-blur-md px-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="w-full max-w-sm"
            >
              <Card className="bg-game-card border-game-border shadow-2xl">
                <CardContent className="p-6 text-center space-y-5">
                  <div className="text-5xl">✋</div>
                  <div>
                    <h2 className="text-xl font-bold text-game-text">Juego Libre</h2>
                    <p className="text-sm text-game-text-secondary mt-1">
                      Se te mostrará una letra. Fórmala con tu mano frente a la cámara y la IA la reconocerá al instante.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="lg"
                      className="w-full h-12 text-base font-bold gap-2 bg-game-teal hover:bg-game-teal-dark text-white"
                      onClick={handleStartPlaying}
                    >
                      <Camera className="w-4 h-4" />
                      ¡Comenzar!
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={goBack}
                      className="text-game-text-muted"
                    >
                      Volver al inicio
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}