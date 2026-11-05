// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// ============================================================================================
//  CHARIVARI v4 — la GÉNÉTIQUE sur le moteur vivant
//  Un enfant = une ou plusieurs STRATES qui relisent l'ORIGINAL (spectre complet, phv.js) :
//  une carte du temps, une hauteur, une échelle de corps, un plan de partiels (où va chaque rang
//  harmonique, avec quel gain), des partiels libres, des filtres de corps, le partage partiel/souffle
//  de chaque région, l'inertie du corps, une place. Rien n'est resynthétisé : ce que la mutation ne
//  touche pas reste l'original, souffle et micro-vie compris.
//  Les mutations d'INSTRUMENT (taille, pavillons, sourdine, souffle du joueur, mode de jeu, matière,
//  perce, section, cordes sympathiques) et les gestes de FORME suivent les mêmes lois que la v3 ;
//  toutes les valeurs viennent du son ; aucun tirage : une même entrée donne les mêmes enfants.
// ============================================================================================
import { render } from './phv.js';
import { renderTD, canRenderTD, canRenderHB, addBreath } from './td.js';
import { hzOf, centsOf, scaleLadder, scaleClasses } from './microtonal.js';
import { spring } from './util.js';
import { fft } from './fft.js';
import { roomOf, roomProcess, dereverbDb } from './room.js';
import { microScore } from './partition.js';
import { detectOnsets } from './onsets.js';
import { ECRITURES } from './ecritures.js';
import { ECRITURES2 } from './ecritures2.js';
import { ECRITURES3 } from './ecritures3.js';
import { ECRITURES4 } from './ecritures4.js';
import { ECRITURES5 } from './ecritures5.js';
import { CRISTAUX, CRISTAUX_LIST } from './cristaux.js';
import { breathOf } from './breath.js';
import { envelopeProfile, envelopeGuard, finalRelease, releaseTails } from './enveloppe.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const __NO_MORPH = () => !!globalThis.__NO_GUARD;      // banc d'essai : l'ancien comportement (morphologie et enveloppe)
const db20 = x => 20 * Math.log10(Math.max(1e-6, x));
const Q = 256;                                                   // placement au quart de trame de synthèse

// ---------------------------------------------------------------------------------------------- carte du temps
export class TimeMap {
  // segs : [{ a, b (sortie, éch.), sa, sb (source, éch.), sharpA? , deg? }] triés, disjoints
  constructor (segs) { this.segs = segs.filter(s => s.b > s.a).sort((x, y) => x.a - y.a); }
  seg (t) { let lo = 0, hi = this.segs.length - 1; while (lo <= hi) { const m = (lo + hi) >> 1, s = this.segs[m]; if (t < s.a) hi = m - 1; else if (t >= s.b) lo = m + 1; else return m; } return -1; }
  at (t) { const i = this.seg(t); if (i < 0) return null; const s = this.segs[i]; return s.sa + (s.sb - s.sa) * (t - s.a) / (s.b - s.a); }
  get end () { return this.segs.length ? this.segs[this.segs.length - 1].b : 0; }
  shifted (d) { return new TimeMap(this.segs.map(s => ({ ...s, a: s.a + d, b: s.b + d }))); }
  scaled (k, off = 0) { return new TimeMap(this.segs.map(s => ({ ...s, a: off + s.a * k, b: off + s.b * k }))); }
  static identity (n) { return new TimeMap([{ a: 0, b: n, sa: 0, sb: n }]); }
}

// ---------------------------------------------------------------------------------------------- strate
export function baseLayer (P) {
  return { map: TimeMap.identity(P.n), delay: 0, gain: 1, r: [], sb: [], partial: [], free: [], src: 'body', env: [], envNoise: [], lobeFloor: [], inertia: [], gainDb: [], srcGain: [], pan: [], xb: [], breath: [], zmask: [], bodyX: null, name: '' };
}
const cloneLayer = S => ({ ...S, r: [...S.r], sb: [...S.sb], partial: [...S.partial], free: [...S.free], env: [...S.env], envNoise: [...S.envNoise], lobeFloor: [...S.lobeFloor], inertia: [...S.inertia], gainDb: [...S.gainDb], srcGain: [...S.srcGain], pan: [...S.pan], xb: [...(S.xb || [])], breath: [...(S.breath || [])], zmask: [...(S.zmask || [])] });

/** strate → spécification du moteur (t = temps de sortie de la strate, avant son retard) */
export function __renderLayer (P, spec) { return renderLayer(P, spec); }
export function __compile (S, D, P) { return compile(S, D, P); }
function compile (S, D, P) {
  // (V6.4) traînes de relâchement : une lecture interrompue en plein son s'éteint aux temps du sujet (enveloppe.js)
  if (P && P.envelope && !globalThis.__NO_GUARD && !globalThis.__NO_TAILS) { const tm = releaseTails(P, S.map, D); if (tm) S.map = tm; }
  // chaque fonction de la strate reçoit aussi s = la position SOURCE (carte du temps de la strate, mémorisée par instant)
  let lt = NaN, ls = null; const at = t => (t === lt ? ls : (lt = t, ls = S.map.at(t)));
  const prod = fs => fs.length ? (t => { const s = at(t); let v = 1; for (const f of fs) v *= f(t, s); return v; }) : undefined;
  const spec = { D, T: t => at(t), r: prod(S.r), sb: prod(S.sb), src: S.src, rateAt: t => { const i = S.map.seg(t); if (i < 0) return 1; const g = S.map.segs[i]; return (g.sb - g.sa) / Math.max(1e-9, g.b - g.a); } };
  if (S.env.length) spec.env = (f, t) => { const s = at(t); let v = 0; for (const fn of S.env) v += fn(f, t, s); return v; };
  if (S.envNoise.length) spec.envNoise = (f, t) => { const s = at(t); let v = 0; for (const fn of S.envNoise) v += fn(f, t, s); return v; };
  if (S.gainDb.length) spec.gainDb = t => { const s = at(t); let v = 0; for (const fn of S.gainDb) v += fn(t, s); return v; };
  if (S.srcGain.length) spec.srcGainDb = t => { const s = at(t); let v = 0; for (const fn of S.srcGain) v += fn(t, s); return v; };
  if (S.partial.length) spec.partial = (h, f, t, F) => { const s = at(t); let x = [f, 0]; for (const fn of S.partial) { x = fn(h, x[0], x[1], t, F, s); if (!x) return null; } return x; };
  if (S.free.length) spec.free = (f, t) => { const s = at(t); let x = [f, 0]; for (const fn of S.free) { x = fn(x[0], x[1], t, s); if (!x) return null; } return x; };
  if (S.lobeFloor.length) spec.lobeFloor = t => { const s = at(t); let a = 0, b = 0, c = 0; for (const fn of S.lobeFloor) { const v = fn(t, s); a += v[0]; b += v[1] || 0; c = Math.max(c, v[2] || 0); } return [a, b, c]; };
  if (S.inertia.length) spec.inertia = t => { const s = at(t); let a = 0, r = 0; for (const fn of S.inertia) { const v = fn(t, s); a = Math.max(a, v.att || 0); r = Math.max(r, v.rel || 0); } return { att: a, rel: r }; };
  if (S.pan.length) spec.pan = t => { const s = at(t); let p = 0.5; for (const fn of S.pan) p = fn(p, t, s); p = clamp(p, 0, 1); return [Math.SQRT2 * Math.cos(p * Math.PI / 2), Math.SQRT2 * Math.sin(p * Math.PI / 2)]; };
  if (S.bodyX) spec.bodyX = S.bodyX;
  // souffle ajouté (V6.4) : un seul gène le pose — ses constantes, et son relèvement (dB) à l'instant t
  if (S.breath && S.breath.length) { const b0 = S.breath[0]; spec.breath = { nhr: b0.nhr, lead: b0.lead, tail: b0.tail, M: b0.M, phase: b0.phase || 0, db: t => { const s = at(t); let v = -Infinity; for (const b of S.breath) v = Math.max(v, b.db(t, s)); return v; } }; }
  // cristaux (V6.3) : { r, g, sh } par rang k, à l'instant t, f0 de sortie F (td.js, banc des cristaux)
  if (S.xb && S.xb.length) spec.xb = (h, t, F) => { const s = at(t), o = { r: 1, g: 0, sh: 0 }; for (const fn of S.xb) if (fn(h, t, F, s, o) === null) return null; return o; };
  // GARDE D'ENVELOPPE (v5.8, enveloppe.js) : les gains des gènes ne vont pas plus vite que le sujet, les entrées et sorties
  // de la carte du temps s'ouvrent et s'éteignent en ses temps, les raccords gardent la continuité du niveau
  if (P && P.envelope && !globalThis.__NO_GUARD) {
    const g = envelopeGuard(P, S.map, D);
    if (g) { const sl = spec.gainDb ? g.slew(spec.gainDb) : null; spec.gainDb = sl ? (t => sl(t) + g.junction(t)) : (g.marks ? g.junction : undefined); if (!spec.gainDb) delete spec.gainDb; }
  }
  return spec;
}

// ---------------------------------------------------------------------------------------------- contexte musical
/** grille du parent : pouls s'il existe (tempo2.js : tatum, battue, micro-groove), sinon l'unité propre du son (écart médian
 *  des attaques, vibrato, durée).
 *  unit : la double-croche d'une battue binaire, la croche de triolet d'une battue ternaire (m multiple de 3) — beat/4
 *  tombait HORS de la grille d'une battue ternaire (80 BPM en triolets : pas de 187,5 ms sur une grille de 250 ms).
 *  warp(t) : le micro-groove du parent (gabarit de jgcompose extract_groove, par tatum de la battue, interpolé entre les
 *  tatums) appliqué à un instant de la grille droite ; snap(t) = le point de grille le plus proche, groové. */
export function gridOf (P) {
  const sr = P.sr;
  if (P.tempo) {
    const T = P.tempo, beat = T.period * sr, phase = ((T.phase * sr) % beat + beat) % beat;
    const m = T.grid.R, q = beat / m, unit = m % 3 === 0 ? beat / 3 : beat / 4;
    const offs = T.groove.templateMs.map(v => v * 1e-3 * sr);
    const warp = t => { const x = (((t - phase) / q) % m + m) % m, i = Math.floor(x) % m, f = x - Math.floor(x); return t + offs[i] * (1 - f) + offs[(i + 1) % m] * f; };
    return { has: true, beat, unit, bar: 4 * beat, phase, tatum: q, m, offs, warp, snap: t => warp(phase + Math.round((t - phase) / unit) * unit) };
  }
  const ons = P.onsetsAll.map(o => o.s).sort((a, b) => a - b), ioi = [];
  for (let i = 1; i < ons.length; ++i) if (ons[i] - ons[i - 1] > 0.06 * sr) ioi.push(ons[i] - ons[i - 1]);
  ioi.sort((a, b) => a - b);
  let unit = ioi.length >= 3 ? ioi[ioi.length >> 1] / 2 : (P.traits.vibRate > 2 ? 2 * sr / P.traits.vibRate : (P.traits.activeEnd - P.traits.activeStart) * sr / 8);
  unit = clamp(unit, 0.06 * sr, 0.6 * sr);
  return { has: false, beat: unit * 2, unit, bar: unit * 8, phase: 0, tatum: unit, m: 2, offs: [0, 0], warp: t => t, snap: t => Math.round(t / unit) * unit };
}
export function degreesOf (P) {
  const t = P.tuning, root = P.fundamentalCents;
  if (!t || root === null) return { all: [], scale: [] };
  // all : le réseau du tuning (OÙ sont les hauteurs) ; scale : la gamme (LESQUELLES on joue — ZD Ultimate, répétée à
  // l'octave) ; ses hauteurs font partie du réseau (un tuning qui ne se répète pas à l'octave les porte repliées)
  const p = t.period, all = [], scale = [], sc = scaleClasses(t);
  for (let k = -12; k <= 12; ++k) t.degrees.forEach(d => { const c = root + k * p + (((d % p) + p) % p); if (c > 2000 && c < 13000) all.push(c); });
  for (let k = -12; k <= 12; ++k) for (const x of sc.cls) { const c = root + k * sc.period + x; if (c > 2000 && c < 13000) scale.push(c); }
  all.sort((a, b) => a - b); scale.sort((a, b) => a - b);
  for (const c of scale) { let lo = 0, hi = all.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (all[m] < c) lo = m; else hi = m; } if (!all.length || Math.min(Math.abs(all[lo] - c), Math.abs(all[hi] - c)) > 3) all.push(c); }
  all.sort((a, b) => a - b);
  return { all, scale };
}
const nearest = (arr, c) => { if (!arr.length) return c; let lo = 0, hi = arr.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (arr[m] < c) lo = m; else hi = m; } return Math.abs(arr[lo] - c) <= Math.abs(arr[hi] - c) ? arr[lo] : arr[hi]; };
function onScale (ctx, c) {
  const lad = ctx.ladder, Pd = ctx.period || 1200;
  if (!lad || !lad.length) return c;
  const oct = Math.floor(c / Pd), r = c - oct * Pd;
  let best = 0, bd = 1e9; for (const d of [...lad.map(x => x % Pd), Pd]) if (Math.abs(d - r) < bd) { bd = Math.abs(d - r); best = d; }
  return oct * Pd + best;
}
export function contextOf (P) {
  const ctx = { grid: gridOf(P), deg: degreesOf(P), ladder: P.ladder, period: P.tuning ? scaleClasses(P.tuning).period : 1200, axis: P.fundamentalCents, formants: P.formants };
  // la partition micro (événements, voix, phrases) : lue une fois par sujet ; ses traits règlent la pertinence des écritures
  ctx.ms = P.micro || (P.micro = microScore(P, ctx));          // (P.ms : la durée d'analyse)
  ctx.envp = P.envelope || (P.envelope = envelopeProfile(P, ctx.ms));
  if (P.traits) P.traits.ms = ctx.ms.traits;
  return ctx;
}
/** horloge de note : temps (s) écoulé depuis le début de la note (ou de l'attaque) qui contient la position source s */
function noteClock (P) {
  const sr = P.sr;
  let cuts = P.notes.length >= 2 ? P.notes.map(q => Math.round(q.t0 * sr)) : P.onsetsAll.map(o => o.s);
  cuts = [...new Set([0, ...cuts])].sort((a, b) => a - b);
  return s => { if (s === null) return 0; let lo = 0, hi = cuts.length - 1, r = 0; while (lo <= hi) { const m = (lo + hi) >> 1; if (cuts[m] <= s) { r = m; lo = m + 1; } else hi = m - 1; } return Math.max(0, (s - cuts[r]) / sr); };
}

// réponses (prototype analogique du SVF de Balance Stain) : x = f/fc
const svf = {
  lp: (f, fc, q) => { const x = f / fc; return 1 / Math.sqrt((1 - x * x) ** 2 + (x / q) ** 2); },
  hp: (f, fc, q) => { const x = f / fc; return x * x / Math.sqrt((1 - x * x) ** 2 + (x / q) ** 2); },
  bp: (f, fc, q) => { const x = f / fc; return (x / q) / Math.sqrt((1 - x * x) ** 2 + (x / q) ** 2); }
};

// ============================================================================================
//  MUTATIONS D'INSTRUMENT — (P, ctx, ι, variante) → { desc, apply(strates, D) → { strates, D }, halo? }
// ============================================================================================
export const ORGANO = {};

// TAILLE — le corps grandit : ses résonances descendent d'un facteur k (enveloppe relue en f·k), la note jouée
// descend de k^0,62 (posée sur un degré de la gamme), le corps devient lent à s'ébranler et long à se taire.
ORGANO.taille = {
  dims: { corps: 1, hauteur: 0.6, matiere: 0.2, souffle: 0.2 },
  relevance: T => 0.9,
  make (P, ctx, iota, variant) {
    const big = variant !== 1, k = big ? 1 + 2 * iota : 1 / (1 + 1.5 * iota);
    const gamma = variant === 2 ? 0 : 0.62, shift = gamma ? onScale(ctx, -1200 * gamma * Math.log2(k)) : 0;
    // (v6, inertie C : la résonance d'un corps agrandi se mesure à celle du sujet — au plus 1,2·k fois son temps d'extinction
    // naturel (relMs, de −6 à −36 dB : τ = 0,29·relMs), entre 60 et 600 ms ; la v5.9 allait jusqu'à 850 ms quel que soit le son)
    const tauS = 0.29e-3 * ((ctx.envp && ctx.envp.relMs) || 200), relMax = globalThis.__INERTIA_C === false ? Infinity : clamp(1.2 * k * tauS, 0.06, 0.6);
    const att = big ? 0.003 * (1 + 6 * (k - 1)) : 0, rel = big ? Math.min(relMax, 0.05 * (1 + 8 * (k - 1))) : 0;
    return { desc: `${big ? 'giant' : 'dwarf'} ×${k.toFixed(2)} (body ${k > 1 ? '−' : '+'}${Math.abs(Math.round(1200 * Math.log2(k)))} c${shift ? `, played ${Math.round(shift)} c` : ', same note'}${big ? `, resonance ${rel.toFixed(2)} s` : ''})`,
      apply (layers, D) {
        for (const S of layers) {
          if (shift) S.r.push(() => Math.pow(2, shift / 1200));
          S.sb.push(() => 1 / k);
          if (big) S.inertia.push(() => ({ att, rel }));
        }
        return { layers, D: D + Math.round((big ? 2 * rel : 0) * P.sr) };
      } };
  }
};

// PAVILLONS — deux ou trois pavillons pour un seul joueur : même source, corps de tailles voisines (rapports pris
// dans la gamme), chacun rayonne de sa place ; les chemins diffèrent de quelques millisecondes → interférences.
ORGANO.pavillons = {
  dims: { espace: 1, corps: 0.6, matiere: 0.1 },
  relevance: T => 0.85,
  make (P, ctx, iota, variant) {
    const n = variant === 1 ? 3 : 2, lad = ctx.ladder || [0, 200, 400];
    const sizes = [1, Math.pow(2, (lad[Math.min(lad.length - 1, 2 + Math.round(3 * iota))] % 1200) / 1200), Math.pow(2, -(lad[Math.min(lad.length - 1, 1 + Math.round(2 * iota))] % 1200) / 1200)].slice(0, n);
    const pans = n === 2 ? [0.12, 0.88] : [0.08, 0.5, 0.92];
    const dels = [0, 1 + Math.round(2 * iota), 3 + Math.round(3 * iota)].slice(0, n).map(x => x * 128);
    const muteSecond = variant === 2, F = ctx.formants[0];
    return { desc: `${n} bells (bodies ×${sizes.map(k => k.toFixed(2)).join(' / ')}, offsets ${dels.map(d => (d / P.sr * 1000).toFixed(1)).join('/')} ms${muteSecond ? ', second one stopped' : ''})`,
      apply (layers, D) {
        const out = [];
        for (const S0 of layers) sizes.forEach((k, i) => {
          const S = cloneLayer(S0); S.gain = S0.gain / Math.sqrt(n); S.delay = S0.delay + dels[i];
          if (k !== 1) S.sb.push(() => 1 / k);
          if (muteSecond && i === 1) S.env.push(f => db20(svf.lp(f, 0.9 * F, 1.4) * (1 + 1.5 * svf.bp(f, 0.6 * F, 3))));
          S.pan.push(p => 0.3 * p + 0.7 * pans[i]);
          out.push(S);
        });
        return { layers: out, D: D + dels[n - 1] };
      } };
  }
};

// SOURDINE — filtre et résonance posés dans le pavillon, calés sur le formant principal mesuré. sèche, wah (la tige
// bouge au rythme de la grille), plunger (la main ouvre et ferme). Elle ENTRE (ressort) : on l'entend passer.
ORGANO.sourdine = {
  dims: { corps: 0.8, articulation: 0.3, souffle: 0.2 },
  relevance: T => 0.3 + 0.7 * T.tonal,
  make (P, ctx, iota, variant) {
    const F = clamp(ctx.formants[0], 700, 3500), sr = P.sr, step = ctx.grid.has ? ctx.grid.beat : ctx.grid.unit * 2;
    const T0 = 0.15 * P.n / sr, Tsp = 0.6;
    const amt = t => (0.55 + 0.45 * iota) * spring(t / sr - T0, Tsp);
    let resp, name;
    if (variant === 0) { name = 'straight'; resp = () => f => svf.hp(f, 0.75 * F, 0.9) * (0.5 + 2.2 * svf.bp(f, 1.5 * F, 4)); }
    else if (variant === 1) { name = 'wah (stem on the beat)'; resp = t => { const ph = ((t - ctx.grid.phase) / step) % 1; const fw = F * (1.1 + 1.1 * (0.5 - 0.5 * Math.cos(2 * Math.PI * ph))); return f => svf.hp(f, 0.9 * F, 0.8) * (0.25 + 4 * svf.bp(f, fw, 7)); }; }
    else { name = 'plunger (breathing hand)'; resp = t => { const ph = ((t - ctx.grid.phase) / (2 * step)) % 1; const open = 0.5 - 0.5 * Math.cos(2 * Math.PI * ph); const fc = 350 * Math.pow(18, open); return f => svf.lp(f, fc, 1.6) * (0.8 + 0.6 * svf.bp(f, 0.7 * F, 3)); }; }
    return { desc: `${name} mute, set on the ${Math.round(F)} Hz formant`,
      apply (layers, D) { for (const S of layers) S.env.push((f, t) => amt(t) * db20(resp(t)(f))); return { layers, D }; } };
  }
};

// SOUFFLE DU JOUEUR (V6.4, refait sur l'acoustique — Mat : « pas assez naturel ; se renseigner sur ce que veut dire mettre
// du souffle pour une trompette »). La v6.3 changeait les partiels en bruit (−30 dB de partiels, leur énergie cédée à un bruit
// continu) : une voix chuchotée, plus une trompette. Un souffle de vent, c'est la turbulence du jet qui passe par
// l'instrument (breath.js) : la note RESTE, un bruit s'y ajoute — réparti comme ses partiels, plus présent dans l'aigu,
// PULSÉ à la période (au maximum de l'onde, là où le jet coule), en avance sur l'attaque et prolongé après la fin — et
// les harmoniques aigus faiblissent (moins de cuivre). Tout se règle sur le souffle RELEVÉ du sujet (sa part de bruit par
// octave, la profondeur de sa pulsation, son avance à l'attaque ; sinon ceux de la trompette de Mat). Trois souffles :
//   v0 — souffle dans le son : le souffle du sujet relevé de 4 à 14 dB, les aigus −1 à −4 dB/oct au-dessus de
//        max(1,2 kHz ; 4·f0) ;
//   v1 — souffle des attaques et des fins : peu de souffle tenu (+2 à +6 dB), une bouffée à chaque attaque (+8 à +16 dB,
//        éteinte en 80 ms, en avance de 20 à 50 ms) et l'air qui s'échappe sur les 100 dernières ms de chaque note ;
// La traîne après la note est courte (40 ms ; 80 ms en v1) : l'air s'arrête avec le son — ce qui reste ensuite, c'est la salle.
//   v2 — son soufflé (subtone) : +8 à +18 dB de souffle, partiels −1 à −3 dB, aigus −3 à −8 dB/oct au-dessus de
//        max(0,8 kHz ; 3·f0), pulsation plus marquée : la note s'entend encore, portée par l'air.
// L'entrée suit, comme avant, un ressort (5 % de la durée, 0,9 s).
ORGANO.souffle = {
  dims: { souffle: 1, source: 0.8, hauteur: 0.2 },
  relevance: T => 0.4 + 0.6 * T.tonal,
  make (P, ctx, iota, variant) {
    const sr = P.sr, v = variant % 3, bo = breathOf(P), T0 = 0.05 * P.n / sr, lam = t => spring(t / sr - T0, 0.9);
    const F0 = P.f0med || 200;
    let ns = (P.notes || []).map(q => [Math.round(q.t0 * sr), Math.round(q.t1 * sr)]);
    if (ns.length < 2) { const o = (P.onsetsAll || []).map(q => q.s).sort((a, b) => a - b); ns = o.map((a, q) => [a, q + 1 < o.length ? o[q + 1] : P.n]); }
    const noteAt = s => { let lo = 0, hi = ns.length - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (ns[m][0] <= s) { r = m; lo = m + 1; } else hi = m - 1; } return r >= 0 && s < ns[r][1] ? ns[r] : null; };
    let boost, tilt, fc, flat = 0, lead, tail = 0.04, M = clamp(Math.max(0.3, bo.pulse), 0.3, 0.6), name;
    if (v === 0) { boost = () => 4 + 10 * iota; tilt = 1 + 3 * iota; fc = Math.max(1200, 4 * F0); lead = clamp(bo.lead * (1 + iota), 0.008, 0.04); name = 'breath in the tone'; }
    else if (v === 1) {
      const acc = 8 + 8 * iota, end = 4 + 6 * iota, base = 2 + 4 * iota;
      boost = s => { const n = s === null ? null : noteAt(s); if (!n) return base; const da = (s - n[0]) / sr, de = (n[1] - s) / sr; let e = 10 * Math.log10(Math.pow(10, base / 10) + Math.pow(10, acc / 10) * Math.exp(-da / 0.08)); if (de < 0.1 && n[1] - n[0] > 0.25 * sr) e = Math.max(e, base + (end - base) * (1 - de / 0.1)); return e; };
      tilt = 0.5 + iota; fc = Math.max(1200, 4 * F0); lead = clamp(0.02 + 0.03 * iota, 0.008, 0.05); tail = 0.08; name = 'breath on the attacks and the ends';
    } else { boost = () => 8 + 10 * iota; tilt = 3 + 5 * iota; fc = Math.max(800, 3 * F0); flat = 1 + 2 * iota; lead = clamp(bo.lead * (1 + iota), 0.008, 0.04); M = clamp(Math.max(0.3, bo.pulse) + 0.15, 0.4, 0.7); name = 'breathy subtone'; }
    const src = bo.measured && bo.measured.nfr >= 40 ? 'the subject\'s own breath' : 'the breath of Mat\'s trumpet';
    return { desc: `player's breath: ${name} — ${src} raised by ${v === 1 ? `${(2 + 4 * iota).toFixed(0)} dB held, ${(8 + 8 * iota).toFixed(0)} dB at each attack` : `${boost(null).toFixed(0)} dB`}, pulsed with the period (${Math.round(100 * M)} %), ${Math.round(1000 * lead)} ms ahead of the attacks, highs −${tilt.toFixed(1)} dB/oct above ${Math.round(fc)} Hz`,
      apply (layers, D) {
        for (const S of layers) {
          S.breath.push({ nhr: bo.nhr, lead, tail, M, phase: bo.phase, db: (t, s) => { const l = lam(t); return l > 1e-4 ? 10 * Math.log10(l) + boost(s) : -80; } });
          S.partial.push((h, f, d, t) => [f, d - lam(t) * (flat + tilt * Math.max(0, Math.log2(f / fc)))]);
        }
        return { layers, D };
      } };
  }
};

