// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// ============================================================================================
//  CHARIVARI — moteur de transformation « vivant » (conçu sur le banc, 15 sons difficiles)
//
//  Le spectre COMPLET de l'original est transformé, trame par trame (rien n'est résumé en modèle) :
//  • phase reconstruite par intégration de son gradient (Průša & Holighaus, « Phase Vocoder Done
//    Right » ; tas RTPGHI) — gradients EXACTS par réallocation (fenêtres g, u·g, g') ;
//  • référence de phase commune par case (Mid ou Side, le plus fort) : l'image stéréo est gardée ;
//  • attaques : là où la carte de temps est à cadence 1 autour d'une attaque raide (±N/2), les cases
//    que l'attaque nourrit reprennent la phase d'origine (Röbel) — l'attaque est l'original ;
//  • hauteur et CORPS séparés, par clonage de régions harmoniques : l'harmonique de sortie h'
//    (f' = h'·r·f0) reçoit la région de l'original qui occupait la place que le corps lui assigne
//    (f'/s_b) ; la région emporte sa micro-structure (souffle, jitter, battements). Sans série
//    harmonique : partiels libres déplacés un à un (Laroche & Dolson), bruit en place ou étiré
//    avec le corps ; impulsions d'attaque en place ;
//  • enveloppe vraie (Röbel & Rodet) pour les corrections de corps et les filtres organologiques.
//  Bench (moyennes sur 15 sons) : étirement aller-retour 2,72 dB (Rubber Band R3 4,72), enveloppe
//  à −12 demi-tons 7,9 dB (R3 16,5), attaques 1,12 (R3 2,17).
// ============================================================================================
import { fft } from './fft.js';
import { detectOnsets } from './onsets.js';
import { f0Track, yinTrack } from './f0.js';

const TAU = 2 * Math.PI;
// valeurs tranchées sur le banc : référence de phase = Mid ; niveau de note suivi en ~250 ms ; voisement : les pics
// harmoniques portent ≥ 50 % de l'énergie de la trame, confiance de hauteur ≥ 0,6
const NORMK = 0.02, VFR = 0.5, CONF = 0.6;

// ------------------------------------------------------------------------------------------ fenêtres
function windows (N) {
  const g = new Float64Array(N), ug = new Float64Array(N), dg = new Float64Array(N);
  for (let k = 0; k < N; ++k) {
    g[k] = 0.5 - 0.5 * Math.cos(TAU * k / N);
    ug[k] = (k - N / 2) * g[k];
    dg[k] = (Math.PI / N) * Math.sin(TAU * k / N);
  }
  return { g, ug, dg };
}

// ------------------------------------------------------------------------------------------ tas max
class Heap {
  constructor (cap) { this.v = new Float64Array(cap); this.p = new Int32Array(cap); this.n = 0; }
  clear () { this.n = 0; }
  push (v, p) {
    let i = this.n++; const V = this.v, P = this.p;
    while (i > 0) { const q = (i - 1) >> 1; if (V[q] >= v) break; V[i] = V[q]; P[i] = P[q]; i = q; }
    V[i] = v; P[i] = p;
  }
  pop () { // renvoie la charge utile ; la valeur est perdue
    const V = this.v, P = this.p, top = P[0], v = V[--this.n], p = P[this.n];
    let i = 0;
    for (;;) {
      const l = 2 * i + 1; if (l >= this.n) break;
      const r = l + 1, c = (r < this.n && V[r] > V[l]) ? r : l;
      if (V[c] <= v) break;
      V[i] = V[c]; P[i] = P[c]; i = c;
    }
    if (this.n > 0) { V[i] = v; P[i] = p; }
    return top;
  }
}

// ------------------------------------------------------------------------------------------ analyse d'une trame
// convention « temps local » : l'origine des phases est au centre de la trame
function makeAnalyser (L, R, N) {
  const { g, ug, dg } = windows(N), B = N / 2 + 1, n = L.length;
  const re = new Float64Array(N), im = new Float64Array(N);
  const out = {
    Lr: new Float64Array(B), Li: new Float64Array(B), Rr: new Float64Array(B), Ri: new Float64Array(B),
    Yr: new Float64Array(B), Yi: new Float64Array(B), mag: new Float64Array(B), w: new Float64Array(B), gd: new Float64Array(B),
    useS: new Uint8Array(B)
  };
  const tmp = { ur: new Float64Array(B), ui: new Float64Array(B), dr: new Float64Array(B), di: new Float64Array(B), uRr: new Float64Array(B), uRi: new Float64Array(B), dRr: new Float64Array(B), dRi: new Float64Array(B) };
  // transformée de L et R ensemble (z = l + i·r) avec la fenêtre win ; sépare en XL, XR
  function pair (c, win, XLr, XLi, XRr, XRi) {
    for (let k = 0; k < N; ++k) {
      const s = c - N / 2 + k, j = (k + N / 2) % N;               // rotation : centre → indice 0
      const inb = s >= 0 && s < n;
      re[j] = inb ? L[s] * win[k] : 0; im[j] = inb ? R[s] * win[k] : 0;
    }
    fft(re, im);
    for (let k = 0; k < B; ++k) {
      const k2 = (N - k) % N;
      const ar = re[k], ai = im[k], br = re[k2], bi = -im[k2];      // Z[k], conj Z[N−k]
      XLr[k] = 0.5 * (ar + br); XLi[k] = 0.5 * (ai + bi);
      XRr[k] = 0.5 * (ai - bi); XRi[k] = -0.5 * (ar - br);
    }
  }
  const bw = TAU / N;
  out.at = function (c) {
    pair(c, g, out.Lr, out.Li, out.Rr, out.Ri);
    pair(c, ug, tmp.ur, tmp.ui, tmp.uRr, tmp.uRi);
    pair(c, dg, tmp.dr, tmp.di, tmp.dRr, tmp.dRi);
    for (let k = 0; k < B; ++k) {
      const mr = out.Lr[k] + out.Rr[k], mi = out.Li[k] + out.Ri[k], sr_ = out.Lr[k] - out.Rr[k], si = out.Li[k] - out.Ri[k];
      const S = false;   // référence : le Mid (choisir Mid ou Side case par case casse la cohérence — mesuré)
      out.useS[k] = S ? 1 : 0;
      const yr = S ? sr_ : mr, yi = S ? si : mi;
      const ur = S ? tmp.ur[k] - tmp.uRr[k] : tmp.ur[k] + tmp.uRr[k], ui = S ? tmp.ui[k] - tmp.uRi[k] : tmp.ui[k] + tmp.uRi[k];
      const dr = S ? tmp.dr[k] - tmp.dRr[k] : tmp.dr[k] + tmp.dRr[k], di = S ? tmp.di[k] - tmp.dRi[k] : tmp.di[k] + tmp.dRi[k];
      out.Yr[k] = yr; out.Yi[k] = yi;
      const m2 = yr * yr + yi * yi; out.mag[k] = Math.sqrt(m2);
      if (m2 > 1e-40) {
        // Yd / Y et Yu / Y
        const qdr = (dr * yr + di * yi) / m2, qdi = (di * yr - dr * yi) / m2;
        const qur = (ur * yr + ui * yi) / m2;
        out.w[k] = k * bw - qdi; out.gd[k] = -qur;
      } else { out.w[k] = k * bw; out.gd[k] = 0; }
    }
    return out;
  };
  out.B = B; out.N = N; out.g = g;
  return out;
}

