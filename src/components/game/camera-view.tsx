'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CameraOff, Loader2, AlertCircle, RotateCcw, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHandDetection } from '@/hooks/use-hand-detection';
import { initializeTrainingData, getAllExamples } from '@/data/training-data';
import { initializeClassifier } from '@/lib/hand-detection/classifier';
import { CONFIDENCE_REQUIRED } from '@/constants/letters';

interface CameraViewProps {
  targetLetter?: string;
  onDetected?: (letter: string, confidence: number, isCorrect: boolean) => void;
  autoStart?: boolean;
  showOverlay?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'full';
  enabled?: boolean;
}

const sizeClasses: Record<string, string> = {
  sm: 'w-full max-w-xs aspect-[4/3]',
  md: 'w-full max-w-md aspect-[4/3]',
  lg: 'w-full max-w-lg aspect-[4/3]',
  full: 'w-full aspect-video',
};

export function CameraView({
  targetLetter,
  onDetected,
  autoStart = true,
  showOverlay = true,
  size = 'md',
  enabled = true,
}: CameraViewProps) {
  const [dataReady, setDataReady] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const hasAutoStarted = useRef(false);

  // Initialize training data and classifier on mount
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        await initializeTrainingData();
        if (cancelled) return;
        const examples = getAllExamples();
        initializeClassifier(examples);
        if (!cancelled) setDataReady(true);
      } catch (err) {
        console.error('Failed to load training data:', err);
        if (!cancelled) setDataError('Error al cargar los datos de entrenamiento.');
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  const handleResult = useCallback(
    (result: { letter: string; confidence: number; isCorrect: boolean }) => {
      // Pass through all results above threshold - the free-play screen
      // handles the correct/wrong logic with its own guard
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
  } = useHandDetection({
    targetLetter,
    onResult: handleResult,
    confidenceThreshold: CONFIDENCE_REQUIRED,
  });

  // Auto-start when data is ready and enabled (via user gesture simulation)
  const handleStartClick = useCallback(() => {
    if (dataReady && enabled) {
      void startDetection();
    }
  }, [dataReady, enabled, startDetection]);

  // Auto-start effect: trigger start once when data becomes ready
  useEffect(() => {
    if (autoStart && dataReady && enabled && !hasAutoStarted.current && !isDetecting) {
      hasAutoStarted.current = true;
      void startDetection();
    }
  }, [autoStart, dataReady, enabled, isDetecting, startDetection]);

  // Stop detection when disabled
  useEffect(() => {
    if (!enabled && isDetecting) {
      stopDetection();
    }
  }, [enabled, isDetecting, stopDetection]);

  const showCorrectGlow = targetLetter
    ? detectedLetter === targetLetter && confidence >= CONFIDENCE_REQUIRED
    : false;

  const displayError = dataError || error;

  // Confidence percentage for display
  const confidencePercent = Math.round(confidence * 100);

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-game-card border border-game-border ${sizeClasses[size]}`}
    >
      {/* Hidden video element for MediaPipe processing */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none"
        playsInline
        muted
      />

      {/* Visible mirrored video feed */}
      {isDetecting && isModelLoaded && !displayError && (
        <video
          ref={(el) => {
            if (el && videoRef.current && videoRef.current.srcObject) {
              el.srcObject = videoRef.current.srcObject;
              el.play().catch(() => {});
            }
          }}
          className="absolute inset-0 w-full h-full object-cover camera-mirror"
          playsInline
          muted
          autoPlay
        />
      )}

      {/* Canvas overlay showing hand landmarks */}
      {isDetecting && isModelLoaded && !displayError && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover camera-mirror pointer-events-none"
        />
      )}

      {/* Loading data state */}
      <AnimatePresence>
        {!dataReady && !dataError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-game-card gap-3 p-4"
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-game-teal/30 border-t-game-teal animate-spin" />
              <Camera className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-game-teal" />
            </div>
            <p className="text-game-text-secondary text-sm text-center">
              Cargando datos de IA...
            </p>
            <p className="text-game-text-muted text-xs text-center">
              Preparando el reconocimiento de señas
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ready - Show start button or loading model */}
      <AnimatePresence>
        {dataReady && !isModelLoaded && !displayError && !isDetecting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-game-card gap-3 p-4"
          >
            <Button
              onClick={handleStartClick}
              size="lg"
              className="gap-2 bg-game-teal hover:bg-game-teal-dark"
            >
              <Video className="w-5 h-5" />
              Iniciar Cámara
            </Button>
            <p className="text-game-text-muted text-xs text-center">
              Se necesita acceso a la cámara
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error state */}
      <AnimatePresence>
        {displayError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-game-card gap-3 p-4"
          >
            <AlertCircle className="w-10 h-10 text-game-error" />
            <p className="text-game-text-secondary text-sm text-center max-w-[240px]">
              {displayError}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                stopDetection();
                setTimeout(() => startDetection(), 300);
              }}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reintentar
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active camera - no hand detected message */}
      <AnimatePresence>
        {isDetecting && isModelLoaded && !displayError && !handDetected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-game-bg/50 backdrop-blur-sm"
          >
            <CameraOff className="w-12 h-12 text-game-text-muted mb-3" />
            <p className="text-game-text-secondary text-sm font-medium">
              No se detecta mano
            </p>
            <p className="text-game-text-muted text-xs mt-1">
              Muestra tu mano a la cámara
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detection indicator with live confidence */}
      {isDetecting && isModelLoaded && !displayError && handDetected && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute top-3 right-3 flex items-center gap-2 bg-game-bg/70 backdrop-blur-sm rounded-full px-3 py-1.5 z-10"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="detection-pulse absolute inline-flex h-full w-full rounded-full bg-game-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-game-success" />
          </span>
          <span className="text-xs text-game-text font-medium">Detectando</span>
          {/* Show live confidence bar */}
          {confidence > 0.05 && (
            <div className="flex items-center gap-1.5 ml-1">
              <div className="w-12 h-1.5 bg-game-border rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, confidencePercent)}%`,
                    backgroundColor: confidence >= CONFIDENCE_REQUIRED ? '#22C55E' : '#F97316',
                  }}
                  animate={{ width: `${Math.min(100, confidencePercent)}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
              <span className="text-[10px] text-game-text-muted font-mono w-7 text-right">
                {confidencePercent}%
              </span>
            </div>
          )}
        </motion.div>
      )}

      {/* Detected letter overlay - only when above threshold */}
      <AnimatePresence>
        {detectedLetter && confidence >= CONFIDENCE_REQUIRED && isDetecting && !displayError && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className={`absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 ${
              showCorrectGlow ? 'glow-success' : ''
            }`}
          >
            <div
              className={`text-6xl sm:text-7xl font-black tracking-wider drop-shadow-lg ${
                showCorrectGlow ? 'text-game-success' : 'text-game-orange'
              }`}
            >
              {detectedLetter}
            </div>
            <div className="mt-2 text-sm text-game-text-secondary font-medium bg-game-bg/60 px-3 py-1 rounded-full">
              {confidencePercent}%
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Show what the classifier is seeing when below threshold but above minimum */}
      <AnimatePresence>
        {detectedLetter && confidence > 0.05 && confidence < CONFIDENCE_REQUIRED && isDetecting && !displayError && handDetected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-3 left-3 flex items-center gap-2 bg-game-bg/70 backdrop-blur-sm rounded-full px-3 py-1.5 z-10"
          >
            <span className="text-lg font-bold text-game-text-muted">{detectedLetter}</span>
            <span className="text-[10px] text-game-text-muted">analizando...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success glow border effect */}
      <AnimatePresence>
        {showCorrectGlow && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 rounded-xl border-2 border-game-success pointer-events-none z-20"
          />
        )}
      </AnimatePresence>
    </div>
  );
}