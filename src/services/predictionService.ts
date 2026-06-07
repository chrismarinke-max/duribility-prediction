import { invoke } from '@tauri-apps/api/core';
import type { PredictionData } from '../store/predictionStore';
import { assembleFeatureVector } from '../utils/ai/inferenceService';

export interface DataPoint {
  time: number;
  strength: number;
}

export function anchorPredictionsToInitialStrength(
  results: DataPoint[],
  initialStrength: number
): DataPoint[] {
  if (results.length === 0 || !Number.isFinite(initialStrength)) {
    return results;
  }

  const baselinePoint = results.reduce((earliest, point) =>
    point.time < earliest.time ? point : earliest
  );

  if (baselinePoint.time !== 0 || !Number.isFinite(baselinePoint.strength)) {
    return results;
  }

  const baselineOffset = baselinePoint.strength - initialStrength;

  return results.map(point => ({
    ...point,
    strength: Math.round((point.strength - baselineOffset) * 100) / 100
  }));
}

export async function executeInference(data: PredictionData, timePoints: number[]): Promise<DataPoint[]> {
  const results: DataPoint[] = [];

  for (const time of timePoints) {
    // 1. Assemble the 18D vector
    const vector = assembleFeatureVector(data, time);
    
    try {
      // 2. Call Rust Backend
      const strength = await invoke<number>('run_prediction', { input: vector });
      
      results.push({
        time,
        strength: Math.round(strength * 100) / 100
      });
    } catch (error) {
      console.error(`Inference failed at time ${time}:`, error);
      // Fallback with initial strength from grouped data
      results.push({
        time,
        strength: Math.round(data.initialStrength * Math.exp(-0.0001 * time) * 100) / 100
      });
    }
  }

  // Keep the model-predicted evolution while anchoring t=0 to the measured
  // 28-day compressive strength supplied by the user.
  return anchorPredictionsToInitialStrength(results, data.initialStrength);
}
