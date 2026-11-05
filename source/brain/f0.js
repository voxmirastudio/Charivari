// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// ============================================================================================
//  CHARIVARI — fondamentale au fil du temps
//  Par trame : SOMME HARMONIQUE de jgcompose (carte des partiels, choisir_f0) — chaque pic fort
//  et ses sous-multiples f/2…f/6 sont candidats, notés par l'amplitude qu'ils expliquent sur leurs
//  rangs entiers (pondérée 1/√k), au moins deux rangs, le plus bas ≤ 2, à égalité le plus aigu.
//  Puis CONTINUITÉ : programmation dynamique sur les 5 meilleurs candidats de chaque trame (un saut
//  d'octave coûte, une glissade ne coûte presque rien) → une hauteur qui ne saute pas d'octave.
//  f0 affiné par moindres carrés sur les rangs (f_k = k·f0, poids a·k).
// ============================================================================================
const F0_MIN = 25, K_MAX = 24, TOL_C = 90, SUB = 6;
import { fft } from './fft.js';

/**
 * YIN (de Cheveigné & Kawahara ; le détecteur de l'Interstice : différence cumulative normalisée, premier creux sous 0,15,
 * interpolation parabolique, confiance = 1 − profondeur du creux) sur le mélange mono, une trame tous les `hop`, centrée
 * comme l'analyse. La périodicité se lit dans la FORME d'onde : un formant qui rend la 3e harmonique dominante ne la fait
 * pas prendre pour la fondamentale (la somme harmonique, elle, s'y trompait : voix, cuivres).
 * Différence calculée par autocorrélation FFT (8192) : W = 2048 d'intégration, périodes de 25 à 2000 Hz.
 */
export function yinTrack (M, sr, hop, nfr) {
  const W = 2048, tMin = Math.max(2, Math.floor(sr / 2000)), tMax = Math.min(1900, Math.ceil(sr / 25)), NF = 8192;
  const f = new Float64Array(nfr), conf = new Float64Array(nfr), n = M.length;
  const xr = new Float64Array(NF), xi = new Float64Array(NF), yr = new Float64Array(NF), yi = new Float64Array(NF);
  const cm = new Float64Array(tMax + 2), pre = new Float64Array(W + tMax + 1);
  for (let j = 0; j < nfr; ++j) {
    const c0 = j * hop - W / 2, L = W + tMax;
    let e = 0; for (let i = 0; i < L; ++i) { const s = c0 + i, v = s >= 0 && s < n ? M[s] : 0; xr[i] = v; e += v * v; }
    if (e < 1e-10) { f[j] = 0; conf[j] = 0; continue; }
    for (let i = L; i < NF; ++i) xr[i] = 0; xi.fill(0);
    for (let i = 0; i < NF; ++i) { yr[i] = i < W ? xr[i] : 0; yi[i] = 0; }
    pre[0] = 0; for (let i = 0; i < L; ++i) pre[i + 1] = pre[i] + xr[i] * xr[i];
    fft(xr, xi); fft(yr, yi);
    for (let k = 0; k < NF; ++k) { const a = yr[k] * xr[k] + yi[k] * xi[k], b = yr[k] * xi[k] - yi[k] * xr[k]; xr[k] = a; xi[k] = b; }
    fft(xr, xi, true);
    // xr[τ] = Σ_{i<W} x[i]·x[i+τ] (le facteur de l'inverse est retrouvé sur τ = 0)
    const sc = xr[0] !== 0 ? (pre[W] - pre[0]) / xr[0] : 1;
    let run = 0; cm[0] = 1;
    for (let t = 1; t <= tMax; ++t) { const d = pre[W] + (pre[t + W] - pre[t]) - 2 * xr[t] * sc; run += d; cm[t] = run > 1e-20 ? d * t / run : 1; }
    let bt = 0;
    for (let t = tMin; t < tMax; ++t) if (cm[t] < 0.15) { while (t + 1 < tMax && cm[t + 1] < cm[t]) t++; bt = t; break; }
    if (!bt) { let mn = 1e9; for (let t = tMin; t < tMax; ++t) if (cm[t] < mn) { mn = cm[t]; bt = t; } }
    bt = Math.max(tMin + 1, Math.min(tMax - 1, bt));
    const y1 = cm[bt - 1], y2 = cm[bt], y3 = cm[bt + 1], den = y1 - 2 * y2 + y3, dl = Math.abs(den) > 1e-12 ? Math.max(-0.5, Math.min(0.5, 0.5 * (y1 - y3) / den)) : 0;
    f[j] = sr / (bt + dl); conf[j] = Math.max(0, Math.min(1, 1 - y2));
  }
  return { f, conf };
}

