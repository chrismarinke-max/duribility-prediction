import { invoke } from '@tauri-apps/api/core';
import type { PredictionData } from '../../store/predictionStore';

/**
 * PRODUCTION-ALIGNED 18D Vector Assembly
 * Maps UI-friendly names (PredictionData) to the required ONNX inputs
 */
export const assembleFeatureVector = (data: PredictionData, time: number): any[] => {
  const isLoadMode = data.loadFactor > 0;
  
  // Map categoryId (1-5) back to Letter (A-E)
  const cementTypeMap: Record<number, string> = {
    1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E'
  };
  const cementLetter = cementTypeMap[data.cementType] || 'A';

  if (isLoadMode) {
    /**
     * LOAD MODE (hzl mode)
     */
    return [
      cementLetter,          // 0: jlcement
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
      cementLetter,          // 0: jlcement
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

export const performInference = async (inputVector: any[]): Promise<number> => {
  try {
    return await invoke<number>('run_prediction', { input: inputVector });
  } catch (error) {
    console.error("Inference execution failed:", error);
    throw error;
  }
};
