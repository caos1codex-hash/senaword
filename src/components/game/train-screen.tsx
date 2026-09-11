'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Video, VideoOff, Circle, Square, Download,
  Trash2, Check, ChevronLeft, ChevronRight, Info, AlertCircle,
  Pencil, RotateCcw, Camera, Plus, BookOpen, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/stores/game-store';
import { AVAILABLE_LETTERS, isDynamicLetter } from '@/constants/letters';
import { extractFeatures, isHandLandmarkValid } from '@/lib/hand-detection/feature-extractor';
import { prepareDetectFrame } from '@/lib/hand-detection/detect-frame';
import { MotionTracker, getMotionSignature } from '@/lib/hand-detection/motion-features';
import { selectHand, handLabel } from '@/lib/hand-detection/handedness';
import type { HandLandmark } from '@/types/game';
import type { HandSide } from '@/lib/hand-detection/handedness';

// MediaPipe types (same as use-hand-detection)
type HandLandmarkerInstance = {
  detectForVideo: (source: HTMLVideoElement | HTMLCanvasElement, timestamp: number) => {
    landmarks: Array<Array<{ x: number; y: number; z: number }>>;
    handednesses?: unknown[];
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
      // 2 manos para poder elegir derecha/izquierda aunque se vean ambas
      numHands: 2,
      runningMode: 'VIDEO',
      // Lowered thresholds: default 0.5 misses hands in dark rooms.
      minHandDetectionConfidence: 0.35,
      minHandPresenceConfidence: 0.35,
      minTrackingConfidence: 0.4,
    });
    return landmarkerInstance;
  })();

  return landmarkerLoading;
}