// ------------------------------------------------------------------------------------------ régions de pics
// étiquette de chaque case : indice du pic (case) dont elle dépend, frontière au creux ; −1 sous le plancher
function peakRegions (mag, lab, floorDb = 90) {
  const B = mag.length; let mx = 0; for (let k = 0; k < B; ++k) if (mag[k] > mx) mx = mag[k];
  const fl = mx * Math.pow(10, -floorDb / 20);
  const pk = [];
  for (let k = 1; k < B - 1; ++k) if (mag[k] > mag[k - 1] && mag[k] >= mag[k + 1] && mag[k] > fl) pk.push(k);
  if (!pk.length) { lab.fill(-1); return pk; }
  let b0 = 0;
  for (let i = 0; i < pk.length; ++i) {
    let b1 = B;
    if (i + 1 < pk.length) { let mi = pk[i], mv = mag[pk[i]]; for (let k = pk[i]; k <= pk[i + 1]; ++k) if (mag[k] < mv) { mv = mag[k]; mi = k; } b1 = mi; }
    for (let k = b0; k < b1; ++k) lab[k] = pk[i];
    b0 = b1;
  }
  return pk;
}

// accord des fréquences réallouées sur le lobe principal (droite ω = α + β·t̂ : glissando/vibrato admis) ;
// sc[k] : score de la région de k (1 : partiel, bas : bruit, 0 : impulsion)
function sinusoidality (A, lab, pk, sc, N, lobe = 2, tol = 0.3) {
  const bw = TAU / N, B = A.mag.length;
  const scoreOf = new Float64Array(B);
  for (const p of pk) {
    let W = 0, mt = 0, mw = 0;
    const a = Math.max(0, p - lobe), b = Math.min(B - 1, p + lobe);
    for (let k = a; k <= b; ++k) { if (lab[k] !== p) continue; const e = A.mag[k] * A.mag[k]; W += e; mt += e * -A.gd[k]; mw += e * A.w[k]; }
    if (W <= 0) { scoreOf[p] = 0; continue; }
    mt /= W; mw /= W;
    let stt = 0, stw = 0, sww = 0;
    for (let k = a; k <= b; ++k) { if (lab[k] !== p) continue; const e = A.mag[k] * A.mag[k], ct = -A.gd[k] - mt, cw = A.w[k] - mw; stt += e * ct * ct; stw += e * ct * cw; sww += e * cw * cw; }
    const beta = stt > 1e-12 ? stw / stt : 0;
    const res = Math.max(0, sww - beta * stw) / W;
    const d = Math.sqrt(res) / bw / tol;
    scoreOf[p] = Math.exp(-d * d);
  }
  for (let k = 0; k < B; ++k) sc[k] = lab[k] >= 0 ? scoreOf[lab[k]] : 0;
}

// ------------------------------------------------------------------------------------------ enveloppe vraie
// lissage cepstral itéré en enveloppe supérieure (Röbel & Rodet 2005) ; logm (ln), ordre p ; E (ln) en sortie
export function trueEnvelope (logm, p, E, work, iters = 24, tolDb = 1.5) {
  const B = logm.length, N = 2 * (B - 1), { re, im, A } = work;
  const tol = tolDb * Math.LN10 / 20;
  for (let k = 0; k < B; ++k) A[k] = logm[k];
  for (let it = 0; it < iters; ++it) {
    for (let k = 0; k < B; ++k) { re[k] = A[k]; im[k] = 0; }
    for (let k = B; k < N; ++k) { re[k] = A[N - k]; im[k] = 0; }
    fft(re, im, true);
    for (let q = 0; q < N; ++q) { const qq = Math.min(q, N - q); if (qq > p) { re[q] = 0; im[q] = 0; } else if (qq === p) { re[q] *= 0.5; im[q] *= 0.5; } }
    fft(re, im);
    let dmax = 0;
    for (let k = 0; k < B; ++k) { E[k] = re[k]; const d = A[k] - E[k]; if (d > dmax) dmax = d; }
    if (dmax < tol) break;
    for (let k = 0; k < B; ++k) if (E[k] > A[k]) A[k] = E[k];
  }
}

// ------------------------------------------------------------------------------------------ préparation d'un parent
/**
 * @returns P : { L, R, sr, N, hop, onsets (échantillons, attaques raides), f0At(s) → Hz (0 : pas de série harmonique) }
 */
export function prepare (L, R, sr, opts = {}) {
  const n = L.length, M = new Float64Array(n);
  for (let i = 0; i < n; ++i) M[i] = 0.5 * (L[i] + R[i]);
  const ons = detectOnsets(M, sr).onsets.filter(o => o.sharp).map(o => o.s);
  // hauteur : trames de 4096 au pas de 256, pics à fréquence réallouée, somme harmonique + continuité (f0.js)
  const Nf = 4096, hopF = 512, A = makeAnalyser(L, R, Nf), Bf = Nf / 2 + 1;
  const frames = [];
  const nfr = Math.ceil(n / hopF) + 1;
  const dbs = new Float64Array(Bf), cs = new Float64Array(Bf + 1);
  const fe = new Float64Array(nfr), Pavg = new Float64Array(Bf);          // énergie par trame, spectre moyen (conception)
  for (let j = 0; j < nfr; ++j) {
    const a = A.at(j * hopF), peaks = [];
    let e = 0; for (let k = 0; k < Bf; ++k) { const m2 = a.mag[k] * a.mag[k]; e += m2; Pavg[k] += m2; }
    fe[j] = e;
    for (let k = 0; k < Bf; ++k) { dbs[k] = 20 * Math.log10(a.mag[k] + 1e-12); cs[k + 1] = cs[k] + dbs[k]; }
    for (let k = 2; k < Bf - 2; ++k) {
      if (!(a.mag[k] > a.mag[k - 1] && a.mag[k] >= a.mag[k + 1])) continue;
      // émergence au-dessus du niveau moyen (dB) local (±24 cases)
      const lo = Math.max(0, k - 24), hi = Math.min(Bf - 1, k + 24);
      const emerg = dbs[k] - (cs[hi + 1] - cs[lo]) / (hi - lo + 1);
      if (emerg < 12) continue;
      peaks.push({ f: a.w[k] * sr / TAU, a: a.mag[k], emerg });
    }
    frames.push({ peaks });
  }
  const ft = f0Track({ frames, hop: hopF }, { yin: opts.noYin ? null : yinTrack(M, sr, hopF, nfr) });
  const voiced = new Float64Array(nfr);
  for (let j = 0; j < nfr; ++j) voiced[j] = (ft.f0[j] > 0 && ft.conf[j] >= CONF && !ft.single[j]) ? ft.f0[j] : 0;
  // trous d'une trame bouchés, îlots d'une trame retirés
  for (let j = 1; j < nfr - 1; ++j) {
    if (!voiced[j] && voiced[j - 1] && voiced[j + 1] && Math.abs(Math.log2(voiced[j - 1] / voiced[j + 1])) < 0.05) voiced[j] = Math.sqrt(voiced[j - 1] * voiced[j + 1]);
    else if (voiced[j] && !voiced[j - 1] && !voiced[j + 1]) voiced[j] = 0;
  }
  // trous de 2 à 3 trames (≤ 32 ms) entre deux trames de même hauteur (< 50 c) bouchés aussi : le rendu ne bascule plus de
  // moteur (régions harmoniques ↔ partiels libres) le temps d'un souffle — ces bascules faisaient papilloter le timbre
  for (let j = 1; j < nfr - 1; ++j) {
    if (voiced[j] || !voiced[j - 1]) continue;
    let e = j; while (e < nfr && !voiced[e] && e - j < 4) e++;
    if (e < nfr && voiced[e] && e - j <= 3 && Math.abs(1200 * Math.log2(voiced[j - 1] / voiced[e])) < 50) { const a = voiced[j - 1], b = voiced[e]; for (let q = j; q < e; ++q) voiced[q] = a * Math.pow(b / a, (q - j + 1) / (e - j + 1)); }
  }
  const f0At = s => voiced[Math.max(0, Math.min(nfr - 1, Math.round(s / hopF)))];
  let fs = []; for (const v of voiced) if (v > 0) fs.push(v); fs.sort((a, b) => a - b);
  const f0med = fs.length ? fs[fs.length >> 1] : 150, f0lo = fs.length ? fs[Math.floor(0.2 * fs.length)] : 0;
  // part voisée des trames actives (à −40 dB de la plus forte)
  let emx = 0; for (const e of fe) emx = Math.max(emx, e); let act = 0, vo = 0; for (let j = 0; j < nfr; ++j) if (fe[j] > emx * 1e-4) { act++; if (voiced[j] > 0) vo++; }
  return { L, R, M, sr, n, onsets: ons, f0At, f0med, f0lo, voicedShare: act ? vo / act : 0, voiced, hopF, N: opts.N || 2048, frames, frameEnergy: fe, Pavg, Nf, conf: ft.conf };
}

