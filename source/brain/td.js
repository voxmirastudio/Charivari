// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// ============================================================================================
//  CHARIVARI — MOTEUR TEMPOREL, synchrone de la période (v5.5)
//  Le son n'est plus découpé en trames FFT de taille fixe dont on recalcule les phases : il est relu dans sa FORME D'ONDE.
//  • LECTURE DIRECTE — partout où la hauteur, le corps et la vitesse sont inchangés (vitesse +1) : l'échantillon lui-même ;
//    à un raccord de la carte du temps, fondu de 5 ms qui SE TERMINE sur le raccord (le côté neuf est pris 5 ms plus tôt :
//    une attaque posée sur le raccord arrive entière, à son niveau), gains compensés selon la corrélation des deux côtés ;
//  • PSOLA (son voisé, une seule série harmonique) — des MARQUES DE PÉRIODE aux vrais zéros de la fondamentale (passages
//    montants par zéro du signal filtré autour de f0 suivie, filtre d'état aller-retour : phase nulle, la marque tombe au
//    même point de chaque période), interpolées sous l'échantillon ; chaque grain va d'une marque à l'autre — de la marque
//    précédente à la suivante (fenêtre de Hann asymétrique : la taille de fenêtre est la période elle-même) ; la HAUTEUR
//    change par l'espacement des grains (période / r), le CORPS par la lecture du grain (pas sb) — l'un sans l'autre ; la
//    micro-vie (jitter, shimmer, souffle dans la période) est celle de chaque période relue ;
//  • WSOLA (non voisé, ou plusieurs séries harmoniques à la fois) — grains de 20 ms (bruit) ou de 40 ms / 2,5 périodes
//    (polyphonie), chacun choisi, à ±¼ de grain de la position voulue, pour prolonger au mieux (corrélation normalisée) la
//    forme d'onde du précédent : le bruit garde sa texture réelle, les accords restent accords ; la hauteur est celle de la
//    lecture (pas r : tout le contenu transposé ensemble) et, quand le corps ne suit pas la hauteur (sb ≠ r), un filtre à
//    phase minimale remet l'enveloppe vraie de la source à sa place (E(f/sb) au lieu de E(f/r)) ;
//  • ATTAQUES — 25 ms après une attaque raide sont relues à vitesse 1 quelle que soit la vitesse de la strate (étirée, la
//    strate attend ensuite sur la période qui suit ; à rebours, l'attaque est jouée à l'endroit au bout de son aspiration) :
//    ni pré-écho, ni attaque doublée, ni attaque étirée ;
//  • lecture à bande limitée (sinus cardinal fenêtré de Kaiser, 120 dB, plat jusqu'à 20 kHz : resample.js ; coupure
//    abaissée quand la lecture accélère) : ni repliement ni assourdissement des aigus ;
//  • le niveau des grains suit, à 30 ms près, l'énergie de la source à la position lue (±9 dB au plus) ;
//  • FILTRES de gène (sourdine, perce, corps…) — un vrai filtre à phase minimale (cepstre replié), réponse recalculée toutes
//    les 5,3 ms, segments fenêtrés recouvrants : aucune phase n'est reconstruite, rien ne bouge que le timbre filtré.
// ============================================================================================
import { fft } from './fft.js';
import { trueEnvelope } from './phv.js';
import { polyphonyOf } from './partition.js';

// ------------------------------------------------------------------------------------------ lecture à bande limitée
// (V6.5) resample.js : noyaux de Kaiser de 48 prises (94 lue lentement), 120 dB, plats jusqu'à 20 kHz — l'ancien (16
// prises, β 8,6) assourdissait dès 16 kHz et laissait ses images à −20…−40 dB
import { readStereo, readMono } from './resample.js';
// (V6.3) la FIN du fichier est souvent une coupe (une boucle découpée : boucle_percu_02 s'arrête à −47 dB sous sa crête, en
// pleine onde). Relue lentement (tenue de la dilatation, relâchement final), chaque grain qui la traversait portait cette
// marche — mesuré : clics à 9,95 / 9,96 / 9,97 / 9,99 s (percussions, mummer 16, dilatation + taille). Les 192 derniers
// échantillons de la source (4 ms) sont lus en fondu sin² : la coupe n'est jamais relue comme une marche ; un son qui finit
// dans le silence n'y change rien
const EDGE = 192;
/** lit L et R à la position p (fractionnaire) avec une coupure à 1/q de Nyquist (q ≥ 1 : lecture accélérée) ; hors du son : 0 */
function readBL (L, R, n, p, q, out) {
  readStereo(L, R, n, p, q, out);
  if (p > n - EDGE) { const u = (n - p) / EDGE, w = u <= 0 ? 0 : Math.sin(0.5 * Math.PI * u) ** 2; out[0] *= w; out[1] *= w; }
}

// ------------------------------------------------------------------------------------------ préparation (une fois par sujet)
export function prepareTD (P) {
  if (P.td) return P.td;
  const sr = P.sr, n = P.n, M = P.M, hop = P.hopF, V = P.voiced, nfr = V.length;
  const fr = s => Math.max(0, Math.min(nfr - 1, s / hop));
  const f0At = s => { const x = fr(s), j = Math.floor(x), u = x - j, a = V[j], b = V[Math.min(nfr - 1, j + 1)]; if (a > 0 && b > 0) return a * Math.pow(b / a, u); return u < 0.5 ? a : b; };
  // f0 des marques : erreurs d'octave isolées (plus courtes que ±7 trames, 75 ms) ramenées à l'octave de la médiane locale —
  // une marque par période réelle, jamais une sur deux ni deux par période
  const Vm = new Float64Array(nfr);
  for (let j = 0; j < nfr; ++j) {
    if (!(V[j] > 0)) continue;
    const w = []; for (let q = Math.max(0, j - 7); q <= Math.min(nfr - 1, j + 7); ++q) if (V[q] > 0) w.push(Math.log2(V[q]));
    w.sort((x, y) => x - y); const med = w[w.length >> 1], lj = Math.log2(V[j]);
    Vm[j] = Math.pow(2, lj + Math.round(med - lj));
  }
  const fmAt = s => { const x = fr(s), j = Math.floor(x), u = x - j, a = Vm[j], b = Vm[Math.min(nfr - 1, j + 1)]; if (a > 0 && b > 0) return a * Math.pow(b / a, u); return u < 0.5 ? (a || b) : (b || a); };
  // MÉLANGE trame par trame : une seconde série harmonique (partition.js) ou, plus simplement, des raies tonales fortes
  // (émergence ≥ 20 dB) hors de la série suivie (à plus de 35 c de tout k·f0) qui portent plus de 10 % de l'énergie des
  // raies — une note qui s'éteint sous la suivante, un accord, une résonance. Répéter des périodes de f0 y briserait
  // l'autre son (mesuré : une trompette dont la note à 492 Hz dure sous la suivante à 788 Hz, étirée par périodes :
  // +20 dB d'énergie sous 300 Hz) ; ces trames vont au WSOLA. Lissé : au moins 3 trames sur 5, étendu de ±2 trames
  const f2 = polyphonyOf(P).f2, mix = new Uint8Array(nfr), poly = new Uint8Array(nfr);
  for (let j = 0; j < nfr; ++j) {
    if (f2[j] > 0) { mix[j] = 1; continue; }
    const F = V[j]; if (!(F > 0) || !P.frames[j]) continue;
    let eh = 0, eo = 0;
    for (const pk of P.frames[j].peaks) { const r = pk.f / F, k = Math.round(r), e = pk.a * pk.a; if (k >= 1 && Math.abs(1200 * Math.log2(r / k)) < 35) eh += e; else if (pk.emerg >= 20) eo += e; }
    if (eo > 0.1 * (eh + eo)) mix[j] = 1;
  }
  { const sm = new Uint8Array(nfr); for (let j = 0; j < nfr; ++j) { let c = 0; for (let q = Math.max(0, j - 2); q <= Math.min(nfr - 1, j + 2); ++q) c += mix[q]; sm[j] = c >= 3 ? 1 : 0; }
    for (let j = 0; j < nfr; ++j) if (sm[j]) for (let q = Math.max(0, j - 2); q <= Math.min(nfr - 1, j + 2); ++q) poly[q] = 1; }
  const polyAt = s => poly[Math.round(fr(s))] === 1;
  // marques de période, plage voisée par plage voisée
  const marks = [], runs = [];
  const ncorr = (p0, lag, W) => { let ab = 0, aa = 0, bb = 0; const st = Math.max(1, Math.round(W / 256)); for (let u = 0; u < W; u += st) { const x1 = cubicM(M, p0 + u), x2 = cubicM(M, p0 + lag + u); ab += x1 * x2; aa += x1 * x1; bb += x2 * x2; } return ab / Math.sqrt(aa * bb + 1e-30); };
  let j = 0;
  while (j < nfr) {
    while (j < nfr && !(V[j] > 0)) j++;
    const j0 = j; while (j < nfr && V[j] > 0) j++;
    if (j - j0 < 3) continue;
    const a = Math.max(0, Math.round((j0 - 0.5) * hop)), b = Math.min(n, Math.round((j - 0.5) * hop));
    const T0 = sr / fmAt(a), pad = Math.round(3 * T0), a2 = Math.max(0, a - pad), b2 = Math.min(n, b + pad), len = b2 - a2;
    if (b - a < 4 * T0) continue;
    // 1. passages montants par zéro de la fondamentale : passe-bande d'état (Q 2) accordé sur f0 suivie, aller puis retour
    const x = M.subarray(a2, b2), y1 = new Float64Array(len), y = new Float64Array(len), k = 0.5;
    const svf = (src, dst, dir) => { let ic1 = 0, ic2 = 0; for (let q = 0; q < len; ++q) { const i = dir > 0 ? q : len - 1 - q, f = fmAt(Math.min(b - 1, Math.max(a, a2 + i))), g = Math.tan(Math.PI * Math.min(0.45, f / sr)), a1 = 1 / (1 + g * (g + k)), a2_ = g * a1, v1 = a1 * ic1 + a2_ * (src[i] - ic2), v2 = ic2 + g * v1; ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2; dst[i] = k * v1; } };
    svf(x, y1, 1); svf(y1, y, -1);
    // tous les passages montants, puis la suite la plus régulière (Viterbi) : chaque intervalle au plus près de la période
    // attendue (f0 suivie), coût (ln(intervalle / période))² ; un passage manquant est permis (intervalle de 2 périodes, coût
    // en plus, marque intermédiaire interpolée) — ni marque en trop au milieu d'une période (la note qui change, une
    // harmonique qui l'emporte un instant), ni période coupée
    const cz = [];
    for (let i = Math.max(1, a - a2); i < Math.min(len, b - a2); ++i) if (y[i - 1] < 0 && y[i] >= 0) cz.push(a2 + i - 1 + (-y[i - 1]) / (y[i] - y[i - 1]));
    if (cz.length < 4) continue;
    const nC = cz.length, cost = new Float64Array(nC).fill(Infinity), from = new Int32Array(nC).fill(-1), skip = new Uint8Array(nC);
    const Tref = x => sr / fmAt(x);
    for (let i = 0; i < nC; ++i) {
      const T0i = Tref(cz[i]);
      if (cz[i] - cz[0] < 1.6 * T0i) cost[i] = 0.5 * Math.min(1, (cz[i] - cz[0]) / T0i);     // départ libre dans la première période
      if (!Number.isFinite(cost[i])) continue;
      for (let j = i + 1; j < nC; ++j) {
        const d = cz[j] - cz[i]; if (d > 2.6 * T0i) break; if (d < 0.6 * T0i) continue;
        const one = Math.log(d / T0i) ** 2, two = Math.log(d / (2 * T0i)) ** 2 + 0.05;
        const c = cost[i] + Math.min(one, two);
        if (c < cost[j]) { cost[j] = c; from[j] = i; skip[j] = two < one ? 1 : 0; }
      }
    }
    // fin : le meilleur passage de la dernière période
    let e = -1, be = Infinity; for (let i = nC - 1; i >= 0 && cz[nC - 1] - cz[i] < 1.6 * Tref(cz[nC - 1]); --i) if (cost[i] < be) { be = cost[i]; e = i; }
    const mz = [];
    for (let i = e; i >= 0; i = from[i]) { mz.push(cz[i]); if (skip[i] && from[i] >= 0) mz.push(0.5 * (cz[i] + cz[from[i]])); if (from[i] < 0) break; }
    mz.reverse();
    if (mz.length < 4) continue;
    // la période vraie peut être un multiple m de l'intervalle des marques (sous-série : une fondamentale faible sous un
    // 2e partiel dominant, deux oscillateurs à la quinte…) ; les grains restent d'une période, mais les reprises et les
    // sauts de l'étirement se feront par m périodes, jamais par une seule : la sous-série garde sa phase (voir multOf)
    const parts = [mz];
    // 3. affinage prudent sur la forme d'onde : une marque n'est déplacée (±5 % d'intervalle) que si les deux intervalles qui
    //    la suivent ressemblent alors nettement mieux (+0,02 de corrélation) à ceux qui suivent la marque précédente — des
    //    harmoniques fortes peuvent déplacer le zéro de la fondamentale filtrée ; sinon le zéro reste la marque
    for (const pm of parts) {
      if (pm.length < 4) continue;
      for (let q = 1; q < pm.length; ++q) {
        const m0 = pm[q - 1], m1 = pm[q], T = m1 - m0; if (!(T > 4)) continue;
        const W = Math.round(2 * T), D2 = Math.max(1, Math.round(0.05 * T));
        const corr = d => ncorr(m0, T + d, W), c0 = corr(0);
        let bd = 0, bc = c0; for (let d = -D2; d <= D2; ++d) { const v = corr(d); if (v > bc) { bc = v; bd = d; } }
        if (bd > -D2 && bd < D2 && bd !== 0) { const cm = corr(bd - 1), cp = corr(bd + 1), den = cm - 2 * bc + cp; if (den < 0) bd += Math.max(-0.5, Math.min(0.5, 0.5 * (cm - cp) / den)); }
        if (bc > 0.5 && bc - c0 > 0.02) pm[q] = m1 + bd;
        if (!(pm[q] > pm[q - 1] + 2)) pm[q] = pm[q - 1] + 2;
      }
      const first = marks.length; for (const v of pm) marks.push(v); runs.push([first, marks.length - 1]);
    }
  }
  const mk = Float64Array.from(marks), run = new Int32Array(mk.length).fill(-1);
  runs.forEach(([a, b], r) => { for (let i = a; i <= b; ++i) run[i] = r; });
  // période vraie par tronçons de ~120 ms de la plage (une plage peut lier plusieurs notes), lissée (médiane de 3)
  const multK = new Uint8Array(mk.length).fill(1), mult = [];
  runs.forEach(([a, b]) => {
    const segs = []; let q = a;
    while (q <= b) { let e = q; while (e < b && mk[e + 1] - mk[q] < 0.12 * sr) e++; if (b - e < 6) e = b; segs.push([q, e]); q = e + 1; }
    const ms = segs.map(([x, y]) => multOf(M, sr, mk, x, y));
    const sm = ms.map((_, i) => { const w = ms.slice(Math.max(0, i - 1), i + 2).sort((u, v) => u - v); return w[w.length >> 1]; });
    segs.forEach(([x, y], i) => { for (let k = x; k <= y; ++k) multK[k] = sm[i]; });
    mult.push(Math.max(...sm));
  });
  // énergie cumulée (L² + R²)/2 : énergie de la source autour de toute position, en temps constant
  const cs = new Float64Array(n + 1); for (let i = 0; i < n; ++i) cs[i + 1] = cs[i] + 0.5 * (P.L[i] * P.L[i] + P.R[i] * P.R[i]);
  // copie pré-accentuée (1 − 0,95 z⁻¹) pour les corrélations du WSOLA : l'alignement des grains tient compte des aigus,
  // pas seulement de la fondamentale (sinon les aigus se recouvrent déphasés : un grain rugueux toutes les 10 ms)
  const Mp = new Float64Array(n); for (let i = 1; i < n; ++i) Mp[i] = M[i] - 0.95 * M[i - 1];
  const ons = Float64Array.from((P.onsets || []).slice().sort((x, y) => x - y));
  // écart propre de chaque partiel à k·f0 (trame par trame, raie la plus forte à ±35 c et à moins d'un quart d'intervalle), pour le banc harmonique
  // FONDAMENTALE DU BANC HARMONIQUE : celle des marques (corrigée d'octave), prolongée dans les trames non voisées qui bordent
  // une note ou la trouent, tant que leurs raies restent celles de la note (au moins 3 rangs ≤ 48, à ±35 c et ±0,08·f0,
  // portant la moitié de l'énergie des raies de la trame), jusqu'à 300 ms — l'attaque d'un violoncelle, que le suivi juge non
  // voisée alors que ses partiels y sont les plus forts (mesuré : rangs 14 à 19, 24 dB au-dessus de la tenue), restait hors
  // du banc
  const Vh = Float64Array.from(Vm);
  { const fits = (j, F) => { const pk = P.frames[j] && P.frames[j].peaks; if (!pk || !pk.length) return false; let eh = 0, et = 0; const got = new Set(); for (const p of pk) { const e = p.a * p.a; et += e; const r = p.f / F, k = Math.round(r); if (k >= 1 && k <= 48 && Math.abs(1200 * Math.log2(r / k)) < 35 && Math.abs(r - k) < 0.08) { eh += e; got.add(k); } } return got.size >= 3 && eh >= 0.5 * et; };
    const mx = Math.round(0.3 * sr / hop);
    for (let j = 0; j < nfr; ++j) if (Vm[j] > 0 && j + 1 < nfr && !(Vm[j + 1] > 0)) for (let q = j + 1; q < nfr && q - j <= mx && !(Vm[q] > 0) && fits(q, Vm[j]); ++q) Vh[q] = Vm[j];
    for (let j = nfr - 1; j >= 0; --j) if (Vm[j] > 0 && j > 0 && !(Vm[j - 1] > 0)) for (let q = j - 1; q >= 0 && j - q <= mx && !(Vm[q] > 0) && !(Vh[q] > 0) && fits(q, Vm[j]); --q) Vh[q] = Vm[j]; }
  const hbAt = s => { const x = fr(s), j = Math.floor(x), u = x - j, a = Vh[j], b = Vh[Math.min(nfr - 1, j + 1)]; if (a > 0 && b > 0) return a * Math.pow(b / a, u); return u < 0.5 ? a : b; };
  // relevé sur la f0 du banc ; médiane glissante sur 5 trames des raies trouvées (une raie
  // voisine prise pour le partiel sur une trame isolée ferait sauter la porteuse hors de sa bande), trames sans raie comblées
  const KD = 128, devs = new Float32Array(nfr * KD).fill(1), damp = new Float32Array(nfr * KD);
  { const raw = new Float32Array(nfr * KD);
    for (let j = 0; j < nfr; ++j) { const F = Vh[j]; if (!(F > 0) || !P.frames[j]) continue; for (const pk of P.frames[j].peaks) { const r = pk.f / F, k = Math.round(r); if (k < 1 || k > KD || Math.abs(1200 * Math.log2(r / k)) >= 35 || Math.abs(r - k) >= 0.25) continue; if (pk.a > damp[j * KD + k - 1]) { damp[j * KD + k - 1] = pk.a; raw[j * KD + k - 1] = r / k; } } }
    for (let k = 0; k < KD; ++k) { let last = 1; for (let j = 0; j < nfr; ++j) { const w = []; for (let q = Math.max(0, j - 2); q <= Math.min(nfr - 1, j + 2); ++q) if (raw[q * KD + k] > 0 && Vh[q] > 0 && Math.abs(Vh[q] / (Vh[j] || Vh[q]) - 1) < 0.03) w.push(raw[q * KD + k]); if (w.length) { w.sort((x, y) => x - y); last = w[w.length >> 1]; } devs[j * KD + k] = last; } } }
  const devAt = (s, k) => (k > KD ? 1 : devs[Math.max(0, Math.min(nfr - 1, Math.round(s / hop))) * KD + k - 1]);
  P.td = { Mp, marks: mk, run, runs, mult, multK, f0At, fmAt, hbAt, polyAt, cs, onsets: ons, devAt, M0: M };
  return P.td;
}
// PÉRIODE VRAIE d'une plage : la sous-série (énergie à (k − ½)·F, ou à (k − ⅓)·F et (k − ⅔)·F, F = 1/intervalle des
// marques) comparée à la série (k·F), sur 8 trames de 8192 réparties dans la plage, rangs 1 à 8 : au-dessus de −40 dB, et
// faite de raies (6 dB au-dessus du plancher entre elles), la période vraie est 2 (ou 3) intervalles — une fondamentale faible sous un 2e partiel dominant (violoncelle), deux
// oscillateurs à la quinte (mélodie synthé). Mesuré sur un son de vérité (sous-série à −20 dB) : étiré par périodes seules,
// +12 dB d'erreur de spectre (bandes de modulation) ; par paires, 0,6 dB
function multOf (M, sr, mk, a, b) {
  const N = 4096, B = N / 2, nb = Math.max(1, Math.min(8, Math.floor((b - a) / 16))); if (b - a < 8) return 1;
  const win = new Float64Array(N); for (let i = 0; i < N; ++i) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
  let e1 = 0, e2 = 0, e3 = 0, f2 = 0, f3 = 0;
  for (let q = 0; q < nb; ++q) {
    const k = a + Math.round((q + 0.5) * (b - a) / nb), c = Math.round(mk[k]), k0 = Math.max(a, k - 4), k1 = Math.min(b, k + 4), F = sr / ((mk[k1] - mk[k0]) / (k1 - k0));
    if (!(F > 20)) continue;
    // trame stable : intervalles des marques couvertes par la trame à ±4 % de leur moyenne (pas de changement de note)
    { let lo = Infinity, hi = 0; for (let x = a + 1; x <= b; ++x) { if (mk[x] < c - N / 2 || mk[x - 1] > c + N / 2) continue; const T = mk[x] - mk[x - 1]; lo = Math.min(lo, T); hi = Math.max(hi, T); } if (hi > 1.08 * lo) continue; }
    const re = new Float64Array(N), im = new Float64Array(N); for (let i = 0; i < N; ++i) { const j = c - N / 2 + i; re[i] = j >= 0 && j < M.length ? M[j] * win[i] : 0; } fft(re, im);
    const pk = f => { const k0 = f * N / sr, w = Math.max(1, Math.round(0.015 * k0)); let m = 0; for (let x = Math.max(1, Math.round(k0) - w); x <= Math.min(B - 1, Math.round(k0) + w); ++x) m = Math.max(m, re[x] * re[x] + im[x] * im[x]); return m; };
    for (let h = 1; h <= 8 && h * F < 0.45 * sr; ++h) { e1 += pk(h * F); e2 += pk((h - 0.5) * F); e3 += 0.5 * (pk((h - 1 / 3) * F) + pk((h - 2 / 3) * F)); f2 += 0.5 * (pk((h - 0.25) * F) + pk((h - 0.75) * F)); f3 += 0.5 * (pk((h - 1 / 6) * F) + pk((h - 5 / 6) * F)); }
  }
  if (!(e1 > 0)) return 1;
  // une sous-série est faite de RAIES : elle dépasse de 6 dB le plancher entre elles (aux quarts / sixièmes) — un souffle
  // remplit tout l'intervalle et ne compte pas
  const r2 = 10 * Math.log10(e2 / e1 + 1e-30), r3 = 10 * Math.log10(e3 / e1 + 1e-30), p2 = 10 * Math.log10(e2 / (f2 + 1e-30) + 1e-30), p3 = 10 * Math.log10(e3 / (f3 + 1e-30) + 1e-30);
  if (globalThis.__TDM) globalThis.__TDM.push(['mult', +r2.toFixed(1), +r3.toFixed(1), +p2.toFixed(1), +p3.toFixed(1)]);
  const ok2 = r2 > -40 && p2 > 6, ok3 = r3 > -40 && p3 > 6;
  if (ok3 && (!ok2 || r3 > r2 + 3)) return 3;
  if (ok2) return 2;
  return 1;
}
function nearestMark (mk, s) { const N = mk.length; if (!N) return -1; let lo = 0, hi = N - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (mk[m] < s) lo = m; else hi = m; } return Math.abs(mk[lo] - s) <= Math.abs(mk[hi] - s) ? lo : hi; }

