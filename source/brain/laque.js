// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// ============================================================================================
//  CHARIVARI V6.3 — LA LAQUE (Moonvox posé par touches sur les partiels, en phase)
//  Mat : « chaque phase des partiels doit être en phase avec chaque oscillateur de Moonvox — pas des sinus posés sur une
//  carte de partiels : comprendre comment fonctionne la phase de chaque partiel dans le sample parent, définir le timbre de
//  Moonvox qui colle le mieux au timbre du parent, puis appliquer par touches le son de Moonvox sur les partiels ; elle doit
//  donner l'illusion que le sample est devenu beaucoup plus irisé. »
//  Ce module (cerveau) : (1) l'ÉTUDE DES PHASES — chaque partiel démodulé exactement comme le fera le DSP (porteuses
//  cohérentes k·Θ₁, deux pôles), sa phase relative Δ_k = φ_k − k·φ₁ (la forme d'onde de la note), sa tenue R_k (1 : partiel
//  verrouillé sur la fondamentale, 0 : libre) ; (2) l'AJUSTEMENT DE MOONVOX — table de timbre, hautbois, cuivre, équilibre,
//  pente, au plus près du profil harmonique du sujet ; (3) le bloc LACQ que le DSP lit après l'anatomie de chaque
//  emplacement ; (4) un PORTAGE JS du moteur temps réel du DSP (même algorithme, mêmes constantes) pour le mesurer hors
//  AMORPH.
//  Le moteur (DSP, part3 « LACQUER ») : chaque partiel k de la note (k = 1…24) est démodulé ; sa nouvelle enveloppe
//  e_k = b_k·[ρ_k·z_k/a_k + (1 − ρ_k)·ũ_k] — b_k = a_k·G_k l'amplitude visée (la couleur et le mouvement de Moonvox posés sur
//  la sienne, dosés par les touches T_k) ; z_k/a_k SA phase, ũ_k la phase que le sujet lui donne (k·ψ₁ + sa phase relative
//  suivie) là où il est trop faible pour en avoir une nette (ρ_k = a_k/(a_k + κ·E), κ = −40 dB) — et le son reçoit
//  Σ (e_k − z_k)·porteuse : un oscillateur de Moonvox ne s'ajoute jamais hors de la phase du partiel.
// ============================================================================================

import { splitHarmonic } from './td.js';
import { granWords } from './grains.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const PHI = 0.6180339887498949;
export const LK = 24;                       // partiels laqués
export const LACQ_MAGIC = 0x4C414351;      // 'LACQ'

// ------------------------------------------------------------------------------------------ tables de Moonvox (V2.6)
// 10 timbres : Classic (Netherworld, Mirror, Exuvia, Axis), Modern (Calx, Tendril A, Glassine, Caustic), Chimère, Drift Loom
export const MOON_NAMES = ['Netherworld', 'Mirror', 'Exuvia', 'Axis', 'Calx', 'Tendril', 'Glassine', 'Caustic', 'Chimera', 'Drift Loom'];
function moonTable (id) {
  const T = new Float64Array(48);
  for (let i = 0; i < 48; ++i) {
    const h = i + 1; let v;
    switch (id) {
      case 0: v = Math.exp(-0.35 * h); break;
      case 1: v = Math.exp(-0.12 * h); break;
      case 2: v = Math.exp(-0.28 * h); break;
      case 3: v = i === 0 ? 1 : i === 1 ? 0.75 : i === 2 ? 0.5 : Math.exp(-0.7 * h); break;
      case 4: { const odd = h % 2 === 1; v = [1, 0.4, 0.88, 0.25, 0.55, 0.18, 0.38, 0.12][i]; if (i >= 8 && i < 16) v = clamp(odd ? 0.28 - (i - 8) * 0.02 : 0.12 - (i - 8) * 0.008, 0.04, 0.28); else if (i >= 16 && i < 28) v = 0.10 - (i - 16) * 0.005; else if (i >= 28) v = 0.03 * Math.exp(-0.05 * (i - 28)); break; }
      case 5: v = i === 0 ? 1 : i < 4 ? 0.55 - (i - 1) * 0.05 : i < 9 ? 0.30 - (i - 4) * 0.04 : i < 18 ? 0.85 * Math.exp(-0.08 * (i - 13) ** 2) : 0.40 * Math.exp(-0.10 * (i - 17)); break;
      case 6: { const even = h % 2 === 0; if (i === 0) v = 1; else if (i < 8) v = clamp(even ? 0.92 / h * 3.5 : 0.20 / h * 2.0, 0.06, 0.92); else if (i < 16) v = clamp(even ? 0.35 - (i - 8) * 0.025 : 0.08, 0.04, 0.35); else if (i < 28) v = 0.22 * Math.exp(-0.10 * (i - 20) ** 2); else v = 0.05 * Math.exp(-0.06 * (i - 28)); break; }
      case 7: { v = [1, 0.55, 0.88, 0.40, 0.25, 0.65, 0.78, 0.30][i]; if (i >= 8 && i < 14) { v = 0.35 - (i - 8) * 0.03; if (h % 3 === 0) v += 0.12; v = clamp(v, 0.05, 0.45); } else if (i >= 14 && i < 22) v = 0.18 - (i - 14) * 0.012; else if (i >= 22 && i < 30) v = i === 24 ? 0.20 : 0.06; else if (i >= 30) v = 0.03 * Math.exp(-0.06 * (i - 30)); break; }
      case 8: v = Math.exp(-0.15 * h) * (1 + 0.5 * Math.sin(h * 0.3)); break;
      default: { v = [0.65, 0.50, 0.70, 0.90, 0.85, 0.60, 0.30, 0.55][i]; if (i >= 8 && i < 14) v = h % 3 === 1 ? 0.42 : 0.30; else if (i >= 14 && i < 22) v = 0.35 * Math.exp(-0.08 * (i - 17) ** 2); else if (i >= 22) v = i === 24 ? 0.25 : i === 30 ? 0.15 : i < 36 ? 0.06 : 0.02; }
    }
    T[i] = clamp(v, 0, 1);
  }
  return T;
}
const TABLES = Array.from({ length: 10 }, (_, id) => moonTable(id));
// rythme et profondeur du LFO d'amplitude par partiel, par timbre (Moonvox : Classic 0,055 Hz ×0,1, Exuvia 7 Hz ×0,085,
// Axis ×0,05 ; Modern 0,3 / 0,8 / 2,5 / 5,5 Hz × 0,18 / 0,08 / 0,06 / 0,12)
const AMP_LFO = [[0.055, 0.1], [0.055, 0.1], [7, 0.085], [0.055, 0.05], [0.3, 0.18], [0.8, 0.08], [2.5, 0.06], [5.5, 0.12], [0.055, 0.1], [0.3, 0.1]];

