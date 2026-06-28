'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Trash2,
  Volume2,
  Info,
  Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useGameStore } from '@/stores/game-store';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export function SettingsScreen() {
  const goBack = useGameStore((s) => s.goBack);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const handleResetProgress = () => {
    const store = useGameStore.getState();
    store.set({
      letterProgress: {},
      totalGamesPlayed: 0,
      totalCorrectSigns: 0,
      totalSignsAttempted: 0,
      bestStreak: 0,
      totalPoints: 0,
    });
    store.navigate('home');
  };

  return (
    <div className="flex-1 flex flex-col bg-mesh">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex-1 flex flex-col px-4 py-4 max-w-lg mx-auto w-full"
      >
        {/* Header */}
        <motion.div variants={item} className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            className="text-game-text-muted hover:text-game-text hover:bg-game-card"
            onClick={goBack}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-game-text">Ajustes</h1>
        </motion.div>

        {/* Section: General */}
        <motion.div variants={item} className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-game-text-muted mb-3">
            General
          </h2>
          <Card className="bg-game-card border-game-border">
            <CardContent className="p-0 divide-y divide-game-border">
              {/* Sound toggle */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-game-teal/10 flex items-center justify-center">
                    <Volume2 className="w-4 h-4 text-game-teal" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-game-text">
                      Efectos de sonido
                    </div>
                    <div className="text-xs text-game-text-muted">
                      Activar sonidos del juego
                    </div>
                  </div>
                </div>
                <Switch
                  checked={soundEnabled}
                  onCheckedChange={setSoundEnabled}
                />
              </div>

              {/* Reset progress */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-game-text">
                      Reiniciar Progreso
                    </div>
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-game-card border-game-border">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-game-text">
                        ¿Borrar todo el progreso?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-game-text-secondary">
                        Esta acción eliminará todo tu progreso, estadísticas y letras aprendidas. No se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="border-game-border text-game-text-secondary hover:bg-game-card hover:text-game-text">
                        Cancelar
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleResetProgress}
                        className="bg-red-500 hover:bg-red-600 text-white"
                      >
                        Borrar todo
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Section: Información */}
        <motion.div variants={item} className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-game-text-muted mb-3">
            Información
          </h2>
          <Card className="bg-game-card border-game-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-game-teal" />
                <span className="text-sm font-bold text-game-text">MÍMICA v0.2.0</span>
              </div>
              <p className="text-xs text-game-text-secondary mb-3 leading-relaxed">
                Juego educativo para aprender el alfabeto en lengua de señas
              </p>
              <Separator className="bg-game-border my-3" />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-game-text-muted">Letras disponibles:</span>
                  <span className="text-xs font-semibold text-game-text">24</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-game-text-muted">Tecnología:</span>
                  <span className="text-xs font-semibold text-game-text">Reconocimiento con MediaPipe + IA</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Section: Acerca de */}
        <motion.div variants={item} className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-game-text-muted mb-3">
            Acerca de
          </h2>
          <Card className="bg-game-card border-game-border">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-game-orange" />
                  <p className="text-xs text-game-text-secondary leading-relaxed">
                    Creado con ❤️ para la comunidad sorda
                  </p>
                </div>
                <p className="text-xs text-game-text-secondary leading-relaxed">
                  Usa tu cámara para aprender el alfabeto en lengua de señas de forma interactiva
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}