// MODE DE JEU — l'articulation change note par note (notes mesurées, sinon attaques, sinon grille) : portato,
// staccato (la résonance du corps finit la note), flatterzunge (la langue roule : son et souffle battent ensemble).
ORGANO.jeu = {
  dims: { articulation: 1, rythme: 0.5, souffle: 0.2 },
  relevance: T => 0.35 + 0.65 * Math.min(1, Math.max(T.notes, T.onsets / 2) / 4),
  make (P, ctx, iota, variant) {
    const sr = P.sr;
    let cuts = P.notes.length >= 2 ? P.notes.map(q => Math.round(q.t0 * sr)) : P.onsetsAll.map(o => o.s);
    if (cuts.length < 2) { cuts = []; for (let t = ctx.grid.phase; t < P.n; t += ctx.grid.beat) cuts.push(Math.round(ctx.grid.warp(t))); }
    cuts = [...new Set(cuts)].sort((a, b) => a - b);
    const segOf = t => { let lo = 0, hi = cuts.length - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (cuts[m] <= t) { r = m; lo = m + 1; } else hi = m - 1; } return r; };
    // FLATTERZUNGE (V6.4, Mat : « trop régulier, il faut se rapprocher d'un flutter-tongue humain »). La v6.3 battait d'un cosinus
    // pur à 16–32 Hz (4 × le vibrato), profondeur constante : une modulation de synthétiseur. Un roulement de langue (trille
    // apical, ou uvulaire — Ladefoged & Maddieson : 25 à 30 Hz environ, deux à cinq contacts, période qui flotte d'un battement
    // à l'autre) est une suite de FERMETURES : à chaque contact la langue coupe l'air un court instant (un tiers de période
    // environ, entrée et sortie en quelques ms), puis le son revient — ce n'est pas une sinusoïde. Le battement s'installe sur
    // les premiers contacts (plus lents, moins profonds), sa période et sa profondeur dérivent d'un contact au suivant ; à
    // chaque fermeture la hauteur fléchit un peu (8 c × la dose) et le souffle reste (le jet n'est pas coupé net).
    // Irrégularité sans tirage : un attracteur de Lorenz pas à pas, un pas par contact, à travers toute la pièce (la même
    // vie d'un battement à l'autre, comme la laque) : période ±12 %, profondeur 75 à 100 %, durée de fermeture 27 à 43 %.
    const flat = clamp(3 * (P.traits.vibRate || 0), 20, 28) || 24;
    let fl = null;
    if (variant === 2) {
      const dep = 0.6 + 0.32 * iota, starts = [], per = [], dp = [], du = [];
      let lx = 0.1, ly = 0, lz = 2.0, lt = 0; const h = 0.01;
      for (let i = 0; i < cuts.length; ++i) {
        const a = cuts[i], b = i + 1 < cuts.length ? cuts[i + 1] : P.n; let t = a, k = 0;
        while (t < b) {
          for (let q = 0; q < 3; ++q) { const sg = 10 + 4 * Math.sin(lt); lt += 0.01; const dx = sg * (ly - lx), dy = lx * (32.95 - lz) - ly, dz = lx * ly - 2.6667 * lz; lx += h * dx; ly += h * dy; lz += h * dz; if (!(Math.abs(lx) < 100 && Math.abs(ly) < 150 && lz > -10 && lz < 200)) { lx = 0.1; ly = 0; lz = 2; } }
          const xN = Math.tanh(lx * 0.08), yN = Math.tanh(ly * 0.06), zN = Math.tanh((lz - 25) * 0.06), on = Math.min(1, k / 3);
          const T = sr / (flat * (0.75 + 0.25 * on) * (1 + 0.12 * xN));
          starts.push(t); per.push(T); dp.push(dep * (0.6 + 0.4 * on) * (0.875 + 0.125 * yN)); du.push(0.35 + 0.08 * zN);
          t += T; k++;
        }
      }
      const cyc = s => { let lo = 0, hi = starts.length - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (starts[m] <= s) { r = m; lo = m + 1; } else hi = m - 1; } return r; };
      // gain dans un contact : fermeture centrée à mi-période, de largeur du, rampes cos² de 12 % de période
      fl = s => { const c = cyc(s); if (c < 0) return 1; const u = (s - starts[c]) / per[c]; if (u >= 1) return 1; const half = 0.5 * du[c], r = 0.12, d = Math.abs(u - 0.5); const w = d <= half ? 1 : d >= half + r ? 0 : Math.cos(0.5 * Math.PI * (d - half) / r) ** 2; return 1 - dp[c] * w; };
      fl.n = starts.length;
    }
    const env = s => {
      const i = segOf(s); if (i < 0) return 1;
      const a = cuts[i], b = i + 1 < cuts.length ? cuts[i + 1] : P.n, L = b - a, x = (s - a) / L, ts = (s - a) / sr;
      if (variant === 0) { const at = Math.min(0.3 * L, 0.12 * sr) / sr, sw = ts < at ? 0.25 + 0.75 * (0.5 - 0.5 * Math.cos(Math.PI * ts / at)) : 1; const rl = x > 0.8 ? Math.pow(10, -35 * (x - 0.8) / 0.2 / 20) : 1; return sw * (x > 0.3 ? 0.8 : 1) * rl; }
      if (variant === 1) return x < 0.35 ? 1 : Math.exp(-(ts - 0.35 * L / sr) / 0.045);
      return fl ? fl(s) : 1;
    };
    const depth = variant === 2 ? 1 : 0.6 + 0.32 * iota, gRaw = s => 1 - depth + depth * env(s);   // jamais le silence total : la pièce garde un fond (−22 dB)
    // (V6.3) d'une note à la suivante, le gain passe en 4 ms (sin²) qui SE TERMINENT sur le départ de la note : il sautait d'un
    // bloc à l'autre — +8 à +25 dB d'un coup. Sur une attaque, l'attaque le masquait ; mais un départ de note relevé par la
    // hauteur seule (une résonance de tom qui devient voisée, sans attaque) tombe en plein son : mesuré, clic à 4,192 s et
    // 3,957 s dans la batterie (jeu seul, staccato et portato, cinq mummers sur 32)
    const RJ = Math.round(0.004 * sr);
    const gfn = s => { const j = segOf(s) + 1; if (j >= cuts.length || cuts[j] - s > RJ) return gRaw(s); const b = cuts[j], u = 1 - (b - s) / RJ, w = Math.sin(0.5 * Math.PI * u) ** 2; return gRaw(s) * (1 - w) + gRaw(b) * w; };
    return { desc: `playing technique: ${['portato', 'staccato (the body ends the note)', `flutter-tongue around ${flat.toFixed(0)} Hz, ${fl ? fl.n : 0} tongue strokes, each its own length and depth`][variant % 3]} on ${cuts.length} notes`,
      apply (layers, D) {
        for (const S of layers) {
          // l'articulation suit le temps SOURCE (la note du joueur) et agit AVANT le corps : le corps fait sonner ce qu'elle coupe
          S.srcGain.push((t, s) => s === null ? 0 : db20(gfn(s)));
          // (v6 : le corps finit la note comme le sujet finit les siennes — au plus 1,3 fois son temps d'extinction, 40–350 ms)
          if (variant === 1) { const tauS = 0.29e-3 * ((ctx.envp && ctx.envp.relMs) || 200); S.inertia.push(() => ({ att: 0, rel: Math.min(0.25 + 0.35 * iota, globalThis.__INERTIA_C === false ? Infinity : clamp(1.3 * tauS, 0.04, 0.35)) })); }
          if (variant === 2) { S.lobeFloor.push((t, s) => { const e = s === null ? 1 : env(s); return [0, 3 * (1 - e), 0]; }); S.r.push((t, s) => { if (s === null) return 1; return Math.pow(2, -8 * iota * (1 - env(s)) / 1200); }); }
        }
        return { layers, D };
      } };
  }
};

// MATIÈRE — verre : partiels étirés (raideur, chacun emporte sa région), résonance longue ; bois : les aigus s'amortissent
// d'autant plus vite qu'ils sont aigus ; peau : les rangs glissent vers les modes d'une membrane (zéros de Bessel), déclin rapide.
const MEMBRANE = [1, 1.594, 2.136, 2.296, 2.653, 2.918, 3.156, 3.501, 3.600, 3.652, 4.060, 4.154, 4.601, 4.832, 4.903, 5.131];
ORGANO.matiere = {
  dims: { matiere: 1, hauteur: 0.4, corps: 0.4 },
  relevance: T => 0.5 + 0.5 * T.tonal,
  make (P, ctx, iota, variant) {
    const sr = P.sr, T0 = 0.1 * P.n / sr, lam = t => spring(t / sr - T0, 0.8) * (0.5 + 0.5 * iota);
    const axis = hzOf(P.fundamentalCents ?? 6000), clock = noteClock(P), name = ['glass', 'wood', 'skin'][variant % 3];
    return { desc: `material: ${name}`,
      apply (layers, D) {
        for (const S of layers) {
          if (variant === 0) {
            S.src = 'index';
            S.partial.push((h, f, d, t) => { const B = 0.0025 * lam(t); return [f * Math.sqrt(1 + B * h * h), d]; });
            // (v6 : le verre sonne plus longtemps que le sujet — au plus 4 fois son temps d'extinction, 200–900 ms)
            { const tauS = 0.29e-3 * ((ctx.envp && ctx.envp.relMs) || 200); S.inertia.push(() => ({ att: 0, rel: Math.min(0.8 + 1.2 * iota, globalThis.__INERTIA_C === false ? Infinity : clamp(4 * tauS, 0.2, 0.9)) })); }
          } else if (variant === 1) {
            S.env.push((f, t, s) => -lam(t) * (14 * clock(s) + 6) * Math.max(0, Math.log2(f / axis)));
          } else {
            S.src = 'index';
            S.partial.push((h, f, d, t) => { if (h > MEMBRANE.length) return [f, d - 40 * lam(t)]; const l = lam(t); return [f * Math.pow(MEMBRANE[h - 1] / h, l), d]; });
            S.gainDb.push((t, s) => -lam(t) * 30 * clock(s));
          }
        }
        return { layers, D: D + (variant === 0 ? Math.round((1 + iota) * sr) : 0) };
      } };
  }
};

// PERCE — la forme du tube change. fermé (clarinette : rangs pairs éteints), anche double (formant nasal, graves
// amincis), conique large (graves nourris, plus de souffle).
ORGANO.perce = {
  dims: { corps: 0.7, source: 0.6, hauteur: 0.1 },
  relevance: T => Math.min(1, T.nHarm / 6) * T.tonal,
  make (P, ctx, iota, variant) {
    const sr = P.sr, lam = t => spring(t / sr - 0.08 * P.n / sr, 0.7) * (0.5 + 0.5 * iota), F = ctx.formants[0];
    const name = ['closed (even partials silenced)', 'double reed (nasal formant)', 'wide conical (fed lows)'][variant % 3];
    return { desc: `bore: ${name}`,
      apply (layers, D) {
        for (const S of layers) {
          if (variant === 0) S.partial.push((h, f, d, t) => [f, h % 2 === 0 ? d - 32 * lam(t) : d]);
          else if (variant === 1) S.env.push((f, t) => lam(t) * db20(svf.hp(f, 0.45 * F, 0.7) * (0.6 + 3 * svf.bp(f, 1.25 * F, 5))));
          else { S.partial.push((h, f, d, t) => [f, d + lam(t) * (8 - 3 * Math.log2(h))]); S.lobeFloor.push(t => [0, 6 * lam(t), 0]); }
        }
        return { layers, D };
      } };
  }
};

// SECTION (V6.2) — plusieurs joueurs PLACÉS dans l'espace et désaccordés selon la MICROTONALITÉ DU SUJET.
// Les désaccords ne sont plus une échelle fixe (4 à 16 c) : ils viennent de deux mesures du son —
//   δ, l'écart typique de ses partiels à la série harmonique exacte (médiane de |écart| des raies les plus fortes, rangs ≥ 2) :
//     ses joueurs s'écartent comme ses propres partiels s'écartent ;
//   μ, le plus petit pas du réseau microtonal trouvé (tuning ODDSound), SUBDIVISÉ : q = μ / round(μ / cible) — des fractions
//     exactes du micro-intervalle du sujet.
//   v0 trois joueurs : 0, +δ·a, −δ·a (a = ½ + ι) ; v1 cinq joueurs : 0, ±q, ±2q (cible 3 + 9ι c) ; v2 deux joueurs : 0 et μ/2^k
//   (la plus grande moitié successive sous 6 + 10ι c).
// L'espace : les joueurs sur un arc devant l'auditeur (ouverture 30° + 90°·ι), le premier au centre et au plus près (1 m),
// les autres en recul vers les côtés (jusqu'à 1 + 2,5·ι m) : retard = distance / 343 m/s, niveau en 1/distance, aigus absorbés
// avec la distance (jusqu'à −9 dB à 10 kHz pour 3,5 m), pan selon l'angle.
function microOf (P, ctx) {
  if (P.__micro) return P.__micro;
  const f0 = P.fundamentalHz || 0, devs = [];
  if (f0 > 0) for (const p of partialMap(P).slice(0, 24)) { const k = Math.round(p.hz / f0); if (k < 2 || k > 40) continue; const d = 1200 * Math.log2(p.hz / (k * f0)); if (Math.abs(d) < 45) devs.push(Math.abs(d)); }
  devs.sort((a, b) => a - b);
  const delta = clamp(devs.length ? devs[devs.length >> 1] : 6, 2, 30);
  const all = (ctx.deg && ctx.deg.all) || [], diffs = []; for (let i = 1; i < all.length; ++i) { const d = all[i] - all[i - 1]; if (d > 1) diffs.push(d); }
  diffs.sort((a, b) => a - b);
  const mu = clamp(diffs.length ? diffs[Math.floor(0.1 * (diffs.length - 1))] : 100, 8, 200);
  return (P.__micro = { delta, mu });
}
ORGANO.section = {
  dims: { espace: 0.8, source: 0.5, vie: 0.5 },
  relevance: T => 0.8,
  make (P, ctx, iota, variant) {
    const v = variant % 3, n = [3, 5, 2][v], { delta, mu } = microOf(P, ctx);
    let det;
    if (v === 0) { const a = (0.5 + iota) * delta; det = [0, a, -a]; }
    else if (v === 1) { const q = mu / Math.max(1, Math.round(mu / (3 + 9 * iota))); det = [0, -q, q, -2 * q, 2 * q]; }
    else { let x = mu; while (x > 6 + 10 * iota && x > 1) x /= 2; det = [0, x]; }
    // l'arc : angles symétriques, le joueur 0 au centre ; distances : 1 m au centre, en recul vers les côtés
    const open = (30 + 90 * iota) * Math.PI / 180, far = 1 + 2.5 * iota;
    const ang = det.map((_, i) => i === 0 ? 0 : (i % 2 ? 1 : -1) * open / 2 * Math.ceil(i / 2) / Math.ceil((n - 1) / 2));
    const dist = ang.map(a => 1 + (far - 1) * Math.abs(a) / Math.max(1e-6, open / 2));
    const dels = dist.map(d => Math.round((d - 1) / 343 * P.sr) + 0);
    const gains = dist.map(d => 1 / d), pans = ang.map(a => 0.5 + 0.5 * Math.sin(a));
    const air = dist.map(d => (d - 1) * 3.6);                     // dB à 10 kHz (≈ −9 dB à 3,5 m)
    const norm = 1 / Math.sqrt(gains.reduce((s2, g) => s2 + g * g, 0));
    return { desc: `section of ${n} players placed on a ${Math.round(open * 180 / Math.PI)}° arc, 1 to ${far.toFixed(1)} m (detunings ${det.map(x => (x >= 0 ? '+' : '') + x.toFixed(1)).join('/')} c from the subject's microtonality: partials ±${delta.toFixed(1)} c, step ${mu.toFixed(1)} c)`,
      apply (layers, D) {
        const out = [];
        for (const S0 of layers) for (let i = 0; i < n; ++i) {
          const S = cloneLayer(S0); S.gain = S0.gain * gains[i] * norm; S.delay = S0.delay + dels[i];
          if (det[i]) S.r.push(() => Math.pow(2, det[i] / 1200));
          if (air[i] > 0.05) { const a = air[i]; S.env.push(f => -a * Math.min(4, (f / 10000) ** 2)); }
          S.pan.push(p => 0.3 * p + 0.7 * pans[i]);
          out.push(S);
        }
        return { layers: out, D: D + Math.max(...dels) };
      } };
  }
};

// LIEU (V6.2) — l'espace du sujet, analysé (room.js : T60 en trois bandes, plans proches et lointains de ses événements), et
// caricaturé : la pièce exagérée (v0), le son déréverbéré — la pièce retirée, le joueur tout près (v1), les plans inversés —
// ce qui était proche part au loin, ce qui était loin se rapproche (v2). Traité après le mixage des strates, sur l'enfant entier.
ORGANO.lieu = {
  dims: { espace: 1, corps: 0.3, matiere: 0.1 },
  relevance: T => 0.7,
  make (P, ctx, iota, variant) {
    const v = variant % 3, room = roomOf(P), mode = v === 2 && (room.nNear + room.nFar) < 2 ? 3 : v;
    // (V6.4) déréverbérer une pièce sèche ne retire rien (mesuré : 0,0 à 0,1 dB sur la trompette et le violoncelle, T60 0,2 à
    // 0,4 s) : le gène ne s'y pose pas
    if (v === 1 && dereverbDb(P) > -0.5) return null;
    // (V6.4) la traîne ajoutée : 1,15 × le plus long T60 de la pièce agrandie (la v6.3 : 1,2 × T60 médian × 1,5 à 3)
    const tail = v === 1 ? 0 : Math.round(1.15 * Math.max(...room.t60o) * (1 + 0.5 * iota) * P.sr);
    return { desc: ['room exaggerated', 'dereverberated', 'planes inverted', 'depth by register'][mode],
      apply (layers, D) { return { layers, D: D + tail }; }, room: { mode, iota } };
  }
};

// CORDES SYMPATHIQUES (V6.2) — l'instrument reçoit des cordes qui résonnent par SYMPATHIE avec le son de l'enfant : chacune est
// un vrai résonateur à retard (peigne bouclé à la période de la corde, amorti dans sa boucle comme une corde réelle — les
// aigus s'éteignent d'abord), excité par l'enfant lui-même : elle ne s'éveille que si le son contient sa fréquence ou ses
// rangs, et ce qu'elle rend est le spectre du SUJET relu sur ses propres harmoniques — son timbre vient du son, pas d'une
// sinusoïde (v5–V6 : trois sinus de synthèse, « beaucoup trop lisses », Mat). L'accord, trois manières :
//   v0 la gamme déduite — les degrés les plus proches du registre du son ;
//   v1 les PARTIELS MESURÉS du sujet — ses raies les plus fortes, à leur hauteur exacte, microtonalité comprise : une irisation
//      tirée du son lui-même ;
//   v2 leurs MULTIPLES ET DIVISIONS — des quatre partiels les plus forts : ×½, ×⅔, ×3⁄2, ×2, ×⅓, ×3 (sous- et sur-harmoniques,
//      les quintes et octaves internes du timbre).
// Le nombre de cordes croît avec la dose (4 à 12), leur résonance aussi (τ 0,8 à 3 s) ; l'amortissement de boucle suit la
// brillance mesurée du sujet (centroïde rapporté à sa fondamentale).
function partialMap (P) {
  if (P.__pmap) return P.__pmap;
  const lo = centsOf(50), res = 10, nb = Math.ceil((centsOf(8000) - lo) / res), H = new Float64Array(nb);
  for (const fr of P.frames || []) for (const p of fr.peaks || []) { if (!(p.f > 50 && p.f < 8000)) continue; const b = Math.round((centsOf(p.f) - lo) / res); if (b >= 0 && b < nb) H[b] += p.a; }
  const Hs = Float64Array.from(H, (_, b) => (H[b - 1] || 0) * 0.5 + H[b] + (H[b + 1] || 0) * 0.5), out = [];
  for (let b = 1; b < nb - 1; ++b) if (Hs[b] > 0 && Hs[b] >= Hs[b - 1] && Hs[b] > Hs[b + 1]) out.push({ hz: hzOf(lo + b * res), w: Hs[b] });
  out.sort((a, b) => b.w - a.w);
  return (P.__pmap = out);
}
ORGANO.sympathique = {
  dims: { corps: 0.5, hauteur: 0.5, espace: 0.3, matiere: 0.4 },
  relevance: T => 0.3 + 0.7 * T.tonal,
  make (P, ctx, iota, variant) {
    const v = variant % 3, K = 4 + Math.round(8 * iota), f0c = P.fundamentalCents ?? 6000, far = (c, list) => list.every(x => Math.abs(x - c) >= 30);
    let cents = [], how = '';
    if (v === 1 || v === 2) {
      const pm = partialMap(P).filter(p => p.hz > 60 && p.hz < 5000);
      if (v === 1) { for (const p of pm) { const c = centsOf(p.hz); if (far(c, cents)) cents.push(c); if (cents.length >= K) break; } how = 'tuned to the subject\'s own measured partials'; }
      else {
        const top = []; for (const p of pm) { const c = centsOf(p.hz); if (far(c, top)) top.push(c); if (top.length >= 4) break; }
        for (const r of [1 / 2, 2 / 3, 3 / 2, 2, 1 / 3, 3]) for (const c of top) { if (cents.length >= K) break; const x = c + 1200 * Math.log2(r), hz = hzOf(x); if (hz > 60 && hz < 5000 && far(x, cents) && far(x, top)) cents.push(x); }
        how = 'tuned to multiples and divisions of its strongest partials';
      }
    }
    if (!cents.length) {
      const sc = (ctx.deg.scale.length ? ctx.deg.scale : ctx.deg.all).filter(c => c > centsOf(80) && c < centsOf(5000));
      cents = sc.map(c => [c, Math.abs(c - (f0c + 1200))]).sort((a, b) => a[1] - b[1]).slice(0, K).map(x => x[0]);
      how = `tuned to the scale (${P.tuning?.name || 'found in the subject'})`;
    }
    if (!cents.length) return null;
    cents.sort((a, b) => a - b);
    // niveau : le halo mesuré à −16 + 10·ι dB sous l'enfant (−11,7 dB à la plus petite dose permise, −6 dB à ι 1)
    // (V6.4, Mat : « l'enveloppe des cordes n'a rien à voir avec celle du sample d'origine : il faut de la cohérence de
    // morphologie ». Mesuré en v6.3 : les cordes s'éteignaient en 0,8 à 3 s quel que soit le son — la voix, qui perd 30 dB en
    // 190 ms, gardait un halo 2,9 à 4,5 s ; corrélation des enveloppes 0,36 à 0,85.) Le temps de résonance des cordes est
    // celui du SUJET (0,29 × son temps d'extinction : 30 dB en relMs), allongé avec la dose jusqu'au double ; et l'enveloppe du
    // halo suit celle de l'enfant passée par les vitesses du sujet (sympatheticHalo)
    const relS = 0.29e-3 * ((ctx.envp && ctx.envp.relMs) || 200), tauS = clamp(relS * (1 + iota), 0.05, 2.5), g = -16 + 10 * iota;
    const attS = 1e-3 * ((ctx.envp && ctx.envp.attMs) || 20);
    const bright = clamp(Math.log2(Math.max(1, (P.traits && P.traits.centroid) || 1000) / Math.max(80, P.fundamentalHz || 200)) / 5, 0, 1);
    return { desc: `${cents.length} sympathetic strings ${how}, resonance ${tauS.toFixed(2)} s (the subject's own release${iota > 0.05 ? ` × ${(1 + iota).toFixed(1)}` : ''}), their envelope shaped like the subject's`,
      apply (layers, D) { return { layers, D: D + Math.round(1.5 * tauS * P.sr) }; },
      halo: { strings: cents.map(hzOf), tau: tauS, att: attS, rel: tauS, levelDb: g, damp: 0.35 - 0.3 * bright, pans: cents.map((_, k) => 0.15 + 0.7 * ((k * 0.618) % 1)) } };
  }
};