// ------------------------------------------------------------------------------------------ les deux formes d'onde
// harmoniques d'une sinusoïde unité passée par oboeShapeFull / brassShapeFull (Moonvox) : amplitude du rang j, j = 1…6
function shaperCoeffs (fn) {
  const N = 1024, out = new Float64Array(7);
  for (let j = 1; j <= 6; ++j) { let re = 0, im = 0; for (let n = 0; n < N; ++n) { const th = 2 * Math.PI * n / N, y = fn(Math.sin(th)); re += y * Math.cos(j * th); im += y * Math.sin(j * th); } out[j] = 2 * Math.hypot(re, im) / N; }
  return out;
}
const oboeShape = x => { let y = x + 0.8 * x * x + 0.7 * x ** 3 + 0.3 * x ** 4; y = y / (1 + 0.25 * Math.abs(y)); return 0.8 * y; };
const brassShape = x => { let y = x + 1.5 * x * x + 1.2 * x ** 3 + 0.8 * x ** 4 + 0.5 * x ** 5; y = y / (1 + 0.2 * Math.abs(y)); return 1.2 * y; };
export const C_OBOE = shaperCoeffs(oboeShape), C_BRASS = shaperCoeffs(brassShape);

/** profil harmonique de Moonvox (rangs 1…K) : chaque partiel i de la table, à travers le mélange pur / hautbois / cuivre
 *  (hautbois incliné par la pente selon le rang, cuivre pondéré par la parité et l'équilibre), répand ses harmoniques j·i ;
 *  les contributions d'un même rang s'ajoutent en puissance */
export function moonProfile (T, O, B, bal, tilt, K = LK, out = new Float64Array(K)) {
  out.fill(0);
  const maxP = 48;
  for (let i = 0; i < maxP; ++i) {
    const amp = T[i]; if (amp <= 0) continue;
    const norm = i / (maxP - 1), Oi = clamp(O * (1 + tilt * (norm - 0.5) * 2), 0, 1), Bi = clamp(B * (i % 2 === 0 ? 1 - bal : bal), 0, 1);
    for (let j = 1; j <= 6; ++j) {
      const m = (i + 1) * j; if (m > K) break;
      const c = (j === 1 ? (1 - Bi) * (1 - Oi) : 0) + (1 - Bi) * Oi * C_OBOE[j] + Bi * C_BRASS[j];
      out[m - 1] += (amp * c) ** 2;
    }
  }
  for (let m = 0; m < K; ++m) out[m] = Math.sqrt(out[m]);
  return out;
}

// ------------------------------------------------------------------------------------------ profil harmonique du sujet
// amplitude moyenne (puissance) de chaque rang sur les trames voisées, rapportée au maximum de la trame
export function subjectProfile (P, K = LK) {
  const acc = new Float64Array(K), cnt = new Float64Array(K); let nfv = 0;
  for (let j = 0; j < P.frames.length; ++j) {
    const F = P.voiced[j]; if (!(F > 0)) continue; nfv++;
    let mx = 0; for (const p of P.frames[j].peaks) mx = Math.max(mx, p.a); if (!(mx > 0)) continue;
    const got = new Float64Array(K);
    for (const p of P.frames[j].peaks) { const r = p.f / F, k = Math.round(r); if (k >= 1 && k <= K && Math.abs(1200 * Math.log2(r / k)) < 35) got[k - 1] = Math.max(got[k - 1], p.a / mx); }
    for (let k = 0; k < K; ++k) { acc[k] += got[k] * got[k]; if (got[k] > 0) cnt[k]++; }
  }
  return { amp: Float64Array.from(acc, (v, k) => Math.sqrt(v / Math.max(1, nfv))), presence: Float64Array.from(cnt, c => c / Math.max(1, nfv)), frames: nfv };
}

// ------------------------------------------------------------------------------------------ ajustement de Moonvox au sujet
// grille : 10 tables × hautbois {0, ¼, ½, ¾, 1} × cuivre {0, ¼, ½} × équilibre {0,2 ; 0,5 ; 0,8} × pente {−1…1 par ½} ; écart :
// moyenne des |dB| entre les deux profils (normalisés en énergie) sur les rangs présents (au-dessus de −50 dB et dans au
// moins 20 % des trames voisées), chaque rang borné à 30 dB
export function fitMoonvox (P) {
  if (P.__moon) return P.__moon;
  const S = subjectProfile(P), K = LK;
  const use = []; let e = 0; for (let k = 0; k < K; ++k) e += S.amp[k] ** 2; const nrm = Math.sqrt(e) || 1;
  const sdb = Float64Array.from(S.amp, v => 20 * Math.log10(Math.max(1e-6, v / nrm)));
  for (let k = 0; k < K; ++k) if (sdb[k] > -50 && S.presence[k] >= 0.2) use.push(k);
  let best = null; const M = new Float64Array(K);
  if (use.length >= 2) for (let id = 0; id < TABLES.length; ++id) for (const O of [0, 0.25, 0.5, 0.75, 1]) for (const B of [0, 0.25, 0.5]) for (const bal of (B > 0 ? [0.2, 0.5, 0.8] : [0.5])) for (const tilt of [-1, -0.5, 0, 0.5, 1]) {
    moonProfile(TABLES[id], O, B, bal, tilt, K, M);
    let em = 0; for (let k = 0; k < K; ++k) em += M[k] * M[k]; const nm = Math.sqrt(em) || 1;
    let err = 0; for (const k of use) err += Math.min(30, Math.abs(20 * Math.log10(Math.max(1e-6, M[k] / nm)) - sdb[k]));
    err /= use.length;
    if (!best || err < best.err - 1e-9) best = { id, O, B, bal, tilt, err };
  }
  if (!best) best = { id: 0, O: 0.25, B: 0, bal: 0.5, tilt: 0, err: NaN };
  best.name = MOON_NAMES[best.id]; best.T = TABLES[best.id]; best.lfo = AMP_LFO[best.id]; best.profile = sdb; best.used = use.length;
  // COULEUR : l'écart (dB) du profil de Moonvox ajusté à celui du sujet, rang par rang, borné à ±12 dB — ce que la laque
  // pose sur chaque partiel quand une touche le couvre entièrement
  { moonProfile(best.T, best.O, best.B, best.bal, best.tilt, K, M); let em = 0; for (let k = 0; k < K; ++k) em += M[k] * M[k]; const nm = Math.sqrt(em) || 1;
    best.Rdb = Float64Array.from({ length: K }, (_, k) => clamp(20 * Math.log10(Math.max(1e-6, M[k] / nm)) - sdb[k], -12, 12)); }
  return (P.__moon = best);
}

