'use client';

// Offscreen canvas + context reused across frames to avoid allocations.
let procCanvas: HTMLCanvasElement | null = null;
let procCtx: CanvasRenderingContext2D | null = null;

/**
 * Returns a brightness-boosted frame for MediaPipe hand detection.
 * In dark rooms the raw camera frame is too dark for the palm detector;
 * drawing it through a brightness/contrast filter first improves
 * detection a lot. Landmarks are normalized coordinates, so the boost
 * doesn't affect the geometry used for classification.
 * Falls back to the raw video if anything fails.
 */
export function prepareDetectFrame(video: HTMLVideoElement): HTMLVideoElement | HTMLCanvasElement {
  try {
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return video;

    if (!procCanvas && typeof document !== 'undefined') {
      procCanvas = document.createElement('canvas');
    }
    if (!procCanvas) return video;

    // Cap processing width for speed (640px is MediaPipe's sweet spot;
    // HD pixels cost 4x and don't improve landmark accuracy).
    const scale = Math.min(1, 640 / w);
    const pw = Math.max(2, Math.round(w * scale));
    const ph = Math.max(2, Math.round(h * scale));
    if (procCanvas.width !== pw || procCanvas.height !== ph) {
      procCanvas.width = pw;
      procCanvas.height = ph;
      procCtx = null; // resizing resets context state; re-fetch below
    }

    if (!procCtx) {
      procCtx = procCanvas.getContext('2d');
      if (procCtx) {
        // Ignored harmlessly on browsers without ctx.filter support.
        (procCtx as CanvasRenderingContext2D & { filter?: string }).filter =
          'brightness(1.5) contrast(1.12)';
      }
    }
    if (!procCtx) return video;
    procCtx.drawImage(video, 0, 0, pw, ph);
    return procCanvas;
  } catch {
    return video;
  }
}
