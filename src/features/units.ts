/** Unit conversions. Storage is always metric (°C, kg, ml). */
export const cToF = (c: number) => c * 9 / 5 + 32;
export const fToC = (f: number) => (f - 32) * 5 / 9;
export const kgToLb = (kg: number) => kg * 2.20462;
export const lbToKg = (lb: number) => lb / 2.20462;
export const mlToOz = (ml: number) => ml / 29.5735;
export const ozToMl = (oz: number) => oz * 29.5735;
export const round = (n: number, dp = 1) => Math.round(n * 10 ** dp) / 10 ** dp;