// ------------------------------------------------------------------------------------------ V6.4 : un timbre de Moonvox CRÉÉ
// Mat : « quand je parlais de Moonvox, je parlais de son potentiel à recréer un son complexe ; pour l'instant l'analyse
// aiguille sur un timbre de Moonvox, moi je voudrais que l'analyse crée un timbre comme quand j'en crée un avec Moonvox ».
// En v6.3 le cerveau CHOISISSAIT parmi les dix timbres de Moonvox (et quatre réglages) celui qui ressemblait le plus au
// sujet ; il CRÉE maintenant un timbre de Moonvox à partir du sujet, avec ce dont un timbre de Moonvox est fait (son code,
// SpectralResynth V2.2) :
//   • la TABLE d'amplitudes statiques des 48 oscillateurs, et les formes d'onde qui les déforment (hautbois, cuivre et son
//     équilibre pair / impair, pente) : choisies ENSEMBLE pour que le profil harmonique de Moonvox redonne EXACTEMENT celui
//     du sujet (rang par rang, du grave à l'aigu : ce que les déformations des partiels graves déposent sur un rang est
//     retranché avant de fixer l'oscillateur de ce rang), et, parmi toutes les façons d'y arriver, la plus SIMPLE — la table
//     la plus lisse (comme on dessine un timbre : peu d'oscillateurs, beaucoup de forme) ;
//   • les FORMANTS du timbre : ceux du sujet ;
//   • la VIE de chaque partiel (le LFO d'amplitude d'un timbre de Moonvox) : relevée partiel par partiel sur le sujet —
//     profondeur et rythme de ses fluctuations d'amplitude autour de l'enveloppe de la note (0,4 s) ;
//   • la CIRCULATION (calcinatio, coagulatio, sublimatio — le modulateur alchimique de Moonvox) : réglée sur la façon dont le
//     timbre du sujet bouge lui-même — l'écart de sa brillance (centre des rangs), de sa pente, de son équilibre pair /
//     impair d'une trame de 20 ms à l'autre — et son rythme sur celui de ces mouvements.
// Le DSP reçoit le profil de ce Moonvox au long d'un tour de sa circulation (32 instants × 24 partiels, en dB rapportés au
// sujet) et le pose, comme en v6.3, par touches sur les partiels du mummer, dans leur phase.
export const TAB_N = 32;
// écart type moyen (dB) du profil (24 rangs) sur un tour de circulation
function motionOf (d) {
  const tab = circulationTable(d); let mv = 0, n = 0;
  for (let k = 0; k < LK; ++k) { if (!(d.sdb[k] > -50)) continue; let a = 0, b = 0; for (let q = 0; q < TAB_N; ++q) { const v = tab[q * LK + k]; a += v; b += v * v; } const mu = a / TAB_N; mv += Math.sqrt(Math.max(0, b / TAB_N - mu * mu)); n++; }
  return n ? mv / n : 0;
}
// profil harmonique sur 48 rangs, et présence
function profile48 (P) { return subjectProfile(P, 48); }
// partiel par partiel (rangs 1–24) : fluctuation d'amplitude autour de l'enveloppe (dB efficace) et son rythme (Hz) ;
// trame par trame (20 ms) : brillance (centre des rangs), pente (dB/oct, rangs 1–12), équilibre impair / pair (dB)
export function measureTimbre (P) {
  if (P.__timbre) return P.__timbre;
  const S = splitHarmonic(P), G = S.G, sr = P.sr, amp = S.amp || [], nd = amp[0] ? amp[0].length : 0, Fo = S.Fo;
  const voiced = j => Fo[Math.min(Fo.length - 1, j)] > 40;
  const W = Math.max(8, Math.round(0.4 * sr / G)), dec = Math.max(1, Math.round(0.01 * sr / G));
  const mod = [];
  for (let k = 0; k < 24; ++k) {
    const a = amp[k]; if (!a) { mod.push({ depthDb: 0, rate: 0 }); continue; }
    let mx = 0; for (let j = 0; j < nd; ++j) if (voiced(j)) mx = Math.max(mx, a[j]);
    const db = new Float64Array(nd), ok = new Uint8Array(nd);
    for (let j = 0; j < nd; ++j) if (voiced(j) && a[j] > 1e-3 * mx) { db[j] = 20 * Math.log10(a[j]); ok[j] = 1; }
    // tendance (moyenne glissante de 0,4 s sur les blocs valides), écart à la tendance tous les 10 ms
    const cs = new Float64Array(nd + 1), cn = new Float64Array(nd + 1); for (let j = 0; j < nd; ++j) { cs[j + 1] = cs[j] + (ok[j] ? db[j] : 0); cn[j + 1] = cn[j] + ok[j]; }
    // écarts à la tendance tous les 10 ms (séries continues), profondeur efficace ; rythme : le pic d'autocorrélation entre
    // 0,5 et 12 Hz (au moins 0,3) — un passage par zéro compterait le bruit
    const seg = []; let cur = [];
    for (let j = 0; j < nd; j += dec) { if (!ok[j]) { if (cur.length) seg.push(cur); cur = []; continue; } const a0 = Math.max(0, j - W), b0 = Math.min(nd, j + W), m = (cs[b0] - cs[a0]) / Math.max(1, cn[b0] - cn[a0]); cur.push(db[j] - m); }
    if (cur.length) seg.push(cur);
    let ss = 0, cnt = 0; for (const g of seg) for (const d of g) { ss += d * d; cnt++; }
    let rate = 0; const fs = sr / (dec * G);
    if (cnt > 40) { let bestR = 0.3; for (let lag = Math.max(1, Math.round(fs / 12)); lag <= Math.round(fs / 0.5); ++lag) { let x = 0, y = 0; for (const g of seg) for (let i = 0; i + lag < g.length; ++i) { x += g[i] * g[i + lag]; y += g[i] * g[i]; } const r = y > 0 ? x / y : 0; if (r > bestR) { bestR = r; rate = fs / lag; } } }
    mod.push({ depthDb: cnt > 10 ? Math.sqrt(ss / cnt) : 0, rate, strong: mx });
  }
  const F = Math.max(1, Math.round(0.02 * sr / G)), feats = [];
  for (let j = 0; j + F <= nd; j += F) {
    if (!voiced(j)) continue;
    const e = new Float64Array(24); let tot = 0;
    for (let k = 0; k < 24; ++k) { const a = amp[k]; if (!a) continue; let q = 0; for (let i = j; i < j + F; ++i) q += a[i] * a[i]; e[k] = q / F; tot += e[k]; }
    if (!(tot > 0)) continue;
    let cen = 0; for (let k = 0; k < 24; ++k) cen += (k + 1) * e[k]; cen /= tot;
    let sx = 0, sy = 0, sxx = 0, sxy = 0, m = 0; for (let k = 0; k < 12; ++k) { if (!(e[k] > tot * 1e-6)) continue; const x = Math.log2(k + 1), y = 10 * Math.log10(e[k]); sx += x; sy += y; sxx += x * x; sxy += x * y; m++; }
    let od = 0, ev = 0; for (let k = 0; k < 24; ++k) (k % 2 === 0 ? (od += e[k]) : (ev += e[k]));
    feats.push({ t: j * G / sr, cen, tilt: m >= 4 ? (m * sxy - sx * sy) / (m * sxx - sx * sx) : 0, oe: 10 * Math.log10((od + 1e-20) / (ev + 1e-20)) });
  }
  const sd = key => { if (feats.length < 4) return 0; const v = feats.map(f => f[key]), mu = v.reduce((a, b) => a + b, 0) / v.length; return Math.sqrt(v.reduce((a, b) => a + (b - mu) ** 2, 0) / v.length); };
  // rythme des mouvements du timbre : passages par la moyenne de la brillance (lissée sur 3 trames)
  let rate = 0.2;
  if (feats.length >= 8) { const v = feats.map(f => f.cen), mu = v.reduce((a, b) => a + b, 0) / v.length, sm = v.map((_, i) => (v[Math.max(0, i - 1)] + v[i] + v[Math.min(v.length - 1, i + 1)]) / 3 - mu); let zc = 0; for (let i = 1; i < sm.length; ++i) if (Math.sign(sm[i]) !== Math.sign(sm[i - 1])) zc++; rate = clamp(zc / 2 / (feats.length * 0.02), 0.05, 2); }
  return (P.__timbre = { mod, sdCen: sd('cen'), sdTilt: sd('tilt'), sdOE: sd('oe'), rate, nFeat: feats.length });
}
// la TABLE qui, à travers hautbois / cuivre / équilibre / pente, redonne le profil p (amplitudes, 48 rangs) : rang par rang,
// du grave à l'aigu ; ce que les rangs graves déposent sur m est retranché (en puissance) ; ce qu'on ne peut pas retrancher
// (déjà trop fort) compte comme écart
function solveTable (p, O, B, bal, tilt) {
  const N = 48, T = new Float64Array(N), contrib = new Float64Array(N); let miss = 0;
  const cOf = (i, j) => { const norm = i / (N - 1), Oi = clamp(O * (1 + tilt * (norm - 0.5) * 2), 0, 1), Bi = clamp(B * (i % 2 === 0 ? 1 - bal : bal), 0, 1); return (j === 1 ? (1 - Bi) * (1 - Oi) : 0) + (1 - Bi) * Oi * C_OBOE[j] + Bi * C_BRASS[j]; };
  for (let m = 1; m <= N; ++m) {
    const want = p[m - 1] * p[m - 1], have = contrib[m - 1], c1 = cOf(m - 1, 1);
    let t = 0; if (want > have && c1 > 1e-6) t = Math.sqrt(want - have) / c1; else if (want > 0) miss += 10 * Math.log10((have + 1e-20) / (want + 1e-20));
    T[m - 1] = t;
    for (let j = 2; j <= 6; ++j) { const q = m * j; if (q > N) break; contrib[q - 1] += (t * cOf(m - 1, j)) ** 2; }
    contrib[m - 1] += (t * c1) ** 2;
  }
  return { T, miss };
}
export function designMoonvox (P) {
  if (P.__moonD) return P.__moonD;
  const S = profile48(P), K = 48;
  let e = 0; for (let k = 0; k < 24; ++k) e += S.amp[k] ** 2; const nrm = Math.sqrt(e) || 1;
  const sdb = Float64Array.from(S.amp.slice(0, 24), v => 20 * Math.log10(Math.max(1e-6, v / nrm)));
  const use = []; for (let k = 0; k < 24; ++k) if (sdb[k] > -50 && S.presence[k] >= 0.2) use.push(k);
  const p = Float64Array.from(S.amp, (v, k) => (S.presence[k] >= 0.1 ? v : 0));
  const sdb24 = sdb;
  let best = null;
  for (const O of [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1]) for (const B of [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75]) for (const bal of (B > 0 ? [0.1, 0.3, 0.5, 0.7, 0.9] : [0.5])) for (const tilt of [-1, -0.5, 0, 0.5, 1]) {
    const { T, miss } = solveTable(p, O, B, bal, tilt);
    // un timbre de Moonvox VIT par ses formes d'onde : la circulation module hautbois, cuivre, équilibre, pente ; le point de
    // réglage retenu est celui où ce mouvement change le plus le profil (écart type moyen, en dB, sur un tour à pleine
    // course), sans dépasser le sujet nulle part (miss, en dB) — la table redonne toujours le sujet au repos
    let tm = 0; for (const v of T) tm = Math.max(tm, v); if (!(tm > 0)) continue;
    const Tn = Float64Array.from(T, v => v / tm), mv = motionOf({ T: Tn, O, B, bal, tilt, calc: 1, coag: 1, subl: 1, sdb: sdb24 });
    const sc = -mv + 4 * miss;
    if (!best || sc < best.sc - 1e-9) best = { O, B, bal, tilt, T, sc, motion: mv, miss };
  }
  // (V6.4) un sujet sans partiels (aucune trame voisée : une grosse caisse de 0,15 s, Bass Lindrum 09 — Mat : « 0 mummers
  // ready », chaque naissance tombait ici sur un timbre introuvable) : rien à recréer rang par rang. La laque n'a rien à poser :
  // sa table de couleur reste à 0 dB sur tous les rangs (circulationTable : 0 là où le sujet n'a pas de rang) ; le mummer naît.
  const none = !best;
  if (none) best = { O: 0.25, B: 0, bal: 0.5, tilt: 0, T: Float64Array.from({ length: K }, (_, k) => (k === 0 ? 1 : 0)), sc: 0, motion: 0, miss: 0 };
  let tmx = 0; for (const v of best.T) tmx = Math.max(tmx, v); const T48 = Float64Array.from(best.T, v => (tmx > 0 ? v / tmx : 0));
  // écart réel du profil rendu au sujet (rangs présents)
  const M = moonProfile(T48, best.O, best.B, best.bal, best.tilt, 24); let em = 0; for (let k = 0; k < 24; ++k) em += M[k] * M[k]; const nm = Math.sqrt(em) || 1;
  let err = 0; for (const k of use) err += Math.min(30, Math.abs(20 * Math.log10(Math.max(1e-6, M[k] / nm)) - sdb[k])); err = use.length ? err / use.length : NaN;
  const tm = measureTimbre(P);
  // circulation : l'écart des mouvements du timbre du sujet, ramené à l'échelle des réglages de Moonvox (au moins 0,35 : la
  // laque doit irisée, Mat) ; son rythme
  // la course de chaque modulateur suit le mouvement du timbre du sujet (écart de brillance, de pente, d'équilibre impair /
  // pair), puis l'ensemble est ramené pour que le profil bouge d'autant que le timbre du sujet bouge lui-même ×1,5 — au moins
  // ±2 dB (la laque doit irisér), au plus ±6 dB
  let calc = clamp(tm.sdCen / 1.2, 0.2, 1), coag = clamp(tm.sdTilt / 2.5, 0.2, 1), subl = clamp(tm.sdOE / 3, 0.2, 1);
  { const target = clamp(1.5 * Math.max(tm.sdTilt, tm.sdOE / 2), 2, 6), m0 = motionOf({ T: T48, O: best.O, B: best.B, bal: best.bal, tilt: best.tilt, calc, coag, subl, sdb });
    if (m0 > 1e-3) { const g = clamp(target / m0, 0.2, 3); calc = clamp(calc * g, 0.1, 1); coag = clamp(coag * g, 0.1, 1); subl = clamp(subl * g, 0.1, 1); } }
  // la vie de chaque partiel, à l'échelle de la laque V6.3 (« l'effet est génial », Mat — on garde l'effet, on change le
  // timbre) : ±45 % comme en V6.3, plus ou moins selon que le partiel vit plus ou moins que les autres dans le sujet (racine du
  // rapport à la médiane, 30 à 60 %) ; rythme relevé sur le partiel, ramené entre 1,5 et 6 Hz (sinon étalé de 1,5 à 6 Hz par
  // le nombre d'or). (V6.4, mesuré dans le DSP réel, trompette : ±80 % et des rythmes jusqu'à 12 Hz faisaient passer le
  // mouvement du timbre de 2,7 à 7,4 dB par trame de 50 ms, contre 4,5 dB avec la laque V6.3 ; la circulation du timbre créé
  // n'y compte presque pas : 7,30 dB avec, 7,30 dB figée sur sa moyenne)
  const lfoR = new Float64Array(24), lfoD = new Float64Array(24);
  // (les partiels faibles — 30 dB sous le plus fort — ne relèvent que du bruit : la profondeur et le rythme des forts)
  const strongMx = Math.max(...tm.mod.map(m => m.strong || 0)), ref = tm.mod.filter(m => m.strong > 0.0316 * strongMx);
  const refD = ref.length ? ref.map(m => m.depthDb).sort((a, b) => a - b)[ref.length >> 1] : 0, dMed = Math.max(1e-6, Math.pow(10, refD / 20) - 1);
  for (let k = 0; k < 24; ++k) { const m = tm.mod[k], kk = k + 1, dd = m.strong > 0.0316 * strongMx ? m.depthDb : refD, d = Math.pow(10, dd / 20) - 1; lfoD[k] = clamp(0.45 * Math.sqrt(Math.max(1e-6, d) / dMed), 0.3, 0.6); lfoR[k] = m.rate >= 0.3 && m.strong > 0.0316 * strongMx ? clamp(m.rate * (0.75 + 0.5 * ((kk * PHI) % 1)), 1.5, 6) : 1.5 + 4.5 * ((kk * PHI) % 1); }
  return (P.__moonD = { name: none ? 'none: the subject has no partials' : 'designed from the subject', designed: !none, none, T: T48, O: best.O, B: best.B, bal: best.bal, tilt: best.tilt, err, motion: best.motion, oscillators: T48.filter(v => v > 0.01).length, used: use.length,
    sdb, calc, coag, subl, rate: tm.rate, lfoR, lfoD, mod: tm.mod, sd: { cen: tm.sdCen, tilt: tm.sdTilt, oe: tm.sdOE } });
}
// le profil du timbre créé au long d'un tour de sa circulation (le chemin sinusoïdal de Moonvox, x = sin φ, y = cos φ,
// à pleine course : ±0,75 comme l'attracteur), en dB rapportés au sujet, ±12 dB ; 0 sur les rangs que le sujet n'a pas
export function circulationTable (d) {
  const out = new Float64Array(TAB_N * LK), M = new Float64Array(LK);
  for (let q = 0; q < TAB_N; ++q) {
    const ph = 2 * Math.PI * q / TAB_N, x = 0.75 * Math.sin(ph), y = 0.75 * Math.cos(ph);
    moonProfile(d.T, clamp(d.O + x * d.calc * 0.3, 0, 1), clamp(d.B + y * d.coag * 0.25, 0, 1), clamp(d.bal + x * d.calc * 0.2, 0, 1), clamp(d.tilt + y * d.coag * 0.5, -1, 1), LK, M);
    let em = 0; for (let k = 0; k < LK; ++k) em += M[k] * M[k]; const nm = Math.sqrt(em) || 1;
    for (let k = 0; k < LK; ++k) out[q * LK + k] = d.sdb[k] > -50 ? clamp(20 * Math.log10(Math.max(1e-6, M[k] / nm)) - d.sdb[k], -12, 12) : 0;
  }
  return out;
}

