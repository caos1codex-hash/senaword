'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import type { HandLandmark, DetectedHand, RecognitionResult, HandPreference } from '@/types/game';
import { extractFeatures, isHandLandmarkValid } from '@/lib/hand-detection/feature-extractor';
import { classifyFeatures, isClassifierReady } from '@/lib/hand-detection/classifier';
import { prepareDetectFrame } from '@/lib/hand-detection/detect-frame';
import { MotionTracker, classifyDynamicLetter } from '@/lib/hand-detection/motion-features';
import { selectHand, type HandSide } from '@/lib/hand-detection/handedness';
import { isDynamicLetter } from '@/constants/letters';

interface UseHandDetectionOptions {
  targetLetter?: string;
  onResult?: (result: RecognitionResult) => void;
  onHandDetected?: (hand: DetectedHand) => void;
  enabled?: boolean;
  confidenceThreshold?: number;
  /**
   * Override del modo de captura elegido por el usuario en Entrenar
   * (foto = estático, video = con movimiento). Si no se pasa,
   * se usa el default: video para J/Ñ/Z, foto para el resto.
   */
  forceDynamic?: boolean;
  /** Qué mano seguir si se ven las dos. Default 'any'. */
  preferredHand?: HandPreference;
}

interface UseHandDetectionReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  detectedLetter: string | null;
  confidence: number;
  isDetecting: boolean;
  isModelLoaded: boolean;
  error: string | null;
  startDetection: () => Promise<void>;
  stopDetection: () => void;
  latestResult: RecognitionResult | null;
  handDetected: boolean;
  /** 0-1: cuánto movimiento se ha acumulado en la ventana (solo dinámicas). */
  motionProgress: number;
  /** True si la letra objetivo requiere movimiento. */
  isDynamicTarget: boolean;
  /** Lado de la mano que se está siguiendo ahora mismo. */
  trackedHand: HandSide | null;
  /** Hay mano visible pero no es la elegida en Ajustes. */
  handMismatch: boolean;
  /** Lado que sí se ve (para el aviso), null si no se ve ninguna. */
  mismatchSide: HandSide | null;
}

type HandLandmarkerInstance = {
  detectForVideo: (source: HTMLVideoElement | HTMLCanvasElement, timestamp: number) => {
    landmarks: Array<Array<{ x: number; y: number; z: number }>>;
    handednesses?: unknown[];
  };
};

let handLandmarkerInstance: HandLandmarkerInstance | null = null;
let modelLoading: Promise<HandLandmarkerInstance> | null = null;

async function loadModel(): Promise<HandLandmarkerInstance> {
  if (handLandmarkerInstance) return handLandmarkerInstance;
  if (modelLoading) return modelLoading;

  modelLoading = (async () => {
    const { HandLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
    );
    handLandmarkerInstance = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task',
        delegate: 'GPU',
      },
      // 2 manos: así se puede elegir derecha/izquierda aunque se vean ambas.
      // El costo extra es mínimo (~11 inferencias/seg).
      numHands: 2,
      runningMode: 'VIDEO',
      // Lowered thresholds: default 0.5 misses hands in dark rooms.
      minHandDetectionConfidence: 0.35,
      minHandPresenceConfidence: 0.35,
      minTrackingConfidence: 0.4,
    });
    return handLandmarkerInstance;
  })();

  return modelLoading;
}

interface BufferEntry {
  confidence: number;
  correctFrames: number;
  totalFrames: number;
}

