// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// ============================================================================================
//  CHARIVARI — attaques (micro-événements)
//  Détection : la méthode de jgcompose_rhythmscope (flux spectral positif, seuil adaptatif,
//  pic interpolé sous le hop), puis RAFFINEMENT à l'échantillon : on cherche, autour de chaque
//  attaque, l'endroit où l'énergie aiguë décolle (dérivée de l'énergie courte en dB), et on
//  mesure sa RAIDEUR (dB gagnés entre les 10 ms d'avant et les 3 ms d'après).
//  Une attaque raide coupe les fenêtres d'analyse sinusoïdale (pas de pré-écho) ; une attaque
//  douce (legato, changement de note) ne coupe rien.
// ============================================================================================
import { fft } from './fft.js';

export function onsetEnvelope (x, sr, nfft = 2048, hop = 512) {
  const w = new Float64Array(nfft); for (let i = 0; i < nfft; ++i) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (nfft - 1));
  const nfr = 1 + Math.max(0, Math.floor((x.length - nfft) / hop));
  const re = new Float64Array(nfft), im = new Float64Array(nfft), prev = new Float64Array(nfft / 2 + 1);
  const env = new Float64Array(nfr);
  for (let j = 0; j < nfr; ++j) {
    for (let i = 0; i < nfft; ++i) { const s = j * hop + i; re[i] = (s < x.length ? x[s] : 0) * w[i]; im[i] = 0; }
    fft(re, im);
    let f = 0;
    for (let k = 0; k <= nfft / 2; ++k) { const m = Math.hypot(re[k], im[k]); if (j > 0 && m > prev[k]) f += m - prev[k]; prev[k] = m; }
    env[j] = f;
  }
  let mx = 0; for (const v of env) mx = Math.max(mx, v);
  if (mx > 0) for (let j = 0; j < nfr; ++j) env[j] /= mx;
  return { env, hop, nfft };
}

export function pickOnsets (env, sr, hop, minGap = 0.06, thrBias = 0.12, w = 8) {
  const out = [], mg = Math.max(1, Math.floor(minGap * sr / hop)), n = env.length;
  let last = -mg;
  for (let i = 1; i < n - 1; ++i) {
    const lo = Math.max(0, i - w), hi = Math.min(n, i + w + 1);
    let m = 0; for (let q = lo; q < hi; ++q) m += env[q]; m /= (hi - lo);
    if (env[i] > m + thrBias && env[i] >= env[i - 1] && env[i] > env[i + 1] && i - last >= mg) {
      const d1 = env[i - 1], d2 = env[i], d3 = env[i + 1], den = d1 - 2 * d2 + d3;
      let off = Math.abs(den) > 1e-12 ? 0.5 * (d1 - d3) / den : 0; off = Math.max(-0.5, Math.min(0.5, off));
      out.push({ t: (i + off) * hop / sr, strength: env[i] }); last = i;
    }
  }
  return out;
}

// énergie courte (fenêtre 64, pas 16) de la dérivée première (accent sur l'aigu, là où l'attaque se lit)
function shortEnergyDb (x, a, b) {
  const H = 16, W = 64, out = [];
  for (let s = a; s + W <= b; s += H) {
    let e = 0;
    for (let i = s; i < s + W; ++i) { const d = x[i] - (i > 0 ? x[i - 1] : 0); e += d * d; }
    out.push(10 * Math.log10(e / W + 1e-20));
  }
  return { db: out, H, W };
}

/**
 * Attaques raffinées : { s (échantillon où l'attaque commence), t, rise (dB), strength, sharp }
 * - s : dernier point, avant la montée maximale, encore à moins de 3 dB du plancher d'avant.
 */
export function detectOnsets (M, sr, opts = {}) {
  const { env, hop } = onsetEnvelope(M, sr);
  const raw = pickOnsets(env, sr, hop);
  const res = [];
  const R = Math.round(0.03 * sr);
  for (const o of raw) {
    // le flux spectral date le CENTRE d'une trame de 2048 qui commence en (t·sr) ; l'attaque est dans cette trame
    const c = Math.round(o.t * sr) + 1024;
    const a = Math.max(0, c - R - 1024), b = Math.min(M.length, c + R);
    if (b - a < 256) continue;
    const { db, H, W } = shortEnergyDb(M, a, b);
    // montée : moyenne des 3 ms d'après moins moyenne des 10 ms d'avant, à chaque position
    const nA = Math.max(1, Math.round(0.003 * sr / H)), nB = Math.max(1, Math.round(0.010 * sr / H));
    let best = -1e9, bi = -1;
    for (let i = nB; i + nA < db.length; ++i) {
      let pa = 0, pb = 0;
      for (let q = 0; q < nA; ++q) pa += db[i + q];
      for (let q = 1; q <= nB; ++q) pb += db[i - q];
      const rise = pa / nA - pb / nB;
      if (rise > best) { best = rise; bi = i; }
    }
    if (bi < 0) continue;
    let floor = 0; for (let q = 1; q <= nB; ++q) floor += db[bi - q]; floor /= nB;
    let i0 = bi; while (i0 > 0 && db[i0 - 1] > floor + 3 && bi - i0 < nB) i0 -= 1;
    const s = a + i0 * H + (W >> 1) - (W >> 2);
    res.push({ s, t: s / sr, raw: o.t, rise: best, strength: o.strength, sharp: best >= (opts.sharpDb ?? 9) });
  }
  // doublons (deux pics de flux sur la même attaque)
  res.sort((p, q) => p.s - q.s);
  const out = [];
  for (const o of res) { if (out.length && o.s - out[out.length - 1].s < 0.02 * sr) { if (o.rise > out[out.length - 1].rise) out[out.length - 1] = o; } else out.push(o); }
  return { onsets: out, env, hop };
}