// ------------------------------------------------------------------------------------------ démodulation (comme le DSP)
// f0Of(i) → Hz (0 : pas de hauteur) ; porteuses cohérentes c_k = e^{ikΘ}, Θ intégrant 2π·f0/sr ; deux pôles à
// min(0,25·f0, 150 Hz) sur I et Q ; sortie : z_k par bloc de B échantillons (fin de bloc), et Θ
export function demodulate (x, sr, f0Of, B = 128, K = LK) {
  const n = x.length, nb = Math.floor(n / B), zr = Array.from({ length: K }, () => new Float32Array(nb)), zi = Array.from({ length: K }, () => new Float32Array(nb)), F = new Float32Array(nb);
  const s1 = new Float64Array(K), s2 = new Float64Array(K), q1 = new Float64Array(K), q2 = new Float64Array(K);
  let th = 0, f0 = 0, lp = 0;
  for (let b = 0; b < nb; ++b) {
    f0 = f0Of(b * B); F[b] = f0; lp = f0 > 0 ? 1 - Math.exp(-2 * Math.PI * Math.min(0.25 * f0, 150) / sr) : 0;
    const dth = 2 * Math.PI * (f0 > 0 ? f0 : 100) / sr, Kk = f0 > 0 ? Math.min(K, Math.floor(0.45 * sr / f0)) : 0;
    for (let i = b * B; i < (b + 1) * B; ++i) {
      th += dth; if (th > 2 * Math.PI) th -= 2 * Math.PI;
      const c1 = Math.cos(th), sn1 = Math.sin(th); let ck = c1, sk = sn1; const x2 = 2 * x[i];
      for (let k = 0; k < Kk; ++k) {
        s1[k] += (x2 * ck - s1[k]) * lp; s2[k] += (s1[k] - s2[k]) * lp; q1[k] += (-x2 * sk - q1[k]) * lp; q2[k] += (q1[k] - q2[k]) * lp;
        const nc = ck * c1 - sk * sn1; sk = sk * c1 + ck * sn1; ck = nc;
      }
    }
    for (let k = 0; k < K; ++k) { zr[k][b] = s2[k]; zi[k][b] = q2[k]; }
  }
  return { zr, zi, F, B, nb };
}