// ------------------------------------------------------------------------------------------ filtre variable à phase minimale
// dB(f) (fonction remplissant db[0..1024] pour le segment centré en t) → segments de 512 (Hann, pas 256), réponse
// impulsionnelle à phase minimale de 1024 points (cepstre réel replié), convolution, addition recouvrante
const NF = 2048, BF = NF / 2 + 1, KIR = 1024;
function minPhaseSpectrum (db, cache) {
  const re = cache.re, im = cache.im;
  for (let k = 0; k < NF; ++k) { const kk = k <= NF / 2 ? k : NF - k; re[k] = db[kk] * Math.LN10 / 20; im[k] = 0; }
  fft(re, im, true);
  for (let q = 1; q < NF / 2; ++q) { re[q] *= 2; im[q] *= 2; }
  for (let q = NF / 2 + 1; q < NF; ++q) { re[q] = 0; im[q] = 0; }
  fft(re, im);
  for (let k = 0; k < NF; ++k) { const m = Math.exp(re[k]), p = im[k]; re[k] = m * Math.cos(p); im[k] = m * Math.sin(p); }
  fft(re, im, true);
  for (let i = 0; i < NF; ++i) { re[i] = i < KIR ? re[i] * (i < KIR - 128 ? 1 : 0.5 + 0.5 * Math.cos(Math.PI * (i - (KIR - 128)) / 128)) : 0; im[i] = 0; }
  fft(re, im);
  return { re: Float64Array.from(re), im: Float64Array.from(im) };
}
export function tvFilter (chans, D, fillDb, HB = 256) {
  const cache = { re: new Float64Array(NF), im: new Float64Array(NF) }, db = new Float64Array(BF), prev = new Float64Array(BF).fill(NaN);
  const outs = chans.map(() => new Float64Array(D + NF)), W = 2 * HB, win = new Float64Array(W);
  for (let i = 0; i < W; ++i) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / W);
  const xr = new Float64Array(NF), xi = new Float64Array(NF);
  let H = null;
  for (let s0 = -HB; s0 < D; s0 += HB) {
    const tc = Math.max(0, Math.min(D - 1, s0 + HB));
    if (!fillDb(db, tc)) { // passe-tout
      for (let c = 0; c < chans.length; ++c) for (let i = 0; i < W; ++i) { const t = s0 + i; if (t >= 0 && t < D) outs[c][t] += win[i] * chans[c][t]; }
      continue;
    }
    // réponse inchangée à 0,1 dB près : la précédente sert encore (les enveloppes évoluent lentement)
    let same = true; for (let k = 0; k < BF; ++k) if (!(Math.abs(db[k] - prev[k]) < 0.1)) { same = false; break; }
    if (!same || !H) { H = minPhaseSpectrum(db, cache); prev.set(db); }
    for (let c = 0; c < chans.length; ++c) {
      const X = chans[c]; let any = false;
      for (let i = 0; i < NF; ++i) { const t = s0 + i; const v = i < W && t >= 0 && t < D ? win[i] * X[t] : 0; xr[i] = v; xi[i] = 0; if (v !== 0) any = true; }
      if (!any) continue;
      fft(xr, xi);
      for (let k = 0; k < NF; ++k) { const a = xr[k], b = xi[k]; xr[k] = a * H.re[k] - b * H.im[k]; xi[k] = a * H.im[k] + b * H.re[k]; }
      fft(xr, xi, true);
      const o = outs[c]; for (let i = 0; i < NF; ++i) { const t = s0 + i; if (t >= 0 && t < D + NF) o[t] += xr[i]; }
    }
  }
  return outs.map(o => o.subarray(0, D));
}

// ------------------------------------------------------------------------------------------ rendu d'une strate
/** même contrat que phv.render (spec : D, T, rateAt, r, sb, env, gainDb, srcGainDb, pan) ; les fonctions spectrales
 *  (partial, free, lobeFloor, envNoise, inertia, bodyX, src 'index') restent au moteur FFT : voir canRenderTD */
export function canRenderTD (spec) {
  return !(spec.partial || spec.free || spec.lobeFloor || spec.envNoise || spec.inertia || spec.bodyX || spec.xb || spec.breath || spec.src === 'index');
}
/** le banc harmonique temporel sait-il rendre les fonctions spectrales de cette strate ? oui si aucune ne DÉPLACE un
 *  partiel (gains par rang seulement — éteindre un rang compte comme un gain), sans partiel libre ni corps caricaturé :
 *  le partage partiel / souffle, le filtre du souffle et l'inertie du corps sont des opérations du banc */
