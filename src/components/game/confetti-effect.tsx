'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ParticleData {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  vx: number;
  vy: number;
  rotationSpeed: number;
}

interface ConfettiEffectProps {
  active: boolean;
  onComplete?: () => void;
  particleCount?: number;
}

const COLORS = [
  '#14B8A6',
  '#0D9488',
  '#F97316',
  '#FB923C',
  '#22C55E',
  '#EAB308',
  '#14B8A6',
  '#F97316',
];

function createParticles(count: number): ParticleData[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 50 + (Math.random() - 0.5) * 20,
    y: 40 + (Math.random() - 0.5) * 10,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: 6 + Math.random() * 8,
    rotation: Math.random() * 360,
    vx: (Math.random() - 0.5) * 200,
    vy: -(100 + Math.random() * 200),
    rotationSpeed: (Math.random() - 0.5) * 720,
  }));
}

export function ConfettiEffect({ active, onComplete, particleCount = 40 }: ConfettiEffectProps) {
  const [particles, setParticles] = useState<ParticleData[]>([]);

  useEffect(() => {
    if (!active) return;

    // Use rAF to avoid synchronous setState in effect body
    const rafId = requestAnimationFrame(() => {
      setParticles(createParticles(particleCount));
    });

    const timerId = setTimeout(() => {
      setParticles([]);
      onComplete?.();
    }, 2000);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
    };
  }, [active, particleCount, onComplete]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              opacity: 1,
              scale: 0,
              rotate: 0,
            }}
            animate={{
              x: p.vx,
              y: p.vy + 300,
              opacity: 0,
              scale: 1,
              rotate: p.rotationSpeed,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 1.8,
              ease: 'easeOut',
            }}
            className="absolute"
            style={{ width: p.size, height: p.size * 0.6 }}
          >
            <div
              className="w-full h-full rounded-sm"
              style={{
                backgroundColor: p.color,
                transform: `rotate(${p.rotation}deg)`,
              }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}