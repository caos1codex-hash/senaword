'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import type { HandLandmark, DetectedHand, RecognitionResult } from '@/types/game';
import { extractFeatures, isHandLandmarkValid } from '@/lib/hand-detection/feature-extractor';
import { classifyFeatures } from '@/lib/hand-detection/classifier';

interface UseHandDetectionOptions {
  targetLetter?: string;
  onResult?: (result: RecognitionResult) => void;
  onHandDetected?: (hand: DetectedHand) => void;
  enabled?: boolean;
  confidenceThreshold?: number;
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
}

type HandLandmarkerInstance = {
  detectForVideo: (video: HTMLVideoElement, timestamp: number) => {
    landmarks: Array<Array<{ x: number; y: number; z: number }>>;
    handednesses?: Array<{ categoryName: string }>;
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
      numHands: 1,
      runningMode: 'VIDEO',
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
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
  } = options;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number>(0);
  const lastVideoTimeRef = useRef<number>(-1);
  const streamRef = useRef<MediaStream | null>(null);
  const isDetectingRef = useRef(false);
  const targetLetterRef = useRef(targetLetter);
  const confidenceThresholdRef = useRef(confidenceThreshold);
  const onResultRef = useRef(onResult);
  const onHandDetectedRef = useRef(onHandDetected);

  // Buffer tracks confidence per letter
  const detectionBufferRef = useRef<Record<string, BufferEntry>>({});
  // Track consecutive correct frames for the target
  const targetCorrectFramesRef = useRef(0);
  // Rate limiting: prevent firing onResult too frequently
  const lastResultTimeRef = useRef(0);
  const RESULT_COOLDOWN_MS = 1500; // Minimum 1.5s between result callbacks

  const [detectedLetter, setDetectedLetter] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestResult, setLatestResult] = useState<RecognitionResult | null>(null);
  const [handDetected, setHandDetected] = useState(false);

  // Keep refs in sync with props
  useEffect(() => { targetLetterRef.current = targetLetter; }, [targetLetter]);
  useEffect(() => { confidenceThresholdRef.current = confidenceThreshold; }, [confidenceThreshold]);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onHandDetectedRef.current = onHandDetected; }, [onHandDetected]);
  useEffect(() => { isDetectingRef.current = isDetecting; }, [isDetecting]);

  const drawHandLandmarks = useCallback(
    (landmarks: HandLandmark[], canvas: HTMLCanvasElement, video: HTMLVideoElement) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

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

      try {
        const results = handLandmarkerInstance.detectForVideo(video, performance.now());

        if (results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0] as HandLandmark[];
          setHandDetected(true);

          if (canvasRef.current) {
            drawHandLandmarks(landmarks, canvasRef.current, video);
          }

          if (isHandLandmarkValid(landmarks)) {
            const features = extractFeatures(landmarks);
            const recognition = classifyFeatures(features, 5, targetLetterRef.current);

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
            const now = performance.now();
            const cooldownPassed = now - lastResultTimeRef.current > RESULT_COOLDOWN_MS;

            if (bestConf >= threshold && bestLetter && cooldownPassed) {
              const isCorrectResult = target ? bestLetter === target : false;

              setDetectedLetter(bestLetter);
              setConfidence(bestConf);

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
                setDetectedLetter(bestLetter);
                setConfidence(bestConf);
              } else {
                setDetectedLetter(null);
                setConfidence(0);
              }
              setLatestResult(null);
            }

            onHandDetectedRef.current?.({
              landmarks,
              handedness: results.handednesses?.[0]?.categoryName?.toLowerCase() === 'left' ? 'left' : 'right',
              features,
            });
          }
        } else {
          setHandDetected(false);
          setDetectedLetter(null);
          setConfidence(0);
          setLatestResult(null);
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
    try {
      setError(null);
      setIsDetecting(false);

      if (!handLandmarkerInstance) {
        await loadModel();
        setIsModelLoaded(true);
      } else {
        setIsModelLoaded(true);
      }

      const video = videoRef.current;
      if (!video) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      streamRef.current = stream;
      video.srcObject = stream;
      await video.play();

      detectionBufferRef.current = {};
      lastVideoTimeRef.current = -1;
      targetCorrectFramesRef.current = 0;
      lastResultTimeRef.current = 0;

      setIsDetecting(true);
      animationFrameRef.current = requestAnimationFrame(() => processFrameRef.current());
    } catch (err) {
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
  };
}