// ------------------------------------------------------------------------------------------ rendu d'une strate
/**
 * spec (une strate) : {
 *   D          durée de sortie (échantillons)
 *   T(t)       position de lecture (échantillon d'entrée) à l'instant de sortie t — quelconque (arrêt, retour, saut) ;
 *              null : silence (la strate se tait)
 *   r(t)       rapport de hauteur (1 : inchangé)       sb(t) échelle du corps (1 : formants gardés ; = r : le corps suit)
 *   partial(h, f, t, F) → [f', dB] | null : l'harmonique de SORTIE h (fréquence prévue f) va en f' avec un gain ; null : éteinte
 *   free(f, t) → [f', dB] | null : un partiel libre (hors série harmonique) de fréquence f
 *   src        'body' (défaut : la région prise là où le corps place f') | 'index' (l'harmonique h emporte SA région)
 *   env(f, t) → dB           filtre de corps (sourdine, pavillon bouché, bois…)
 *   lobeFloor(t) → [dB lobe, dB souffle] : partage partiel / souffle de sa région (chuchoté, conique…)
 *   inertia(t) → { att, rel } (s) : inertie du corps (attaque lente, résonance qui dure)
 *   gainDb(t), pan(t) → [gL, gR]
 * }
 */
// taille de trame de SYNTHÈSE selon la fondamentale de sortie la plus grave : sous 120 Hz (v5.5 ; 170 Hz en v5.3 lissait la
// micro-vie de trop de sons) (r × fondamentale grave du parent),
// 2048 ne sépare plus les harmoniques (lobes de ±47 Hz) : 4096 (mesuré sur une voyelle transposée d'une octave vers le bas :
// plancher entre les harmoniques +20,5 → +10,7 dB au-dessus de l'original, le niveau de Signalsmith Stretch) ; un son qui n'a
// pas de hauteur (moins d'un cinquième de trames voisées) garde 2048, ses attaques restent nettes
export function frameSizeFor (P, spec) {
  if (spec.N) return spec.N;
  if (!(P.voicedShare >= 0.2) || !(P.f0lo > 0)) return P.N;
  let rmin = Infinity; const rF = spec.r || (() => 1);
  for (let q = 0; q <= 32; ++q) { const v = rF(Math.min(spec.D - 1, Math.round(q * spec.D / 32))); if (v > 0 && v < rmin) rmin = v; }
  if (!Number.isFinite(rmin)) rmin = 1;
  return P.f0lo * rmin < 120 ? Math.max(P.N, 4096) : P.N;
}
export function render (P, spec) {
  const { sr } = P, N = frameSizeFor(P, spec), B = N / 2 + 1, a_s = N / 8, D = spec.D;
  const A = makeAnalyser(P.L, P.R, N), g = A.g, bw = TAU / N;
  const nf = Math.ceil(D / a_s) + 9;
  const outL = new Float64Array(D + 2 * N), outR = new Float64Array(D + 2 * N);
  const norm = 1 / (0.375 * N / a_s);
  const rF = spec.r || (() => 1), sbF = spec.sb || (() => 1), gF = spec.gainDb || (() => 0);
  const byIndex = spec.src === 'index';
  const lab = new Int32Array(B), sc = new Float64Array(B);
  const PM = new Float64Array(B), PL = new Float64Array(B), PR = new Float64Array(B);
  const best = new Float64Array(B), wn = new Float64Array(B), gdn = new Float64Array(B), phn = new Float64Array(B), dL = new Float64Array(B), dR = new Float64Array(B);
  const rb = new Uint8Array(B), stay = new Uint8Array(B), regIdx = new Int32Array(B);
  const HNM = spec.hnm ?? true;                          // harmonique + bruit (v5.3) ; spec.hnm = false : l'ancien moteur, pour le banc
  const logm = new Float64Array(B), logmP = new Float64Array(B), wP = new Float64Array(B), ph = new Float64Array(B), phP = new Float64Array(B);
  const fro = [], parts = [], flo = [];                                                        // images des partiels (inertie)
  const imLr = new Float64Array(B), imLi = new Float64Array(B), imRr = new Float64Array(B), imRi = new Float64Array(B);
  const gD = new Float64Array(B), gB = new Float64Array(B);
  const nzTL = new Float64Array(B), nzTR = new Float64Array(B), nzL = new Float64Array(B), nzR = new Float64Array(B);   // souffle synthétisé
  // enveloppe vraie sur le spectre réduit par maximum (512 points : l'enveloppe supérieure est gardée, 4× moins cher)
  const NE = Math.min(N, 512), BE = NE / 2 + 1, qE = N / NE;
  const E = new Float64Array(BE), Ework = { re: new Float64Array(NE), im: new Float64Array(NE), A: new Float64Array(BE) }, lmIn = new Float64Array(BE);
  const pre = makeAnalyser(P.L, P.R, N), preMag = new Float64Array(B);
  const heap = new Heap(4 * B + 16), done = new Uint8Array(B);
  const zr = new Float64Array(N), zi = new Float64Array(N);
  const ons = P.onsets;
  let havePrev = false, lastPreOnset = -1, gnS = -1;
  // (V6.5) SÉPARATION HARMONIQUE / BRUIT ADOUCIE — le plancher de chaque région, relevé trame par trame (30e centile), est
  // lissé dans le temps (40 ms, par rang tant que la hauteur tient à 3 % près) ; la part harmonique de chaque case n'est plus
  // la soustraction de puissance √(1 − plancher/|X|²) — nulle ou pleine d'une trame à l'autre là où |X|² frôle le plancher,
  // le « bruit musical » — mais un gain de Wiener à rapport a priori dirigé par la décision (Ephraim–Malah, α = 0,9) ; la part
  // bruit est son complément exact. La décision « voisé » a une hystérésis (entrée à VFR, sortie à 0,7·VFR). Le souffle
  // resynthétisé garde la cohérence gauche/droite MESURÉE du son (spectre croisé lissé 100 ms par case) — deux phases
  // indépendantes l'écartaient de l'image de l'instrument (Side/Mid −5,9 dB depuis une source mono)
  const flS = new Float64Array(512), ddP = new Float64Array(B), G2 = new Float64Array(B);
  let flF = 0, wasVoiced = false, ddT = -1e9;
  const cXr = new Float64Array(B), cXi = new Float64Array(B), cPL = new Float64Array(B), cPR = new Float64Array(B);
  const kFl = 1 - Math.exp(-a_s / (0.04 * sr)), kC = 1 - Math.exp(-a_s / (0.1 * sr)), DD = 0.9;
  const fb = k => k * sr / N;
  const EatIn = f => { const x = f * NE / sr; if (x <= 0) return E[0]; if (x >= BE - 1) return E[BE - 1]; const i = Math.floor(x), u = x - i; return E[i] * (1 - u) + E[i + 1] * u; };
  // au-delà de 0,45 × sr l'enveloppe n'est plus mesurée (bord du lissage cepstral, arbitraire) : prolongée en pente de
  // −12 dB/octave. Un corps agrandi lit son enveloppe à f/sb : pour sb = 1/3, tout partiel au-dessus de 7,2 kHz la lisait
  // au bord de Nyquist, jusqu'à +24 dB — mesuré : bouffées d'aigus et 2 à 3 clics sur un mirliton géant, 0 avec la pente
  const fTop = 0.45 * sr, kTop = 12 * Math.LN10 / 20;
  const Eat = f => f > fTop ? EatIn(fTop) - kTop * Math.log2(f / fTop) : EatIn(f);
  const dbE = (f1, f0) => Math.max(-24, Math.min(24, (Eat(f1) - Eat(f0)) * 20 / Math.LN10));

  for (let fi = 0; fi < nf; ++fi) {
    const t = fi * a_s - N / 2;                          // centre de sortie (la 1re trame déborde avant 0)
    const tc = Math.max(0, Math.min(D - 1, t));
    const Tc = spec.T(tc);
    const c0 = Math.round(t) - N / 2 + N;
    if (Tc === null || Tc === undefined || !(Tc > -N && Tc < P.n + N)) { havePrev = false; gnS = -1; fro.length = 0; nzL.fill(0); nzR.fill(0); continue; }
    const t1 = Math.min(D - 1, tc + a_s), t0 = Math.max(0, tc - a_s);
    const T1 = spec.T(t1), T0 = spec.T(t0);
    // cadence de lecture : celle du SEGMENT de la carte du temps (une différence de positions qui enjambe un raccord donnait
    // une vitesse aberrante — négative, donc une trame lue à l'envers, à chaque raccord de rotation, de rétrograde, de stase)
    const rate = spec.rateAt ? spec.rateAt(tc) : (T1 !== null && T0 !== null && t1 > t0) ? (T1 - T0) / (t1 - t0) : 1;
    const rev = rate < 0;
    // rien ne bouge en temps : toute case qui reste à sa place (ni transposée, ni déplacée) garde la PHASE D'ORIGINE — on ne
    // reconstruit que ce qui change (avant : un simple filtre faisait recalculer toutes les phases, nul d'un filtre à 0 dB
    // mesuré à −0,4…+3 dB, micro-vie effacée)
    const pass = !rev && Math.abs(rate - 1) < 0.02;
    const r = rF(tc), sb = sbF(tc);
    const an = A.at(Math.round(Tc));
    if (rev) { for (let k = 0; k < B; ++k) { an.Li[k] = -an.Li[k]; an.Ri[k] = -an.Ri[k]; an.Yi[k] = -an.Yi[k]; an.gd[k] = -an.gd[k]; } }
    const mag = an.mag;
    let onset = -1;
    if (Math.abs(rate - 1) < 0.02) for (const o of ons) if (Tc >= o - N / 2 && Tc <= o + N / 2) { onset = o; break; }
    const identity = Math.abs(r - 1) < 1e-6 && Math.abs(sb - 1) < 1e-6 && !spec.env && !spec.partial && !spec.free && !spec.lobeFloor && !spec.inertia && !spec.bodyX && !spec.envNoise && !spec.srcGainDb;
    // lecture intacte (cadence 1, rien de transformé) : c'est l'original, phase comprise
    if (identity && Math.abs(rate - 1) < 0.02 && onset < 0) onset = -2;
    stay.fill(0);
    peakRegions(mag, lab);
    const pk = []; for (let k = 1; k < B - 1; ++k) if (lab[k] === k) pk.push(k);
    sinusoidality(an, lab, pk, sc, N);
    if (onset >= 0 || onset === -2) {
      if (identity) stay.fill(1);
      else if (onset >= 0) {
        if (onset !== lastPreOnset) { const pa = pre.at(Math.max(0, onset - N)); for (let k = 0; k < B; ++k) preMag[k] = pa.mag[k]; lastPreOnset = onset; }
        for (let k = 0; k < B; ++k) stay[k] = (mag[k] > 2 * preMag[k] && sc[k] <= 0.8) ? 1 : 0;
      }
    }
    const F = identity ? 0 : P.f0At(Tc);
    if (!identity) {
      let mx = 0; for (let k = 0; k < B; ++k) if (mag[k] > mx) mx = mag[k];
      for (let j = 0; j < BE; ++j) {
        let m = 0; const a = Math.max(0, Math.round((j - 0.5) * qE)), b = Math.min(B - 1, Math.round((j + 0.5) * qE));
        for (let k = a; k <= b; ++k) if (mag[k] > m) m = mag[k];
        lmIn[j] = Math.log(m + 1e-9 * mx + 1e-30);
      }
      const p = Math.max(4, Math.min(NE / 2 - 2, Math.round(0.25 * sr / (F > 0 ? F : P.f0med))));
      // ordre cepstral : un quart de la période en échantillons (v5.3 ; il en valait le huitième de celui-ci : 0,5·sr/(2F)/4 —
      // une enveloppe si lisse que les formants s'y effaçaient, et tout ce qui déplace le corps ou relit une harmonique
      // ailleurs que chez elle perdait le timbre : mesuré sur une voyelle de synthèse transposée, 3,3 → 0,9 dB d'écart aux
      // formants ; sur six sons réels, relecture par rang 11,3 → 4,4 dB)
      trueEnvelope(lmIn, p, E, Ework);
    }
    // --- construction du spectre de sortie
    PM.fill(0); PL.fill(0); PR.fill(0); best.fill(-1); rb.fill(0); parts.length = 0;
    for (let k = 0; k < B; ++k) { wn[k] = k * bw; gdn[k] = 0; phn[k] = 0; dL[k] = 0; dR[k] = 0; }
    const aY = k => Math.atan2(an.Yi[k], an.Yr[k]);
    const put = (ks, kd, df, gl) => {
      if (kd < 1 || kd >= B - 1 || !(gl > 0)) return;
      const mL = Math.hypot(an.Lr[ks], an.Li[ks]) * gl, mR = Math.hypot(an.Rr[ks], an.Ri[ks]) * gl, mM = mag[ks] * gl;
      PM[kd] += mM * mM; PL[kd] += mL * mL; PR[kd] += mR * mR;
      if (mM > best[kd]) {
        best[kd] = mM; const a0 = aY(ks);
        wn[kd] = an.w[ks] + TAU * df / sr; gdn[kd] = an.gd[ks]; phn[kd] = a0;
        dL[kd] = Math.atan2(an.Li[ks], an.Lr[ks]) - a0; dR[kd] = Math.atan2(an.Ri[ks], an.Rr[ks]) - a0;
        rb[kd] = (ks === kd && df === 0 && (stay[ks] || pass)) ? 1 : 0;
      }
    };
    let envDb = spec.env ? (f => spec.env(f, tc)) : null;
    if (spec.bodyX && !identity) {
      // caricature du corps : contraste ×k autour de la pente générale (régression de l'enveloppe vraie sur log f),
      // puis glissement du corps de `shift` cents (hauteur inchangée) ; borné −30…+15 dB
      const bx = spec.bodyX(tc), k = bx.contrast ?? 1, shf = Math.pow(2, -(bx.shift ?? 0) / 1200);
      let sx = 0, sy = 0, sxx = 0, sxy = 0, nn = 0;
      for (let j = 1; j < BE; ++j) { const f = j * sr / NE; if (f < 100 || f > 10000) continue; const x = Math.log2(f); sx += x; sy += E[j]; sxx += x * x; sxy += x * E[j]; nn++; }
      const sl = nn > 2 ? (nn * sxy - sx * sy) / (nn * sxx - sx * sx) : 0, ic = nn ? (sy - sl * sx) / nn : 0;
      const f0db = envDb;
      envDb = f => { const e = Eat(f), tl = ic + sl * Math.log2(Math.max(20, f)); let d = ((k - 1) * (e - tl) + (Eat(f * shf) - e)) * 20 / Math.LN10; d = Math.max(-30, Math.min(15, d)); return d + (f0db ? f0db(f) : 0); };
    }
    const envN = spec.envNoise ? (f => Math.pow(10, spec.envNoise(f, tc) / 20)) : null;
    const lf = spec.lobeFloor ? spec.lobeFloor(tc) : null;
    const gLobe = lf ? Math.pow(10, lf[0] / 20) : 1, gFloor = lf ? Math.pow(10, (lf[1] || 0) / 20) : 1, trf = lf ? (lf[2] || 0) : 0;   // [dB partiel, dB souffle, transfert]
    if (identity) {
      for (let k = 1; k < B - 1; ++k) put(k, k, 0, 1);
    } else {
      for (let k = 1; k < B - 1; ++k) if (stay[k]) put(k, k, 0, envDb ? Math.pow(10, envDb(fb(k)) / 20) : 1);
      const hb = F > 0 ? harmonicBounds(mag, F, sr, N) : null;
      let voicedOk = false;
      if (hb) { let eh = 0, et = 0; for (let h = 0; h < hb.hp.length; ++h) if (hb.strong[h]) eh += mag[hb.hp[h]] ** 2; for (let k = 0; k < B; ++k) et += mag[k] * mag[k]; voicedOk = 3 * eh > (wasVoiced ? 0.7 : 1) * VFR * et; }
      if (!voicedOk) wasVoiced = false;
      if (globalThis.__VC) globalThis.__VC[voicedOk ? 1 : 0]++;                // banc
      if (voicedOk) {
        const { hp, bd, strong } = hb, H = hp.length;
        const fpk = new Float64Array(H); for (let h = 0; h < H; ++h) fpk[h] = strong[h] ? an.w[hp[h]] * sr / TAU : (h + 1) * F;
        const Hn = Math.floor(0.45 * sr / (Math.min(r, 1) * F));
        // puissance des régions sources (hors impulsions)
        const rp = new Float64Array(H); let Pi = 0;
        for (let h = 0; h < H; ++h) { let e = 0; for (let k = bd[h]; k < bd[h + 1]; ++k) if (!stay[k]) e += mag[k] * mag[k]; rp[h] = e; Pi += e; }
        // plancher (bruit) de chaque région source : 30e centile hors du lobe (±3 cases autour du pic) ; région trop étroite :
        // son creux le plus bas
        const floorH = new Float64Array(H);
        if (HNM) for (let h = 0; h < H; ++h) {
          const a = bd[h], b = bd[h + 1], pk0 = hp[h]; flo.length = 0; let mn = Infinity;
          for (let k = a; k < b; ++k) { const e = mag[k] * mag[k]; if (e < mn) mn = e; if (Math.abs(k - pk0) > 3) flo.push(e); }
          if (flo.length >= 3) { flo.sort((x, y) => x - y); floorH[h] = flo[Math.floor(0.3 * flo.length)]; } else floorH[h] = Number.isFinite(mn) ? mn : 0;
        }
        // (V6.5) planchers lissés dans le temps, rang par rang ; gain de Wiener de chaque case (a priori dirigé par la décision)
        if (HNM) {
          G2.fill(0);
          const keep = wasVoiced && flF > 0 && Math.abs(F / flF - 1) < 0.03, contig = Math.abs(Tc - ddT - a_s * rate) < 0.5 * a_s;
          for (let h = 0; h < Math.min(H, 512); ++h) { flS[h] = keep ? flS[h] + kFl * (floorH[h] - flS[h]) : floorH[h]; floorH[h] = flS[h]; }
          for (let h = 0; h < H; ++h) { const ef = floorH[h]; for (let k = bd[h]; k < bd[h + 1]; ++k) {
            const m2 = mag[k] * mag[k]; if (!(ef > 0)) { G2[k] = m2 > 0 ? 1 : 0; continue; }
            const post = Math.max(0, m2 / ef - 1), xi = keep && contig ? DD * ddP[k] / ef + (1 - DD) * post : post, g2 = xi / (1 + xi);
            G2[k] = g2; ddP[k] = g2 * g2 * m2; } }
          flF = F; ddT = Tc;
        }
        wasVoiced = true;
        // plan : harmonique de sortie → (région source, fréquence, gain)
        const pHs = [], pFq = [], pG = [], pX = []; let Pc = 0;
        for (let hq = 1; hq <= Hn; ++hq) {
          // chaque partiel garde SA fréquence : son écart propre à la série (inharmonicité, micro-vibrato de ce partiel) est
          // transposé avec lui (avant : tout partiel était redressé sur k × f0 — inharmonicité mesurée 18 → 8 c sur une
          // clarinette rendue sans aucune transformation, le timbre « lissé »)
          const h0 = byIndex ? hq : Math.max(1, Math.round(hq * r / sb)), dev = h0 <= H && strong[h0 - 1] ? fpk[h0 - 1] / (h0 * F) : 1;
          let fq = hq * r * F * dev, xdb = 0;
          if (fq >= 0.45 * sr && !spec.partial) break;
          if (spec.partial) { const o = spec.partial(hq, fq, tc, F); if (!o) continue; fq = o[0]; xdb = o[1] || 0; }
          if (!(fq > 20 && fq < 0.45 * sr)) continue;
          const hs = byIndex ? hq : Math.max(1, Math.min(H, Math.round(fq / (sb * F))));
          if (hs > H) continue;
          const gte = Math.pow(10, dbE(fq / sb, fpk[hs - 1]) / 20);
          pHs.push(hs); pFq.push(fq); pG.push(gte); pX.push(xdb); Pc += rp[hs - 1] * gte * gte;
        }
        // la note garde son énergie (le nombre d'harmoniques change avec la hauteur, pas la force du jeu)
        const gnT = Pc > 0 ? Math.max(0.35, Math.min(2.8, Math.sqrt(Pi / Pc))) : 1;
        gnS = gnS < 0 ? gnT : gnS + NORMK * (gnT - gnS);
        const gn = gnS;
        // largeur utile de chaque région : pas plus que la moitié de l'écart à ses voisines DE SORTIE (des partiels resserrés
        // — miroir, octave grave — ne s'empilent pas : chacun garde son lobe et la part de plancher qui lui revient)
        const ord = pFq.map((f, i) => i).sort((a, b) => pFq[a] - pFq[b]), hw = new Int32Array(pFq.length);
        for (let q = 0; q < ord.length; ++q) {
          const f = pFq[ord[q]], dPrev = q > 0 ? f - pFq[ord[q - 1]] : 1e9, dNext = q + 1 < ord.length ? pFq[ord[q + 1]] - f : 1e9;
          hw[ord[q]] = Math.max(2, Math.floor(0.5 * Math.min(dPrev, dNext) * N / sr));
        }
        for (let i = 0; i < pHs.length; ++i) {
          const hs = pHs[i], fq = pFq[i], df = fq - fpk[hs - 1], dk = Math.round(df * N / sr);
          let gdb = pX[i]; if (envDb) gdb += envDb(fq);
          const gl = pG[i] * gn * Math.pow(10, gdb / 20);
          const pkb = hp[hs - 1], lo = Math.max(bd[hs - 1], pkb - hw[i]), hi = Math.min(bd[hs], pkb + hw[i] + 1);
          parts.push({ kc: pkb + dk, f: fq, lo: lo + dk, hi: hi + dk });
          if (!lf) {
            if (!HNM) { for (let k = lo; k < hi; ++k) if (!stay[k]) put(k, k + dk, df, gl); continue; }
            // HARMONIQUE + BRUIT : la région ne transporte que ce qui dépasse le plancher de SA région source (le souffle, le
            // bruit d'archet restent au corps, remis en place plus bas) — sans cela chaque partiel déplacé emportait son bout de
            // plancher et laissait des trous entre les harmoniques (mesuré : HNR +2 à +25 dB au-dessus de l'original, un son
            // « détimbré », trop pur)
            for (let k = lo; k < hi; ++k) { if (stay[k]) continue; const fk = Math.sqrt(G2[k]); if (fk > 0) put(k, k + dk, df, gl * fk); }
            continue;
          }
          // partage partiel / souffle : la RÉGION entière (partiel et ses lobes secondaires) suit le gain du partiel —
          // aucun lobe secondaire mis à nu ; le souffle (plancher estimé : 30e centile hors ±4 cases) est SYNTHÉTISÉ
          // (enveloppe lissée, phases décorrélées) avec l'énergie cédée par le partiel (transfert) et son propre gain
          let Er = 0, ErL = 0, ErR = 0; flo.length = 0;
          for (let k = lo; k < hi; ++k) { if (stay[k]) continue; const e = mag[k] * mag[k]; Er += e; ErL += an.Lr[k] ** 2 + an.Li[k] ** 2; ErR += an.Rr[k] ** 2 + an.Ri[k] ** 2; if (Math.abs(k - pkb) > 4) flo.push(e); }
          flo.sort((a, b) => a - b);
          const Efl = flo.length ? Math.min(Er, flo[Math.floor(0.3 * flo.length)] * (hi - lo)) : 0, Ep = Math.max(0, Er - Efl);
          for (let k = lo; k < hi; ++k) if (!stay[k]) put(k, k + dk, df, gl * gLobe);
          const Eadd = gl * gl * (Math.max(0, gFloor * gFloor - 1) * Efl + trf * Math.max(0, 1 - gLobe * gLobe) * Ep);
          if (Eadd > 0 && Er > 0) {
            const w8 = 1 / Math.max(1, hi - lo), fL = ErL / (ErL + ErR + 1e-30), fR = 1 - fL;
            for (let k = lo; k < hi; ++k) { const kd = k + dk; if (kd < 1 || kd >= B - 1) continue; const en = envN ? envN(fb(kd)) ** 2 : 1; nzTL[kd] += 2 * Eadd * w8 * fL * en; nzTR[kd] += 2 * Eadd * w8 * fR * en; }
          }
        }
        // le plancher remis EN PLACE (au corps : lu en f/sb quand le corps change de taille), phases décorrélées : chaque case
        // rend la part de son énergie qui est sous le plancher de sa région (le creux entier, la base d'un lobe)
        if (HNM && !lf) {
          for (let h = 0; h < H; ++h) for (let k = bd[h]; k < bd[h + 1]; ++k) regIdx[k] = h;
          for (let kd = 1; kd < B - 1; ++kd) {
            const ks = Math.abs(sb - 1) < 1e-6 ? kd : Math.round(kd / sb); if (ks < 1 || ks >= B - 1 || stay[ks]) continue;
            const m2 = mag[ks] * mag[ks], ef = floorH[regIdx[ks]]; if (!(ef > 0) || !(m2 > 0)) continue;
            const phi = Math.max(0, Math.min(1, 1 - G2[ks]));
            let g2 = 1; if (envDb) g2 *= Math.pow(10, envDb(fb(kd)) / 10); if (envN) g2 *= envN(fb(kd)) ** 2;
            // lecture à cadence 1, corps gardé : le VRAI souffle, case à sa place avec sa phase ; sinon (étiré, corps changé) il est
            // resynthétisé, phases décorrélées (un souffle étiré par recalcul de phase sonnerait métallique)
            if (pass && ks === kd) { put(ks, kd, 0, Math.sqrt(phi * g2)); continue; }
            nzTL[kd] += phi * g2 * (an.Lr[ks] ** 2 + an.Li[ks] ** 2); nzTR[kd] += phi * g2 * (an.Rr[ks] ** 2 + an.Ri[ks] ** 2);
          }
        }
      } else {
        // pas de série harmonique : partiels libres déplacés un à un (Laroche), bruit en place (corps gardé) ou étiré (corps suivi)
        const bodyKept = Math.abs(sb - 1) < 1e-6;
        const seenP = new Set();
        for (let k = 1; k < B - 1; ++k) {
          if (stay[k]) continue;
          const p = lab[k];
          if (p >= 0 && sc[k] > 0.5) {
            const fp = an.w[p] * sr / TAU;
            let fq = r * fp, xdb = 0;
            if (spec.free) { const o = spec.free(fp, tc); if (!o) continue; fq = o[0]; xdb = o[1] || 0; }
            if (!(fq > 20 && fq < 0.45 * sr)) continue;
            const df = fq - fp, dk = Math.round(df * N / sr);
            let gdb = dbE(fq / sb, fp) + xdb; if (envDb) gdb += envDb(fq);
            put(k, k + dk, df, Math.pow(10, gdb / 20) * gLobe);
            if (!seenP.has(p)) { seenP.add(p); let a = p, b = p; while (a > 1 && lab[a - 1] === p) a--; while (b < B - 2 && lab[b + 1] === p) b++; parts.push({ kc: p + dk, f: fq, lo: a + dk, hi: b + 1 + dk }); }
          } else if (bodyKept) put(k, k, 0, (envDb ? Math.pow(10, envDb(fb(k)) / 20) : 1) * gFloor * (envN ? envN(fb(k)) : 1));
        }
        if (!bodyKept) {
          for (let j = 1; j < B - 1; ++j) {
            const ks = Math.round(j / sb); if (ks < 1 || ks >= B - 1 || stay[ks]) continue;
            const p = lab[ks]; if (p >= 0 && sc[ks] > 0.5) continue;
            put(ks, j, (j - ks) * sr / N, (envDb ? Math.pow(10, envDb(fb(j)) / 20) : 1) * gFloor * (envN ? envN(fb(j)) : 1));
          }
        }
      }
    }
    // le JOUEUR (articulation) agit avant le corps : son gain précède l'inertie, qui fait sonner ce qu'il coupe
    if (spec.srcGainDb) { const gs = Math.pow(10, spec.srcGainDb(tc) / 10); if (gs !== 1) for (let k = 0; k < B; ++k) { PM[k] *= gs; PL[k] *= gs; PR[k] *= gs; } nzTL.forEach((v, k) => { nzTL[k] = v * gs; nzTR[k] *= gs; }); }
    // garde-fou : aucune case de sortie à plus de +18 dB de la plus forte case d'entrée (empilement de régions)
    { let mi = 0; for (let k = 0; k < B; ++k) if (mag[k] > mi) mi = mag[k]; const lim = 64 * mi * mi;
      for (let k = 0; k < B; ++k) if (PM[k] > lim) { const q = lim / PM[k]; PM[k] = lim; PL[k] *= q; PR[k] *= q; } }
    // --- inertie du corps, PARTIEL par partiel : attaque lente, et quand un partiel faiblit plus vite que le corps ne
    //     se tait, son image (profil de sa région, sa fréquence) continue de sonner en s'éteignant — jamais case par case
    if (spec.inertia) {
      const it = spec.inertia(tc), ca = it.att > 0 ? 1 - Math.exp(-a_s / (it.att * sr)) : 1, cr2 = it.rel > 0 ? Math.exp(-2 * a_s / (it.rel * sr)) : 0;
      const used = new Uint8Array(fro.length + parts.length + 1);
      gD.fill(1e9); gB.fill(1);
      // partiels résolus : l'image d'un partiel ne doit porter que LUI — fenêtre bornée à la moitié de l'écart à son plus
      // proche voisin ; dans une grappe plus serrée que 2,5 cases, seul le plus fort peut résonner (sinon N images
      // se recouvrent et s'additionnent : mesuré ×25 en énergie sur un miroir)
      const byK = parts.map((q, i) => i).sort((x, y) => parts[x].kc - parts[y].kc), nb = new Float64Array(parts.length).fill(1e9);
      for (let q = 0; q < byK.length; ++q) { const k = parts[byK[q]].kc; if (q > 0) nb[byK[q]] = Math.min(nb[byK[q]], k - parts[byK[q - 1]].kc); if (q + 1 < byK.length) nb[byK[q]] = Math.min(nb[byK[q]], parts[byK[q + 1]].kc - k); }
      // images existantes rangées par hauteur (cents) : chaque partiel cherche la plus proche par dichotomie — le balayage de
      // toutes les images pour chaque partiel coûtait partiels × images (× un log2) par trame : 46 s de rendu pour 19 s d'un
      // géant sur une matière bruitée (des centaines de pics par trame), naissance vue « au point mort »
      const nF = fro.length, fcS = new Float64Array(nF), ordF = Array.from({ length: nF }, (_, i) => i);
      { const fc = new Float64Array(nF); for (let i = 0; i < nF; ++i) fc[i] = 1200 * Math.log2(fro[i].f); ordF.sort((x, y) => fc[x] - fc[y]); for (let s = 0; s < nF; ++s) fcS[s] = fc[ordF[s]]; }
      for (let pi = 0; pi < parts.length; ++pi) {
        const q = parts[pi];
        const W = Math.max(1, Math.min(6, Math.floor((q.hi - q.lo) / 2), Math.floor(nb[pi] / 2))), a = Math.max(1, q.kc - W), b = Math.min(B - 2, q.kc + W);
        let El = 0; for (let k = a; k <= b; ++k) El += PM[k];
        // même partiel = même hauteur à 12 c près (le partiel d'une autre note ne s'empare pas de la résonance de l'ancienne)
        let j = -1, bd0 = 12;
        { const qc = 1200 * Math.log2(q.f); let lo = 0, hi = nF; while (lo < hi) { const m = (lo + hi) >> 1; if (fcS[m] < qc) lo = m + 1; else hi = m; }
          for (let s = lo; s < nF && fcS[s] - qc < bd0; ++s) { const i = ordF[s]; if (used[i]) continue; bd0 = fcS[s] - qc; j = i; break; }
          for (let s = lo - 1; s >= 0 && qc - fcS[s] < bd0; --s) { const i = ordF[s]; if (used[i]) continue; bd0 = qc - fcS[s]; j = i; break; } }
        if (j < 0) { fro.push({ f: q.f, kc: q.kc, W, Eo: 0, Es: 0, cL: null, st: 0 }); j = fro.length - 1; }
        const x = fro[j]; used[j] = 1;
        // stabilité : un partiel qui glisse n'a pas de résonance propre (un corps ne résonne qu'à ses modes) — seule l'image
        // d'un partiel resté à la même hauteur (< 5 c par trame, 3 trames) peut continuer de sonner
        x.st = Math.abs(1200 * Math.log2(q.f / x.f)) < 5 && nb[pi] >= 2.5 ? x.st + 1 : 0;
        const Eo = El > x.Eo ? x.Eo + (El - x.Eo) * ca : Math.max(El, x.Eo * cr2);
        x.Eo = Eo;
        if (El >= 0.01 * Eo || !x.cL) {
          // le partiel vit : sa région garde fréquence et phase, son niveau suit l'inertie (gain lissé ~15 ms, ≤ +12 dB)
          const g2t = El > 0 ? Math.min(16, Eo / El) : 0;
          x.g2 = x.g2 === undefined ? g2t : x.g2 + 0.3 * (g2t - x.g2);
          // un seul gain par case : celui du partiel le plus proche (des fenêtres voisines ne se multiplient pas)
          for (let k = a; k <= b; ++k) { const d = Math.abs(k - q.kc); if (d < gD[k]) { gD[k] = d; gB[k] = x.g2; } }
          x.f = q.f; x.kc = q.kc; x.W = W; x.snap = true; x.ring = false;
        } else x.ring = x.st >= 3;     // éteint sous sa résonance : son image continue, synthétisée à part
      }
      for (let k = 0; k < B; ++k) if (gD[k] < 1e9) { PM[k] *= gB[k]; PL[k] *= gB[k]; PR[k] *= gB[k]; }
      let Emax = 0; for (const x of fro) Emax = Math.max(Emax, x.Eo);
      let w8 = 0;
      for (let i = 0; i < fro.length; ++i) {
        const x = fro[i];
        if (!used[i]) { x.Eo *= cr2; x.ring = x.st >= 3; x.snap = false; if (!x.ring) continue; }
        if (x.Eo < 1e-9 * Emax || x.Eo < 1e-24 || (!x.cL && !x.snap)) continue;
        fro[w8++] = x;
      }
      fro.length = w8;
      // au plus 64 images qui sonnent seules (les plus fortes)
      const rings = fro.filter(x => x.ring);
      if (rings.length > 64) { rings.sort((a, b) => b.Eo - a.Eo); const drop = new Set(rings.slice(64)); let w9 = 0; for (const x of fro) if (!drop.has(x)) fro[w9++] = x; fro.length = w9; }
    }
    // --- intégration de phase (tas RTPGHI)
    const gl0 = Math.pow(10, gF(tc) / 20);
    const pn = spec.pan ? spec.pan(tc) : null, gLc = gl0 * (pn ? pn[0] : 1), gRc = gl0 * (pn ? pn[1] : 1);
    let mx = 0;
    for (let k = 0; k < B; ++k) { const m = Math.sqrt(PM[k]); logm[k] = Math.log(m + 1e-12); if (m > mx) mx = m; }
    const thr = Math.log(mx + 1e-12) - Math.log(1e5);
    if (!havePrev) { for (let k = 0; k < B; ++k) ph[k] = phn[k]; }
    else {
      heap.clear(); let left = 0;
      for (let k = 0; k < B; ++k) {
        if (rb[k]) { done[k] = 1; ph[k] = phn[k]; if (logm[k] >= thr) heap.push(logm[k], 2 * k + 1); }
        else if (logm[k] >= thr) { done[k] = 0; left++; heap.push(logmP[k], 2 * k); }
        else { done[k] = 1; ph[k] = phn[k]; }
      }
      while (left > 0 && heap.n > 0) {
        const q = heap.pop(), k = q >> 1;
        if ((q & 1) === 0) {
          if (!done[k]) { ph[k] = phP[k] + a_s * 0.5 * (wP[k] + wn[k]); done[k] = 1; left--; heap.push(logm[k], 2 * k + 1); }
        } else {
          if (k + 1 < B && !done[k + 1]) { ph[k + 1] = ph[k] + bw * 0.5 * (gdn[k] + gdn[k + 1]); done[k + 1] = 1; left--; heap.push(logm[k + 1], 2 * (k + 1) + 1); }
          if (k - 1 >= 0 && !done[k - 1]) { ph[k - 1] = ph[k] - bw * 0.5 * (gdn[k] + gdn[k - 1]); done[k - 1] = 1; left--; heap.push(logm[k - 1], 2 * (k - 1) + 1); }
        }
      }
    }
    for (let k = 0; k < B; ++k) { logmP[k] = logm[k]; wP[k] = wn[k]; phP[k] = ph[k]; }
    havePrev = true;
    // images des partiels (inertie) : instantané du partiel vivant (valeurs complexes de sa fenêtre relatives à la phase
    // de son pic), puis, quand il s'éteint sous sa résonance, synthèse à part : même profil, phase avancée à sa fréquence
    imLr.fill(0); imLi.fill(0); imRr.fill(0); imRi.fill(0);
    let anyIm = false;
    if (spec.inertia) for (const x of fro) {
      if (x.snap) {
        const n2 = 2 * x.W + 1; if (!x.cL || x.cL.length !== 2 * n2) { x.cL = new Float64Array(2 * n2); x.cR = new Float64Array(2 * n2); }
        const p0 = ph[Math.max(1, Math.min(B - 2, x.kc))];
        for (let o = -x.W; o <= x.W; ++o) {
          const k = x.kc + o, i2 = 2 * (o + x.W);
          if (k < 1 || k >= B - 1) { x.cL[i2] = x.cL[i2 + 1] = x.cR[i2] = x.cR[i2 + 1] = 0; continue; }
          const aL = ph[k] + dL[k] - p0, aR = ph[k] + dR[k] - p0, mL = Math.sqrt(PL[k]), mR = Math.sqrt(PR[k]);
          x.cL[i2] = mL * Math.cos(aL); x.cL[i2 + 1] = mL * Math.sin(aL); x.cR[i2] = mR * Math.cos(aR); x.cR[i2 + 1] = mR * Math.sin(aR);
        }
        x.phase = p0; x.Es = x.Eo; x.snap = false;
      } else if (x.ring && x.cL) {
        x.phase += TAU * x.f / sr * a_s;
        const s1 = Math.sqrt(x.Eo / (x.Es || 1e-30)), c = Math.cos(x.phase), sn = Math.sin(x.phase);
        for (let o = -x.W; o <= x.W; ++o) {
          const k = x.kc + o, i2 = 2 * (o + x.W); if (k < 1 || k >= B - 1) continue;
          imLr[k] += s1 * (x.cL[i2] * c - x.cL[i2 + 1] * sn); imLi[k] += s1 * (x.cL[i2] * sn + x.cL[i2 + 1] * c);
          imRr[k] += s1 * (x.cR[i2] * c - x.cR[i2 + 1] * sn); imRi[k] += s1 * (x.cR[i2] * sn + x.cR[i2 + 1] * c);
        }
        anyIm = true;
      }
    }
    if (anyIm) { let mi = 0; for (let k = 0; k < B; ++k) if (mag[k] > mi) mi = mag[k]; const lim = 16 * mi * mi;
      for (let k = 0; k < B; ++k) { const e = imLr[k] ** 2 + imLi[k] ** 2 + imRr[k] ** 2 + imRi[k] ** 2; if (e > lim) { const q = Math.sqrt(lim / e); imLr[k] *= q; imLi[k] *= q; imRr[k] *= q; imRi[k] *= q; } } }
    // souffle synthétisé : énergie lissée (15 ms) par case, phases décorrélées d'une trame à l'autre et entre voies
    // (suite R2 à nombre plastique : déterministe, aucun tirage)
    const aN = 1 - Math.exp(-a_s / (0.015 * sr));
    let anyN = false;
    for (let k = 0; k < B; ++k) { nzL[k] += aN * (nzTL[k] - nzL[k]); nzR[k] += aN * (nzTR[k] - nzR[k]); nzTL[k] = 0; nzTR[k] = 0; if (nzL[k] > 1e-30 || nzR[k] > 1e-30) anyN = true; }
    // (V6.5) cohérence gauche/droite du son lu, case par case (spectre croisé lissé 100 ms)
    if (anyN) for (let k = 1; k < B - 1; ++k) {
      const lr = an.Lr[k], li = an.Li[k], rr = an.Rr[k], ri = an.Ri[k];
      cXr[k] += kC * (lr * rr + li * ri - cXr[k]); cXi[k] += kC * (li * rr - lr * ri - cXi[k]); cPL[k] += kC * (lr * lr + li * li - cPL[k]); cPR[k] += kC * (rr * rr + ri * ri - cPR[k]);
    }
    // --- synthèse : z = l + i·r, spectre Z = XL + i·XR
    for (let k = 0; k < B; ++k) {
      const aL = ph[k] + dL[k], aR = ph[k] + dR[k], mL = Math.sqrt(PL[k]) * gLc, mR = Math.sqrt(PR[k]) * gRc;
      let xlr = mL * Math.cos(aL), xli = mL * Math.sin(aL), xrr = mR * Math.cos(aR), xri = mR * Math.sin(aR);
      if (anyIm) { xlr += gLc * imLr[k]; xli += gLc * imLi[k]; xrr += gRc * imRr[k]; xri += gRc * imRi[k]; }
      if (anyN && (nzL[k] > 0 || nzR[k] > 0) && k > 0 && k < B - 1) {
        // suite quadratique (Weyl) : incréments de phase différents d'une case à l'autre ET d'une trame à l'autre (une suite
        // linéaire tournerait toutes les cases du même angle : trames corrélées → modulation à la cadence de trame, mesurée +37 dB)
        const u = (0.7548776662466927 * k * k + 0.5698402909980532 * fi * fi + 0.4142135623730951 * k * fi) % 1;
        const v = (0.5698402909980532 * k * k + 0.7548776662466927 * fi * fi + 0.7320508075688772 * k * fi + 0.5) % 1;
        const nL = Math.sqrt(nzL[k]) * gLc, nR = Math.sqrt(nzR[k]) * gRc;
        // droite = cohérence mesurée × (phase gauche − écart de phase mesuré) + √(1 − C²) × phase indépendante
        const cm = Math.hypot(cXr[k], cXi[k]), C = cPL[k] > 0 && cPR[k] > 0 ? Math.min(1, cm / Math.sqrt(cPL[k] * cPR[k])) : 0;
        const aLn = TAU * u, dph = cm > 0 ? Math.atan2(cXi[k], cXr[k]) : 0, sC = Math.sqrt(Math.max(0, 1 - C * C));
        xlr += nL * Math.cos(aLn); xli += nL * Math.sin(aLn);
        xrr += nR * (C * Math.cos(aLn - dph) + sC * Math.cos(TAU * v)); xri += nR * (C * Math.sin(aLn - dph) + sC * Math.sin(TAU * v));
      }
      zr[k] = xlr - xri; zi[k] = xli + xrr;
      if (k > 0 && k < B - 1) { zr[N - k] = xlr + xri; zi[N - k] = -xli + xrr; }
    }
    fft(zr, zi, true);
    for (let k = 0; k < N; ++k) {
      const j = (k + N / 2) % N, pos = c0 + k;
      if (pos < 0 || pos >= outL.length) continue;
      outL[pos] += zr[j] * g[k] * norm; outR[pos] += zi[j] * g[k] * norm;
    }
  }
  return { L: outL.subarray(N, N + D), R: outR.subarray(N, N + D) };
}

