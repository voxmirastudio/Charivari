// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// ============================================================================================
//  CHARIVARI — ANATOMIE D'UN ENFANT (ce que les quatre pôles temps réel relisent)
//  Mesurée par le cerveau sur l'enfant lui-même, trame par trame (pas de 1024 images = 21,3 ms à 48 kHz), puis
//  transmise au DSP avec l'enfant (mêmes paquets acquittés, en entiers à virgule fixe) : le DSP ne réanalyse plus rien.
//  Un enregistrement de 32 mots par trame :
//    0 f0 (Hz × 16, 0 : non voisé)      1 confiance (× 1000)          2 sonie (dB × 100, relative à la crête de l'enfant)
//    3-5 formants F1 F2 F3 (Hz)          6 événements (bits : 1 attaque raide, 2 attaque douce, 4 changement de note,
//                                          8 gonflement de sonie, 16 marque du GESTE ; bits 8-17 : écart exact de
//                                          l'attaque à la trame + 512)
//    7 position source dans le parent (image ; −1 : aucune) — le fantôme de la FILIATION
//    8-31 enveloppe spectrale vraie sur 24 bandes (60 Hz → 16 kHz, log), dB × 100 relatifs au maximum de la trame
// ============================================================================================
import { prepare, trueEnvelope } from './phv.js';
import { detectOnsets } from './onsets.js';
import { fft } from './fft.js';

export const ANA_HOP = 1024, ANA_REC = 32, ANA_BANDS = 24;
export const bandHz = b => 60 * Math.pow(16000 / 60, b / (ANA_BANDS - 1));

const centsOf = f => 1200 * Math.log2(f / 440);

/**
 * L, R : l'enfant ; cmap : Float32Array de positions source toutes les 1024 images (birth) ; fallback : formants du parent
 * renvoie { nfr, words: Int32Array(nfr × 32), level, marks, counts }
 */