export function canRenderHB (spec) {
  if (spec.free || spec.bodyX) return false;
  if (spec.partial) {
    for (let q = 0; q <= 12; ++q) {
      const t = Math.min(spec.D - 1, Math.round(q * spec.D / 12));
      for (let h = 1; h <= 24; ++h) { const f = h * 200, o = spec.partial(h, f, t, 200); if (o && Math.abs(o[0] / f - 1) > 1e-9) return false; }
    }
  }
  return true;
}
function renderTDcore (P, spec, stats) {
  const td = prepareTD(P), sr = P.sr, D = spec.D, n = P.n, L = P.L, R = P.R, M = P.M, mk = td.marks, run = td.run;
  // 1 — positions de lecture (par échantillon) et commandes (blocs de 32)
  const G = 32, nb = Math.ceil(D / G) + 2;
  const Ts = new Float64Array(D);
  for (let t = 0; t < D; ++t) { const s = spec.T(t); Ts[t] = (s === null || s === undefined || !(s > -1 && s < n)) ? NaN : s; }
  const rB = new Float64Array(nb), sbB = new Float64Array(nb), rtB = new Float64Array(nb);
  for (let b = 0; b < nb; ++b) { const t = Math.min(D - 1, b * G); rB[b] = spec.r ? spec.r(t) : 1; sbB[b] = spec.sb ? spec.sb(t) : 1; rtB[b] = spec.rateAt ? spec.rateAt(t) : 1; }
  const lerpB = (A, t) => { const x = Math.max(0, t) / G, b = Math.min(nb - 2, Math.floor(x)), u = x - b; return A[b] * (1 - u) + A[b + 1] * u; };
  const rAt = t => lerpB(rB, t), sbAt = t => lerpB(sbB, t), rateAt = t => rtB[Math.min(nb - 1, Math.max(0, Math.floor(t / G)))];
  // 2 — attaques relues à vitesse 1
  const Sp = Float64Array.from(Ts), lock = new Uint8Array(D), A = Math.round(0.025 * sr), ons = td.onsets;
  const contig = (t, rate) => !isNaN(Ts[t]) && !isNaN(Ts[t - 1]) && Math.abs(Ts[t] - Ts[t - 1] - rate) < 1e-3 * Math.max(1, Math.abs(rate)) + 1e-6;
  const firstOnsetAtLeast = x => { let lo = 0, hi = ons.length; while (lo < hi) { const m = (lo + hi) >> 1; if (ons[m] < x) lo = m + 1; else hi = m; } return lo; };
  // bars : les BARRIÈRES — l'instant de sortie où une attaque commence (t) et sa position source (o) : aucun grain ne la lit
  // avant t, le premier grain qui suit commence sur elle (même à vitesse 1 : une transposition seule relit aussi ses attaques)
  let nLock = 0; const bars = [];
  for (let t = 0; t < D; ++t) {
    const s = Ts[t]; if (isNaN(s) || lock[t]) continue;
    const rate = rateAt(t); if (Math.abs(rate) < 1e-6) continue;
    const same = Math.abs(rate - 1) < 2e-3;
    if (rate > 0) {
      const i = firstOnsetAtLeast(s - rate + 1e-9); if (i >= ons.length || ons[i] > s) continue;
      const so = ons[i]; nLock++; bars.push({ t: t - (s - so) / rate, o: so });
      let k = 0; for (; k < A; ++k) { const tt = t + k; if (tt >= D || (k > 0 && !contig(tt, rate))) break; if (!same) Sp[tt] = so + k; lock[tt] = 1; }
      if (!same && rate < 1) for (let tt = t + k; tt < D && contig(tt, rate) && Ts[tt] < so + k; ++tt) { Sp[tt] = so + k; lock[tt] = 2; }
      t += k - 1;
    } else {
      const i = firstOnsetAtLeast(s); if (i >= ons.length || ons[i] >= s - rate) continue;
      const so = ons[i]; let k0 = 0; while (k0 < A && t - k0 - 1 >= 0 && contig(t - k0, rate) && !lock[t - k0 - 1]) k0++;
      if (k0 < 8) continue;
      nLock++; bars.push({ t: t - k0, o: so });
      for (let q = 0; q <= k0; ++q) { const tt = t - k0 + q; Sp[tt] = so + q; lock[tt] = 1; }
    }
  }
  bars.sort((a, b) => a.t - b.t);
  const barAfter = x => { let lo = 0, hi = bars.length; while (lo < hi) { const m = (lo + hi) >> 1; if (bars[m].t <= x + 1e-6) lo = m + 1; else hi = m; } return lo < bars.length ? bars[lo] : null; };
  // 3 — lecture directe : blocs où vitesse +1, hauteur et corps inchangés (un raccord isolé est permis)
  const step1 = t => t > 0 && !isNaN(Sp[t]) && !isNaN(Sp[t - 1]) && Math.abs(Sp[t] - Sp[t - 1] - 1) < 1e-6;
  const direct = new Uint8Array(nb);
  for (let b = 0; b * G < D; ++b) {
    const t0 = b * G, t1 = Math.min(D, t0 + G);
    if (spec.forceGrains || Math.abs(rB[b] - 1) > 1e-4 || Math.abs(rB[b + 1] - 1) > 1e-4 || Math.abs(sbB[b] - 1) > 1e-4 || Math.abs(sbB[b + 1] - 1) > 1e-4) continue;
    let ok = true, bad = 0; for (let t = t0; t < t1; ++t) { if (isNaN(Sp[t])) { ok = false; break; } if (t > 0 && !step1(t)) bad++; }
    if (ok && bad <= 1) direct[b] = 1;
  }
  const Fx = Math.round(0.005 * sr), wd = new Float32Array(D);
  { let w = direct[0] ? 1 : 0; for (let t = 0; t < D; ++t) { const g = direct[Math.floor(t / G)] ? 1 : 0; w += Math.max(-1 / Fx, Math.min(1 / Fx, g - w)); wd[t] = w; }
    let w2 = direct[Math.floor((D - 1) / G)] ? 1 : 0; for (let t = D - 1; t >= 0; --t) { const g = direct[Math.floor(t / G)] ? 1 : 0; w2 += Math.max(-1 / Fx, Math.min(1 / Fx, g - w2)); wd[t] = Math.min(wd[t], w2); } }
  // (V6.5) RACCORDS ALIGNÉS — à chaque raccord de la lecture directe, le côté neuf est déplacé (à l'échantillon, d'au plus
  // une demi-période de la hauteur lue là, 5 ms au plus) pour que sa forme d'onde prolonge l'ancienne (corrélation
  // normalisée sur le fondu et la période qui suit) ; tout le segment jusqu'au raccord suivant suit ce déplacement (il reste
  // contigu). Deux côtés périodiques croisés hors de phase annulaient une partie de leurs harmoniques pendant les 5 ms.
  // Pas dans le bruit (aucune période), ni dans un segment qui porte une attaque verrouillée (elle reste à son instant)
  let nAlign = 0;
  {
    const spl = []; for (let t = 1; t < D; ++t) if (wd[t] > 0 && !isNaN(Sp[t]) && !isNaN(Sp[t - 1]) && !step1(t)) spl.push(t);
    for (let si = 0; si < spl.length; ++si) {
      const t = spl[si], tEnd = si + 1 < spl.length ? spl[si + 1] : D;
      let seg = t, locked = false;
      for (let tt = t; tt < tEnd && !isNaN(Sp[tt]); ++tt) { if (lock[tt]) { locked = true; break; } seg = tt + 1; }
      if (locked) continue;
      const s0 = Sp[t], F0 = td.f0At(s0); if (!(F0 > 0) || td.polyAt(s0)) continue;
      const T = sr / F0, maxLag = Math.min(Math.round(0.5 * T), Math.round(0.005 * sr)); if (maxLag < 2) continue;
      let F = Fx; for (let q = 1; q < Fx && t - q > 0; ++q) if (!step1(t - q)) { F = Math.min(F, q); break; }
      const W = F + Math.round(T), a0 = Sp[t - 1] + 1 - F, b0 = s0 - F;
      if (a0 < 0 || a0 + W >= n || b0 - maxLag < 0 || b0 + maxLag + W >= n) continue;
      // (V6.5) les énergies : celle du côté ancien une fois, celle du côté neuf glissée d'un retard au suivant (le produit
      // croisé reste calculé en entier) — trois fois moins de calcul, mêmes corrélations à l'arrondi près
      const M0 = td.M0 || M; let aa = 0; for (let q = 0; q < W; ++q) aa += M0[a0 + q] * M0[a0 + q];
      const cl = new Float64Array(2 * maxLag + 1);
      { let bb = 0; for (let q = 0; q < W; ++q) { const y = M0[b0 - maxLag + q]; bb += y * y; }
        for (let lag = -maxLag; lag <= maxLag; ++lag) {
          if (lag > -maxLag) { const yo = M0[b0 + lag - 1], yi = M0[b0 + lag + W - 1]; bb += yi * yi - yo * yo; if (bb < 0) bb = 0; }
          let ab = 0; const o = b0 + lag; for (let q = 0; q < W; ++q) ab += M0[a0 + q] * M0[o + q];
          cl[lag + maxLag] = ab / Math.sqrt(aa * bb + 1e-30);
        } }
      const corr = lag => cl[lag + maxLag];
      const c0 = corr(0); let best = 0, bc = c0;
      for (let lag = -maxLag; lag <= maxLag; ++lag) { if (!lag) continue; const c = corr(lag) - 0.05 * Math.abs(lag) / maxLag; if (c > bc) { bc = c; best = lag; } }
      if (!best || bc < c0 + 0.02) continue;
      let ok = true; for (let tt = t; tt < seg; ++tt) { const v = Sp[tt] + best; if (v < 0 || v > n - 1) { ok = false; break; } }
      if (!ok) continue;
      for (let tt = t; tt < seg; ++tt) Sp[tt] += best;
      nAlign++;
    }
  }
  const dL = new Float64Array(D), dR = new Float64Array(D), tmp = new Float64Array(2), tmp2 = new Float64Array(2);
  for (let t = 0; t < D; ++t) {
    if (!(wd[t] > 0) || isNaN(Sp[t])) continue;
    readBL(L, R, n, Sp[t], 1, tmp); dL[t] = tmp[0]; dR[t] = tmp[1];
  }
  // raccords de la lecture directe : fondu qui se termine sur le raccord, côté neuf pris en avance
  let nSplice = 0;
  for (let t = 1; t < D; ++t) {
    if (!(wd[t] > 0) || isNaN(Sp[t]) || isNaN(Sp[t - 1]) || step1(t)) continue;
    let F = Fx; for (let q = 1; q < Fx && t - q > 0; ++q) if (!step1(t - q)) { F = Math.min(F, q); break; }
    if (F < 16) continue;
    nSplice++;
    // corrélation des deux côtés sur la zone de fondu
    let sab = 0, saa = 0, sbb = 0;
    const oldAt = q => Sp[t - F + q], newAt = q => Sp[t] - F + q;
    const M0 = td.M0 || M; for (let q = 0; q < F; ++q) { const o = 0.5 * (cubicM(M0, oldAt(q))), v = 0.5 * cubicM(M0, newAt(q)); sab += o * v; saa += o * o; sbb += v * v; }
    const rho = Math.max(0, Math.min(1, sab / Math.sqrt(saa * sbb + 1e-30)));
    for (let q = 0; q < F; ++q) {
      const tt = t - F + q, u = (q + 0.5) / F, a = Math.cos(0.5 * Math.PI * u), b = Math.sin(0.5 * Math.PI * u), k = 1 / Math.sqrt(1 + 2 * rho * a * b);
      readBL(L, R, n, newAt(q), 1, tmp2);
      dL[tt] = k * (a * dL[tt] + b * tmp2[0]); dR[tt] = k * (a * dR[tt] + b * tmp2[1]);
    }
  }
  // 4 — grains (zones où la lecture directe n'est pas entière)
  const aL = new Float64Array(D), aR = new Float64Array(D), uL = new Float64Array(D), uR = new Float64Array(D), ws = new Float64Array(D), wsU = new Float64Array(D), wq = new Float64Array(D), wc = new Float64Array(D);
  let nV = 0, nU = 0;
  // un grain : centre de sortie x, centre source c, demi-fenêtres hl (avant) et hr (après) en échantillons de sortie, pas de
  // lecture q (sb pour un grain de période : le corps ; r pour un grain WSOLA : tout le contenu), vers la voie V ou U
  // flatL / flatR : demi-fenêtre plate (poids 1 jusqu'au bord, coupure nette) — un grain qui s'arrête juste avant une
  // attaque, ou qui commence sur elle
  // (V6.1) la coupure nette d'une barrière devient un fondu de 1,5 ms qui SE TERMINE sur l'attaque : le grain qui s'arrête
  // s'éteint sur ses dernières 1,5 ms, celui qui commence sur l'attaque est pris 1,5 ms plus tôt (ce qui précède l'attaque
  // dans la source) et monte en sin² — fenêtres complémentaires, l'attaque arrive entière à son instant. Mesuré : la coupure
  // nette laissait une marche de 30 à 60 % du niveau local (voix transposée d'une sixte vers le bas, clic à 0,45 s)
  const FB = Math.max(8, Math.round(0.0015 * sr));
  const FIN = Math.round(0.003 * sr);
  const grain = (x, c, hl, hr, q, voice, flatL = false, flatR = false, rho = 1) => {
    const fR = flatR ? Math.min(FB, Math.max(0, hr - 1)) : 0;
    const i0 = flatL ? Math.ceil(x - FB - 1e-9) : Math.ceil(x - hl), i1 = flatR ? Math.ceil(x + hr) - 1 : Math.floor(x + hr), oL = voice ? aL : uL, oR = voice ? aR : uR;
    for (let i = Math.max(0, i0); i <= Math.min(D - 1, i1); ++i) {
      const d = i - x;
      let w;
      if (d < 0) { if (flatL) { const u = (d + FB) / FB; w = u <= 0 ? 0 : Math.sin(0.5 * Math.PI * u) ** 2; } else w = 0.5 + 0.5 * Math.cos(Math.PI * d / hl); }
      else if (flatR) { const e = x + hr - i; w = fR > 0 && e < fR ? Math.cos(0.5 * Math.PI * (1 - e / fR)) ** 2 : 1; }
      else w = hr > 0 ? 0.5 + 0.5 * Math.cos(Math.PI * d / hr) : 1;
      readBL(L, R, n, c + d * q, q, tmp); oL[i] += w * tmp[0]; oR[i] += w * tmp[1]; ws[i] += w;
      if (!voice) { wq[i] += w * w; wc[i] += 2 * rho * w * wsU[i]; wsU[i] += w; }
    }
  };
  const needG = new Uint8Array(D); for (let t = 0; t < D; ++t) needG[t] = wd[t] < 1 && !isNaN(Sp[t]) ? 1 : 0;
  const uMeta = [];                                                         // grains WSOLA : (x, position source, r, sb)
  const posAt = x => { const xi = Math.min(D - 1, Math.max(0, Math.round(x))), s0 = Sp[xi]; if (isNaN(s0)) return NaN; const xj = x < xi ? xi - 1 : xi + 1, s1 = xj >= 0 && xj < D ? Sp[xj] : NaN; return !isNaN(s1) && Math.abs(s1 - s0) < 4 ? s0 + (s1 - s0) * (x - xi) / (xj - xi) : s0; };
  const speedAt = xi => { const a = Math.max(0, xi - 1), b = Math.min(D - 1, xi + 1); if (b <= a || isNaN(Sp[a]) || isNaN(Sp[b])) return 1; const v = (Sp[b] - Sp[a]) / (b - a); return Math.abs(v) > 8 ? (Sp[xi] - Sp[a]) / Math.max(1, xi - a) : v; };
  // la marque d'une période jouable autour de s (trois marques consécutives d'une même plage voisée, une seule série)
  // la marque d'une période jouable autour de s (trois marques consécutives d'une même plage voisée, une seule série).
  // Hors de l'entrée dans une plage, la marque n'est pas simplement la plus proche : parmi celles qui tombent à moins d'une
  // période et quart de la position voulue (au plus 12 ms, au moins 1,2 période), celle dont la période qui précède
  // prolonge le mieux la période qui suit la marque du grain précédent (corrélation normalisée sur leur recouvrement),
  // moins 0,05 par période d'écart à la position voulue. Une reprise ou un saut se fait ainsi par la période VRAIE de
  // la forme d'onde — deux ou trois intervalles de marques quand une sous-série existe (un violoncelle dont le 2e partiel
  // domine, deux oscillateurs à la quinte, une note qui s'éteint sous la suivante) — sans la deviner à l'avance
  const playable = k => k > 0 && k < mk.length - 1 && run[k - 1] === run[k] && run[k + 1] === run[k];
  const markFor = (s, dir, entering, prevG, sb, spacing) => {
    if (!spec.psola || spec.forceWSOLA || !(td.f0At(s) > 0) || td.polyAt(s)) return -1;
    let k = nearestMark(mk, s); if (k < 0) return -1;
    if (entering || !prevG || run[prevG.k] !== run[k]) {
      if (dir > 0.05 && mk[k] < s && k + 1 < mk.length) k++; else if (dir < -0.05 && mk[k] > s && k > 0) k--;
      return playable(k) && Math.abs(mk[k] - s) <= 0.6 * (mk[k + 1] - mk[k - 1]) ? k : -1;
    }
    const T = 0.5 * (mk[Math.min(mk.length - 1, k + 1)] - mk[Math.max(0, k - 1)]), lim = Math.max(1.2 * T, Math.min(1.25 * T * 3, 0.012 * sr));
    const kp = prevG.k, a0 = mk[kp], L2 = Math.max(4, Math.round(spacing)), st = Math.max(1, Math.round(L2 / 64));
    let bk = -1, bs = -Infinity;
    for (let q = k - 4; q <= k + 4; ++q) {
      if (!playable(q) || Math.abs(mk[q] - s) > lim) continue;
      let ab = 0, aa = 0, bb = 0;
      for (let u = 0; u < L2; u += st) { const x1 = cubicM(M, a0 + u * sb), x2 = cubicM(M, mk[q] - (L2 - u) * sb); ab += x1 * x2; aa += x1 * x1; bb += x2 * x2; }
      const sc = ab / Math.sqrt(aa * bb + 1e-30) - 0.05 * Math.abs(mk[q] - s) / T;
      if (sc > bs) { bs = sc; bk = q; }
    }
    return bk;
  };
  let t = 0; const gapMax = Math.round(0.05 * sr);
  while (t < D) {
    while (t < D && !needG[t]) t++;
    if (t >= D) break;
    let z1 = t;
    for (;;) { while (z1 < D && needG[z1]) z1++; let q = z1; while (q < D && !needG[q] && q - z1 < gapMax) q++; if (q < D && needG[q]) { z1 = q; continue; } break; }
    // zone [t, z1) : grains de t − 30 ms à z1 + 30 ms (les fenêtres couvrent les bords)
    const zs = Math.max(0, t - Math.round(0.03 * sr)), ze = Math.min(D, z1 + Math.round(0.03 * sr));
    // prev : le grain précédent { type 'V' | 'U' | 'H', x, c, r } — chaque grain commence là où finit le précédent : sa
    // demi-fenêtre avant couvre exactement l'intervalle depuis le centre du précédent (fenêtres complémentaires au neutre)
    let x = zs, prev = null;
    while (x < ze) {
      const xi = Math.min(D - 1, Math.round(x)), s = posAt(x);
      if (isNaN(s)) { x += G; prev = null; continue; }
      const r = rAt(xi), sb = sbAt(xi), sp = speedAt(xi), F0 = td.f0At(s);
      const entering = !prev || prev.type !== 'V';
      const k = markFor(s, sp, entering, prev && prev.type === 'V' ? prev : null, sb, prev && prev.type === 'V' ? x - prev.x : 0);
      if (k >= 0) {
        const m = mk[k], Tl = m - mk[k - 1], Tr = mk[k + 1] - m;
        if (entering && Math.abs(sp) > 0.05) {
          // entrée dans une plage de périodes : la première marque prise du bon côté de la position lue, et posée à
          // l'instant où la lecture y passe ; l'intervalle jusque-là est couvert par un grain de raccord lu à la position
          // même (au neutre, chaque échantillon revient exactement à sa place)
          const xt = x + (m - s) / sp;
          // (V6.3) après un silence de la carte (aucun grain avant), le grain de raccord s'ouvre en 3 ms au moins : sa demi-fenêtre
          // gauche valait l'écart jusqu'à la marque (6 échantillons parfois) — mesuré : clic au début de chaque segment rétrograde
          // d'une voix transposée (rétrograde + taille, 0,52 / 0,666 / 0,759 s)
          if (xt - x > 1) { grain(x, s, prev ? x - prev.x : Math.max(xt - x, FIN), xt - x, r, false); uMeta.push([x, s, r, sb]); prev = { type: 'H', x, c: s, r }; }
          x = xt;
        }
        const hl = prev && prev.type !== 'V' ? x - prev.x : Tl / sb;
        grain(x, m, Math.max(1, hl), Tr / sb, sb, true); nV++;
        if (globalThis.__TDLOG) globalThis.__TDLOG.push(['V', x, m, s, hl, Tr / sb]);
        prev = { type: 'V', x, c: m, r: sb, k };
        // espacement : la période qui suit la marque (dans le sens de lecture), divisée par r
        x += Math.max(4, (sp >= 0 ? Tr : Tl) / Math.max(0.05, r));
        continue;
      }
      // WSOLA
      // longueur de grain : 20 ms (bruit, son à hauteur aiguë) ; deux périodes de SORTIE au-dessous de 100 Hz (40 ms au plus) —
      // un grain plus court que deux périodes ne porte plus la hauteur ; mélange : 40 ms ou 2,5 périodes. Plus long, les
      // attaques douces s'étalent (mesuré : 30 à 80 ms → pré-écho de la trompette de −58 à −22 dB)
      const LV = +(globalThis.__TD_LV || 0.02);
      const Lw = F0 > 0 && td.polyAt(s) ? Math.max(LV * sr, 2.5 * sr / F0) : F0 > 0 ? Math.max(LV * sr, Math.min(2 * LV * sr, 3 * sr / (F0 * Math.max(0.25, r)))) : 0.02 * sr, Hs = Math.round(Lw / 2);
      const hop = prev ? x - prev.x : Hs;
      let c = s, rhoG = 1;
      if (prev && prev.forceC !== undefined) c = prev.forceC;
      else if (prev && prev.type === 'U' && hop > 8) {
        // la position qui prolonge le mieux la forme d'onde du grain précédent sur leur recouvrement (corrélation
        // normalisée, ±¼ de grain autour de la position voulue) ; la continuation naturelle gagne à égalité
        const pc = prev.c, pr = prev.r, nat = pc + hop * pr, Dl = Math.round((+(globalThis.__TD_DLK) || 1) * Math.max(Lw / 4, F0 > 0 ? 0.6 * sr / F0 : 0)), st = Math.max(1, Math.round(hop / 160));
        const Mp = td.Mp;
        // le grain précédent (référence) lu une fois ; recherche grossière (pas de 4, un point sur deux), puis fine (pas de 1)
        const nu = Math.max(1, Math.floor(hop / st)), ref = new Float64Array(nu); for (let q = 0; q < nu; ++q) ref[q] = cubicM(Mp, pc + q * st * pr);
        const corrS = (cc, k) => { let sab = 0, saa = 0, sbb = 0; for (let q = 0; q < nu; q += k) { const a2 = cubicM(Mp, cc - hop * r + q * st * r), b2 = ref[q]; sab += a2 * b2; saa += a2 * a2; sbb += b2 * b2; } return sab / Math.sqrt(saa * sbb + 1e-30); };
        const corr = cc => corrS(cc, 1);
        let best = 0, bc = -2, cNat = NaN;
        const Tp = F0 > 0 ? sr / F0 : 0;
        if (Tp > 0 && !td.polyAt(s) && globalThis.__TD_PER !== 0) {
          // son à hauteur, une seule série : les continuations valables sont la continuation naturelle plus un nombre entier
          // de périodes ; on prend celle qui tombe le plus près de la position voulue (écart ≤ ½ période au lieu de ±¼ de
          // grain) puis on l'ajuste à ±10 % de période — moins de flottement du temps lu, la vie du son reste en place
          const j = Math.round((s - nat) / Tp), c0 = nat + j * Tp, rr = Math.max(2, Math.round(0.1 * Tp)); cNat = c0 - s;
          best = Math.round(c0 - s); for (let d = Math.round(c0 - s) - rr; d <= Math.round(c0 - s) + rr; ++d) { const v = corr(s + d); if (v > bc) { bc = v; best = d; } }
        } else {
          for (let d = -Dl; d <= Dl; d += 4) { const v = corrS(s + d, 2); if (v > bc) { bc = v; best = d; } }
          bc = -2; const b0 = best; for (let d = b0 - 3; d <= b0 + 3; ++d) { const v = corr(s + d); if (v > bc) { bc = v; best = d; } }
        }
        // sous l'échantillon : sommet de la parabole des trois corrélations voisines
        // (V6.5) son à hauteur : la corrélation est relue À BANDE LIMITÉE (resample.js) au 1/16 d'échantillon sur ±1, puis
        // la parabole sur ce pas — la parabole des corrélations entières (lues en Catmull-Rom sur le signal pré-accentué, dont
        // l'aigu domine) laissait 47 % des grains décalés de plus de 0,05 échantillon (jusqu'à 1,3) sur un son parfaitement
        // périodique : à 4 kHz, 30° d'écart entre deux grains qui se recouvrent
        if (Tp > 0 && !td.polyAt(s) && globalThis.__TD_FINE !== false) {
          const nM = Mp.length, refF = new Float64Array(nu); for (let q = 0; q < nu; ++q) refF[q] = readMono(Mp, nM, pc + q * st * pr, 1);
          const corrF = cc => { let sab = 0, saa = 0, sbb = 0; for (let q = 0; q < nu; ++q) { const a2 = readMono(Mp, nM, cc - hop * r + q * st * r, 1), b2 = refF[q]; sab += a2 * b2; saa += a2 * a2; sbb += b2 * b2; } return sab / Math.sqrt(saa * sbb + 1e-30); };
          // autour de la meilleure position entière ET de la continuation à une période exacte près (nat + j·T)
          // (V6.5) le sommet sur la grille au 1/16 est cherché par dichotomie — pas de 4/16 sur ±1, puis ±2/16, puis ±1/16 autour
          // du meilleur — au lieu des 33 lectures par centre : la corrélation d'un signal à bande limitée n'a qu'un sommet dans
          // ±¼ d'échantillon (deux sommets plus proches demanderaient une fréquence au-dessus de Nyquist). 17 lectures au lieu
          // de 33 ; mêmes positions retenues (vérifié : __TD_FINE_CHECK compare aux 33 lectures)
          const b0 = Math.round(best), memo = new Map(), cF = d => { let v = memo.get(d); if (v === undefined) { v = corrF(s + d); memo.set(d, v); } return v; };
          const ctrs = Number.isFinite(cNat) && Math.abs(cNat - b0) > 0.5 ? [b0, cNat] : [b0];
          let bd = b0, bv = cF(b0);
          if (globalThis.__TD_FINE_EXH === true) {
            for (const ctr of ctrs) for (let u = -16; u <= 16; ++u) { const d = ctr + u / 16; if (d === b0) continue; const v = cF(d); if (v > bv) { bv = v; bd = d; } }
          } else {
            for (const ctr of ctrs) {
              // les deux meilleurs points de la grille grossière qui ne se touchent pas : un sommet aplati peut en porter deux
              // (mesuré : 1 grain sur 4 276 du violoncelle, deux sommets à 0,375 échantillon, ρ à 4·10⁻⁵ près)
              const cv = []; for (let u = -16; u <= 16; u += 4) cv.push([u, cF(ctr + u / 16)]);
              let u1 = 0, v1 = -Infinity; for (const [u, v] of cv) if (v > v1) { v1 = v; u1 = u; }
              let u2 = null, v2 = -Infinity; for (const [u, v] of cv) if (Math.abs(u - u1) >= 8 && v > v2) { v2 = v; u2 = u; }
              for (const u0 of u2 === null ? [u1] : [u1, u2]) {
                let uc = u0, vc = cF(ctr + u0 / 16);
                for (const st of [2, 1]) { const b = uc, um = b - st, up = b + st; if (um >= -16) { const v = cF(ctr + um / 16); if (v > vc) { vc = v; uc = um; } } if (up <= 16) { const v = cF(ctr + up / 16); if (v > vc) { vc = v; uc = up; } } }
                if (vc > bv) { bv = vc; bd = ctr + uc / 16; }
              }
            }
            if (globalThis.__TD_FINE_CHECK) {
              let ed = b0, ev = cF(b0);
              for (const ctr of ctrs) for (let u = -16; u <= 16; ++u) { const d = ctr + u / 16; if (d === b0) continue; const v = cF(d); if (v > ev) { ev = v; ed = d; } }
              const C = globalThis.__TD_FINE_CHECK; C.n = (C.n || 0) + 1; if (Math.abs(ed - bd) > 1e-9) { C.diff = (C.diff || 0) + 1; C.maxD = Math.max(C.maxD || 0, Math.abs(ed - bd)); C.maxDv = Math.max(C.maxDv || 0, ev - bv); }
            }
          }
          const cm = cF(bd - 1 / 16), cp = cF(bd + 1 / 16), den = cm - 2 * bv + cp; if (den < 0) bd += Math.max(-0.5, Math.min(0.5, 0.5 * (cm - cp) / den)) / 16;
          best = bd;
          if (Math.abs(nat - s) <= Dl) { const v = corrF(nat); if (v >= corrF(s + best) - 1e-6) best = nat - s; }
        } else {
          { const cm = corr(s + best - 1), cp = corr(s + best + 1), den = cm - 2 * bc + cp; if (den < 0) best += Math.max(-0.5, Math.min(0.5, 0.5 * (cm - cp) / den)); }
          if (Math.abs(nat - s) <= Dl) { const v = corr(nat); if (v >= corr(s + best) - 1e-6) best = nat - s; }
        }
        c = s + best;
        rhoG = Math.max(0, Math.min(1, corr(c)));
      }
      // ATTAQUES DANS UN GRAIN : aucun grain ne lit une attaque raide hors de sa place. Une attaque dans la moitié avant :
      // le grain commence sur elle (coupure nette ; le précédent s'est arrêté juste avant) ; dans la moitié après : le grain
      // s'arrête juste avant elle et le suivant commence sur elle — ni pré-écho, ni attaque dédoublée, ni attaque lue à
      // rebours (mesuré : une attaque de la note suivante entrait dans le dernier grain d'un fragment rétrograde)
      let flatL = !!(prev && prev.forceC !== undefined), hl = flatL ? 0 : Math.max(1, hop), hr = Hs, flatR = false, next = undefined;
      {
        // une barrière dans la moitié après : le grain s'arrête à son instant, sur la source qui la précède immédiatement,
        // et le suivant commence sur l'attaque, à son instant
        const bar = barAfter(x);
        if (bar && bar.t <= x + Hs) { hr = Math.max(1e-3, bar.t - x); flatR = true; next = bar.o; if (c + hr * r > bar.o) c = bar.o - hr * r; }
        // aucune autre attaque dans la lecture du grain (rétrograde, saut au milieu d'un fragment) : le grain recule devant
        // une attaque qui suivrait, avance au-delà d'une attaque qui précéderait
        const lo = c - (flatL ? 0 : hl * r), hi = c + hr * r, q = firstOnsetAtLeast(lo + 0.5);
        if (q < ons.length && ons[q] < hi - 0.5 && !(flatL && Math.abs(ons[q] - c) < 0.5) && !(flatR && Math.abs(ons[q] - hi) < 0.5)) {
          if (ons[q] > c) c = ons[q] - hr * r; else c = ons[q] + hl * r;
        }
      }
      grain(x, c, hl, hr, r, false, flatL, flatR, flatL || flatR ? 1 : rhoG); nU++; uMeta.push([x, c, r, sb]);
      if (globalThis.__TDLOG) globalThis.__TDLOG.push(['U', x, c, s, hl, hr]);
      prev = { type: 'U', x, c, r, forceC: next }; x += hr;
    }
    t = z1;
  }
  // normalisation par la somme des fenêtres : exacte pour les grains WSOLA (une demi-fenêtre coupée devant une attaque, un
  // bord de zone) ; jamais d'amplification des trous d'un PSOLA vers le grave
  // (V6.5) …sauf pour deux grains WSOLA PEU SEMBLABLES (du bruit : leur corrélation ρ sur le recouvrement, relevée par la
  // recherche) : leurs fenêtres de Hann se complètent en amplitude, pas en puissance — au milieu du fondu le niveau
  // tombait de 3 dB à chaque grain (mesuré par l'audit : +2,3 dB de modulation à 100 Hz sur un bruit étiré ×1,5). La somme
  // est normalisée par √(Σw² + 2ρ·w₁w₂) : ρ = 1 rend exactement Σw (un son à hauteur, aligné), ρ = 0 la puissance
  for (let i = 0; i < D; ++i) {
    const g = 1 / (nV > 0 ? Math.max(1, ws[i]) : Math.max(0.1, ws[i])); aL[i] *= g; aR[i] *= g;
    const gu = wsU[i] > 0 && ws[i] - wsU[i] < 1e-9 && globalThis.__TD_PWR !== false ? 1 / Math.max(0.1, Math.sqrt(Math.max(0, wq[i] + wc[i]))) : g; uL[i] *= gu; uR[i] *= gu;
  }
  // niveau des grains PSOLA (le seul cas où les fenêtres ne se complètent pas : grains de périodes espacés de période/r) :
  // l'énergie de la source à la position lue (fenêtres de 30 ms), ±9 dB au plus. Les grains WSOLA se complètent exactement
  // (Hann à mi-recouvrement) : leur niveau est celui de la source sans correction — une correction à 30 ms suivait la
  // période d'une note grave (mesuré : agitation ×3,4 sur un la grave transposé d'une octave vers le bas)
  if (nV > 0) {
    const W = Math.round(0.03 * sr), h = W >> 1, cs = td.cs, eo = new Float64Array(D + 1);
    for (let i = 0; i < D; ++i) { const a = aL[i] + uL[i], b = aR[i] + uR[i]; eo[i + 1] = eo[i] + 0.5 * (a * a + b * b); }
    const gs = new Float64Array(D); let last = 1;
    for (let i = 0; i < D; ++i) {
      if (wd[i] >= 1 || isNaN(Sp[i])) { gs[i] = last; continue; }
      const s = Math.round(Sp[i]), es = (cs[Math.min(n, s + h)] - cs[Math.max(0, s - h)]) / W, e = (eo[Math.min(D, i + h)] - eo[Math.max(0, i - h)]) / W;
      const g = es > 1e-12 && e > 1e-12 ? Math.sqrt(es / e) : last;
      last = Math.max(0.355, Math.min(2.82, g)); gs[i] = last;
    }
    let y = gs[0]; const a = 1 - Math.exp(-1 / (0.005 * sr));
    for (let i = 0; i < D; ++i) { y += a * (gs[i] - y); gs[i] = y; }
    for (let i = D - 1, z = gs[D - 1]; i >= 0; --i) { z += a * (gs[i] - z); gs[i] = 0.5 * (gs[i] + z); }
    for (let i = 0; i < D; ++i) { aL[i] *= gs[i]; aR[i] *= gs[i]; uL[i] *= gs[i]; uR[i] *= gs[i]; }
    if (stats && spec.debug) stats.gs = gs;
  }
  // corps des grains WSOLA quand il ne suit pas la hauteur : E(f/sb) − E(f/r), enveloppe vraie de la source à la position lue
  let corrected = false; const tC = Date.now();
  if (uMeta.length && uMeta.some(([, , r, sb]) => Math.abs(sb / r - 1) > 3e-3)) {
    const envAt = envelopeReader(P, td);
    const metaAt = tt => { let lo = 0, hi = uMeta.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (uMeta[m][0] <= tt) lo = m; else hi = m - 1; } return uMeta[lo]; };
    const [cL, cR] = tvFilter([uL, uR], D, (db, tc) => {
      if (spec.__needU && !spec.__needU(tc)) return false;
      const [, c, r, sb] = metaAt(tc); if (Math.abs(sb / r - 1) <= 3e-3) return false;
      // correction du corps : E(f/sb) − E(f/r) — bornée à ±36 dB sur un son voisé (une octave vers le bas en demande 30), ±24
      // sans hauteur ; jamais de gain là où le contenu
      // transposé n'existe pas (à plus de 80 dB sous le maximum de l'enveloppe, sous 0,7 × la fondamentale transposée, ou
      // venu d'au-delà de Nyquist) : on ne fait pas monter du rien en grondement ; sans hauteur, lissée au sixième d'octave
      const E = envAt(c), F0 = E.f0, floor = E.max - 80, raw = new Float64Array(BF);
      for (let k = 0; k < BF; ++k) {
        const f = Math.max(1, k * sr / NF), src = f / r, have = E(src);
        let v = E(f / sb) - have;
        if (v > 0 && (have < floor || src > 0.5 * sr || (F0 > 0 && f < 0.7 * F0 * r))) v = 0;
        raw[k] = F0 > 0 ? Math.max(-36, Math.min(36, v)) : Math.max(-24, Math.min(24, v));
      }
      if (F0 > 0) db.set(raw);
      else for (let k = 0; k < BF; ++k) { const f = Math.max(1, k * sr / NF), lo = Math.max(0, Math.floor(f / Math.pow(2, 1 / 12) * NF / sr)), hi = Math.min(BF - 1, Math.ceil(f * Math.pow(2, 1 / 12) * NF / sr)); let a = 0; for (let q = lo; q <= hi; ++q) a += raw[q]; db[k] = a / (hi - lo + 1); }
      return true;
    }, +(globalThis.__TD_HB || 512));
    uL.set(cL); uR.set(cR); corrected = true;
    if (globalThis.__TIMES) globalThis.__TIMES.push(['corr', Date.now() - tC]);
  }
  // 5 — mélange lecture directe / grains
  const yL = new Float64Array(D), yR = new Float64Array(D);
  for (let i = 0; i < D; ++i) { const w = wd[i]; yL[i] = w * dL[i] + (1 - w) * (aL[i] + uL[i]); yR[i] = w * dR[i] + (1 - w) * (aR[i] + uR[i]); }
  if (stats) Object.assign(stats, { psola: nV, wsola: nU, locks: nLock, splices: nSplice, aligned: nAlign, corrected, directShare: wd.reduce((a, v) => a + v, 0) / Math.max(1, D), attacks: bars.map(b => Math.round(b.t)).filter(t => t >= 0 && t < D) });
  if (stats && spec.debug) Object.assign(stats, { ws, wd, Sp });
  // la géométrie seule (transposition par le banc : voir renderTD)
  if (spec.__geo) return { L: yL, R: yR, Sp, rB, sbB };
  finishTD(P, td, spec, yL, yR, D, Sp, rB, stats);
  return { L: yL, R: yR };
}
// 6 et 7 — ce qui vient après la géométrie : filtre de gène, banc harmonique (gains par rang…), gains et panoramique
function finishTD (P, td, spec, yL, yR, D, Sp, rB, stats) {
  const sr = P.sr, G = 32, nb = Math.ceil(D / G) + 2;
  // 6 — filtre de gène (phase minimale)
  if (spec.env) {
    const [fL, fR] = tvFilter([yL, yR], D, (db, tc) => { let any = false; for (let k = 0; k < BF; ++k) { const v = Math.max(-80, Math.min(24, spec.env(Math.max(1, k * sr / NF), tc))); db[k] = v; if (Math.abs(v) > 1e-4) any = true; } return any; });
    yL.set(fL); yR.set(fR);
  }
  // 6 bis — BANC HARMONIQUE (gains par rang, partage partiel / souffle, inertie du corps), après le geste du joueur
  const oldHB = !!(spec.partial || spec.lobeFloor || spec.envNoise || spec.inertia || spec.breath), useHB = oldHB || !!spec.xb;
  if (useHB) {
    if (spec.srcGainDb) for (let b = 0; b * G < D; ++b) { const t0 = b * G, t1 = Math.min(D - 1, t0 + G), g0 = spec.srcGainDb(t0), g1 = spec.srcGainDb(t1); for (let i = t0; i < Math.min(D, t0 + G); ++i) { const g = Math.pow(10, (g0 + (g1 - g0) * (i - t0) / G) / 20); yL[i] *= g; yR[i] *= g; } }
    const Fo = new Float32Array(nb); for (let b = 0; b < nb; ++b) { const t0 = Math.min(D - 1, b * G), sp = Sp[t0]; const F = isNaN(sp) ? 0 : td.hbAt(sp); Fo[b] = F > 0 ? F * rB[b] : 0; }
    const tH = Date.now();
    const srcOf = b => { const sp = Sp[Math.min(D - 1, b * G)]; return isNaN(sp) ? null : sp; };
    if (oldHB) harmonicBank(yL, yR, D, sr, G, Fo, srcOf, td.devAt, spec, stats);
    if (globalThis.__TIMES) globalThis.__TIMES.push(['hb', Date.now() - tH]);
    // 6 ter — CRISTAUX (V6.3) : chaque partiel déplacé, pesé ou relu ailleurs dans son enveloppe, dans sa phase
    if (spec.xb) { const tX = Date.now(); crystalBank(yL, yR, D, sr, G, Fo, srcOf, td.devAt, spec.xb, stats); if (globalThis.__TIMES) globalThis.__TIMES.push(['xb', Date.now() - tX]); }
  }
  // 7 — gains et panoramique
  if (spec.gainDb || (spec.srcGainDb && !useHB) || spec.pan) {
    const gd = t2 => (spec.gainDb ? spec.gainDb(t2) : 0) + (spec.srcGainDb && !useHB ? spec.srcGainDb(t2) : 0);
    for (let b = 0; b * G < D; ++b) {
      const t0 = b * G, t1 = Math.min(D - 1, t0 + G), g0 = gd(t0), g1 = gd(t1), p0 = spec.pan ? spec.pan(t0) : [1, 1], p1 = spec.pan ? spec.pan(t1) : [1, 1];
      // (V6.3) gain interpolé en amplitude (et non en dB) d'un bord de bloc à l'autre : depuis le silence vrai (−90 dB), une
      // droite en dB faisait monter le son de 90 dB en un bloc en exponentielle, jusqu'à un coude — un clic
      const a0 = Math.pow(10, g0 / 20), a1 = Math.pow(10, g1 / 20);
      for (let i = t0; i < Math.min(D, t0 + G); ++i) { const u = (i - t0) / G, g = a0 + (a1 - a0) * u; yL[i] *= g * (p0[0] + (p1[0] - p0[0]) * u); yR[i] *= g * (p0[1] + (p1[1] - p0[1]) * u); }
    }
  }
}
// ------------------------------------------------------------------------------------------ transposition par le banc (v5.9)
// Mesuré sur le moteur à grains (v5.8) : transposée de ±5 demi-tons, la voix perdait ses formants (2,8 dB d'erreur
// d'enveloppe, 6 à 7,6 dB d'écart de spectre moyen) et chaque raccord de grain ajoutait du flottement de hauteur aux partiels
// (micro-FM ×1,8 sur la clarinette basse à +5, ×2,2 sur la voix à −12). Là où le son est VOISÉ, d'une seule série, loin d'une
// attaque raide, la hauteur passe désormais par le banc harmonique :
//   1. la géométrie (carte du temps, attaques, corps de grain) est rendue SANS transposition — lecture directe le plus souvent ;
//   2. chaque partiel y est démodulé (enveloppe complexe z_k, comme pour les gains par rang) ;
//   3. il est resynthétisé à r fois sa fréquence : porteuse × r, et sa propre dérive de phase (le flottement relevé dans z_k,
//      vibrato et micro-vie compris) × r aussi — le flottement garde sa taille en cents, la forme d'onde de l'attaque de la note
//      (les phases relatives des partiels) est gardée ;
//   4. son amplitude suit le corps : E(f'/sb) − E(f'/r) dB (enveloppe vraie de la source à la position lue ; sb = 1 : les formants
//      restent en place, sb = r : ils suivent la hauteur) ;
//   5. le reste (souffle, bruit d'archet) n'a pas de hauteur : il reste où il est, et ne reçoit que le corps (E(f/sb) − E(f)).
// Ailleurs (bruit, accords, attaques raides : ±12 / 35 ms), le moteur à grains ; les deux se relaient en rampes de 6 ms.
// (V6.5) PSOLA SUR LA PARTIE HARMONIQUE, GRAINS SUR LE BRUIT — le son est séparé une fois (banc harmonique, sur la
// fondamentale des marques) en H, ses partiels, et N = son − H (souffle, archet, transitoires, air de la pièce) ; les deux
// parties sont relues par la MÊME géométrie (carte du temps, attaques verrouillées, raccords alignés sur le son entier) :
// H par périodes (PSOLA : la hauteur par l'espacement des grains, le corps par leur lecture), N par grains WSOLA (un bruit
// relu par périodes deviendrait périodique). Lecture directe : H + N = le son, à l'échantillon près
function hnmParts (P) {
  if (P.__hnm) return P.__hnm;
  const td = prepareTD(P), sr = P.sr, n = P.n, G = 32, nb = Math.ceil(n / G) + 2;
  const Fo = new Float32Array(nb); for (let b = 0; b < nb; ++b) { const F = td.hbAt(Math.min(n - 1, b * G)); Fo[b] = F > 0 ? F : 0; }
  const yL = Float64Array.from(P.L), yR = Float64Array.from(P.R), split = {};
  harmonicBank(yL, yR, n, sr, G, Fo, b => Math.min(n - 1, b * G), td.devAt, { lobeFloor: () => [0, 0, 0], __split: split }, null);
  const mk = (L, R) => {
    const M = new Float64Array(n), Mp = new Float64Array(n), cs = new Float64Array(n + 1);
    for (let i = 0; i < n; ++i) { M[i] = 0.5 * (L[i] + R[i]); cs[i + 1] = cs[i] + 0.5 * (L[i] * L[i] + R[i] * R[i]); }
    for (let i = 1; i < n; ++i) Mp[i] = M[i] - 0.95 * M[i - 1];
    const Q = Object.create(P); Q.L = L; Q.R = R; Q.M = M; Q.td = { ...td, cs, Mp, M0: td.M0 || P.M }; return Q;
  };
  const HL = split.H[0], HR = split.H[1], NL = Float64Array.from(P.L, (v, i) => v - HL[i]), NR = Float64Array.from(P.R, (v, i) => v - HR[i]);
  return (P.__hnm = { H: mk(HL, HR), N: mk(NL, NR) });
}
function renderTDhnm (P, spec, stats) {
  // N n'a pas de hauteur : il est relu au pas du CORPS (sb), jamais transposé — un souffle, un archet, l'air d'une pièce
  // gardent leur couleur quand la note change (corps gardé : le bruit reste où il était, dans toute sa bande)
  const parts = hnmParts(P), h = renderTDcore(parts.H, { ...spec, psola: true, __geo: true }, stats), w = renderTDcore(parts.N, { ...spec, r: globalThis.__HNM_NR === 1 ? spec.sb : spec.r, psola: false, forceWSOLA: true, __geo: true });
  const D = spec.D, yL = new Float64Array(D), yR = new Float64Array(D);
  for (let i = 0; i < D; ++i) { yL[i] = h.L[i] + w.L[i]; yR[i] = h.R[i] + w.R[i]; }
  if (stats) stats.hnm = true;
  if (spec.__geo) return { L: yL, R: yR, Sp: h.Sp, rB: h.rB, sbB: h.sbB };
  finishTD(P, prepareTD(P), spec, yL, yR, D, h.Sp, h.rB, stats);
  return { L: yL, R: yR };
}
const useHNM = (P, spec) => globalThis.__HNM === true && !spec.forceGrains && !spec.forceWSOLA && spec.psola !== false && (P.voicedShare ?? 1) > 0.05;
export function renderTD (P, spec, stats) {
  if (!spec.__geo && useHNM(P, spec)) {
    let moves = false; const D0 = spec.D; for (let b = 0; b * 32 < D0; b += 4) { const t = Math.min(D0 - 1, b * 32), r = spec.r ? spec.r(t) : 1, sb = spec.sb ? spec.sb(t) : 1, ra = spec.rateAt ? spec.rateAt(t) : 1; if (Math.abs(r - 1) > 1e-4 || Math.abs(sb - 1) > 1e-4 || Math.abs(ra - 1) > 2e-3) moves = true; }
    if (moves) return renderTDhnm(P, spec, stats);
  }
  if (spec.__geo || spec.forceGrains || spec.psola || spec.forceWSOLA) return renderTDcore(P, spec, stats);
  const D = spec.D, G = 32, nb = Math.ceil(D / G) + 2;
  // la hauteur ou le corps bougent-ils quelque part ? la transposition descend-elle ?
  let moves = false, down = false;
  for (let b = 0; b < nb; b += 4) { const t = Math.min(D - 1, b * G), r = spec.r ? spec.r(t) : 1, sb = spec.sb ? spec.sb(t) : 1; if (Math.abs(r - 1) > 1e-4 || Math.abs(sb - 1) > 1e-4) moves = true; if (r < 0.995 && sb > r * 1.003) down = true; }
  if (!moves) return renderTDcore(P, spec, stats);
  // (v6 : Mat, à l'écoute A/B de la v5.9 — « A, grains, sans hésiter » : la transposition reste aux grains ; le banc ne sert
  // plus que sur demande, __HBP = true)
  if (globalThis.__HBP === true) return renderTDbank(P, spec, stats);
  if (!down || globalThis.__AIR === false) return renderTDcore(P, spec, stats);
  return renderTDair(P, spec, stats);
}
// L'AIR DES GRAINS (v6) — transposés vers le bas, les grains n'ont plus rien au-dessus de r × 24 kHz : la source y est relue plus
// lentement, son haut du spectre descend et rien ne le remplace. Mesuré sur le banc d'écoute v5.9 (grains, corps gardé) : à −12
// demi-tons, 12–16 kHz −15 à −50 dB et 16–20 kHz −15 à −85 dB sous l'original (voix, clarinette, trompette, la double, violoncelle),
// à −5, 16–20 kHz −6 à −10 dB. Le haut de bande est pris à la même géométrie SANS transposition (souffle, bruit d'archet, air de
// la pièce n'ont pas de hauteur ; corps gardé, son niveau y est déjà le bon), entré en 1/3 d'octave sous la coupure des grains
// (0,92 × r × 24 kHz). Il suit la part du corps gardée : entier pour un corps gardé (sb = 1), rien pour un corps qui suit la
// hauteur (sb = r : un instrument géant n'a pas d'aigus).
function renderTDair (P, spec, stats) {
  const td = prepareTD(P), sr = P.sr, D = spec.D;
  const w = renderTDcore(P, { ...spec, __geo: true }, stats);
  const g1 = renderTDcore(P, { ...spec, r: undefined, sb: undefined, __geo: true });
  const rAt = t => (spec.r ? spec.r(t) : 1), sbAt = t => (spec.sb ? spec.sb(t) : 1), o3 = Math.pow(2, -1 / 3);
  const [hL, hR] = tvFilter([g1.L, g1.R], D, (db, tc) => {
    const r = rAt(tc), sb = sbAt(tc), kept = r < 0.995 ? clampN(Math.log(sb / r) / Math.log(1 / r), 0, 1) : 0;
    if (kept < 1e-3) { db.fill(-120); return true; }
    const fc = 0.92 * 0.5 * sr * r, f0 = fc * o3;
    for (let q = 0; q < BF; ++q) { const f = q * sr / NF; const u = f <= f0 ? 0 : f >= fc ? 1 : (Math.log(f / f0) / Math.log(fc / f0)); const g = kept * (0.5 - 0.5 * Math.cos(Math.PI * u)); db[q] = 20 * Math.log10(Math.max(1e-6, g)); }
    return true;
  }, 512);
  const yL = new Float64Array(D), yR = new Float64Array(D);
  for (let i = 0; i < D; ++i) { yL[i] = w.L[i] + hL[i]; yR[i] = w.R[i] + hR[i]; }
  if (stats) stats.air = true;
  finishTD(P, td, spec, yL, yR, D, w.Sp, w.rB, stats);
  return { L: yL, R: yR };
}
function renderTDbank (P, spec, stats) {
  const D = spec.D, G = 32, nb = Math.ceil(D / G) + 2;
  if (!((P.voicedShare ?? 1) > 0.05)) return renderTDcore(P, spec, stats);
  const td = prepareTD(P), sr = P.sr, tA = Date.now();
  const g1 = renderTDcore(P, { ...spec, r: undefined, sb: undefined, __geo: true }); // la géométrie seule
  const srcB = Array.from({ length: nb }, (_, b) => { const sp = g1.Sp[Math.min(D - 1, b * G)]; return isNaN(sp) ? null : sp; });
  const rB = new Float64Array(nb), sbB = new Float64Array(nb);
  for (let b = 0; b < nb; ++b) { const t = Math.min(D - 1, b * G); rB[b] = spec.r ? spec.r(t) : 1; sbB[b] = spec.sb ? spec.sb(t) : 1; }
  const cls = classifyBank(D, sr, G, srcB, rB, sbB, td);
  if (!cls) return renderTDcore(P, spec, stats);
  // le moteur à grains (transposé) n'est corrigé (corps) que là où le banc ne le remplace pas entièrement (±1024 positions)
  const needU = new Uint8Array(Math.ceil(D / 256) + 1);
  for (let i = 0; i < D; i += 64) if (cls.v[i] < 0.999) { const q = Math.floor(i / 256); for (let d = -5; d <= 5; ++d) if (q + d >= 0 && q + d < needU.length) needU[q + d] = 1; }
  const w = renderTDcore(P, { ...spec, __geo: true, __needU: t => needU[Math.min(needU.length - 1, Math.floor(t / 256))] === 1 }, stats);
  const hp = harmonicPitch(g1.L, g1.R, D, sr, G, cls, td, envelopeReader(P, td), stats);
  const yL = new Float64Array(D), yR = new Float64Array(D), v = hp.v;
  for (let i = 0; i < D; ++i) { const a = v[i]; yL[i] = a * hp.L[i] + (1 - a) * w.L[i]; yR[i] = a * hp.R[i] + (1 - a) * w.R[i]; }
  if (globalThis.__TIMES) globalThis.__TIMES.push(['hbp', Date.now() - tA]);
  if (stats) { stats.hbPitchShare = hp.share; stats.hbPitchPartials = hp.used; }
  finishTD(P, td, spec, yL, yR, D, w.Sp, w.rB, stats);
  return { L: yL, R: yR };
}
function classifyBank (D, sr, G, srcB, rB, sbB, td) {
  const nb = Math.ceil(D / G), nd = nb + 1;
  // blocs du banc : voisés, une seule série, loin des attaques raides (−12 à +35 ms de la position source)
  const ons = td.onsets, A0 = 0.012 * sr, A1 = 0.035 * sr, Fb = new Float64Array(nd), vb = new Uint8Array(nd), sB = new Array(nd), rr = new Float64Array(nd), sbb = new Float64Array(nd);
  const firstAtLeast = x => { let lo = 0, hi = ons.length; while (lo < hi) { const m = (lo + hi) >> 1; if (ons[m] < x) lo = m + 1; else hi = m; } return lo; };
  let nv = 0;
  for (let j = 0; j < nd; ++j) {
    const s = srcB[Math.min(nb - 1, j)]; sB[j] = s; rr[j] = rB[Math.min(rB.length - 1, j)] || 1; sbb[j] = sbB[Math.min(sbB.length - 1, j)] || 1;
    if (s === null) continue;
    const F = td.hbAt(s); if (!(F > 20) || td.polyAt(s)) continue;
    const i = firstAtLeast(s - A1); if (i < ons.length && ons[i] <= s + A0) continue;
    // une transposition nulle n'a rien à faire ici
    if (Math.abs(rr[j] - 1) < 1e-4 && Math.abs(sbb[j] - 1) < 1e-4) continue;
    Fb[j] = F; vb[j] = 1; nv++;
  }
  // les changements de note (> 50 c d'un bloc à l'autre) et les sauts de la lecture vont aussi aux grains (−8 / +12 ms) : le
  // banc y redémarrerait ses enveloppes (mesuré : des clics au raccord, clarinette basse liée, 12 à 21 fois le niveau de fond)
  { const B0 = Math.round(0.008 * sr / G), B1 = Math.round(0.012 * sr / G), cut = new Uint8Array(nd);
    for (let j = 1; j < nd; ++j) {
      const s0 = sB[j - 1], s1 = sB[j]; if (s0 === null || s1 === null) continue;
      const step = s1 - s0, F0 = td.hbAt(s0), F1 = td.hbAt(s1);
      if (step < -4 || step > 4 * G || (F0 > 20 && F1 > 20 && Math.abs(1200 * Math.log2(F1 / F0)) > 50)) for (let d = -B0; d <= B1; ++d) if (j + d >= 0 && j + d < nd) cut[j + d] = 1;
    }
    for (let j = 0; j < nd; ++j) if (cut[j] && vb[j]) { vb[j] = 0; nv--; } }
  if (nv < 0.03 * nd) return null;
  // poids du banc : rampes de 8 ms, nul hors des blocs voisés (le relais avec les grains se fait à l'intérieur)
  const ramp = Math.max(1, Math.round(0.008 * sr / G)), vB = new Float64Array(nd);
  // le poids du banc ne s'ouvre qu'à 4 blocs (2,7 ms) à l'intérieur d'une plage : les partiels y sont déjà établis (sinon ils
  // naissaient en un bloc, 0,7 ms, et la rampe en laissait passer le début — mesuré : des clics à −22 dB aux entrées du banc)
  const vbE = new Uint8Array(nd), E4 = 4;
  for (let j = 0; j < nd; ++j) { let ok = vb[j] === 1; for (let d = 1; d <= E4 && ok; ++d) if ((j - d >= 0 && !vb[j - d]) || (j + d < nd && !vb[j + d])) ok = false; vbE[j] = ok ? 1 : 0; }
  { let w = 0; for (let j = 0; j < nd; ++j) { w += clampN(vbE[j] - w, -1 / ramp, 1 / ramp); vB[j] = w; } w = 0; for (let j = nd - 1; j >= 0; --j) { w += clampN(vbE[j] - w, -1 / ramp, 1 / ramp); vB[j] = Math.min(vB[j], w); } }
  const v = new Float32Array(D); for (let i = 0; i < D; ++i) { const x = i / G, j = Math.min(nd - 2, Math.floor(x)), u = x - j; v[i] = vB[j] * (1 - u) + vB[j + 1] * u; }
  // SEGMENTS : le lissage des enveloppes de partiels ne traverse ni une attaque, ni un changement de note (> 50 c), ni un saut
  // de la lecture — sinon l'énergie d'après déborde en avant (mesuré : pré-écho de la trompette de −63 à −31 dB, et −161 à
  // −45 dB sur la mélodie de synthèse, notes liées)
  const seg = new Uint8Array(nd);
  for (let j = 1; j < nd; ++j) {
    const s0 = sB[j - 1], s1 = sB[j];
    if (s0 === null || s1 === null || !vb[j] || !vb[j - 1]) { seg[j] = 1; continue; }
    const step = s1 - s0; if (step < -4 || step > 4 * G) { seg[j] = 1; continue; }
    if (Fb[j - 1] > 0 && Fb[j] > 0 && Math.abs(1200 * Math.log2(Fb[j] / Fb[j - 1])) > 50) { seg[j] = 1; continue; }
    const i = firstAtLeast(Math.min(s0, s1)); if (i < ons.length && ons[i] <= Math.max(s0, s1)) seg[j] = 1;
  }
  return { Fb, vb, sB, rr, sbb, nv, v, seg };
}
function harmonicPitch (yL, yR, D, sr, G, cls, td, envAt, stats) {
  const nb = Math.ceil(D / G), nd = nb + 1, srD = sr / G, FA = Math.min(0.45 * sr, 16000), FS = 0.45 * sr;
  const { Fb, vb, sB, rr, sbb, nv, v, seg } = cls;
  // la voie latérale compte-t-elle ? (un son mono rangé en stéréo : un seul passage, sur la voie centrale)
  let eM = 0, eS = 0; for (let i = 0; i < D; i += 4) { const m = yL[i] + yR[i], d = yL[i] - yR[i]; eM += m * m; eS += d * d; }
  const stereo = eS > 1e-5 * eM;
  const ch = stereo ? [yL, yR] : [Float64Array.from(yL, (x, i) => 0.5 * (x + yR[i]))], NC = ch.length;
  // NIVEAU DE CHAQUE PARTIEL — trames de 4096 (Hann) toutes les 512 positions de sortie sur la voie centrale ; l'énergie à ±0,3·f0
  // autour de k·f0 ; par bloc, interpolée entre trames (dB). Sert au corps (ci-dessous) et à ne pas resynthétiser un partiel
  // à plus de 65 dB sous le plus fort (il reste dans le souffle, en place)
  const FH = 1024, NF4 = 4096, nfr = Math.ceil(D / FH) + 1, win4 = new Float64Array(NF4); for (let i = 0; i < NF4; ++i) win4[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / NF4);
  const tP0 = Date.now(), levF = new Array(nfr), re4 = new Float64Array(NF4), im4 = new Float64Array(NF4);
  for (let q = 0; q < nfr; ++q) {
    const c = q * FH, j = Math.min(nd - 1, Math.round(c / G)); let jv = -1;
    for (let d = 0; d <= 8 && jv < 0; ++d) { if (j + d < nd && vb[j + d]) jv = j + d; else if (j - d >= 0 && vb[j - d]) jv = j - d; }
    if (jv < 0) continue;
    const F = Fb[jv]; let any = false;
    for (let i = 0; i < NF4; ++i) { const t = c - NF4 / 2 + i; const x = t >= 0 && t < D ? 0.5 * (yL[t] + yR[t]) * win4[i] : 0; re4[i] = x; im4[i] = 0; if (x) any = true; }
    if (!any) continue;
    fft(re4, im4);
    const K = Math.floor(FA / F), Lv = new Float64Array(Math.max(1, K)); let mx = -400;
    for (let k = 1; k <= K; ++k) { const f = k * F * td.devAt(sB[jv], k), lo = Math.max(1, Math.floor((f - 0.3 * F) * NF4 / sr)), hi = Math.min(NF4 / 2, Math.ceil((f + 0.3 * F) * NF4 / sr)); let e = 0; for (let b = lo; b <= hi; ++b) e += re4[b] * re4[b] + im4[b] * im4[b]; Lv[k - 1] = 10 * Math.log10(e + 1e-30); mx = Math.max(mx, Lv[k - 1]); }
    for (let k = 0; k < K; ++k) Lv[k] = Math.max(Lv[k], mx - 75);
    // MOTIF DE SOURCE en dents de scie (tuyau fermé : pairs faibles) : la courbure des niveaux change de signe d'un rang à
    // l'autre (corrélation des courbures voisines < −0,4) et pèse plus de 4 dB, sur les 16 premiers rangs
    let zz = 0, z2 = 0, zc = 0; const KZ = Math.min(16, K - 1);
    for (let k = 1; k < KZ; ++k) { const za = Lv[k] - 0.5 * (Lv[k - 1] + Lv[k + 1]), zb = k + 1 < KZ ? Lv[k + 1] - 0.5 * (Lv[k] + Lv[k + 2]) : null; z2 += za * za; zc++; if (zb !== null) zz += za * zb; }
    const zig = zc >= 4 && zz / Math.max(1e-9, z2) < -0.4 && Math.sqrt(z2 / zc) > 4;
    levF[q] = { F, Lv, mx, zig };
  }
  // par bloc : le niveau (dB) du rang k et la crête de la trame (interpolés entre les deux trames voisines)
  const levAt = (j, k) => { const x = j * G / FH, q0 = Math.floor(x), u = x - q0, a = levF[q0], b = levF[Math.min(nfr - 1, q0 + 1)]; const va = a && k <= a.Lv.length ? a.Lv[k - 1] : null, vb2 = b && k <= b.Lv.length ? b.Lv[k - 1] : null; if (va === null) return vb2 === null ? -400 : vb2; if (vb2 === null) return va; return va * (1 - u) + vb2 * u; };
  const maxAt = j => { const x = j * G / FH, q0 = Math.floor(x), u = x - q0, a = levF[q0], b = levF[Math.min(nfr - 1, q0 + 1)]; if (!a) return b ? b.mx : -400; if (!b) return a.mx; return a.mx * (1 - u) + b.mx * u; };
  // LE CORPS LU SUR LES PARTIELS : la source ne montre son corps qu'à ses partiels ; leurs niveaux, interpolés d'un rang à l'autre
  // (cubique, en dB), sont l'enveloppe la plus fidèle qu'on en puisse tirer — mesuré sur des voyelles de synthèse au corps connu,
  // entre partiels : 0,2 à 1,0 dB d'erreur contre 1,0 à 3,1 dB pour l'enveloppe vraie d'une trame FFT ; sur la transposition
  // entière (16 cas), 4,1 dB d'erreur d'amplitude des partiels contre 4,6 dB
  const envP = (j, f) => {
    const F = Fb[j], x = f / F, K = Math.max(1, Math.floor(FA / F)), A = k => levAt(j, Math.max(1, Math.min(K, k)));
    if (x <= 1) return A(1);
    if (x >= K) return A(K) - 12 * Math.log2(x / K);
    const k = Math.floor(x), u = x - k, p0 = A(k - 1), p1 = A(k), p2 = A(k + 1), p3 = A(k + 2);
    return p1 + 0.5 * u * (p2 - p0 + u * (2 * p0 - 5 * p1 + 4 * p2 - p3 + u * (3 * (p1 - p2) + p3 - p0)));
  };
  const useEnvPartials = globalThis.__HBP_ENV !== 'true';
  const Eb = new Array(nd), EbAt = j => Eb[j] || (Eb[j] = envAt(sB[j]));          // (à la demande : une enveloppe vraie coûte)
  // démodulation (comme harmonicBank) : noyau triangle, passe-bas aller-retour 0,2·f0 (8–60 Hz) à la cadence des blocs
  const LH = 2 * G - 1, CH = G - 1, hk = new Float64Array(LH); for (let n = 0; n < LH; ++n) hk[n] = (G - Math.abs(n - (G - 1))) / (G * G);
  const bq = Array.from({ length: nd }, (_, j) => { const F = Fb[j], fc = F > 20 ? clampN(0.2 * F, 8, 60) : 20, K = Math.tan(Math.PI * fc / srD), nm = 1 / (1 + Math.SQRT2 * K + K * K); return [K * K * nm, 2 * K * K * nm, K * K * nm, 2 * (K * K - 1) * nm, (1 - Math.SQRT2 * K + K * K) * nm]; });
  // passe-bas aller-retour PAR SEGMENT, chaque passe partant de l'état stationnaire de sa première valeur (aucun départ à zéro)
  const segStarts = []; for (let j = 0; j < nd; ++j) if (j === 0 || seg[j]) segStarts.push(j); segStarts.push(nd);
  const lpFB = X => {
    for (let q = 0; q + 1 < segStarts.length; ++q) {
      const a = segStarts[q], b = segStarts[q + 1];
      let x1 = X[a], x2 = X[a], y1 = X[a], y2 = X[a];
      for (let j = a; j < b; ++j) { const c = bq[j], x = X[j], y = c[0] * x + c[1] * x1 + c[2] * x2 - c[3] * y1 - c[4] * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; X[j] = y; }
      x1 = x2 = y1 = y2 = X[b - 1];
      for (let j = b - 1; j >= a; --j) { const c = bq[j], x = X[j], y = c[0] * x + c[1] * x1 + c[2] * x2 - c[3] * y1 - c[4] * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; X[j] = y; }
    }
  };
  const cs = new Float64Array(D), sn = new Float64Array(D), cs2 = new Float64Array(D), sn2 = new Float64Array(D);
  const wB = new Float64Array(nd), w2 = new Float64Array(nd), on = new Uint8Array(nd), on2 = new Uint8Array(nd), proc = new Uint8Array(nd);
  const zr = new Float64Array(nd), zi = new Float64Array(nd), er = new Float64Array(nd), ei = new Float64Array(nd), gk = new Float64Array(nd);
  const H = ch.map(() => new Float64Array(D)), Pp = ch.map(() => new Float64Array(D));
  // les blocs à traiter pour un rang : ses blocs actifs et 64 blocs (43 ms) de part et d'autre (le passe-bas aller-retour s'y
  // établit) ; ailleurs, ni porteuse, ni démodulation
  const MB = 64;
  const markProc = () => { proc.fill(0); let last = -1e9; for (let j = 0; j < nd; ++j) { if (on[j]) last = j; if (j - last <= MB) proc[j] = 1; } last = 1e9; for (let j = nd - 1; j >= 0; --j) { if (on[j]) last = j; if (last - j <= MB) proc[j] = 1; } };
  const carrier = (W, C, S) => { let phi = 0; for (let j = 0; j < nb; ++j) { const i0 = j * G, i1 = Math.min(D, i0 + G), w = W[j]; if (proc[j] || proc[Math.min(nd - 1, j + 1)]) { const cw = Math.cos(w), sw = Math.sin(w); let c = Math.cos(phi), s2 = Math.sin(phi); for (let i = i0; i < i1; ++i) { C[i] = c; S[i] = s2; const c2 = c * cw - s2 * sw; s2 = s2 * cw + c * sw; c = c2; } } phi += (i1 - i0) * w; phi -= 2 * Math.PI * Math.floor(phi / (2 * Math.PI)); } };
  const upMod = (Er, Ei, C, S, acc) => {
    for (let j = 0; j < nb; ++j) {
      const j0 = Math.max(0, j - 1), j2 = Math.min(nd - 1, j + 1), j3 = Math.min(nd - 1, j + 2);
      if (Er[j0] === 0 && Er[j] === 0 && Er[j2] === 0 && Er[j3] === 0 && Ei[j0] === 0 && Ei[j] === 0 && Ei[j2] === 0 && Ei[j3] === 0) continue;
      const i0 = j * G, i1 = Math.min(D, i0 + G);
      const ar = -0.5 * Er[j0] + 1.5 * Er[j] - 1.5 * Er[j2] + 0.5 * Er[j3], br = Er[j0] - 2.5 * Er[j] + 2 * Er[j2] - 0.5 * Er[j3], cr = -0.5 * Er[j0] + 0.5 * Er[j2], d0r = Er[j];
      const ai = -0.5 * Ei[j0] + 1.5 * Ei[j] - 1.5 * Ei[j2] + 0.5 * Ei[j3], bi = Ei[j0] - 2.5 * Ei[j] + 2 * Ei[j2] - 0.5 * Ei[j3], ci = -0.5 * Ei[j0] + 0.5 * Ei[j2], d0i = Ei[j];
      for (let i = i0; i < i1; ++i) { const u = (i - i0) / G, vr = ((ar * u + br) * u + cr) * u + d0r, vi = ((ai * u + bi) * u + ci) * u + d0i; acc[i] += 2 * (vr * C[i] - vi * S[i]); }
    }
  };
  // MOTIF DE SOURCE : quand les niveaux des partiels vont en dents de scie (pairs faibles d'un tuyau fermé), ce motif appartient
  // à la source et doit bouger avec la hauteur — l'enveloppe vraie (ordre 0,25·sr/f0, qui épouse les sommets à l'échelle de 4
  // partiels) le laisse en structure fine ; sinon les niveaux interpolés suivent mieux un formant étroit entre deux partiels.
  // Mesuré (clarinette de synthèse à pairs −14 dB, +5 / +7) : 6,9 / 8,2 dB d'erreur avec les niveaux, 2,3 / 3,5 dB avec
  // l'enveloppe vraie ; (voyelles) l'inverse
  const zigAt = j => { const x = j * G / FH, q0 = Math.round(x), a = levF[Math.min(nfr - 1, q0)]; return a ? a.zig : false; };
  const tP1 = Date.now(); let used = 0, Fmin = Infinity, nProc = 0; for (let j = 0; j < nd; ++j) if (vb[j]) Fmin = Math.min(Fmin, Fb[j]);
  const KM = Math.min(320, Math.floor(FA / Fmin));
  for (let k = 1; k <= KM; ++k) {
    let any = false;
    for (let j = 0; j < nd; ++j) {
      on[j] = 0; on2[j] = 0; wB[j] = 0; w2[j] = 0;
      if (!vb[j]) continue;
      const f = k * Fb[j] * td.devAt(sB[j], k); if (!(f < FA)) continue;
      if (levAt(j, k) < maxAt(j) - 65) continue;                     // trop faible : il reste dans le souffle
      wB[j] = 2 * Math.PI * f / sr; on[j] = 1; any = true;
      const fo = rr[j] * f; if (fo < FS) { on2[j] = 1; w2[j] = rr[j] * wB[j]; }
    }
    if (!any) continue; used = k;
    // hors des blocs actifs la fréquence est tenue (la démodulation continue sans saut)
    for (let j = 1; j < nd; ++j) { if (!wB[j]) wB[j] = wB[j - 1]; if (!w2[j]) w2[j] = w2[j - 1]; }
    for (let j = nd - 2; j >= 0; --j) { if (!wB[j]) wB[j] = wB[j + 1]; if (!w2[j]) w2[j] = w2[j + 1]; }
    markProc(); for (let j = 0; j < nd; ++j) nProc += proc[j];
    carrier(wB, cs, sn); carrier(w2, cs2, sn2);
    // gain du corps pour ce rang, par bloc : E(f'/sb) − E(f'/r), f' = r·f ; jamais de gain là où la source n'a rien
    for (let j = 0; j < nd; ++j) {
      if (!on2[j]) { gk[j] = 0; continue; }
      const f = wB[j] * sr / (2 * Math.PI), fo = rr[j] * f;
      let d;
      if (useEnvPartials && !zigAt(j)) d = envP(j, fo / sbb[j]) - envP(j, f);
      else { const E = EbAt(j), have = E(f); d = E(fo / sbb[j]) - have; if (d > 0 && have < E.max - 80) d = 0; }
      gk[j] = Math.pow(10, clampN(d, -30, 24) / 20);
    }
    for (let c = 0; c < NC; ++c) {
      const y = ch[c];
      for (let j = 0; j < nd; ++j) {
        if (!proc[j]) { zr[j] = 0; zi[j] = 0; continue; }
        const t0 = j * G - CH, n0 = Math.max(0, -t0), n1 = Math.min(LH, D - t0); let a1 = 0, a2 = 0;
        for (let n = n0; n < n1; ++n) { const i = t0 + n, h = hk[n] * y[i]; a1 += h * cs[i]; a2 -= h * sn[i]; }
        zr[j] = a1; zi[j] = a2;
      }
      lpFB(zr); lpFB(zi);
      for (let j = 0; j < nd; ++j) if (!on[j]) { zr[j] = 0; zi[j] = 0; }
      upMod(zr, zi, cs, sn, H[c]);
      // la dérive de phase propre du partiel, × r : Ψ'(j) = Ψ'(j−1) + r·arg(z_j·z̄_{j−1}) ; au début d'une plage, la phase relevée
      let ph = 0, prev = false;
      for (let j = 0; j < nd; ++j) {
        if (!on2[j]) { er[j] = 0; ei[j] = 0; prev = false; continue; }
        const m = Math.hypot(zr[j], zi[j]);
        if (!prev) ph = Math.atan2(zi[j], zr[j]);
        else { const dre = zr[j] * zr[j - 1] + zi[j] * zi[j - 1], dim = zi[j] * zr[j - 1] - zr[j] * zi[j - 1]; ph += rr[j] * Math.atan2(dim, dre); }
        prev = true;
        const a = m * gk[j]; er[j] = a * Math.cos(ph); ei[j] = a * Math.sin(ph);
      }
      upMod(er, ei, cs2, sn2, Pp[c]);
    }
  }
  const tP2 = Date.now();
  // le reste (souffle, bruit d'archet, résidu de séparation) : en place, sous le corps seulement (E(f/sb) − E(f))
  const src = [yL, yR], N = [new Float64Array(D), new Float64Array(D)];
  for (let c = 0; c < 2; ++c) { const Hc = H[Math.min(NC - 1, c)]; for (let i = 0; i < D; ++i) N[c][i] = src[c][i] - Hc[i]; }
  let body = false; for (let j = 0; j < nd; ++j) if (vb[j] && Math.abs(sbb[j] - 1) > 1e-3) { body = true; break; }
  let NL = N[0], NR = N[1];
  if (body) [NL, NR] = tvFilter(N, D, (db, tc) => {
    const j = Math.min(nd - 1, Math.round(tc / G)); if (!vb[j] || Math.abs(sbb[j] - 1) <= 1e-3) return false;
    const E = EbAt(j);
    for (let q = 0; q < BF; ++q) { const f = Math.max(1, q * sr / NF), have = E(f); let d = E(f / sbb[j]) - have; if (d > 0 && have < E.max - 80) d = 0; db[q] = clampN(d, -24, 24); }
    return true;
  }, 512);
  if (globalThis.__HBP_DBG) globalThis.__HBP_DBG.push({ y: yL, H: H[0], N: N[0], P: Pp[0], Fb, vb, G });
  const oL = new Float64Array(D), oR = new Float64Array(D), PL = Pp[0], PR = Pp[Math.min(NC - 1, 1)];
  for (let i = 0; i < D; ++i) { oL[i] = PL[i] + NL[i]; oR[i] = PR[i] + NR[i]; }
  if (stats) stats.hbPitchBlocks = nProc / Math.max(1, used);
  if (globalThis.__TIMES) globalThis.__TIMES.push(['hbp-parts', tP1 - tP0, tP2 - tP1, Date.now() - tP2, NC, Math.round(nProc / Math.max(1, used)), nd]);
  return { L: oL, R: oR, v, used, share: nv / nd };
}
// ------------------------------------------------------------------------------------------ banc harmonique temporel
// Chaque partiel de la note — k·f0 de sortie × son écart propre mesuré — est DÉMODULÉ (le signal multiplié par
// e^{−iφ_k}, φ_k suivant la hauteur échantillon par échantillon, vibrato compris) puis lissé par un passe-bas de Butterworth
// appliqué ALLER ET RETOUR (phase nulle : aucun retard, aucune rotation de phase, quel que soit l'écart de suivi) ;
// p_k = 2·Re(z_k·e^{iφ_k}) est le partiel lui-même, vivant, sans trame FFT. Le reste N = y − Σ p_k est le souffle, le
// bruit d'archet, les transitoires. Opérations, toutes par différence (rien ne change là où elles ne demandent rien) :
//   • gains par rang (spec.partial sans déplacement) : y += (g_k − 1)·p_k ;
//   • partage partiel / souffle (spec.lobeFloor [dB partiel, dB souffle, transfert]) : y = g_L·H + N', N' = le VRAI souffle
//     relevé, mis en forme (filtre à phase minimale) pour recevoir l'énergie cédée par les partiels ; spec.envNoise y
//     ajoute son filtre ;
//   • inertie du corps (spec.inertia {att, rel}) : l'amplitude de chaque partiel monte en att au plus vite ; quand il
//     faiblit plus vite que le corps ne se tait (décroissance rel), sa résonance continue de sonner, à sa fréquence et dans
//     sa phase ; un changement de note (> 50 c) laisse sonner l'ancienne résonance sans la transposer.
function harmonicBank (yL, yR, D, sr, G, Fo, srcOf, devAt, spec, stats) {
  // l'enveloppe complexe de chaque partiel vit au rythme des blocs (G = 32 : 1 500 Hz à 48 kHz, bien au-dessus de sa
  // largeur de bande ≤ 60 Hz) : démodulation pleine cadence, décimation par un noyau symétrique (triangle), passe-bas aller-retour
  // à la cadence des blocs, puis retour pleine cadence (Catmull-Rom) de ce qui CHANGE seulement
  // rangs jusqu'à 128, sous 0,45·sr et 16 kHz
  // (v6, inertie C : les rangs montent jusqu'à 20 kHz quand le corps résonne — l'inertie du banc laissait le haut du spectre
  // au souffle coupé par le joueur : 16–20 kHz −6 à −10 dB sous l'étage FFT, mesuré en staccato)
  const IC = !!spec.inertia && globalThis.__INERTIA_C !== false;
  const KM = IC ? 192 : 128, FMAX = Math.min(0.45 * sr, IC ? 20000 : 16000), nb = Math.ceil(D / G), lf = spec.lobeFloor, inert = spec.inertia, pg = spec.partial, br = spec.breath, needH = !!(lf || spec.envNoise || br);
  let pkIn = 0; for (let i = 0; i < D; ++i) pkIn = Math.max(pkIn, Math.abs(yL[i]), Math.abs(yR[i]));
  const silent = 1e-4 * pkIn;   // −80 dB de la crête : une résonance plus faible ne part pas
  const ch = [yL, yR], out = [Float64Array.from(yL), Float64Array.from(yR)], H = needH ? [new Float64Array(D), new Float64Array(D)] : null;
  const nd = nb + 1, srD = sr / G;
  // transfert partiel → souffle demandé quelque part ? (puissance de chaque partiel par bloc, gardée pour le façonner)
  let needT = false; if (lf) for (let q = 0; q <= 64 && !needT; ++q) { const l = lf(Math.min(D - 1, Math.round(q * (D - 1) / 64))); if ((l[2] || 0) > 0 && (l[0] || 0) < 0) needT = true; }
  const PZ = needT || br ? [[], []] : null, FZ = needT || br ? [[], []] : null, Z1 = br ? [] : null;
  // noyau de décimation : triangle de 2G − 1 points (zéros doubles sur les multiples de sr/G : ce qui s'y replierait à
  // moins de 60 Hz du continu est à −56 dB, sous le résidu de séparation), centré, somme 1
  const LH = 2 * G - 1, CH = G - 1, hk = new Float64Array(LH);
  for (let n = 0; n < LH; ++n) hk[n] = (G - Math.abs(n - (G - 1))) / (G * G);
  // par bloc : coupure du passe-bas (0,2·f0, de 8 à 60 Hz) à la cadence des blocs
  const bq = Array.from({ length: nd }, (_, j) => { const F = Fo[Math.min(nb - 1, j)], fc = F > 20 ? clampN(0.2 * F, 8, 60) : 20, K = Math.tan(Math.PI * fc / srD), nm = 1 / (1 + Math.SQRT2 * K + K * K); return [K * K * nm, 2 * K * K * nm, K * K * nm, 2 * (K * K - 1) * nm, (1 - Math.SQRT2 * K + K * K) * nm]; });
  const lpFB = X => {
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let j = 0; j < nd; ++j) { const c = bq[j], x = X[j], y = c[0] * x + c[1] * x1 + c[2] * x2 - c[3] * y1 - c[4] * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; X[j] = y; }
    x1 = x2 = y1 = y2 = 0;
    for (let j = nd - 1; j >= 0; --j) { const c = bq[j], x = X[j], y = c[0] * x + c[1] * x1 + c[2] * x2 - c[3] * y1 - c[4] * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; X[j] = y; }
  };
  const srcB = Array.from({ length: nb }, (_, b) => srcOf(b));
  const rampB = Math.max(1, Math.round(0.01 * sr / G));
  const its = inert ? Array.from({ length: nd }, (_, j) => inert(Math.min(D - 1, j * G))) : null;
  const cs = new Float64Array(D), sn = new Float64Array(D), phB = new Float64Array(nd), wB = new Float64Array(nd), aB = new Float64Array(nd);
  const xr = new Float64Array(D), xi = new Float64Array(D), zr = new Float64Array(nd), zi = new Float64Array(nd), dr = new Float64Array(nd), di = new Float64Array(nd);
  // retour pleine cadence d'une enveloppe (Catmull-Rom) modulée par la porteuse : acc[i] += 2·Re(e(i)·e^{iφ(i)})
  const upMod = (er, ei, acc) => {
    for (let j = 0; j < nb; ++j) {
      const j0 = Math.max(0, j - 1), j2 = Math.min(nd - 1, j + 1), j3 = Math.min(nd - 1, j + 2);
      if (er[j0] === 0 && er[j] === 0 && er[j2] === 0 && er[j3] === 0 && ei[j0] === 0 && ei[j] === 0 && ei[j2] === 0 && ei[j3] === 0) continue;
      const i0 = j * G, i1 = Math.min(D, i0 + G);
      const ar = -0.5 * er[j0] + 1.5 * er[j] - 1.5 * er[j2] + 0.5 * er[j3], br = er[j0] - 2.5 * er[j] + 2 * er[j2] - 0.5 * er[j3], cr = -0.5 * er[j0] + 0.5 * er[j2], d0r = er[j];
      const ai = -0.5 * ei[j0] + 1.5 * ei[j] - 1.5 * ei[j2] + 0.5 * ei[j3], bi = ei[j0] - 2.5 * ei[j] + 2 * ei[j2] - 0.5 * ei[j3], ci = -0.5 * ei[j0] + 0.5 * ei[j2], d0i = ei[j];
      for (let i = i0; i < i1; ++i) { const u = (i - i0) / G, vr = ((ar * u + br) * u + cr) * u + d0r, vi = ((ai * u + bi) * u + ci) * u + d0i; acc[i] += 2 * (vr * cs[i] - vi * sn[i]); }
    }
  };
  let used = 0;
  for (let k = 1; k <= KM; ++k) {
    // fréquence du partiel k par bloc (écart propre mesuré) ; actif là où la note existe et sous 0,45·sr
    const on = new Uint8Array(nd); let any = false;
    for (let j = 0; j < nd; ++j) { const b = Math.min(nb - 1, j), F = Fo[b]; if (F > 20 && k * F < FMAX) { const s = srcB[b]; wB[j] = 2 * Math.PI * k * F * (s !== null ? devAt(s, k) : 1) / sr; on[j] = 1; any = true; } else wB[j] = 0; }
    if (!any) continue; used = k;
    // hors de la note, la fréquence est tenue (la démodulation continue sans saut) ; activité en rampes de 10 ms
    { for (let j = 1; j < nd; ++j) if (!on[j] && wB[j - 1]) wB[j] = wB[j - 1]; for (let j = nd - 2; j >= 0; --j) if (!wB[j]) wB[j] = wB[j + 1];
      let w = 0; for (let j = 0; j < nd; ++j) { w += clampN(on[j] - w, -1 / rampB, 1 / rampB); aB[j] = w; } w = aB[nd - 1]; for (let j = nd - 1; j >= 0; --j) { w += clampN(on[j] - w, -1 / rampB, 1 / rampB); aB[j] = Math.min(aB[j], w); } }
    // porteuse e^{iφ} : valeur exacte en tête de bloc, rotation récurrente dans le bloc
    { let phi = 0; for (let j = 0; j < nb; ++j) { const i0 = j * G, i1 = Math.min(D, i0 + G), w = wB[j], cw = Math.cos(w), sw = Math.sin(w); let c = Math.cos(phi), s2 = Math.sin(phi); phB[j] = phi;
        for (let i = i0; i < i1; ++i) { cs[i] = c; sn[i] = s2; const c2 = c * cw - s2 * sw; s2 = s2 * cw + c * sw; c = c2; }
        phi += (i1 - i0) * w; phi -= 2 * Math.PI * Math.floor(phi / (2 * Math.PI)); } phB[nb] = phi; }
    // gains du rang k aux bords de bloc
    let gk = null;
    if (pg) { gk = new Float64Array(nd); for (let j = 0; j < nd; ++j) { const t = Math.min(D - 1, j * G), F = Fo[Math.min(nb - 1, j)]; if (!(F > 20)) { gk[j] = 1; continue; } const o = pg(k, k * F, t, F); gk[j] = o ? Math.pow(10, (o[1] || 0) / 20) : 0; } }
    for (let c = 0; c < 2; ++c) {
      const y = ch[c], o = out[c];
      for (let i = 0; i < D; ++i) { xr[i] = y[i] * cs[i]; xi[i] = -y[i] * sn[i]; }
      for (let j = 0; j < nd; ++j) { const t0 = j * G - CH, n0 = Math.max(0, -t0), n1 = Math.min(LH, D - t0); let a1 = 0, a2 = 0; for (let n = n0; n < n1; ++n) { const h = hk[n]; a1 += h * xr[t0 + n]; a2 += h * xi[t0 + n]; } zr[j] = a1; zi[j] = a2; }
      lpFB(zr); lpFB(zi);
      // la part « partiel » de la note : zz = a·z
      for (let j = 0; j < nd; ++j) { zr[j] *= aB[j]; zi[j] *= aB[j]; }
      if (PZ) { const pz = new Float32Array(nd), fz = new Float32Array(nd); for (let j = 0; j < nd; ++j) { pz[j] = 2 * (zr[j] * zr[j] + zi[j] * zi[j]); fz[j] = aB[j] > 0 ? wB[j] * sr / (2 * Math.PI) : 0; } PZ[c][k - 1] = pz; FZ[c][k - 1] = fz; }
      if (H) upMod(zr, zi, H[c]);
      if (Z1 && k === 1) Z1[c] = { zr: Float64Array.from(zr), zi: Float64Array.from(zi), ph: Float64Array.from(phB), w: Float64Array.from(wB) };
      if (spec.__split && k === 1) { (spec.__split.z1 || (spec.__split.z1 = []))[c] = { zr: Float64Array.from(zr), zi: Float64Array.from(zi), ph: Float64Array.from(phB), w: Float64Array.from(wB) }; }
      if (spec.__split && k <= 48) { const A = spec.__split.amp || (spec.__split.amp = []); if (!A[k - 1]) A[k - 1] = new Float32Array(nd); const ak = A[k - 1]; for (let j = 0; j < nd; ++j) ak[j] += 0.5 * Math.hypot(zr[j], zi[j]); }
      if (!gk && !inert) continue;
      if (!inert) { for (let j = 0; j < nd; ++j) { const g = gk[j] - 1; dr[j] = g * zr[j]; di[j] = g * zi[j]; } upMod(dr, di, o); continue; }
      // INERTIE DU CORPS. A suit l'amplitude du partiel en montant (att), au plus vite en descendant ; la résonance tenue Rm
      // s'éteint en rel. Tant que le partiel vit (au plus 12 dB sous elle), c'est LUI qui la porte (son gain la rejoint :
      // même phase, même vibrato). Plus faible, la résonance continue sur place : son enveloppe prolongée, phase et fréquence
      // vraie (porteuse + rotation de l'enveloppe) gelées au dernier instant fiable ; si le partiel remonte, il la reprend.
      // Elle ne part seule (oscillateur propre, à sa fréquence) que si la note change (f0 à plus de 50 c) ou si la porteuse
      // s'éloigne d'elle de plus de la bande du partiel — jamais à chaque creux d'amplitude (mesuré, version précédente :
      // 8 800 départs sur 2,8 s de violoncelle, des résonances empilées)
      // INERTIE C (v6, Mat : « le timbre de A avec le côté lisse de B mais sans les longues traînes ») — trois choses qu'un
      // corps réel fait et que la v5.9 ne faisait pas : (1) un aigu s'amortit plus vite qu'un grave (temps de résonance
      // × √(500 Hz / f), au moins ¼) ; (2) la résonance perd son dernier souffle plus vite : passé 30 dB sous son départ, sa
      // décroissance double, et elle s'arrête à −50 dB (la v5.9 tenait jusqu'à −60 dB au même rythme : 6,9 temps de
      // résonance, 5,9 s pour un géant) ; (3) elle ne relève pas les creux du partiel de plus de 8 dB (12 dB en v5.9 : des
      // queues de −8,6 dB sous le corps du son au lieu de −21 dB à l'étage FFT, mesuré sur le violoncelle staccato)
      const dampK = IC ? clampN(Math.sqrt(500 / Math.max(1, k * (Fo.find(x => x > 20) || 100))), 0.25, 1) : 1, holdK = IC ? 2.5 : 4, tailK = IC ? 0.0316 : 0, stopK = IC ? 3.16e-3 : 1e-3;
      let A = 0, Rm = 0, Rm0 = 0, FoRef = 0, lastW = 0, lastTh = 0, jL = -1, pzr = 0, pzi = 0, pm = 0, ring = false, rTh = 0, accR = 0, accI = 0, accE = 0, ms = 0; const osc = [], aS = 1 - Math.exp(-G / (0.02 * sr));
      const spawn = (j, amp, it) => {
        if (jL < 0 || amp <= silent) return;
        const j0 = Math.max(0, j - 1);
        osc.push({ j0, amp, w: lastW, ph: phB[Math.min(nb, jL)] + lastTh + lastW * (j0 - jL) * G, rs: it.rel > 0 ? Math.exp(-1 / (it.rel * dampK * sr)) : 0 });
        if (globalThis.__HBLOG) globalThis.__HBLOG.push([k, c, j0 * G / sr, amp, lastW * sr / (2 * Math.PI)]);
      };
      for (let j = 0; j < nd; ++j) {
        const it = its[j], Fj = Fo[Math.min(nb - 1, j)], m = Math.hypot(zr[j], zi[j]), g = gk ? gk[j] : 1;
        const ca = it.att > 0 ? 1 - Math.exp(-G / (it.att * sr)) : 1, rho0 = it.rel > 0 ? Math.exp(-G / (it.rel * dampK * sr)) : 0, rho = tailK && Rm < tailK * Rm0 ? rho0 * rho0 : rho0;
        let er = 0, ei = 0;
        // la résonance quitte la porteuse : nouvelle note, ou porteuse à plus de 0,2·f0 de sa fréquence
        if (Rm > 0 && jL >= 0 && ((FoRef > 0 && Fj > 0 && Math.abs(Fj / FoRef - 1) > 0.03) || Math.abs(wB[j] - lastW) * sr / (2 * Math.PI) > 0.2 * (FoRef || Fj || 100))) {
          // phase de la résonance au début du bloc j : celle prolongée (anneau) ou celle du partiel au dernier instant fiable
          if (ring) { lastTh = rTh; jL = j; } spawn(j, Rm, it); Rm = 0; A = 0; ring = false; pm = 0; jL = -1; FoRef = 0;
        }
        // fréquence vraie : porteuse + rotation moyenne de l'enveloppe (produits z_j·z̄_{j−1} cumulés sur ~5 ms, pondérés par
        // l'énergie : un bloc bruité ne la fait pas sauter), bornée à la bande du partiel
        if (pm > 0) { accR = 0.8 * accR + (zr[j] * pzr + zi[j] * pzi); accI = 0.8 * accI + (zi[j] * pzr - zr[j] * pzi); accE = 0.8 * accE + m * pm; } else { accR = 0; accI = 0; accE = 0; }
        const bw = 2 * Math.PI * 0.2 * (Fj || FoRef || 100) / sr;
        const wT = wB[j] + (accR || accI ? clampN(Math.atan2(accI, accR) / G, -bw, bw) : 0);
        pzr = zr[j]; pzi = zi[j]; pm = m;
        // (inertie C : l'attaque lente ne freine que l'énergie NOUVELLE, au-dessus de ce que le corps tient déjà — en v5.9 elle
        // freinait chaque fluctuation d'un partiel : un expanseur vers le bas sur les rangs bruités, 16–20 kHz −36 dB sous l'étage
        // FFT mesuré sur un violoncelle géant, les graves relevés de 13 dB par rapport au médium sur la clarinette)
        // Inertie C : (a) l'attaque lente suit l'enveloppe LISSÉE du partiel (20 ms) — en v5.9 elle suivait chaque bloc :
        // sur un rang de bruit (au-dessus des partiels, entre deux notes) elle tombait au moindre creux et remontait lentement,
        // un expanseur vers le bas (mesuré : 16–20 kHz −36 dB sous l'étage FFT sur un violoncelle géant) ; (b) seul un
        // partiel STABLE (cohérence de phase d'un bloc au suivant ≥ 0,7 : une sinusoïde ≈ 1, du bruit ≈ 0,3) se met à
        // résonner : un corps ne résonne qu'à ses modes, le souffle ne « tient » pas
        let gA;
        if (IC) { ms += aS * (m - ms); A = ms < A ? ms : A + ca * (ms - A); gA = ms > 1e-15 ? Math.min(1, A / ms) : 1; }
        else { A = m < A ? m : A + ca * (m - A); gA = m > 1e-15 ? A / m : 1; }
        const cur = m * g * gA, coh = accE > 0 ? Math.hypot(accR, accI) / accE : 0;
        let q = g * gA - 1;
        if (cur >= Rm * rho || (IC && !ring && coh < 0.7)) { Rm = cur; Rm0 = cur; ring = false; }
        else {
          Rm *= rho; if (IC && Rm < stopK * Rm0) Rm = 0;
          if (cur * holdK >= Rm && !ring) q = g * gA * Rm / Math.max(cur, 1e-30) - 1;
          else {
            // anneau sur place : la phase relative avance à l'écart entre la fréquence vraie gelée et la porteuse
            if (!ring) { ring = true; rTh = lastTh + (lastW - wB[jL >= 0 ? jL : j]) * (j - (jL >= 0 ? jL : j)) * G; } else rTh += (lastW - wB[j]) * G;
            const ra = Math.max(0, Rm - cur); er = ra * Math.cos(rTh); ei = ra * Math.sin(rTh);
          }
        }
        // hauteur de référence : seulement une hauteur STABLE (à 1 % près sur 3 blocs) — un glissando n'est pas une suite de
        // notes (mesuré : un départ de résonance à chaque bloc d'un passage 395 → 218 Hz)
        if (!ring && m > 1e-12 && cur * holdK >= Rm) { lastW = wT; lastTh = Math.atan2(zi[j], zr[j]); jL = j; const F3 = Fo[Math.max(0, Math.min(nb - 1, j - 3))]; if (Fj > 0 && F3 > 0 && Math.abs(Fj / F3 - 1) < 0.01) FoRef = Fj; }
        dr[j] = q * zr[j] + er; di[j] = q * zi[j] + ei;
      }
      upMod(dr, di, o);
      // résonances parties seules : entrée linéaire sur un bloc (relais de l'enveloppe), jusqu'à −60 dB de leur départ
      for (const O of osc) {
        const i0 = O.j0 * G; let amp = O.amp; const stop = Math.max(O.amp * stopK, silent), knee = O.amp * tailK, cw = Math.cos(O.w), sw = Math.sin(O.w); let c2 = Math.cos(O.ph), s2 = Math.sin(O.ph);
        // (inertie C : le dernier quart de la descente en fondu — elle ne s'arrête pas sur une marche)
        for (let i = i0; i < D && amp > stop; ++i) { const e = i - i0 < G ? (i - i0) / G : 1, f = IC && amp < 2 * stop ? (amp - stop) / stop : 1; o[i] += 2 * amp * e * f * c2; amp *= amp < knee ? O.rs * O.rs : O.rs; const c3 = c2 * cw - s2 * sw; s2 = s2 * cw + c2 * sw; c2 = c3; }
      }
    }
  }
  if (stats) stats.hbPartials = used;
  if (!needH) { yL.set(out[0]); yR.set(out[1]); if (stats) stats.hb = true; return; }
  if (spec.__split) spec.__split.H = H;
  // partage partiel / souffle : N = y − H (le souffle réel : souffle, archet, transitoires), Hp = out − N (les partiels après
  // leurs gains et leur inertie). y = g_L·Hp + N' + T :
  //   N' — le souffle réel, à son gain (g_F) et sous le filtre de bruit du gène (envNoise), à phase minimale ;
  //   T  — l'énergie que les partiels CÈDENT au souffle (transfert × (1 − g_L²)) : un bruit (suite de Weyl quadratique, aucune
  //        tirage ; une suite par voie) façonné, bloc par bloc, à la densité de cette énergie — chaque partiel répandu sur
  //        sa région (largeur f0), densités interpolées d'un rang à l'autre en dB : un souffle continu, sans peigne, qui garde
  //        l'enveloppe (les formants) de la note. Amplifier le souffle réel aurait rendu les résidus des partiels (−30 dB) :
  //        mesuré sur un violoncelle propre, la « voix chuchotée » rendait ses partiels intacts (−0,6 dB)
  const N = [new Float64Array(D), new Float64Array(D)], Hp = [new Float64Array(D), new Float64Array(D)];
  for (let c = 0; c < 2; ++c) for (let i = 0; i < D; ++i) { N[c][i] = ch[c][i] - H[c][i]; Hp[c][i] = out[c][i] - N[c][i]; }
  // (V6.5) the noises the bank adds (T, the breath) take the coherence between the two channels of the REAL noise N: two
  // independent sequences made a noise spread across the whole stereo field even under a mono subject, detached from the
  // instrument's image. Mixed as L = α·m + β·s, R = α·m − β·s (α² + β² = 1, α² − β² = ρ): each channel keeps its level
  // …OCTAVE PAR OCTAVE (V6.5) : la cohérence complexe γ(f) = ⟨L·R*⟩ / √(⟨|L|²⟩⟨|R|²⟩) du vrai souffle, relevée par blocs de 4096
  // (moyenne de Welch) dans neuf octaves de 63 Hz à 16 kHz, interpolée en log f : un couple de micros espacés garde le grave
  // cohérent et l'aigu décorrélé, un retard entre les voies garde sa phase. Puis, dans le spectre : G = m, D = γ*·m + √(1 − |γ|²)·s
  const OCTc = [63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000], gR = new Float64Array(9), gI = new Float64Array(9), gPL = new Float64Array(9), gPR = new Float64Array(9);
  { const NB = 4096, re1 = new Float64Array(NB), im1 = new Float64Array(NB), re2 = new Float64Array(NB), im2 = new Float64Array(NB);
    for (let a0 = 0; a0 + NB <= D; a0 += NB / 2) {
      for (let i = 0; i < NB; ++i) { const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / NB); re1[i] = N[0][a0 + i] * w; im1[i] = 0; re2[i] = N[1][a0 + i] * w; im2[i] = 0; }
      fft(re1, im1); fft(re2, im2);
      for (let q = 0; q < 9; ++q) { const k0 = Math.max(1, Math.round(OCTc[q] / Math.SQRT2 * NB / sr)), k1 = Math.min(NB / 2, Math.round(OCTc[q] * Math.SQRT2 * NB / sr));
        for (let k = k0; k < k1; ++k) { gR[q] += re1[k] * re2[k] + im1[k] * im2[k]; gI[q] += im1[k] * re2[k] - re1[k] * im2[k]; gPL[q] += re1[k] ** 2 + im1[k] ** 2; gPR[q] += re2[k] ** 2 + im2[k] ** 2; } }
    } }
  const gam = OCTc.map((_, q) => { const d = Math.sqrt(gPL[q] * gPR[q]); return d > 0 ? [gR[q] / d, gI[q] / d] : [1, 0]; });
  const rho = gam[4][0];
  const cohere = (m, s) => {
    let NN = 1; while (NN < D) NN *= 2; const mr = new Float64Array(NN), mi = new Float64Array(NN), sr2 = new Float64Array(NN), si = new Float64Array(NN);
    mr.set(m); sr2.set(s); fft(mr, mi); fft(sr2, si);
    for (let k = 0; k <= NN / 2; ++k) {
      const f = Math.max(OCTc[0], Math.min(OCTc[8], k * sr / NN)), x = Math.log2(f / OCTc[0]), q = Math.min(7, Math.floor(x)), u = x - q;
      let cr = gam[q][0] * (1 - u) + gam[q + 1][0] * u, ci = gam[q][1] * (1 - u) + gam[q + 1][1] * u; const mag = Math.hypot(cr, ci); if (mag > 1) { cr /= mag; ci /= mag; }
      const sc = Math.sqrt(Math.max(0, 1 - cr * cr - ci * ci)), ar = mr[k], ai = mi[k];
      // D = γ*·M + sc·S (γ* = cr − i·ci)
      const dr = cr * ar + ci * ai + sc * sr2[k], di = cr * ai - ci * ar + sc * si[k];
      sr2[k] = dr; si[k] = di; if (k > 0 && k < NN / 2) { sr2[NN - k] = dr; si[NN - k] = -di; }
    }
    fft(sr2, si, true); for (let i = 0; i < D; ++i) s[i] = sr2[i];
    return [m, s];
  };
  if (stats) { stats.noiseCoherence = rho; stats.noiseCoherenceOct = gam.map(g => +Math.hypot(g[0], g[1]).toFixed(2)); }
  const [nL, nR] = tvFilter(N, D, (db, tc) => {
    const l = lf ? lf(tc) : [0, 0, 0], gF = l[1] || 0;
    let any = false;
    for (let k = 0; k < BF; ++k) { let d = gF; if (spec.envNoise) d += spec.envNoise(Math.max(1, k * sr / NF), tc); db[k] = Math.max(-80, Math.min(40, d)); if (Math.abs(db[k]) > 1e-4) any = true; }
    return any;
  }, 512);
  let tL = null, tR = null;
  if (needT) {
    const HBT = 512, cedeAt = t => { const l = lf(t); return (l[2] || 0) * Math.max(0, 1 - Math.pow(10, (l[0] || 0) / 10)); };
    const on = new Uint8Array(Math.ceil(D / HBT) + 2); for (let b = 0; b < on.length; ++b) if (cedeAt(Math.min(D - 1, b * HBT)) > 0) { on[b] = 1; if (b > 0) on[b - 1] = 1; if (b + 1 < on.length) on[b + 1] = 1; }
    const noise = (a0) => { const x = new Float64Array(D); let s2 = 0.5, d = a0; for (let i = 0; i < D; ++i) { if (on[Math.floor(i / HBT)]) x[i] = (s2 - 0.5) * Math.sqrt(12); s2 += d; s2 -= Math.floor(s2); d += 2 * a0; d -= Math.floor(d); } return x; };
    // une densité pour les deux voies (leur moyenne), deux suites mêlées à la cohérence du souffle réel
    const fillT = (db, tc) => {
      const ce = cedeAt(tc), j = Math.min(nd - 1, Math.round(tc / G));
      const cen = [], den = [];
      if (ce > 0) for (let k = 0; k < PZ[0].length; ++k) { const pz = PZ[0][k], pz2 = PZ[1][k], fz = FZ[0][k]; if (!pz || !pz2 || !(fz[j] > 0)) continue; const F = fz[j] / (k + 1); cen.push(fz[j]); den.push(Math.max(1e-30, ce * 0.5 * (pz[j] + pz2[j]) / F)); }
      if (!cen.length) { db.fill(-200); return true; }
      const F0 = cen[0] / Math.max(1, Math.round(cen[0] / (cen.length > 1 ? cen[1] - cen[0] : cen[0]))), lo = cen[0] - 0.5 * F0, hi = cen[cen.length - 1] + 0.5 * (cen.length > 1 ? cen[cen.length - 1] - cen[cen.length - 2] : F0);
      let q = 0;
      for (let k = 0; k < BF; ++k) {
        const f = k * sr / NF; let dens;
        if (f < lo || f > hi) dens = 0;
        else if (f <= cen[0]) dens = den[0];
        else if (f >= cen[cen.length - 1]) dens = den[den.length - 1];
        else { while (q + 1 < cen.length && cen[q + 1] < f) q++; const u = (f - cen[q]) / (cen[q + 1] - cen[q]); dens = Math.exp((1 - u) * Math.log(den[q]) + u * Math.log(den[q + 1])); }
        let d = 10 * Math.log10(dens * sr / 2 + 1e-30); if (spec.envNoise) d += spec.envNoise(Math.max(1, f), tc);
        db[k] = Math.max(-200, Math.min(60, d));
      }
      return true;
    };
    [tL, tR] = tvFilter(cohere(noise(0.6180339887498949), noise(0.4142135623730951)), D, fillT, HBT);
  }
  const [bL, bR] = br ? breathNoise(D, sr, G, nd, PZ, FZ, Z1, H, br, stats, cohere) : [null, null];
  for (let b = 0; b * G < D; ++b) {
    const t0 = b * G, t1 = Math.min(D - 1, t0 + G), a = lf ? Math.pow(10, (lf(t0)[0] || 0) / 20) : 1, c2 = lf ? Math.pow(10, (lf(t1)[0] || 0) / 20) : 1;
    for (let i = t0; i < Math.min(D, t0 + G); ++i) { const g = a + (c2 - a) * (i - t0) / G; yL[i] = g * Hp[0][i] + nL[i] + (tL ? tL[i] : 0) + (bL ? bL[i] : 0); yR[i] = g * Hp[1][i] + nR[i] + (tR ? tR[i] : 0) + (bR ? bR[i] : 0); }
  }
  if (stats) stats.hb = true;
}
// ------------------------------------------------------------------------------------------ le souffle ajouté (V6.4)
// Gène « breath » (genetique.js, ORGANO.souffle ; relevé du sujet : breath.js). Ce que fait un souffle de vent, et donc ce
// que le banc ajoute : un bruit (suite de Weyl, aucun tirage) qui
//   • se répartit comme les partiels de la note (chaque partiel répandu sur sa région, comme le transfert du banc) et se
//     prolonge au-dessus du dernier partiel (−3 dB/oct, jusqu'à 16 kHz : c'est là qu'un souffle s'entend) ; sa part par
//     octave est celle du SOUFFLE DU SUJET (br.nhr, dB sous les partiels) relevée de br.db ;
//   • suit l'enveloppe de la note, la PRÉCÈDE à l'attaque (br.lead : le niveau est pris en avance, rampe au carré) et la
//     suit à la fin (br.tail : décroissance exponentielle) — la répartition en fréquence est alors celle des partiels qui
//     arrivent ou viennent de partir ;
//   • est PULSÉ à la période : P = 1 − M + M·(½ + ½cos(θ − ψ))² / ⅜ (moyenne 1 sur la période), θ la phase vraie du
//     fondamental (porteuse du banc + argument de son enveloppe), ψ la phase où l'onde des partiels atteint son maximum
//     (relevée par fenêtres de 43 ms) : la bouffée tombe au maximum du débit, comme le souffle relevé sur la trompette
//     (pic du bruit à 0,03 de période, maximum de l'onde à 0,97).
export function fundamentalPhase (z1, D, G) {
  const nb = z1.zr.length, th = new Float64Array(D), ok = new Uint8Array(D);
  for (let j = 0; j + 1 < nb; ++j) {
    const m = Math.hypot(z1.zr[j], z1.zi[j]); if (!(m > 1e-7)) continue;
    const a0 = Math.atan2(z1.zi[j], z1.zr[j]), m1 = Math.hypot(z1.zr[j + 1], z1.zi[j + 1]); let a1 = m1 > 1e-7 ? Math.atan2(z1.zi[j + 1], z1.zr[j + 1]) : a0;
    while (a1 - a0 > Math.PI) a1 -= 2 * Math.PI; while (a1 - a0 < -Math.PI) a1 += 2 * Math.PI;
    const i0 = j * G, i1 = Math.min(D, i0 + G);
    for (let i = i0; i < i1; ++i) { th[i] = z1.ph[j] + z1.w[j] * (i - i0) + a0 + (a1 - a0) * (i - i0) / G; ok[i] = 1; }
  }
  return { th, ok };
}
function breathNoise (D, sr, G, nd, PZ, FZ, Z1, H, br, stats, cohere = (m, s) => [m, s]) {
  const nK = PZ[0].length, Pt = new Float64Array(nd);
  for (let k = 0; k < nK; ++k) { const a = PZ[0][k], b2 = PZ[1][k]; if (!a || !b2) continue; for (let j = 0; j < nd; ++j) Pt[j] += 0.5 * (a[j] + b2[j]); }
  const leadB = Math.max(1, Math.round(br.lead * sr / G)), tailB = Math.round(3 * br.tail * sr / G), rho = Math.exp(-G / (Math.max(0.01, br.tail) * sr));
  const Lv = new Float64Array(nd);
  for (let j = 0; j < nd; ++j) { let m = Pt[j]; for (let q = 1; q <= leadB && j + q < nd; ++q) { const u = 1 - q / (leadB + 1), v = Pt[j + q] * u * u; if (v > m) m = v; } Lv[j] = m; }
  for (let j = 1; j < nd; ++j) Lv[j] = Math.max(Lv[j], Lv[j - 1] * rho);
  // le bloc qui donne la répartition : lui-même s'il sonne, sinon le premier qui sonne dans l'avance, sinon le dernier qui a sonné
  const js = new Int32Array(nd).fill(-1); let last = -1;
  for (let j = 0; j < nd; ++j) {
    if (Pt[j] > 0 && Pt[j] >= 0.05 * Lv[j]) { js[j] = j; last = j; continue; }
    if (!(Lv[j] > 0)) continue;
    let f = -1; for (let q = 1; q <= leadB && j + q < nd; ++q) if (Pt[j + q] > 0 && Pt[j + q] >= 0.05 * Lv[j]) { f = j + q; break; }
    js[j] = f >= 0 ? f : (last >= 0 && j - last <= tailB ? last : -1);
  }
  const bandOf = f => (f < 500 ? 0 : f < 1000 ? 1 : f < 2000 ? 2 : f < 4000 ? 3 : f < 8000 ? 4 : 5);
  const nhrAt = f => { const b = bandOf(f), c = [250, 750, 1500, 3000, 6000, 12000][b]; const o = f < c ? b - 1 : b + 1; if (o < 0 || o > 5) return br.nhr[b]; const co = [250, 750, 1500, 3000, 6000, 12000][o], u = Math.log2(f / c) / Math.log2(co / c); return br.nhr[b] + (br.nhr[o] - br.nhr[b]) * Math.max(0, Math.min(1, u)); };
  const fTop = Math.min(0.45 * sr, 16000);
  // le relèvement porte sur l'aigu : un tiers sous 400 Hz, entier au-dessus de 1,6 kHz (un souffle s'entend où les harmoniques
  // faiblissent ; relevé partout de la même façon, le grave de la trompette en v2 passait 4 dB au-dessus de sa fondamentale)
  const hfW = f => f <= 400 ? 0.35 : f >= 1600 ? 1 : 0.35 + 0.65 * Math.log2(f / 400) / 2;
  const fill = (db, tc) => {
    const j = Math.min(nd - 1, Math.round(tc / G)), sj = js[j];
    if (sj < 0 || !(Pt[sj] > 0) || !(Lv[j] > 0)) { db.fill(-200); return true; }
    const boost = br.db(tc), scale = Lv[j] / Pt[sj], cen = [], den = [];
    for (let k = 0; k < nK; ++k) { const pz = PZ[0][k], pz2 = PZ[1][k], fz = FZ[0][k]; if (!pz || !pz2 || !(fz[sj] > 0)) continue; const F = fz[sj] / (k + 1); cen.push(fz[sj]); den.push(Math.max(1e-30, 0.5 * (pz[sj] + pz2[sj]) / F)); }
    if (!cen.length) { db.fill(-200); return true; }
    const F0 = cen.length > 1 ? cen[1] - cen[0] : cen[0], lo = cen[0] - 0.5 * F0, hi = cen[cen.length - 1];
    let q = 0;
    for (let k = 0; k < BF; ++k) {
      const f = k * sr / NF; let dens;
      if (f < lo || f > fTop) dens = 0;
      else if (f <= cen[0]) dens = den[0];
      else if (f >= hi) dens = den[den.length - 1] * Math.pow(hi / f, 1);       // −3 dB/oct au-dessus du dernier partiel
      else { while (q + 1 < cen.length && cen[q + 1] < f) q++; const u = (f - cen[q]) / (cen[q + 1] - cen[q]); dens = Math.exp((1 - u) * Math.log(den[q]) + u * Math.log(den[q + 1])); }
      db[k] = dens > 0 ? Math.max(-200, Math.min(60, 10 * Math.log10(dens * scale * sr / 2 + 1e-30) + nhrAt(Math.max(1, f)) + boost * hfW(f))) : -200;
    }
    return true;
  };
  const on = new Uint8Array(Math.ceil(D / 512) + 2); for (let b = 0; b < on.length; ++b) { const j = Math.min(nd - 1, Math.round(b * 512 / G)); if (js[j] >= 0) { on[b] = 1; if (b > 0) on[b - 1] = 1; if (b + 1 < on.length) on[b + 1] = 1; } }
  const noise = a0 => { const x = new Float64Array(D); let s2 = 0.5, d = a0; for (let i = 0; i < D; ++i) { if (on[Math.floor(i / 512)]) x[i] = (s2 - 0.5) * Math.sqrt(12); s2 += d; s2 -= Math.floor(s2); d += 2 * a0; d -= Math.floor(d); } return x; };
  const [bL, bR] = tvFilter(cohere(noise(0.7320508075688772), noise(0.2360679774997897)), D, fill, 512);
  // pulsation à la période
  if (Z1 && Z1[0] && br.M > 0) {
    const { th, ok } = fundamentalPhase(Z1[0], D, G), W = 2048, nw = Math.ceil(D / W), BI = 16, psC = new Float64Array(nw), psS = new Float64Array(nw), psE = new Float64Array(nw);
    for (let w = 0; w < nw; ++w) {
      const fold = new Float64Array(BI), cn = new Float64Array(BI); let e = 0;
      for (let i = w * W; i < Math.min(D, (w + 1) * W); ++i) { if (!ok[i]) continue; const h = 0.5 * (H[0][i] + H[1][i]); let x = th[i] / (2 * Math.PI); x -= Math.floor(x); const q = Math.min(BI - 1, Math.floor(x * BI)); fold[q] += h; cn[q]++; e += h * h; }
      let mx = -Infinity, mq = 0; for (let q = 0; q < BI; ++q) { const v = cn[q] ? fold[q] / cn[q] : -Infinity; if (v > mx) { mx = v; mq = q; } }
      const a = 2 * Math.PI * (mq + 0.5) / BI; psC[w] = Math.cos(a); psS[w] = Math.sin(a); psE[w] = e;
    }
    const psi = new Float64Array(nw); for (let w = 0; w < nw; ++w) { let c = 0, s2 = 0; for (let q = Math.max(0, w - 2); q <= Math.min(nw - 1, w + 2); ++q) { c += psE[q] * psC[q]; s2 += psE[q] * psS[q]; } psi[w] = Math.atan2(s2, c); }
    const M = Math.max(0, Math.min(0.85, br.M));
    for (let i = 0; i < D; ++i) {
      if (!ok[i]) continue;
      const w = Math.min(nw - 1, Math.floor(i / W)), x = 0.5 + 0.5 * Math.cos(th[i] - psi[w] - 2 * Math.PI * (br.phase || 0)), p = 1 - M + M * x * x / 0.375;
      bL[i] *= p; bR[i] *= p;
    }
  }
  if (stats) stats.breath = { leadMs: leadB * G / sr * 1000, tailMs: br.tail * 1000, M: br.M };
  if (globalThis.__BREATHDBG) globalThis.__BREATHDBG.push({ Pt, Lv, js, bL: Float64Array.from(bL), G });
  return [bL, bR];
}
// ------------------------------------------------------------------------------------------ banc des cristaux (V6.3)
// Les CRISTALLISATIONS à l'échelle du son (genetique.js, cristaux) agissent partiel par partiel : chaque rang de la note
// (k·f0 de sortie × son écart propre mesuré, comme le banc harmonique) est démodulé — enveloppe complexe z_k, sa vie
// comprise —, puis rendu à sa nouvelle place :
//   • r  — sa fréquence × r : la porteuse e^{iΘ} intègre r·ω_k bloc à bloc depuis la même phase que l'originale
//          (Θ ≡ φ tant que r = 1 : aucun saut quand le cristal s'empare du partiel) ;
//   • g  — son gain (dB) ;
//   • sh — son enveloppe relue sh échantillons plus tard (> 0) ou plus tôt (< 0), sous la porteuse de l'instant : l'attaque
//          d'un partiel avancée ou retardée, sa hauteur restant celle de la note.
// y += Σ_k [p'_k − p_k] : là où le cristal ne demande rien, le son reste l'original au bit près (rang sauté entièrement).
// Au-dessus de 0,45·sr (16 kHz au plus) un partiel déplacé s'efface en 2 % de la bande.
function crystalBank (yL, yR, D, sr, G, Fo, srcOf, devAt, xb, stats) {
  const KM = 128, FMAX = Math.min(0.45 * sr, 16000), nb = Math.ceil(D / G), nd = nb + 1, srD = sr / G;
  const ch = [yL, yR], out = [Float64Array.from(yL), Float64Array.from(yR)];
  const LH = 2 * G - 1, CH = G - 1, hk = new Float64Array(LH);
  for (let n = 0; n < LH; ++n) hk[n] = (G - Math.abs(n - (G - 1))) / (G * G);
  const bq = Array.from({ length: nd }, (_, j) => { const F = Fo[Math.min(nb - 1, j)], fc = F > 20 ? clampN(0.2 * F, 8, 60) : 20, K = Math.tan(Math.PI * fc / srD), nm = 1 / (1 + Math.SQRT2 * K + K * K); return [K * K * nm, 2 * K * K * nm, K * K * nm, 2 * (K * K - 1) * nm, (1 - Math.SQRT2 * K + K * K) * nm]; });
  const lpFB = X => {
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let j = 0; j < nd; ++j) { const c = bq[j], x = X[j], y = c[0] * x + c[1] * x1 + c[2] * x2 - c[3] * y1 - c[4] * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; X[j] = y; }
    x1 = x2 = y1 = y2 = 0;
    for (let j = nd - 1; j >= 0; --j) { const c = bq[j], x = X[j], y = c[0] * x + c[1] * x1 + c[2] * x2 - c[3] * y1 - c[4] * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; X[j] = y; }
  };
  const srcB = Array.from({ length: nb }, (_, b) => srcOf(b)), rampB = Math.max(1, Math.round(0.01 * sr / G));
  const cs = new Float64Array(D), sn = new Float64Array(D), cs2 = new Float64Array(D), sn2 = new Float64Array(D);
  const wB = new Float64Array(nd), aB = new Float64Array(nd), R = new Float64Array(nd), Gn = new Float64Array(nd), Sh = new Float64Array(nd);
  const xr = new Float64Array(D), xi = new Float64Array(D), zr = new Float64Array(nd), zi = new Float64Array(nd), er = new Float64Array(nd), ei = new Float64Array(nd);
  const carrier = (w, C, S) => { let phi = 0; for (let j = 0; j < nb; ++j) { const i0 = j * G, i1 = Math.min(D, i0 + G), cw = Math.cos(w(j)), sw = Math.sin(w(j)); let c = Math.cos(phi), s2 = Math.sin(phi);
    for (let i = i0; i < i1; ++i) { C[i] = c; S[i] = s2; const c2 = c * cw - s2 * sw; s2 = s2 * cw + c * sw; c = c2; }
    phi += (i1 - i0) * w(j); phi -= 2 * Math.PI * Math.floor(phi / (2 * Math.PI)); } };
  const upMod = (Er, Ei, acc, C, S, sgn) => {
    for (let j = 0; j < nb; ++j) {
      const j0 = Math.max(0, j - 1), j2 = Math.min(nd - 1, j + 1), j3 = Math.min(nd - 1, j + 2);
      if (Er[j0] === 0 && Er[j] === 0 && Er[j2] === 0 && Er[j3] === 0 && Ei[j0] === 0 && Ei[j] === 0 && Ei[j2] === 0 && Ei[j3] === 0) continue;
      const i0 = j * G, i1 = Math.min(D, i0 + G);
      const ar = -0.5 * Er[j0] + 1.5 * Er[j] - 1.5 * Er[j2] + 0.5 * Er[j3], br = Er[j0] - 2.5 * Er[j] + 2 * Er[j2] - 0.5 * Er[j3], cr = -0.5 * Er[j0] + 0.5 * Er[j2], d0r = Er[j];
      const ai = -0.5 * Ei[j0] + 1.5 * Ei[j] - 1.5 * Ei[j2] + 0.5 * Ei[j3], bi = Ei[j0] - 2.5 * Ei[j] + 2 * Ei[j2] - 0.5 * Ei[j3], ci = -0.5 * Ei[j0] + 0.5 * Ei[j2], d0i = Ei[j];
      for (let i = i0; i < i1; ++i) { const u = (i - i0) / G, vr = ((ar * u + br) * u + cr) * u + d0r, vi = ((ai * u + bi) * u + ci) * u + d0i; acc[i] += sgn * 2 * (vr * C[i] - vi * S[i]); }
    }
  };
  // lecture d'une enveloppe (bloc fractionnaire, Catmull-Rom ; 0 hors du son)
  const readZ = (Z, p) => { if (p < 0 || p > nd - 1) return 0; const j = Math.floor(p), u = p - j, a = Z[Math.max(0, j - 1)], b = Z[j], c = Z[Math.min(nd - 1, j + 1)], d = Z[Math.min(nd - 1, j + 2)];
    return b + 0.5 * u * (c - a + u * (2 * a - 5 * b + 4 * c - d + u * (3 * (b - c) + d - a))); };
  let used = 0, touched = 0;
  for (let k = 1; k <= KM; ++k) {
    const on = new Uint8Array(nd); let any = false;
    for (let j = 0; j < nd; ++j) { const b = Math.min(nb - 1, j), F = Fo[b]; if (F > 20 && k * F < FMAX) { const s = srcB[b]; wB[j] = 2 * Math.PI * k * F * (s !== null ? devAt(s, k) : 1) / sr; on[j] = 1; any = true; } else wB[j] = 0; }
    if (!any) continue; used = k;
    { for (let j = 1; j < nd; ++j) if (!on[j] && wB[j - 1]) wB[j] = wB[j - 1]; for (let j = nd - 2; j >= 0; --j) if (!wB[j]) wB[j] = wB[j + 1];
      let w = 0; for (let j = 0; j < nd; ++j) { w += clampN(on[j] - w, -1 / rampB, 1 / rampB); aB[j] = w; } w = aB[nd - 1]; for (let j = nd - 1; j >= 0; --j) { w += clampN(on[j] - w, -1 / rampB, 1 / rampB); aB[j] = Math.min(aB[j], w); } }
    // ce que le cristal demande à ce rang, bloc par bloc
    let ident = true, move = false, shift = false;
    for (let j = 0; j < nd; ++j) {
      const F = Fo[Math.min(nb - 1, j)];
      R[j] = 1; Gn[j] = 1; Sh[j] = 0;
      if (!(F > 20) || !on[j]) continue;
      const o = xb(k, Math.min(D - 1, j * G), F);
      if (!o) { Gn[j] = 0; ident = false; continue; }
      const r = o.r ?? 1, g = o.g ?? 0, sh = o.sh ?? 0;
      R[j] = r; Gn[j] = Math.pow(10, g / 20); Sh[j] = sh / G;
      const f2 = wB[j] * r * sr / (2 * Math.PI); if (f2 > 0.98 * FMAX) Gn[j] *= clampN((FMAX - f2) / (0.02 * FMAX), 0, 1);
      if (Math.abs(r - 1) > 1e-7) move = true;
      if (Math.abs(sh) > 0.25) shift = true;
      if (move || shift || Math.abs(Gn[j] - 1) > 1e-5) ident = false;
    }
    if (ident) continue; touched++;
    carrier(j => wB[j], cs, sn);
    if (move) carrier(j => wB[j] * R[j], cs2, sn2);
    for (let c = 0; c < 2; ++c) {
      const y = ch[c], o = out[c];
      for (let i = 0; i < D; ++i) { xr[i] = y[i] * cs[i]; xi[i] = -y[i] * sn[i]; }
      for (let j = 0; j < nd; ++j) { const t0 = j * G - CH, n0 = Math.max(0, -t0), n1 = Math.min(LH, D - t0); let a1 = 0, a2 = 0; for (let n = n0; n < n1; ++n) { const h = hk[n]; a1 += h * xr[t0 + n]; a2 += h * xi[t0 + n]; } zr[j] = a1; zi[j] = a2; }
      lpFB(zr); lpFB(zi);
      for (let j = 0; j < nd; ++j) { zr[j] *= aB[j]; zi[j] *= aB[j]; }
      for (let j = 0; j < nd; ++j) {
        let a = zr[j], b = zi[j];
        if (shift && Sh[j] !== 0) { const p = j + Sh[j]; a = readZ(zr, p) * aB[j]; b = readZ(zi, p) * aB[j]; }
        er[j] = Gn[j] * a; ei[j] = Gn[j] * b;
      }
      if (!move) { for (let j = 0; j < nd; ++j) { er[j] -= zr[j]; ei[j] -= zi[j]; } upMod(er, ei, o, cs, sn, 1); }
      else { upMod(er, ei, o, cs2, sn2, 1); upMod(zr, zi, o, cs, sn, -1); }
    }
  }
  if (stats) { stats.xbPartials = used; stats.xbTouched = touched; }
  yL.set(out[0]); yR.set(out[1]);
}
const clampN = (x, a, b) => Math.max(a, Math.min(b, x));