// ============================================================================================
//  GESTES DE FORME ET DE HAUTEUR (échelle microscopique : les voix sont les rangs, le rythme
//  celui des attaques, la forme la succession des phases) — mêmes lois que la v3
// ============================================================================================
export const GESTES = {};
const bandMask = (K, F) => {
  // K bandes en log2(f/F) (rang 1 → 32), partition de puissance en cos² (la somme des bandes rend le son entier)
  // (V6.5) …en ÉNERGIE : c'est la bonne partition pour des bandes qui ne sonnent pas ensemble au même instant (l'éclosion :
  // chacune entre avec son propre retard, leurs sommes sont incohérentes)
  const x = f => clamp(Math.log2(Math.max(1e-3, f / F)) * (K - 1) / 5, 0, K - 1);
  return k => f => { const d = Math.abs(x(f) - k); return d >= 1 ? -90 : 10 * Math.log10(Math.max(1e-9, Math.cos(Math.PI / 2 * d) ** 2)); };
};
// (V6.5) bandes qui sonnent EN MÊME TEMPS (l'espace : le même son, au même instant, chaque registre à sa place) : partition
// en AMPLITUDE (cos² d'amplitude) appliquée à phase nulle sur la strate rendue (mixLayers, zeroPhaseMask) — leur somme rend le
// son exact. La partition en énergie, sous des filtres à phase minimale, laissait +3 / −2,2 dB aux croisements (K = 3) ;
// en amplitude sous phase minimale ce serait −3 dB (et −12 dB à K = 8). Pré-écho de la bande grave : −30 dB d'énergie
// avant −2 ms (fondamentale 150 Hz), et il s'annule dans la somme
const bandAmp = (K, F) => {
  const x = f => clamp(Math.log2(Math.max(1e-3, f / F)) * (K - 1) / 5, 0, K - 1);
  return k => f => { const d = Math.abs(x(f) - k); return d >= 1 ? 0 : Math.cos(Math.PI / 2 * d) ** 2; };
};
/** vie mesurée du parent : écart de hauteur (cents) et de niveau (dB) à leur tendance lente, à la position source s */
function lifeTracks (P) {
  if (P._life) return P._life;
  const nf = P.voiced.length, rate = P.sr / P.hopF;
  const dc = new Float64Array(nf), dd = new Float64Array(nf);
  // la vie de la hauteur se lit DANS chaque note (parent.js : hauteur continue, sauts < 80 c) : lue sur toute une suite de
  // trames voisées, une liaison entre deux notes passait pour une « déviation » de plusieurs centaines de cents, que le gène
  // multipliait (mesuré : des écarts de niveau de ±20 dB sur la clarinette basse liée) ; bornée à ±80 c
  for (const q of P.notes || []) {
    const a = q.j0, b = Math.min(nf, q.j1); if (b - a < 8) continue;
    const c = Float64Array.from({ length: b - a }, (_, i) => centsOf(P.voiced[a + i])); const tr = smoothArr(c, 2, rate);
    for (let i = 0; i < b - a; ++i) dc[a + i] = clamp(c[i] - tr[i], -80, 80);
  }
  const lev = Float64Array.from(P.frameEnergy, e => 10 * Math.log10(e + 1e-20)), ls = smoothArr(lev, 4, rate);
  let mx = -1e9; for (const v of lev) mx = Math.max(mx, v);
  for (let i = 0; i < nf; ++i) dd[i] = lev[i] > mx - 50 ? clamp(lev[i] - ls[i], -12, 12) : 0;
  const at = (arr) => s => { if (s === null) return 0; const x = s / P.hopF, i = Math.floor(x), u = x - i; if (i < 0) return arr[0]; if (i >= nf - 1) return arr[nf - 1]; return arr[i] * (1 - u) + arr[i + 1] * u; };
  return (P._life = { dc: at(dc), dd: at(dd) });
}
function smoothArr (x, fc, rate) {        // passe-bas aller-retour (Butterworth 2) — même que model.smooth
  const n = x.length; if (n < 3) return Float64Array.from(x);
  const K = Math.tan(Math.PI * Math.min(fc, rate * 0.45) / rate), q = Math.SQRT1_2, nn = 1 / (1 + K / q + K * K);
  const b0 = K * K * nn, b1 = 2 * b0, b2 = b0, a1 = 2 * (K * K - 1) * nn, a2 = (1 - K / q + K * K) * nn;
  const run = v => { let z1 = v[0] - b0 * v[0], z2 = b2 * v[0] - a2 * v[0]; for (let i = 0; i < v.length; ++i) { const u = v[i], y = b0 * u + z1; z1 = b1 * u - a1 * y + z2; z2 = b2 * u - a2 * y; v[i] = y; } };
  const e = Float64Array.from(x); run(e); e.reverse(); run(e); e.reverse(); return e;
}

// 1 — ÉCLOSION : les bandes de rangs entrent tour à tour (espacement en log2 du rang : l'octave, la quinte, la quarte…
//     s'ouvrent comme une fleur), calées sur la grille ; chaque bande entre avec SA propre attaque et vit sa vie entière.
GESTES.eclosion = {
  cat: 'delay', profile: [0.1, 0.5, 0.7, 0.4, 0.6, 0.1, 0.1, 0.1],
  relevance: T => T.tonal * (0.4 + 0.6 * Math.min(1, T.nHarm / 12)),
  make (P, ctx, iota, variant) {
    const K = Math.min(ctx.layerBudget ?? 8, Math.max(3, Math.round(4 + 4 * iota)));
    const F = P.f0med || 150, mask = bandMask(K, F);
    const order = b => variant === 1 ? K - 1 - b : variant === 2 ? Math.abs(b - (K - 1) / 2) * 2 : b;
    const span = Math.max(ctx.grid.unit * 4, ctx.grid.snap(iota * 1.4 * (P.traits.activeEnd - P.traits.activeStart) * P.sr));
    const entry0 = b => Math.round(ctx.grid.snap(span * Math.log2(1 + order(b)) / Math.log2(1 + (K - 1))) / Q) * Q;
    // l'éclosion commence quand le son est là : les bandes qui entrent d'abord doivent porter ≥ 1 % de l'énergie (spectre
    // moyen du parent) — sinon l'enfant s'ouvre sur un quasi-silence (mesuré : 0,6 à 1,9 s sous −45 dB pour une éclosion
    // descendante qui commence par les aigus d'un son grave) ; l'ordre et les écarts entre entrées restent ceux du geste
    const eBand = Array.from({ length: K }, (_, k) => { const mk = mask(k); let e = 0; for (let q = 1; q < P.Pavg.length; ++q) { const f = q * P.sr / P.Nf; if (f > 20000) break; e += P.Pavg[q] * Math.pow(10, mk(f) / 10); } return e; });
    const eTot = eBand.reduce((a, b) => a + b, 0) || 1, byEntry = Array.from({ length: K }, (_, k) => k).sort((a, b) => entry0(a) - entry0(b));
    let acc = 0, lead = 0; for (const k of byEntry) { acc += eBand[k]; if (acc >= 0.01 * eTot) { lead = entry0(k); break; } }
    const entry = b => Math.max(0, entry0(b) - lead), spanEff = span - lead;
    return { desc: `${['rising', 'falling', 'centre-out'][variant % 3]} bloom in ${K} bands over ${(spanEff / P.sr).toFixed(2)} s`,
      apply (layers, D) {
        const out = [];
        for (const S0 of layers) for (let k = 0; k < K; ++k) { const S = cloneLayer(S0); S.delay = S0.delay + entry(k); const mk = mask(k); S.env.push(f => mk(f)); out.push(S); }
        return { layers: out, D: D + spanEff };
      } };
  }
};

// 2 — CANON DE PROPORTION : le son contre lui-même en augmentation (3/2, 2…), les voix lentes plus graves (degrés de la gamme).
GESTES.canon = {
  cat: 'multiply', profile: [0.6, 0.7, 0.3, 0.6, 0.8, 0.2, 0.3, 0.3],
  relevance: T => 0.55 + 0.25 * Math.min(1, T.onsets / 6) + 0.2 * T.tonal,
  make (P, ctx, iota, variant) {
    const sets = [[1, 2 / 3, 1 / 2], [1, 3 / 4, 2 / 3, 1 / 2], [1, 4 / 5, 2 / 3, 1 / 2]];
    const rs0 = sets[variant % 3], N = clamp(2 + Math.round(iota * (rs0.length - 2)), 2, rs0.length), rs = rs0.slice(0, N);
    const lad = ctx.ladder || [0, 700, 1200, 1900];
    const down = i => { if (!i) return 0; const Pd = ctx.period || 1200; const k = lad.length > 2 * i ? lad[2 * i] : 700 * i; return -(Math.ceil(k / Pd) * Pd - k) - (i > 1 ? Pd * Math.floor((i - 1) / 2) : 0); };
    const entryStep = ctx.grid.has ? ctx.grid.beat * (variant === 2 ? 2 : 1) : ctx.grid.unit * 2;
    return { desc: `proportion canon ${rs.map(r => (1 / r).toFixed(2)).join(':')}, slow voices on degrees ${rs.map((_, i) => Math.round(down(i))).join('/')} c`,
      apply (layers, D) {
        const out = []; let D2 = D;
        rs.forEach((r, i) => {
          const off = Math.round(i * entryStep / Q) * Q, shift = down(i);
          for (const S0 of layers) {
            const S = cloneLayer(S0); S.gain = S0.gain * Math.pow(10, -3 * i / 20);
            S.map = S0.map.scaled(1 / r, off);
            if (shift) S.r.push(() => Math.pow(2, shift / 1200));
            // les fonctions liées au temps de la strate suivent sa nouvelle horloge (augmentée)
            out.push(S);
          }
          D2 = Math.max(D2, off + D / r);
        });
        return { layers: out, D: Math.ceil(D2) };
      } };
  }
};

// 3 — HOQUET SPECTRAL : les rangs voisins se répondent (pairs/impairs, trois familles, ou registres) ; chaque famille
//     parle à son tour comme une résonance frappée ; les autres ne s'éteignent jamais tout à fait. Le souffle répond aux graves.
//     (V6.2 — « trop régulier », Mat) Le tour de parole ne suit plus la grille pas à pas : il suit le RYTHME DU SUJET — ses
//     attaques, mises en durées de 1 à 4 pas (au plus 8, une cellule), et leurs ACCENTS : l'attaque la plus forte donne la
//     parole à la première famille, les plus faibles aux suivantes ; à chaque retour de la cellule les familles tournent d'un
//     cran (le hoquet voyage) ; chaque tour sonne et s'éteint à la mesure de sa propre durée ; les bornes suivent le
//     micro-groove du sujet. Sans attaques : ses événements (notes, gonflements) ; sinon le pas droit.
GESTES.hoquet = {
  cat: 'gate', profile: [0.1, 0.2, 0.7, 0.9, 0.3, 0.2, 0.3, 0.2],
  relevance: T => T.tonal * (0.6 + 0.4 * Math.min(1, T.nHarm / 10)),
  make (P, ctx, iota, variant) {
    const G = variant % 2 ? 3 : 2, reg = variant >= 2;
    const fam = h => reg ? Math.min(G - 1, Math.floor(Math.log2(h) / 5 * G)) : (h - 1) % G;
    const step = ctx.grid.unit * (iota < 0.5 ? 2 : 1), floorDb = -(12 + 24 * iota), sr = P.sr, F0 = P.f0med || 150;
    // la cellule : durées (en pas) et accents des attaques du sujet
    const cell = [], acc = [];
    const src = (P.onsetsAll || []).map(o => ({ s: o.s, w: o.strength || 1 }));
    const evs = (ctx.ms && ctx.ms.events || []).map(e => ({ s: e.s0, w: e.peak ?? e.loud ?? 1 }));
    for (const list of [src, evs]) {
      if (cell.length >= 2) break; cell.length = 0; acc.length = 0;
      const L = list.slice().sort((a, b) => a.s - b.s);
      for (let i = 1; i < L.length && cell.length < 8; ++i) { const d = (L[i].s - L[i - 1].s) / step; if (d < 0.5) continue; cell.push(clamp(Math.round(d), 1, 4)); acc.push(L[i - 1].w); }
    }
    if (cell.length < 2) { cell.length = 0; acc.length = 0; for (let i = 0; i < G; ++i) { cell.push(1); acc.push(G - i); } }
    const m = cell.length, grp = acc.map(a => Math.min(G - 1, Math.floor(acc.filter(b => b > a).length / m * G)));
    // bornes : la grille droite (phase, puis les durées de la cellule) passée par le micro-groove, construites à la demande
    const fl = Math.pow(10, floorDb / 20), B = []; let raw = ctx.grid.phase;
    const bound = i => { while (B.length <= i) { if (B.length) raw += cell[(B.length - 1) % m] * step; B.push(ctx.grid.warp(raw)); } return B[i]; };
    const seg = t => { if (t < bound(0)) return -1; let lo = 0, hi = 1; while (bound(hi) <= t) { lo = hi; hi *= 2; } while (hi - lo > 1) { const md = (lo + hi) >> 1; if (bound(md) <= t) lo = md; else hi = md; } return lo; };
    const env = (t, g) => {
      const i = seg(t); if (i < 0) return g === grp[(m - 1) % m] ? 1 : fl;      // avant la première borne : le dernier tour
      const who = (grp[i % m] + Math.floor(i / m)) % G; if (who !== g) return fl;
      const b0 = bound(i), len = Math.max(1, bound(i + 1) - b0), u = Math.max(0, t - b0) / sr, tauD = len * (0.35 + 0.5 * (1 - iota)) / sr;
      return fl + (1 - fl) * Math.min(1, u / 0.003) * (0.35 + 0.65 * Math.exp(-u / tauD));
    };
    return { desc: `hocket in ${G} ${reg ? 'register' : 'alternating'} groups on the subject's own rhythm (${cell.join('+')} steps of ${(step / sr * 1000).toFixed(0)} ms, turns given by its accents, rotating at each return)`,
      apply (layers, D) {
        for (const S of layers) {
          S.partial.push((h, f, d, t) => [f, d + db20(env(t, fam(h)))]);
          S.free.push((f, d, t) => [f, d + db20(env(t, fam(Math.max(1, Math.round(f / F0)))))]);
          S.envNoise.push((f, t) => db20(env(t, 0)));
        }
        return { layers, D };
      } };
  }
};

// 4 — CHANT DIPHONIQUE : une mélodie d'harmoniques — à chaque pas, le rang le plus proche d'un degré de la gamme est mis
//     en lumière et les autres s'effacent, avec des glissements ; la mélodie suit le contour des notes du parent (ou une arche).
GESTES.chant = {
  cat: 'db', profile: [0.6, 0.2, 0.9, 0.5, 0.3, 0.2, 0.1, 0.1],
  relevance: T => Math.min(1, T.nHarm / 8) * T.tonal,
  make (P, ctx, iota, variant) {
    const scale = ctx.deg.scale, f0c = P.fundamentalCents ?? 6000;
    const hs = []; for (let h = 3; h <= 24; ++h) hs.push(h);
    const cand = hs.filter(h => !scale.length || Math.abs(nearest(scale, f0c + 1200 * Math.log2(h)) - (f0c + 1200 * Math.log2(h))) < 45);
    const C = cand.length >= 3 ? cand : hs.slice(0, 10);
    const contour = P.notes.length >= 3 ? P.notes.map(n => n.f0) : null;
    const L = Math.max(6, Math.min(16, C.length * 2)), seq = [];
    for (let k = 0; k < L; ++k) {
      let u; if (contour) { const c = contour[k % contour.length], mn = Math.min(...contour), mx = Math.max(...contour); u = mx > mn ? (c - mn) / (mx - mn) : 0.5; } else u = 1 - Math.abs(2 * k / (L - 1) - 1);
      if (variant === 1) u = 1 - u;
      seq.push(C[Math.round(u * (C.length - 1))]);
    }
    const step = ctx.grid.has ? ctx.grid.unit * 2 : Math.max(ctx.grid.unit, 0.12 * P.sr), glide = 0.25;
    const target = t => { const x = (t - ctx.grid.phase) / step, k = Math.floor(x), u = x - k; const a = seq[((k % L) + L) % L], b = seq[(((k + 1) % L) + L) % L]; const w = u < 1 - glide ? 0 : 0.5 - 0.5 * Math.cos(Math.PI * (u - (1 - glide)) / glide); return Math.log2(a) * (1 - w) + Math.log2(b) * w; };
    const boost = 6 + 12 * iota, cut = 6 + 18 * iota;
    return { desc: `overtone singing on partials ${seq.join('-')} (step ${(step / P.sr * 1000).toFixed(0)} ms)`,
      apply (layers, D) {
        for (const S of layers) {
          S.partial.push((h, f, d, t) => { if (h <= 2) return [f, d - 6]; const w = Math.exp(-0.5 * ((Math.log2(h) - target(t)) / 0.09) ** 2); return [f, d + boost * w - cut * (1 - w)]; });
          S.free.push((f, d) => [f, d - 0.7 * cut]);
          S.envNoise.push(() => -6);
        }
        return { layers, D: Math.max(D, Math.ceil(L * step)) };
      } };
  }
};

// 5 — MIROIR SPECTRAL : le spectre se retourne autour de la fondamentale (série harmonique → série inférieure) ; chaque
//     partiel bascule avec un ressort amorti, les aigus plus tard, en emportant sa région ; le corps reste en place.
GESTES.miroir = {
  cat: 'pitch', profile: [1.0, 0.1, 0.8, 0.0, 0.2, 0.2, 0.1, 0.1],
  relevance: T => T.tonal,
  make (P, ctx, iota, variant) {
    const axis = variant === 1 && ctx.ladder ? P.fundamentalCents + ctx.ladder[Math.min(ctx.ladder.length - 1, 4)] : P.fundamentalCents ?? 6000;
    const sr = P.sr, T0 = variant === 2 ? 0 : 0.08 * P.n / sr, Tsp = 0.25 + 0.6 * (1 - iota), amount = 0.5 + 0.5 * iota;
    const lo = axis, span = 1200 * 5, dur = P.n / sr;
    const lam = (c, t) => variant === 2 ? 1 : spring(t / sr - T0 - 0.35 * clamp((c - lo) / span, 0, 1) * dur * iota, Tsp);
    const cmin = centsOf(28), cmax = centsOf(16000);
    const mv = (f, d, t) => { const c = centsOf(f), c2 = c + amount * lam(c, t) * (2 * axis - 2 * c); if (c2 < cmin || c2 > cmax) return null; return [hzOf(c2), d]; };
    return { desc: `spectral mirror around ${Math.round(axis)} c${variant === 2 ? ' (immediate)' : ''}, body kept`,
      apply (layers, D) {
        for (const S of layers) { S.src = 'index'; S.partial.push((h, f, d, t) => mv(f, d, t)); S.free.push((f, d, t) => mv(f, d, t)); S.envNoise.push(() => -3); }
        return { layers, D };
      } };
  }
};

// 6 — CRIBLE : le timbre s'accorde sur la gamme déduite — chaque partiel est attiré vers le degré le plus proche (ressort),
//     ceux qui tombent entre deux degrés s'effacent ; la vie (vibrato) se calme.
GESTES.crible = {
  cat: 'pitch', profile: [0.8, 0.1, 0.6, 0.0, 0.1, 0.4, 0.2, 0.0],
  relevance: T => T.tonal * 0.9,
  make (P, ctx, iota, variant) {
    const sc = variant === 1 ? ctx.deg.all : ctx.deg.scale;
    if (!sc.length) return null;
    const sr = P.sr, Tsp = 0.3 + 0.5 * (1 - iota), pull = Math.min(1, 0.45 + 0.55 * iota), lo = P.fundamentalCents ?? 6000;
    const stepC = sc.length > 1 ? (sc[sc.length - 1] - sc[0]) / (sc.length - 1) : 100;
    const lam = (c, t) => spring(t / sr - 0.05 - 0.5 * clamp((c - lo) / 6000, 0, 1) * Math.min(1.5, P.n / sr * 0.4), Tsp);
    const life = lifeTracks(P);
    const mv = (f, d, t) => { const c = centsOf(f), tg = nearest(sc, c), l = lam(c, t), dist = Math.abs(tg - c); return [hzOf(c + pull * l * (tg - c)), d - (6 + 18 * iota) * l * clamp((dist / stepC - 0.2) / 0.3, 0, 1)]; };
    return { desc: `sieve on ${variant === 1 ? 'the whole tuning' : 'the scale'} (${P.tuning?.name}), pull ${Math.round(pull * 100)} %`,
      apply (layers, D) {
        for (const S of layers) {
          S.src = 'index'; S.partial.push((h, f, d, t) => mv(f, d, t)); S.free.push((f, d, t) => mv(f, d, t));
          S.r.push((t, s) => Math.pow(2, -0.6 * iota * life.dc(s) / 1200));        // le vibrato se calme
          S.envNoise.push(() => db20(1 - 0.5 * iota));
        }
        return { layers, D };
      } };
  }
};

// 7 — ÉTIREMENT : la série harmonique se dilate (cloche) ou se contracte (gong) : f_h = f1·h^(1+s) ; les modes aigus s'éteignent plus vite.
GESTES.etirement = {
  cat: 'pitch', profile: [0.7, 0.2, 0.8, 0.0, 0.1, 0.2, 0.0, 0.0],
  relevance: T => T.tonal * (0.5 + 0.5 * Math.min(1, T.nHarm / 6)),
  make (P, ctx, iota, variant) {
    const s = (variant === 1 ? -1 : 1) * (0.04 + 0.22 * iota), axis = hzOf(P.fundamentalCents ?? 6000), clock = noteClock(P);
    return { desc: `${s > 0 ? 'bell' : 'gong'} stretch (exponent ${(1 + s).toFixed(3)}), upper modes decaying`,
      apply (layers, D) {
        for (const S of layers) {
          S.src = 'index';
          S.partial.push((h, f, d, t, F, sp) => { const f2 = f * Math.pow(h, s); return [f2, d - 9 * iota * clock(sp) * Math.max(0, Math.log2(f2 / axis))]; });
          S.free.push((f, d, t, sp) => { const f2 = axis * Math.pow(f / axis, 1 + s); return [f2, d - 9 * iota * clock(sp) * Math.max(0, Math.log2(f2 / axis))]; });
        }
        return { layers, D };
      } };
  }
};

// 8 — VIE AMPLIFIÉE : la caricature du vivant — le vibrato et le trémolo MESURÉS du son multipliés ; le trémolo gagne la
//     hauteur (le son tremble dans son propre rythme). (La cadence propre de la vie suit le temps du son.)
GESTES.vie = {
  cat: 'life', profile: [0.5, 0.4, 0.2, 0.2, 0.2, 1.0, 0.1, 0.1],
  relevance: T => 0.3 + 0.7 * Math.min(1, T.lifeCents / 6 + T.lifeDb / 2.5) * T.tonal,
  make (P, ctx, iota, variant) {
    const kc = 1 + 7 * iota, kd = 1 + 2 * iota, cross = [6, 3, 9][variant % 3] * iota, life = lifeTracks(P);
    return { desc: `life ×${kc.toFixed(1)} (pitch) ×${kd.toFixed(1)} (dynamics), tremolo→pitch ${cross.toFixed(1)} c/dB`,
      apply (layers, D) {
        for (const S of layers) {
          S.r.push((t, s) => Math.pow(2, ((kc - 1) * life.dc(s) + cross * life.dd(s)) / 1200));
          // (±6 dB au plus : la vie du son, ce sont ses fluctuations ; amplifiés, les creux entre deux notes devenaient des coupes
          // — mesuré : trois chutes de plus de 20 dB en 20 ms sur la clarinette basse, qui n'en a aucune)
          S.gainDb.push((t, s) => clamp((kd - 1) * life.dd(s), -6, 6));
        }
        return { layers, D };
      } };
  }
};