export function childAnatomy (L, R, sr, cmap, fallbackFormants = [500, 1500, 2500]) {
  const n = L.length, H = ANA_HOP, nfr = Math.ceil(n / H) + 1;
  const M = new Float64Array(n); for (let i = 0; i < n; ++i) M[i] = 0.5 * (L[i] + R[i]);
  // hauteur : le suivi du moteur (somme harmonique + continuité), au pas de 512
  const Pc = prepare(L, R, sr);
  const f0At = j => { const q = Math.min(Pc.voiced.length - 1, 2 * j); return Pc.voiced[q] || 0; };
  const confAt = j => { const q = Math.min(Pc.conf.length - 1, 2 * j); return Pc.voiced[q] > 0 ? Math.min(1, Pc.conf[q] || 0) : 0; };
  // sonie par trame (énergie moyenne sur ±512 autour du centre)
  const loud = new Float64Array(nfr); let lmax = -1e9;
  for (let j = 0; j < nfr; ++j) { const c = j * H, a = Math.max(0, c - 512), b = Math.min(n, c + 512); let e = 0; for (let i = a; i < b; ++i) e += L[i] * L[i] + R[i] * R[i]; loud[j] = b > a ? 10 * Math.log10(e / (b - a) / 2 + 1e-20) : -200; lmax = Math.max(lmax, loud[j]); }
  // (V6.5) the loudness the DSP reads (word 2): the energy under a Hann window of 2048 centred on the frame. The ±512
  // rectangle above (kept for the events) holds a fractional number of periods: on a steady 220 Hz saw it read ±0.6 dB from
  // one frame to the next, and each of these false rises pushed MASK's spring. A rise that is real keeps its full size (it
  // spreads over two frames instead of one)
  const loudW = new Float64Array(nfr); let lwmax = -1e9;
  for (let j = 0; j < nfr; ++j) {
    const c = j * H, a = Math.max(0, c - 1024), b = Math.min(n, c + 1024); let e = 0, sw = 0;
    for (let i = a; i < b; ++i) { const w = 0.5 + 0.5 * Math.cos(Math.PI * (i - c) / 1024); e += w * (L[i] * L[i] + R[i] * R[i]); sw += w; }
    loudW[j] = sw > 0 ? 10 * Math.log10(e / sw / 2 + 1e-20) : -200; lwmax = Math.max(lwmax, loudW[j]);
  }
  // enveloppe vraie par trame (fenêtre de 2048, spectre réduit à 512 points par maximum, comme le moteur)
  const N = 2048, NE = 512, BE = NE / 2 + 1, qE = N / NE, B = N / 2 + 1;
  const win = new Float64Array(N); for (let i = 0; i < N; ++i) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
  const re = new Float64Array(N), im = new Float64Array(N), mag = new Float64Array(B);
  const lmIn = new Float64Array(BE), E = new Float64Array(BE), work = { re: new Float64Array(NE), im: new Float64Array(NE), A: new Float64Array(BE) };
  const words = new Int32Array(nfr * ANA_REC);
  const formants = []; let nFallback = 0;
  for (let j = 0; j < nfr; ++j) {
    const c = j * H;
    for (let i = 0; i < N; ++i) { const s = c - N / 2 + i; re[i] = s >= 0 && s < n ? M[s] * win[i] : 0; im[i] = 0; }
    fft(re, im);
    let mx = 0; for (let k = 0; k < B; ++k) { mag[k] = Math.hypot(re[k], im[k]); if (mag[k] > mx) mx = mag[k]; }
    const base = j * ANA_REC;
    if (mx < 1e-9) { for (let b = 0; b < ANA_BANDS; ++b) words[base + 8 + b] = -9000; formants.push(null); continue; }
    for (let q = 0; q < BE; ++q) { let m = 0; const a = Math.max(0, Math.round((q - 0.5) * qE)), b = Math.min(B - 1, Math.round((q + 0.5) * qE)); for (let k = a; k <= b; ++k) if (mag[k] > m) m = mag[k]; lmIn[q] = Math.log(m + 1e-9 * mx + 1e-30); }
    const F = f0At(j) || Pc.f0med || 150;
    const p = Math.max(4, Math.min(NE / 2 - 2, Math.round(0.5 * sr / (2 * F) / qE)));
    trueEnvelope(lmIn, p, E, work, 16, 2);
    const Eat = f => { const x = f * NE / sr; if (x <= 0) return E[0]; if (x >= BE - 1) return E[BE - 1]; const i = Math.floor(x), u = x - i; return E[i] * (1 - u) + E[i + 1] * u; };
    let emx = -1e9; for (let q = 0; q < BE; ++q) emx = Math.max(emx, E[q]);
    for (let b = 0; b < ANA_BANDS; ++b) words[base + 8 + b] = Math.round(100 * 20 / Math.LN10 * (Eat(bandHz(b)) - emx));
    // formants : le maximum de l'enveloppe vraie dans chacune des trois régions formantiques (120–800 Hz, 800–2200 Hz,
    // 2200–5000 Hz), interpolé — toujours trois valeurs (exiger trois pics proéminents laissait 20 à 100 % des trames
    // sans formants sur les enfants mesurés)
    // l'enveloppe est d'abord redressée de sa pente générale (régression sur log f, 100 Hz–8 kHz) : sans cela le maximum d'une
    // région tombe sur son bord grave (mesuré : F1 = 70 Hz partout)
    let sx = 0, sy = 0, sxx = 0, sxy = 0, nn = 0;
    for (let q = 1; q < BE; ++q) { const f = q * sr / NE; if (f < 100 || f > 8000) continue; const x = Math.log2(f); sx += x; sy += E[q]; sxx += x * x; sxy += x * E[q]; nn += 1; }
    const sl = nn > 2 ? (nn * sxy - sx * sy) / (nn * sxx - sx * sx) : 0, ic = nn ? (sy - sl * sx) / nn : 0;
    const Rq = q => E[q] - (ic + sl * Math.log2(Math.max(1, q) * sr / NE));
    const zone = (f1, f2) => { let bq = -1, bv = -1e9; const a = Math.max(2, Math.floor(f1 * NE / sr)), b = Math.min(BE - 2, Math.ceil(f2 * NE / sr)); for (let q = a; q <= b; ++q) { const v = Rq(q); if (v > bv) { bv = v; bq = q; } } if (bq < 0) return 0.5 * (f1 + f2); const a0 = Rq(bq - 1), a1 = Rq(bq), a2 = Rq(bq + 1), den = a0 - 2 * a1 + a2, off = Math.abs(den) > 1e-9 ? Math.max(-0.5, Math.min(0.5, 0.5 * (a0 - a2) / den)) : 0; return (bq + off) * sr / NE; };
    formants.push([zone(120, 800), zone(800, 2200), zone(2200, 5000)]);
  }
  // trames silencieuses : formants de la trame sonore voisine (sinon ceux du parent) ; puis médiane sur 3 trames
  let lastF = (fallbackFormants || []).slice().sort((a, b) => a - b).slice(0, 3); while (lastF.length < 3) lastF.push(lastF.length ? lastF[lastF.length - 1] * 2 : 500);
  for (let j = 0; j < nfr; ++j) { if (!formants[j]) { formants[j] = lastF.slice(); nFallback += 1; } else lastF = formants[j]; }
  for (let j = 0; j < nfr; ++j) {
    const base = j * ANA_REC;
    for (let i = 0; i < 3; ++i) { const v = [formants[Math.max(0, j - 1)][i], formants[j][i], formants[Math.min(nfr - 1, j + 1)][i]].sort((a, b) => a - b); words[base + 3 + i] = Math.round(v[1]); }
  }
  // événements
  const ev = new Int32Array(nfr);
  const ons = detectOnsets(M, sr).onsets;
  // l'attaque garde sa position exacte (à l'échantillon) : écart à la trame, +512, dans les bits 8 à 17 — le GESTE retourne
  // chaque segment entre deux attaques, et une frontière arrondie à la trame (±10 ms) y ferait entendre le début de l'attaque
  // suivante à l'envers
  for (const o of ons) {
    const j = Math.min(nfr - 1, Math.round(o.s / H));
    if (!(ev[j] & 0x3ff00)) ev[j] |= ((Math.max(-511, Math.min(511, o.s - j * H)) + 512) & 1023) << 8;
    ev[j] |= o.sharp ? 1 : 2;
  }
  // changements de note : saut ≥ 80 c tenu ≥ 3 trames de part et d'autre
  let prevC = null, nNotes = 0;
  for (let j = 0; j < nfr; ++j) {
    const f = f0At(j); if (!(f > 0)) continue;
    const c = centsOf(f);
    if (prevC !== null && Math.abs(c - prevC) >= 80) {
      let ok = true; for (let d = 1; d <= 2 && j + d < nfr; ++d) { const g = f0At(j + d); if (!(g > 0) || Math.abs(centsOf(g) - c) > 50) ok = false; }
      if (ok) { ev[j] |= 4; nNotes += 1; prevC = c; }
    } else if (prevC === null) prevC = c; else prevC = 0.7 * prevC + 0.3 * c;
  }
  // gonflements : maximum local de sonie (lissée 3 trames), proéminent de 3 dB sur ±300 ms, à moins de 30 dB de la crête
  const ls = new Float64Array(nfr); for (let j = 0; j < nfr; ++j) { let s = 0, c = 0; for (let d = -1; d <= 1; ++d) if (j + d >= 0 && j + d < nfr) { s += loud[j + d]; c += 1; } ls[j] = s / c; }
  const R3 = Math.round(0.3 * sr / H);
  for (let j = 1; j < nfr - 1; ++j) {
    if (!(ls[j] > ls[j - 1] && ls[j] >= ls[j + 1]) || ls[j] < lmax - 30) continue;
    let lo = ls[j], hi = ls[j]; for (let d = 1; d <= R3; ++d) { if (j - d >= 0) lo = Math.min(lo, ls[j - d]); if (j + d < nfr) hi = Math.min(hi, ls[j + d]); }
    if (ls[j] - Math.max(lo, hi) >= 3) ev[j] |= 8;
  }
  // marques du GESTE : la première source d'événements qui existe (attaques ≥ 2, sinon notes, sinon gonflements, sinon
  // l'enfant entier comme une seule respiration — aucune marque, le DSP prend alors début et fin)
  const cnt = m => { let c = 0; for (let j = 0; j < nfr; ++j) if (ev[j] & m) c += 1; return c; };
  const counts = { attaques: cnt(3), notes: cnt(4), gonflements: cnt(8) };
  let level = 4, mask = 0;
  if (counts.attaques >= 2) { level = 1; mask = 3; } else if (counts.notes >= 1) { level = 2; mask = 3 | 4; } else if (counts.gonflements >= 1) { level = 3; mask = 8; }
  let marks = 0;
  if (mask) for (let j = 0; j < nfr; ++j) if (ev[j] & mask) { ev[j] |= 16; marks += 1; }
  for (let j = 0; j < nfr; ++j) {
    const base = j * ANA_REC, f = f0At(j);
    words[base] = Math.round(16 * f); words[base + 1] = Math.round(1000 * confAt(j));
    words[base + 2] = Math.round(100 * Math.max(-120, loudW[j] - lwmax)); words[base + 6] = ev[j];
    words[base + 7] = cmap && j < cmap.length ? Math.round(cmap[j]) : -1;
  }
  return { nfr, words, level, marks, counts, formantFallback: nFallback / nfr };
}
