'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play, X, Flame, Zap, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useGameStore } from '@/stores/game-store';
import { POINTS_PER_CORRECT, STREAK_MULTIPLIER } from '@/constants/letters';
import { CameraView } from './camera-view';
import { ConfettiEffect } from './confetti-effect';
import type { Difficulty } from '@/types/game';

/* ─── Main Challenge Screen ─── */
export function ChallengeScreen() {
  const challenge = useGameStore((s) => s.challenge);
  const updateChallengeScore = useGameStore((s) => s.updateChallengeScore);
  const nextChallengeLetter = useGameStore((s) => s.nextChallengeLetter);
  const pauseChallenge = useGameStore((s) => s.pauseChallenge);
  const resumeChallenge = useGameStore((s) => s.resumeChallenge);
  const navigate = useGameStore((s) => s.navigate);
  const updateLetterProgress = useGameStore((s) => s.updateLetterProgress);

  const [showConfetti, setShowConfetti] = useState(false);
  const [showPoints, setShowPoints] = useState<{ points: number; id: number } | null>(null);
  const [shakeWrong, setShakeWrong] = useState(false);
  const pointsIdRef = useRef(0);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasProcessedRef = useRef(false);

  // Persist stats and mark challenge complete (without nulling challenge data)
  const finishChallenge = useCallback(() => {
    const st = useGameStore.getState();
    if (st.challenge) {
      st.incrementGamesPlayed();
      st.addPoints(st.challenge.score.points);
      st.incrementCorrectSigns();
      st.incrementSignsAttempted();
      if (st.challenge.score.bestStreak > st.bestStreak) {
        st.updateBestStreak(st.challenge.score.bestStreak);
      }
      useGameStore.setState({
        challenge: { ...st.challenge, isComplete: true },
        currentScreen: 'challenge-results',
      });
    }
  }, []);

  // If no challenge, navigate back
  useEffect(() => {
    if (!challenge) {
      navigate('mode-select');
    }
  }, [challenge, navigate]);

  // Cleanup on unmount
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
        setShakeWrong(true);
        setTimeout(() => setShakeWrong(false), 500);

        advanceTimerRef.current = setTimeout(() => {
          hasProcessedRef.current = false;
          nextChallengeLetter();
        }, 1000);
      }
    },
    [challenge, updateChallengeScore, nextChallengeLetter, updateLetterProgress]
  );

  if (!challenge) return null;

  const nextStreak = challenge.score.streak + 1;
  let currentMultiplier = 1;
  if (nextStreak >= 10) currentMultiplier = STREAK_MULTIPLIER[10] ?? 3;
  else if (nextStreak >= 5) currentMultiplier = STREAK_MULTIPLIER[5] ?? 2;
  else if (nextStreak >= 3) currentMultiplier = STREAK_MULTIPLIER[3] ?? 1.5;

  return (
    <div className="flex-1 flex flex-col bg-game-bg relative">
      <ConfettiEffect active={showConfetti} />

      {/* Top Bar: Timer, Score, Streak */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-3 py-3 border-b border-game-border bg-game-card/80 backdrop-blur-sm space-y-2"
      >
        {/* Timer bar */}
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 flex-shrink-0 text-game-text-secondary" />
          <div className="flex-1">
            <TimerBar
              timeLimit={challenge.config.timeLimit}
              isPaused={challenge.isPaused}
              onTimeUp={finishChallenge}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={pauseChallenge}
            className="h-9 w-9 flex-shrink-0"
          >
            <Pause className="w-4 h-4" />
          </Button>
        </div>

        {/* Score + Streak + Progress */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-game-orange" />
              <span className="text-sm font-bold text-game-text">
                {challenge.score.points}
              </span>
            </div>
            {challenge.score.streak >= 2 && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-1"
              >
                <Flame className="w-4 h-4 text-game-orange" />
                <span className="text-sm font-bold text-game-orange">
                  x{challenge.score.streak}
                </span>
                {currentMultiplier > 1 && (
                  <span className="text-xs text-game-warning font-semibold">
                    ({currentMultiplier}x)
                  </span>
                )}
              </motion.div>
            )}
          </div>
          <span className="text-xs text-game-text-muted">
            {challenge.letterIndex + 1} / {challenge.letters.length}
          </span>
        </div>
      </motion.div>

      {/* Target Letter */}
      <div className="px-4 pt-4 pb-2 flex-shrink-0 text-center">
        <motion.div
          key={challenge.currentLetter}
          initial={shakeWrong ? { x: 0 } : { scale: 0.8, opacity: 0 }}
          animate={shakeWrong
            ? { x: [-10, 10, -10, 10, 0], transition: { duration: 0.5 } }
            : { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } }
          }
          className="relative inline-block"
        >
          <span className="text-8xl font-black gradient-text">
            {challenge.currentLetter}
          </span>

          {/* Floating points animation */}
          <AnimatePresence>
            {showPoints && (
              <motion.div
                key={showPoints.id}
                initial={{ y: 0, opacity: 1, scale: 1 }}
                animate={{ y: -60, opacity: 0, scale: 1.5 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="absolute -top-2 left-1/2 -translate-x-1/2 pointer-events-none"
              >
                <span className="text-2xl font-black text-game-orange">
                  +{showPoints.points}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Camera View */}
      <div className="flex-1 flex items-center justify-center px-4 pb-4 min-h-0">
        <CameraView
          targetLetter={challenge.currentLetter}
          onDetected={handleDetected}
          size="full"
          enabled={!challenge.isPaused && !challenge.isComplete}
          showOverlay
        />
      </div>

      {/* Pause Dialog */}
      <Dialog open={challenge.isPaused} onOpenChange={(open) => {
        if (!open) resumeChallenge();
      }}>
        <DialogContent className="bg-game-card border-game-border sm:max-w-sm mx-4">
          <DialogTitle className="text-xl font-bold text-game-text">
            Pausa
          </DialogTitle>
          <DialogDescription className="text-game-text-secondary">
            El tiempo sigue corriendo, ¿estás listo?
          </DialogDescription>
          <div className="flex flex-col gap-2 mt-4">
            <Button
              size="lg"
              className="h-12 font-bold gap-2 bg-game-teal hover:bg-game-teal-dark text-white"
              onClick={resumeChallenge}
            >
              <Play className="w-4 h-4" />
              Reanudar
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 font-bold gap-2 border-game-error/40 text-game-error hover:bg-game-error/10"
              onClick={finishChallenge}
            >
              <X className="w-4 h-4" />
              Terminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Timer bar sub-component ─── */
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

  useEffect(() => {
    if (isPaused) return;

    const id = setInterval(() => {
      setTime((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [isPaused, onTimeUp]);

  const timePercent = timeLimit > 0 ? (time / timeLimit) * 100 : 0;
  const isTimeLow = time <= 10;

  return (
    <div className="flex items-center gap-3">
      <Progress
        value={timePercent}
        className={`h-2 flex-1 ${isTimeLow ? '[&>div]:bg-game-error' : '[&>div]:bg-game-teal'}`}
      />
      <span className={`text-sm font-mono font-bold min-w-[28px] text-right ${isTimeLow ? 'text-game-error' : 'text-game-text'}`}>
        {time}s
      </span>
    </div>
  );
}