// 9 — CORPS CARICATURÉ : les formants creusés/gonflés (contraste ×k autour de la pente générale), le corps glisse (géant ou minuscule), hauteur inchangée.
GESTES.corps = {
  cat: 'db', profile: [0.0, 0.0, 1.0, 0.0, 0.0, 0.1, 0.2, 0.0],
  relevance: T => T.tonal * Math.min(1, T.nHarm / 8),
  make (P, ctx, iota, variant) {
    const k = 1 + 2.5 * iota, shift = (variant === 1 ? 1 : -1) * (200 + 900 * iota);
    return { desc: `caricatured body: contrast ×${k.toFixed(2)}, ${shift > 0 ? 'tiny' : 'giant'} body (${Math.round(shift)} c)`,
      apply (layers, D) { for (const S of layers) S.bodyX = () => ({ contrast: k, shift }); return { layers, D }; } };
  }
};

// 10 — RÉTROGRADE DES VIES : chaque intervalle entre attaques est joué à rebours — chaque coup est ASPIRÉ jusqu'à l'attaque suivante.
GESTES.retro = {
  cat: 'map', profile: [0.1, 0.6, 0.4, 0.5, 0.6, 0.3, 0.7, 0.1],
  relevance: T => 0.45 + 0.35 * Math.min(1, T.sharpOnsets / 4) + 0.2 * (1 - T.tonal),
  make (P, ctx, iota, variant) {
    const a0 = Math.round(P.traits.activeStart * P.sr), a1 = Math.round(P.traits.activeEnd * P.sr);
    const ons = [a0, ...P.onsetsAll.filter(o => o.sharp || variant === 1).map(o => o.s).filter(x => x > a0 && x < a1), a1].sort((a, b) => a - b);
    const bnd = ons.filter((x, i) => !i || x - ons[i - 1] > 0.05 * P.sr);
    // chaque intervalle perd sa queue morte (au-delà de 90 ms sous −30 dB de la crête) AVANT d'être retourné : sinon le
    // silence de fin d'une longue résonance devient un long silence au début de l'aspiration (mesuré : 3,8 s sur synth plant ;
    // à −40 dB, la fin d'une fourchette retournée restait 1,9 s sous −40 dB avant de monter)
    const alive = x => { const b = Math.floor(x / (0.01 * P.sr)); return b < P.env.length && P.env[b] >= P.peakDb - 30; };
    const segs = []; let t = 0;
    // (V6.3) l'intervalle s'arrête 4 ms avant l'attaque suivante : la mesure d'une attaque tombe parfois un peu après son vrai
    // départ (0,4 ms sur la voix), et l'aspiration commençait alors DANS le début de l'attaque suivante, retourné — un clic au
    // départ de chaque segment, mesuré à 0,52 / 0,666 / 0,759 s (rétrograde + taille, la transposition ôte les fondus de la
    // lecture directe qui le masquaient)
    const PRE = Math.round(0.004 * P.sr);
    // (V6.4) la quantité réglée à la main : en dessous de la valeur calculée, seule cette part des intervalles est retournée
    // (répartis par le nombre d'or, sans tirage) ; les autres sont lus à l'endroit
    const amt = clamp(ctx.amt ?? 1, 0, 1), keep = i => amt >= 1 || ((i + 1) * 0.618034) % 1 < amt;
    for (let i = 0; i + 1 < bnd.length; ++i) {
      if (!keep(i)) { const e = bnd[i + 1]; if (e - bnd[i] >= 0.03 * P.sr) { segs.push({ a: Math.max(t, bnd[i]), b: Math.max(t, bnd[i]) + (e - bnd[i]), sa: bnd[i], sb: e }); t = Math.max(t, bnd[i]) + (e - bnd[i]); } continue; }
      let e = bnd[i + 1] - (i + 2 < bnd.length ? PRE : 0), last = -1;
      for (let x = bnd[i]; x < e; x += Math.round(0.01 * P.sr)) if (alive(x)) last = x;
      if (last < 0) continue;
      e = Math.min(e, last + Math.round(0.09 * P.sr));
      if (e - bnd[i] < 0.03 * P.sr) continue;
      // avec un pouls, le coup aspiré (fin de l'intervalle retourné) tombe sur un point de la grille qui garde la phase de
      // l'attaque source (déplacement de tatums entiers) : le premier permis après la fin du précédent ; s'il chevauche,
      // c'est le début de l'aspiration (la queue, la plus faible) qui cède — avant, chaque coupe à « dernier son + 90 ms »
      // décalait tout ce qui suivait hors du pouls
      let pl = e - bnd[i], oe = t + pl;
      if (ctx.grid.has) { const u = ctx.grid.tatum; oe = bnd[i] + Math.ceil((t + pl - bnd[i]) / u - 0.25) * u; if (oe - t < 0.5 * pl) oe += u; const A = Math.max(t, oe - pl); pl = oe - A; }
      segs.push({ a: oe - pl, b: oe, sa: bnd[i] + pl - 1, sb: bnd[i] }); t = oe;
    }
    if (!segs.length) return null;
    return { desc: `retrograde (${segs.length} inhaled intervals)`,
      apply (layers, D) { for (const S of layers) S.map = new TimeMap(segs); return { layers, D: Math.ceil(t) }; } };
  }
};

// 11 — AKSAK : la mesure boite — croches regroupées en valeurs inégales (3+3+2, 2+2+3…), la carte du temps se plie sans coupure.
GESTES.aksak = {
  cat: 'map', profile: [0.0, 0.7, 0.0, 1.0, 0.4, 0.1, 0.3, 0.0],
  relevance: T => (T.tempoBpm ? 0.9 : 0.35) * (0.5 + 0.5 * Math.min(1, T.onsets / 6)),
  make (P, ctx, iota, variant) {
    const pats = [[3, 3, 2], [2, 2, 3], [3, 2, 2, 3, 2]];
    const pat = pats[variant % 3], u = ctx.grid.beat / 2, a = 0.12 + 0.3 * iota;
    const w = []; for (const g of pat) for (let k = 0; k < g; ++k) w.push(g >= 3 ? (k === 0 ? 1 + a : 1 - a * 0.25) : (k === 0 ? 1 + a * 0.5 : 1 - a * 0.5));
    const sum = w.reduce((x, y) => x + y, 0); for (let i = 0; i < w.length; ++i) w[i] *= w.length / sum;
    const segs = []; let t = 0, s = 0, i = 0;
    const ph = ctx.grid.phase % u;
    if (ph > 0) { segs.push({ a: 0, b: ph, sa: 0, sb: ph }); t = ph; s = ph; }
    while (s < P.n) { const len = u * w[i % w.length]; segs.push({ a: t, b: t + len, sa: s, sb: s + u }); t += len; s += u; i += 1; }
    return { desc: `aksak ${pat.join('+')} (skew ${Math.round(a * 100)} %)`,
      apply (layers, D) { for (const S of layers) S.map = new TimeMap(segs); return { layers, D: Math.ceil(t) }; } };
  }
};

// 12 — SPIRALE : glissando relayé (Shepard-Risset) sur le son lui-même — tout monte (ou descend) sans fin d'un degré par cycle.
GESTES.spirale = {
  cat: 'multiply', profile: [0.9, 0.2, 0.5, 0.3, 0.3, 0.3, 0.0, 0.2],
  relevance: T => T.tonal,
  make (P, ctx, iota, variant) {
    const lad = ctx.ladder || [0, 200, 400, 700];
    const I0 = variant === 2 ? 1200 : (lad.find(x => x >= (iota > 0.6 ? 350 : 80)) || 200), I = (variant === 1 ? -1 : 1) * I0;
    const Tc = ctx.grid.has ? ctx.grid.bar / (iota > 0.7 ? 2 : 1) : Math.max(0.8 * P.sr, ctx.grid.unit * 8);
    const phi = t => ((t / Tc) % 1 + 1) % 1;
    return { desc: `${I > 0 ? 'rising' : 'falling'} spiral of ${Math.round(Math.abs(I))} c per ${(Tc / P.sr).toFixed(2)} s cycle`,
      apply (layers, D) {
        const out = [];
        for (const S0 of layers) {
          const A = cloneLayer(S0), B = cloneLayer(S0);
          A.r.push(t => Math.pow(2, phi(t) * I / 1200)); B.r.push(t => Math.pow(2, (phi(t) - 1) * I / 1200));
          A.gainDb.push(t => db20(Math.cos(Math.PI / 2 * phi(t)))); B.gainDb.push(t => db20(Math.sin(Math.PI / 2 * phi(t))));
          out.push(A, B);
        }
        return { layers: out, D };
      } };
  }
};

// 14 — ROTATION : les phrases du son (entre ses attaques) sont permutées — chaque fragment lu à l'endroit, sur un degré qui monte.
GESTES.rotation = {
  cat: 'map', profile: [0.3, 0.4, 0.1, 0.7, 1.0, 0.0, 0.4, 0.0],
  relevance: T => Math.min(1, Math.max(T.sharpOnsets, T.notes, T.onsets / 2) / 4),
  make (P, ctx, iota, variant) {
    const sharpSet = new Set(P.onsetsAll.filter(o => o.sharp).map(o => o.s));
    let cut = [...sharpSet];
    if (cut.length < 3 && P.notes.length >= 3) cut = P.notes.map(q => Math.round(q.t0 * P.sr));
    if (cut.length < 3) cut = P.onsetsAll.map(o => o.s);
    const a0 = Math.round(P.traits.activeStart * P.sr), a1 = Math.round(P.traits.activeEnd * P.sr);
    cut = [a0, ...cut.filter(x => x > a0 + 0.03 * P.sr && x < a1 - 0.03 * P.sr), a1].sort((a, b) => a - b).filter((x, i, a) => !i || x - a[i - 1] > 0.04 * P.sr);
    // queue morte de chaque fragment retirée (au-delà de 90 ms sous −40 dB du pic) : jamais de long silence hors de propos
    const alive = s => { const b = Math.floor(s / (0.01 * P.sr)); return b < P.env.length && P.env[b] >= P.peakDb - 40; };
    // (V6.3) chaque fragment commence 4 ms avant son attaque et s'arrête 4 ms avant la suivante : la mesure d'une attaque tombe
    // parfois un peu après son vrai départ, et le fragment entrait alors DANS l'attaque (le clic isolé de la boucle de
    // percussions à 6,24 s, présent depuis la v5.5)
    const PRE = Math.round(0.004 * P.sr), segs = [];
    for (let i = 0; i + 1 < cut.length; ++i) {
      const c0 = i ? Math.max(cut[i - 1] + 1, cut[i] - PRE) : cut[i];
      let e = cut[i + 1] - (i + 2 < cut.length ? PRE : 0), last = -1;
      for (let s = c0; s < e; s += Math.round(0.01 * P.sr)) if (alive(s)) last = s;
      if (last < 0) continue;
      e = Math.min(e, last + Math.round(0.09 * P.sr));
      if (e - c0 > 0.04 * P.sr) segs.push([c0, e, cut[i + 1] - cut[i]]);
    }
    const K = segs.length; if (K < 3) return null;
    // MORPHOLOGIE (v5.8, Mat : « la fin du sample placée au début, puis un silence, puis le début qui revient et se coupe
    // net : ce type de morphologie ne produit pas de sens ») — comme un son acoustique, l'enfant commence par une attaque
    // (chaque fragment part d'une attaque du sujet) et FINIT PAR L'EXTINCTION DU SUJET : le dernier fragment, qui porte sa
    // résonance finale, reste à la fin ; seuls les K − 1 autres tournent. Un fragment coupé net (l'attaque suivante du sujet
    // le coupait) est toujours suivi d'une attaque qui masque la coupe, jamais d'un silence.
    const M1 = __NO_MORPH() ? K : K - 1;
    let order;
    if (variant === 0) { const r = Math.ceil(M1 / 3); order = Array.from({ length: M1 }, (_, i) => (i + r) % M1); }
    else if (variant === 1) order = Array.from({ length: M1 }, (_, i) => M1 - 1 - i);
    else { order = []; for (let i = 0; i < Math.ceil(M1 / 2); ++i) { order.push(i); if (M1 - 1 - i !== i) order.push(M1 - 1 - i); } }
    if (M1 < K) order.push(K - 1);
    const lad = ctx.ladder || [0, 200, 400, 500, 700];
    // avec un pouls, chaque fragment n'est déplacé que de TATUMS entiers (le pas de grille attesté par les attaques) : tout ce qu'il contient garde sa place
    // dans le pouls (et son micro-groove) ; il se pose au premier point permis après la fin du précédent (la queue du
    // précédent peut perdre jusqu'à un quart d'unité, sinon un court silence les sépare) — avant, chaque coupe à « dernier
    // son + 90 ms » décalait tout ce qui suivait hors du pouls
    const out = []; let t = 0;
    order.forEach((k, i) => {
      const [a, b] = segs[k], len = b - a, deg = iota > 0.45 ? lad[Math.min(lad.length - 1, i)] % 1300 : 0;
      let o = t;
      if (ctx.grid.has) {
        const u = ctx.grid.tatum, pv = out[out.length - 1];
        o = a + Math.ceil((t - a) / u - 0.25) * u;
        if (pv && o < pv.a + 0.5 * (pv.b - pv.a)) o += u;
        if (pv && o < pv.b) { pv.sb = pv.sa + (o - pv.a); pv.b = o; }
        // sur une matière tenue, l'attente du point de grille n'est pas un silence : les 120 dernières ms du fragment
        // précédent s'étirent jusqu'à l'attaque suivante (une matière percussive, elle, s'est éteinte : le silence y est naturel)
        if (pv && o > pv.b + 1 && !__NO_MORPH() && (P.envelope ? P.envelope.perc : 0) < 0.5) { const hl = Math.min(0.12 * P.sr, 0.5 * (pv.sb - pv.sa)); pv.b -= hl; pv.sb -= hl; out.push({ a: pv.b, b: o, sa: pv.sb, sb: pv.sb + hl, sharpA: false, deg: pv.deg }); }
      }
      out.push({ a: o, b: o + len, sa: a, sb: b, sharpA: sharpSet.has(a), deg }); t = o + len;
    });
    const map = new TimeMap(out);
    return { desc: `rotation of ${K} fragments (${['shift', 'reversed order', 'interleave'][variant % 3]})${iota > 0.45 ? ', climbing by degrees' : ''}`,
      apply (layers, D) {
        for (const S of layers) { S.map = map; if (iota > 0.45) S.r.push(t => { const i = map.seg(t); return Math.pow(2, (i >= 0 ? map.segs[i].deg : 0) / 1200); }); }
        return { layers, D: Math.ceil(t) };
      } };
  }
};

// 15 — STASE VIVANTE : au moment le plus riche, la lecture presque s'arrête (elle rampe) et le son RESPIRE — puis repart.
GESTES.stase = {
  cat: 'map', profile: [0.1, 0.9, 0.3, 0.3, 0.7, 0.6, 0.4, 0.1],
  relevance: T => T.tonal * 0.7 + 0.3,
  make (P, ctx, iota, variant) {
    // instant le plus riche : nombre de pics × énergie, dans les 70 % premiers de la zone active
    const hop = P.hopF, nf = P.frames.length, sr = P.sr;
    const a0 = Math.floor(P.traits.activeStart * sr / hop), a1 = Math.min(nf - 1, Math.floor((P.traits.activeStart + 0.7 * (P.traits.activeEnd - P.traits.activeStart)) * sr / hop));
    let best = a0, bv = -1; for (let j = a0; j <= a1; ++j) { const v = P.frames[j].peaks.length * Math.sqrt(P.frameEnergy[j]); if (v > bv) { bv = v; best = j; } }
    let ts = Math.round(best * hop / Q) * Q, Tf = Math.round((ctx.grid.has ? ctx.grid.bar * (1 + Math.round(2 * iota)) : (1 + 3 * iota) * sr) / Q) * Q, crawl = 0.03 * Tf;
    // avec un pouls : la stase part d'un point de la grille, dure des mesures entières et la source n'y avance que de tatums
    // entiers — le jeu reprend SUR la grille
    if (ctx.grid.has) { const u = ctx.grid.tatum; ts = clamp(Math.round(ctx.grid.phase + Math.round((best * hop - ctx.grid.phase) / u) * u), 0, Math.max(0, P.n - 2 * u)); Tf = ctx.grid.bar * (1 + Math.round(2 * iota)); crawl = Math.max(1, Math.round(0.03 * Tf / u)) * u; }
    // STASE VIVANTE À CADENCE 1 (v5.5) : la lecture ne rampe plus (3 % de vitesse : un gel, le timbre s'y perdait) ; le son
    // reste autour de l'instant riche en y rejouant de VRAIS fragments à vitesse 1 — chacun garde sa micro-vie entière —
    // enchaînés là où la forme d'onde se prolonge (corrélation sur ±10 ms, ±1 période ou 5 ms de recherche) : un son qui
    // tient, qui respire, jamais un son figé. Le centre de la fenêtre avance de la reptation d'origine (de ts à ts + crawl),
    // la fenêtre fait ±(150 ms + 0,3 × la stase, au plus 600 ms) dans la zone active, sans franchir d'attaque raide (sans
    // pouls) ; les longueurs et les places des fragments suivent le nombre d'or (aucun hasard) ; avec un pouls, chaque
    // fragment dure des tatums entiers et part d'un point de la grille (la stase bat avec le parent)
    const M = P.M, phi = (Math.sqrt(5) - 1) / 2, frac = x => x - Math.floor(x);
    const act0 = Math.round(P.traits.activeStart * sr), act1 = Math.round(P.traits.activeEnd * sr);
    const sharp = P.onsetsAll.filter(o => o.sharp).map(o => o.s).sort((x, y) => x - y);
    const W = Math.min(0.6 * sr, 0.15 * sr + 0.3 * Tf);
    let lo = Math.max(act0, ts - W), hi = Math.min(act1, ts + crawl + W);
    if (!ctx.grid.has) { for (const o of sharp) { if (o > lo && o <= ts) lo = o + Math.round(0.03 * sr); if (o > ts + crawl && o < hi) hi = o - Math.round(0.01 * sr); } }
    const T0 = P.f0med > 0 ? sr / P.f0med : 0.005 * sr, seek = Math.round(Math.min(0.005 * sr, Math.max(T0, 0.001 * sr)));
    const seam = (e, target) => {                                         // départ du fragment suivant près de target
      if (seek < 2) return target;
      const Wc = Math.round(0.01 * sr), st = 2; let bd = 0, bc = -2;
      for (let d = -seek; d <= seek; ++d) { const s2 = target + d; if (s2 - Wc < 0 || s2 + Wc >= P.n || e + Wc >= P.n || e - Wc < 0) continue; let ab = 0, aa = 0, bb = 0; for (let u = -Wc; u < Wc; u += st) { const x1 = M[e + u], x2 = M[s2 + u]; ab += x1 * x2; aa += x1 * x1; bb += x2 * x2; } const c = ab / Math.sqrt(aa * bb + 1e-30); if (c > bc) { bc = c; bd = d; } }
      return target + bd;
    };
    const segs = [{ a: 0, b: ts, sa: 0, sb: ts }];
    let t = ts, src = ts, j = 0;
    const base = ctx.grid.has ? Math.max(1, Math.round(0.2 * sr / ctx.grid.tatum)) * ctx.grid.tatum : 0.18 * sr;
    while (t < ts + Tf - 1) {
      const center = ts + crawl * (t - ts) / Tf;
      let len = ctx.grid.has ? base * (1 + (frac((j + 1) * phi) < 0.5 ? 0 : 1)) : base * (1 + 0.6 * frac((j + 1) * phi));
      len = Math.min(len, ts + Tf - t);
      let sa;
      if (j === 0) sa = ts;
      else {
        let target = center + (2 * frac((j + 1) * phi * phi) - 1) * Math.max(0, (hi - lo) / 2 - len / 2);
        target = clamp(target, lo, Math.max(lo, hi - len));
        if (ctx.grid.has) { const u = ctx.grid.tatum; target = ctx.grid.phase + Math.round((target - ctx.grid.phase) / u) * u; }
        sa = clamp(Math.round(seam(Math.round(src), Math.round(target))), 0, P.n - Math.ceil(len) - 1);
      }
      segs.push({ a: t, b: t + len, sa, sb: sa + len }); t += len; src = sa + len; j++;
    }
    segs.push({ a: ts + Tf, b: ts + Tf + (P.n - ts - crawl), sa: ts + crawl, sb: P.n });
    return { desc: `living stasis at ${(ts / sr).toFixed(2)} s for ${(Tf / sr).toFixed(2)} s (${j} real fragments at speed 1)`,
      apply (layers, D) { for (const S of layers) S.map = new TimeMap(segs); return { layers, D: Math.ceil(segs[segs.length - 1].b) }; } };
  }
};

// 16 — SYNTHÈSE INVERSÉE : le souffle chante — le souffle de chaque région passe dans des résonances étroites posées sur les
//      degrés de la gamme (un chœur fait de sa respiration) ; les partiels, eux, se retirent.
GESTES.inversee = {
  cat: 'multiply', profile: [0.4, 0.1, 0.8, 0.1, 0.2, 0.3, 1.0, 0.2],
  relevance: T => 0.25 + 0.75 * (1 - T.tonal),
  make (P, ctx, iota, variant) {
    const sc = (ctx.deg.scale.length ? ctx.deg.scale : ctx.deg.all).filter(c => c > centsOf(60) && c < centsOf(9000)).map(hzOf);
    if (!sc.length) return null;
    const qn = 18 + 30 * iota, tab = new Float64Array(4801);      // réponse du chœur de résonances, tabulée tous les 5 Hz
    for (let i = 0; i < tab.length; ++i) { const f = Math.max(1, i * 5); let s = 0.12; for (const d of sc) s += 3.5 * svf.bp(f, d, qn); tab[i] = db20(s); }
    const resp = f => tab[Math.min(tab.length - 1, Math.max(0, Math.round(f / 5)))];
    return { desc: `inverted synthesis: the breath sings on ${sc.length} degrees (Q ${qn.toFixed(0)}), partials −${Math.round(18 * iota)} dB`,
      apply (layers, D) {
        for (const S of layers) { S.lobeFloor.push(() => [-18 * iota, 6 * iota, 0]); S.envNoise.push(f => resp(f)); S.inertia.push(() => ({ att: 0, rel: 0.25 + 0.5 * iota })); }
        return { layers, D };
      } };
  }
};

// ESPACE : les registres traversent la scène (trois strates de registre, chacune sa trajectoire)
GESTES.espace = {
  cat: 'pan', profile: [0.0, 0.1, 0.1, 0.2, 0.1, 0.1, 0.0, 1.0],
  relevance: () => 0.5,
  make (P, ctx, iota, variant) {
    const Tc = ctx.grid.has ? ctx.grid.bar : 2 * P.sr, F = P.f0med || 150, K = 3, mask = bandAmp(K, F);
    return { desc: `space: registers cross the stage (${(Tc / P.sr).toFixed(2)} s cycle)`,
      apply (layers, D) {
        const out = [];
        for (const S0 of layers) for (let k = 0; k < K; ++k) {
          const S = cloneLayer(S0), mk = mask(k), rr = k / (K - 1);
          S.zmask.push(mk);
          S.pan.push((p, t) => { const ph = 2 * Math.PI * (t / Tc + (variant ? rr : rr * 0.5)); return clamp(0.5 + (p - 0.5) * (1 - iota) + 0.45 * iota * Math.sin(ph), 0, 1); });
          out.push(S);
        }
        return { layers: out, D };
      } };
  }
};
export const DIMENSIONS = ['hauteur', 'temps', 'spectre', 'rythme', 'forme', 'vie', 'souffle', 'espace'];

