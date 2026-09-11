'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play, X, Flame, Zap, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useGameStore } from '@/stores/game-store';
import { POINTS_PER_CORRECT, STREAK_MULTIPLIER, isDynamicLetter } from '@/constants/letters';
import { CameraView } from './camera-view';
import { ConfettiEffect } from './confetti-effect';
import { useSoundEffects } from '@/hooks/use-sound-effects';
import type { Difficulty } from '@/types/game';

export function ChallengeScreen() {
  const challenge = useGameStore((s) => s.challenge);
  const updateChallengeScore = useGameStore((s) => s.updateChallengeScore);
  const nextChallengeLetter = useGameStore((s) => s.nextChallengeLetter);
  const pauseChallenge = useGameStore((s) => s.pauseChallenge);
  const resumeChallenge = useGameStore((s) => s.resumeChallenge);
  const endChallenge = useGameStore((s) => s.endChallenge);
  const navigate = useGameStore((s) => s.navigate);
  const updateLetterProgress = useGameStore((s) => s.updateLetterProgress);
  const getCaptureMode = useGameStore((s) => s.getCaptureMode);

  const [showConfetti, setShowConfetti] = useState(false);
  const [showPoints, setShowPoints] = useState<{ points: number; id: number } | null>(null);
  const [shakeWrong, setShakeWrong] = useState(false);
  const pointsIdRef = useRef(0);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasProcessedRef = useRef(false);

  const { playCorrect, playWrong } = useSoundEffects();

  useEffect(() => {
    if (!challenge) {
      navigate('mode-select');
    }
  }, [challenge, navigate]);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  const handleDetected = useCallback(
    (letter: string, confidence: number, isCorrectDetected: boolean) => {
      if (!challenge || hasProcessedRef.current) return;

      hasProcessedRef.current = true;
      updateChallengeScore(isCorrectDetected);
      updateLetterProgress(challenge.currentLetter, isCorrectDetected);

      if (isCorrectDetected) {
        playCorrect();
        const newStreak = challenge.score.streak + 1;
        const basePoints = POINTS_PER_CORRECT[challenge.config.difficulty as Difficulty];
        let multiplier = 1;
        if (newStreak >= 10) multiplier = STREAK_MULTIPLIER[10] ?? 3;
        else if (newStreak >= 5) multiplier = STREAK_MULTIPLIER[5] ?? 2;
        else if (newStreak >= 3) multiplier = STREAK_MULTIPLIER[3] ?? 1.5;
        const earned = Math.round(basePoints * multiplier);

        setShowPoints({ points: earned, id: ++pointsIdRef.current });
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2100);

        advanceTimerRef.current = setTimeout(() => {
          setShowPoints(null);
          hasProcessedRef.current = false;
          nextChallengeLetter();
        }, 1000);
      } else {
        playWrong();
        setShakeWrong(true);
        setTimeout(() => setShakeWrong(false), 500);

        advanceTimerRef.current = setTimeout(() => {
          hasProcessedRef.current = false;
          nextChallengeLetter();
        }, 1000);
      }
    },
    [challenge, updateChallengeScore, nextChallengeLetter, updateLetterProgress, playCorrect, playWrong]
  );

  if (!challenge) return null;

  const nextStreak = challenge.score.streak + 1;
  let currentMultiplier = 1;
  if (nextStreak >= 10) currentMultiplier = STREAK_MULTIPLIER[10] ?? 3;
  else if (nextStreak >= 5) currentMultiplier = STREAK_MULTIPLIER[5] ?? 2;
  else if (nextStreak >= 3) currentMultiplier = STREAK_MULTIPLIER[3] ?? 1.5;

  return (
    <div className="aaa-stage flex-1 flex flex-col min-h-0">
      <ConfettiEffect active={showConfetti} />

      {/* Floating HUD */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
        className="mx-3 mt-3 glass-regular glass-highlight squircle depth-1 px-4 py-3 space-y-3"
      >
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Clock className="w-4 h-4 text-white/60" aria-hidden="true" />
          </span>
          <div className="flex-1">
            <TimerBar
              timeLimit={challenge.config.timeLimit}
              isPaused={challenge.isPaused}
              onTimeUp={endChallenge}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={pauseChallenge}
            className="h-10 w-10 rounded-2xl hover:bg-white/5"
            aria-label="Pausar desafío"
          >
            <Pause className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-400/10 border border-orange-300/20 px-3 py-1.5">
              <Zap className="w-4 h-4 text-orange-200" aria-hidden="true" />
              <span className="text-sm font-extrabold text-white tabular-nums">{challenge.score.points}</span>
            </span>
            {challenge.score.streak >= 2 && (
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-flex items-center gap-1 rounded-full bg-white/5 border border-white/10 px-3 py-1.5"
              >
                <Flame className="w-4 h-4 text-orange-300" aria-hidden="true" />
                <span className="text-sm font-extrabold text-orange-200 tabular-nums">x{challenge.score.streak}</span>
                {currentMultiplier > 1 && (
                  <span className="text-[11px] text-amber-200 font-bold">({currentMultiplier}x)</span>
                )}
              </motion.span>
            )}
          </div>
          <span className="text-xs font-bold text-white/40 tabular-nums">
            {challenge.letterIndex + 1} / {challenge.letters.length}
          </span>
        </div>
      </motion.div>

      {/* Target */}
      <div className="px-4 pt-4 pb-2 flex-shrink-0 text-center">
        <motion.div
          key={challenge.currentLetter}
          initial={shakeWrong ? { x: 0 } : { scale: 0.85, opacity: 0 }}
          animate={shakeWrong
            ? { x: [-10, 10, -10, 10, 0], transition: { duration: 0.5 } }
            : { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
          }
          className="relative inline-block"
        >
          <span className="text-8xl font-black tracking-tighter gradient-text leading-none">
            {challenge.currentLetter}
          </span>
          {isDynamicLetter(challenge.currentLetter) && (
            <div className="mt-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-400/10 border border-orange-300/25 px-3 py-1 text-[11px] font-bold text-orange-200 uppercase tracking-wider">
                〰️ Con movimiento
              </span>
            </div>
          )}

          <AnimatePresence>
            {showPoints && (
              <motion.div
                key={showPoints.id}
                initial={{ y: 0, opacity: 1, scale: 1 }}
                animate={{ y: -60, opacity: 0, scale: 1.4 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="absolute -top-2 left-1/2 -translate-x-1/2 pointer-events-none"
              >
                <span className="text-2xl font-black text-orange-200 drop-shadow-lg">+{showPoints.points}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-4 min-h-0">
        <CameraView
          targetLetter={challenge.currentLetter}
          onDetected={handleDetected}
          size="md"
          enabled={!challenge.isPaused && !challenge.isComplete}
          showOverlay
          forceDynamic={getCaptureMode(challenge.currentLetter) === 'video'}
        />
      </div>

      <Dialog open={challenge.isPaused} onOpenChange={(open) => {
        if (!open) resumeChallenge();
      }}>
        <DialogContent className="glass-thick squircle-lg border-white/10 sm:max-w-sm mx-4 depth-3">
          <DialogTitle className="text-xl font-extrabold tracking-tight text-white">Pausa</DialogTitle>
          <DialogDescription className="text-white/55">
            El tiempo está en pausa, ¿estás listo?
          </DialogDescription>
          <div className="flex flex-col gap-2 mt-4">
            <Button
              size="lg"
              className="btn-premium btn-premium-teal h-12 font-extrabold gap-2 text-white rounded-2xl border-0"
              onClick={resumeChallenge}
            >
              <Play className="w-4 h-4" aria-hidden="true" />
              Reanudar
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 font-bold gap-2 rounded-2xl border-rose-300/30 text-rose-200 hover:bg-rose-400/10 bg-transparent"
              onClick={endChallenge}
            >
              <X className="w-4 h-4" aria-hidden="true" />
              Terminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TimerBar({
  timeLimit,
  isPaused,
  onTimeUp,
}: {
  timeLimit: number;
  isPaused: boolean;
  onTimeUp: () => void;
}) {
  const [time, setTime] = useState(timeLimit);
  const firedRef = useRef(false);
  const onTimeUpRef = useRef(onTimeUp);

  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  useEffect(() => {
    if (isPaused || firedRef.current) return;

    const id = setInterval(() => {
      setTime((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          if (!firedRef.current) {
            firedRef.current = true;
            setTimeout(() => onTimeUpRef.current(), 0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [isPaused]);

  const timePercent = timeLimit > 0 ? (time / timeLimit) * 100 : 0;
  const isTimeLow = time <= 10;

  return (
    <div className="flex items-center gap-3">
      <Progress
        value={timePercent}
        className={`h-2.5 flex-1 bg-white/10 rounded-full overflow-hidden ${isTimeLow ? '[&>div]:bg-rose-400' : '[&>div]:bg-gradient-to-r [&>div]:from-teal-300 [&>div]:to-teal-400'}`}
      />
      <span className={`text-sm font-mono font-extrabold min-w-[32px] text-right tabular-nums ${isTimeLow ? 'text-rose-300' : 'text-white'}`}>
        {time}s
      </span>
    </div>
  );
}
