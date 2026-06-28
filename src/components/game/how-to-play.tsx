'use client';

import { motion } from 'framer-motion';
import { Camera, Hand, CheckCircle2, Sparkles, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useGameStore } from '@/stores/game-store';

const steps = [
  {
    icon: Camera,
    title: 'Permite el acceso a tu cámara',
    description: 'El juego necesita ver tu mano para reconocer las señas.',
    color: 'text-game-teal',
    bg: 'bg-game-teal/10',
  },
  {
    icon: Hand,
    title: 'Muestra la seña con tu mano',
    description: 'Forma la letra que se te pide frente a la cámara.',
    color: 'text-game-orange',
    bg: 'bg-game-orange/10',
  },
  {
    icon: CheckCircle2,
    title: 'El sistema detectará la letra en tiempo real',
    description: 'La inteligencia artificial reconocerá la seña al instante.',
    color: 'text-game-success',
    bg: 'bg-game-success/10',
  },
  {
    icon: Sparkles,
    title: '¡Practica y mejora tu puntuación!',
    description: 'Gana puntos, desbloquea rachas y domina todo el alfabeto.',
    color: 'text-game-warning',
    bg: 'bg-game-warning/10',
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export function HowToPlay() {
  const goBack = useGameStore((s) => s.goBack);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-center justify-center bg-game-bg/80 backdrop-blur-md px-4"
    >
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="w-full max-w-md"
      >
        <Card className="bg-game-card border-game-border shadow-2xl">
          <CardContent className="p-6 sm:p-8">
            {/* Header */}
            <motion.div variants={item} className="text-center mb-6">
              <div className="text-4xl mb-3">🤟</div>
              <h2 className="text-2xl font-bold text-game-text">
                ¿Cómo jugar?
              </h2>
              <p className="text-game-text-secondary text-sm mt-1">
                Aprende a usar MÍMICA en 4 pasos
              </p>
            </motion.div>

            {/* Steps */}
            <div className="flex flex-col gap-4 mb-6">
              {steps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={i}
                    variants={item}
                    className="flex items-start gap-3"
                  >
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-xl ${step.bg} flex items-center justify-center`}
                    >
                      <Icon className={`w-5 h-5 ${step.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-game-text-muted">
                          PASO {i + 1}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-game-text mt-0.5">
                        {step.title}
                      </h3>
                      <p className="text-xs text-game-text-secondary mt-0.5 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Hand illustration area */}
            <motion.div
              variants={item}
              className="rounded-xl bg-game-bg/50 border border-game-border p-4 mb-6 flex items-center justify-center"
            >
              <div className="text-center">
                <div className="text-5xl mb-2 float-animation">✋</div>
                <p className="text-xs text-game-text-muted">
                  Mantén tu mano visible y bien iluminada
                </p>
              </div>
            </motion.div>

            {/* Button */}
            <motion.div variants={item}>
              <Button
                size="lg"
                className="w-full h-12 text-base font-bold gap-2 bg-game-teal hover:bg-game-teal-dark text-white"
                onClick={goBack}
              >
                <CheckCircle2 className="w-4 h-4" />
                Entendido
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}