// ============================================================================================
//  POPULATION — chaque enfant = une MUTATION DE L'INSTRUMENT (gène principal), parfois un second gène compatible,
//  une MORPHOLOGIE (geste de forme), au besoin un geste de hauteur (gamme). Choix déterministe : pertinence mesurée ×
//  éloignement maximal des enfants déjà nés (excentricité croissante avec le Miroir).
// ============================================================================================
export const DIMS = ['hauteur', 'temps', 'corps', 'rythme', 'forme', 'vie', 'souffle', 'espace', 'matiere', 'articulation', 'source'];
const vecOf = obj => DIMS.map(d => obj[d] || 0);
const OLD = ['hauteur', 'temps', 'corps', 'rythme', 'forme', 'vie', 'souffle', 'espace'];
const formVec = g => { const p = GESTES[g].profile, o = {}; OLD.forEach((d, i) => { o[d] = p[i]; }); return vecOf(o); };
const orgVec = g => vecOf(ORGANO[g].dims);
const dist = (a, b) => Math.sqrt(a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0));
const add = (a, b, k = 1) => a.map((x, i) => x + k * b[i]);
const KIND = {
  taille: 'pitchbody', pavillons: 'mult', sourdine: 'filter', souffle: 'breath', jeu: 'gate', matiere: 'pitchbody', perce: 'filter', section: 'mult', sympathique: 'halo', lieu: 'room',
  rotation: 'map', aksak: 'map', stase: 'map', retro: 'map', eclosion: 'delay', canon: 'mult', hoquet: 'gate', chant: 'pitch', crible: 'pitch', miroir: 'pitch', spirale: 'pitch', etirement: 'pitch', vie: 'life', corps: 'filter', inversee: 'breath', espace: 'pan'
};
const FORMS = ['rotation', 'aksak', 'stase', 'retro', 'eclosion', 'canon', 'hoquet', 'vie', 'espace', 'troue', 'accumulation', 'micropoly', 'multidirige',
  // lot 2 (v5.7) : textures de voix, temps, espace
  'prisme', 'fusion', 'canonvoix', 'parallelisme', 'partielfixe', 'contrametricite', 'silence', 'refrain', 'regime', 'echo', 'pedale',
  // lot 3b (v5.8) : les deux écritures de hauteur qui sont des formes (elles ajoutent du temps)
  'developpement', 'reponse',
  // lot 3c (v5.8) : forme, spectre, voix
  'reptonale', 'formeenonce', 'fin', 'saturee', 'progression', 'tutti', 'halo', 'contrepoint', 'heterophonie',
  // V6.3 : la synthèse inversée (le souffle chante sur les degrés) n'était dans aucune liste depuis la v5.7 — jamais choisie
  'inversee',
  // V6.3, audit du câblage (96 troupes : 8 sujets × Mockery 0,3 / 0,6 / 1 × générations 0–3) : le corps caricaturé (formants
  // creusés ou gonflés, corps géant ou minuscule) n'était dans aucune liste non plus — 0 emploi sur 1 536 mummers
  'corps'];
// lot 3a (v5.8) : les écritures du TEMPS de jgcompose — un enfant sur trois les prend comme morphologie (sinon, 37 morphologies
// pour 16 enfants : mesuré sur 6 sujets, 1,3 écriture du temps par troupe en moyenne)
const TEMPS = ['dilate', 'chalouper', 'groove', 'couches', 'derive', 'detache', 'isoperiode', 'additif', 'preaudible', 'regroupe', 'retard', 'respiration', 'regrid', 'dilatation'];
const PITCH = ['chant', 'crible', 'miroir', 'spirale', 'etirement'];
const MELODY = ['inflexion', 'contour', 'marche', 'arche', 'franchissement', 'permutation', 'interpolation',
  // lot 3b (v5.8) : la hauteur de jgcompose
  'alteration', 'broderie', 'corruption', 'densifier', 'emprunt', 'modulation', 'isorythmie', 'pivot', 'retrograde', 'queue', 'variation', 'voisinage',
  // lot 3c (v5.8) : fins et intonation
  'ouvertclos', 'accordage', 'deviation', 'vecteur'];
const VOICE = ['stimmtausch', 'lampe', 'avenement', 'budget', 'bascule'];
const ORDER = { map: 0, multmap: 0.5, delay: 1, life: 2, pitchbody: 3, melody: 3.5, pitch: 4, voice: 4.5, filter: 5, xb: 5.5, breath: 6, gate: 7, pan: 8, mult: 9, halo: 10, room: 11 };
const LAYERS = { pavillons: v => (v === 1 ? 3 : 2), section: v => [3, 5, 2][v % 3], canon: () => 3, spirale: () => 2, espace: () => 3, micropoly: () => 3 };
// les ÉCRITURES (jgcompose à l'échelle micro / mezzo, ecritures.js) rejoignent les gestes ; la micropolyphonie remplace la
// carte du temps de chaque strate : elle ne se combine à aucun autre geste qui touche au temps
for (const [g, e] of Object.entries({ ...ECRITURES, ...ECRITURES2, ...ECRITURES3, ...ECRITURES4, ...ECRITURES5, ...CRISTAUX })) {
  if (GESTES[g] || ORGANO[g]) throw new Error(`écriture ${g} : nom déjà pris`);
  GESTES[g] = { cat: e.kind, profile: e.profile, relevance: e.relevance, make: (P, ctx, iota, v) => e.make(P, ctx, iota, v, { TimeMap, cloneLayer, partialMap }) };
  KIND[g] = g === 'micropoly' ? 'multmap' : e.kind;
  if (e.layers && !LAYERS[g]) LAYERS[g] = () => e.layers;
}

function compatible (genome, g) {
  const k = KIND[g], kinds = genome.map(x => KIND[x.g]);
  if (genome.some(x => x.g === g)) return false;
  if (k === 'multmap' && kinds.some(x => ['map', 'delay', 'mult', 'pan', 'multmap'].includes(x))) return false;
  if (['map', 'delay', 'mult', 'pan'].includes(k) && kinds.includes('multmap')) return false;
  if ((k === 'melody' || k === 'voice') && kinds.includes(k)) return false;
  if (k === 'map' && (kinds.includes('map') || kinds.includes('delay'))) return false;
  if (k === 'delay' && (kinds.includes('map') || kinds.includes('mult') || kinds.includes('pan'))) return false;
  if ((k === 'mult' || k === 'pan') && (kinds.includes('mult') || kinds.includes('pan') || kinds.includes('delay'))) return false;
  if (g === 'spirale' && (kinds.includes('mult') || kinds.includes('pan'))) return false;
  if ((k === 'pitch' || k === 'pitchbody') && kinds.some(x => x === 'pitch')) return false;
  if (k === 'pitch' && kinds.includes('pitchbody') && g !== 'crible') return false;
  if (k === 'breath' && kinds.includes('breath')) return false;
  if (k === 'gate' && kinds.includes('gate')) return false;
  if (k === 'xb' && kinds.includes('xb')) return false;            // un cristal par mummer
  return true;
}

// ---------------------------------------------------------------------------------------------- accordage
// enfant 1 sur le premier degré (la fondamentale mesurée), puis un degré de plus par enfant jusqu'au haut de la deuxième
// octave (2400 c compris) ; au-delà, l'échelle repart de l'octave du dessous (−1200 c), remonte par la fondamentale jusqu'à
// la deuxième octave, et ainsi de suite (v5.6 : la troisième octave ne garde plus rien du timbre). Seul l'accordage s'en sert :
// les gènes gardent P.ladder.
export const ACCORD_TOP = 2400, ACCORD_LOW = -1200;
export function accordLadder (P, count = 16) {
  const t = P.tuning; if (!t) return null;
  // classes de hauteur de la gamme ; deux degrés à moins de 5 c l'un de l'autre (ou de la période) sont le même degré
  // mesuré (ex. 1199 c et 1200 c) : un seul pad par degré
  const { period: p, cls } = scaleClasses(t), deg = [];
  for (const c of cls) { if (p - c < 5) continue; if (deg.length && c - deg[deg.length - 1] < 5) continue; deg.push(c); }
  const up = []; for (let k = 0; ; ++k) { const c = deg[k % deg.length] + p * Math.floor(k / deg.length); if (c > ACCORD_TOP + 1e-6) break; up.push(c); }
  // l'octave du dessous : les degrés d'une période sous la fondamentale, à partir de −1200 c (jamais plus bas)
  const low = []; for (let k = 0; ; ++k) { const c = ACCORD_LOW + deg[k % deg.length] + p * Math.floor(k / deg.length); if (c > -1e-6) break; if (c >= ACCORD_LOW - 1e-6) low.push(c); }
  // fondamentale → deuxième octave, puis (octave du dessous → fondamentale → deuxième octave) autant que de pads
  const again = [...low, ...up];
  return Array.from({ length: count }, (_, k) => (k < up.length ? up[k] : again[(k - up.length) % again.length]));
}

// (V6.9) EVERY DEGREE a mummer can take in scale mode, for the report's selector (Mat: « nous devrons avoir la possibilité de
// modifier cette valeur en passant par tous les degrés proposés »): the same pitches the ladder above climbs, from the octave
// below (−1200 c) to the top of the second octave (2400 c), in rising order, with the scale's own label for each (the ZD
// function: 1 … 7, b3, #4 …; a comma below for the octave under the subject, one or two primes above), and the index of the
// fundamental. With an MTS-ESP master (mts: its 128 note frequencies) the degrees are the master's own notes: degree 0 is the
// master note nearest the subject's measured fundamental, the domain runs one octave below it to two above, notes within 5 c
// of one another counted once — so a mummer lands exactly on a pitch the master plays. (1.0) With a ZD scale laid on the
// master (keep: microtonal.js, masterKeep), only the master's notes of that scale, each labelled with its function.
export function degreeDomain (P, mts, keep = null) {
  const f0 = P.fundamentalHz > 0 ? P.fundamentalHz : 0;
  if (mts && Array.isArray(mts.hz) && f0 > 0) {
    const pts = [];
    mts.hz.forEach((hz, n) => { if (hz > 0 && Number.isFinite(hz) && (!keep || keep.on[n])) pts.push({ c: 1200 * Math.log2(hz / f0), n }); });
    if (!pts.length) return null;
    let z = pts[0]; for (const q of pts) if (Math.abs(q.c) < Math.abs(z.c)) z = q;
    const sel = pts.filter(q => q.c - z.c >= ACCORD_LOW - 1e-6 && q.c - z.c <= ACCORD_TOP + 1e-6).sort((a, b) => a.c - b.c || a.n - b.n), out = [];
    for (const q of sel) { if (out.length && q.c - out[out.length - 1].c < 5) { if (q.n === z.n) out[out.length - 1] = q; continue; } out.push(q); }
    const zero = out.findIndex(q => q.n === z.n);
    return { cents: out.map(q => Math.round(q.c * 100) / 100), labels: out.map(q => (keep && keep.lab[q.n] ? keep.lab[q.n] + ' · ' : '') + 'note ' + q.n), notes: out.map(q => q.n), zero, mts: true };
  }
  const t = P.tuning; if (!t) return null;
  const { period: p, cls } = scaleClasses(t), deg = [], lab0 = [];
  const labOf = c => { if (!t.scaleCents || !t.scaleLabels) return null; let b = -1, bd = 1e9; t.scaleCents.forEach((x, i) => { const d = Math.abs(x - c); if (d < bd) { bd = d; b = i; } }); return bd < 0.01 ? t.scaleLabels[b] : null; };
  for (const c of cls) { if (p - c < 5) continue; if (deg.length && c - deg[deg.length - 1] < 5) continue; deg.push(c); lab0.push(labOf(c)); }
  const cents = [], labels = [];
  for (let k = 0; ; ++k) { const o = Math.floor(k / deg.length), c = ACCORD_LOW + deg[k % deg.length] + p * o; if (c > -1e-6) break; if (c >= ACCORD_LOW - 1e-6) { cents.push(c); labels.push((lab0[k % deg.length] || String(k % deg.length + 1)) + ','); } }
  const zero = cents.length;
  for (let k = 0; ; ++k) { const o = Math.floor(k / deg.length), c = deg[k % deg.length] + p * o; if (c > ACCORD_TOP + 1e-6) break; cents.push(c); labels.push((lab0[k % deg.length] || String(k % deg.length + 1)) + "'".repeat(o)); }
  return { cents: cents.map(c => Math.round(c * 100) / 100), labels, zero, mts: false };
}
// the ladder of the pads on a domain (accordLadder's walk: up from degree 0 to the top, then again from the bottom)
export function ladderOn (D, count = 16) {
  if (!D || !D.cents.length) return null;
  const up = D.cents.slice(D.zero), again = D.cents;
  return Array.from({ length: count }, (_, k) => (k < up.length ? up[k] : again[(k - up.length) % again.length]));
}

// GÉNÉRATIONS (v5.8) — Mat : « il faut que les enfants aient tous quelque chose de très personnel … peut-être un peu
// d'aléatoire dans le choix, j'ai peur que les probabilités nous amènent toujours sur les mêmes transformations ». Pas de
// hasard : la troupe g d'un sujet se souvient des troupes 0 … g − 1 du même sujet (recalculées, rien n'est stocké) et
// chaque gène y perd de son poids à chaque emploi passé (1 / (1 + 0,9 × emplois du gène + 0,6 × emplois du gène dans la même
// variante)) ; les variantes tournent d'une génération à l'autre. Au fil des troupes, tout le panel pertinent passe ; la
// même troupe revient toujours à l'identique (cache, rappel de session, comparaison A/B) — ce qu'un tirage ne garantit pas.
function historyOf (P, opts) {
  const gen = Math.max(0, Math.floor(opts.gen || 0)); if (!gen) return null;
  const H = { g: new Map(), gv: new Map() };
  for (let q = 0; q < gen; ++q) {
    const memo = P.__pops || (P.__pops = new Map()), key = `${opts.miroir ?? 1}:${opts.count ?? 16}:${q}`;
    if (!memo.has(key)) memo.set(key, designPopulation(P, { ...opts, gen: q }));
    // (V6.4) la troupe telle que conçue (avant le remplacement des variantes qui n'agissent pas) : les générations suivantes ne bougent pas
    for (const kid of (memo.get(key).designed || memo.get(key).kids)) for (const x of kid.genome) { H.g.set(x.g, (H.g.get(x.g) || 0) + 1); const k2 = `${x.g}/${x.v}`; H.gv.set(k2, (H.gv.get(k2) || 0) + 1); }
  }
  return H;
}
// V6.1 — DE LA RESSEMBLANCE AU CONTRAIRE. Mat : « quand Mockery est à zéro, les enfants sont quand même très différents du
// parent ; ils devraient être extrêmement proches ». Mesuré (clarinette, violoncelle) : chaque gène seul, à la dose 0,05,
// contre le parent (écart de spectre au tiers d'octave + écart d'enveloppe 10 ms + 10 × |ln durée|, en dB, au-delà de ce que
// fait une naissance sans gène) — 27 gènes restent sous 1 dB (leur effet suit la dose), d'autres changent la forme quelle
// que soit la dose (isopériodicité 39,9 dB, forme par énoncé 44,8, rétrograde de la forme 30,6, souffle 13,4…). Chaque gène
// n'entre qu'à partir de la dose où il cesse d'être brutal : seuil = (écart − 1 dB) / 14, plafonné à 0,6. À Mockery 0 la
// troupe ne porte que des gènes qui suivent la dose, à des doses de 0,015 à 0,045 : seize ressemblances.
// (V6.3) les cristaux, mesurés de même à ι 0,05 sur quatre sujets (clarinette, voix, trompette, mélodie) : la bande +1,9 dB,
// les strates +2,2 dB, le martelé +0,8 dB au-delà de la naissance sans gène, les neuf autres sous 0,6 dB (ils suivent la dose)
const DOSE_MIN = {"accordage":0,"alteration":0,"broderie":0,"chalouper":0,"contrametricite":0,"contrepoint":0,"corruption":0,"densifier":0,"deviation":0,"emprunt":0,"groove":0,"halo":0.12,"inflexion":0,"interpolation":0,"isorythmie":0,"modulation":0,"partielfixe":0,"preaudible":0,"prisme":0,"queue":0,"regrid":0,"regroupe":0,"reptonale":0,"troue":0,"variation":0,"vecteur":0,"vie":0,"reponse":0.01,"voisinage":0.01,"avenement":0.02,"pedale":0.03,"retard":0.04,"detache":0.05,"aksak":0.06,"additif":0.09,"crible":0.09,"saturee":0.09,"jeu":0.11,"pivot":0.11,"silence":0.12,"etirement":0.13,"refrain":0.13,"taille":0.15,"espace":0.17,"fin":0.19,"derive":0.21,"fusion":0.21,"chant":0.23,"parallelisme":0.24,"progression":0.25,"pavillons":0.26,"perce":0.26,"regime":0.26,"section":0.29,"respiration":0.3,"rotation":0.31,"corps":0.32,"dilatation":0.33,"dilate":0.36,"heterophonie":0.38,"spirale":0.39,"stimmtausch":0.39,"arche":0.41,"hoquet":0.42,"ouvertclos":0.43,"sympathique":0.43,"tutti":0.43,"echo":0.49,"accumulation":0.53,"marche":0.53,"stase":0.59,"bascule":0.6,"budget":0.6,"canon":0.6,"canonvoix":0.6,"contour":0.6,"couches":0.6,"developpement":0.6,"eclosion":0.6,"formeenonce":0.6,"franchissement":0.6,"inversee":0.6,"isoperiode":0.6,"lampe":0.6,"lieu":0.15,"cristal":0,"horloge":0,"constellation":0,"battement":0,"matiere":0.6,"micropoly":0.6,"miroir":0.6,"multidirige":0.6,"permutation":0.6,"retro":0.6,"retrograde":0.6,"souffle":0.6,"sourdine":0.6};
// par variante (V6.1, mesuré à ι 0,03 sur la batterie et la voix : écart au-delà de la naissance sans gène ≥ 1,2 dB → seuil)
const DOSE_MINV = {"cristal/1":0.07,"horloge/1":0.09,"horloge/2":0.02,"contrametricite/0":0.06,"contrametricite/1":0.06,"contrametricite/2":0.06,"corruption/0":0.12,"corruption/1":0.12,"corruption/2":0.16,
  "groove/0":0.09,"groove/1":0.16,"groove/2":0.06,"inflexion/1":0.06,"modulation/0":0.06,"modulation/1":0.12,"modulation/2":0.12,
  "preaudible/0":0.09,"preaudible/1":0.09,"preaudible/2":0.16,"regrid/0":0.06,"regrid/1":0.09,"regrid/2":0.16,
  "regroupe/0":0.06,"regroupe/1":0.06,"regroupe/2":0.06,"reptonale/0":0.09,"reptonale/1":0.09,"reptonale/2":0.09,
  "variation/0":0.06,"variation/1":0.06,"vecteur/0":0.09,"vecteur/1":0.12,"vecteur/2":0.06,"avenement/0":0.06,"avenement/1":0.09,"avenement/2":0.06,
  "chalouper/1":0.12,"emprunt/1":0.06,"pedale/1":0.12,"retard/0":0.06,"retard/1":0.06,"retard/2":0.06,"prisme/2":0.06};
