'use client';

import { motion } from 'framer-motion';
import { Palette, Play, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/stores/game-store';
import { useSoundEffects } from '@/hooks/use-sound-effects';

export function HomeScreen() {
  const navigate = useGameStore((s) => s.navigate);
  const { playClick } = useSoundEffects();

  return (
    <main className="aaa-stage flex-1 flex flex-col items-center justify-center px-4 py-10 min-h-screen">
      {/* Ambient orbs */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="orb absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full bg-teal-500/15 blur-[110px]" />
        <div className="orb-slow absolute top-1/3 -right-28 w-[460px] h-[460px] rounded-full bg-orange-500/10 blur-[120px]" />
        <div className="orb absolute bottom-0 left-1/3 w-[500px] h-[300px] rounded-full bg-violet-500/10 blur-[120px]" />
      </div>

      {/* Floating top buttons */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Cambiar tema"
          className="glass-ultra-thin squircle-sm w-11 h-11 text-game-text-secondary hover:text-white"
          onClick={() => { playClick(); navigate('themes'); }}
        >
          <Palette className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Abrir ajustes"
          className="glass-ultra-thin squircle-sm w-11 h-11 text-game-text-secondary hover:text-white"
          onClick={() => { playClick(); navigate('settings'); }}
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div>

      {/* Single start button */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
        className="w-full max-w-md relative"
      >
        <motion.div whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.97 }}>
          <Button
            size="lg"
            className="btn-premium btn-premium-teal w-full h-16 text-xl font-bold gap-3 text-white rounded-[1.6rem] border-0"
            onClick={() => { playClick(); navigate('mode-select'); }}
          >
            <Play className="w-6 h-6" aria-hidden="true" />
            Empezar
          </Button>
        </motion.div>
      </motion.div>
    </main>
  );
}
