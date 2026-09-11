'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Trash2,
  Volume2,
  Info,
  Heart,
  Lock,
  Brain,
  LogOut,
  Hand,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
import { AVAILABLE_LETTERS, DYNAMIC_LETTERS } from '@/constants/letters';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.32, 0.72, 0, 1] as const } },
};

export function SettingsScreen() {
  const goBack = useGameStore((s) => s.goBack);
  const navigate = useGameStore((s) => s.navigate);
  const isDeveloper = useGameStore((s) => s.isDeveloper);
  const unlockDeveloper = useGameStore((s) => s.unlockDeveloper);
  const lockDeveloper = useGameStore((s) => s.lockDeveloper);
  const preferredHand = useGameStore((s) => s.preferredHand);
  const setPreferredHand = useGameStore((s) => s.setPreferredHand);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [devPassword, setDevPassword] = useState('');
  const [devError, setDevError] = useState(false);

  const handleUnlock = () => {
    if (unlockDeveloper(devPassword)) {
      setDevPassword('');
      setDevError(false);
    } else {
      setDevError(true);
    }
  };

  const handleResetProgress = () => {
    useGameStore.setState({
      letterProgress: {},
      totalGamesPlayed: 0,
      totalCorrectSigns: 0,
      totalSignsAttempted: 0,
      bestStreak: 0,
      totalPoints: 0,
    });
    useGameStore.getState().navigate('home');
  };

  return (
    <div className="aaa-stage flex-1 flex flex-col">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex-1 flex flex-col px-4 py-6 max-w-lg mx-auto w-full"
      >
        <motion.div variants={item} className="glass-regular glass-highlight squircle depth-1 flex items-center gap-3 p-3 pr-5 mb-5">
          <Button variant="ghost" size="icon" className="h-11 w-11 rounded-2xl hover:bg-white/5" onClick={goBack} aria-label="Volver">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Ajustes</h1>
            <p className="text-xs text-white/45">Personaliza tu experiencia</p>
          </div>
        </motion.div>

        <motion.div variants={item} className="mb-4">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/40 mb-2.5 px-1">General</h2>
          <div className="glass-regular glass-highlight squircle depth-1 divide-y divide-white/[0.06]">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-2xl bg-teal-400/12 border border-teal-300/20 flex items-center justify-center">
                  <Volume2 className="w-5 h-5 text-teal-200" aria-hidden="true" />
                </span>
                <div>
                  <div className="text-sm font-bold text-white">Efectos de sonido</div>
                  <div className="text-xs text-white/45">Activar sonidos del juego</div>
                </div>
              </div>
              <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} aria-label="Activar sonidos del juego" />
            </div>

            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-2xl bg-rose-400/12 border border-rose-300/20 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-rose-300" aria-hidden="true" />
                </span>
                <div className="text-sm font-bold text-white">Reiniciar Progreso</div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label="Reiniciar progreso"
                    className="rounded-2xl border-rose-300/30 text-rose-200 hover:bg-rose-400/10 hover:text-rose-100 bg-transparent h-10 w-10 p-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="glass-thick squircle-lg border-white/10 depth-3">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white text-lg font-extrabold">¿Borrar todo el progreso?</AlertDialogTitle>
                    <AlertDialogDescription className="text-white/55">
                      Esta acción eliminará todo tu progreso, estadísticas y letras aprendidas. No se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-2xl border-white/10 text-white/60 hover:bg-white/5 hover:text-white bg-transparent">
                      Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetProgress} className="rounded-2xl bg-gradient-to-b from-rose-400 to-rose-500 text-white border-0">
                      Borrar todo
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </motion.div>

        <motion.div variants={item} className="mb-4">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/40 mb-2.5 px-1">Mano</h2>
          <div className="glass-regular glass-highlight squircle depth-1 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl bg-teal-400/12 border border-teal-300/20 flex items-center justify-center shrink-0">
                <Hand className="w-5 h-5 text-teal-200" aria-hidden="true" />
              </span>
              <div>
                <div className="text-sm font-bold text-white">Mano dominante</div>
                <div className="text-xs text-white/45">Si se ven las dos manos, se sigue la elegida</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-black/30 border border-white/10" role="radiogroup" aria-label="Mano dominante">
              {([
                { key: 'any', label: 'Ambas' },
                { key: 'right', label: 'Derecha' },
                { key: 'left', label: 'Izquierda' },
              ] as const).map((o) => (
                <button
                  key={o.key}
                  role="radio"
                  aria-checked={preferredHand === o.key}
                  onClick={() => setPreferredHand(o.key)}
                  className={`h-10 rounded-lg text-sm font-bold transition-all ${
                    preferredHand === o.key
                      ? 'bg-teal-400/20 text-white border border-teal-300/40'
                      : 'text-white/50 hover:text-white border border-transparent'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div variants={item} className="mb-4">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/40 mb-2.5 px-1">Información</h2>
          <div className="glass-regular glass-highlight squircle depth-1 p-5 relative overflow-hidden">
            <div aria-hidden="true" className="absolute -top-12 -right-12 w-44 h-44 bg-teal-400/10 blur-3xl rounded-full" />
            <div className="flex items-center gap-2 mb-2 relative">
              <Info className="w-4 h-4 text-teal-200" aria-hidden="true" />
              <span className="text-sm font-extrabold text-white">Seña Word v0.2.0</span>
            </div>
            <p className="text-xs text-white/55 mb-3 leading-relaxed relative">
              Juego educativo para aprender el alfabeto en lengua de señas
            </p>
            <div className="h-px bg-white/[0.07] my-3" />
            <div className="space-y-2 relative">
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40">Letras disponibles:</span>
                <span className="text-xs font-bold text-white tabular-nums">{AVAILABLE_LETTERS.length} (27 español · {DYNAMIC_LETTERS.length} con movimiento)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40">Tecnología:</span>
                <span className="text-xs font-bold text-white">Reconocimiento con MediaPipe + IA</span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={item} className="mb-4">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/40 mb-2.5 px-1">Desarrollador</h2>
          <div className="glass-regular glass-highlight squircle depth-1 p-5 space-y-3">
            {!isDeveloper ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="w-11 h-11 rounded-2xl bg-orange-400/12 border border-orange-300/20 flex items-center justify-center flex-shrink-0">
                    <Lock className="w-5 h-5 text-orange-200" aria-hidden="true" />
                  </span>
                  <div>
                    <div className="text-sm font-bold text-white">Acceso restringido</div>
                    <div className="text-xs text-white/45">Zona para entrenar y modificar el modelo</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="Contraseña"
                    aria-label="Contraseña de desarrollador"
                    value={devPassword}
                    onChange={(e) => { setDevPassword(e.target.value); setDevError(false); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleUnlock(); }}
                    className="bg-black/30 border-white/10 text-white rounded-2xl h-11"
                  />
                  <Button onClick={handleUnlock} className="btn-premium btn-premium-teal text-white font-bold rounded-2xl border-0 h-11 px-5">
                    Entrar
                  </Button>
                </div>
                {devError && <p className="text-xs text-rose-300 font-semibold">Contraseña incorrecta</p>}
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span className="w-11 h-11 rounded-2xl bg-teal-400/12 border border-teal-300/20 flex items-center justify-center flex-shrink-0">
                    <Brain className="w-5 h-5 text-teal-200" aria-hidden="true" />
                  </span>
                  <div>
                    <div className="text-sm font-bold text-white">Modo desarrollador activo</div>
                    <div className="text-xs text-white/45">Puedes entrenar y modificar el modelo</div>
                  </div>
                </div>
                <Button onClick={() => navigate('train')} className="btn-premium btn-premium-teal w-full text-white font-bold gap-2 rounded-2xl border-0 h-12">
                  <Brain className="w-4 h-4" aria-hidden="true" />
                  Entrenar modelo IA
                </Button>
                <Button variant="ghost" size="sm" onClick={lockDeveloper} className="w-full text-white/40 hover:text-white gap-2 rounded-xl">
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                  Bloquear acceso
                </Button>
              </>
            )}
          </div>
        </motion.div>

        <motion.div variants={item} className="mb-6">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/40 mb-2.5 px-1">Acerca de</h2>
          <div className="glass-regular glass-highlight squircle depth-1 p-5">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-orange-300" aria-hidden="true" />
                <p className="text-xs text-white/60 leading-relaxed font-medium">Creado con cuidado para la comunidad sorda</p>
              </div>
              <p className="text-xs text-white/45 leading-relaxed">
                Usa tu cámara para aprender el alfabeto en lengua de señas de forma interactiva
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
