// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// mesures objectives d'un rendu (pour le journal) : niveau, crête, part d'aigu > 10 kHz, part de grave < 40 Hz,
// centroïde, attaques, distance spectrale au parent (spectres moyens en bandes de 1/3 d'octave, dB)
import { fft } from './fft.js';
import { detectOnsets } from './onsets.js';
export function measure (L, R, sr) {
  const n = L.length, N = 4096, w = new Float64Array(N); for (let i = 0; i < N; ++i) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
  const P = new Float64Array(N / 2 + 1), re = new Float64Array(N), im = new Float64Array(N);
  let fr = 0;
  for (let s = 0; s + N <= n; s += N / 2) { for (const X of [L, R]) { for (let i = 0; i < N; ++i) { re[i] = X[s + i] * w[i]; im[i] = 0; } fft(re, im); for (let k = 0; k <= N / 2; ++k) P[k] += re[k] * re[k] + im[k] * im[k]; } fr += 1; }
  let tot = 0, hf = 0, lf = 0, cen = 0; for (let k = 1; k <= N / 2; ++k) { const f = k * sr / N; tot += P[k]; cen += f * P[k]; if (f > 10000) hf += P[k]; if (f < 40) lf += P[k]; }
  const bands = []; for (let fc = 31.25; fc < 20000; fc *= Math.pow(2, 1 / 3)) { let e = 0; for (let k = Math.floor(fc / Math.pow(2, 1 / 6) / sr * N); k <= Math.min(N / 2, Math.ceil(fc * Math.pow(2, 1 / 6) / sr * N)); ++k) e += P[k]; bands.push(10 * Math.log10(e / (tot || 1) + 1e-12)); }
  let pk = 0, e2 = 0; for (let i = 0; i < n; ++i) { pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i])); e2 += L[i] * L[i] + R[i] * R[i]; }
  const M = new Float64Array(n); for (let i = 0; i < n; ++i) M[i] = 0.5 * (L[i] + R[i]);
  const on = detectOnsets(M, sr).onsets.length;
  return { dur: n / sr, rmsDb: 10 * Math.log10(e2 / (2 * n) + 1e-20), peakDb: 20 * Math.log10(pk + 1e-20), hfPct: 100 * hf / (tot || 1), lfPct: 100 * lf / (tot || 1), centroid: cen / (tot || 1), onsets: on, bands };
}
export const specDist = (a, b) => Math.sqrt(a.bands.reduce((s, x, i) => s + Math.min(900, (x - b.bands[i]) ** 2), 0) / a.bands.length);