function frameCands (peaks, yf = 0, yc = 0) {
  const P = peaks.filter(p => p.emerg >= 12).sort((a, b) => b.a - a.a).slice(0, 40);
  if (!P.length) return [];
  const amax = P[0].a;
  const cs = new Set();
  for (const p of P) { if (p.a < 0.15 * amax) continue; for (let d = 1; d <= SUB; ++d) { const c = p.f / d; if (c >= F0_MIN) cs.add(Math.round(c * 100) / 100); } }
  let etot = 0; for (const p of P) etot += p.a * p.a;
  const out = [];
  for (const c of cs) {
    let sc = 0, lo = 99, nr = 0, num = 0, den = 0, ex = 0;
    const seen = new Set();
    for (const p of P) {
      const r = p.f / c, k = Math.round(r);
      if (k < 1 || k > K_MAX) continue;
      const dc = Math.abs(1200 * Math.log2(r / k));
      if (dc > TOL_C) continue;
      sc += p.a / Math.sqrt(k);
      if (!seen.has(k)) { seen.add(k); nr += 1; lo = Math.min(lo, k); }
      num += p.a * p.f * k; den += p.a * k * k;
      if (dc <= 30) ex += p.a * p.a;
    }
    if (nr < 2 || lo > 2) continue;
    out.push({ f: num / den, s: sc, conf: ex / etot });
  }
  if (!out.length) { const p = P[0]; return [{ f: p.f, s: p.a, conf: p.a * p.a / etot, single: true }]; }
  // à égalité (2 %), le plus aigu d'abord : un grave qui n'explique pas nettement plus n'est pas entendu
  out.sort((a, b) => b.s - a.s);
  const best = out[0];
  for (const c of out) if (c.f > best.f && c.s * 1.02 >= best.s) { best.pref = true; c.s = best.s * 1.0001; }
  // la forme d'onde est nettement périodique (YIN ≥ 0,8) : le candidat qu'elle désigne (à 60 c près) passe en tête et
  // porte sa confiance — une somme harmonique trompée par un formant ne l'emporte plus
  if (yc >= 0.8 && yf > 0) {
    let bi = -1, bd = 60; for (let i = 0; i < out.length; ++i) { const d = Math.abs(1200 * Math.log2(out[i].f / yf)); if (d < bd) { bd = d; bi = i; } }
    if (bi >= 0) { out[bi].s = out[0].s * 1.05 + 1e-12; out[bi].conf = Math.max(out[bi].conf, yc); out[bi].yin = true; }
  }
  out.sort((a, b) => b.s - a.s);
  return out.slice(0, 5);
}

/**
 * @param an   analyse de sines.analyzePeaks
 * @returns { f0: Float64Array (NaN = pas de hauteur), conf, hop }
 */
export function f0Track (an, opts = {}) {
  const nfr = an.frames.length, lam = opts.jumpCost ?? 0.35;
  const Y = opts.yin, C = an.frames.map((fr, j) => (fr ? frameCands(fr.peaks, Y ? Y.f[j] : 0, Y ? Y.conf[j] : 0) : []));
  const f0 = new Float64Array(nfr).fill(NaN), conf = new Float64Array(nfr), single = new Uint8Array(nfr);
  // programmation dynamique par segments continus de trames pourvues
  let j = 0;
  while (j < nfr) {
    while (j < nfr && !C[j].length) j += 1;
    const a = j; while (j < nfr && C[j].length) j += 1;
    const b = j; if (b <= a) continue;
    const V = [], Bk = [];
    for (let q = a; q < b; ++q) {
      const cs = C[q], smax = cs[0].s;
      const v = new Float64Array(cs.length), bk = new Int32Array(cs.length);
      for (let i = 0; i < cs.length; ++i) {
        const own = cs[i].s / smax;
        if (q === a) { v[i] = own; continue; }
        const pc = C[q - 1], pv = V[V.length - 1];
        let best = -1e9, bi = 0;
        for (let k = 0; k < pc.length; ++k) { const jump = Math.abs(1200 * Math.log2(cs[i].f / pc[k].f)) / 100; const val = pv[k] - lam * Math.min(jump, 12) * (jump > 0.5 ? 1 : 0.2); if (val > best) { best = val; bi = k; } }
        v[i] = best + own; bk[i] = bi;
      }
      V.push(v); Bk.push(bk);
    }
    let bi = 0; const last = V[V.length - 1]; for (let i = 1; i < last.length; ++i) if (last[i] > last[bi]) bi = i;
    for (let q = b - 1; q >= a; --q) { const c = C[q][bi]; f0[q] = c.f; conf[q] = c.conf; single[q] = c.single ? 1 : 0; bi = Bk[q - a][bi]; }
  }
  return { f0, conf, single, hop: an.hop };
}

/** segments harmoniques : trames consécutives de confiance ≥ seuil et f0 continue (sauts < 80 c) */
export function harmonicSegments (ft, opts = {}) {
  const thr = opts.conf ?? 0.5, minF = opts.minFrames ?? 20, out = [];
  let a = -1;
  for (let j = 0; j <= ft.f0.length; ++j) {
    const ok = j < ft.f0.length && ft.conf[j] >= thr && ft.f0[j] > 0 && !ft.single[j] && (a < 0 || Math.abs(1200 * Math.log2(ft.f0[j] / ft.f0[j - 1])) < 80);
    if (ok && a < 0) a = j;
    if (!ok && a >= 0) { if (j - a >= minF) out.push([a, j - 1]); a = -1; if (j < ft.f0.length && ft.conf[j] >= thr && ft.f0[j] > 0 && !ft.single[j]) a = j; }
  }
  return out;
}
