/**
 * Scientific Utilities for Durability Prediction System
 * Ported from legacy C# implementation (common.cs, cluster.cs)
 */

/**
 * K-Nearest Neighbors (KNN) Cement Clustering
 * Maps mineral admixtures to 5 standard cement categories (A-E)
 */
export function clusterCement(admixtures: {
  flyash: number;
  slag: number;
  silicafume: number;
  pozzolan: number;
  limestone: number;
  shale: number;
}): { type: string; id: number } {
  const { flyash, slag, silicafume, pozzolan, limestone, shale } = admixtures;

  // Convert raw percentages to categorical numbers (0-3)
  const mapValue = (v: number) => {
    if (v <= 5) return 0;
    if (v <= 20) return 1;
    if (v <= 50) return 2;
    return 3;
  };

  const inputVector = [
    mapValue(flyash),
    mapValue(slag),
    mapValue(silicafume),
    mapValue(pozzolan),
    mapValue(limestone),
    mapValue(shale)
  ];

  // Training data from legacy cluster.cs
  const trainingData = [
    [0, 0, 0, 0, 0, 0, 1], [0, 0, 0, 0, 0, 0, 2], [1, 1, 1, 1, 0, 0, 3], 
    [2, 0, 0, 0, 0, 0, 4], [3, 0, 0, 0, 0, 0, 4], [0, 0, 2, 0, 0, 0, 4], 
    [0, 0, 0, 2, 0, 0, 4], [2, 2, 2, 2, 2, 0, 5], [1, 0, 0, 0, 0, 0, 2], 
    [1, 0, 0, 0, 0, 0, 2], [0, 0, 0, 0, 0, 0, 1], [0, 0, 0, 0, 0, 0, 1], 
    [0, 0, 0, 0, 0, 0, 1], [1, 0, 0, 0, 0, 0, 2], [0, 0, 2, 0, 0, 0, 4], 
    [1, 1, 1, 1, 0, 0, 3], [1, 1, 1, 1, 0, 0, 2], [2, 0, 0, 0, 0, 0, 4], 
    [0, 1, 0, 0, 0, 0, 2], [0, 0, 2, 0, 0, 0, 4], [0, 0, 0, 2, 0, 0, 4], 
    [0, 0, 0, 0, 2, 0, 3], [0, 0, 0, 0, 0, 2, 5], [3, 0, 0, 0, 0, 0, 4], 
    [2, 2, 2, 2, 0, 0, 5], [2, 0, 2, 2, 0, 0, 5], [0, 0, 0, 0, 0, 0, 1], 
    [0, 0, 0, 0, 0, 0, 1], [0, 0, 0, 0, 0, 0, 1], [0, 0, 0, 0, 0, 0, 1], 
    [0, 0, 0, 0, 0, 0, 1], [0, 0, 0, 0, 0, 0, 1], [1, 1, 1, 1, 0, 0, 3], 
    [2, 2, 2, 2, 0, 0, 5], [3, 3, 3, 3, 0, 0, 5]
  ];

  let minDistance = 20;
  let bestMatchIndex = 0;

  for (let j = 0; j < trainingData.length; j++) {
    let currentDistance = 0;
    for (let i = 0; i < 6; i++) {
      const diff = trainingData[j][i] - inputVector[i];
      currentDistance += diff * diff;
    }
    if (currentDistance < minDistance) {
      minDistance = currentDistance;
      bestMatchIndex = j;
    }
  }

  const categoryId = trainingData[bestMatchIndex][6];
  const categoryNames = ["", "A", "B", "C", "D", "E"];

  return {
    type: categoryNames[categoryId],
    id: categoryId
  };
}

/**
 * ReduceD Thermodynamic Model
 * Calculates crystallization pressure stress (Pt) in MPa
 */
