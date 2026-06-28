'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Video, VideoOff, Circle, Square, Download,
  Trash2, Check, ChevronLeft, ChevronRight, Info, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/stores/game-store';
import { AVAILABLE_LETTERS, LETTER_INFO } from '@/constants/letters';
import { extractFeatures, isHandLandmarkValid } from '@/lib/hand-detection/feature-extractor';
import type { HandLandmark } from '@/types/game';

// MediaPipe types (same as use-hand-detection)
type HandLandmarkerInstance = {
  detectForVideo: (video: HTMLVideoElement, timestamp: number) => {
    landmarks: Array<Array<{ x: number; y: number; z: number }>>;
  };
};

let landmarkerInstance: HandLandmarkerInstance | null = null;
let landmarkerLoading: Promise<HandLandmarkerInstance> | null = null;

async function loadLandmarker(): Promise<HandLandmarkerInstance> {
  if (landmarkerInstance) return landmarkerInstance;
  if (landmarkerLoading) return landmarkerLoading;

  landmarkerLoading = (async () => {
    const { HandLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
    );
    landmarkerInstance = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task',
        delegate: 'GPU',
      },
      numHands: 1,
      runningMode: 'VIDEO',
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    return landmarkerInstance;
  })();

  return landmarkerLoading;
}

export function TrainScreen() {
  const goBack = useGameStore((s) => s.goBack);

  // State
  const [step, setStep] = useState<'select' | 'record'>('select');
  const [selectedLetter, setSelectedLetter] = useState<string>('A');
  const [samples, setSamples] = useState<Record<string, number[][]>>({});
  const [isRecording, setIsRecording] = useState(false);
  const [recordCount, setRecordCount] = useState(0);
  const [handDetected, setHandDetected] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(-1);
  const streamRef = useRef<MediaStream | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRecordingRef = useRef(false);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);

  // Get current letter samples
  const currentSamples = samples[selectedLetter] || [];
  const totalSamples = Object.values(samples).reduce((acc, arr) => acc + arr.length, 0);

  // Navigate letters
  const letterIdx = AVAILABLE_LETTERS.indexOf(selectedLetter as typeof AVAILABLE_LETTERS[number]);
  const prevLetter = letterIdx > 0 ? AVAILABLE_LETTERS[letterIdx - 1] : null;
  const nextLetter = letterIdx < AVAILABLE_LETTERS.length - 1 ? AVAILABLE_LETTERS[letterIdx + 1] : null;

  const letterInfo = LETTER_INFO[selectedLetter];

  // Load existing training data on mount
  useEffect(() => {
    async function loadExisting() {
      try {
        const base = getBasePath();
        const res = await fetch(`${base}/data/senaword-training.json`);
        if (res.ok) {
          const data = await res.json();
          if (data.data && typeof data.data === 'object') {
            setSamples(prev => {
              const merged = { ...prev };
              for (const [letter, examples] of Object.entries(data.data)) {
                if (Array.isArray(examples) && examples.length > 0) {
                  merged[letter] = examples as number[][];
                }
              }
              return merged;
            });
          }
        }
      } catch {
        // Ignore - start fresh
      }
    }
    loadExisting();
  }, []);

  // Draw landmarks on canvas
  const drawLandmarks = (landmarks: HandLandmark[], canvas: HTMLCanvasElement | null, video: HTMLVideoElement, recording: boolean) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const connections = [
      [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],
      [5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],
      [13,17],[17,18],[18,19],[19,20],[0,17],
    ];

    ctx.strokeStyle = recording ? 'rgba(239, 68, 68, 0.7)' : 'rgba(20, 184, 166, 0.6)';
    ctx.lineWidth = 3;
    for (const [a, b] of connections) {
      ctx.beginPath();
      ctx.moveTo(landmarks[a].x * canvas.width, landmarks[a].y * canvas.height);
      ctx.lineTo(landmarks[b].x * canvas.width, landmarks[b].y * canvas.height);
      ctx.stroke();
    }

    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      const x = lm.x * canvas.width;
      const y = lm.y * canvas.height;
      const isTip = [4, 8, 12, 16, 20].includes(i);

      ctx.beginPath();
      ctx.arc(x, y, isTip ? 6 : 4, 0, 2 * Math.PI);
      ctx.fillStyle = recording ? '#EF4444' : (isTip ? '#F97316' : '#14B8A6');
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  };

  // Start camera and detection
  const startCamera = useCallback(async () => {
    try {
      setError(null);

      if (!landmarkerInstance) {
        await loadLandmarker();
        setModelReady(true);
      } else {
        setModelReady(true);
      }

      const video = videoRef.current;
      if (!video) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });

      streamRef.current = stream;
      video.srcObject = stream;
      await video.play();
      setCameraReady(true);
      lastTimeRef.current = -1;

      // Start detection loop
      const detect = () => {
        if (!videoRef.current || !landmarkerInstance) return;

        const v = videoRef.current;
        if (v.readyState < 2 || v.currentTime === lastTimeRef.current) {
          animFrameRef.current = requestAnimationFrame(detect);
          return;
        }
        lastTimeRef.current = v.currentTime;

        try {
          const results = landmarkerInstance.detectForVideo(v, performance.now());
          if (results.landmarks && results.landmarks.length > 0) {
            const landmarks = results.landmarks[0] as HandLandmark[];
            setHandDetected(true);
            drawLandmarks(landmarks, canvasRef.current, v, isRecordingRef.current);
          } else {
            setHandDetected(false);
            if (canvasRef.current) {
              const ctx = canvasRef.current.getContext('2d');
              if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
          }
        } catch (err) {
          console.error('Detection error:', err);
        }

        animFrameRef.current = requestAnimationFrame(detect);
      };

      animFrameRef.current = requestAnimationFrame(detect);
    } catch (err) {
      console.error('Camera error:', err);
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Permiso de cámara denegado.');
      } else {
        setError('Error al iniciar la cámara.');
      }
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
    setHandDetected(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopCamera(); if (recordTimerRef.current) clearInterval(recordTimerRef.current); };
  }, [stopCamera]);

  // Start recording
  const startRecording = useCallback(() => {
    if (!handDetected) return;
    setIsRecording(true);
    setRecordCount(0);

    // Auto-record a sample every 400ms
    recordTimerRef.current = setInterval(() => {
      if (!videoRef.current || !landmarkerInstance) return;

      const results = landmarkerInstance.detectForVideo(videoRef.current, performance.now());
      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0] as HandLandmark[];
        if (isHandLandmarkValid(landmarks)) {
          const features = extractFeatures(landmarks);

          setSamples(prev => {
            const updated = { ...prev };
            if (!updated[selectedLetter]) updated[selectedLetter] = [];
            // Limit to 50 samples per letter to avoid bloat
            if (updated[selectedLetter].length < 50) {
              updated[selectedLetter] = [...updated[selectedLetter], features];
            }
            return updated;
          });
          setRecordCount(c => c + 1);
        }
      }
    }, 400);
  }, [handDetected, selectedLetter]);

  // Stop recording
  const stopRecording = useCallback(() => {
    setIsRecording(false);
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
  }, []);

  // Download JSON
  const downloadJSON = useCallback(() => {
    const exportData = {
      format: 'senaword-training',
      version: 1,
      exportedAt: new Date().toISOString(),
      letterCount: Object.keys(samples).length,
      exampleCount: Object.values(samples).reduce((a, arr) => a + arr.length, 0),
      data: samples,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'senaword-training.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [samples]);

  // Clear samples for current letter
  const clearCurrentLetter = useCallback(() => {
    setSamples(prev => {
      const updated = { ...prev };
      delete updated[selectedLetter];
      return updated;
    });
    }, [selectedLetter]);

  // Enter recording step
  const enterRecord = useCallback(async () => {
    setStep('record');
    // Camera will start via useEffect below
  }, []);

  // Start camera when entering record step
  useEffect(() => {
    if (step === 'record' && !cameraReady && !error) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void startCamera();
    }
  }, [step, cameraReady, error, startCamera]);

  // Go back to select
  const exitRecord = useCallback(() => {
    stopRecording();
    stopCamera();
    setStep('select');
  }, [stopRecording, stopCamera]);

  // ==================== RENDER ====================

  if (step === 'select') {
    return (
      <div className="flex-1 flex flex-col bg-game-bg">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-game-border bg-game-card/80 backdrop-blur-sm">
          <Button variant="ghost" size="icon" onClick={goBack} className="h-10 w-10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Badge className="bg-game-orange/15 border-0 text-game-orange px-2.5 py-1">
            <Video className="w-3 h-3 mr-1" />
            <span className="text-xs font-semibold">Entrenar IA</span>
          </Badge>
          <div className="w-10" />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-lg mx-auto space-y-6">
            {/* Info card */}
            <Card className="bg-game-card border-game-border">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-game-teal mt-0.5 shrink-0" />
                  <div>
                    <h2 className="text-sm font-bold text-game-text">¿Cómo funciona?</h2>
                    <p className="text-xs text-game-text-secondary mt-1 leading-relaxed">
                      Selecciona una letra, muestra la seña a la cámara y presiona <strong>"Grabar"</strong>.
                      Se capturan muestras de tu mano. Al terminar, descarga el JSON y
                      reemplaza el archivo en tu repo para que la IA aprenda tus señas.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-game-text-secondary">
                <span className="text-game-text font-bold">{totalSamples}</span> muestras en{' '}
                <span className="text-game-text font-bold">{Object.keys(samples).length}</span> letras
              </span>
              <Button
                size="sm"
                onClick={downloadJSON}
                disabled={totalSamples === 0}
                className="gap-1.5 bg-game-teal hover:bg-game-teal-dark text-white"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Descargar JSON</span>
              </Button>
            </div>

            {/* Letter grid */}
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {AVAILABLE_LETTERS.map(letter => {
                const count = (samples[letter] || []).length;
                return (
                  <motion.button
                    key={letter}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedLetter(letter)}
                    className={`relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                      selectedLetter === letter
                        ? 'border-game-teal bg-game-teal/10'
                        : count > 0
                          ? 'border-game-teal/30 bg-game-teal/5'
                          : 'border-game-border bg-game-card hover:bg-game-card-hover'
                    }`}
                  >
                    <span className={`text-2xl font-black ${
                      selectedLetter === letter ? 'text-game-teal' : 'text-game-text'
                    }`}>{letter}</span>
                    {count > 0 && (
                      <span className="text-[10px] text-game-teal font-medium mt-0.5">{count}</span>
                    )}
                    {count > 0 && (
                      <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-game-teal" />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Selected letter detail + train button */}
            {letterInfo && (
              <Card className="bg-game-card border-game-border">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-5xl font-black gradient-text">{selectedLetter}</span>
                      <div>
                        <p className="text-sm text-game-text font-medium">{letterInfo.description}</p>
                        <p className="text-xs text-game-text-muted mt-1">{letterInfo.tip}</p>
                      </div>
                    </div>
                    <span className="text-sm text-game-text-muted">
                      {currentSamples.length} muestras
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="lg"
                      onClick={enterRecord}
                      className="flex-1 gap-2 bg-game-teal hover:bg-game-teal-dark text-white h-12"
                    >
                      <Video className="w-4 h-4" />
                      Entrenar "{selectedLetter}"
                    </Button>
                    {currentSamples.length > 0 && (
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={clearCurrentLetter}
                        className="gap-2 border-game-error/30 text-game-error hover:bg-game-error/10 h-12"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-auto bg-game-card border-t border-game-border text-game-text-muted text-center text-xs py-3 px-4">
          MÍMICA © 2025 · Aprende Lengua de Señas
        </footer>
      </div>
    );
  }

  // ==================== RECORD STEP ====================
  return (
    <div className="flex-1 flex flex-col bg-game-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-game-border bg-game-card/80 backdrop-blur-sm">
        <Button variant="ghost" size="icon" onClick={exitRecord} className="h-10 w-10">
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-3">
          <span className="text-2xl font-black text-game-text">{selectedLetter}</span>
          <Badge className={`px-2.5 py-1 border-0 ${isRecording ? 'bg-game-error/20 text-game-error' : 'bg-game-teal/15 text-game-teal'}`}>
            {isRecording ? (
              <>
                <span className="relative flex h-2 w-2 mr-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-game-error opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-game-error" />
                </span>
                <span className="text-xs font-semibold">Grabando... {recordCount}</span>
              </>
            ) : (
              <span className="text-xs font-semibold">Listo</span>
            )}
          </Badge>
        </div>

        <Button variant="ghost" size="icon" onClick={downloadJSON} disabled={totalSamples === 0} className="h-10 w-10">
          <Download className="w-5 h-5" />
        </Button>
      </div>

      {/* Target letter instruction */}
      <div className="px-4 pt-3 pb-2 text-center flex-shrink-0">
        <p className="text-xs text-game-text-muted uppercase tracking-wider">Forma la seña</p>
        <p className="text-sm text-game-text-secondary mt-0.5">{letterInfo?.description}</p>
      </div>

      {/* Camera area */}
      <div className="flex-1 flex items-center justify-center px-4 pb-2 min-h-0">
        <div className="relative w-full max-w-lg aspect-video rounded-xl overflow-hidden bg-game-card border border-game-border">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none"
            playsInline
            muted
          />

          {cameraReady && !error && (
            <video
              ref={el => {
                if (el && videoRef.current?.srcObject) {
                  el.srcObject = videoRef.current.srcObject;
                  el.play().catch(() => {});
                }
              }}
              className="absolute inset-0 w-full h-full object-cover camera-mirror"
              playsInline muted autoPlay
            />
          )}

          {cameraReady && !error && (
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover camera-mirror pointer-events-none"
            />
          )}

          {/* Loading */}
          {!cameraReady && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-game-card">
              <div className="w-12 h-12 rounded-full border-4 border-game-teal/30 border-t-game-teal animate-spin" />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-game-card gap-2 px-4">
              <AlertCircle className="w-8 h-8 text-game-error" />
              <p className="text-sm text-game-text-secondary text-center">{error}</p>
            </div>
          )}

          {/* No hand */}
          {cameraReady && !error && !handDetected && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-game-bg/50 backdrop-blur-sm">
              <VideoOff className="w-10 h-10 text-game-text-muted mb-2" />
              <p className="text-sm text-game-text-secondary font-medium">Muestra tu mano</p>
            </div>
          )}

          {/* Recording indicator */}
          {isRecording && handDetected && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute top-3 left-3 flex items-center gap-2 bg-game-error/80 rounded-full px-3 py-1.5 z-10"
            >
              <Circle className="w-3 h-3 fill-white text-white" />
              <span className="text-xs text-white font-bold">REC {recordCount}</span>
            </motion.div>
          )}

          {/* Hand detected indicator */}
          {!isRecording && handDetected && cameraReady && !error && (
            <div className="absolute top-3 right-3 flex items-center gap-2 bg-game-bg/70 backdrop-blur-sm rounded-full px-3 py-1.5 z-10">
              <span className="relative flex h-2.5 w-2.5">
                <span className="detection-pulse absolute inline-flex h-full w-full rounded-full bg-game-success opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-game-success" />
              </span>
              <span className="text-xs text-game-text font-medium">Mano detectada</span>
            </div>
          )}

          {/* Recording border glow */}
          {isRecording && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 rounded-xl border-2 border-game-error pointer-events-none z-20"
            />
          )}
        </div>
      </div>

      {/* Sample count bar */}
      <div className="px-4 py-2 flex-shrink-0">
        <div className="flex items-center justify-between text-xs text-game-text-muted mb-1">
          <span>Muestras: <span className="text-game-text font-bold">{currentSamples.length}</span></span>
          <span>{currentSamples.length >= 20 ? '✓ Suficiente' : `Recomendado: 20+`}</span>
        </div>
        <div className="w-full h-2 bg-game-border rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${currentSamples.length >= 20 ? 'bg-game-success' : 'bg-game-teal'}`}
            animate={{ width: `${Math.min(100, (currentSamples.length / 20) * 100)}%` }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 pb-4 pt-2 flex-shrink-0 flex gap-3">
        {/* Letter navigation */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => { stopRecording(); setSelectedLetter(prevLetter || selectedLetter); }}
          disabled={!prevLetter || isRecording}
          className="h-12 w-12 border-game-border"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        {/* Record/Stop button */}
        <Button
          size="lg"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={!handDetected && !isRecording}
          className={`flex-1 h-12 gap-2 font-bold text-white ${
            isRecording
              ? 'bg-game-error hover:bg-game-error/80'
              : 'bg-game-teal hover:bg-game-teal-dark'
          }`}
        >
          {isRecording ? (
            <>
              <Square className="w-4 h-4 fill-white" />
              Detener
            </>
          ) : (
            <>
              <Circle className="w-4 h-4 fill-white" />
              Grabar "{selectedLetter}"
            </>
          )}
        </Button>

        {/* Letter navigation */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => { stopRecording(); setSelectedLetter(nextLetter || selectedLetter); }}
          disabled={!nextLetter || isRecording}
          className="h-12 w-12 border-game-border"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}

function getBasePath(): string {
  if (typeof window === 'undefined') return '';
  const segments = window.location.pathname.split('/').filter(Boolean);
  if (segments[0] === 'senaword') return '/senaword';
  return '';
}
