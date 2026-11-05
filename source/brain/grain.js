// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// indice de GRAIN : dans chaque bande de tiers d'octave (250 Hz – 12 kHz), part de l'énergie de modulation
// d'enveloppe entre 30 et 200 Hz (rugosité, crépitement) sur l'énergie de modulation 1–200 Hz.
// Enveloppes : filtre de bande (FFT 1 ms), redressement, pas de 1 ms. Moyenne pondérée par l'énergie des bandes.
import { fft } from './fft.js';
export function grainIndex (L, R, sr) {
  const n = L.length, M = new Float64Array(n); for (let i = 0; i < n; ++i) M[i] = 0.5 * (L[i] + R[i]);
  // STFT courte : N = 256 (5,3 ms), pas 48 (1 ms)
  const N = 256, hop = 48, w = new Float64Array(N); for (let i = 0; i < N; ++i) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
  const nf = Math.floor((n - N) / hop), bands = [];
  for (let fc = 250; fc < 12000; fc *= Math.pow(2, 1 / 3)) bands.push([Math.max(1, Math.floor(fc / Math.pow(2, 1 / 6) / sr * N)), Math.ceil(fc * Math.pow(2, 1 / 6) / sr * N)]);
  const env = bands.map(() => new Float64Array(nf));
  const re = new Float64Array(N), im = new Float64Array(N);
  for (let j = 0; j < nf; ++j) { for (let i = 0; i < N; ++i) { re[i] = M[j * hop + i] * w[i]; im[i] = 0; } fft(re, im); bands.forEach(([a, b], k) => { let e = 0; for (let q = a; q <= b; ++q) e += re[q] * re[q] + im[q] * im[q]; env[k][j] = Math.sqrt(e); }); }
  // spectre de modulation par blocs de 512 ms
  const B = 512, rate = sr / hop; let num = 0, den = 0;
  const r2 = new Float64Array(B), i2 = new Float64Array(B);
  for (const e of env) {
    for (let s = 0; s + B <= nf; s += B / 2) {
      let mean = 0; for (let i = 0; i < B; ++i) mean += e[s + i]; mean /= B; if (mean < 1e-6) continue;
      for (let i = 0; i < B; ++i) { r2[i] = (e[s + i] - mean) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / B)); i2[i] = 0; }
      fft(r2, i2);
      let lo = 0, hi = 0; for (let k = 1; k < B / 2; ++k) { const f = k * rate / B, p = r2[k] * r2[k] + i2[k] * i2[k]; if (f >= 1 && f < 200) lo += p; if (f >= 30 && f < 200) hi += p; }
      num += hi; den += lo;
    }
  }
  return den > 0 ? num / den : 0;
}
