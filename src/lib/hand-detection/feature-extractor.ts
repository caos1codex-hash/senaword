import type { HandLandmark } from '@/types/game';

/**
 * Feature extraction from MediaPipe hand landmarks.
 *
 * Extracts 17 normalized features from 21 hand landmarks for sign language recognition.
 * Features are designed to be scale and translation invariant.
 *
 * Landmark indices (MediaPipe Hands):
 *   0: WRIST
 *   1-4: THUMB (CMC, MCP, IP, TIP)
 *   5-8: INDEX_FINGER (MCP, PIP, DIP, TIP)
 *   9-12: MIDDLE_FINGER (MCP, PIP, DIP, TIP)
 *   13-16: RING_FINGER (MCP, PIP, DIP, TIP)
 *   17-20: PINKY (MCP, PIP, DIP, TIP)
 *
 * Feature mapping (17 features):
 *   [0-4]  Wrist to each fingertip distance / palmSize
 *   [5-9]  Wrist to each finger MCP distance / palmSize
 *   [10-14] Finger extension: fingertip to PIP distance / palmSize
 *   [15]   Hand width: index MCP to pinky MCP / palmSize
 *   [16]   Finger curl indicator: thumb tip to index MCP / palmSize
 */
function euclideanDistance(a: HandLandmark, b: HandLandmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z || 0) - (b.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function extractFeatures(landmarks: HandLandmark[]): number[] {
  if (!landmarks || landmarks.length < 21) {
    return new Array(17).fill(0);
  }

  const wrist = landmarks[0];
  const middleMcp = landmarks[9];
  const palmSize = euclideanDistance(wrist, middleMcp);

  if (palmSize < 0.001) {
    return new Array(17).fill(0);
  }

  const normalize = (d: number): number => d / palmSize;

  // Finger tip indices
  const tipIndices = [4, 8, 12, 16, 20]; // thumb, index, middle, ring, pinky
  // Finger MCP/CMC indices
  const mcpIndices = [1, 5, 9, 13, 17]; // thumb CMC, index MCP, middle MCP, ring MCP, pinky MCP
  // Finger PIP indices (for extension measurement)
  const pipIndices = [3, 6, 10, 14, 18]; // thumb IP, index PIP, middle PIP, ring PIP, pinky PIP

  const features: number[] = [];

  // Features 0-4: Distance from wrist to each fingertip (normalized)
  for (const tipIdx of tipIndices) {
    features.push(normalize(euclideanDistance(wrist, landmarks[tipIdx])));
  }

  // Features 5-9: Distance from wrist to each MCP/CMC (normalized)
  for (const mcpIdx of mcpIndices) {
    features.push(normalize(euclideanDistance(wrist, landmarks[mcpIdx])));
  }

  // Features 10-14: Finger extension measure - tip to PIP distance (normalized)
  // Closed fingers have small values, extended fingers have larger values
  for (let i = 0; i < 5; i++) {
    features.push(normalize(euclideanDistance(landmarks[tipIndices[i]], landmarks[pipIndices[i]])));
  }

  // Feature 15: Hand width - distance between index MCP and pinky MCP (normalized)
  features.push(normalize(euclideanDistance(landmarks[5], landmarks[17])));

  // Feature 16: Thumb-index relationship - thumb tip to index MCP (normalized)
  // This helps distinguish signs that differ by thumb position
  features.push(normalize(euclideanDistance(landmarks[4], landmarks[5])));

  return features;
}

export function isHandLandmarkValid(landmarks: HandLandmark[]): boolean {
  if (!landmarks || landmarks.length !== 21) return false;
  const wrist = landmarks[0];
  if (wrist.x < 0 || wrist.x > 1 || wrist.y < 0 || wrist.y > 1) return false;
  return true;
}