// ------------------------------------------------------------------------------------------ étude des phases
// Δ_k = arg(z_k · conj(z₁)^k) : la phase du partiel k rapportée à k fois celle de la fondamentale (indépendante des
// porteuses : une erreur de suivi δf fait tourner z_k de k·δf et z₁^k d'autant) ; blocs retenus : z₁ et z_k à moins de
// 40 dB du plus fort, une hauteur. Mesures, pondérées par a_k·a₁ :
//   lock  — longueur du résultant sur tout le son (1 : la même forme d'onde d'un bout à l'autre) ;
//   local — la même sur des fenêtres de 100 ms, moyennée (1 : la forme d'onde tient d'un instant à l'autre) ;
//   slip  — vitesse moyenne SIGNÉE de rotation de Δ_k (Hz) : 0 pour un partiel harmonique, f_k − k·f₁ sinon ;
//   delta — la moyenne circulaire (la valeur de départ du suivi du DSP)
// Mesuré sur un son de synthèse (20 partiels, phases fixes) : lock 0,98–0,99, local 0,99, slip < 0,1 Hz, avec ou sans
// vibrato de 6 Hz.
export function phaseStudy (x, sr, f0Of, K = LK) {
  const D = demodulate(x, sr, f0Of, 128, K), { zr, zi, nb } = D, W = Math.max(4, Math.round(0.1 * sr / 128));
  const dK = new Float64Array(K), RK = new Float64Array(K), RL = new Float64Array(K), slip = new Float64Array(K), wt = new Float64Array(K);
  let amax = 0; for (let k = 0; k < K; ++k) for (let b = 0; b < nb; ++b) amax = Math.max(amax, Math.hypot(zr[k][b], zi[k][b]));
  const thr = amax * 0.01;
  for (let k = 1; k <= K; ++k) {
    let sr_ = 0, si_ = 0, sw = 0, wr = 0, wi = 0, ww = 0, lsum = 0, lw = 0, rs = 0, rw = 0, prev = null;
    for (let b = 0; b < nb; ++b) {
      const a1 = Math.hypot(zr[0][b], zi[0][b]), ak = Math.hypot(zr[k - 1][b], zi[k - 1][b]);
      const ok = D.F[b] > 0 && a1 >= thr && ak >= thr;
      if (ok) {
        const p1 = Math.atan2(zi[0][b], zr[0][b]), pk = Math.atan2(zi[k - 1][b], zr[k - 1][b]);
        let d = pk - k * p1; d -= 2 * Math.PI * Math.floor((d + Math.PI) / (2 * Math.PI));
        const w = a1 * ak; sr_ += w * Math.cos(d); si_ += w * Math.sin(d); sw += w; wr += w * Math.cos(d); wi += w * Math.sin(d); ww += w;
        if (prev !== null) { let dd = d - prev; dd -= 2 * Math.PI * Math.floor((dd + Math.PI) / (2 * Math.PI)); rs += w * dd; rw += w; }
        prev = d;
      } else prev = null;
      if ((b + 1) % W === 0 || b === nb - 1) { if (ww > 0) { lsum += Math.hypot(wr, wi); lw += ww; } wr = wi = ww = 0; }
    }
    dK[k - 1] = sw > 0 ? Math.atan2(si_, sr_) : 0; RK[k - 1] = sw > 0 ? Math.hypot(sr_, si_) / sw : 0; RL[k - 1] = lw > 0 ? lsum / lw : 0; wt[k - 1] = sw;
    slip[k - 1] = rw > 0 ? rs / rw / (2 * Math.PI) * sr / 128 : 0;
  }
  return { delta: dK, lock: RK, local: RL, slip, weight: wt };
}