function cubicM (X, p) { const n = X.length, i = Math.floor(p), u = p - i; if (i < 1 || i + 2 >= n) return (i >= 0 && i < n) ? X[i] : 0; const y0 = X[i - 1], y1 = X[i], y2 = X[i + 1], y3 = X[i + 2]; return ((((0.5 * (y3 - y0) + 1.5 * (y1 - y2)) * u + (y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3)) * u + 0.5 * (y2 - y0)) * u + y1); }

// enveloppe de la source autour d'une position, en dB : une trame de 2048 (Hann) — trois (±10 ms) sans hauteur : la variance
// d'un bruit s'y réduit —, réduite à 1024 points par maximum ; son voisé : enveloppe vraie d'ordre 0,25·sr/f0 (comme le
// moteur FFT) ; sans hauteur : lissage cepstral simple d'ordre 30 (l'enveloppe vraie suivrait les pics aléatoires d'un
// bruit — mesuré : ±15 dB de coloration sur une boucle de percussions au corps agrandi) ; mise en cache par pas de 512.
// Renvoie aussi le maximum (dB) pour borner les corrections
export function __envReader (P, td) { return envelopeReader(P, td); }
function envelopeReader (P, td) {
  const sr = P.sr, N = 2048, B = N / 2 + 1, NE = 1024, BE = NE / 2 + 1, qE = N / NE, cache = new Map(), M = P.M;
  const win = new Float64Array(N); for (let i = 0; i < N; ++i) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
  const re = new Float64Array(N), im = new Float64Array(N), pw = new Float64Array(B), lmIn = new Float64Array(BE), E = new Float64Array(BE), work = { re: new Float64Array(NE), im: new Float64Array(NE), A: new Float64Array(BE) };
  return s => {
    const EK = +(globalThis.__TD_EK || 512), key = Math.round(s / EK);
    let Ed = cache.get(key);
    if (!Ed) {
      const c = key * EK; pw.fill(0);
      // (V6.5) la hauteur qui règle le lissage de l'enveloppe : celle du banc (marques corrigées d'octave, tenue à travers les
      // trames non voisées qui bordent ou trouent une note) — td.f0At sautait d'une trame à l'autre (217 → 0 → 34 → 467 Hz
      // relevés sur le violoncelle) et l'ordre du lissage cepstral avec elle : l'enveloppe suivait tantôt les harmoniques une
      // à une, tantôt rien. Mesuré (violoncelle +7 demi-tons, corps gardé, harmonicité par octave sur la hauteur connue) :
      // 14,4 → 15,0 dB ; voix et trompette inchangées à 0,2 dB près
      const Fh = globalThis.__TD_ENVF0 === false ? td.f0At(c) : td.hbAt(c), F0 = Fh > 40 && Fh < 1500 ? Fh : 0;
      for (const off of (F0 > 0 ? (globalThis.__TD_VAVG ? [-240, 0, 240] : [0]) : [-480, 0, 480])) {
        for (let i = 0; i < N; ++i) { const j = c + off - N / 2 + i; re[i] = j >= 0 && j < M.length ? M[j] * win[i] : 0; im[i] = 0; }
        fft(re, im); for (let k = 0; k < B; ++k) pw[k] += re[k] * re[k] + im[k] * im[k];
      }
      let mx = 0; for (let k = 0; k < B; ++k) if (pw[k] > mx) mx = pw[k];
      for (let j = 0; j < BE; ++j) { let m = 0; const a = Math.max(0, Math.round((j - 0.5) * qE)), b = Math.min(B - 1, Math.round((j + 0.5) * qE)); for (let k = a; k <= b; ++k) if (pw[k] > m) m = pw[k]; lmIn[j] = 0.5 * Math.log(m + 1e-12 * mx + 1e-30); }
      if (F0 > 0) trueEnvelope(lmIn, Math.max(4, Math.min(NE / 2 - 2, Math.round(0.25 * sr / F0))), E, work, 16);
      else trueEnvelope(lmIn, 30, E, work, 1);                                   // une itération : lissage cepstral simple
      Ed = Float64Array.from(E, v => v * 20 / Math.LN10);
      let emax = -Infinity; for (const v of Ed) if (v > emax) emax = v; Ed.max = emax; Ed.f0 = F0;
      if (cache.size > 4096) cache.clear();
      cache.set(key, Ed);
    }
    const f = fr => { const x = fr * NE / sr; if (x <= 0) return Ed[0]; if (x >= BE - 1) return Ed[BE - 1] - 12 * Math.log2(Math.max(1, fr / (sr / 2))); const i = Math.floor(x), u = x - i; return Ed[i] * (1 - u) + Ed[i + 1] * u; };
    f.max = Ed.max; f.f0 = Ed.f0;
    return f;
  };
}

