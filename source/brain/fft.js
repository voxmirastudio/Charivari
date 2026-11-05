// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// FFT complexe radix 2 (double précision), tables mises en cache par taille
const cache = new Map();
function tables (n) {
  let t = cache.get(n);
  if (t) return t;
  const cos = new Float64Array(n / 2), sin = new Float64Array(n / 2), rev = new Uint32Array(n);
  for (let k = 0; k < n / 2; ++k) { cos[k] = Math.cos(2 * Math.PI * k / n); sin[k] = -Math.sin(2 * Math.PI * k / n); }
  const bits = Math.log2(n);
  for (let i = 0; i < n; ++i) { let r = 0, x = i; for (let b = 0; b < bits; ++b) { r = (r << 1) | (x & 1); x >>= 1; } rev[i] = r; }
  t = { cos, sin, rev }; cache.set(n, t); return t;
}

// en place ; inverse normalisé (1/n)
export function fft (re, im, inverse = false) {
  const n = re.length, { cos, sin, rev } = tables(n);
  for (let i = 0; i < n; ++i) { const j = rev[i]; if (j > i) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
  const sg = inverse ? -1 : 1;
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1, step = n / len;
    for (let i = 0; i < n; i += len) {
      for (let j = 0; j < half; ++j) {
        const wr = cos[j * step], wi = sg * sin[j * step];
        const a = i + j, b = a + half;
        const tr = re[b] * wr - im[b] * wi, ti = re[b] * wi + im[b] * wr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
      }
    }
  }
  if (inverse) { const s = 1 / n; for (let i = 0; i < n; ++i) { re[i] *= s; im[i] *= s; } }
}

// fenêtres
export function hann (n) { const w = new Float64Array(n); for (let i = 0; i < n; ++i) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / n); return w; }
// Blackman-Harris 4 termes (lobes secondaires -92 dB) : pics voisins séparés proprement
export function blackmanHarris (n) {
  const w = new Float64Array(n), a0 = 0.35875, a1 = 0.48829, a2 = 0.14128, a3 = 0.01168;
  for (let i = 0; i < n; ++i) { const x = 2 * Math.PI * i / n; w[i] = a0 - a1 * Math.cos(x) + a2 * Math.cos(2 * x) - a3 * Math.cos(3 * x); }
  return w;
}