// ------------------------------------------------------------------------------------------ la hauteur que lit le DSP
// celle de l'anatomie (pas 1024 : f0 ×16, confiance ×1000), comme voiceControl : confiance ≥ 0,5 et 30–2000 Hz, interpolation
// géométrique entre deux trames, sinon la dernière lue, sinon la hauteur de référence (moyenne géométrique des trames sûres)
export function anatomyF0 (words, nfr) {
  const f0 = j => words[Math.max(0, Math.min(nfr - 1, j)) * 32] / 16, cf = j => words[Math.max(0, Math.min(nfr - 1, j)) * 32 + 1] / 1000;
  let lf = 0, c = 0; for (let j = 0; j < nfr; ++j) { const f = f0(j); if (cf(j) >= 0.5 && f > 30 && f < 2000) { lf += Math.log(f); c++; } }
  const ref = c ? Math.exp(lf / c) : 220; let last = 0;
  return i => { const jf = i / 1024, j0 = Math.floor(jf), u = jf - j0, fa = f0(j0), fb = f0(j0 + 1), okA = fa > 30 && fa < 2000, okB = fb > 30 && fb < 2000;
    let f = okA && okB ? fa * Math.pow(fb / fa, u) : okA ? fa : okB ? fb : 0; if (f <= 0 || cf(j0) < 0.5) f = last > 0 ? last : ref; else last = f; return Math.max(20, Math.min(4000, f)); };
}
/** le bloc LACQ d'un emplacement : le timbre de Moonvox CRÉÉ à partir du SUJET (une laque par troupe), phases relatives
 *  mesurées sur CE son (le mummer, ou le sujet), avec la hauteur que le DSP lira ; et (V6.4) le relevé de la tenue
 *  granulaire de ce son (grains.js) */
export function lacquerBlock (P, L, R, ana, grains = null) {
  const fit = designMoonvox(P), n = L.length, m = new Float64Array(n); for (let i = 0; i < n; ++i) m[i] = 0.5 * (L[i] + R[i]);
  let ph = null; try { ph = phaseStudy(m, P.sr, anatomyF0(ana.words, ana.nfr)); } catch (e) { ph = null; }
  return { words: lacqWords(fit, ph, P.formants, grains), fit, phase: ph, grains };
}

// ------------------------------------------------------------------------------------------ bloc LACQ (V6.4 : 896 mots)
// [0] 'LACQ' [1] version 3 [2] rangs de la table créée (48) [3] hautbois ×1000 [4] cuivre ×1000 [5] équilibre ×1000
// [6] pente ×1000 [7] rythme de la circulation ×1000 (Hz) [8] calcinatio ×1000 [9..11] formants F1–F3 du sujet (Hz)
// [12] κ ×10000 [13] coagulatio ×1000 [14] sublimatio ×1000 [15] écart du profil créé au sujet ×100 (dB)
// [16..39] rythme de la vie de chaque partiel ×1000 (Hz) [40..63] sa profondeur ×1000 [64..87] phase relative moyenne Δ_k
// (rad ×10000) [88] verrou local médian (k 2–8) ×1000 [89..95] réservés
// [96..863] le profil du timbre créé au long d'un tour de sa circulation : 32 instants × 24 partiels, dB ×100 rapportés au sujet
// [864..895] le bloc GRAN de la tenue granulaire (grains.js)
export const LACQ_W = 896, TAB_AT = 96, GRAN_AT = 864;
export function lacqWords (fit, phase, formants, grains) {
  const w = new Int32Array(LACQ_W);
  w[0] = LACQ_MAGIC; w[1] = 3; w[2] = 48;
  w[3] = Math.round(fit.O * 1000); w[4] = Math.round(fit.B * 1000); w[5] = Math.round(fit.bal * 1000); w[6] = Math.round(fit.tilt * 1000);
  w[7] = Math.round(fit.rate * 1000); w[8] = Math.round(fit.calc * 1000);
  // formants du sujet : ceux qu'il a (0 : absent, le DSP n'en déplace que ceux-là — comme lacquerJS) ; aucun : les trois neutres
  const Fm = formants && formants.length ? formants : [500, 1500, 2500];
  for (let q = 0; q < 3; ++q) w[9 + q] = q < Fm.length ? Math.round(Fm[q]) : 0;
  w[12] = 100;                                                   // κ = −40 dB
  w[13] = Math.round(fit.coag * 1000); w[14] = Math.round(fit.subl * 1000); w[15] = Math.round((Number.isFinite(fit.err) ? fit.err : 0) * 100);
  for (let k = 0; k < LK; ++k) { w[16 + k] = Math.round(fit.lfoR[k] * 1000); w[40 + k] = Math.round(fit.lfoD[k] * 1000); }
  for (let k = 0; k < LK; ++k) w[64 + k] = Math.round((phase ? phase.delta[k] : 0) * 10000);
  const lk = phase ? Array.from(phase.local).slice(1, 8).sort((a, b) => a - b) : [0];
  w[88] = Math.round((lk[lk.length >> 1] || 0) * 1000);
  const tab = fit.tab || (fit.tab = circulationTable(fit));
  for (let q = 0; q < TAB_N * LK; ++q) w[TAB_AT + q] = Math.round(tab[q] * 100);
  if (grains) granWords(grains, w, GRAN_AT);
  return w;
}

