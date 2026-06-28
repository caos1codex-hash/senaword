'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  initAudio,
  playCorrect,
  playWrong,
  playClick,
  playSuccess,
  playCountdown,
  setEnabled,
  isEnabled,
} from '@/lib/audio/sound-effects';

export function useSoundEffects() {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    initAudio();
  }, []);

  const toggleMute = useCallback(() => {
    const next = !isEnabled();
    setEnabled(next);
    setMuted(!next);
  }, []);

  return {
    playCorrect,
    playWrong,
    playClick,
    playSuccess,
    playCountdown,
    isMuted: muted,
    toggleMute,
  };
}