// pics harmoniques et frontières (creux) pour f0 = F
function harmonicBounds (m, F, sr, N) {
  const B = m.length, H = Math.floor(0.45 * sr / F);
  if (H < 1) return null;
  const hp = new Int32Array(H), strong = new Uint8Array(H), bd = new Int32Array(H + 1);
  for (let h = 1; h <= H; ++h) {
    const a = Math.max(1, Math.floor((h - 0.35) * F * N / sr)), b = Math.min(B - 2, Math.ceil((h + 0.35) * F * N / sr));
    let bi = -1, bv = -1;
    for (let k = a; k <= b; ++k) if (m[k] > m[k - 1] && m[k] >= m[k + 1] && m[k] > bv) { bv = m[k]; bi = k; }
    if (bi >= 0) { hp[h - 1] = bi; strong[h - 1] = 1; } else hp[h - 1] = Math.min(B - 2, Math.max(1, Math.round(h * F * N / sr)));
  }
  bd[0] = 0; bd[H] = B;
  for (let h = 1; h < H; ++h) {
    const a = hp[h - 1], b = hp[h];
    if (b > a + 1) { let mi = a + 1, mv = m[a + 1]; for (let k = a + 1; k < b; ++k) if (m[k] < mv) { mv = m[k]; mi = k; } bd[h] = mi; } else bd[h] = b;
  }
  return { hp, bd, strong };
}

