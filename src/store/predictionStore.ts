import { create } from 'zustand';

export interface DataPoint {
  time: number;
  strength: number;
}

// Exact interface used by the Wizard components
export type PredictionData = {
  // Step 1: Materials
  cementType: number; 
  selectedCementId: number;
  cementStrength: number;
  wc: number;
  flyash: number;
  slag: number;
  silicafume: number;

  // Step 2: Geometry
  specimenType: number; 
  specimenL: number;
  specimenW: number;
  specimenH: number;
  specimenR: number; 
  svRatio: number;
  specimenArea: number;

  // Step 3: Base Properties
  initialStrength: number;

  // Step 4: Environment
  mg: number;
  cl: number;
  so4: number;
  na: number;

  // Step 5: Cycles & Load
  wettingTime: number;
  wettingTemp: number;
  dryingTime: number;
  dryingTemp: number;
  loadFactor: number;
  isStressMode: boolean;

  // Step 6: Time Points
  timePoints: number[];
};

export type PredictionState = {
  step: number;
  predictionData: PredictionData;
  lastResults: DataPoint[] | null; // Shared results for other modules
  setStep: (step: number) => void;
  updateData: (data: Partial<PredictionData>) => void;
  setLastResults: (results: DataPoint[]) => void;
  setField: <K extends keyof PredictionData>(field: K, value: PredictionData[K]) => void;
};

export const usePredictionStore = create<PredictionState>((set) => ({
  step: 1,
  predictionData: {
    cementType: 1,
    selectedCementId: 1,
    cementStrength: 42.5,
    wc: 0.45,
    flyash: 0,
    slag: 0,
    silicafume: 0,
    specimenType: 1,
    specimenL: 100,
    specimenW: 100,
    specimenH: 100,
    specimenR: 100,
    svRatio: 60,
    specimenArea: 0.01,
    initialStrength: 45,
    mg: 0,
    cl: 0,
    so4: 0,
    na: 0,
    wettingTime: 24,
    wettingTemp: 25,
    dryingTime: 24,
    dryingTemp: 25,
    loadFactor: 0,
    isStressMode: false,
    timePoints: [0, 100, 200, 250, 300, 350, 400, 450, 500],
  },
  lastResults: null,
  setStep: (step) => set({ step }),
  setLastResults: (results) => set({ lastResults: results }),
  updateData: (data) => set((state) => ({
    predictionData: { ...state.predictionData, ...data }
  })),
  setField: (field, value) => set((state) => ({
    predictionData: { ...state.predictionData, [field]: value }
  })),
}));
