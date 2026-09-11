'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CameraOff, AlertCircle, RotateCcw, Video, Hand } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHandDetection } from '@/hooks/use-hand-detection';
import { useGameStore } from '@/stores/game-store';
import { initializeTrainingData, getMergedExamples } from '@/data/training-data';
import { initializeClassifier } from '@/lib/hand-detection/classifier';
import { handLabel } from '@/lib/hand-detection/handedness';
import { CONFIDENCE_REQUIRED, isDynamicLetter } from '@/constants/letters';

interface CameraViewProps {
  targetLetter?: string;
  onDetected?: (letter: string, confidence: number, isCorrect: boolean) => void;
  autoStart?: boolean;
  showOverlay?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'full';
  enabled?: boolean;
  /** Override modo video (true) / foto (false). Si no se pasa, default J/Ñ/Z. */
  forceDynamic?: boolean;
}

const sizeClasses: Record<string, string> = {
  sm: 'w-full max-w-sm aspect-video mx-auto',
  md: 'w-full max-w-3xl aspect-video mx-auto',
  lg: 'w-full max-w-4xl aspect-video mx-auto',
  full: 'w-full aspect-video',
};

export function CameraView({
  targetLetter,
  onDetected,
  autoStart = true,
  showOverlay = true,
  size = 'md',
  enabled = true,
  forceDynamic,
}: CameraViewProps) {
  const [dataReady, setDataReady] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [dataRetry, setDataRetry] = useState(0);
  const hasAutoStarted = useRef(false);
  const preferredHand = useGameStore((s) => s.preferredHand);

  const mirrorVideoRef = useCallback((el: HTMLVideoElement | null) => {
    const src = videoRef.current?.srcObject;
    if (el && src && el.srcObject !== src) {
      el.muted = true;
      el.srcObject = src;
      el.play().catch(() => {
        setTimeout(() => { el.play().catch(() => {}); }, 600);
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        await initializeTrainingData();
        if (cancelled) return;
        const examples = getMergedExamples();
        initializeClassifier(examples);
        if (!cancelled) {
          setDataError(null);
          setDataReady(true);
        }
      } catch (err) {
        console.error('Failed to load training data:', err);
        if (!cancelled) {
          setDataError(err instanceof Error ? err.message : 'Error al cargar los datos de entrenamiento.');
        }
      }
    }

    init();
    return () => { cancelled = true; };
  }, [dataRetry]);

  const handleResult = useCallback(
    (result: { letter: string; confidence: number; isCorrect: boolean }) => {
      if (result.confidence >= CONFIDENCE_REQUIRED * 0.8) {
        onDetected?.(result.letter, result.confidence, result.isCorrect);
      }
    },
    [onDetected]
  );

  const {
    videoRef,
    canvasRef,
    detectedLetter,
    confidence,
    isDetecting,
    isModelLoaded,
    error,
    startDetection,
    stopDetection,
    handDetected,
    motionProgress,
    isDynamicTarget,
    handMismatch,
    mismatchSide,
  } = useHandDetection({
    targetLetter,
    onResult: handleResult,
    confidenceThreshold: CONFIDENCE_REQUIRED,
    forceDynamic,
    preferredHand,
  });

  const handleStartClick = useCallback(() => {
    if (dataReady && enabled) {
      void startDetection();
    }
  }, [dataReady, enabled, startDetection]);

  useEffect(() => {
    if (autoStart && dataReady && enabled && !hasAutoStarted.current && !isDetecting) {
      hasAutoStarted.current = true;
      void startDetection();
    }
  }, [autoStart, dataReady, enabled, isDetecting, startDetection]);

  useEffect(() => {
    if (!enabled && isDetecting) {
      stopDetection();
    }
    if (!enabled) {
      hasAutoStarted.current = false;
    }
  }, [enabled, isDetecting, stopDetection]);

  useEffect(() => {
    if (enabled && dataReady && !isDetecting && hasAutoStarted.current) {
      hasAutoStarted.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetLetter]);

  const showCorrectGlow = targetLetter
    ? detectedLetter === targetLetter && confidence >= CONFIDENCE_REQUIRED && showOverlay
    : false;

  const displayError = dataError || error;
  const confidencePercent = Math.round(confidence * 100);

  return (
    <div
      className={`relative overflow-hidden glass-regular squircle-lg depth-2 ${sizeClasses[size]}`}
    >
      {/* Hidden video for MediaPipe */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none"
        playsInline
        muted
      />

      {isDetecting && isModelLoaded && !displayError && (
        <video
          ref={mirrorVideoRef}
          className="absolute inset-0 w-full h-full object-cover camera-mirror"
          playsInline
          muted
          autoPlay
        />
      )}

      {isDetecting && isModelLoaded && !displayError && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover camera-mirror pointer-events-none"
        />
      )}

      {/* Cinematic vignette */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/35 via-transparent to-black/20" />

      {/* Loading */}
      <AnimatePresence>
        {!dataReady && !dataError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 bg-[#0B1220]/95"
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-teal-300/20 border-t-teal-300 animate-spin" />
              <Camera className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-teal-200" aria-hidden="true" />
            </div>
            <p className="text-white/80 text-sm font-semibold">Cargando datos de IA...</p>
            <p className="text-white/40 text-xs">Preparando el reconocimiento de señas</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Start */}
      <AnimatePresence>
        {dataReady && !isModelLoaded && !displayError && !isDetecting && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 bg-[#0B1220]/92"
          >
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
              <Button
                onClick={handleStartClick}
                size="lg"
                className="btn-premium btn-premium-teal gap-2 text-white rounded-2xl border-0 h-12 px-6 font-bold"
              >
                <Video className="w-5 h-5" aria-hidden="true" />
                Iniciar Cámara
              </Button>
            </motion.div>
            <p className="text-white/40 text-xs">Se necesita acceso a la cámara</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {displayError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 bg-[#0B1220]/96"
          >
            <span className="w-12 h-12 rounded-2xl bg-rose-400/15 border border-rose-300/25 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-rose-300" aria-hidden="true" />
            </span>
            <p className="text-white/70 text-sm text-center max-w-[260px]">{displayError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (dataError) {
                  setDataError(null);
                  setDataRetry((n) => n + 1);
                } else {
                  stopDetection();
                  setTimeout(() => startDetection(), 300);
                }
              }}
              className="gap-2 rounded-xl border-white/15 bg-white/5 hover:bg-white/10"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              Reintentar
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No hand pill */}
      <AnimatePresence>
        {isDetecting && isModelLoaded && !displayError && !handDetected && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 border border-white/10 rounded-full px-4 py-1.5 z-10"
          >
            <CameraOff className="w-4 h-4 text-white/50!" aria-hidden="true" />
            <p className="text-xs text-white/70! font-medium whitespace-nowrap">
              No se detecta mano · usa buena luz
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wrong-hand hint: se ve una mano pero no es la elegida */}
      <AnimatePresence>
        {isDetecting && isModelLoaded && !displayError && handMismatch && preferredHand !== 'any' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 border border-white/10 rounded-full px-4 py-1.5 z-10"
          >
            <Hand className="w-4 h-4 text-white/70!" aria-hidden="true" />
            <p className="text-xs text-white! font-medium whitespace-nowrap">
              Esa es la {mismatchSide ? handLabel(mismatchSide) : ''} · muestra tu mano {handLabel(preferredHand as 'left' | 'right')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live detection pill */}
      {isDetecting && isModelLoaded && !displayError && handDetected && !handMismatch && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute top-3 right-3 flex items-center gap-2 bg-black/60 border border-white/10 rounded-full px-3 py-1.5 z-10"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="detection-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
          </span>
          <span className="text-xs text-white! font-semibold">
            {isDynamicTarget ? 'Detectando movimiento' : 'Detectando'}
          </span>
          {confidence > 0.05 && (
            <span className="flex items-center gap-1.5 ml-1">
              <span className="w-12 h-1.5 bg-white/15 rounded-full overflow-hidden">
                {/* Plain div: animating width with framer-motion here restarted
                    the animation every render (~11/s) and janked the video. */}
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${Math.min(100, confidencePercent)}%`,
                    background: confidence >= CONFIDENCE_REQUIRED ? '#34D399' : '#FB923C',
                  }}
                />
              </span>
              <span className="text-[10px] text-white/50! font-mono w-7 text-right tabular-nums">
                {confidencePercent}%
              </span>
            </span>
          )}
        </motion.div>
      )}

      {/* Big letter */}
      <AnimatePresence>
        {showOverlay && detectedLetter && confidence >= CONFIDENCE_REQUIRED && isDetecting && !displayError && (
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10"
          >
            <span
              className={`text-7xl font-black tracking-tighter drop-shadow-2xl ${
                showCorrectGlow ? 'text-emerald-300' : 'text-orange-200'
              }`}
            >
              {detectedLetter}
            </span>
            <span className="mt-2 text-xs font-bold text-white/80! bg-black/70 px-3 py-1 rounded-full border border-white/10 tabular-nums">
              {confidencePercent}%
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showOverlay && detectedLetter && confidence > 0.05 && confidence < CONFIDENCE_REQUIRED && isDetecting && !displayError && handDetected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/60 border border-white/10 rounded-full px-3 py-1.5 z-10"
          >
            <span className="text-lg font-extrabold text-white/60!">{detectedLetter}</span>
            <span className="text-[10px] text-white/40!">
              {isDynamicTarget ? 'haz el movimiento...' : 'analizando...'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barra de movimiento para J/Ñ/Z */}
      {isDetecting && isModelLoaded && !displayError && handDetected && isDynamicTarget && targetLetter && isDynamicLetter(targetLetter) && (
        <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-black/60 border border-white/10 rounded-full px-3 py-1.5 z-10">
          <span className="text-[10px] text-white/50! font-bold uppercase tracking-wider">Trazo</span>
          <span className="w-16 h-1.5 bg-white/15 rounded-full overflow-hidden">
            <span
              className="block h-full rounded-full transition-all duration-200"
              style={{
                width: `${Math.round(motionProgress * 100)}%`,
                background: motionProgress > 0.6 ? '#34D399' : '#FB923C',
              }}
            />
          </span>
          <span className="text-[10px] text-white/50! font-mono w-8 text-right tabular-nums">
            {Math.round(motionProgress * 100)}%
          </span>
        </div>
      )}

      <AnimatePresence>
        {showCorrectGlow && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 rounded-[1.75rem] border-2 border-emerald-300/80 pointer-events-none z-20"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
