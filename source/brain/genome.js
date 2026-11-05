// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// ============================================================================================
//  CHARIVARI — la POPULATION : quels gestes pour quels enfants
//  • PERTINENCE : un geste n'est retenu que si la couche qu'il travaille existe dans le parent
//    (partiels, attaques, pouls, vie, souffle) — mesurée, pas supposée.
//  • EXCENTRICITÉ : chaque enfant est choisi le plus loin possible de ceux déjà nés, dans l'espace
//    des effets (hauteur, temps, spectre, rythme, forme, vie, souffle, espace) — sélection du point
//    le plus éloigné, déterministe.
//  • MIROIR : l'intensité des gestes. Sous le maximum, les enfants sont RANGÉS du plus proche au
//    plus lointain (progression) ; au maximum, tous vont au bout et c'est l'écart ENTRE EUX qui prime.
//  • Chaque enfant : un geste PRINCIPAL (son caractère) + un ou deux gestes SECONDAIRES
//    complémentaires (une seule carte du temps, une seule structure de hauteur, un seul multiplicateur).
// ============================================================================================
import { GESTES, gridOf, degreesOf, baseStratum, DIMENSIONS } from './genes.js';
import { renderChild } from './render.js';

const dist = (a, b) => Math.sqrt(a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0));
const add = (a, b, k = 1) => a.map((x, i) => x + k * b[i]);

export function contextOf (M) { return { grid: gridOf(M), deg: degreesOf(M), ladder: M.ladder, axis: M.fundamentalCents }; }

export function designPopulation (M, opts = {}) {
  const miroir = opts.miroir ?? 1, count = opts.count ?? 16, T = M.traits, ctx = contextOf(M);
  const names = Object.keys(GESTES);
  const rel = Object.fromEntries(names.map(g => [g, Math.max(0, Math.min(1, GESTES[g].relevance(T)))]));
  const cands = [];
  for (const g of names) { if (g === 'espace' || g === 'echo' || rel[g] < 0.3) continue; for (let v = 0; v < 3; ++v) cands.push({ g, v }); }
  const used = new Map(), vecs = [], kids = [];
  const zero = DIMENSIONS.map(() => 0);
  for (let k = 0; k < count; ++k) {
    const prog = 0.3 + 0.7 * (k + 1) / count, iota = miroir * (prog + (1 - prog) * miroir * miroir);
    // principal : le plus éloigné des enfants déjà nés (et du parent : vecteur nul), pondéré par la pertinence
    let best = null, bs = -1;
    for (const c of cands) {
      const n = used.get(c.g) || 0; if (n >= 2) continue;
      if (kids.some(q => q.genome[0].g === c.g && q.genome[0].v === c.v)) continue;
      const e = GESTES[c.g].profile.map(x => x * iota);
      const dmin = Math.min(dist(e, zero) * 0.5, ...vecs.map(w => dist(e, w)));
      const sc = dmin * (0.4 + 0.6 * rel[c.g]) * (n ? 0.7 : 1) + 1e-3 * rel[c.g];
      if (sc > bs) { bs = sc; best = c; }
    }
    if (!best) break;
    used.set(best.g, (used.get(best.g) || 0) + 1);
    const genome = [{ g: best.g, v: best.v, iota }];
    let vec = GESTES[best.g].profile.map(x => x * iota);
    // secondaires : complémentaires et compatibles
    const nSec = iota < 0.5 ? 1 : 2, cats = new Set([GESTES[best.g].cat]);
    const pitchCats = new Set(['pitch']), exclusive = new Set(['map', 'pitch', 'multiply', 'delay']);
    for (let s = 0; s < nSec; ++s) {
      let b2 = null, s2 = -1;
      for (const g of names) {
        if (genome.some(x => x.g === g) || g === 'echo') continue;
        const cat = GESTES[g].cat;
        if (exclusive.has(cat) && cats.has(cat)) continue;
        if (cat === 'delay' && cats.has('map')) continue;
        if (cat === 'map' && cats.has('delay')) continue;
        if (rel[g] < 0.3 && g !== 'espace') continue;
        const si = iota * (0.35 + 0.2 * s);
        const e = add(vec, GESTES[g].profile, si);
        const dmin = Math.min(...vecs.map(w => dist(e, w)), dist(e, zero));
        const sc = dmin * (0.3 + 0.7 * rel[g]) + (pitchCats.has(cat) ? 0 : 0.01);
        if (sc > s2) { s2 = sc; b2 = g; }
      }
      if (!b2) break;
      const si = iota * (0.35 + 0.2 * s), vv = (k + s + 1) % 3;
      genome.push({ g: b2, v: vv, iota: si }); cats.add(GESTES[b2].cat);
      vec = add(vec, GESTES[b2].profile, si);
    }
    vecs.push(vec);
    kids.push({ genome, vec, iota });
  }
  // rangement : sous le maximum du miroir, du plus proche au plus lointain ; au maximum, ordre d'excentricité
  if (miroir < 0.999) kids.sort((a, b) => dist(a.vec, zero) - dist(b.vec, zero));
  return { kids, ctx, relevance: rel };
}

/** construit les strates d'un enfant et le rend ; accordage : degré `deg` (cents) de l'échelle */
export function birth (M, kid, ctx, opts = {}) {
  let strata = [baseStratum(M)], D = M.n;
  const descs = [];
  // ordre : carte du temps → décalages → gestes voix par voix → multiplicateurs
  const order = { map: 0, delay: 1, life: 2, pitch: 3, db: 4, gate: 5, pan: 6, multiply: 7 };
  const gs = kid.genome.slice().sort((a, b) => order[GESTES[a.g].cat] - order[GESTES[b.g].cat]);
  for (const x of gs) {
    const made = GESTES[x.g].make(M, ctx, x.iota, x.v);
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
  return { ...out, D, desc: descs, strata: strata.length };
}
