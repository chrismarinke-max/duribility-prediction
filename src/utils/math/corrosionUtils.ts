/**
 * Numerical approximation of the Error Function erf(x)
 * Standard Abramowitz and Stegun approximation (maximum error: 1.5*10^-7)
 */
export const erf = (x: number) => {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);

  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return sign * y;
};

/**
 * Linear Interpolation Utility
 */
const interpolate = (x: number, xMin: number, xMax: number, yMin: number, yMax: number) => {
  return yMin + (yMax - yMin) * ((x - xMin) / (xMax - xMin));
};

/**
 * PRODUCTION-ALIGNED A & n Parameter Calculation
 */
export const calculateCorrosionParams = (fc: number) => {
  if (fc < 30) {
    return { a: 53, n: 1.7 };
  } else if (fc >= 30 && fc < 40) {
    return { 
      a: interpolate(fc, 30, 40, 53, 162),
      n: interpolate(fc, 30, 40, 1.7, 2.0)
    };
  } else if (fc >= 40 && fc < 50) {
    return {
      a: interpolate(fc, 40, 50, 101, 335),
      n: interpolate(fc, 40, 50, 1.9, 2.2)
    };
  } else if (fc >= 50 && fc < 60) {
    return {
      a: interpolate(fc, 50, 60, 369, 3430),
      n: interpolate(fc, 50, 60, 2.3, 2.8)
    };
  } else if (fc >= 60 && fc <= 70) {
    return {
      a: interpolate(fc, 60, 70, 940, 14700),
      n: interpolate(fc, 60, 70, 2.6, 3.2)
    };
  } else {
    return { a: 14700, n: 3.2 };
  }
};

/**
 * Calculates Chloride Diffusion Coefficient D(t)
 */
export const calculateDiffusionCoefficient = (strength: number) => {
  const { a, n } = calculateCorrosionParams(strength);
  const dt = (a / Math.pow(strength, n)) * Math.pow(10, -10);
  return { dt, a, n };
};

/**
 * Calculates Chloride Concentration C(x, t) based on Fick's Second Law
 * @param c0 Initial concentration (%)
 * @param cs Surface concentration (%)
 * @param x Depth (mm)
 * @param dt Diffusion coefficient (m^2/s)
 * @param t Time (days)
 */
export const calculateChlorideConcentration = (c0: number, cs: number, x: number, dt: number, t: number) => {
  if (t === 0) return c0;
  
  const x_m = x / 1000; // mm to m
  const t_sec = t * 24 * 3600; // days to seconds
  
  const argument = x_m / (2 * Math.sqrt(dt * t_sec));
  const concentration = c0 + (cs - c0) * (1 - erf(argument));
  
  return concentration;
};

export const CORROSION_CONSTANTS = {
  B_VALUE: 10,
};