export function calculateReduceD(params: {
  na: number;
  cl: number;
  mg: number;
  so4: number;
  temp: number;
  strength: number;
  dryingTime: number;
  wettingTime: number;
  volume: number;
  vsRatio: number;
  cycle1: number;
  cycle2: number;
}): number {
  try {
    const { na, cl, mg, so4, temp, strength, dryingTime, wettingTime, volume, vsRatio, cycle1, cycle2 } = params;

    let Na = na, Cl = cl, Mg = mg, SO4 = so4;
    let Na2SO4 = 0, NaCl = 0, MgSO4 = 0, MgCl2 = 0;

    // Salt conversion logic (priority sequence)
    if (Na >= 2 * SO4) {
      Na2SO4 = SO4; Na -= 2 * SO4;
      if (Na > Cl) {
        NaCl = Cl;
      } else {
        NaCl = Na; Cl -= Na;
        if (Cl > 2 * Mg) { MgCl2 = Mg; }
        else { MgCl2 = Cl / 2; }
      }
    } else {
      Na2SO4 = Na / 2; SO4 -= Na / 2;
      if (SO4 > Mg) { MgSO4 = Mg; }
      else {
        MgSO4 = SO4; Mg -= SO4;
        if (2 * Mg > Cl) { MgCl2 = Cl / 2; }
        else { MgCl2 = Mg; }
      }
    }

    const numbers = [Na2SO4, NaCl, MgSO4, MgCl2];
    const gammacls = [1.43, 0.4, 1.25, 0.32];
    const Vms = [52.985, 27.021, 45.113, 40.773];
    
    const S = [
      [0.345, 0.641, 1.373, 2.872, 3.436, 3.253, 3.189, 3.119, 3.077, 3.006, 2.992],
      [6.109, 6.126, 6.160, 6.211, 6.263, 6.33, 6.383, 6.468, 6.571, 6.674, 6.810],
      [1.828, 2.301, 2.783, 3.265, 3.697, 4.071, 4.337, 4.470, 4.453, 4.245, 3.838],
      [1.828, 2.301, 2.783, 3.265, 3.697, 4.071, 4.337, 4.470, 4.453, 4.245, 3.838]
    ];

    const Water = [
      [0.983, 0.959, 0.944, 0.930, 0.908, 0.876, 0.836, 0.790, 0.741, 0.691, 0.643, 0.596, 0.552, 0.510, 0.471, 0.435, 0.401, 0.369, 0.341, 0.314, 0.289, 0.267, 0.246, 0.227, 0.209],
      [0.005, 0.041, 0.077, 0.113, 0.149, 0.209, 0.227, 0.246, 0.267, 0.289, 0.314, 0.341, 0.369, 0.401, 0.435, 0.471, 0.510, 0.552, 0.596, 0.643, 0.691, 0.741, 0.790, 0.836, 0.876]
    ];

    const porosity = [0.2, 0.13, 0.1, 0.07, 0.06, 0.05, 0.045, 0.035, 0.025, 0.015, 0.01];

    const T1 = temp + 273.15;
    const R = 8.314;
    const roul = 1;
    const H = 0.5;
    const Mw = 18;
    const Pls = -R * T1 * roul * Math.log(H) / Mw;

    let PtTotal = 0;

    for (let i = 0; i < 4; i++) {
      let gwater = 0, swater = 0;
      const tg1 = Math.round(dryingTime);
      const ts1 = Math.round(wettingTime);

      if (tg1 >= 0 && tg1 <= 24) gwater = Water[0][tg1];
      else gwater = Math.max(0.01, 0.209 - 0.02 * (tg1 - 24));

      if (ts1 >= 0 && ts1 <= 24) swater = Water[1][ts1];
      else swater = Math.min(0.99, 0.876 + 0.04 * (ts1 - 24));

      const gammacl = gammacls[i];
      const Vm = Vms[i];

      let A = 0, v = 0, k = 0;
      if (strength <= 50) {
        A = Math.max(0.000001, 0.00302 - (0.00302 - 0.000673) / 20 * (50 - strength));
        v = 3.057 + (4.375 - 3.057) / 20 * (50 - strength);
        k = Math.max(0.000001, 49.67 - (49.67 - 28.25) / 20 * (50 - strength));
      } else {
        A = 0.00302 + (0.0112 - 0.00302) / 30 * (strength - 50);
        v = Math.max(0.000001, 3.057 - (3.057 - 2.224) / 30 * (strength - 50));
        k = 49.67 + (64.29 - 49.67) / 30 * (strength - 50);
      }

      const fai = A * Math.exp(v); // alpha is 1 in legacy code
      const Vp = 1 - Math.exp(-k * fai); // r is 1 in legacy code

      let m = 0;
      for (let j = -1; j >= -10; j--) {
        for (let q = 0; q <= 10; q++) {
          const val1 = (Pls + Math.exp(gammacl * Vm / (R * T1 * Math.log(m + q * 10**j))) * Math.log(m + q * 10**j) * R * T1 / Vm) * Vp;
          const val2 = (Pls + Math.exp(gammacl * Vm / (R * T1 * Math.log(m + (q + 1) * 10**j))) * Math.log(m + (q + 1) * 10**j) * R * T1 / Vm) * Vp;
          if (val1 * val2 <= 0) {
            m += q * 10**j;
            break;
          }
        }
      }
      const n = m + 10**-10;

      const w = Math.round(temp / 10);
      let Ssalt = 0, bhd = 1, detas = 0;
      const porosity1 = strength > 100 ? 0.01 : porosity[Math.round(strength / 10)];

      for (let m1 = 1; m1 <= cycle1; m1++) {
        const zk = Math.exp(Math.log(bhd) / (-80/9));
        bhd = Math.pow(zk, -vsRatio);

        if (detas > 0) {
          detas = detas / Math.exp(wettingTime * detas);
          Ssalt = detas + numbers[i];
        }
        let salt = Ssalt * bhd * volume * porosity1 * 1e-6;
        salt += swater * numbers[i] * volume * porosity1 * 1e-6;
        bhd = Math.min(1, (bhd + swater) * gwater);
        
        Ssalt = salt / (bhd * volume * porosity1 * 1e-6);
        if (Ssalt > S[i][w]) Ssalt = S[i][w];
        detas = Ssalt - numbers[i];
      }

      const beta0 = Ssalt / S[i][w];
      let beta = Math.min(0.99999999, beta0 * (1 - n) + n);

      const Pt0 = (1 - bhd) * (Pls + Math.exp(gammacl * Vm / (R * T1 * Math.log(beta))) * Math.log(beta) * R * T1 / Vm) * Vp;
      PtTotal += Pt0;
    }

    if (PtTotal < 0.00001) return 0;

    const xishu = (numbers[0] + numbers[1] + numbers[2] + numbers[3] >= 2) ? 0.025 : 
                 (numbers[0] + numbers[1] + numbers[2] + numbers[3] <= 1) ? 0.065 : 0.045;

    let Pt = PtTotal * cycle2 * xishu;
    if (cycle2 > 300) {
      const ptk = PtTotal * 300 * xishu;
      const mk = ptk / (1 - 1 / Math.exp(0.01 * 300));
      Pt = mk * (1 - 1 / Math.exp(0.01 * cycle2));
    }

    if (dryingTime === 0 || wettingTime === 0 || (na === 0 && cl === 0 && mg === 0 && so4 === 0)) return 0;

    return Math.round(Pt * 100) / 100;
  } catch (e) {
    console.error("ReduceD error", e);
    return 0;
  }
}