export function useHandDetection(options: UseHandDetectionOptions = {}): UseHandDetectionReturn {
  const {
    targetLetter,
    onResult,
    onHandDetected,
    enabled = true,
    confidenceThreshold = 0.40,
    forceDynamic,
    preferredHand = 'any',
  } = options;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number>(0);
  const lastVideoTimeRef = useRef<number>(-1);
  const streamRef = useRef<MediaStream | null>(null);
  const isDetectingRef = useRef(false);
  // Generation counter: invalidated by stopDetection so a superseded
  // start (or a stop mid-start) never reports bogus errors like AbortError.
  const startGenRef = useRef(0);
  const targetLetterRef = useRef(targetLetter);
  const confidenceThresholdRef = useRef(confidenceThreshold);
  const forceDynamicRef = useRef(forceDynamic);
  const preferredHandRef = useRef<HandPreference>(preferredHand);
  const onResultRef = useRef(onResult);
  const onHandDetectedRef = useRef(onHandDetected);

  // Buffer tracks confidence per letter
  const detectionBufferRef = useRef<Record<string, BufferEntry>>({});
  // Perf: run the heavy MediaPipe + classify work at most ~11x/sec.
  // Hands don't move faster than that; 60fps detection only burns CPU/GPU.
  const lastDetectTimeRef = useRef(0);
  const DETECT_INTERVAL_MS = 90;
  // Perf: avoid re-rendering the UI 60x/sec for tiny confidence jitters.
  const lastUiPushRef = useRef<{ letter: string | null; conf: number; time: number }>({
    letter: null,
    conf: 0,
    time: 0,
  });
  // Track consecutive correct frames for the target
  const targetCorrectFramesRef = useRef(0);
  // Rate limiting: prevent firing onResult too frequently
  const lastResultTimeRef = useRef(0);
  const RESULT_COOLDOWN_MS = 1500; // Minimum 1.5s between result callbacks
  // Movimiento: solo se usa cuando el objetivo es dinámico (J/Ñ/Z)
  const motionTrackerRef = useRef<MotionTracker>(new MotionTracker());
  const lastMotionProgRef = useRef(0);
  const handMismatchRef = useRef(false);

  const [detectedLetter, setDetectedLetter] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestResult, setLatestResult] = useState<RecognitionResult | null>(null);
  const [handDetected, setHandDetected] = useState(false);
  const [motionProgress, setMotionProgress] = useState(0);
  const [trackedHand, setTrackedHand] = useState<HandSide | null>(null);
  const [handMismatch, setHandMismatch] = useState(false);
  const [mismatchSide, setMismatchSide] = useState<HandSide | null>(null);

  // Al cambiar de mano preferida se reinicia la ventana de movimiento y
  // el buffer: no mezclar trazos de una mano con la otra.
  const resetMotionAndBuffer = useCallback(() => {
    motionTrackerRef.current.reset();
    lastMotionProgRef.current = 0;
    detectionBufferRef.current = {};
    targetCorrectFramesRef.current = 0;
    setMotionProgress(0);
    setLatestResult(null);
  }, []);

  // Keep refs in sync with props
  useEffect(() => { targetLetterRef.current = targetLetter; }, [targetLetter]);
  useEffect(() => { confidenceThresholdRef.current = confidenceThreshold; }, [confidenceThreshold]);
  useEffect(() => { forceDynamicRef.current = forceDynamic; }, [forceDynamic]);
  useEffect(() => { preferredHandRef.current = preferredHand; }, [preferredHand]);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onHandDetectedRef.current = onHandDetected; }, [onHandDetected]);
  useEffect(() => { isDetectingRef.current = isDetecting; }, [isDetecting]);

  // Al cambiar de letra objetivo o de mano preferida, reinicia la ventana
  // de movimiento y el buffer. Si no, el trazo de la letra anterior (o de
  // la otra mano) contaminaría la detección.
  useEffect(() => {
    motionTrackerRef.current.reset();
    detectionBufferRef.current = {};
    targetCorrectFramesRef.current = 0;
    lastMotionProgRef.current = 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMotionProgress(0);
    setLatestResult(null);
    setHandMismatch(false);
    setMismatchSide(null);
  }, [targetLetter, preferredHand]);

  const drawHandLandmarks = useCallback(
    (landmarks: HandLandmark[], canvas: HTMLCanvasElement, video: HTMLVideoElement) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Evitar realloc cada frame: solo redimensionar si cambió el tamaño
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4],
        [0, 5], [5, 6], [6, 7], [7, 8],
        [5, 9], [9, 10], [10, 11], [11, 12],
        [9, 13], [13, 14], [14, 15], [15, 16],
        [13, 17], [17, 18], [18, 19], [19, 20],
        [0, 17],
      ];

      ctx.strokeStyle = 'rgba(20, 184, 166, 0.6)';
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
        ctx.fillStyle = isTip ? '#F97316' : '#14B8A6';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    },
    []
  );

  // Store processFrame in a ref to avoid the "accessed before declared" issue
  const processFrameRef = useRef<() => void>(() => {});

  // Update the processFrame ref whenever dependencies change
  useEffect(() => {
    processFrameRef.current = () => {
      if (!videoRef.current || !handLandmarkerInstance || !isDetectingRef.current) return;

      const video = videoRef.current;
      if (video.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(() => processFrameRef.current());
        return;
      }

      if (video.currentTime === lastVideoTimeRef.current) {
        animationFrameRef.current = requestAnimationFrame(() => processFrameRef.current());
        return;
      }
      lastVideoTimeRef.current = video.currentTime;

      // Perf gate: heavy work (MediaPipe + classify + canvas) at most ~11fps.
      // The video element keeps playing smoothly on its own; only the
      // analysis + overlay slow down, which is imperceptible for hands.
      const nowMs = performance.now();
      if (nowMs - lastDetectTimeRef.current < DETECT_INTERVAL_MS) {
        animationFrameRef.current = requestAnimationFrame(() => processFrameRef.current());
        return;
      }
      lastDetectTimeRef.current = nowMs;

      try {
        // Brightness-boosted frame: helps detection a lot in dark rooms.
        const results = handLandmarkerInstance.detectForVideo(prepareDetectFrame(video), performance.now());

        if (results.landmarks && results.landmarks.length > 0) {
          // Selección de mano: si el usuario eligió derecha/izquierda y se
          // ven las dos, se sigue la elegida; si solo está la otra, se avisa.
          const allHands = results.landmarks as HandLandmark[][];
          const rawLabels = (results.handednesses ?? []) as unknown[];
          const { picked, otherSidePresent } = selectHand(
            allHands,
            rawLabels,
            preferredHandRef.current ?? 'any'
          );

          if (!picked) {
            // Mano visible pero no es la elegida: no clasificar, solo avisar.
            handMismatchRef.current = true;
            setHandDetected(true);
            setTrackedHand(null);
            setHandMismatch(true);
            setMismatchSide(otherSidePresent);
            setDetectedLetter(null);
            setConfidence(0);
            setLatestResult(null);
            const visible = allHands[0];
            if (visible && canvasRef.current) {
              drawHandLandmarks(visible, canvasRef.current, video);
            }
            for (const k in detectionBufferRef.current) {
              detectionBufferRef.current[k].confidence *= 0.5;
              if (detectionBufferRef.current[k].confidence < 0.05) delete detectionBufferRef.current[k];
            }
            targetCorrectFramesRef.current = 0;
            animationFrameRef.current = requestAnimationFrame(() => processFrameRef.current());
            return;
          }

          const landmarks = picked.landmarks;
          setHandDetected(true);
          setTrackedHand(picked.side);
          if (otherSidePresent !== null || handMismatchRef.current) {
            // Resuelto: ya está la mano elegida (o cambió la preferencia)
            handMismatchRef.current = false;
            setHandMismatch(false);
            setMismatchSide(null);
          }

          if (canvasRef.current) {
            drawHandLandmarks(landmarks, canvasRef.current, video);
          }

          if (isHandLandmarkValid(landmarks)) {
            // Si el clasificador aún no está listo (datos IA sin cargar),
            // no intentar clasificar: evita throw 60 veces/segundo.
            if (!isClassifierReady()) return;
            const features = extractFeatures(landmarks);
            const targetEarly = targetLetterRef.current;
            // Modo elegido en Entrenar (foto/video) manda; si no hay override,
            // default = video para J/Ñ/Z, foto para el resto (letras y palabras).
            const forcedDyn = forceDynamicRef.current;
            const isDynTarget = !!targetEarly && (forcedDyn ?? isDynamicLetter(targetEarly));

            // Movimiento: acumular siempre (barato), usar solo si objetivo dinámico.
            motionTrackerRef.current.push(landmarks, nowMs);

            let recognition = classifyFeatures(features, 5, targetEarly);

            // === PUERTA DINÁMICA (J/Ñ/Z, letras en modo video y palabras con video) ===
            // Combina forma base (k-NN) + firma de movimiento.
            // Para J/Ñ/Z hay heurística de trazo específica; para el resto
            // (ej. HOLA con video, o A en modo video) se exige movimiento
            // real + proximidad estática a la propia palabra/letra.
            if (isDynTarget && targetEarly) {
              const dyn = classifyDynamicLetter(motionTrackerRef.current.window(), targetEarly);
              const isPredefined = targetEarly === 'J' || targetEarly === 'Ñ' || targetEarly === 'Z';
              const motionConf = isPredefined
                ? dyn.motionConfidence
                : dyn.signature.hasMotion
                  ? Math.min(1, 0.45 + dyn.signature.pathLength * 1.2)
                  : 0;
              const prog = Math.max(0, Math.min(1, dyn.signature.pathLength / 0.3));
              const prevProg = lastMotionProgRef.current;
              if (Math.abs(prevProg - prog) > 0.05 || (prog === 0 && prevProg !== 0)) {
                lastMotionProgRef.current = prog;
                setMotionProgress(prog);
              }

              let staticOk: boolean;
              if (isPredefined) {
                const BASE_FOR_DYNAMIC: Record<string, string[]> = {
                  J: ['I', 'G', 'J'],
                  'Ñ': ['N', 'M', 'Ñ'],
                  Z: ['D', 'G', 'I', 'Z', 'V'],
                };
                const baseList = BASE_FOR_DYNAMIC[targetEarly] ?? [];
                staticOk = baseList.includes(recognition.letter) || recognition.isCorrect;
              } else {
                // Palabra o letra en modo video: la forma debe parecerse
                // a sus propios ejemplos (merged incluye frames de sus clips).
                staticOk = recognition.isCorrect || recognition.letter === targetEarly;
              }
              const threshold_motion = isPredefined ? 0.55 : 0.5;
              const dynamicOk =
                motionConf >= threshold_motion && (staticOk || motionConf >= 0.75);

              if (dynamicOk) {
                recognition = {
                  letter: targetEarly,
                  confidence: Math.min(1, 0.45 + motionConf * 0.5),
                  isCorrect: true,
                  features,
                };
              } else {
                // Aún no: muestra la letra objetivo como "analizando" con
                // confianza parcial para feedback visual, sin disparar acierto.
                recognition = {
                  letter: targetEarly,
                  confidence: Math.min(0.35, 0.1 + motionConf * 0.3),
                  isCorrect: false,
                  features,
                };
              }
            } else if (!isDynTarget && lastMotionProgRef.current !== 0) {
              lastMotionProgRef.current = 0;
              setMotionProgress(0);
            }

            const buffer = detectionBufferRef.current;
            const target = targetLetterRef.current;
            const threshold = confidenceThresholdRef.current;

            // === BUFFER UPDATE LOGIC ===
            // Track BOTH the classifier's output AND the target letter separately

            // 1. Update the classifier's predicted letter in the buffer
            const predKey = recognition.letter;
            if (!buffer[predKey]) {
              buffer[predKey] = { confidence: 0, correctFrames: 0, totalFrames: 0 };
            }
            buffer[predKey].totalFrames++;

            if (recognition.isCorrect && recognition.confidence > 0.3) {
              // Classifier says it's the target - strong boost
              buffer[predKey].confidence = Math.min(1, buffer[predKey].confidence + 0.12);
              buffer[predKey].correctFrames++;
            } else if (recognition.confidence > 0) {
              // Some confidence but not correct - smaller boost
              buffer[predKey].confidence = Math.max(buffer[predKey].confidence, recognition.confidence * 0.6);
            }

            // 2. If we have a target, also track it separately in the buffer
            // This ensures the target letter can accumulate even when classifier
            // returns a different letter (due to the generous multi-signal check)
            if (target && recognition.isCorrect && predKey === target) {
              // Classifier agrees with target - this is already handled above
              targetCorrectFramesRef.current++;
            } else if (target && !recognition.isCorrect) {
              // Classifier disagrees - but still check if target is "close enough"
              // If classifier gives any confidence to target (even as second-best),
              // give the target a small buffer boost
              if (!buffer[target]) {
                buffer[target] = { confidence: 0, correctFrames: 0, totalFrames: 0 };
              }
              // Very gentle accumulation for the target when classifier says no
              // This helps when the classifier oscillates between correct and incorrect
              buffer[target].confidence *= 0.95; // Gentle decay
              targetCorrectFramesRef.current = Math.max(0, targetCorrectFramesRef.current - 1);
            }

            // 3. Decay all buffer entries gently
            for (const k in buffer) {
              if (k !== predKey && k !== target) {
                buffer[k].confidence *= 0.90;
                if (buffer[k].confidence < 0.02) delete buffer[k];
              }
            }

            // 4. Find the best letter from the buffer
            let bestLetter = '';
            let bestConf = 0;
            for (const k in buffer) {
              if (buffer[k].confidence > bestConf) {
                bestConf = buffer[k].confidence;
                bestLetter = k;
              }
            }

            // 5. Determine if we should emit a result
            // Perf: push letter/confidence to React state only when something
            // meaningful changed (new letter, ±6% confidence, or 250ms passed).
            // This avoids re-rendering the whole camera tree ~11x/sec.
            const now = performance.now();
            const cooldownPassed = now - lastResultTimeRef.current > RESULT_COOLDOWN_MS;
            const pushUi = (letter: string | null, conf: number) => {
              const prev = lastUiPushRef.current;
              if (
                prev.letter !== letter ||
                Math.abs(prev.conf - conf) > 0.06 ||
                now - prev.time > 250
              ) {
                lastUiPushRef.current = { letter, conf, time: now };
                setDetectedLetter(letter);
                setConfidence(conf);
              }
            };

            if (bestConf >= threshold && bestLetter && cooldownPassed) {
              const isCorrectResult = target ? bestLetter === target : false;

              pushUi(bestLetter, bestConf);

              const finalResult: RecognitionResult = {
                ...recognition,
                letter: bestLetter,
                confidence: bestConf,
                isCorrect: isCorrectResult,
              };
              setLatestResult(finalResult);

              // Only call onResult if cooldown has passed (rate limiting)
              if (cooldownPassed) {
                lastResultTimeRef.current = now;
                onResultRef.current?.(finalResult);
              }
            } else {
              // Below threshold - still update UI with best guess for visual feedback
              if (bestLetter && bestConf > 0.1) {
                pushUi(bestLetter, bestConf);
              } else {
                pushUi(null, 0);
              }
              setLatestResult(null);
            }

            onHandDetectedRef.current?.({
              landmarks,
              handedness: picked.side,
              features,
            });
          }
        } else {
          handMismatchRef.current = false;
          setHandDetected(false);
          setDetectedLetter(null);
          setConfidence(0);
          setLatestResult(null);
          setMotionProgress(0);
          setTrackedHand(null);
          setHandMismatch(false);
          setMismatchSide(null);
          motionTrackerRef.current.decay(true);
          if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }
          for (const k in detectionBufferRef.current) {
            detectionBufferRef.current[k].confidence *= 0.5;
            if (detectionBufferRef.current[k].confidence < 0.05) delete detectionBufferRef.current[k];
          }
          targetCorrectFramesRef.current = 0;
        }
      } catch (err) {
        console.error('Hand detection error:', err);
      }

      animationFrameRef.current = requestAnimationFrame(() => processFrameRef.current());
    };
  }, [drawHandLandmarks]);

  const startDetection = useCallback(async () => {
    // Evitar doble loop si ya se está detectando o hay un arranque en curso
    if (isDetectingRef.current) return;
    const gen = ++startGenRef.current;
    isDetectingRef.current = false;
    try {
      setError(null);
      setIsDetecting(false);

      if (!handLandmarkerInstance) {
        await loadModel();
        if (gen !== startGenRef.current) return;
        setIsModelLoaded(true);
      } else {
        setIsModelLoaded(true);
      }

      const video = videoRef.current;
      if (!video) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          // 640x480 is MediaPipe's sweet spot: 4.6x fewer pixels than 720p
          // with no loss in landmark accuracy, much faster on weak PCs.
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
      if (gen !== startGenRef.current) {
        // Superseded by stop/another start: release the orphan stream silently.
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      video.muted = true;
      video.srcObject = stream;
      await video.play();
      if (gen !== startGenRef.current) return;

      detectionBufferRef.current = {};
      lastVideoTimeRef.current = -1;
      lastDetectTimeRef.current = 0;
      lastUiPushRef.current = { letter: null, conf: 0, time: 0 };
      targetCorrectFramesRef.current = 0;
      lastResultTimeRef.current = 0;
      motionTrackerRef.current.reset();
      lastMotionProgRef.current = 0;
      handMismatchRef.current = false;
      setMotionProgress(0);
      setTrackedHand(null);
      setHandMismatch(false);
      setMismatchSide(null);

      setIsDetecting(true);
      isDetectingRef.current = true;
      animationFrameRef.current = requestAnimationFrame(() => processFrameRef.current());
    } catch (err) {
      // AbortError = play() interrupted by a superseding stop/start.
      // Benign race, never show it as an error.
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Failed to start detection:', err);
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Permiso de cámara denegado. Por favor permite el acceso a la cámara.');
      } else if (err instanceof DOMException && err.name === 'NotFoundError') {
        setError('No se encontró ninguna cámara en tu dispositivo.');
      } else {
        setError('Error al iniciar la detección de manos. Verifica que tu navegador soporte WebRTC.');
      }
      setIsDetecting(false);
    }
  }, []);

  const stopDetection = useCallback(() => {
    // Invalidate any in-flight startDetection so its late play()
    // rejection is swallowed instead of reported.
    startGenRef.current++;
    setIsDetecting(false);
    isDetectingRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setHandDetected(false);
    setDetectedLetter(null);
    setConfidence(0);
    setMotionProgress(0);
    lastMotionProgRef.current = 0;
    handMismatchRef.current = false;
    setTrackedHand(null);
    setHandMismatch(false);
    setMismatchSide(null);
    motionTrackerRef.current.reset();
    detectionBufferRef.current = {};
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, [stopDetection]);

  return {
    videoRef,
    canvasRef,
    detectedLetter,
    confidence,
    isDetecting,
    isModelLoaded,
    error,
    startDetection,
    stopDetection,
    latestResult,
    handDetected,
    motionProgress,
    isDynamicTarget: !!targetLetter && (forceDynamic ?? isDynamicLetter(targetLetter)),
    trackedHand,
    handMismatch,
    mismatchSide,
  };
}