export function TrainScreen() {
  const goBack = useGameStore((s) => s.goBack);
  const getLetterData = useGameStore((s) => s.getLetterData);
  const updateLetterText = useGameStore((s) => s.updateLetterText);
  const resetLetterText = useGameStore((s) => s.resetLetterText);
  const customWords = useGameStore((s) => s.customWords);
  const addCustomWord = useGameStore((s) => s.addCustomWord);
  const removeCustomWord = useGameStore((s) => s.removeCustomWord);
  const captureModes = useGameStore((s) => s.captureModes);
  const setCaptureMode = useGameStore((s) => s.setCaptureMode);

  // State
  const [step, setStep] = useState<'select' | 'record'>('select');
  const [selectedLetter, setSelectedLetter] = useState<string>('A');
  const [libraryTab, setLibraryTab] = useState<'letras' | 'palabras'>('letras');
  const [newWord, setNewWord] = useState('');
  const [wordError, setWordError] = useState<string | null>(null);
  const [samples, setSamples] = useState<Record<string, number[][]>>({});
  // Secuencias dinámicas: dynamicSamples[letra] = lista de clips,
  // cada clip = lista de frames, cada frame = 17 features.
  const [dynamicSamples, setDynamicSamples] = useState<Record<string, number[][][]>>({});
  const [isRecording, setIsRecording] = useState(false);
  const [recordCount, setRecordCount] = useState(0);
  // Progreso 0-1 del clip dinámico en curso (2.5s) + energía de movimiento
  const [dynProgress, setDynProgress] = useState(0);
  const [dynEnergy, setDynEnergy] = useState(0);
  const [handDetected, setHandDetected] = useState(false);
  const [handMismatch, setHandMismatch] = useState(false);
  const [mismatchSide, setMismatchSide] = useState<HandSide | null>(null);
  const [modelReady, setModelReady] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editTip, setEditTip] = useState('');

  const isWordSelected = customWords.includes(selectedLetter);
  // Modo elegido por el usuario (foto/video). Default: video J/Ñ/Z, foto resto.
  const captureMode = captureModes[selectedLetter] ?? (isDynamicLetter(selectedLetter) ? 'video' : 'foto');
  const isVideoMode = captureMode === 'video';

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(-1);
  const streamRef = useRef<MediaStream | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRecordingRef = useRef(false);
  // Generation counter: invalidated by stopCamera so a superseded start
  // never surfaces a bogus AbortError.
  const startGenRef = useRef(0);
  // Stable ref for the mirrored video (inline refs re-fire every render,
  // reassigning srcObject and interrupting play() -> AbortError storm).
  const mirrorVideoRef = useCallback((el: HTMLVideoElement | null) => {
    const src = videoRef.current?.srcObject;
    if (el && src && el.srcObject !== src) {
      // NOTE: React's `muted` JSX attribute doesn't always set the media
      // property, and without real muted the browser blocks autoplay with
      // NotAllowedError -> black video. Set the property explicitly.
      el.muted = true;
      el.srcObject = src;
      el.play().catch(() => {
        // Autoplay policy may need a tick (transient activation). One retry.
        setTimeout(() => { el.play().catch(() => {}); }, 600);
      });
    }
  }, []);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  const preferredHand = useGameStore((s) => s.preferredHand);
  const preferredHandRef = useRef(preferredHand);
  useEffect(() => { preferredHandRef.current = preferredHand; }, [preferredHand]);

  // Get current letter samples
  const currentSamples = samples[selectedLetter] || [];
  const currentDynamic = dynamicSamples[selectedLetter] || [];
  const currentCount = isVideoMode ? currentDynamic.length : currentSamples.length;
  const totalSamples = Object.values(samples).reduce((acc, arr) => acc + arr.length, 0)
    + Object.values(dynamicSamples).reduce((acc, arr) => acc + arr.length, 0);

  // Navigate: letras dentro del abecedario, palabras dentro de mis palabras
  const letterIdx = AVAILABLE_LETTERS.indexOf(selectedLetter as typeof AVAILABLE_LETTERS[number]);
  const wordIdx = customWords.indexOf(selectedLetter);
  let prevLetter: string | null = null;
  let nextLetter: string | null = null;
  if (isWordSelected) {
    prevLetter = wordIdx > 0 ? customWords[wordIdx - 1] : null;
    nextLetter = wordIdx < customWords.length - 1 ? customWords[wordIdx + 1] : null;
  } else {
    prevLetter = letterIdx > 0 ? AVAILABLE_LETTERS[letterIdx - 1] : null;
    nextLetter = letterIdx < AVAILABLE_LETTERS.length - 1 ? AVAILABLE_LETTERS[letterIdx + 1] : null;
  }

  const letterInfo = getLetterData(selectedLetter);

  const handleAddWord = useCallback(() => {
    setWordError(null);
    const added = addCustomWord(newWord);
    if (!added) {
      setWordError('Usa 2-15 letras (A-Z, Ñ). Sin duplicar letras existentes.');
      return;
    }
    setNewWord('');
    setSelectedLetter(added);
    setLibraryTab('palabras');
  }, [addCustomWord, newWord]);

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
          if (data.dynamicData && typeof data.dynamicData === 'object') {
            setDynamicSamples(prev => {
              const merged = { ...prev };
              for (const [letter, clips] of Object.entries(data.dynamicData)) {
                if (Array.isArray(clips) && clips.length > 0) {
                  merged[letter] = clips as number[][][];
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
    const gen = ++startGenRef.current;
    try {
      setError(null);

      if (!landmarkerInstance) {
        await loadLandmarker();
        if (gen !== startGenRef.current) return;
        setModelReady(true);
      } else {
        setModelReady(true);
      }

      const video = videoRef.current;
      if (!video) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      if (gen !== startGenRef.current) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      streamRef.current = stream;
      video.muted = true;
      video.srcObject = stream;
      await video.play();
      if (gen !== startGenRef.current) return;
      setCameraReady(true);
      lastTimeRef.current = -1;

      // Start detection loop (throttled ~11fps: hands don't need 60fps,
      // and each frame costs a MediaPipe inference + canvas redraw).
      let lastDetect = 0;
      const detect = () => {
        if (!videoRef.current || !landmarkerInstance) return;

        const v = videoRef.current;
        if (v.readyState < 2 || v.currentTime === lastTimeRef.current) {
          animFrameRef.current = requestAnimationFrame(detect);
          return;
        }
        const t = performance.now();
        if (t - lastDetect < 90) {
          animFrameRef.current = requestAnimationFrame(detect);
          return;
        }
        lastDetect = t;
        lastTimeRef.current = v.currentTime;

        try {
          const results = landmarkerInstance.detectForVideo(prepareDetectFrame(v), performance.now());
          const allHands = (results.landmarks ?? []) as HandLandmark[][];
          const { picked, otherSidePresent } = selectHand(
            allHands,
            (results.handednesses ?? []) as unknown[],
            preferredHandRef.current ?? 'any'
          );
          if (picked) {
            setHandDetected(true);
            setHandMismatch(false);
            setMismatchSide(null);
            drawLandmarks(picked.landmarks, canvasRef.current, v, isRecordingRef.current);
          } else if (allHands.length > 0) {
            // Solo está la otra mano: se dibuja pero se avisa, no se entrena
            setHandDetected(true);
            setHandMismatch(true);
            setMismatchSide(otherSidePresent);
            drawLandmarks(allHands[0], canvasRef.current, v, isRecordingRef.current);
          } else {
            setHandDetected(false);
            setHandMismatch(false);
            setMismatchSide(null);
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
      // AbortError = play() interrupted by a superseding stop/start. Benign, ignore.
      if (err instanceof DOMException && err.name === 'AbortError') return;
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
    startGenRef.current++;
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

  // Clip dinámico: graba ~2.5s a ~10fps = ~25 frames con trayectoria.
  // Guarda 1 "clip" = secuencia de features. Ideal: 10-20 clips por letra.
  const startDynamicClip = useCallback(() => {
    if (!videoRef.current || !landmarkerInstance || !handDetected || handMismatch) return;
    setIsRecording(true);
    setDynProgress(0);
    setDynEnergy(0);
    const frames: number[][] = [];
    const tracker = new MotionTracker(2600);
    const startedAt = performance.now();
    const DURATION = 2500;

    recordTimerRef.current = setInterval(() => {
      const elapsed = performance.now() - startedAt;
      setDynProgress(Math.min(1, elapsed / DURATION));
      if (!videoRef.current || !landmarkerInstance) return;
      try {
        const results = landmarkerInstance.detectForVideo(prepareDetectFrame(videoRef.current), performance.now());
        const { picked } = selectHand(
          (results.landmarks ?? []) as HandLandmark[],
          (results.handednesses ?? []) as unknown[],
          preferredHandRef.current ?? 'any'
        );
        if (picked && isHandLandmarkValid(picked.landmarks)) {
          const landmarks = picked.landmarks;
          frames.push(extractFeatures(landmarks));
          tracker.push(landmarks, performance.now());
          const sig = getMotionSignature(tracker.window());
          setDynEnergy(Math.min(1, sig.pathLength / 0.3));
        }
      } catch {
        // ignora frames sueltos
      }
      if (elapsed >= DURATION) {
        if (recordTimerRef.current) {
          clearInterval(recordTimerRef.current);
          recordTimerRef.current = null;
        }
        setIsRecording(false);
        setDynProgress(0);
        const sig = getMotionSignature(tracker.window());
        // Solo guarda si hubo movimiento real y suficientes frames
        if (frames.length >= 8 && sig.hasMotion) {
          setDynamicSamples(prev => {
            const updated = { ...prev };
            if (!updated[selectedLetter]) updated[selectedLetter] = [];
            if (updated[selectedLetter].length < 30) {
              updated[selectedLetter] = [...updated[selectedLetter], frames];
            }
            return updated;
          });
          setRecordCount(c => c + 1);
        } else {
          setDynEnergy(0);
        }
      }
    }, 100);
  }, [handDetected, handMismatch, selectedLetter]);

  // Start recording: el modo lo elige el usuario (foto = frames sueltos,
  // video = clip 2.5s). Vale para letras y palabras.
  const startRecording = useCallback(() => {
    if (!handDetected || handMismatch) return;
    const mode = captureModes[selectedLetter] ?? (isDynamicLetter(selectedLetter) ? 'video' : 'foto');
    if (mode === 'video') {
      startDynamicClip();
      return;
    }
    setIsRecording(true);
    setRecordCount(0);

    // Auto-record a sample every 400ms
    recordTimerRef.current = setInterval(() => {
      if (!videoRef.current || !landmarkerInstance) return;

      const results = landmarkerInstance.detectForVideo(prepareDetectFrame(videoRef.current), performance.now());
      const { picked } = selectHand(
        (results.landmarks ?? []) as HandLandmark[],
        (results.handednesses ?? []) as unknown[],
        preferredHandRef.current ?? 'any'
      );
      if (picked && isHandLandmarkValid(picked.landmarks)) {
        const features = extractFeatures(picked.landmarks);

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
    }, 400);
  }, [handDetected, handMismatch, selectedLetter, startDynamicClip, captureModes]);

  // Stop recording
  const stopRecording = useCallback(() => {
    setIsRecording(false);
    setDynProgress(0);
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
  }, []);

  // Download JSON (v2 con dynamicData, compatible con v1)
  const downloadJSON = useCallback(() => {
    const staticCount = Object.values(samples).reduce((a, arr) => a + arr.length, 0);
    const dynCount = Object.values(dynamicSamples).reduce((a, arr) => a + arr.length, 0);
    const exportData = {
      format: 'senaword-training',
      version: 2,
      exportedAt: new Date().toISOString(),
      letterCount: new Set([...Object.keys(samples), ...Object.keys(dynamicSamples)]).size,
      exampleCount: staticCount + dynCount,
      data: samples,
      dynamicData: dynamicSamples,
    };

    const blob = new Blob([JSON.stringify(exportData)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'senaword-training.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [samples, dynamicSamples]);

  // Clear samples for current letter
  const clearCurrentLetter = useCallback(() => {
    setSamples(prev => {
      const updated = { ...prev };
      delete updated[selectedLetter];
      return updated;
    });
    setDynamicSamples(prev => {
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
        <div className="flex items-center justify-between px-4 py-3 border-b border-game-border bg-game-card border-b border-game-border">
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
                      Elige <strong>Foto</strong> (postura fija) o <strong>Video</strong> (clip 2.5s
                      con movimiento) para cada letra o palabra. Ej.: crea <strong>HOLA</strong>,
                      elige video o foto, entrena y descarga el JSON.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-game-text-secondary">
                <span className="text-game-text font-bold">{totalSamples}</span> muestras en{' '}
                <span className="text-game-text font-bold">{new Set([...Object.keys(samples), ...Object.keys(dynamicSamples)]).size}</span> items
                {customWords.length > 0 && (
                  <span> · <span className="text-game-text font-bold">{customWords.length}</span> palabras</span>
                )}
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

            {/* Tabs Letras / Mis palabras */}
            <div className="glass-ultra-thin squircle-sm p-1 grid grid-cols-2 gap-1" role="tablist" aria-label="Qué entrenar">
              <button
                role="tab"
                aria-selected={libraryTab === 'letras'}
                onClick={() => setLibraryTab('letras')}
                className={`h-10 rounded-[0.9rem] text-sm font-semibold transition-all ${
                  libraryTab === 'letras'
                    ? 'bg-game-teal/20 text-game-text border border-game-teal/30'
                    : 'text-game-text-secondary hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                Letras (27)
              </button>
              <button
                role="tab"
                aria-selected={libraryTab === 'palabras'}
                onClick={() => setLibraryTab('palabras')}
                className={`h-10 rounded-[0.9rem] text-sm font-semibold transition-all ${
                  libraryTab === 'palabras'
                    ? 'bg-game-orange/20 text-game-text border border-game-orange/30'
                    : 'text-game-text-secondary hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                Mis palabras{customWords.length > 0 ? ` (${customWords.length})` : ''}
              </button>
            </div>

            {libraryTab === 'letras' ? (
            /* Letter grid */
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {AVAILABLE_LETTERS.map(letter => {
                const mode = captureModes[letter] ?? (isDynamicLetter(letter) ? 'video' : 'foto');
                const count = mode === 'video'
                  ? (dynamicSamples[letter] || []).length
                  : (samples[letter] || []).length;
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
                          : mode === 'video'
                            ? 'border-game-orange/30 bg-game-orange/5 hover:bg-game-orange/10'
                            : 'border-game-border bg-game-card hover:bg-game-card-hover'
                    }`}
                  >
                    <span className={`text-2xl font-black ${
                      selectedLetter === letter ? 'text-game-teal' : 'text-game-text'
                    }`}>{letter}</span>
                    <span className="text-[9px] font-bold text-game-text-muted uppercase">
                      {mode === 'video' ? '🎥 video' : '📷 foto'}
                    </span>
                    {count > 0 && (
                      <span className="text-[10px] text-game-teal font-medium mt-0.5">{count}{mode === 'video' ? ' clips' : ''}</span>
                    )}
                    {count > 0 && (
                      <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-game-teal" />
                    )}
                  </motion.button>
                );
              })}
            </div>
            ) : (
            /* Mis palabras: crear + lista */
            <div className="space-y-3">
              <Card className="bg-game-card border-game-border">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <BookOpen className="w-4 h-4 text-game-orange mt-1 shrink-0" />
                    <p className="text-xs text-game-text-secondary leading-relaxed">
                      Crea una palabra (ej. <strong>HOLA</strong>), elige <strong>foto</strong> o{' '}
                      <strong>video</strong> abajo, y entrénala. Con video haz siempre el mismo
                      movimiento; con foto mantén siempre la misma postura.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newWord}
                      onChange={(e) => { setNewWord(e.target.value.toUpperCase()); setWordError(null); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddWord(); }}
                      placeholder="Ej. HOLA"
                      maxLength={15}
                      aria-label="Nueva palabra"
                      className="bg-game-bg/50 border-game-border text-game-text uppercase"
                    />
                    <Button onClick={handleAddWord} className="gap-1.5 bg-game-orange hover:bg-game-orange/80 text-white shrink-0">
                      <Plus className="w-4 h-4" />
                      Agregar
                    </Button>
                  </div>
                  {wordError && <p className="text-xs text-game-error font-semibold">{wordError}</p>}
                </CardContent>
              </Card>

              {customWords.length === 0 ? (
                <div className="glass-ultra-thin squircle p-6 text-center">
                  <p className="text-sm text-game-text-secondary font-semibold">Aún no tienes palabras</p>
                  <p className="text-xs text-game-text-muted mt-1">Agrega tu primera palabra arriba para empezar.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {customWords.map(word => {
                    const mode = captureModes[word] ?? 'foto';
                    const count = mode === 'video'
                      ? (dynamicSamples[word] || []).length
                      : (samples[word] || []).length;
                    const selected = selectedLetter === word;
                    return (
                      <div
                        key={word}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          selected ? 'border-game-teal bg-game-teal/10' : 'border-game-border bg-game-card'
                        }`}
                      >
                        <button onClick={() => setSelectedLetter(word)} className="flex-1 text-left min-w-0">
                          <span className={`block font-black tracking-tight truncate ${word.length > 6 ? 'text-lg' : 'text-2xl'} ${selected ? 'text-game-teal' : 'text-game-text'}`}>
                            {word}
                          </span>
                          <span className="text-[10px] text-game-text-muted">
                            {mode === 'video' ? '🎥 video' : '📷 foto'} · {count} {mode === 'video' ? 'clips' : 'fotos'}
                          </span>
                        </button>
                        {count > 0 && <span className="w-2 h-2 rounded-full bg-game-teal shrink-0" />}
                        <Button
                          variant="ghost"
                          size="icon"
                          title={`Borrar ${word}`}
                          onClick={() => {
                            removeCustomWord(word);
                            if (selectedLetter === word) setSelectedLetter('A');
                          }}
                          className="h-9 w-9 text-game-text-muted hover:text-game-error hover:bg-game-error/10 shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            )}

            {/* Selected item detail + modo foto/video + train */}
            {letterInfo && (
              <Card className="bg-game-card border-game-border">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`font-black gradient-text shrink-0 ${selectedLetter.length > 4 ? 'text-2xl' : selectedLetter.length > 1 ? 'text-3xl' : 'text-5xl'}`}>{selectedLetter}</span>
                      <div className="min-w-0">
                        {isWordSelected && (
                          <Badge className="bg-game-orange/15 border-0 text-game-orange px-2 py-0.5 mb-1">
                            <span className="text-[10px] font-bold uppercase">Palabra personalizada</span>
                          </Badge>
                        )}
                        <p className="text-sm text-game-text font-medium">{letterInfo.description}</p>
                        {letterInfo.movement && isVideoMode && (
                          <p className="text-xs text-game-orange font-semibold mt-1">〰️ {letterInfo.movement}</p>
                        )}
                        <p className="text-xs text-game-text-muted mt-1">{letterInfo.tip}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-sm text-game-text-muted mr-1">
                        {currentCount} {isVideoMode ? 'clips' : 'fotos'}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Editar textos"
                        onClick={() => {
                          setEditDescription(letterInfo.description);
                          setEditTip(letterInfo.tip);
                          setEditOpen(true);
                        }}
                        className="h-9 w-9 text-game-text-muted hover:text-game-teal hover:bg-game-teal/10"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {isWordSelected && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title={`Borrar ${selectedLetter}`}
                          onClick={() => {
                            removeCustomWord(selectedLetter);
                            setSelectedLetter('A');
                            setLibraryTab('letras');
                          }}
                          className="h-9 w-9 text-game-text-muted hover:text-game-error hover:bg-game-error/10"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Selector de modo: SOLO foto o SOLO video */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-game-text-muted">
                      Cómo la vas a entrenar
                    </span>
                    <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-game-bg/50 border border-game-border" role="radiogroup" aria-label="Modo de captura">
                      <button
                        role="radio"
                        aria-checked={!isVideoMode}
                        onClick={() => setCaptureMode(selectedLetter, 'foto')}
                        className={`flex items-center justify-center gap-2 h-11 rounded-lg text-sm font-bold transition-all ${
                          !isVideoMode
                            ? 'bg-game-teal/20 text-game-text border border-game-teal/40'
                            : 'text-game-text-secondary hover:text-white border border-transparent'
                        }`}
                      >
                        <Camera className="w-4 h-4" />
                        Solo foto
                      </button>
                      <button
                        role="radio"
                        aria-checked={isVideoMode}
                        onClick={() => setCaptureMode(selectedLetter, 'video')}
                        className={`flex items-center justify-center gap-2 h-11 rounded-lg text-sm font-bold transition-all ${
                          isVideoMode
                            ? 'bg-game-orange/20 text-game-text border border-game-orange/40'
                            : 'text-game-text-secondary hover:text-white border border-transparent'
                        }`}
                      >
                        <Video className="w-4 h-4" />
                        Solo video
                      </button>
                    </div>
                    <p className="text-[11px] text-game-text-muted leading-relaxed">
                      {isVideoMode
                        ? '🎥 Se grabará 1 clip de 2.5s por toque. Haz siempre el mismo movimiento.'
                        : '📷 Se guardan fotos sueltas (1 cada 0.4s). Mantén siempre la misma postura.'}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="lg"
                      onClick={enterRecord}
                      className="flex-1 gap-2 bg-game-teal hover:bg-game-teal-dark text-white h-12"
                    >
                      {isVideoMode ? <Video className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                      {isVideoMode ? `Grabar video "${selectedLetter}" (2.5s)` : `Entrenar "${selectedLetter}"`}
                    </Button>
                    {currentCount > 0 && (
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

                  {/* Edit letter texts dialog */}
                  <Dialog open={editOpen} onOpenChange={setEditOpen}>
                    <DialogContent className="bg-game-card border-game-border sm:max-w-sm mx-4">
                      <DialogTitle className="text-lg font-bold text-game-text">
                        Textos de la letra "{selectedLetter}"
                      </DialogTitle>
                      <DialogDescription className="text-game-text-secondary text-xs">
                        Lo que escribas aquí es lo que verá el usuario en la app.
                      </DialogDescription>
                      <div className="space-y-3 mt-2">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-game-text-muted uppercase tracking-wider">
                            Cómo hacer la seña
                          </label>
                          <Textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            rows={3}
                            className="bg-game-bg/50 border-game-border text-game-text text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-game-text-muted uppercase tracking-wider">
                            Consejo
                          </label>
                          <Textarea
                            value={editTip}
                            onChange={(e) => setEditTip(e.target.value)}
                            rows={3}
                            className="bg-game-bg/50 border-game-border text-game-text text-sm"
                          />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button
                            onClick={() => {
                              updateLetterText(selectedLetter, {
                                description: editDescription.trim(),
                                tip: editTip.trim(),
                              });
                              setEditOpen(false);
                            }}
                            className="flex-1 bg-game-teal hover:bg-game-teal-dark text-white font-bold"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Guardar
                          </Button>
                          <Button
                            variant="outline"
                            title="Volver al texto original"
                            onClick={() => {
                              resetLetterText(selectedLetter);
                              const fresh = useGameStore.getState().getLetterData(selectedLetter);
                              setEditDescription(fresh.description);
                              setEditTip(fresh.tip);
                            }}
                            className="gap-1 border-game-border text-game-text-secondary"
                          >
                            <RotateCcw className="w-4 h-4" />
                            Original
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==================== RECORD STEP ====================
  return (
    <div className="flex-1 flex flex-col bg-game-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-game-border bg-game-card border-b border-game-border">
        <Button variant="ghost" size="icon" onClick={exitRecord} className="h-10 w-10">
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-3">
          <span className={`font-black text-game-text shrink-0 ${selectedLetter.length > 4 ? 'text-lg' : 'text-2xl'}`}>{selectedLetter}</span>
          <Badge className={`px-2.5 py-1 border-0 ${isRecording ? 'bg-game-error/20 text-game-error' : isVideoMode ? 'bg-game-orange/15 text-game-orange' : 'bg-game-teal/15 text-game-teal'}`}>
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
        <p className="text-xs text-game-text-muted uppercase tracking-wider">
          {isVideoMode ? 'Haz el movimiento completo' : 'Forma la seña'}
        </p>
        <p className="text-sm text-game-text-secondary mt-0.5">{letterInfo?.description}</p>
        {isVideoMode && letterInfo?.movement && (
          <p className="text-xs text-game-orange font-semibold mt-1">〰️ {letterInfo.movement}</p>
        )}
      </div>

      {/* Camera area */}
      <div className="flex-1 flex items-center justify-center px-4 pb-2 min-h-0">
        <div className="relative w-full max-w-3xl aspect-video rounded-xl overflow-hidden bg-game-card border border-game-border">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none"
            playsInline
            muted
          />

          {cameraReady && !error && (
            <video
              ref={mirrorVideoRef}
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

          {/* No hand: compact pill so the live feed stays visible */}
          {cameraReady && !error && !handDetected && !handMismatch && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/70 rounded-full px-4 py-1.5 z-10">
              <VideoOff className="w-4 h-4 text-white/60!" />
              <p className="text-xs text-white/70! font-medium whitespace-nowrap">Muestra tu mano · busca buena luz</p>
            </div>
          )}

          {/* Wrong-hand hint */}
          {cameraReady && !error && handMismatch && preferredHand !== 'any' && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/70 rounded-full px-4 py-1.5 z-10">
              <VideoOff className="w-4 h-4 text-white/60!" />
              <p className="text-xs text-white! font-medium whitespace-nowrap">
                Esa es la {mismatchSide ? handLabel(mismatchSide) : ''} · entrena con la {handLabel(preferredHand as 'left' | 'right')}
              </p>
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
              <span className="text-xs text-white! font-bold">REC {recordCount}</span>
            </motion.div>
          )}

          {/* Hand detected indicator */}
          {!isRecording && handDetected && cameraReady && !error && (
            <div className="absolute top-3 right-3 flex items-center gap-2 bg-black/70 rounded-full px-3 py-1.5 z-10">
              <span className="relative flex h-2.5 w-2.5">
                <span className="detection-pulse absolute inline-flex h-full w-full rounded-full bg-game-success opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-game-success" />
              </span>
              <span className="text-xs text-white! font-medium">Mano detectada</span>
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
          <span>{isVideoMode ? 'Clips' : 'Muestras'}: <span className="text-game-text font-bold">{currentCount}</span></span>
          <span>{currentCount >= (isVideoMode ? 10 : 20) ? '✓ Suficiente' : `Recomendado: ${isVideoMode ? '10+ clips' : '20+'}`}</span>
        </div>
        <div className="w-full h-2 bg-game-border rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${currentCount >= (isVideoMode ? 10 : 20) ? 'bg-game-success' : 'bg-game-teal'}`}
            animate={{ width: `${Math.min(100, (currentCount / (isVideoMode ? 10 : 20)) * 100)}%` }}
          />
        </div>
        {/* Progreso del clip dinámico en curso */}
        {isVideoMode && isRecording && (
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-xs text-game-text-muted">
              <span>Grabando clip 2.5s... haz el trazo ahora</span>
              <span>{Math.round(dynProgress * 100)}%</span>
            </div>
            <div className="w-full h-2 bg-game-border rounded-full overflow-hidden">
              <div className="h-full bg-game-error rounded-full transition-all" style={{ width: `${dynProgress * 100}%` }} />
            </div>
            <div className="flex items-center justify-between text-xs text-game-text-muted">
              <span>Movimiento detectado</span>
              <span className={dynEnergy > 0.4 ? 'text-game-success font-bold' : ''}>{Math.round(dynEnergy * 100)}%</span>
            </div>
            <div className="w-full h-1.5 bg-game-border rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${dynEnergy > 0.4 ? 'bg-game-success' : 'bg-game-orange'}`}
                style={{ width: `${dynEnergy * 100}%` }}
              />
            </div>
          </div>
        )}
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
          disabled={(!handDetected && !isRecording) || (isVideoMode && isRecording) || (handMismatch && !isRecording)}
          className={`flex-1 h-12 gap-2 font-bold text-white ${
            isRecording
              ? 'bg-game-error hover:bg-game-error/80'
              : 'bg-game-teal hover:bg-game-teal-dark'
          }`}
        >
          {isRecording ? (
            <>
              <Square className="w-4 h-4 fill-white" />
              {isVideoMode ? 'Grabando clip...' : 'Detener'}
            </>
          ) : (
            <>
              <Circle className="w-4 h-4 fill-white" />
              {isVideoMode ? `Grabar clip "${selectedLetter}"` : `Grabar "${selectedLetter}"`}
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