const okV = (g, v, iota) => (DOSE_MINV[g + '/' + v] ?? 0) <= iota + 1e-9;
// la variante demandée si sa dose le permet, sinon la suivante ; -1 : aucune
const pickV = (g, v, iota) => { for (let d = 0; d < 3; ++d) if (okV(g, (v + d) % 3, iota)) return (v + d) % 3; return -1; };
const eligible = (g, iota) => (DOSE_MIN[g] ?? 0.3) <= iota + 1e-9 && pickV(g, 0, iota) >= 0;
// (V6.4) UN GÈNE QUI N'AGIT PAS. Mesuré sur le banc (15 sujets, Mockery 0,6 et 1, re-mutations 0 à 2) : 213 gènes sur 4240 ne
// faisaient rien — leur transformation, demandée à ce sujet, ne trouvait rien à quoi s'appliquer (195 mummers sur 1440) ; le
// pire, « room » 103 fois sur 346 : la variante « dereverberated » sur une pièce sèche, qui n'a rien à retirer (V6.4). Une fois
// la troupe conçue (rien d'autre ne bouge : ni les autres mummers, ni leurs re-mutations), chaque gène qui n'agit pas prend une
// autre variante du même gène qui agit ; sinon il reste tel quel, sans rien faire (le rapport ne le montre pas).
function actsOn (P, ctx, x) {
  const memo = P.__acts || (P.__acts = new Map()), key = `${x.organo ? 'o' : 'f'}:${x.g}/${x.v}/${Math.round(x.iota * 1e4)}`;
  if (memo.has(key)) return memo.get(key);
  let ok = false; try { const G = (x.organo ? ORGANO : GESTES)[x.g]; ok = !!(G && G.make(P, ctx, x.iota, x.v)); } catch (e) { ok = false; }
  memo.set(key, ok); return ok;
}
function settle (P, ctx, kid, others = []) {
  if (!kid || !kid.genome) return kid;
  const genome = [];
  for (const x of kid.genome) {
    if (actsOn(P, ctx, x)) { genome.push(x); continue; }
    const alts = [1, 2].map(d => (x.v + d) % 3).filter(w => okV(x.g, w, kid.iota) && actsOn(P, ctx, { ...x, v: w }));
    // pour l'organe principal, une variante qu'aucun autre mummer ne porte en tête d'abord
    const free = alts.filter(w => !(x === kid.genome[0] && others.some(q => q && q.genome[0] && q.genome[0].g === x.g && q.genome[0].v === w)));
    const w = free.length ? free[0] : alts.length ? alts[0] : -1;
    // aucune variante n'agit : le gène reste à sa place (il ne fait rien, le rapport ne le montre pas) — les doses mises à la main,
    // rangées par place dans le génome, ne glissent pas d'un gène à l'autre
    genome.push(w >= 0 ? { ...x, v: w, was: x.v } : x);
  }
  return { ...kid, genome };
}
export function designPopulation (P, opts = {}) {
  const miroir = opts.miroir ?? 1, count = opts.count ?? 16, T = P.traits, ctx = contextOf(P);
  const gen = Math.max(0, Math.floor(opts.gen || 0)), hist = historyOf(P, opts);
  // (opts.__noise : banc d'essai seulement — comparer à un choix tiré au hasard ; le plugin ne le passe jamais)
  const pen = (g, v) => (hist ? 1 / (1 + 0.9 * (hist.g.get(g) || 0) + (v === undefined ? 0 : 0.6 * (hist.gv.get(`${g}/${v}`) || 0))) : 1) * (opts.__noise ? opts.__noise() : 1);
  const relO = Object.fromEntries(Object.keys(ORGANO).map(g => [g, clamp(ORGANO[g].relevance(T), 0, 1)]));
  const relF = Object.fromEntries(Object.keys(GESTES).map(g => [g, clamp(GESTES[g].relevance(T), 0, 1)]));
  const zero = DIMS.map(() => 0), vecs = [], kids = [], usedO = new Map(), usedF = new Map();
  const pitched = T.tonal > 0.5 && T.nHarm >= 6;
  const melCap = MELODY.filter(g => (relF[g] || 0) >= 0.3).length >= 6 ? 1 : 2;
  const nTemps = Math.ceil(count / 3), formCap = FORMS.filter(g => (relF[g] || 0) >= 0.3).length >= count - nTemps ? 1 : 2;
  for (let k = 0; k < count; ++k) {
    const prog = 0.3 + 0.7 * (k + 1) / count, iota = Math.max(miroir * (prog + (1 - prog) * miroir * miroir), 0.015 + 0.03 * k / Math.max(1, count - 1));
    let best = null, bs = -1;
    for (const g of Object.keys(ORGANO)) for (let v = 0; v < 3; ++v) {
      if (relO[g] < 0.3 || !eligible(g, iota) || !okV(g, v, iota) || kids.some(q => q.genome[0].g === g && q.genome[0].v === v)) continue;
      const n = usedO.get(g) || 0; if (n >= 2) continue;
      const e = orgVec(g).map(x => x * iota), dmin = Math.min(dist(e, zero) * 0.5, ...vecs.map(w => dist(e, w)));
      const sc = (dmin * (0.4 + 0.6 * relO[g]) * (n ? 0.6 : 1) + 1e-3 * relO[g] + 1e-4 * (2 - ((v + gen) % 3))) * pen(g, v);
      if (sc > bs) { bs = sc; best = { g, v }; }
    }
    // aucun organe assez doux pour cette dose : le premier gène est une écriture qui suit la dose (vie, chaloupé, groove…)
    let genome, vec;
    if (best) { usedO.set(best.g, (usedO.get(best.g) || 0) + 1); genome = [{ g: best.g, v: best.v, iota, organo: true }]; vec = orgVec(best.g).map(x => x * iota); }
    else {
      let bg = null, sg = -1;
      for (const g of [...FORMS, ...TEMPS, ...MELODY]) {
        if (!GESTES[g] || (relF[g] || 0) < 0.3 || !eligible(g, iota) || kids.some(q => q.genome[0].g === g)) continue;
        const e = formVec(g).map(x => x * iota), dmin = Math.min(dist(e, zero) * 0.5, ...vecs.map(w => dist(e, w)));
        const sc = (dmin * (0.4 + 0.6 * relF[g]) + 1e-3 * relF[g]) * pen(g);
        if (sc > sg) { sg = sc; bg = g; }
      }
      if (!bg) for (const g of ['vie', 'chalouper', 'groove', 'regroupe', 'variation']) if (GESTES[g] && pickV(g, (k + gen) % 3, iota) >= 0 && !kids.some(q => q.genome[0].g === g && q.genome[0].v === pickV(g, (k + gen) % 3, iota))) { bg = g; break; }
      if (!bg) bg = 'vie';
      usedF.set(bg, (usedF.get(bg) || 0) + 1); genome = [{ g: bg, v: Math.max(0, pickV(bg, (k + gen) % 3, iota)), iota }]; vec = formVec(bg).map(x => x * iota);
    }
    let bf = null, sf = -1;
    // un enfant sur trois (le 1er, le 4e, …) : une écriture du TEMPS, une fois chacune ; aucune pertinente → les morphologies
    const tempsKid = k % 3 === 0 && TEMPS.some(g => (relF[g] || 0) >= 0.3 && !usedF.get(g) && eligible(g, iota) && compatible(genome, g));
    for (const g of tempsKid ? TEMPS : FORMS) {
      if (!relF[g] || relF[g] < 0.3 || !eligible(g, iota) || genome.some(x => x.g === g) || !compatible(genome, g)) continue;
      // une fois chacune tant qu'il y a plus de morphologies pertinentes que d'enfants, deux sinon (v5.7 : 24 morphologies
      // pour 16 enfants — trois emplois laissaient les écritures du lot 2 de côté sur 8 sujets sur 8)
      const n = usedF.get(g) || 0; if (n >= (tempsKid ? 1 : formCap)) continue;
      const e = add(vec, formVec(g), 0.6 * iota), dmin = Math.min(...vecs.map(w => dist(e, w)), dist(e, zero));
      const sc = dmin * (0.3 + 0.7 * relF[g]) * (n ? 0.8 : 1) * pen(g);
      if (sc > sf) { sf = sc; bf = g; }
    }
    if (bf) { usedF.set(bf, (usedF.get(bf) || 0) + 1); genome.push({ g: bf, v: pickV(bf, tempsKid ? (Math.floor(k / 3) + gen) % 3 : (k + 1 + gen) % 3, iota), iota: 0.6 * iota }); vec = add(vec, formVec(bf), 0.6 * iota); }
    if (iota >= 0.5) {
      let b2 = null, s2 = -1;
      for (const g of Object.keys(ORGANO)) {
        if (relO[g] < 0.3 || !eligible(g, 0.5 * iota) || !compatible(genome, g)) continue;
        const e = add(vec, orgVec(g), 0.5 * iota), dmin = Math.min(...vecs.map(w => dist(e, w)), dist(e, zero));
        const sc = dmin * (0.3 + 0.7 * relO[g]) * pen(g);
        if (sc > s2) { s2 = sc; b2 = g; }
      }
      if (b2) { genome.push({ g: b2, v: (k + 2) % 3, iota: 0.5 * iota, organo: true }); vec = add(vec, orgVec(b2), 0.5 * iota); }
    }
    if (pitched && k % 3 === 2) {
      for (const g of PITCH.slice().sort((a, b) => (hist ? (hist.g.get(a) || 0) - (hist.g.get(b) || 0) : 0))) if (compatible(genome, g) && (relF[g] || 0) >= 0.3 && eligible(g, iota) && !kids.some(q => q.genome.some(x => x.g === g))) { genome.push({ g, v: pickV(g, (k + gen) % 3, iota), iota: 0.5 * iota }); vec = add(vec, formVec(g), 0.5 * iota); break; }
    }
    // ÉCRITURES DE LA LIGNE (jgcompose : inflexion, contour, marche du degré) : un enfant sur trois, décalé des gestes de
    // hauteur, quand la partition micro a des notes ; choix : pertinence mesurée × éloignement, deux fois au plus chacune
    if (k % 3 === 1) {
      let bm = null, sm = -1;
      for (const g of MELODY) {
        if ((relF[g] || 0) < 0.3 || !eligible(g, iota) || genome.some(x => x.g === g) || !compatible(genome, g)) continue;
        // une fois chacune quand au moins six écritures de la ligne sont pertinentes (19 depuis le lot 3b), deux sinon
        const n = usedF.get(g) || 0; if (n >= melCap) continue;
        const e = add(vec, formVec(g), 0.5 * iota), dmin = Math.min(...vecs.map(w => dist(e, w)), dist(e, zero)), sc = dmin * (0.3 + 0.7 * relF[g]) * (n ? 0.7 : 1) * pen(g);
        if (sc > sm) { sm = sc; bm = g; }
      }
      if (bm) { const n = usedF.get(bm) || 0; usedF.set(bm, n + 1); genome.push({ g: bm, v: pickV(bm, (k + n + gen) % 3, iota), iota: 0.6 * iota }); vec = add(vec, formVec(bm), 0.5 * iota); }
    }
    // ÉCRITURES DES VOIX (stimmtausch, lampe, avènement, budget, bascule de registre) : un enfant sur quatre, quand les voix
    // du sujet se distinguent ; choix : pertinence mesurée × éloignement, deux fois au plus chacune
    if (k % 4 === 3) {
      let bv = null, sv = -1;
      for (const g of VOICE) {
        if ((relF[g] || 0) < 0.3 || !eligible(g, iota) || !compatible(genome, g)) continue;
        const n = usedF.get(g) || 0; if (n >= 2) continue;
        const e = add(vec, formVec(g), 0.5 * iota), dmin = Math.min(...vecs.map(w => dist(e, w)), dist(e, zero)), sc = dmin * (0.3 + 0.7 * relF[g]) * (n ? 0.7 : 1) * pen(g);
        if (sc > sv) { sv = sc; bv = g; }
      }
      if (bv) { const n = usedF.get(bv) || 0; usedF.set(bv, n + 1); genome.push({ g: bv, v: pickV(bv, (n + gen) % 3, iota), iota: 0.6 * iota }); vec = add(vec, formVec(bv), 0.5 * iota); }
    }
    // CRISTAUX (V6.3, cristaux.js : les cristallisations de jgcompose à l'échelle des partiels) : un enfant sur quatre (le 2e,
    // le 6e…), quand le sujet a des partiels (part tonale > 0,35, au moins 4 rangs) ; chaque cristal une fois par troupe, sa
    // variante tournant d'un enfant et d'une génération à l'autre
    if (k % 4 === 1 && T.tonal > 0.35 && T.nHarm >= 4) {
      let bc = null, scb = -1;
      for (const g of CRISTAUX_LIST) {
        if ((relF[g] || 0) < 0.3 || usedF.get(g) || genome.some(x => x.g === g) || !compatible(genome, g)) continue;
        const v = pickV(g, (Math.floor(k / 4) + gen) % 3, 0.6 * iota); if (v < 0 || !eligible(g, 0.6 * iota)) continue;
        const e = add(vec, formVec(g), 0.5 * iota), dmin = Math.min(...vecs.map(w => dist(e, w)), dist(e, zero)), sc = dmin * (0.3 + 0.7 * relF[g]) * pen(g, v);
        if (sc > scb) { scb = sc; bc = { g, v }; }
      }
      if (bc) { usedF.set(bc.g, 1); genome.push({ g: bc.g, v: bc.v, iota: 0.6 * iota }); vec = add(vec, formVec(bc.g), 0.5 * iota); }
    }
    vecs.push(vec); kids.push({ genome, vec, iota });
  }
  if (miroir < 0.999) kids.sort((a, b) => dist(a.vec, zero) - dist(b.vec, zero));
  const settled = kids.map((q, i) => settle(P, ctx, q, kids.filter((_, j) => j !== i)));
  // (les re-mutations se calculent sur la troupe telle que conçue : les leurs ne bougent pas)
  return { kids: settled, designed: kids, ctx, relevance: { ...relO, ...relF } };
}

// ---------------------------------------------------------------------------------------------- re-mutation d'un seul enfant
// (V6.2) le bouton « re-mutate » d'un pad : ce mummer seul renaît par d'autres techniques, à la même dose, les quinze autres
// restent. Candidats : les organes (gène, variante) et les écritures pertinents (≥ 0,3), permis à cette dose (DOSE_MIN, par
// variante) et absents de son génome d'origine, classés comme la conception de la troupe — éloignement des quinze autres ×
// pertinence ; la r-ième pression prend le r-ième candidat (en boucle), donc rien n'est tiré au hasard et chaque pression
// donne un autre mummer. Un second gène (écriture du temps ou de la forme, compatible) et, à partir de ι 0,5, un second
// organe, comme à la naissance de la troupe.
export function redesignKid (P, pop, k, r) {
  const base = pop.designed || pop.kids, kid = base[k]; if (!kid || !(r > 0)) return pop.kids[k];
  const T = P.traits, iota = kid.iota, others = base.filter((_, i) => i !== k).map(q => q.vec), zero = DIMS.map(() => 0);
  const used = new Set(kid.genome.map(x => x.g)), far = e => Math.min(dist(e, zero) * 0.5, ...others.map(w => dist(e, w)));
  // ce que la troupe porte déjà ailleurs passe après (un gène porté par n autres mummers : score / (1 + 0,5 n))
  const worn = new Map(); base.forEach((q, i) => { if (i !== k) for (const x of q.genome) worn.set(x.g, (worn.get(x.g) || 0) + 1); });
  const wp = g => 1 / (1 + 0.5 * (worn.get(g) || 0));
  const cands = [];
  for (const g of Object.keys(ORGANO)) {
    const rel = clamp(ORGANO[g].relevance(T), 0, 1); if (rel < 0.3 || used.has(g) || !eligible(g, iota)) continue;
    for (let v = 0; v < 3; ++v) { if (!okV(g, v, iota)) continue; const e = orgVec(g).map(x => x * iota); cands.push({ g, v, organo: true, sc: far(e) * (0.4 + 0.6 * rel) * wp(g) + 1e-4 * (2 - v), e }); }
  }
  for (const g of [...FORMS, ...TEMPS, ...MELODY, ...CRISTAUX_LIST]) {
    if (!GESTES[g] || used.has(g)) continue;
    const rel = clamp(GESTES[g].relevance(T), 0, 1); if (rel < 0.3 || !eligible(g, iota)) continue;
    const v = pickV(g, (k + r) % 3, iota); if (v < 0) continue;
    const e = formVec(g).map(x => x * iota); cands.push({ g, v, organo: false, sc: far(e) * (0.4 + 0.6 * rel) * wp(g), e });
  }
  if (!cands.length) return kid;
  cands.sort((a, b) => b.sc - a.sc || (a.g < b.g ? -1 : a.g > b.g ? 1 : a.v - b.v));
  // chaque pad part d'un autre rang de la liste (k·n/16) : deux pads de même dose ne reçoivent pas les mêmes re-mutations
  const off = Math.round(k * cands.length / 16), main = cands[(r - 1 + off) % cands.length], genome = [{ g: main.g, v: main.v, iota, organo: main.organo }];
  let vec = main.e;
  const list = k % 3 === 0 ? TEMPS : FORMS, sec = [];
  for (const g of list) {
    if (!GESTES[g] || used.has(g) || genome.some(x => x.g === g) || !compatible(genome, g)) continue;
    const rel = clamp(GESTES[g].relevance(T), 0, 1); if (rel < 0.3 || !eligible(g, iota)) continue;
    const v = pickV(g, (k + r + 1) % 3, iota); if (v < 0) continue;
    const e = add(vec, formVec(g), 0.6 * iota); sec.push({ g, v, sc: Math.min(...others.map(w => dist(e, w)), dist(e, zero)) * (0.3 + 0.7 * rel) * wp(g) });
  }
  sec.sort((a, b) => b.sc - a.sc || (a.g < b.g ? -1 : 1));
  if (sec.length) { const f = sec[(r - 1 + Math.round(k * sec.length / 16)) % sec.length]; genome.push({ g: f.g, v: f.v, iota: 0.6 * iota }); vec = add(vec, formVec(f.g), 0.6 * iota); }
  if (iota >= 0.5) {
    const o2 = [];
    for (const g of Object.keys(ORGANO)) {
      const rel = clamp(ORGANO[g].relevance(T), 0, 1); if (rel < 0.3 || genome.some(x => x.g === g) || !eligible(g, 0.5 * iota) || !compatible(genome, g)) continue;
      const e = add(vec, orgVec(g), 0.5 * iota); o2.push({ g, sc: Math.min(...others.map(w => dist(e, w)), dist(e, zero)) * (0.3 + 0.7 * rel) * wp(g) });
    }
    o2.sort((a, b) => b.sc - a.sc || (a.g < b.g ? -1 : 1));
    if (o2.length) { const o = o2[(r - 1) % o2.length]; genome.push({ g: o.g, v: (k + r + 2) % 3, iota: 0.5 * iota, organo: true }); vec = add(vec, orgVec(o.g), 0.5 * iota); }
  }
  return settle(P, pop.ctx, { genome, vec, iota, remut: r });
}

// ---------------------------------------------------------------------------------------------- cordes sympathiques
// chaque corde s'éveille quand le son passe près d'elle (énergie à ±40 c de sa fréquence ou de ses rangs 2 et 3, lue
// sur le spectre de l'enfant) et sonne ensuite seule, en s'éteignant avec son τ ; sa voix a trois rangs (1, 1/2, 1/3)
function sympatheticHalo (L, R, sr, halo) {
  // chaque corde : y[n] = g·A(y[n − D]) + b·x[n − D], A le filtre de boucle (moyenne pondérée de deux échantillons : les
  // aigus s'éteignent plus vite, comme sur une corde), lecture fractionnaire linéaire ; b = 1 − g : un son entretenu à la
  // fréquence de la corde ressort à son niveau ; on ne garde que ce que la corde RENVOIE (le passage direct est retiré)
  // (V6.5) the fractional part of the length is a first-order Thiran allpass (it was a linear interpolation: inside the
  // loop it added a damping of the highs that depended on where the length fell between two samples — two strings a few
  // cents apart did not ring alike — and it flattened the upper partials); the loop's delay is subtracted at the string's
  // own frequency (the phase delay of the loss filter there, not its value at 0 Hz)
  const n = L.length, oL = new Float64Array(n), oR = new Float64Array(n), d = clamp(halo.damp ?? 0.2, 0.02, 0.5);
  const x = new Float64Array(n); for (let i = 0; i < n; ++i) x[i] = 0.5 * (L[i] + R[i]);
  let fmin = Infinity;
  halo.strings.forEach((f, k) => {
    const Dl = sr / f; if (!(Dl > 3)) return;
    fmin = Math.min(fmin, f);
    const w0 = 2 * Math.PI * f / sr, pdLoss = Math.atan2(d * Math.sin(w0), 1 - d + d * Math.cos(w0)) / w0;
    const Dr = Dl - pdLoss, di = Math.floor(Dr - 0.5), dt = Dr - di;   // Thiran: 0.5 ≤ dl < 1.5
    // the allpass is exact at 0 Hz: its coefficient is corrected so that its phase delay is exact at the string's frequency
    const pdAp = c => (Math.atan2(Math.sin(w0), c + Math.cos(w0)) - Math.atan2(c * Math.sin(w0), 1 + c * Math.cos(w0))) / w0;
    let dl = dt; for (let it = 0; it < 4; ++it) dl = clamp(dl + dt - pdAp((1 - dl) / (1 + dl)), 0.3, 1.7);
    const a = (1 - dl) / (1 + dl);
    const gl0 = Math.exp(-Dl / (sr * halo.tau)), b = 1 - gl0;
    const M = di + 4, buf = new Float64Array(M); let w = 0, prev = 0, ax = 0, ay = 0;
    const p = halo.pans[k], gl = Math.SQRT2 * Math.cos(p * Math.PI / 2), gr = Math.SQRT2 * Math.sin(p * Math.PI / 2);
    for (let t = 0; t < n; ++t) {
      let r0 = w - di; if (r0 < 0) r0 += M;
      const u = buf[r0], del = a * u + ax - a * ay; ax = u; ay = del;  // y[n − D]: di samples, then the allpass
      const lp = (1 - d) * del + d * prev; prev = del;                 // filtre de boucle
      const y = gl0 * lp + b * x[t];
      buf[w] = y; if (++w >= M) w = 0;
      const out = y - b * x[t];                                        // ce que la corde renvoie
      oL[t] += gl * out; oR[t] += gr * out;
    }
  });
  // (V6.4) MORPHOLOGIE : l'enveloppe du halo suit celle de l'enfant passée par les vitesses du SUJET — montée en son temps
  // d'attaque, descente en son temps de résonance (halo.att, halo.rel) ; correction par blocs de 2,5 ms, rapportée à sa
  // médiane (c'est une forme, pas un niveau), bornée de −24 à +9 dB, interpolée
  // (V6.5) the two envelopes are measured under a Hann window of at least two periods of the lowest string (centred on each
  // 2.5 ms step), and the correction is drawn through its steps as a smooth curve: a 2.5 ms block is shorter than the
  // period of a low string, its "envelope" followed the waveform itself, and the correction, multiplying the halo by the
  // inverse of its own wave, made intermodulation (measured −14 to −29 dB under the halo)
  if (halo.att && halo.rel) {
    const Bk = Math.round(0.0025 * sr), nb = Math.ceil(n / Bk), Ec = new Float64Array(nb), Eh = new Float64Array(nb);
    const Wh = Math.max(Bk, Math.round((Number.isFinite(fmin) ? 2 * sr / fmin : 0.02 * sr) / 2));
    const hw = new Float64Array(2 * Wh + 1); for (let q = -Wh; q <= Wh; ++q) hw[q + Wh] = 0.5 + 0.5 * Math.cos(Math.PI * q / (Wh + 1));
    for (let b = 0; b < nb; ++b) {
      const c0 = Math.min(n - 1, b * Bk + (Bk >> 1)); let a = 0, c = 0, sw = 0;
      for (let q = Math.max(-Wh, -c0); q <= Math.min(Wh, n - 1 - c0); ++q) { const wq = hw[q + Wh], i = c0 + q; a += wq * x[i] * x[i]; c += wq * 0.25 * (oL[i] + oR[i]) ** 2; sw += wq; }
      Ec[b] = Math.sqrt(a / sw); Eh[b] = Math.sqrt(c / sw);
    }
    const ka = 1 - Math.exp(-Bk / (sr * Math.max(0.002, halo.att / 2.2))), kr = 1 - Math.exp(-Bk / (sr * halo.rel));
    const Et = new Float64Array(nb); let e = 0; for (let b = 0; b < nb; ++b) { e += (Ec[b] - e) * (Ec[b] > e ? ka : kr); Et[b] = e; }
    let pk = 0; for (let b = 0; b < nb; ++b) pk = Math.max(pk, Et[b]);
    const rs = []; for (let b = 0; b < nb; ++b) if (Et[b] > 0.01 * pk && Eh[b] > 0) rs.push(Et[b] / Eh[b]); rs.sort((p, q) => p - q);
    const med = rs.length ? rs[rs.length >> 1] : 1, gb = new Float64Array(nb);
    for (let b = 0; b < nb; ++b) { const r = Eh[b] > 1e-12 ? Et[b] / Eh[b] / med : 0; gb[b] = clamp(r, 0.063, 2.82); }
    for (let i = 0; i < n; ++i) { const u = i / Bk - 0.5, b = Math.max(0, Math.min(nb - 2, Math.floor(u))), f = clamp(u - b, 0, 1), gg = gb[b] * (1 - f) + gb[b + 1] * f; oL[i] *= gg; oR[i] *= gg; }
  }
  // le niveau du halo est MESURÉ : énergie du halo rapportée à celle de l'enfant, ramenée à levelDb (au plus +30 dB de
  // correction — des cordes que rien n'éveille restent muettes)
  let ex = 0, eh = 0; for (let i = 0; i < n; ++i) { ex += x[i] * x[i]; eh += 0.25 * (oL[i] + oR[i]) ** 2; }
  if (eh > 1e-20 && ex > 1e-20) { const gn = Math.min(Math.pow(10, 30 / 20), Math.pow(10, (halo.levelDb ?? -10) / 20) * Math.sqrt(ex / eh)); for (let i = 0; i < n; ++i) { oL[i] *= gn; oR[i] *= gn; } }
  return [oL, oR];
}

// ---------------------------------------------------------------------------------------------- naissance
/** génome → strates (sans rendu) */
// HUMANISATION PAR LE GROOVE (V6.2, « toutes les transformations qui font appel à la périodicité doivent être tributaires du
// groove », Mat) — ces gènes posent leurs événements sur la grille DROITE du pouls (battues, tatums, mesures). Quand le sujet a
// un pouls, tout ce qu'un de ces gènes ajoute à une strate (gains, filtres, hauteurs, panoramiques, partiels, carte du temps)
// est relu sur la grille GROOVÉE du sujet : une fonction du temps f(t) devient f(t′), t′ l'instant de la grille droite que le
// micro-groove du sujet amène en t (warp(t′) = t) ; les bornes d'une nouvelle carte du temps passent par warp (même vitesse
// de lecture). Les gènes qui suivent déjà le groove (hoquet, isopériode, jeu, éclosion) n'y passent pas.
const PERIODIC = new Set(['sourdine', 'canon', 'chant', 'retro', 'aksak', 'spirale', 'rotation', 'stase', 'espace', 'accumulation', 'canonvoix',
  'avenement', 'refrain', 'regime', 'echo', 'derive', 'detache', 'reponse', 'fin', 'tutti']);
const FN_KEYS = ['r', 'sb', 'env', 'envNoise', 'gainDb', 'srcGain', 'partial', 'free', 'lobeFloor', 'inertia', 'pan', 'xb'];
// position de l'argument « t » dans chaque famille de fonctions
const T_ARG = { r: 0, sb: 0, env: 1, envNoise: 1, gainDb: 0, srcGain: 0, partial: 3, free: 2, lobeFloor: 0, inertia: 0, pan: 1, xb: 1 };
function snapshotFns (layers) { const fns = new Set(), maps = new Set(); for (const S of layers) { maps.add(S.map); for (const k of FN_KEYS) for (const f of (S[k] || [])) fns.add(f); } return { fns, maps }; }
function grooveNew (layers, before, grid) {
  const unwarp = t => { let x = t; for (let i = 0; i < 4; ++i) x = t - (grid.warp(x) - x); return x; };
  const wrapped = new Map();
  for (const S of layers) {
    for (const k of FN_KEYS) S[k] = (S[k] || []).map(f => {
      if (before.fns.has(f)) return f;
      if (!wrapped.has(f)) { const ti = T_ARG[k]; wrapped.set(f, (...a) => { a[ti] = unwarp(a[ti]); return f(...a); }); }
      return wrapped.get(f);
    });
    if (!before.maps.has(S.map) && S.map && S.map.segs) {
      if (!wrapped.has(S.map)) wrapped.set(S.map, new TimeMap(S.map.segs.map(g => { const a2 = grid.warp(g.a), b2 = Math.max(a2 + 1, grid.warp(g.b)), rate = (g.sb - g.sa) / Math.max(1e-9, g.b - g.a); return { ...g, a: a2, b: b2, sb: g.sa + rate * (b2 - a2) }; })));
      S.map = wrapped.get(S.map);
    }
  }
}
export function buildLayers (P, kid, ctx, opts = {}) {
  let layers = [baseLayer(P)], D = P.n, halo = null, room = null;
  const descs = [], on = new Set();
  // (V6.4) une dose mise à 0 % à la main éteint le gène (Mat : « quand je baisse Isoperiodicity à zéro, j'ai toujours cette
  // transformation active ») : le mummer naît sans lui, ses autres gènes inchangés (et le budget de strates sans lui)
  const gs = kid.genome.filter(x => !x.off).sort((a, b) => ORDER[KIND[a.g]] - ORDER[KIND[b.g]]);
  // budget de strates (≤ 12) : l'éclosion se partage ce que les multiplicateurs lui laissent
  let mult = 1; for (const x of gs) if (LAYERS[x.g]) mult *= LAYERS[x.g](x.v);
  ctx = { ...ctx, layerBudget: Math.max(3, Math.floor(12 / mult)) };
  for (const x of gs) {
    // (V6.4) une dose réglée à la main : ι prend la valeur de Mat ; les gènes que leur dose ne gouverne pas lisent ctx.amt
    // (dose à la main ÷ dose calculée : 1 à la valeur calculée — le mummer d'origine)
    const made = (x.organo ? ORGANO : GESTES)[x.g].make(P, Number.isFinite(x.amt) && x.amt !== 1 ? { ...ctx, amt: x.amt } : ctx, x.iota, x.v);
    if (!made) continue;
    on.add(x);
    const before = PERIODIC.has(x.g) && ctx.grid && ctx.grid.has && !globalThis.__NO_GROOVE ? snapshotFns(layers) : null;
    const r = made.apply(layers, D); layers = r.layers; D = r.D; descs.push(made.desc);
    if (before) grooveNew(layers, before, ctx.grid);
    if (made.halo) halo = made.halo;
    if (made.room) room = { ...made.room, descAt: descs.length - 1 };
  }
  if (opts.accordCents) { const ratio = Math.pow(2, opts.accordCents / 1200); for (const S of layers) S.r.push(() => ratio); descs.push(`tuned ${opts.accordCents >= 0 ? '+' : ''}${Math.round(opts.accordCents)} c`); }
  // durée : le plafond musical validé (v4 : 1,6 × le parent, ou parent + 4 s) ; la place d'un emplacement du DSP ne fait que
  // le réduire (jamais l'allonger)
  const capMus = Math.max(1.6 * P.n, P.n + 4 * P.sr);
  D = Math.min(D, Math.round(opts.maxSec ? Math.min(capMus, opts.maxSec * P.sr) : capMus));
  // extinction finale (enveloppe.js) : un enfant qui finit le son encore vivant s'éteint comme le sujet, sans dépasser la
  // place de l'emplacement
  if (P.envelope && !globalThis.__NO_GUARD) { const D0 = D; D = finalRelease(P, layers, D, opts.maxSec ? Math.round(opts.maxSec * P.sr) : D + 3 * P.sr); if (D > D0) descs.push(`(natural release ${((D - D0) / P.sr).toFixed(2)} s)`); }
  // (V6.4) les gènes qui ont agi (un gène dont la transformation ne trouve rien à quoi s'appliquer dans ce sujet rend null :
  // le rapport le montre inactif plutôt qu'avec une dose qui ne gouverne rien)
  return { layers, D, halo, room, descs, active: kid.genome.map(x => on.has(x)) };
}