// (V6.4) la note du sujet séparée par le banc harmonique (lecture identité) : H (partiels, k·f0 × écart propre), N = y − H (souffle,
// archet, transitoires), et l'enveloppe complexe du fondamental (phase de la période) — pour RELEVER le souffle du sujet
export function splitHarmonic (P) {
  if (P.__split) return P.__split;
  const td = prepareTD(P), sr = P.sr, D = P.n, G = 32, nb = Math.ceil(D / G) + 2;
  const yL = Float64Array.from(P.L), yR = Float64Array.from(P.R);
  const Fo = new Float32Array(nb); for (let b = 0; b < nb; ++b) { const F = td.hbAt(Math.min(D - 1, b * G)); Fo[b] = F > 0 ? F : 0; }
  const sp = { lobeFloor: () => [0, 0, 0], __split: {} };
  harmonicBank(yL, yR, D, sr, G, Fo, b => Math.min(D - 1, b * G), td.devAt, sp, null);
  const H = sp.__split.H, N = [new Float64Array(D), new Float64Array(D)];
  for (let i = 0; i < D; ++i) { N[0][i] = P.L[i] - H[0][i]; N[1][i] = P.R[i] - H[1][i]; }
  return (P.__split = { H, N, z1: sp.__split.z1, amp: sp.__split.amp || [], Fo, G });
}

// (V6.4) le souffle ajouté sur un son déjà rendu (strates dont les partiels bougent : étage FFT) — fondamentale de sortie connue
export function addBreath (L, R, sr, D, f0At, breath) {
  const G = 32, nb = Math.ceil(D / G) + 2, Fo = new Float32Array(nb);
  for (let b = 0; b < nb; ++b) { const F = f0At(Math.min(D - 1, b * G)); Fo[b] = F > 20 ? F : 0; }
  const yL = Float64Array.from(L), yR = Float64Array.from(R);
  harmonicBank(yL, yR, D, sr, G, Fo, b => Math.min(D - 1, b * G), () => 1, { breath }, null);
  return { L: yL, R: yR };
}
