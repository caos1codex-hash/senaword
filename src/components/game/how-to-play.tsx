'use client';

import { motion } from 'framer-motion';
import { Camera, Hand, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/stores/game-store';

const steps = [
  {
    icon: Camera,
    title: 'Permite el acceso a tu cámara',
    description: 'El juego necesita ver tu mano para reconocer las señas.',
    tint: 'text-teal-200 bg-teal-400/10 border-teal-300/20',
  },
  {
    icon: Hand,
    title: 'Muestra la seña con tu mano',
    description: 'Forma la letra que se te pide frente a la cámara.',
    tint: 'text-orange-200 bg-orange-400/10 border-orange-300/20',
  },
  {
    icon: CheckCircle2,
    title: 'Detección en tiempo real',
    description: 'La inteligencia artificial reconocerá la seña al instante.',
    tint: 'text-emerald-200 bg-emerald-400/10 border-emerald-300/20',
  },
  {
    icon: Sparkles,
    title: '¡Practica y mejora tu puntuación!',
    description: 'Gana puntos, desbloquea rachas y domina todo el alfabeto.',
    tint: 'text-amber-200 bg-amber-400/10 border-amber-300/20',
  },
];

export function HowToPlay() {
  const goBack = useGameStore((s) => s.goBack);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#0B1220]/90 px-4 py-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Cómo jugar"
    >
      <motion.div
        initial={{ opacity: 0, y: 26, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
        className="w-full max-w-md my-auto"
      >
        <div className="glass-thick glass-highlight squircle-lg depth-3 p-6 sm:p-8 relative overflow-hidden">
          <div aria-hidden="true" className="absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-44 bg-teal-400/12 blur-3xl rounded-full" />
          <div className="text-center mb-6 relative">
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="inline-flex w-16 h-16 rounded-[1.3rem] bg-gradient-to-b from-teal-400/25 to-teal-500/10 border border-teal-300/25 items-center justify-center text-4xl mb-3 depth-teal"
              aria-hidden="true"
            >
              🤟
            </motion.div>
            <h2 className="text-2xl font-black tracking-tight">¿Cómo jugar?</h2>
            <p className="text-white/50 text-sm mt-1 font-medium">Aprende a usar Seña Word en 4 pasos</p>
          </div>

          <div className="flex flex-col gap-2.5 mb-5 relative">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.08, duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                className="flex items-start gap-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3.5"
              >
                <span className={`flex-shrink-0 w-11 h-11 rounded-2xl border flex items-center justify-center ${step.tint}`}>
                  <step.icon className="w-5 h-5" aria-hidden="true" />
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-white/35 tracking-[0.16em]">PASO {i + 1}</span>
                  <h3 className="text-sm font-bold text-white mt-0.5">{step.title}</h3>
                  <p className="text-xs text-white/50 mt-0.5 leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="rounded-2xl bg-black/25 border border-white/[0.06] p-4 mb-5 flex items-center justify-center relative">
            <div className="text-center">
              <div className="text-4xl mb-2 float-animation" aria-hidden="true">✋</div>
              <p className="text-[11px] font-semibold text-white/40">Mantén tu mano visible y bien iluminada</p>
            </div>
          </div>

          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}>
            <Button
              size="lg"
              className="btn-premium btn-premium-teal w-full h-13 py-3.5 text-base font-extrabold gap-2 text-white rounded-2xl border-0"
              onClick={goBack}
            >
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              Entendido
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