/** RENDU D'UNE STRATE (v5.5) — deux étages, chacun pour ce qu'il sait faire sans défigurer le son :
 *  1. le moteur temporel (td.js) fait toute la GÉOMÉTRIE : carte du temps, hauteur, corps, filtres de gène, gains, espace —
 *     la forme d'onde relue (lecture directe, WSOLA aligné, attaques à leur place, filtres à phase minimale) ;
 *  2. s'il reste des opérations qui n'existent que dans le spectre (partiels déplacés ou pesés un à un, souffle séparé des
 *     partiels, inertie du corps, corps caricaturé), le moteur FFT (phv.js) les applique au résultat de l'étage 1, lu À SA
 *     PLACE (carte identité, cadence 1) : tout ce qu'elles ne touchent pas garde ses phases d'origine — le « son FFT »
 *     se limite aux partiels que le gène déplace. Les fonctions spectrales reçoivent toujours la position SOURCE (elles lisent
 *     la vie du parent), la fondamentale est celle du résultat (déjà transposé). */
function renderLayer (P, spec) {
  if (globalThis.__FORCE_FFT) { if (globalThis.__ENGINES) globalThis.__ENGINES.push('fft'); return render(P, spec); }
  if (canRenderTD(spec)) { if (globalThis.__ENGINES) globalThis.__ENGINES.push('td'); return renderTD(P, spec); }
  // les opérations spectrales qui ne DÉPLACENT rien (gains par rang, partage partiel / souffle, filtre du souffle) passent par
  // le banc harmonique temporel : chaque partiel démodulé à sa fréquence vraie, rien ne repasse par des trames FFT. Mesuré
  // contre l'étage FFT (13 sons) : rangs pairs retirés à −20 à −31 dB là où la FFT laissait −1 à −19 dB (violoncelle, voix,
  // diapason), souffle intact au lieu de −2 à −7 dB, pré-écho +2 dB au lieu de +10 dB sur le diapason chuchoté, 1,5 à 3×
  // plus rapide pour les gains. L'inertie du corps reste à l'étage FFT : le banc la rend telle que le gène la décrit, et
  // c'est un autre son (en attente d'écoute)
  if (globalThis.__WHY) globalThis.__WHY.push(['inertia', 'free', 'bodyX'].filter(k => spec[k]).concat(spec.partial && !spec.free && !spec.bodyX && !canRenderHB(spec) ? ['moves'] : []).join('+') || 'ok');
  // (v5.8 : écoute A/B de Mat sur 11 paires, « B partout sans hésiter » — le banc est le moteur par défaut ; __HB = false
  // rend l'ancien chemin)
  if (globalThis.__HB !== false && (!spec.inertia || globalThis.__HB_INERTIA !== false) && canRenderHB(spec)) { if (globalThis.__ENGINES) globalThis.__ENGINES.push('td+hb'); const tA = Date.now(), st = {}, y = renderTD(P, spec, st); if (globalThis.__TIMES) globalThis.__TIMES.push(['td+hb', Date.now() - tA]); return y; }
  const geo = { D: spec.D, T: spec.T, rateAt: spec.rateAt, r: spec.r, sb: spec.sb, env: spec.env, gainDb: spec.gainDb, srcGainDb: spec.srcGainDb, pan: spec.pan, xb: spec.xb };
  const tA = Date.now(), st = {}, y1 = renderTD(P, geo, st); if (globalThis.__TIMES) globalThis.__TIMES.push(['td', Date.now() - tA, st.wsola, st.corrected]);
  // le parent de l'étage 2 : le résultat de l'étage 1, sa fondamentale connue sans la remesurer (celle du parent à la
  // position lue × la transposition), ses attaques là où l'étage 1 les a posées
  const rAt = spec.r || (() => 1), f0At = t => { const tt = Math.max(0, Math.min(spec.D - 1, Math.round(t))), s = spec.T(tt); if (s === null || s === undefined) return 0; const F = P.f0At(s); return F > 0 ? F * rAt(tt) : 0; };
  let rmin = Infinity; for (let q = 0; q <= 32; ++q) rmin = Math.min(rmin, rAt(Math.min(spec.D - 1, Math.round(q * spec.D / 32))));
  const P2 = { L: y1.L, R: y1.R, sr: P.sr, n: spec.D, N: P.N, f0At, f0med: P.f0med * rAt(Math.floor(spec.D / 2)), f0lo: P.f0lo * (Number.isFinite(rmin) ? rmin : 1), voicedShare: P.voicedShare, onsets: st.attacks };
  const sp2 = { D: spec.D, T: t => t, rateAt: () => 1, src: spec.src };
  for (const k of ['partial', 'free', 'lobeFloor', 'envNoise', 'inertia', 'bodyX', 'hnm']) if (spec[k] !== undefined) sp2[k] = spec[k];
  if (globalThis.__ENGINES) globalThis.__ENGINES.push('td+fft');
  const tB = Date.now(), y2 = render(P2, sp2); if (globalThis.__TIMES) globalThis.__TIMES.push(['fft', Date.now() - tB]);
  // (V6.4) le souffle passe par le banc sur ce que l'étage FFT a rendu (les partiels y ont bougé : la fondamentale de sortie)
  if (spec.breath) return addBreath(y2.L, y2.R, P.sr, spec.D, f0At, spec.breath);
  return y2;
}

/** (V6.5) masque statique à phase nulle sur une strate rendue : produit des amplitudes des fonctions de S.zmask, par FFT
 *  de toute la strate (bords prolongés de 0,1 s de zéros : aucun repli circulaire) */
function zeroPhaseMask (y, masks, sr) {
  const n = y.L.length, pad = Math.round(0.1 * sr); let N = 1; while (N < n + 2 * pad) N *= 2;
  const H = new Float64Array(N / 2 + 1); for (let q = 0; q <= N / 2; ++q) { const f = q * sr / N; let a = 1; for (const m of masks) a *= m(f); H[q] = a; }
  for (const X of [y.L, y.R]) {
    const re = new Float64Array(N), im = new Float64Array(N); re.set(X, pad); fft(re, im);
    for (let q = 0; q <= N / 2; ++q) { re[q] *= H[q]; im[q] *= H[q]; if (q > 0 && q < N / 2) { re[N - q] *= H[q]; im[N - q] *= H[q]; } }
    for (let q = 0; q < N; ++q) im[q] = -im[q]; fft(re, im);
    for (let i = 0; i < n; ++i) X[i] = re[pad + i] / N;
  }
}
/** mixage des strates (retards, entrée de 1,5 ms des strates retardées), cordes sympathiques, passe-haut 22 Hz */
function mixLayers (P, layers, D, halo, specOf) {
  const L = new Float64Array(D), R = new Float64Array(D);
  for (const S of layers) {
    const Dl = D - S.delay; if (Dl <= 0) continue;
    const y = renderLayer(P, specOf(S, Dl, P));
    if (S.zmask && S.zmask.length) zeroPhaseMask(y, S.zmask, P.sr);
    // une strate retardée entre en 1,5 ms (sinon le son déjà lancé du parent y entre en marche d'escalier : mesuré, un clic
    // à 5,3 ms sur deux enfants du camion) — plus court que toute attaque réelle
    if (S.delay > 0) { const F = Math.round(0.0015 * P.sr); for (let i = 0; i < Math.min(F, Dl); ++i) { const w = 0.5 - 0.5 * Math.cos(Math.PI * i / F); y.L[i] *= w; y.R[i] *= w; } }
    for (let i = 0; i < Dl; ++i) { L[S.delay + i] += S.gain * y.L[i]; R[S.delay + i] += S.gain * y.R[i]; }
  }
  // énergie de ce que les strates relisent (avant les cordes sympathiques), par blocs de 10 ms : la stase s'en sert pour ne
  // pas figer un instant où l'on n'entend plus que les cordes
  const Bk = Math.round(0.01 * P.sr), eSrc = new Float32Array(Math.ceil(D / Bk));
  for (let b = 0; b < eSrc.length; ++b) { let e = 0; const a = b * Bk, z = Math.min(D, a + Bk); for (let i = a; i < z; ++i) e += L[i] * L[i] + R[i] * R[i]; eSrc[b] = e / Math.max(1, z - a) / 2; }
  if (halo) { const [hL, hR] = sympatheticHalo(L, R, P.sr, halo); for (let i = 0; i < D; ++i) { L[i] += hL[i]; R[i] += hR[i]; } }
  // infrasons retirés (passe-haut Butterworth 2 à 22 Hz) : un corps agrandi descend parfois sous l'audible, ce qui ne
  // s'entend pas mais mange la marge (mesuré : −3 dB d'énergie sous 30 Hz sur deux enfants du camion)
  // (V6.5) at zero phase: the causal filter turned the bass (90° at 22 Hz, still 18° at 100 Hz), which is why an
  // untouched child only nulled its parent to −23 dB, and a low attack lost its shape
  hpZero(L, 22, P.sr); hpZero(R, 22, P.sr);
  return { L, R, eSrc };
}

export function birth (P, kid, ctx, opts = {}) {
  const { layers, D, halo, room, descs, active } = buildLayers(P, kid, ctx, opts);
  const { L, R, eSrc } = mixLayers(P, layers, D, halo, compile);
  // l'espace (gène « lieu ») : sur l'enfant entier, après le mixage ; les plans du sujet retrouvés par la carte de la strate principale
  if (room) { const S0 = layers[0]; descs[room.descAt] = roomProcess(P, L, R, room, t => { const u = t - S0.delay; return u >= 0 ? S0.map.at(u) : null; }); }
  // niveau : la sonie active du parent (pondération K : passe-haut 60 Hz + plateau aigu), crête ≤ −1 dB
  const loud = (X, Y) => { const a = Float64Array.from(X), b = Float64Array.from(Y); kw(a, P.sr); kw(b, P.sr); const B = Math.round(0.05 * P.sr), e = []; for (let q = 0; q + B <= a.length; q += B) { let s = 0; for (let i = q; i < q + B; ++i) s += a[i] * a[i] + b[i] * b[i]; e.push(s / B / 2); } const mx = Math.max(...e, 1e-20); const act = e.filter(x => x > mx * 1e-3); return Math.sqrt(act.reduce((u, v) => u + v, 0) / (act.length || 1)); };
  let pk = 0; for (let i = 0; i < D; ++i) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
  const cur = loud(L, R), g = Math.min(cur > 0 ? loud(P.L, P.R) / cur : 1, pk > 0 ? 0.891 / pk : 1);
  for (let i = 0; i < D; ++i) { L[i] *= g; R[i] *= g; }
  const Fd = Math.min(D, Math.round(0.03 * P.sr));
  for (let i = 0; i < Fd; ++i) { const w = 0.5 - 0.5 * Math.cos(Math.PI * i / Fd); L[D - 1 - i] *= w; R[D - 1 - i] *= w; }
  // jamais de silence hors de propos au début : l'enfant ne commence pas plus tard que le parent
  const lead = (A, B2) => { const Bk = Math.round(0.005 * P.sr); let m0 = 0; for (let i = 0; i < A.length; ++i) m0 = Math.max(m0, Math.abs(A[i]), Math.abs(B2[i])); const th = m0 * 0.01; for (let i = 0; i < A.length; i += Bk) { let m = 0; for (let k = i; k < Math.min(A.length, i + Bk); ++k) m = Math.max(m, Math.abs(A[k]), Math.abs(B2[k])); if (m > th) return i; } return 0; };
  // avec un pouls, on ne retire que des TEMPS entiers : la battue de l'enfant garde la phase de celle du parent (déclenchés
  // sur le même temps, leurs grilles coïncident) — le reste du silence de tête est un contretemps écrit par le geste
  let cut = Math.max(0, lead(L, R) - lead(P.L, P.R) - Math.round(0.01 * P.sr));
  if (ctx.grid && ctx.grid.has) cut = Math.round(Math.floor(cut / ctx.grid.beat) * ctx.grid.beat);
  let oL = L, oR = R;
  if (cut > 0) { oL = L.slice(cut); oR = R.slice(cut); descs.push(`(${(cut / P.sr).toFixed(2)} s of leading silence removed)`); }
  // queue muette retirée (au-delà de 150 ms sous −60 dB de la crête), avec un fondu de 30 ms
  { let pk2 = 0; for (let i = 0; i < oL.length; ++i) pk2 = Math.max(pk2, Math.abs(oL[i]), Math.abs(oR[i]));
    const th = pk2 * 1e-3; let last = oL.length - 1; while (last > 0 && Math.abs(oL[last]) < th && Math.abs(oR[last]) < th) last--;
    const end = Math.min(oL.length, last + Math.round(0.15 * P.sr));
    if (end < oL.length - Math.round(0.05 * P.sr)) { oL = oL.slice(0, end); oR = oR.slice(0, end); const F2 = Math.min(end, Math.round(0.03 * P.sr)); for (let i = 0; i < F2; ++i) { const w2 = 0.5 - 0.5 * Math.cos(Math.PI * i / F2); oL[end - 1 - i] *= w2; oR[end - 1 - i] *= w2; } } }
  // carte temporelle de la strate principale (position source toutes les 1024 images, −1 : aucune) : le fantôme du parent
  const S0 = layers[0], nm = Math.ceil(oL.length / 1024) + 2, cmap = new Float32Array(nm);
  for (let j = 0; j < nm; ++j) { const t = j * 1024 + cut - S0.delay; const s = t >= 0 ? S0.map.at(t) : null; cmap[j] = s === null ? -1 : s; }
  return { L: oL, R: oR, D: oL.length, desc: descs, active, layers: layers.length, gainDb: 20 * Math.log10(g), g, cut, cmap, eSrc };
}

// ---------------------------------------------------------------------------------------------- stase vivante (sustain)
// Quand une note tenue dépasse ce que l'enfant a à dire, il se fige sur sa partie tenue sans cesser de vivre : chaque strate
// relit, en rampant, ±60 ms de source autour de la position qu'elle lisait à l'instant choisi (chemin lent et périodique,
// vitesse ≤ 0,25), tous ses gènes arrêtés à cet instant. Le moteur rend une boucle de 2 s dont le raccord est fondu dans la
// matière (fondu de 250 ms précuit) : relue en boucle, elle ne s'arrête jamais et ne se répète pas à l'oreille.
// (V6.2) la place réservée à la boucle de tenue : 3,5 s (boucle organique) ; la boucle simple du son réel reste à 2 s au plus
export const LOOP_SEC = 3.5;
const WAVE_SEC = 2.0;
export function sustainLoop (P, kid, ctx, child, opts = {}) {
  const sr = P.sr, n = child.L.length;
  // instant de tenue : le dernier moment encore à −9 dB de la crête (10 ms), entre 3 % et 90 % de l'enfant (un son frappé n'a plus de source au-delà de ses premières secondes), loin des attaques raides
  const B = Math.round(0.01 * sr), env = [];
  for (let b = 0; b + B <= n; b += B) { let e = 0; for (let i = b; i < b + B; ++i) e += child.L[i] ** 2 + child.R[i] ** 2; env.push(10 * Math.log10(e / B / 2 + 1e-20)); }
  const pk = Math.max(...env), lo = Math.floor(0.03 * env.length), hi = Math.floor(0.9 * env.length);
  const { layers, halo } = buildLayers(P, kid, ctx, opts);
  const sharp = P.onsets;                       // attaques raides de la source (échantillons)
  const nearOnset = s => sharp.some(o => Math.abs(o - s) < 0.07 * sr);
  // l'instant figé doit être représentatif de ce que l'enfant fait entendre là : (1) l'enfant sonne (−9 dB de sa crête),
  // (2) ce qu'on entend vient de la source relue et non des seules cordes sympathiques (écart ≤ 6 dB) — sinon la boucle,
  // qui relit la source figée, se tait (mesuré : −40 dB), (3) la source y sonne elle-même (−20 dB de sa crête, mesurée
  // sans continu ni infrasons : une fourchette garde un décalage continu qui fausse la mesure brute) — sinon on fige la
  // résonance d'une note déjà éteinte (boucles à −44 et −79 dB), (4) l'articulation de la strate principale y est ouverte
  // (−6 dB de son maximum : sinon on fige un creux de staccato — boucles à −14/−18 dB)
  const S0 = layers[0], base0 = compile(S0, n), Bp = Math.round(0.01 * sr);
  const artic = t => (base0.srcGainDb ? base0.srcGainDb(t) : 0) + (base0.gainDb ? base0.gainDb(t) : 0);
  let aMax = -1e9; for (let b = 0; b < env.length; ++b) { const t = b * B + child.cut - S0.delay; if (t >= 0 && S0.map.at(t) !== null) aMax = Math.max(aMax, artic(t)); }
  const parentDb = s => P.env[clamp(Math.floor(s / Bp), 0, P.env.length - 1)] - P.peakDb;   // enveloppe sans continu (parent.js)
  const srcShare = b => { if (!child.eSrc) return 0; const j = Math.floor((b * B + child.cut) / Bp); if (j < 0 || j >= child.eSrc.length) return -99; return 10 * Math.log10(child.eSrc[j] * child.g * child.g + 1e-20) - env[b]; };
  // (V6.8) Mat: « parfois la zone de sustain tombe dans des silences et donc le sustain en mode hold est inaudible ». When no
  // instant meets the four conditions (a struck sound: −9 dB of the peak only in the 70 ms after its attacks, which are
  // left out), the best compromise was taken anywhere — measured on t_d_kik_05: 9 mummers of 17 held at −31 to −58 dB of
  // their peak (22 to 49 dB under their body), their loops 25 to 71 % under −40 dB (one hit, then silence). Now the loop
  // made at the instant chosen as before is kept only if it SOUNDS — its level within 20 dB of the mummer's body (the power
  // mean of its 10 ms blocks within 20 dB of its peak) and no more than a tenth of it 30 dB under the body; otherwise the
  // instant is taken (1) where the mummer sounds, within 20 dB of its body, then (2) in the body itself, within 10 dB of
  // it, 20 ms at least after a hit (a short drum whose body lies whole within 70 ms of its hit: Bass_Lindrum_09, loops at
  // −24 and −34 dB of its body); the loop that sounds best is kept. Where nothing was silent, nothing changes
  const bodyDb = (() => { let e = 0, m = 0; for (const d of env) if (d > pk - 20) { e += Math.pow(10, d / 10); m++; } return 10 * Math.log10(e / Math.max(1, m) + 1e-30); })();
  const pick = mode => {
    const relaxed = mode === 2;
    const audible = b => mode === 0 || env[b] >= bodyDb - (relaxed ? 10 : 20), near = relaxed ? 0.02 * sr : 0.07 * sr;
    let bi = -1, bestScore = -1e9, bestB = -1, nearScore = -1e9, nearB = -1;
    for (let b = hi; b >= lo; --b) {
      const t = b * B + child.cut - S0.delay; if (t < 0) continue;
      const s = S0.map.at(t);
      if (s === null) continue;
      const c1 = env[b] - pk, c2 = parentDb(s), c3 = aMax > -1e8 ? artic(t) - aMax : 0, c4 = Math.min(0, srcShare(b));
      const sc = Math.min(c1 / 9, c2 / 20, c3 / 6, c4 / 6);
      if (sharp.some(o => Math.abs(o - s) < near)) { if (!relaxed && audible(b) && !sharp.some(o => Math.abs(o - s) < 0.02 * sr) && sc > nearScore) { nearScore = sc; nearB = b; } continue; }
      if (!relaxed && c1 >= -9 && c2 >= -20 && c3 >= -6 && c4 >= -6) { bi = b; break; }
      if (audible(b) && sc > bestScore) { bestScore = sc; bestB = b; }
    }
    if (relaxed) return bestB;
    if (bi < 0) bi = bestB >= 0 ? bestB : (mode === 0 ? -1 : nearB);
    if (bi < 0) { let bv = -1e9; for (let b = lo; b <= hi; ++b) if (env[b] > bv) { bv = env[b]; bi = b; } }
    if (bi < 0) bi = Math.floor(env.length / 2);
    return bi;
  };
  // how the loop sounds: its level (power mean of 10 ms blocks) under the body, and its share of silent blocks (30 dB under)
  const sounds = lp => { let e = 0, m = 0, sil = 0; for (let b = 0; b + B <= lp.len; b += B) { let q = 0; for (let i = b; i < b + B; ++i) q += lp.L[i] * lp.L[i] + lp.R[i] * lp.R[i]; const d = 10 * Math.log10(q / B / 2 + 1e-20); e += q / B / 2; m++; if (d < bodyDb - 30) sil++; }
    return { db: 10 * Math.log10(e / Math.max(1, m) + 1e-30) - bodyDb, sil: sil / Math.max(1, m) }; };
  const ok = q => q.db >= -20 && q.sil <= 0.1, worth = q => q.db - 30 * q.sil;
  let best = null, bq = null; const tried = new Set();
  for (const mode of [0, 1, 2]) {
    const b = pick(mode); if (b < 0 || tried.has(b)) continue; tried.add(b);
    const lp = holdAt(b * B), q = sounds(lp);
    if (globalThis.__SUS_DBG) globalThis.__SUS_DBG.push({ mode, b, t: b * B / sr, db: q.db, sil: q.sil, kind: lp.seamless ? 'wave' : (lp.levelDb && lp.levelDb.fragments ? 'organic' : 'frozen') });
    if (ok(q)) return lp;
    if (!best || worth(q) > worth(bq)) { best = lp; bq = q; }
  }
  return best;
  function holdAt (Tsus) {
  const tL = Tsus + child.cut;
  // la tenue est faite du SON RÉEL de l'enfant (boucle d'échantillonneur, v5.5) ; l'ancien gel de vocodeur ne sert plus que
  // si l'enfant est trop court pour porter une boucle
  const og = globalThis.__NO_ORGANIC ? null : organicLoop(P, ctx, child, Tsus);
  if (og) return og;
  const td = waveLoop(P, ctx, child, Tsus, bodyDb);
  if (td) return td;
  const Pl = Math.round(LOOP_SEC * sr), X = Math.round(0.25 * sr), total = Pl + X, A = 0.06 * sr;
  const path = t => 0.65 * Math.sin(2 * Math.PI * t / Pl) + 0.35 * Math.sin(4 * Math.PI * t / Pl + 1.1);
  const frozen = (S, Dl) => {
    const tF = Math.max(0, tL - (S.delay0 ?? S.delay)), base = compile(S, Dl);
    let s0 = S.map.at(tF);
    if (s0 === null) { let best = null, bd = 1e18; for (const sg of S.map.segs) { const d = Math.min(Math.abs(sg.a - tF), Math.abs(sg.b - tF)); if (d < bd) { bd = d; best = Math.abs(sg.a - tF) < Math.abs(sg.b - tF) ? sg.sa : sg.sb; } } s0 = best ?? P.n / 2; }
    s0 = Math.max(A + 1, Math.min(P.n - A - 1, s0));
    const f = tF, sp = { D: Dl, T: t => s0 + A * path(t), src: base.src };
    // les gains des gènes sont figés sur leur moyenne (en puissance) à ±60 ms de l'instant de tenue, pas sur l'instant seul :
    // un geste qui bat (hoquet, trémolo, staccato) peut être saisi dans un creux — mesuré : un hoquet saisi dans les 3 ms de
    // montée de son pas, toutes familles au plancher, boucle −26 dB sous la relecture ; la hauteur (r, sb) reste celle de l'instant
    const tw = [-2880, -1920, -960, 0, 960, 1920, 2880].map(d => Math.max(0, f + d));
    const pmean = dbs => { let e = 0; for (const d of dbs) e += Math.pow(10, d / 10); return 10 * Math.log10(e / dbs.length + 1e-30); };
    const avgPair = fn => { const o0 = fn(f); if (!o0) return null; const dbs = tw.map(t => { const o = fn(t); return o ? (o[1] || 0) : -120; }); return [o0[0], pmean(dbs)]; };
    if (base.r) sp.r = () => base.r(f); if (base.sb) sp.sb = () => base.sb(f);
    if (base.env) sp.env = fr => pmean(tw.map(t => base.env(fr, t))); if (base.envNoise) sp.envNoise = fr => pmean(tw.map(t => base.envNoise(fr, t)));
    if (base.gainDb) { const g = pmean(tw.map(t => base.gainDb(t))); sp.gainDb = () => g; }
    if (base.srcGainDb) { const g = pmean(tw.map(t => base.srcGainDb(t))); sp.srcGainDb = () => g; }
    if (base.partial) sp.partial = (h, fq, t, F) => avgPair(tt => base.partial(h, fq, tt, F)); if (base.free) sp.free = fr => avgPair(tt => base.free(fr, tt));
    if (base.lobeFloor) sp.lobeFloor = () => base.lobeFloor(f); if (base.inertia) sp.inertia = () => base.inertia(f);
    if (base.breath) { const bd = base.breath.db(f); sp.breath = { ...base.breath, db: () => bd }; }
    if (base.pan) sp.pan = () => base.pan(f); if (base.bodyX) sp.bodyX = () => base.bodyX(f);
    return sp;
  };
  // les strates retardées gardent leur décalage (les pavillons, la section restent des instruments distincts)
  const { L, R } = mixLayers(P, layers.map(S => ({ ...S, delay0: S.delay, delay: Math.min(S.delay, X) })), total, halo, frozen);
  // même niveau que l'enfant juste avant la tenue (200 ms) : l'entrée dans la boucle ne se remarque pas
  let ec = 0, el = 0; const W2 = Math.round(0.2 * sr);
  for (let i = Math.max(0, Tsus - W2); i < Tsus; ++i) ec += child.L[i] ** 2 + child.R[i] ** 2;
  for (let i = X; i < Pl; ++i) el += L[i] ** 2 + R[i] ** 2;
  ec /= Math.max(1, Math.min(W2, Tsus)); el = el * child.g * child.g / Math.max(1, Pl - X);
  // (−18…+36 dB : figée, la résonance d'un corps de verre ou de bois ne se relance plus — les partiels ne meurent plus, leurs
  // images ne sonnent pas — et la boucle perd ce que la résonance ajoutait : mesuré −11 à −21 dB avec l'ancienne borne de
  // ±6 dB, et jusqu'à −37 dB sur une basse pincée en verre ; la boucle garde les partiels de la même note, relevés)
  const gm = el > 0 && ec > 0 ? Math.max(0.125, Math.min(63, Math.sqrt(ec / el))) : 1;
  const g = child.g * gm, oL = new Float32Array(Pl), oR = new Float32Array(Pl);
  for (let i = 0; i < Pl; ++i) {
    if (i < X) { const u = i / X, a = Math.sin(Math.PI / 2 * u), b = Math.cos(Math.PI / 2 * u); oL[i] = g * (L[i] * a + L[Pl + i] * b); oR[i] = g * (R[i] * a + R[Pl + i] * b); }
    else { oL[i] = g * L[i]; oR[i] = g * R[i]; }
  }
  return { L: oL, R: oR, start: Tsus, len: Pl, levelDb: { child: 10 * Math.log10(ec + 1e-30), loopRaw: 10 * Math.log10(el + 1e-30), gainDb: 20 * Math.log10(gm) } };
  }
}

