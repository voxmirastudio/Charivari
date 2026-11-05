// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// ============================================================================================
//  CHARIVARI v3 — la POPULATION : chaque enfant = une MUTATION DE L'INSTRUMENT (gène principal),
//  parfois un second gène compatible, et une MORPHOLOGIE (geste de forme) ; au besoin un geste de
//  hauteur (gamme). Choix déterministe : pertinence mesurée × éloignement maximal des enfants déjà
//  nés (excentricité) dans l'espace des effets. L'écho est retiré (jugé trop simple).
// ============================================================================================
import { ORGANO, formantsOf } from './organo.js';
import { GESTES, gridOf, degreesOf, baseStratum } from './genes.js';
import { renderChild } from './render.js';

export const DIMS = ['hauteur', 'temps', 'corps', 'rythme', 'forme', 'vie', 'souffle', 'espace', 'matiere', 'articulation', 'source'];
const vecOf = obj => DIMS.map(d => obj[d] || 0);
// profils des gestes de forme / hauteur (v2) ramenés aux nouvelles dimensions
const OLD = ['hauteur', 'temps', 'corps', 'rythme', 'forme', 'vie', 'souffle', 'espace'];
const formVec = g => { const p = GESTES[g].profile, o = {}; OLD.forEach((d, i) => { o[d] = p[i]; }); return vecOf(o); };
const orgVec = g => vecOf(ORGANO[g].dims);
const dist = (a, b) => Math.sqrt(a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0));
const add = (a, b, k = 1) => a.map((x, i) => x + k * b[i]);

// catégories : une seule carte du temps, un seul multiplicateur « lourd », une seule structure de hauteur
const KIND = {
  taille: 'pitchbody', pavillons: 'mult', sourdine: 'filter', souffle: 'breath', jeu: 'gate', matiere: 'pitchbody', perce: 'filter', section: 'mult', sympathique: 'halo',
  rotation: 'map', aksak: 'map', stase: 'map', retro: 'map', eclosion: 'delay', canon: 'mult', hoquet: 'gate', chant: 'pitch', crible: 'pitch', miroir: 'pitch', spirale: 'pitch', etirement: 'pitch', vie: 'life', corps: 'filter', inversee: 'breath', espace: 'pan'
};
const FORMS = ['rotation', 'aksak', 'stase', 'retro', 'eclosion', 'canon', 'hoquet', 'vie', 'espace'];
const PITCH = ['chant', 'crible', 'miroir', 'spirale', 'etirement'];
const ORDER = { map: 0, delay: 1, life: 2, pitchbody: 3, pitch: 4, filter: 5, breath: 6, gate: 7, pan: 8, mult: 9, halo: 10 };

export function contextOf (M) {
  return { grid: gridOf(M), deg: degreesOf(M), ladder: M.ladder, period: M.tuning ? M.tuning.period : 1200, axis: M.fundamentalCents, formants: formantsOf(M) };
}

function compatible (genome, g) {
  const k = KIND[g], kinds = genome.map(x => KIND[x.g]);
  if (genome.some(x => x.g === g)) return false;
  if (k === 'map' && (kinds.includes('map') || kinds.includes('delay'))) return false;
  if (k === 'delay' && kinds.includes('map')) return false;
  if (k === 'mult' && kinds.filter(x => x === 'mult').length >= 1) return false;
  if ((k === 'pitch' || k === 'pitchbody') && kinds.some(x => x === 'pitch')) return false;
  if (k === 'pitch' && kinds.includes('pitchbody') && g !== 'crible') return false;
  if (k === 'breath' && kinds.includes('breath')) return false;
  if (k === 'gate' && kinds.includes('gate')) return false;
  return true;
}