// ------------------------------------------------------------------------------------------ portage JS du moteur du DSP
// (mêmes constantes que part3 « LACQUER » ; sert à mesurer la laque hors AMORPH)
//   Lorenz (σ 10 ± 4, ρ 29,5, β 8/3, pas 1,2 unité/s) → x, y, z normalisés (tanh) ; calcinatio = coagulatio = sublimatio = 0,7 :
//     hautbois += 0,3·x·0,7, équilibre += 0,2·x·0,7, cuivre += 0,25·y·0,7, pente += 0,5·y·0,7, formants × 2^(0,4·z·0,7·0,5)
//   SCINTILLEMENT par partiel : le LFO d'amplitude de Moonvox — au rythme du timbre ajusté s'il est vif (Exuvia 7 Hz, Glassine
//     2,5 Hz, Caustic 5,5 Hz), sinon (les timbres Classic : 0,055 Hz, immobiles sur la durée d'un sample) celui des timbres
//     Modern étalé de 1,5 à 6 Hz d'un partiel à l'autre ({k·φ}) ; profondeur ×1,5, au moins ±45 % ; LFO de groupe (k mod 4 :
//     0,05 / 0,08 / 0,11 / 0,14 Hz, ±5 %)
//   TOUCHES : trois pinceaux (gaussiennes de 0,7 octave en rang) promenés par x, y, z de l'attracteur sur les rangs 1–16 ;
//     T_k = 0,3 + 0,7·max des pinceaux
//   GAIN : G_k = C_k^T · (M_k(t)/M̄_k)^(2T) — C_k la couleur (écart du Moonvox ajusté au sujet, ±12 dB), M_k(t)/M̄_k le mouvement
//     de Moonvox autour de son profil ajusté ; borné à ±18 dB ; b_k = a_k·G_k, l'ensemble ramené à l'énergie E de la note ;
//     ρ_k = a_k/(a_k + κE), κ = −40 dB. (Première version : b_k = a_k^(1−T)·(E·μ_k)^T — elle remplaçait la vie des partiels du
//     sujet par celle, plus lisse, de Moonvox : mesurée, l'irisation BAISSAIT de 3,7 à 2,8 dB/50 ms sur la clarinette)
//   PHASE PRÉDITE (si a₁ > E/10) : ũ_k = u₁^k · D_k/|D_k|, u₁ = z₁/a₁ ; D_k suit la phase relative du partiel
//     (z_k·conj(u₁)^k / a_k, lissée sur 50 ms) tant qu'il est net (a_k > κE), et la garde quand il faiblit ; au départ de la
//     voix, la moyenne mesurée par le cerveau (Δ_k). L'étude des phases montre pourquoi il faut la suivre : sur les sujets,
//     la forme d'onde tient à 100 ms près (verrou local 0,6–0,9 trompette, 0,8–0,98 clarinette sur ses rangs forts, glissement
//     < 2 Hz) mais change d'une note à l'autre (verrou global 0,3–0,6)
//   ÉCLAT : partiels impairs à gauche, pairs à droite (±0,35·T_k), loi en racine
//   contrôle tous les 128 échantillons, gains et compléments interpolés linéairement entre deux contrôles
export function lacquerJS (L, R, sr, f0Of, fit, phase, formants, opts = {}) {
  const n = L.length, K = LK, B = 128, wet = opts.wet ?? 1, seed = opts.seed ?? 0;
  const oL = Float64Array.from(L), oR = Float64Array.from(R);
  const s1 = new Float64Array(K), s2 = new Float64Array(K), q1 = new Float64Array(K), q2 = new Float64Array(K);
  const g0 = new Float64Array(K), g1 = new Float64Array(K), cr0 = new Float64Array(K), ci0 = new Float64Array(K), cr1 = new Float64Array(K), ci1 = new Float64Array(K), pl = new Float64Array(K).fill(1), pr = new Float64Array(K).fill(1), pl1 = new Float64Array(K).fill(1), pr1 = new Float64Array(K).fill(1);
  const M = new Float64Array(K), Fm = formants && formants.length ? formants : [500, 1500, 2500];
  // (V6.4) le timbre CRÉÉ : son profil au long de la circulation (dB rapportés au sujet), sa part fixe (moyenne du tour) et
  // son mouvement ; la vie de chaque partiel ; le rythme de la circulation
  const tab = fit.designed ? (fit.tab || (fit.tab = circulationTable(fit))) : null, Rbar = new Float64Array(K);
  if (tab) for (let k = 0; k < K; ++k) { let a = 0; for (let q = 0; q < TAB_N; ++q) a += tab[q * K + k]; Rbar[k] = a / TAB_N; }
  let lx = 0.1 + 0.37 * seed, ly = 0, lz = 2 + seed, sph = 0, th = 0, t = 0;
  const kap = 0.01, calc = 0.7, coag = 0.7, subl = 0.7, mix = 0.75, h = 1.2 / (sr / B);
  const bp = x => 1 / Math.sqrt(1 + 16 * (x - 1 / x) ** 2);
  const Dr = new Float64Array(K), Di = new Float64Array(K), aD = 1 - Math.exp(-B / (0.05 * sr));
  for (let k = 0; k < K; ++k) { const d = phase ? phase.delta[k] : 0; Dr[k] = 0.1 * Math.cos(d); Di[k] = 0.1 * Math.sin(d); }
  let st = { E: 0 };
  for (let b0 = 0; b0 + B <= n; b0 += B) {
    // ---- contrôle
    const f0 = f0Of(b0), on = f0 > 30 && f0 < 2000, Kk = on ? Math.min(K, Math.floor(0.45 * sr / f0)) : 0, lp = on ? 1 - Math.exp(-2 * Math.PI * Math.min(0.25 * f0, 150) / sr) : 0;
    for (let k = 0; k < K; ++k) { g0[k] = g1[k]; cr0[k] = cr1[k]; ci0[k] = ci1[k]; pl[k] = pl1[k]; pr[k] = pr1[k]; }
    // Lorenz
    { sph += 0.007 * h * 0.75; const sig = 10 + 8 * 0.5 * Math.sin(sph), rho = 13.9 + 0.5 * (45 - 13.9) + subl * 10 * 0.5; const dx = sig * (ly - lx), dy = lx * (rho - lz) - ly, dz = lx * ly - 2.6667 * lz; lx += h * dx; ly += h * dy; lz += h * dz; if (!(Math.abs(lx) < 100 && Math.abs(ly) < 150 && lz > -10 && lz < 200)) { lx = 0.1; ly = 0; lz = 2; } }
    t += B / sr;
    const cyc = 2 * Math.PI * 0.2 * t, xN = (1 - mix) * 0.75 * Math.sin(cyc) + mix * Math.tanh(lx * 0.08), yN = (1 - mix) * 0.75 * Math.cos(cyc) + mix * Math.tanh(ly * 0.06), zN = (1 - mix) * 0.75 * Math.sin(2 * cyc) + mix * Math.tanh((lz - 25) * 0.06);
    if (Kk > 0) {
      // (V6.4) la circulation du timbre créé : la phase du tour avance au rythme relevé, l'attracteur la déporte (±0,15 tour) ;
      // les formants se déplacent comme ceux de Moonvox (±30 % à pleine course × sublimatio)
      const cy = (t * fit.rate + 0.15 * xN) % 1, qf = ((cy < 0 ? cy + 1 : cy) * TAB_N), q0 = Math.floor(qf) % TAB_N, q1 = (q0 + 1) % TAB_N, uq = qf - Math.floor(qf), fsh = Math.pow(2, 0.38 * zN * fit.subl);
      for (let k = 0; k < Kk; ++k) {
        const kk = k + 1, rk = fit.lfoR[k], ph = 2 * Math.PI * (rk * t + ((kk * PHI * PHI) % 1)), gph = 2 * Math.PI * ([0.05, 0.08, 0.11, 0.14][k % 4] * t);
        let fm = 1; for (const F of Fm) { const x = kk * f0 / F; fm *= bp(x / fsh) / bp(x); }
        const Rm = tab[q0 * K + k] * (1 - uq) + tab[q1 * K + k] * uq - Rbar[k];
        M[k] = Math.pow(10, Rm / 20) * (1 + fit.lfoD[k] * Math.sin(ph)) * (1 + 0.05 * Math.sin(gph)) * clamp(fm, 0.35, 2.8);   // le mouvement du timbre créé, rang par rang
      }
      // a_k, E
      let E2 = 0; const a = new Float64Array(Kk); for (let k = 0; k < Kk; ++k) { a[k] = Math.hypot(s2[k], q2[k]); E2 += a[k] * a[k]; } const E = Math.sqrt(E2);
      // touches : trois pinceaux sur les rangs, promenés par l'attracteur ; G_k = couleur^T · mouvement^(2·T)
      const cB = [xN, yN, zN].map(v => 2.0 + 1.9 * v);
      const G = new Float64Array(Kk); let eb = 0;
      for (let k = 0; k < Kk; ++k) {
        const lr2 = Math.log2(k + 1); let T = 0; for (const c of cB) T = Math.max(T, Math.exp(-0.5 * ((lr2 - c) / 0.7) ** 2)); T = 0.3 + 0.7 * T;
        G[k] = clamp(Math.pow(10, T * Rbar[k] / 20) * Math.pow(Math.max(1e-6, M[k]), 2 * T), 0.126, 7.94); eb += (a[k] * G[k]) ** 2;
        const sp = 0.25 * T * (k % 2 === 0 ? -1 : 1); pl1[k] = Math.sqrt(1 - sp); pr1[k] = Math.sqrt(1 + sp);
      }
      const sc = eb > 0 ? E / Math.sqrt(eb) : 1;                // l'énergie de la note est gardée
      const pred = a[0] > 0.1 * E, u1r = a[0] > 0 ? s2[0] / a[0] : 1, u1i = a[0] > 0 ? q2[0] / a[0] : 0;
      let ur = 1, ui = 0;                                          // u₁^k
      for (let k = 0; k < Kk; ++k) {
        { const nr = ur * u1r - ui * u1i; ui = ur * u1i + ui * u1r; ur = nr; }
        // suivi de la phase relative du partiel (tant qu'il est net)
        if (pred && a[k] > kap * E) { const vr = (s2[k] * ur + q2[k] * ui) / a[k], vi = (q2[k] * ur - s2[k] * ui) / a[k]; Dr[k] += (vr - Dr[k]) * aD; Di[k] += (vi - Di[k]) * aD; }
        const gk = G[k] * sc, rho = a[k] / (a[k] + kap * E + 1e-30);
        if (pred) { g1[k] = gk * rho; const c = a[k] * gk * (1 - rho), dm = Math.hypot(Dr[k], Di[k]) || 1; cr1[k] = c * (ur * Dr[k] - ui * Di[k]) / dm; ci1[k] = c * (ur * Di[k] + ui * Dr[k]) / dm; }
        else { g1[k] = gk * rho + (1 - rho); cr1[k] = 0; ci1[k] = 0; }      // fondamentale trop faible pour prédire : gain réel, un rang noyé reste tel quel
      }
      st.E = E;
    } else { for (let k = 0; k < K; ++k) { g1[k] = 1; cr1[k] = 0; ci1[k] = 0; pl1[k] = 1; pr1[k] = 1; } }
    // ---- échantillons
    const dth = 2 * Math.PI * (on ? f0 : 100) / sr;
    for (let i = b0; i < b0 + B; ++i) {
      const u = (i - b0 + 1) / B;
      th += dth; if (th > 2 * Math.PI) th -= 2 * Math.PI;
      const c1 = Math.cos(th), sn1 = Math.sin(th); let ck = c1, sk = sn1;
      const x2 = (L[i] + R[i]);                                   // 2·milieu
      let dL = 0, dR = 0;
      for (let k = 0; k < Kk; ++k) {
        s1[k] += (x2 * ck - s1[k]) * lp; s2[k] += (s1[k] - s2[k]) * lp; q1[k] += (-x2 * sk - q1[k]) * lp; q2[k] += (q1[k] - q2[k]) * lp;
        const zr = s2[k], zi = q2[k], g = g0[k] + (g1[k] - g0[k]) * u, cr = cr0[k] + (cr1[k] - cr0[k]) * u, ci = ci0[k] + (ci1[k] - ci0[k]) * u;
        const p = zr * ck - zi * sk, e = g * p + (cr * ck - ci * sk);
        const gl = pl[k] + (pl1[k] - pl[k]) * u, gr = pr[k] + (pr1[k] - pr[k]) * u;
        dL += gl * e - p; dR += gr * e - p;
        const nc = ck * c1 - sk * sn1; sk = sk * c1 + ck * sn1; ck = nc;
      }
      oL[i] += wet * dL; oR[i] += wet * dR;
    }
  }
  return { L: oL, R: oR };
}
