'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/stores/game-store';
import { LETTER_INFO } from '@/constants/letters';
import { CameraView } from './camera-view';

interface HistoryEntry {
  letter: string;
  confidence: number;
  timestamp: number;
}

export function FreePlayScreen() {
  const goBack = useGameStore((s) => s.goBack);
  const setFreePlayResult = useGameStore((s) => s.setFreePlayResult);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const historyRef = useRef<HistoryEntry[]>([]);
  const debounceRef = useRef<string | null>(null);

  const handleDetected = useCallback(
    (letter: string, confidence: number, _isCorrect: boolean) => {
      setFreePlayResult(letter, confidence);

      const lastEntry = historyRef.current[0];
      if (lastEntry?.letter === letter) return;

      const now = Date.now();
      if (debounceRef.current === letter && lastEntry && now - lastEntry.timestamp < 1500) return;
      debounceRef.current = letter;

      const entry: HistoryEntry = { letter, confidence, timestamp: now };
      historyRef.current = [entry, ...historyRef.current].slice(0, 5);
      setHistory([...historyRef.current]);
    },
    [setFreePlayResult]
  );

  const freePlayLetter = useGameStore((s) => s.freePlayLetter);
  const freePlayConfidence = useGameStore((s) => s.freePlayConfidence);

  const letterInfo = freePlayLetter ? LETTER_INFO[freePlayLetter] : null;

  useEffect(() => {
    return () => {
      setFreePlayResult(null, 0);
    };
  }, [setFreePlayResult]);

  return (
    <div className="flex-1 flex flex-col bg-game-bg relative">
      <div className="absolute top-3 left-3 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={goBack}
          className="h-11 w-11 bg-game-bg/60 backdrop-blur-sm border border-game-border/50 hover:bg-game-bg/80"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>

      <div className="absolute top-3 right-3 z-10">
        <Badge className="bg-game-bg/60 backdrop-blur-sm border border-game-border/50 text-game-text-secondary hover:bg-game-bg/60 px-3 py-1.5">
          <span className="text-xs font-semibold">Juego Libre</span>
        </Badge>
      </div>

      <div className="flex-1 flex items-center justify-center px-3 pt-16 pb-3 min-h-0">
        <CameraView
          onDetected={handleDetected}
          size="full"
          autoStart
          showOverlay
        />
      </div>

      <AnimatePresence>
        {freePlayLetter && freePlayConfidence > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="px-4 pb-1"
          >
            <div className="rounded-2xl bg-game-card/90 backdrop-blur-sm border border-game-border p-3 flex items-center gap-4">
              <div className="text-center min-w-[60px]">
                <span className="text-4xl font-black text-game-teal">
                  {freePlayLetter}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                {letterInfo && (
                  <p className="text-sm text-game-text-secondary leading-snug">
                    {letterInfo.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 h-1.5 rounded-full bg-game-bg overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-game-teal"
                      initial={{ width: 0 }}
                      animate={{ width: `${freePlayConfidence * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <span className="text-xs text-game-text-muted font-mono min-w-[36px] text-right">
                    {Math.round(freePlayConfidence * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {history.length > 0 && (
        <div className="px-4 pb-4 pt-2">
          <div className="flex items-center gap-1.5 mb-2">
            <History className="w-3.5 h-3.5 text-game-text-muted" />
            <span className="text-xs font-semibold text-game-text-muted uppercase tracking-wider">
              Historial reciente
            </span>
          </div>
          <div className="flex gap-2">
            {history.map((entry, i) => (
              <motion.div
                key={`${entry.letter}-${entry.timestamp}`}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 - i * 0.15 }}
                className="w-11 h-11 rounded-xl bg-game-card border border-game-border flex items-center justify-center"
              >
                <span
                  className={`text-lg font-bold ${
                    i === 0 ? 'text-game-teal' : 'text-game-text-muted'
                  }`}
                >
                  {entry.letter}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}