export function designPopulation (M, opts = {}) {
  const miroir = opts.miroir ?? 1, count = opts.count ?? 16, T = M.traits, ctx = contextOf(M);
  const relO = Object.fromEntries(Object.keys(ORGANO).map(g => [g, Math.max(0, Math.min(1, ORGANO[g].relevance(T)))]));
  const relF = Object.fromEntries(Object.keys(GESTES).filter(g => g !== 'echo').map(g => [g, Math.max(0, Math.min(1, GESTES[g].relevance(T)))]));
  const zero = DIMS.map(() => 0), vecs = [], kids = [], usedO = new Map(), usedF = new Map();
  const pitched = T.tonal > 0.5 && T.nHarm >= 6;
  for (let k = 0; k < count; ++k) {
    const prog = 0.3 + 0.7 * (k + 1) / count, iota = miroir * (prog + (1 - prog) * miroir * miroir);
    // 1. gène principal : mutation de l'instrument
    let best = null, bs = -1;
    for (const g of Object.keys(ORGANO)) for (let v = 0; v < 3; ++v) {
      if (relO[g] < 0.3 || kids.some(q => q.genome[0].g === g && q.genome[0].v === v)) continue;
      const n = usedO.get(g) || 0; if (n >= 2) continue;
      const e = orgVec(g).map(x => x * iota), dmin = Math.min(dist(e, zero) * 0.5, ...vecs.map(w => dist(e, w)));
      const sc = dmin * (0.4 + 0.6 * relO[g]) * (n ? 0.6 : 1) + 1e-3 * relO[g] + 1e-4 * (2 - v);
      if (sc > bs) { bs = sc; best = { g, v }; }
    }
    if (!best) break;
    usedO.set(best.g, (usedO.get(best.g) || 0) + 1);
    const genome = [{ g: best.g, v: best.v, iota, organo: true }];
    let vec = orgVec(best.g).map(x => x * iota);
    // 2. morphologie : la forme la plus éloignée, compatible
    let bf = null, sf = -1;
    for (const g of FORMS) {
      if (!relF[g] || relF[g] < 0.3 || !compatible(genome, g)) continue;
      const n = usedF.get(g) || 0; if (n >= 3) continue;
      const e = add(vec, formVec(g), 0.6 * iota), dmin = Math.min(...vecs.map(w => dist(e, w)), dist(e, zero));
      const sc = dmin * (0.3 + 0.7 * relF[g]) * (n ? 0.8 : 1);
      if (sc > sf) { sf = sc; bf = g; }
    }
    if (bf) { usedF.set(bf, (usedF.get(bf) || 0) + 1); genome.push({ g: bf, v: (k + 1) % 3, iota: 0.6 * iota }); vec = add(vec, formVec(bf), 0.6 * iota); }
    // 3. second gène d'instrument (au-delà de la moitié du miroir), compatible et complémentaire
    if (iota >= 0.5) {
      let b2 = null, s2 = -1;
      for (const g of Object.keys(ORGANO)) {
        if (relO[g] < 0.3 || !compatible(genome, g)) continue;
        const e = add(vec, orgVec(g), 0.5 * iota), dmin = Math.min(...vecs.map(w => dist(e, w)), dist(e, zero));
        const sc = dmin * (0.3 + 0.7 * relO[g]);
        if (sc > s2) { s2 = sc; b2 = g; }
      }
      if (b2) { genome.push({ g: b2, v: (k + 2) % 3, iota: 0.5 * iota, organo: true }); vec = add(vec, orgVec(b2), 0.5 * iota); }
    }
    // 4. geste de hauteur (gamme) pour un parent à hauteur, un enfant sur trois
    if (pitched && k % 3 === 2) {
      for (const g of PITCH) if (compatible(genome, g) && (relF[g] || 0) >= 0.3 && !kids.some(q => q.genome.some(x => x.g === g))) { genome.push({ g, v: k % 3, iota: 0.5 * iota }); vec = add(vec, formVec(g), 0.5 * iota); break; }
    }
    vecs.push(vec); kids.push({ genome, vec, iota });
  }
  if (miroir < 0.999) kids.sort((a, b) => dist(a.vec, zero) - dist(b.vec, zero));
  return { kids, ctx, relevance: { ...relO, ...relF } };
}

export function birth (M, kid, ctx, opts = {}) {
  let strata = [baseStratum(M)], D = M.n;
  const descs = [];
  const gs = kid.genome.slice().sort((a, b) => ORDER[KIND[a.g]] - ORDER[KIND[b.g]]);
  for (const x of gs) {
    const lib = x.organo ? ORGANO : GESTES;
    const made = lib[x.g].make(M, ctx, x.iota, x.v);
    if (!made) continue;
    const r = made.apply(strata, D); strata = r.strata; D = r.D; descs.push(made.desc);
  }
  if (opts.accordCents) {
    const sh = opts.accordCents, ratio = Math.pow(2, sh / 1200);
    for (const S of strata) {
      const c0 = S.cents; S.cents = c0 ? (...a) => c0(...a) + sh : (v, tau, c) => c + sh;
      if (S.resid) S.resid = { ...S.resid, ratio: (S.resid.ratio ?? 1) * ratio };
    }
    descs.push(`accordé ${sh >= 0 ? '+' : ''}${Math.round(sh)} c`);
  }
  D = Math.min(D, Math.round(opts.maxSec ? opts.maxSec * M.sr : Math.max(1.6 * M.n, M.n + 4 * M.sr)));
  const out = renderChild(M, strata, D);
  // jamais de silence hors de propos au début : l'enfant ne commence pas plus tard que le parent
  const lead = x => { const B = Math.round(0.005 * M.sr); let pk = 0; for (let i = 0; i < x[0].length; ++i) pk = Math.max(pk, Math.abs(x[0][i]), Math.abs(x[1][i])); const th = pk * 0.01; for (let i = 0; i < x[0].length; i += B) { let m = 0; for (let k = i; k < Math.min(x[0].length, i + B); ++k) m = Math.max(m, Math.abs(x[0][k]), Math.abs(x[1][k])); if (m > th) return i; } return 0; };
  const lp = lead([M.L, M.R]), lc = lead([out.L, out.R]), cut = Math.max(0, lc - lp - Math.round(0.01 * M.sr));
  if (cut > 0) { out.L = out.L.slice(cut); out.R = out.R.slice(cut); D -= cut; descs.push(`(${(cut / M.sr).toFixed(2)} s de silence initial retirés)`); }
  return { ...out, D, desc: descs, strata: strata.length };
}