// ------------------------------------------------------------------------------------------ cartes de temps
/** étirement uniforme α dont les zones d'attaque (±N/2) restent à cadence 1 ; renvoie T(t) */
export function stretchMap (P, alpha) {
  const n = P.n, N = P.N, zones = [];
  for (const o of P.onsets) {
    const a = Math.max(0, o - N / 2), b = Math.min(n, o + N / 2);
    if (zones.length && a <= zones[zones.length - 1][1]) zones[zones.length - 1][1] = b; else zones.push([a, b]);
  }
  let Z = 0; for (const [a, b] of zones) Z += b - a;
  const D = Math.round(alpha * n);
  let pts;
  if (!zones.length || n - Z < 1 || (D - Z) / (n - Z) < 0.2 * Math.min(alpha, 1)) pts = [[0, 0], [n, D]];
  else {
    const s = (D - Z) / (n - Z); pts = [[0, 0]];
    for (const [a, b] of zones) { const last = pts[pts.length - 1]; pts.push([a, last[1] + (a - last[0]) * s]); pts.push([b, pts[pts.length - 1][1] + (b - a)]); }
    const last = pts[pts.length - 1]; pts.push([n, last[1] + (n - last[0]) * s]);
  }
  const T = t => { for (let i = 1; i < pts.length; ++i) if (t <= pts[i][1] || i === pts.length - 1) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return x0 + (x1 - x0) * (t - y0) / Math.max(1e-9, y1 - y0); } return n; };
  return { T, D: Math.round(pts[pts.length - 1][1]) };
}

