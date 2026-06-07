import { invoke } from '@tauri-apps/api/core';
import type { PredictionData } from '../../store/predictionStore';

export type ModelFeature = string | number;

/**
 * PRODUCTION-ALIGNED 18D Vector Assembly
 * Maps UI-friendly names (PredictionData) to the required ONNX inputs
 */
export const assembleFeatureVector = (data: PredictionData, time: number): ModelFeature[] => {
  const isLoadMode = data.loadFactor > 0;
  const cementCategory = normalizeCementCategoryForModel(data.cementType);

  if (isLoadMode) {
    /**
     * LOAD MODE (hzl mode)
     */
    return [
      cementCategory,        // 0: jlcement ("1"-"5")
      data.cementStrength,   // 1: cementstrength
      data.wc,               // 2: wc
      data.svRatio,          // 3: specificarea (1000 * S/V)
      data.initialStrength,  // 4: initialstrength
      data.flyash,           // 5: flyash
      data.slag,             // 6: slag
      data.silicafume,       // 7: silicafume
      data.na || 0,          // 8: Na
      data.mg,               // 9: Mg
      data.cl,               // 10: Cl
      data.loadFactor,       // 11: hzl REPLACES SO4
      time,                  // 12: wettingtime
      time,                  // 13: wettingtemp
      time,                  // 14: dryingtime
      time,                  // 15: dryingtemp
      time,                  // 16: cycle
      time                   // 17: degradationtime
    ];
  } else {
    /**
     * STANDARD ENVIRONMENTAL MODE
     */
    return [
      cementCategory,        // 0: jlcement ("1"-"5")
      data.cementStrength,   // 1: cementstrength
      data.wc,               // 2: wc
      data.svRatio,          // 3: specificarea
      data.initialStrength,  // 4: initialstrength
      data.flyash,           // 5: flyash
      data.slag,             // 6: slag
      data.silicafume,       // 7: silicafume
      data.na || 0,          // 8: Na
      data.mg,               // 9: Mg
      data.cl,               // 10: Cl
      data.so4,              // 11: SO4
      data.wettingTime,      // 12: wettingtime
      data.wettingTemp,      // 13: wettingtemp
      data.dryingTime,       // 14: dryingtime
      data.dryingTemp,       // 15: dryingtemp
      1.0,                   // 16: cycle
      time                   // 17: degradationtime
    ];
  }
};

const CEMENT_CATEGORY_BY_LETTER: Record<string, string> = {
  A: '1',
  B: '2',
  C: '3',
  D: '4',
  E: '5'
};

export const normalizeCementCategoryForModel = (category: unknown): string => {
  const normalized = String(category).trim().toUpperCase();

  if (/^[1-5]$/.test(normalized)) {
    return normalized;
  }

  return CEMENT_CATEGORY_BY_LETTER[normalized] || '1';
};

export const performInference = async (inputVector: ModelFeature[]): Promise<number> => {
  try {
    return await invoke<number>('run_prediction', { input: inputVector });
  } catch (error) {
    console.error("Inference execution failed:", error);
    throw error;
  }
};