// ---------------------------------------------------------------------------------------------- tenue : boucle du son réel
// La tenue rejoue le son de l'enfant lui-même, comme la boucle d'un échantillonneur : la boucle FINIT à l'instant de tenue
// choisi (e) et commence jusqu'à 2 s plus tôt (s) ; l'enfant joue jusqu'à s, puis la boucle prend le relais SANS fondu
// (c'est le même son). Le raccord : les X dernières échantillons de la boucle se fondent dans ce qui précède s, de sorte
// qu'au bouclage le son arrive exactement en s ; la fin e est déplacée d'au plus une période pour que les deux formes d'onde
// fondues se ressemblent le plus (corrélation), fondu à gain constant si elles se ressemblent, à puissance constante sinon.
// Aucune attaque raide de l'enfant dans la boucle si c'est possible ; avec un pouls, une boucle de temps entiers. Le niveau :
// la pente de déclin dans la boucle est compensée (gain seul, ±12 dB au plus), le niveau reste celui de l'entrée.
export const LOOP_X = 0.25;
function waveLoop (P, ctx, child, Tsus, bodyDb = -300) {
  const sr = P.sr, L = child.L, R = child.R, n = L.length, Lmax = Math.round(WAVE_SEC * sr), Lmin = Math.round(0.3 * sr);
  const M = new Float64Array(n); for (let i = 0; i < n; ++i) M[i] = 0.5 * (L[i] + R[i]);
  // zone tenue : autour de l'instant de tenue, tant que l'enfant reste à 15 dB de son niveau là (blocs de 10 ms) ; la boucle
  // finit au plus loin dans cette zone (au plus 1 s après l'instant de tenue) et commence jusqu'à 2 s avant sa fin
  const Bz = Math.round(0.01 * sr), lv = x => { let q = 0; const a = Math.max(0, x), b = Math.min(n, a + Bz); for (let i = a; i < b; ++i) q += L[i] * L[i] + R[i] * R[i]; return 10 * Math.log10(q / Math.max(1, b - a) / 2 + 1e-20); };
  const ref = lv(Tsus);
  let e = Tsus; while (e + Bz < n - 1 && e - Tsus < sr && lv(e + Bz) >= ref - 15) e += Bz;
  const eNat = e;
  e = Math.min(n - 1, Math.max(e, Lmin + Math.round(0.26 * sr)));
  // (V6.8) …and it STARTS in that zone too (it went back up to 2 s before its end, through the silence before a hit: on
  // t_d_kik_05 a loop of four beats held one hit and 1.2 s of silence): from the held instant back, as long as the mummer
  // is not silent (within 30 dB of its body: the silence before a hit, −40 to −57 dB of its peak there, ends it; the gaps
  // between the strokes of a drum loop, audible, do not) — the loop and the fade that joins it fit between this start and
  // its end, or there is no sample loop (the organic loop or the living stasis, both read where the mummer sounds, take over)
  // (searched as far back as the longest loop and its fade reach: where nothing is silent, the loop is the one it was)
  // (a silence: 50 ms on end 30 dB under the body — the gaps of a hocket, shorter, do not end it)
  let zs = Tsus; { let run = 0, x = Tsus; while (x - Bz > 0 && Tsus - x < Lmax + Math.round(LOOP_X * sr) + Bz) { x -= Bz; if (lv(x) < bodyDb - 30) { if (++run >= 5) break; } else { run = 0; zs = x; } } if (run < 5) zs = Math.min(zs, x); }
  const room = e - zs;
  // attaques raides de l'enfant
  const att = detectOnsets(M, sr).onsets.filter(o => o.sharp).map(o => o.s);
  const lastAttBefore = x => { let a = -1; for (const o of att) if (o < x) a = o; return a; };
  let Pl = Math.min(Lmax, e - Math.round(0.25 * sr)), X = Math.min(Math.round(LOOP_X * sr), Math.floor(Pl / 3));
  if (e - Pl - X < zs) { Pl = room > sr ? room - Math.round(LOOP_X * sr) : Math.floor(0.75 * room); X = Math.min(Math.round(LOOP_X * sr), Math.floor(Pl / 3)); }
  const la = lastAttBefore(e - Math.round(0.02 * sr));
  if (la >= 0 && e - (la + Math.round(0.03 * sr)) >= Lmin + X) Pl = Math.min(Pl, e - (la + Math.round(0.03 * sr)) - X);
  if (ctx.grid && ctx.grid.has) { const bt = ctx.grid.beat, k = Math.floor(Pl / bt); if (k >= 1 && k * bt <= e - Math.round(0.1 * sr)) Pl = Math.round(k * bt); }
  X = Math.min(Math.round(LOOP_X * sr), Math.floor(Pl / 3));
  if (Pl < Lmin || e - Pl - X < zs) return null;
  // raccord : fin déplacée d'au plus une période (ou 12 ms) pour la meilleure ressemblance des deux régions fondues
  const F = P.f0At(Math.max(0, e + child.cut)) || P.f0med || 150, T = Math.max(Math.round(0.012 * sr), Math.round(sr / F)), W = Math.round(0.03 * sr);
  const corrAt = (a, b) => { let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < W; ++i) { const x = M[a - W + i] || 0, y = M[b - W + i] || 0; sxy += x * y; sxx += x * x; syy += y * y; } return sxy / Math.sqrt(sxx * syy + 1e-30); };
  let bd = 0, bc = -2;
  for (let d = -T; d <= T; ++d) { const ee = e + d; if (ee >= n || ee - Pl - X < W) continue; const c = corrAt(ee, ee - Pl); if (c > bc) { bc = c; bd = d; } }
  e += bd; const s = e - Pl;
  if (s - X < 0) return null;
  // niveau : pente (dB/s) des blocs de 20 ms sur [s − X, e], compensée
  const Bk = Math.round(0.02 * sr), xs = [], ys = [];
  for (let b = s - X; b + Bk <= e; b += Bk) { let q = 0; for (let i = b; i < b + Bk; ++i) q += L[i] * L[i] + R[i] * R[i]; if (q > 0) { xs.push((b + Bk / 2 - s) / sr); ys.push(10 * Math.log10(q / Bk / 2)); } }
  let slope = 0; if (xs.length >= 4) { const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length; let num = 0, den = 0; xs.forEach((x, i) => { num += (x - mx) * (ys[i] - my); den += (x - mx) ** 2; }); slope = den > 0 ? num / den : 0; }
  const gAt = pos => Math.pow(10, clamp(-slope * (pos - s) / sr, -12, 12) / 20);
  const lin = bc >= 0.6, oL = new Float32Array(Pl), oR = new Float32Array(Pl);
  for (let i = 0; i < Pl; ++i) {
    const p1 = s + i, g1 = gAt(p1);
    if (i < Pl - X) { oL[i] = L[p1] * g1; oR[i] = R[p1] * g1; continue; }
    const u = (i - (Pl - X) + 0.5) / X, p0 = s - (Pl - i), g0 = gAt(p0);
    const a = lin ? 1 - u : Math.cos(0.5 * Math.PI * u), b = lin ? u : Math.sin(0.5 * Math.PI * u);
    oL[i] = a * L[p1] * g1 + b * L[p0] * g0; oR[i] = a * R[p1] * g1 + b * R[p0] * g0;
  }
  // (V6.8) never a loop pushed into silence: a short mummer had its loop's end pushed 0.56 s at least into it, past its own
  // sound (Bass_Lindrum_09, mummers 9 and 12: loops at −34 and −24 dB of its body, 100 and 71 % of them 30 dB under the
  // peak) — where the end had to be pushed, the loop as it will sound must stay within 20 dB of the body with a tenth of it
  // at most 30 dB under it, otherwise no sample loop
  if (e > eNat) { let ea = 0, m = 0, sil = 0; for (let b = 0; b + Bz <= Pl; b += Bz) { let q = 0; for (let i = b; i < b + Bz; ++i) q += oL[i] * oL[i] + oR[i] * oR[i]; q /= 2 * Bz; ea += q; m++; if (10 * Math.log10(q + 1e-20) < bodyDb - 30) sil++; }
    if (m > 0 && (10 * Math.log10(ea / m + 1e-30) < bodyDb - 20 || sil > 0.1 * m)) return null; }
  return { L: oL, R: oR, start: s, len: Pl, seamless: true, xfade: X,
    levelDb: { slopeDbPerS: slope, seamCorr: bc, xfadeMs: 1000 * X / sr, attacksAvoided: la >= 0 } };
}

// ---------------------------------------------------------------------------------------------- tenue organique (V6.2)
// « La boucle du maintien est beaucoup trop régulière » (Mat). La tenue est désormais une suite de FRAGMENTS du son réel de
// l'enfant, pris dans sa zone tenue (autour de l'instant de tenue, tant qu'il reste à 15 dB de son niveau là) :
//   • leurs DURÉES suivent le groove : au pouls, des tatums du sujet (les écarts de ses attaques comptés en tatums, 1 à 4 ;
//     bornes passées par son micro-groove — la tenue bat avec lui, vite) ; sans pouls, les écarts de ses attaques ; sans
//     attaques, deux périodes de son vibrato ; sinon ~180 ms modulés par la suite du nombre d'or (jamais deux fois pareil,
//     rien de tiré au hasard) ;
//   • leur PLACE dans le son suit son suiveur d'enveloppe et sa hauteur : chaque fragment vise un point de la zone (la suite du
//     nombre d'or la parcourt sans se répéter), puis se pose, à ±60 ms de là, où le niveau (dB, 10 ms) et la hauteur
//     (autocorrélation) ressemblent le plus à ceux de la fin du fragment précédent, et où la forme d'onde prolonge le mieux
//     la précédente (corrélation sur 15 ms, au quart de période près) ;
//   • raccords fondus (8 à 30 ms ; à gain constant si les formes se ressemblent, à puissance constante sinon), pente de
//     déclin compensée, et le dernier fragment se fond dans ce qui précède le premier : la boucle (3,5 s au plus) tourne sans
//     couture. Entrée et sortie : les fondus de 80 ms du moteur (la boucle n'est plus le son à l'instant même).
function organicLoop (P, ctx, child, Tsus) {
  const sr = P.sr, L = child.L, R = child.R, n = L.length, Ltot = Math.round(LOOP_SEC * sr), PHI = 0.6180339887;
  const M = new Float64Array(n); for (let i = 0; i < n; ++i) M[i] = 0.5 * (L[i] + R[i]);
  const Bz = Math.round(0.01 * sr), lv = x => { let q = 0; const a = Math.max(0, x), b = Math.min(n, a + Bz); for (let i = a; i < b; ++i) q += M[i] * M[i]; return 10 * Math.log10(q / Math.max(1, b - a) + 1e-20); };
  const ref = lv(Tsus);
  let zs = Tsus, ze = Tsus;
  while (zs - Bz > 0 && Tsus - zs < 2 * sr && lv(zs - Bz) >= ref - 15) zs -= Bz;
  while (ze + Bz < n - 1 && ze - Tsus < 2 * sr && lv(ze + Bz) >= ref - 15) ze += Bz;
  if (ze - zs < 0.35 * sr) return null;
  // hauteur (période en échantillons) par autocorrélation décimée ×4, blocs de 10 ms
  const dec = 4, fsd = sr / dec, Md = new Float64Array(Math.floor(n / dec)); for (let i = 0; i < Md.length; ++i) Md[i] = M[i * dec];
  const pcache = new Map();
  const periodAt = x => {
    const key = Math.round(x / Bz); if (pcache.has(key)) return pcache.get(key);
    const c = Math.floor(key * Bz / dec), W = Math.round(0.03 * fsd), lo = Math.round(fsd / 1000), hi = Math.round(fsd / 50);
    let best = 0, bl = 0; if (c - W >= 0 && c + W + hi < Md.length) { let e0 = 0; for (let i = c - W; i < c + W; ++i) e0 += Md[i] * Md[i];
      for (let l = lo; l <= hi; ++l) { let sxy = 0, syy = 0; for (let i = c - W; i < c + W; ++i) { sxy += Md[i] * Md[i + l]; syy += Md[i + l] * Md[i + l]; } const r = sxy / Math.sqrt(e0 * syy + 1e-30); if (r > best) { best = r; bl = l; } } }
    const per = best > 0.6 ? bl * dec : 0; pcache.set(key, per); return per;
  };
  // durées des fragments
  const g = ctx.grid, ons = (P.onsetsAll || []).map(o => o.s).sort((a, b) => a - b), iois = [];
  for (let i = 1; i < ons.length; ++i) if (ons[i] - ons[i - 1] > 0.05 * sr) iois.push(ons[i] - ons[i - 1]);
  const durs = []; let tot = 0;
  if (g && g.has) {
    const cell = iois.slice(0, 8).map(d => clamp(Math.round(d / g.tatum), 1, 4)); if (cell.length < 2) cell.push(2, 1, 1);
    let raw = 0, prevW = g.warp(0);
    for (let j = 0; tot < Ltot; ++j) { raw += cell[j % cell.length] * g.tatum; const w = g.warp(raw); let d = Math.max(Math.round(0.06 * sr), Math.round(w - prevW)); prevW = w; if (tot + d > Ltot) { d = Ltot - tot; if (d < 0.06 * sr) break; } durs.push(d); tot += d; }
  } else {
    for (let j = 0; tot < Ltot; ++j) {
      let d;
      if (iois.length >= 3) d = clamp(iois[j % iois.length], 0.08 * sr, 0.6 * sr);
      else if (P.traits && P.traits.vibRate > 2) d = 2 * sr / P.traits.vibRate * (0.8 + 0.4 * ((j * PHI) % 1));
      else d = 0.18 * sr * (0.7 + 0.6 * ((j * PHI) % 1));
      d = Math.round(d); if (tot + d > Ltot) { d = Ltot - tot; if (d < 0.06 * sr) break; } durs.push(d); tot += d;
    }
  }
  // pente de déclin de la zone (dB/s), compensée fragment par fragment
  const xs = [], ys = []; for (let b = zs; b + 2 * Bz <= ze; b += 2 * Bz) { xs.push((b - Tsus) / sr); ys.push(lv(b)); }
  let slope = 0; if (xs.length >= 4) { const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length; let num = 0, den = 0; xs.forEach((x, i) => { num += (x - mx) * (ys[i] - my); den += (x - mx) ** 2; }); slope = den > 0 ? num / den : 0; }
  const gAt = pos => Math.pow(10, clamp(-slope * (pos - Tsus) / sr, -12, 12) / 20);
  const Wc = Math.round(0.015 * sr);
  const corrAt = (a, b) => { let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < Wc; ++i) { const x = M[a - Wc + i] || 0, y = M[b - Wc + i] || 0; sxy += x * y; sxx += x * x; syy += y * y; } return sxy / Math.sqrt(sxx * syy + 1e-30); };
  const cents = (pa, pb) => pa > 0 && pb > 0 ? Math.abs(1200 * Math.log2(pa / pb)) : 0;
  // placement des fragments : le premier à l'instant de tenue, les suivants comme décrit plus haut
  const frags = []; let pos = Math.max(zs, Math.min(Tsus, ze - durs[0]));
  for (let j = 0; j < durs.length; ++j) {
    const d = Math.min(durs[j], ze - zs - Bz);
    if (j > 0) {
      const prevEnd = frags[j - 1].p + frags[j - 1].d, lvRef = lv(prevEnd - Bz) + slope * (prevEnd - Tsus) / sr, perRef = periodAt(prevEnd - Bz);
      const target = zs + ((j * PHI) % 1) * Math.max(1, ze - zs - d), span = Math.round(0.06 * sr), stp = Math.round(0.005 * sr);
      let bs = -1e9, bp = target;
      for (let q = target - span; q <= target + span; q += stp) {
        const qq = Math.round(clamp(q, zs + Wc, ze - d)); const lvQ = lv(qq) + slope * (qq - Tsus) / sr;
        const sc = corrAt(prevEnd, qq) - Math.abs(lvQ - lvRef) / 6 - cents(periodAt(qq), perRef) / 100;
        if (sc > bs) { bs = sc; bp = qq; }
      }
      // au quart de période près : la meilleure corrélation autour du point retenu
      const T = Math.max(8, Math.round((periodAt(bp) || 0.004 * sr) / 2)); let bc = -2, bd = 0;
      for (let dd = -T; dd <= T; dd += 1) { const qq = bp + dd; if (qq - Wc < zs - 0.2 * sr || qq + d > ze) continue; const c = corrAt(prevEnd, qq); if (c > bc) { bc = c; bd = dd; } }
      pos = bp + bd; frags.push({ p: pos, d, c: bc });
    } else frags.push({ p: pos, d, c: 1 });
  }
  { const last = frags[frags.length - 1]; frags[0].c = corrAt(last.p + last.d, frags[0].p); }
  // assemblage : chaque fragment commence en fondu avec la suite naturelle du précédent
  const total = frags.reduce((a, f) => a + f.d, 0), oL = new Float32Array(total), oR = new Float32Array(total);
  let t = 0;
  for (let j = 0; j < frags.length; ++j) {
    const f = frags[j], prev = frags[(j - 1 + frags.length) % frags.length], X = Math.round(clamp(0.25 * Math.min(f.d, prev.d), 0.008 * sr, 0.03 * sr));
    const lin = f.c >= 0.6;
    for (let i = 0; i < f.d; ++i) {
      const p1 = f.p + i, g1 = gAt(p1); let l = L[p1] * g1, r = R[p1] * g1;
      if (i < X) {
        // la fin du précédent continue sous le début de celui-ci (pour le premier : la fin du dernier, au bouclage)
        const p0 = prev.p + prev.d + i, g0 = gAt(p0), u = (i + 0.5) / X, a = lin ? u : Math.sin(0.5 * Math.PI * u), b = lin ? 1 - u : Math.cos(0.5 * Math.PI * u);
        const l0 = p0 < n ? L[p0] * g0 : 0, r0 = p0 < n ? R[p0] * g0 : 0; l = a * l + b * l0; r = a * r + b * r0;
      }
      oL[t + i] = l; oR[t + i] = r;
    }
    t += f.d;
  }
  // niveau : celui de l'enfant juste avant la tenue
  let ec = 0, el = 0; const W2 = Math.round(0.2 * sr);
  for (let i = Math.max(0, Tsus - W2); i < Tsus; ++i) ec += L[i] ** 2 + R[i] ** 2;
  for (let i = 0; i < total; ++i) el += oL[i] ** 2 + oR[i] ** 2;
  ec /= Math.max(1, Math.min(W2, Tsus)); el /= Math.max(1, total);
  const gm = ec > 0 && el > 0 ? clamp(Math.sqrt(ec / el), 0.25, 4) : 1; for (let i = 0; i < total; ++i) { oL[i] *= gm; oR[i] *= gm; }
  return { L: oL, R: oR, start: Tsus, len: total, seamless: false, xfade: 0,
    levelDb: { fragments: frags.length, meanMs: Math.round(1000 * total / frags.length / sr), zoneS: (ze - zs) / sr, seamCorr: frags.reduce((a, f) => a + f.c, 0) / frags.length, slopeDbPerS: slope, gainDb: 20 * Math.log10(gm) } };
}

// biquads (RBJ) : passe-haut Butterworth d'ordre 2, et pondération K (passe-haut 60 Hz + plateau +4 dB au-dessus de 1,5 kHz)
function biquad (x, b0, b1, b2, a1, a2) { let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; ++i) { const u = x[i], y = b0 * u + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = u; y2 = y1; y1 = y; x[i] = y; } }
function hp2 (x, fc, sr, q = Math.SQRT1_2) { const w = 2 * Math.PI * fc / sr, c = Math.cos(w), al = Math.sin(w) / (2 * q), a0 = 1 + al; biquad(x, (1 + c) / 2 / a0, -(1 + c) / a0, (1 + c) / 2 / a0, -2 * c / a0, (1 - al) / a0); }
// (V6.5) the same Butterworth 2 there and back (zero phase, order 4 in magnitude): its corner is lowered to fc·(√2 − 1)^¼
// so that the pair still sits at −3 dB on fc. Both ends are extended by an odd mirror of 0.1 s (ten time constants), so
// neither pass starts on a step
function hpZero (x, fc, sr) {
  const n = x.length; if (n < 4) return;
  const E = Math.min(n - 1, Math.round(0.1 * sr)), y = new Float64Array(n + 2 * E);
  for (let i = 0; i < E; ++i) { y[i] = 2 * x[0] - x[E - i]; y[E + n + i] = 2 * x[n - 1] - x[n - 2 - i]; }
  for (let i = 0; i < n; ++i) y[E + i] = x[i];
  const f = fc * Math.pow(Math.SQRT2 - 1, 0.25);
  hp2(y, f, sr); y.reverse(); hp2(y, f, sr); y.reverse();
  for (let i = 0; i < n; ++i) x[i] = y[E + i];
}
function kw (x, sr) {
  hp2(x, 60, sr, 0.5);
  const A = Math.pow(10, 4 / 40), w = 2 * Math.PI * 1500 / sr, c = Math.cos(w), sn = Math.sin(w), al = sn / 2 * Math.SQRT2, sa = 2 * Math.sqrt(A) * al;
  const a0 = (A + 1) - (A - 1) * c + sa;
  biquad(x, A * ((A + 1) + (A - 1) * c + sa) / a0, -2 * A * ((A - 1) + (A + 1) * c) / a0, A * ((A + 1) + (A - 1) * c - sa) / a0, 2 * ((A - 1) - (A + 1) * c) / a0, ((A + 1) - (A - 1) * c - sa) / a0);
}
export function __sympatheticHalo (L, R, sr, halo) { return sympatheticHalo(L, R, sr, halo); }
