// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// ============================================================================================
//  CHARIVARI — ÉCRITURES, LOT 2 : les opérations de jgcompose (jgcompose_skills, jgcompose_skills2, jgcompose_free)
//  portées à l'échelle micro / mezzo d'un échantillon. Comme au lot 1, chacune lit la PARTITION MICRO (partition.js) —
//  événements, phrases, voix (vraies voix, familles de partiels ou bandes) — et ne développe que ce qui y est attesté.
//  Aucun aléatoire : chaque choix est une mesure ou une rotation fixe (pas premier avec le nombre de voix, nombre d'or).
//
//   VOIX     lampe (#38) — prisme (#37) — fusion — canon entre les voix — parallélisme (#74) — partiel fixe —
//            avènement (#89) — budget de temps de parole (#44)
//   LIGNE    arche inversée (#68) — franchissement de seuil (#64) — permutation spectrale (#14) — interpolation A→B (#16)
//   TEMPS    contramétricité (#73) — silence : trou · abandon · suspension (#39) — fenêtre qui laisse passer le refrain (#60)
//            — régime par registre (#42)
//   ESPACE   bascule de registre (#43) — écho (#27) — pédale (#21)
// ============================================================================================
import { centsOf, hzOf } from './microtonal.js';

const S_CURVE = u => (u <= 0 ? 0 : u >= 1 ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * u));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const median = a => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
const quantile = (a, q) => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.max(0, Math.min(s.length - 1, Math.floor(q * (s.length - 1))))]; };
const PHI = (Math.sqrt(5) - 1) / 2, frac = x => x - Math.floor(x);
const gcd = (a, b) => (b ? gcd(b, a % b) : a);

function finder (events) {
  const st = events.map(e => e.s0);
  return s => { if (s === null || s === undefined || !events.length || s < st[0]) return null; let lo = 0, hi = st.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (st[m] <= s) lo = m; else hi = m - 1; } return s < events[lo].sN ? events[lo] : null; };
}
function scaleOf (ctx) { const sc = ctx.deg && (ctx.deg.scale.length ? ctx.deg.scale : ctx.deg.all); return sc && sc.length >= 3 ? sc : null; }
function snapTo (sc, c) { if (!sc) return Math.round(c / 100) * 100; let lo = 0, hi = sc.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (sc[m] < c) lo = m; else hi = m; } return Math.abs(sc[lo] - c) <= Math.abs(sc[hi] - c) ? sc[lo] : sc[hi]; }
function degIndex (sc, c) { let bi = 0, bd = 1e9; sc.forEach((x, i) => { const d = Math.abs(x - c); if (d < bd) { bd = d; bi = i; } }); return bi; }
function safeRatio (f0, cents) { let c = clamp(cents, -2400, 2400); while (f0 * Math.pow(2, c / 1200) > 2500) c -= 1200; while (f0 * Math.pow(2, c / 1200) < 30) c += 1200; return Math.pow(2, c / 1200); }
const ratioOf = c => Math.pow(2, c / 1200);
// gain d'un événement gardé (0 dB) ou éteint (−80 dB), fondus de 10 ms aux bords
function eventGate (ev, keep, sr) {
  const at = finder(ev), R = 0.01 * sr;
  return s => { const e = at(s); if (!e) return 0; if (keep(e)) return 0; const w = clamp(Math.min(s - e.s0, e.sN - s) / R, 0, 1); return -80 * w; };
}
// fenêtres d'énoncé (source) : les phrases ; à défaut, des mesures sur la grille ; à défaut, quatre parts égales de la zone
// active
function windowsOf (P, ctx) {
  const M = ctx.ms, ev = M.events, sr = P.sr;
  if (M.phrases.length >= 2) return M.phrases.map(p => [ev[p.a].s0, ev[p.b].sN]);
  const a0 = Math.round(P.traits.activeStart * sr), a1 = Math.round(P.traits.activeEnd * sr);
  if (ctx.grid.has) { const B = ctx.grid.bar, out = []; let t = ctx.grid.phase; while (t + B < a0) t += B; for (; t < a1; t += B) out.push([Math.max(a0, Math.round(t)), Math.min(a1, Math.round(t + B))]); if (out.length >= 2) return out; }
  return Array.from({ length: 4 }, (_, q) => [Math.round(a0 + q * (a1 - a0) / 4), Math.round(a0 + (q + 1) * (a1 - a0) / 4)]);
}
function windowFinder (W) { return s => { if (s === null || s === undefined) return -1; for (let i = 0; i < W.length; ++i) if (s >= W[i][0] && s < W[i][1]) return i; return s < W[0][0] ? 0 : W.length - 1; }; }
// une voix de la partition, dans une strate : atténuée de g(t, s) dB (le reste passe), ou seule (le reste se tait)
// (familles par REGISTRE : là où le son n'a pas de hauteur — une frappe, un souffle —, la voix est la bande de fréquences de
// ses rangs autour de la fondamentale médiane ; sans cela, sur une matière percussive, rien n'agissait hors des trames voisées :
// mesuré, la fenêtre du silence sur une boucle de percussions laissait passer tout le flot, 0,0 dB d'effet du dosage)
function attenuate (S, st, i, g, P) {
  const fam = st.list[i];
  if (st.kind === 'partials') {
    S.partial.push((h, f, d, t, F, s) => (fam.hasRank(h) ? [f, d + g(t, s)] : [f, d]));
    if (P && st.basis === 'register') S.env.push((f, t, s) => { if (s === null || s === undefined) return 0; const j = clamp(Math.round(s / P.hopF), 0, P.voiced.length - 1); return P.voiced[j] > 0 || !fam.has(f, s, 0) ? 0 : g(t, s); });
  }
  else if (st.kind === 'voices') { if (i === 0) S.partial.push((h, f, d, t, F, s) => [f, d + g(t, s)]); else S.free.push((f, d, t, s) => (fam.has(f, s) ? [f, d + g(t, s)] : [f, d])); }
  else S.env.push((f, t, s) => (fam.has(f, s) ? g(t, s) : 0));
}
function isolate (S, st, i, P) {
  const fam = st.list[i], inF = (f, s) => fam.has(f, s, s !== null && s !== undefined ? P.f0At(s) : 0);
  if (st.kind === 'partials') { S.partial.push((h, f, d) => (fam.hasRank(h) ? [f, d] : null)); S.free.push((f, d, t, s) => (inF(f, s) ? [f, d] : null)); S.envNoise.push((f, t, s) => (inF(f, s) ? 0 : -60)); }
  else if (st.kind === 'voices') { if (i === 0) { S.free.push(() => null); } else { S.partial.push(() => null); S.free.push((f, d, t, s) => (inF(f, s) ? [f, d] : null)); } S.envNoise.push(() => -30); }
  else S.env.push((f, t, s) => (inF(f, s) ? 0 : -60));
}

export const ECRITURES2 = {};

// ============================================================================================= VOIX
// LA LAMPE (#38) — « une lampe qui éclairerait les partiels, pas tous en même temps » : à chaque énoncé, n voix sur M
// restent dans l'ombre, par rotation FIXE (pas premier avec M : un tour complet). La moitié dans l'ombre (v0), une seule
// (v1), toutes sauf une — un projecteur (v2). L'ombre : −30 à −60 dB, passages de 20 ms.
ECRITURES2.lampe = {
  kind: 'voice', profile: [0.1, 0.2, 0.7, 0.3, 0.6, 0.3, 0.0, 0.2],
  relevance: T => { const m = T.ms; return m && m.strata >= 2 ? clamp(0.35 + 0.2 * m.separation, 0, 0.9) : 0; },
  make (P, ctx, iota, variant) {
    const st = ctx.ms.strata, M = st.list.length; if (M < 2) return null;
    const W = windowsOf(P, ctx); if (W.length < 2) return null;
    const v = variant % 3, nOff = v === 0 ? Math.max(1, Math.floor(M / 2)) : v === 1 ? 1 : M - 1;
    let pas = M === 2 ? 1 : 2; while (gcd(pas, M) !== 1) pas++;
    // v1 : la lampe reste deux énoncés au même endroit (elle tourne deux fois plus lentement) ; v2 à deux voix : un énoncé
    // sur trois, tout est éclairé (sinon v2 = v0 quand M = 2)
    const pos = w => (v === 1 ? Math.floor(w / 2) : w);
    const off = W.map((_, w) => { const set = new Set(); if (v === 2 && M === 2 && w % 3 === 2) return set; for (let j = 0; j < nOff; ++j) set.add((pos(w) * pas + j) % M); return set; });
    const depth = -(6 + 54 * iota), R = 0.02 * P.sr;
    // poids d'ombre de la voix i à la position source s : 1 dans une fenêtre où elle est éteinte, fondus de 20 ms aux bords
    const shade = (i, s) => { if (s === null || s === undefined) return 0; let w = 0; for (let q = 0; q < W.length; ++q) { if (!off[q].has(i)) continue; const [a, b] = W[q]; if (s > a - R && s < b + R) w = Math.max(w, clamp(Math.min(s - a + R, b + R - s) / (2 * R), 0, 1)); } return w; };
    const name = ['half the voices in the shade', 'one voice in the shade', 'a spotlight: one voice lit'][v];
    return { desc: `the lamp (${st.kind === 'partials' ? st.basis + ' families' : st.kind}): ${name}, turning by ${pas} over ${W.length} statements`,
      apply (layers, D) { for (const S of layers) for (let i = 0; i < M; ++i) attenuate(S, st, i, (t, s) => depth * shade(i, s), P); return { layers, D }; } };
  }
};

// PRISME (#37) — un partiel joué par une voix est une note ; joué par deux voix désaccordées de quelques cents, c'est une
// BANDE QUI BAT, et le couple tourne d'un partiel à l'autre. Une note sur trois (rotation fixe) : un de ses partiels forts
// est doublé, désaccordé de 12 c avec 35 ms de retard (v0), de 6 c, 20 ms — un battement lent (v1), de 20 c, 60 ms (v2).
ECRITURES2.prisme = {
  kind: 'mult', layers: 2, profile: [0.4, 0.1, 0.8, 0.1, 0.2, 0.6, 0.0, 0.3],
  relevance: T => { const m = T.ms; return m && m.nPitched >= 3 && T.nHarm >= 4 ? 0.6 * m.pitchedShare : 0; },
  make (P, ctx, iota, variant) {
    const ev = ctx.ms.events, pe = ev.filter(e => e.f0 > 0); if (pe.length < 3) return null;
    const v = variant % 3, cents = [12, 6, 20][v], dly = Math.round([0.035, 0.02, 0.06][v] * P.sr), unSur = iota < 0.4 ? 3 : iota < 0.75 ? 2 : 1;
    // rangs forts du son (familles relevées si elles existent, sinon 2 à 6), parcourus par pas fixe
    const st = ctx.ms.strata, feats = st.features ? st.features.slice().sort((a, b) => b.level - a.level).map(f => f.h).filter(h => h >= 2 && h <= 12) : [];
    const ranks = (feats.length >= 3 ? feats.slice(0, 5) : [2, 3, 5, 4, 6]);
    const pick = new Map(); let q = 0;
    pe.forEach((e, k) => { if (k % unSur === 0) { pick.set(e.i, ranks[(q * 2) % ranks.length]); q++; } });
    const at = finder(ev), gate = eventGate(ev, e => pick.has(e.i), P.sr), lvl = -6 + 6 * iota;
    return { desc: `prism: ${pick.size} notes (one in ${unSur}) have one partial doubled ${cents} c higher, ${Math.round(dly / P.sr * 1000)} ms later (ranks ${ranks.join(', ')})`,
      apply (layers, D) {
        const out = [];
        for (const S0 of layers) {
          out.push(S0);
          const S = { ...S0, r: [...S0.r, () => ratioOf(cents)], partial: [...S0.partial], free: [...S0.free], env: [...S0.env], envNoise: [...S0.envNoise], lobeFloor: [...S0.lobeFloor], inertia: [...S0.inertia], gainDb: [...S0.gainDb], srcGain: [...S0.srcGain], pan: [...S0.pan] };
          S.delay = (S0.delay || 0) + dly; S.name = (S0.name || '') + ' prism';
          S.partial.push((h, f, d, t, F, s) => { const e = at(s); return e && pick.get(e.i) === h ? [f, d] : null; });
          S.free.push(() => null); S.envNoise.push(() => -80);
          S.gainDb.push((t, s) => lvl + gate(s));
          out.push(S);
        }
        return { layers: out, D: D + dly };
      } };
  }
};

// FUSION — un seul curseur, le DEGRÉ DE FUSION φ : à φ = 1 les voix attaquent ensemble, accordées — on entend un seul son ;
// en descendant, chacune se détache : décalage d'attaque, désaccord, inharmonicité (β). φ = 1 − 0,8·ι. Tout (v0) ; les
// attaques seules — la fusion se défait dans le rythme (v1) ; le désaccord et β seuls — elle se défait dans le timbre (v2).
// L'effectif ne change pas : être fondu ne veut pas dire être nombreux.
ECRITURES2.fusion = {
  kind: 'mult', layers: 3, profile: [0.3, 0.3, 0.7, 0.4, 0.2, 0.5, 0.0, 0.2],
  relevance: T => { const m = T.ms; return m && m.kind === 'partials' && m.strata >= 2 ? clamp(0.3 + 0.2 * m.separation, 0, 0.85) : 0; },
  make (P, ctx, iota, variant) {
    const st = ctx.ms.strata; if (st.kind !== 'partials' || st.list.length < 2) return null;
    const L = st.list.slice(0, 3), M = L.length, v = variant % 3, phi = 1 - 0.8 * iota, det = 1 - phi;
    const dl = L.map((_, j) => (v === 2 ? 0 : Math.round(det * 0.04 * P.sr * j / (M - 1))));
    const cents = L.map((_, j) => (v === 1 ? 0 : det * 15 * (2 * j / (M - 1) - 1)));
    const beta = L.map((_, j) => (v === 1 ? 0 : det * 0.002 * j / (M - 1)));
    return { desc: `fusion φ ${phi.toFixed(2)}: ${L.map((f, j) => `${f.name} ${dl[j] ? '+' + Math.round(dl[j] / P.sr * 1000) + ' ms ' : ''}${cents[j] ? (cents[j] > 0 ? '+' : '') + cents[j].toFixed(1) + ' c ' : ''}${beta[j] ? 'β ' + beta[j].toFixed(4) : ''}`.trim()).join(' · ')}`,
      apply (layers, D) {
        const out = []; let Dm = D;
        for (const S0 of layers) L.forEach((fam, j) => {
          const S = { ...S0, r: [...S0.r], partial: [...S0.partial], free: [...S0.free], env: [...S0.env], envNoise: [...S0.envNoise], lobeFloor: [...S0.lobeFloor], inertia: [...S0.inertia], gainDb: [...S0.gainDb], srcGain: [...S0.srcGain], pan: [...S0.pan] };
          isolate(S, st, j, P); S.name = (S0.name || '') + ' ' + fam.name;
          if (cents[j]) S.r.push(() => ratioOf(cents[j]));
          if (beta[j]) { const b = beta[j]; S.partial.push((h, f, d) => [f * Math.sqrt(1 + b * h * h) / Math.sqrt(1 + b), d]); }
          S.delay = (S0.delay || 0) + dl[j]; Dm = Math.max(Dm, D + dl[j]);
          out.push(S);
        });
        return { layers: out, D: Dm };
      } };
  }
};

// CANON ENTRE LES VOIX — les voix du son (familles de partiels, vraies voix ou bandes) entrent l'une après l'autre : un
// canon à l'intérieur du son. Pas : le tatum (pouls) ou la moitié de l'écart médian des attaques ; du grave à l'aigu (v0), de
// l'aigu au grave (v1), d'un temps entier (ou de trois pas) du grave à l'aigu (v2).
ECRITURES2.canonvoix = {
  kind: 'mult', layers: 3, profile: [0.1, 0.6, 0.4, 0.7, 0.5, 0.2, 0.0, 0.3],
  relevance: T => { const m = T.ms; return m && m.strata >= 2 && m.nEvents >= 3 ? clamp(0.35 + 0.2 * m.separation, 0, 0.85) : 0; },
  make (P, ctx, iota, variant) {
    const st = ctx.ms.strata, L = st.list.slice(0, 3), M = L.length; if (M < 2) return null;
    const ev = ctx.ms.events, iois = []; for (let i = 1; i < ev.length; ++i) iois.push(ev[i].s0 - ev[i - 1].s0);
    const v = variant % 3, base = (0.4 + 1.2 * iota) * (ctx.grid.has ? (v === 2 ? ctx.grid.beat : ctx.grid.tatum) : (v === 2 ? 3 : 1) * clamp(0.5 * median(iois), 0.06 * P.sr, 0.4 * P.sr));
    const order = L.map((_, j) => (v === 1 ? M - 1 - j : j));
    return { desc: `canon between the voices (${st.kind === 'partials' ? st.basis + ' families' : st.kind}), every ${Math.round(base / P.sr * 1000)} ms: ${order.map(j => L[j].name).join(' → ')}`,
      apply (layers, D) {
        const out = []; let Dm = D;
        for (const S0 of layers) L.forEach((fam, j) => {
          const S = { ...S0, r: [...S0.r], partial: [...S0.partial], free: [...S0.free], env: [...S0.env], envNoise: [...S0.envNoise], lobeFloor: [...S0.lobeFloor], inertia: [...S0.inertia], gainDb: [...S0.gainDb], srcGain: [...S0.srcGain], pan: [...S0.pan] };
          isolate(S, st, j, P); S.name = (S0.name || '') + ' ' + fam.name;
          const d = Math.round(order.indexOf(j) * base); S.delay = (S0.delay || 0) + d; Dm = Math.max(Dm, D + d);
          out.push(S);
        });
        return { layers: out, D: Dm };
      } };
  }
};

// PARALLÉLISME (#74) — une doublure à intervalle JUSTE et CONSTANT : quinte (v0), quarte (v1), octave (v2), au-dessus ;
// l'autonomie de la voix doublée n'est pas systématique — un énoncé sur trois, elle prend l'intervalle renversé, au-dessous
// (« leur boucle varie aussi un peu, c'est obligatoire »). Aucun repli à l'octave : ce que la doublure ne peut atteindre
// (fondamentale au-delà de 2,5 kHz ou sous 30 Hz), elle ne le joue pas. Dans la gamme : la quinte ou la quarte justes
// prennent le degré voisin quand il est à moins de 30 c.
ECRITURES2.parallelisme = {
  kind: 'mult', layers: 2, profile: [0.7, 0.1, 0.3, 0.1, 0.3, 0.1, 0.0, 0.2],
  relevance: T => { const m = T.ms; return m && m.nPitched >= 2 ? 0.55 * m.pitchedShare + 0.2 : 0; },
  make (P, ctx, iota, variant) {
    const ev = ctx.ms.events, at = finder(ev), W = windowsOf(P, ctx), wAt = windowFinder(W), sc = scaleOf(ctx);
    const v = variant % 3, up = [1200 * Math.log2(3 / 2), 1200 * Math.log2(4 / 3), 1200][v], dn = up - 1200;
    const lvl = -4.5 + 3 * iota;
    const centsFor = (e, w) => { const c = w % 3 === 2 ? dn : up; if (!sc || !(e && e.f0 > 0) || v === 2) return c; const tgt = e.cents + c, d = snapTo(sc, tgt); return Math.abs(d - tgt) < 30 ? d - e.cents : c; };
    const playable = (e, c) => !(e && e.f0 > 0) || (e.f0 * ratioOf(c) <= 2500 && e.f0 * ratioOf(c) >= 30);
    const name = ['perfect fifth', 'perfect fourth', 'octave'][v];
    return { desc: `parallelism: a doubling a ${name} above, inverted below one statement in three (${W.length} statements)`,
      apply (layers, D) {
        const out = [];
        for (const S0 of layers) {
          out.push(S0);
          const S = { ...S0, r: [...S0.r], partial: [...S0.partial], free: [...S0.free], env: [...S0.env], envNoise: [...S0.envNoise], lobeFloor: [...S0.lobeFloor], inertia: [...S0.inertia], gainDb: [...S0.gainDb], srcGain: [...S0.srcGain], pan: [...S0.pan] };
          S.name = (S0.name || '') + ' doubling';
          S.r.push((t, s) => { const e = at(s); return ratioOf(centsFor(e, wAt(s))); });
          S.gainDb.push((t, s) => { const e = at(s); return lvl + (playable(e, centsFor(e, wAt(s))) ? 0 : -80); });
          out.push(S);
        }
        return { layers: out, D };
      } };
  }
};

// PARTIEL FIXE — un instrument garde UN SEUL partiel pendant tout un énoncé : il joue la ligne transposée de ce partiel
// (rapport k constant) ; ce qu'il ne peut pas atteindre, il ne le joue pas (un trou). Le contour est préservé par
// construction. Les énoncés font tourner k : 3, 4, 5 (v0) ; 2, 3, 4 (v1) ; 5, 6, 7 (v2).
ECRITURES2.partielfixe = {
  kind: 'mult', layers: 2, profile: [0.8, 0.0, 0.5, 0.1, 0.4, 0.1, 0.0, 0.2],
  relevance: T => { const m = T.ms; return m && m.nPitched >= 3 ? 0.5 * m.pitchedShare + 0.2 * Math.min(1, m.nPhrases / 2) : 0; },
  make (P, ctx, iota, variant) {
    const ev = ctx.ms.events, at = finder(ev), W = windowsOf(P, ctx), wAt = windowFinder(W);
    const v = variant % 3, ks = [[3, 4, 5], [2, 3, 4], [5, 6, 7]][v], kOf = w => ks[((w % ks.length) + ks.length) % ks.length];
    const lvl = -10 + 8 * iota;
    let holes = 0; for (const e of ev) if (e.f0 > 0 && e.f0 * kOf(wAt(e.s0)) > 2500) holes++;
    if (holes >= ev.filter(e => e.f0 > 0).length) return null;
    return { desc: `fixed partial: each statement doubled by one partial held throughout (×${ks.join(', ×')}), ${holes} unreachable notes left as holes`,
      apply (layers, D) {
        const out = [];
        for (const S0 of layers) {
          out.push(S0);
          const S = { ...S0, r: [...S0.r], partial: [...S0.partial], free: [...S0.free], env: [...S0.env], envNoise: [...S0.envNoise], lobeFloor: [...S0.lobeFloor], inertia: [...S0.inertia], gainDb: [...S0.gainDb], srcGain: [...S0.srcGain], pan: [...S0.pan] };
          S.name = (S0.name || '') + ' fixed partial';
          S.r.push((t, s) => kOf(wAt(s)));
          S.gainDb.push((t, s) => { const e = at(s), k = kOf(wAt(s)); return lvl + (e && e.f0 > 0 && e.f0 * k <= 2500 ? 0 : -80); });
          out.push(S);
        }
        return { layers: out, D };
      } };
  }
};

// AVÈNEMENT (#89) — comment une voix revient après un silence : elle CONFIRME (sur une frappe du socle), elle ANNONCE (un
// ou deux pas AVANT un appui), elle SURPREND (dans un trou du socle). La voix la plus aiguë se tait sur une part de chaque
// énoncé puis revient ; les gestes tournent — aucun à 0 % — confirme / annonce / surprend (v0), annonce d'abord (v1),
// surprend d'abord (v2) ; jamais deux entrées au même endroit de la mesure ou de l'énoncé.
ECRITURES2.avenement = {
  kind: 'voice', profile: [0.1, 0.4, 0.4, 0.8, 0.6, 0.2, 0.0, 0.2],
  relevance: T => { const m = T.ms; return m && m.strata >= 2 && m.nEvents >= 4 ? 0.6 : 0; },
  make (P, ctx, iota, variant) {
    const st = ctx.ms.strata, M = st.list.length; if (M < 2) return null;
    const ev = ctx.ms.events, sr = P.sr, W = windowsOf(P, ctx); if (W.length < 2) return null;
    const attacks = ev.map(e => e.s0), loud = ev.map(e => e.loud), unit = ctx.grid.has ? ctx.grid.unit : clamp(0.25 * median(attacks.slice(1).map((x, i) => x - attacks[i])), 0.05 * sr, 0.2 * sr);
    const v = variant % 3, gestures = [['confirm', 'announce', 'surprise'], ['announce', 'surprise', 'confirm'], ['surprise', 'confirm', 'announce']][v];
    const voice = st.kind === 'bands' ? M - 1 : M - 1, used = new Set(), entries = [];
    W.forEach(([a, b], w) => {
      const g = gestures[w % 3], inA = attacks.map((x, i) => [x, i]).filter(([x]) => x > a + (0.15 + 0.35 * iota) * (b - a) && x < b - 0.05 * sr);
      let at = null;
      const strongest = inA.slice().sort((p, q) => loud[q[1]] - loud[p[1]] || p[0] - q[0]);
      if (g === 'confirm') for (const [x] of strongest) { const key = Math.round(((x - a) / unit)); if (!used.has(key)) { at = x; used.add(key); break; } }
      if (g === 'announce') for (const [x] of strongest) { for (const k of [1, 2]) { const y = x - k * unit, key = Math.round((y - a) / unit); if (y > a + 0.2 * (b - a) && !used.has(key)) { at = y; used.add(key); break; } } if (at !== null) break; }
      if (g === 'surprise') { let best = null, bl = 0; for (let q = 1; q < inA.length; ++q) { const gap = inA[q][0] - inA[q - 1][0]; if (gap > bl) { bl = gap; best = inA[q - 1][0] + gap / 2; } } if (best !== null) { const key = Math.round((best - a) / unit); if (!used.has(key)) { at = best; used.add(key); } } }
      if (at !== null) entries.push({ a, at, g });
    });
    if (!entries.length) return null;
    const R = 0.01 * sr;
    const depth = -(12 + 48 * iota);
    const g = (t, s) => { if (s === null || s === undefined) return 0; for (const E of entries) if (s >= E.a && s < E.at + R) return depth * clamp((E.at + R - s) / R, 0, 1) * clamp((s - E.a) / R + 1, 0, 1); return 0; };
    return { desc: `advent: the ${st.list[voice].name} falls silent and re-enters ${entries.length} times (${entries.map(E => E.g).join(', ')})`,
      apply (layers, D) { for (const S of layers) attenuate(S, st, voice, g, P); return { layers, D }; } };
  }
};

// BUDGET DE TEMPS DE PAROLE (#44) — aucune voix ne sonne plus d'une part du temps (35 % chez jgcompose, relevé ailleurs : ici
// 35 % (v0), 50 % (v1), 25 % (v2)) ; une voix au-dessus du plafond perd ses moments les MOINS saillants (énoncés de plus
// faible énergie) jusqu'à redescendre — l'énergie circule au lieu de s'installer.
ECRITURES2.budget = {
  kind: 'voice', profile: [0.0, 0.3, 0.5, 0.5, 0.6, 0.2, 0.0, 0.1],
  relevance: T => { const m = T.ms; return m && m.strata >= 2 && m.kind === 'partials' ? 0.45 : 0; },
  make (P, ctx, iota, variant) {
    const st = ctx.ms.strata; if (st.kind !== 'partials' || st.list.length < 2) return null;
    const ev = ctx.ms.events, hop = P.hopF, nf = P.frames.length, v = variant % 3, cap = [0.35, 0.5, 0.25][v] + 0.25 * (1 - iota);
    const off = st.list.map(fam => {
      const e = fam.env, act = ev.map(x => { let s = 0, c = 0; for (let j = Math.floor(x.s0 / hop); j < Math.min(nf, Math.ceil(x.sN / hop)); ++j) { s += e[j] > -40 ? 1 : 0; c++; } return { x, on: c ? s / c : 0, lv: (() => { let m = -120; for (let j = Math.floor(x.s0 / hop); j < Math.min(nf, Math.ceil(x.sN / hop)); ++j) m = Math.max(m, e[j]); return m; })() }; });
      const total = ev.reduce((a, x) => a + (x.sN - x.s0), 0) || 1; let speak = act.reduce((a, q) => a + q.on * (q.x.sN - q.x.s0), 0) / total;
      const gone = new Set();
      for (const q of act.slice().sort((p, r) => p.lv - r.lv || p.x.i - r.x.i)) { if (speak <= cap) break; if (q.on <= 0) continue; gone.add(q.x.i); speak -= q.on * (q.x.sN - q.x.s0) / total; }
      return gone;
    });
    const n = off.reduce((a, s) => a + s.size, 0); if (!n) return null;
    const gates = off.map(set => eventGate(ev, e => !set.has(e.i), P.sr));
    return { desc: `speaking-time budget ${Math.round(cap * 100)} %: ${st.list.map((f, i) => `${f.name} −${off[i].size}`).join(', ')} events`,
      apply (layers, D) { for (const S of layers) st.list.forEach((_, i) => attenuate(S, st, i, (t, s) => gates[i](s), P)); return { layers, D }; } };
  }
};

// ============================================================================================= LIGNE
// ARCHE INVERSÉE (#68) — une enveloppe de FORME dont le sommet est un CREUX : maxima aux deux bouts, minimum au centre.
// Le registre descend vers le milieu, chaque note sur un degré de la gamme (v0) ; registre et nuance creusent ensemble (v1) ;
// l'arche normale, pour comparaison — le registre monte vers le milieu (v2).
ECRITURES2.arche = {
  kind: 'melody', profile: [0.9, 0.1, 0.1, 0.1, 0.8, 0.1, 0.0, 0.0],
  relevance: T => { const m = T.ms; return m && m.nPitched >= 4 ? 0.55 * m.pitchedShare + 0.2 : 0; },
  make (P, ctx, iota, variant) {
    const ev = ctx.ms.events, at = finder(ev), pe = ev.filter(e => e.f0 > 0), sc = scaleOf(ctx); if (pe.length < 4) return null;
    const a0 = ev[0].s0, a1 = ev[ev.length - 1].sN, v = variant % 3, depth = 200 + 1000 * iota, sign = v === 2 ? 1 : -1;
    const ratio = new Map(), dyn = new Map();
    for (const e of pe) { const u = ((e.s0 + e.sN) / 2 - a0) / (a1 - a0), d = sign * depth * Math.sin(Math.PI * clamp(u, 0, 1)); const tgt = snapTo(sc, e.cents + d) + 0.5 * (e.lifeDev || 0); ratio.set(e.i, safeRatio(e.f0, tgt - e.cents)); }
    if (v === 1) for (const e of ev) { const u = ((e.s0 + e.sN) / 2 - a0) / (a1 - a0); dyn.set(e.i, -(6 + 12 * iota) * Math.sin(Math.PI * clamp(u, 0, 1))); }
    const name = ['inverted arch: the register sinks towards the middle', 'inverted arch: register and dynamics hollow out together', 'normal arch: the register rises towards the middle'][v];
    return { desc: `${name} (${Math.round(depth)} c, ${pe.length} notes on the scale)`,
      apply (layers, D) { for (const S of layers) { S.r.push((t, s) => { const e = at(s); return (e && ratio.get(e.i)) || 1; }); if (dyn.size) S.gainDb.push((t, s) => { const e = at(s); return (e && dyn.get(e.i)) || 0; }); } return { layers, D }; } };
  }
};

// FRANCHISSEMENT DE SEUIL (#64) — un paramètre s'accumule SOUS le seuil, activement empêché de le passer, puis le franchit
// EN UN SEUL ÉVÉNEMENT et tout change d'état : avant, toute note plus haute que le seuil (la hauteur médiane) est repliée
// sous lui, d'octave en octave ; à l'événement de franchissement (le plus fort de la seconde moitié), tout passe au-dessus et
// y reste (v0) ; seuil au deuxième tiers (v1) ; franchissement vers le bas (v2). Un seul franchissement, jamais deux.
ECRITURES2.franchissement = {
  kind: 'melody', profile: [0.8, 0.2, 0.0, 0.2, 0.9, 0.0, 0.0, 0.0],
  relevance: T => { const m = T.ms; return m && m.nPitched >= 5 && m.rangeCents >= 200 ? 0.6 * m.pitchedShare + 0.1 : 0; },
  make (P, ctx, iota, variant) {
    const ev = ctx.ms.events, at = finder(ev), pe = ev.filter(e => e.f0 > 0); if (pe.length < 5) return null;
    const v = variant % 3, cs = pe.map(e => e.cents), th = v === 1 ? quantile(cs, 0.85 - 0.3 * iota) : v === 2 ? quantile(cs, 0.35 + 0.3 * iota) : quantile(cs, 0.65 - 0.3 * iota);
    const half = pe.slice(Math.floor(pe.length / 2)); let cross = half[0]; for (const e of half) if (e.loud > cross.loud) cross = e;
    const ratio = new Map(); let folded = 0;
    for (const e of pe) {
      const before = e.s0 < cross.s0, up = v !== 2; let c = e.cents;
      if (before === up) { while (c > th) c -= 1200; } else { while (c < th) c += 1200; }
      if (c !== e.cents) { folded++; ratio.set(e.i, safeRatio(e.f0, c - e.cents)); }
    }
    if (!folded) return null;
    return { desc: `threshold crossing ${v === 2 ? 'downwards' : 'upwards'} at ${(cross.s0 / P.sr).toFixed(2)} s: ${folded} notes kept ${v === 2 ? 'above' : 'below'} the threshold, then ${v === 2 ? 'below' : 'above'} it`,
      apply (layers, D) { for (const S of layers) S.r.push((t, s) => { const e = at(s); return (e && ratio.get(e.i)) || 1; }); return { layers, D }; } };
  }
};

// PERMUTATION SPECTRALE (#14) — la ligne ré-entendue par son propre spectre : dans chaque énoncé, les hauteurs des notes sont
// redistribuées selon leur RANG SPECTRAL (0,6 × harmonicité — registre et consonance de l'intervalle à la tonique — + 0,4
// × degré) : la phrase gravit le spectre de la tonique vers le plus dissonant (v0), le descend (v1), ou chaque note prend la
// hauteur de rang suivant (v2). Les attaques et les durées ne bougent pas.
ECRITURES2.permutation = {
  kind: 'melody', profile: [1.0, 0.0, 0.1, 0.0, 0.5, 0.0, 0.0, 0.0],
  relevance: T => { const m = T.ms; return m && m.nPitched >= 4 && m.rangeCents >= 150 ? 0.6 * m.pitchedShare : 0; },
  make (P, ctx, iota, variant) {
    const ev = ctx.ms.events, at = finder(ev), W = windowsOf(P, ctx), sc = scaleOf(ctx);
    const IC = { 0: 0, 7: 1, 5: 1.4, 4: 2, 9: 2.3, 3: 3, 8: 3.2, 2: 4, 10: 4.2, 1: 5, 11: 5.2, 6: 6 };
    const root = P.fundamentalCents ?? median(ev.filter(e => e.f0 > 0).map(e => e.cents));
    const v = variant % 3, ratio = new Map(); let moved = 0;
    for (const [a, b] of W) {
      const notes = ev.filter(e => e.f0 > 0 && e.s0 >= a && e.s0 < b); if (notes.length < 3) continue;
      const cs = notes.map(e => e.cents), lo = Math.min(...cs), hi = Math.max(...cs);
      const rank = c => { const ic = ((Math.round((c - root) / 100) % 12) + 12) % 12, h = ((c - lo) / Math.max(1, hi - lo) + IC[ic] / 6) / 2, dg = sc ? degIndex(sc, c) / sc.length : (c - lo) / Math.max(1, hi - lo); return 0.6 * h + 0.4 * dg; };
      const byRank = cs.map((c, i) => [rank(c), c, i]).sort((x, y) => x[0] - y[0] || x[2] - y[2]).map(x => x[1]);
      const tgt = v === 0 ? byRank : v === 1 ? byRank.slice().reverse() : notes.map((_, i) => byRank[(byRank.indexOf(cs[i]) + 1) % byRank.length]);
      const alpha = 0.4 + 0.6 * iota;
      notes.forEach((e, i) => {
        let c = tgt[i] + 0.5 * (e.lifeDev || 0) - 0.5 * (notes.find(x => x.cents === tgt[i])?.lifeDev || 0);
        if (sc && alpha < 1) { const d0 = degIndex(sc, e.cents), d1 = degIndex(sc, tgt[i]), d = Math.round(d0 + alpha * (d1 - d0)); c = sc[clamp(d, 0, sc.length - 1)] + 0.5 * (e.lifeDev || 0); }
        if (Math.abs(c - e.cents) > 5) { ratio.set(e.i, safeRatio(e.f0, c - e.cents)); moved++; }
      });
    }
    if (!moved) return null;
    return { desc: `spectral permutation: ${moved} notes take the pitch of their spectral rank (${['climbing the spectrum', 'descending the spectrum', 'each takes the next rank'][v]})`,
      apply (layers, D) { for (const S of layers) S.r.push((t, s) => { const e = at(s); return (e && ratio.get(e.i)) || 1; }); return { layers, D }; } };
  }
};

// INTERPOLATION A→B (#16) — fondu-enchaîné de CONTOURS : la ligne se métamorphose peu à peu en la forme d'un autre énoncé
// ATTESTÉ, le dernier (B). Note à note, alignée par PHASE dans son énoncé, la hauteur (en degrés) dérive de la sienne vers
// celle de B au même endroit — les énoncés convergent. Trajet linéaire (v0), lent puis rapide (v1, γ 3), rapide puis lent
// (v2, γ 1/3). Hauteur seule, en place.
ECRITURES2.interpolation = {
  kind: 'melody', profile: [0.9, 0.0, 0.1, 0.0, 0.9, 0.1, 0.0, 0.0],
  relevance: T => { const m = T.ms; return m && m.nPitched >= 6 && m.nPhrases >= 2 ? 0.65 * m.pitchedShare : 0; },
  make (P, ctx, iota, variant) {
    const M = ctx.ms, ev = M.events, at = finder(ev), sc = scaleOf(ctx) || Array.from({ length: 120 }, (_, i) => 100 * i);
    const W = windowsOf(P, ctx); if (W.length < 2) return null;
    const [ba, bb] = W[W.length - 1], B = ev.filter(e => e.f0 > 0 && e.s0 >= ba && e.s0 < bb); if (B.length < 2) return null;
    const bDeg = u => { const k = clamp(Math.round(u * (B.length - 1)), 0, B.length - 1); return degIndex(sc, B[k].cents); };
    const v = variant % 3, gam = [1, 3, 1 / 3][v], a0 = W[0][0], aB = ba, ratio = new Map(); let moved = 0;
    for (let w = 0; w < W.length - 1; ++w) {
      const [a, b] = W[w], notes = ev.filter(e => e.f0 > 0 && e.s0 >= a && e.s0 < b);
      notes.forEach((e, i) => {
        const prog = Math.pow(clamp((e.s0 - a0) / Math.max(1, aB - a0), 0, 1), gam) * (0.5 + 0.5 * iota);
        const d0 = degIndex(sc, e.cents), d1 = bDeg(notes.length > 1 ? i / (notes.length - 1) : 0), d = Math.round(d0 + prog * (d1 - d0));
        if (d !== d0) { ratio.set(e.i, safeRatio(e.f0, sc[clamp(d, 0, sc.length - 1)] + 0.5 * (e.lifeDev || 0) - e.cents)); moved++; }
      });
    }
    if (!moved) return null;
    return { desc: `interpolation A→B: the line drifts towards the contour of its last statement (${moved} notes, ${['linear', 'slow then fast', 'fast then slow'][v]})`,
      apply (layers, D) { for (const S of layers) S.r.push((t, s) => { const e = at(s); return (e && ratio.get(e.i)) || 1; }); return { layers, D }; } };
  }
};

// ============================================================================================ TEMPS
// lit la source [s0, s1) dans une durée de sortie L : à vitesse 1 si L ≤ s1 − s0 (la fin est coupée), sinon la fin de
// l'événement (à partir de h) est TENUE — relue ralentie — jusqu'à remplir L (la note d'avant s'étend sur le temps gagné)
function holdSegs (segs, t, s0, s1, L, h) {
  const len = s1 - s0; if (L <= 0) return t;
  if (L <= len) { segs.push({ a: t, b: t + L, sa: s0, sb: s0 + L }); return t + L; }
  const hh = clamp(h ?? (s0 + 0.5 * len), s0, s1 - 1);
  if (hh > s0) segs.push({ a: t, b: t + (hh - s0), sa: s0, sb: hh });
  segs.push({ a: t + (hh - s0), b: t + L, sa: hh, sb: s1 });
  return t + L;
}
// registre de chaque voix de la partition (Hz) : rang moyen × f0 (familles), coupures (bandes), f0 de chaque voix (voix)
function registersOf (st, P) {
  if (st.kind === 'partials') return st.list.map(f => (f.ranks.reduce((a, b) => a + b, 0) / f.ranks.length) * (P.f0med || 200));
  if (st.kind === 'bands') { const [lo, hi] = st.cuts; return [lo / 2, Math.sqrt(lo * hi), 2 * hi]; }
  return [P.f0med || 200, 2 * (P.f0med || 200)];
}
const midiOf = hz => 69 + 12 * Math.log2(Math.max(1, hz) / 440);
// l'événement le plus proche d'une fraction de la zone active (jamais le premier ni le dernier)
function eventNear (ev, frac0) { const n = ev.length, A0 = ev[0].s0, A1 = ev[n - 1].sN, x = A0 + frac0 * (A1 - A0); let bi = 1, bd = Infinity; for (let q = 1; q < n - 1; ++q) { const d = Math.abs(ev[q].s0 - x); if (d < bd) { bd = d; bi = q; } } return bi; }
const cloneOf = S0 => ({ ...S0, r: [...S0.r], sb: [...(S0.sb || [])], partial: [...S0.partial], free: [...S0.free], env: [...S0.env], envNoise: [...S0.envNoise], lobeFloor: [...S0.lobeFloor], inertia: [...S0.inertia], gainDb: [...S0.gainDb], srcGain: [...S0.srcGain], pan: [...S0.pan] });

// CONTRAMÉTRICITÉ (#73) — antagonisme entre les ATTAQUES et la PULSATION : la pulsation reste isochrone et INTACTE, ce sont
// les attaques qui refusent de tomber dessus — elles restent sur la subdivision (on ne sort pas de la grille, on évite le
// temps). Une part (0,4 + 0,4·ι) des attaques posées sur un temps est déplacée, choisie par PAS PREMIER avec leur nombre
// (aucun tirage) : d'une subdivision plus tard (v0, syncope), plus tôt (v1, anticipation), ou selon jgcompose — une sur
// deux une subdivision plus tard, l'autre juste avant le temps suivant (v2). La note d'avant s'étend sur le temps gagné
// (sa fin tenue), ou se coupe (anticipation) ; la note déplacée perd (ou gagne) autant à sa fin : rien d'autre ne bouge.
ECRITURES2.contrametricite = {
  kind: 'map', profile: [0.0, 0.4, 0.0, 1.0, 0.3, 0.0, 0.0, 0.0],
  relevance: T => { const m = T.ms; return m && T.tempoBpm > 0 && m.nEvents >= 4 ? 0.7 : 0; },
  make (P, ctx, iota, variant, H) {
    const g = ctx.grid; if (!g.has) return null;
    const ev = ctx.ms.events, n = ev.length, sr = P.sr; if (n < 4) return null;
    const B = g.beat, U = g.unit, sub = Math.max(2, Math.round(B / U)), tol = 0.25 * U, MIN = 0.03 * sr;
    const onBeat = i => { const r = (((ev[i].s0 - g.phase) % B) + B) % B; return Math.min(r, B - r) < tol; };
    const cand = []; for (let i = 0; i < n; ++i) if (onBeat(i)) cand.push(i);
    if (cand.length < 2) return null;
    const nDep = Math.max(1, Math.round(cand.length * (0.4 + 0.4 * iota)));
    let pas = 3; while (gcd(pas, cand.length) !== 1) pas++;
    const pris = new Set(); for (let k = 0; k < nDep; ++k) { let j = (k * pas) % cand.length; while (pris.has(j)) j = (j + 1) % cand.length; pris.add(j); }
    const v = variant % 3, delta = new Float64Array(n + 1), endOf = i => (i + 1 < n ? ev[i + 1].s0 : ev[i].sN);
    let moved = 0;
    for (const j of [...pris].sort((a, b) => a - b)) {
      const i = cand[j], d = v === 0 ? U : v === 1 ? -U : (j % 2 === 0 ? U : (sub - 1) * U);
      const lenThis = endOf(i) - ev[i].s0 + delta[i + 1] - (delta[i] + d), lenPrev = i > 0 ? (ev[i].s0 + delta[i] + d) - (ev[i - 1].s0 + delta[i - 1]) : ev[i].s0 + d;
      if (lenThis < MIN || lenPrev < MIN) continue;
      delta[i] += d; moved++;
    }
    if (!moved) return null;
    const segs = []; let t = 0;
    t = holdSegs(segs, t, 0, ev[0].s0, ev[0].s0 + delta[0]);
    for (let i = 0; i < n; ++i) { const s0 = ev[i].s0, s1 = endOf(i), L = (s1 + delta[i + 1]) - (s0 + delta[i]); t = holdSegs(segs, t, s0, s1, L); }
    const last = ev[n - 1].sN; if (last < P.n) { segs.push({ a: t, b: t + (P.n - last), sa: last, sb: P.n }); t += P.n - last; }
    const map = new H.TimeMap(segs), how = ['a subdivision later', 'a subdivision early', 'late or just before the next beat'][v];
    return { desc: `contrametricity: ${moved} of the ${cand.length} attacks on the beat moved off it (${how}), the pulse untouched`,
      apply (layers, D) { for (const S of layers) S.map = map; return { layers, D: Math.ceil(t) }; } };
  }
};

// SILENCE (#39) — à la section d'or de la forme (l'événement le plus proche), une fenêtre de 1 à 3 événements :
// TROU — rien ne la traverse, coupe NETTE au bord (3 ms), le son reprend à l'événement suivant comme si le temps avait passé
// (v0) ; FENÊTRE — tout se tait sauf la voix qui TIENT le plus (famille de partiels, voix ou bande la plus tenue) (v1) ;
// SUSPENSION — rien ne la traverse, mais la résonance de la note d'avant reste suspendue : ses partiels 1 à 6, 8, 9, 11, 13
// seuls, et DEUX d'entre eux dérivent (rang 3 : +12 c, rang 6 : −9 c) — la suspension BAT et ne se résout pas (v2).
ECRITURES2.silence = {
  kind: 'map', profile: [0.0, 0.5, 0.2, 0.6, 0.9, 0.1, 0.0, 0.0],
  relevance: T => { const m = T.ms; return m && m.nEvents >= 4 ? 0.65 : 0; },
  make (P, ctx, iota, variant, H) {
    const ev = ctx.ms.events, n = ev.length, sr = P.sr; if (n < 4) return null;
    const i = eventNear(ev, 0.618), k = 1 + Math.round(2 * iota), j = Math.min(n - 1, i + k);
    const a = ev[i].s0, b = j > i ? ev[j].s0 : ev[i].sN, R = Math.round(0.003 * sr), v = variant % 3;
    if (b - a < 0.06 * sr) return null;
    const inWin = s => (s === null || s === undefined ? 0 : s <= a - R || s >= b + R ? 0 : clamp(Math.min(s - (a - R), b + R - s) / (2 * R), 0, 1));
    if (v === 0) return { desc: `silence — a hole: ${j - i} event${j - i > 1 ? 's' : ''} (${((b - a) / sr).toFixed(2)} s) cut clean at the golden section`,
      apply (layers, D) { for (const S of layers) S.gainDb.push((t, s) => -80 * inWin(s)); return { layers, D }; } };
    if (v === 1) {
      const st = ctx.ms.strata, M = st.list.length; if (M < 2) return null;
      // le fil qui passe : la voix la plus TENUE parmi celles qui ne dominent pas (si la voix dominante passait, la fenêtre
      // serait inaudible : mesuré, −1 à −3 dB seulement sur une boucle de percussions dont les partiels graves portent tout)
      const loudest = st.kind === 'partials' ? st.list.reduce((bi, f, q) => (f.behaviour.level > st.list[bi].behaviour.level ? q : bi), 0) : 0;
      const hold = st.kind === 'partials' ? st.list.reduce((bi, f, q) => (q === loudest ? bi : bi < 0 || f.behaviour.decay > st.list[bi].behaviour.decay ? q : bi), -1) : M - 1;
      return { desc: `silence — a window: for ${((b - a) / sr).toFixed(2)} s everything stops but ${st.list[hold].name}, which holds`,
        apply (layers, D) { for (const S of layers) for (let q = 0; q < M; ++q) if (q !== hold) attenuate(S, st, q, (t, s) => -(20 + 40 * iota) * inWin(s), P); return { layers, D }; } };
    }
    // suspension : la fenêtre relit la tenue de la note d'avant (ses 150 dernières ms avant de s'éteindre), étirée
    const e = ev[i - 1], z1 = Math.min(e.s1, e.sN), z0 = Math.max(e.s0 + 0.03 * sr, z1 - 0.15 * sr);
    const segs = [{ a: 0, b: a, sa: 0, sb: a }, { a, b, sa: z1 - z0 >= 0.03 * sr ? z0 : e.s0, sb: z1 - z0 >= 0.03 * sr ? z1 : e.sN }, { a: b, b: P.n, sa: b, sb: P.n }];
    const map = new H.TimeMap(segs), KEEP = new Set([1, 2, 3, 4, 5, 6, 8, 9, 11, 13]);
    return { desc: `silence — a suspension: for ${((b - a) / sr).toFixed(2)} s the resonance of the note before hangs, partials 3 and 6 drifting (+12 c, −9 c)`,
      apply (layers, D) {
        for (const S of layers) {
          S.map = map;
          S.partial.push((h, f, d, t) => { if (t < a || t >= b) return [f, d]; if (!KEEP.has(h)) return [f, d - 40]; const u = (t - a) / (b - a); return h === 3 ? [f * ratioOf(12 * u), d] : h === 6 ? [f * ratioOf(-9 * u), d] : [f, d]; });
        }
        return { layers, D };
      } };
  }
};

// FENÊTRE QUI LAISSE PASSER LE REFRAIN (#60) — pas un simple silence : une fenêtre AJOURÉE. Le flot (toutes les voix sauf
// une) se tait d'un coup, en plein débit, et reprend EXACTEMENT où il s'était arrêté — il n'est pas coupé, il est DÉPLACÉ
// (rien n'est perdu) ; la voix qui tient le plus (le refrain, l'ancre) passe à travers et continue son chemin : après la
// fenêtre, elle et le flot sont décalés d'autant. Fenêtre à la section d'or (v0), au tiers (v1), au milieu (v2) ; longueur :
// 1 à 3 temps (ou 2 à 4 écarts médians d'attaques).
ECRITURES2.refrain = {
  kind: 'multmap', layers: 2, profile: [0.0, 0.7, 0.4, 0.5, 0.9, 0.0, 0.0, 0.1],
  relevance: T => { const m = T.ms; return m && m.strata >= 2 && m.nEvents >= 4 ? 0.6 : 0; },
  make (P, ctx, iota, variant, H) {
    const ev = ctx.ms.events, n = ev.length, sr = P.sr, st = ctx.ms.strata, M = st.list.length; if (n < 4 || M < 2) return null;
    const v = variant % 3, i = eventNear(ev, [0.618, 0.382, 0.5][v]), a = ev[i].s0;
    const iois = []; for (let q = 1; q < n; ++q) iois.push(ev[q].s0 - ev[q - 1].s0);
    const W = Math.round(clamp(ctx.grid.has ? ctx.grid.beat * (1 + Math.round(2 * iota)) : median(iois) * (2 + 2 * iota), 0.15 * sr, 0.3 * (ev[n - 1].sN - ev[0].s0)));
    const hold = st.kind === 'partials' ? st.list.reduce((bi, f, q) => (f.behaviour.decay > st.list[bi].behaviour.decay ? q : bi), 0) : st.kind === 'bands' ? 0 : 0;
    const flow = new H.TimeMap([{ a: 0, b: a, sa: 0, sb: a }, { a: a + W, b: P.n + W, sa: a, sb: P.n }]), ident = H.TimeMap.identity(P.n);
    return { desc: `window letting the refrain through: at ${(a / sr).toFixed(2)} s the flow stops for ${(W / sr).toFixed(2)} s and resumes exactly where it was; ${st.list[hold].name} passes through`,
      apply (layers, D) {
        const out = [];
        for (const S0 of layers) {
          const F = cloneOf(S0); F.map = flow; F.name = (S0.name || '') + ' flow'; attenuate(F, st, hold, () => -60, P); out.push(F);
          const R = cloneOf(S0); R.map = ident; R.name = (S0.name || '') + ' refrain'; isolate(R, st, hold, P); out.push(R);
        }
        return { layers: out, D: D + W };
      } };
  }
};

// RÉGIME PAR REGISTRE (#42) — le taux d'attaque dépend du registre (loi de jgcompose : sous MIDI 40, 2 attaques par
// pulsation ; 52 : 1,6 ; 64 : 1 ; 76 : 0,85 ; 88 : 0,45 ; au-dessus : 0,35) : LE GRAVE REBAT, L'AIGU TIENT. Chaque voix du
// son devient une strate qui suit la loi de son registre : une tenue grave plus longue que 1,6 pas est refrappée à son taux
// (son attaque relue, 80 % du pas, les reprises à −4 dB) ; dans l'aigu, deux attaques de même hauteur plus proches que
// 0,7 pas fusionnent en une tenue (la première s'étend sur la seconde). Tout (v0), le grave seul (v1), l'aigu seul (v2).
// La loi a été relevée sur une autre musique : la description le dit.
ECRITURES2.regime = {
  kind: 'multmap', layers: 3, profile: [0.1, 0.6, 0.3, 0.9, 0.4, 0.1, 0.0, 0.0],
  // pertinence : l'écart de registre entre les voix (la loi n'a de sens que si elles sont loin) et la part de tenues longues
  relevance: T => { const m = T.ms; return m && m.strata >= 2 && m.nEvents >= 3 ? clamp(0.3 + 0.25 * Math.min(1, (m.spreadOct || 0) / 2.5) + 0.35 * (m.longShare || 0), 0, 0.9) : 0; },
  make (P, ctx, iota, variant, H) {
    const ev = ctx.ms.events, n = ev.length, sr = P.sr, st = ctx.ms.strata, L = st.list.slice(0, 3), M = L.length; if (n < 3 || M < 2) return null;
    const LAW = [[40, 2.0], [52, 1.6], [64, 1.0], [76, 0.85], [88, 0.45], [128, 0.35]];
    const rateOf = hz => { const m = midiOf(hz); return (LAW.find(([hi]) => m < hi) || LAW[5])[1]; };
    const reg = registersOf(st, P).slice(0, M), Pp = ctx.grid.beat, v = variant % 3;
    const endOf = q => (q + 1 < n ? ev[q + 1].s0 : ev[q].sN);
    let added = 0, fused = 0;
    const plans = reg.map(hz => {
      // dosage : la loi appliquée plus ou moins fort (taux^(0,3 + 0,7·ι) : à faible dose, le grave rebat moins vite et l'aigu
      // tient moins longtemps)
      const rate = rateOf(hz), pas = Pp / Math.pow(rate, 0.3 + 0.7 * iota), segs = [], strikes = [];
      let t = 0;
      if (ev[0].s0 > 0) { segs.push({ a: 0, b: ev[0].s0, sa: 0, sb: ev[0].s0 }); t = ev[0].s0; }
      for (let q = 0; q < n; ++q) {
        const s0 = ev[q].s0, s1 = endOf(q), dur = s1 - s0;
        if (rate >= 1 && v !== 2 && dur > (1.2 + 1.6 * (1 - iota)) * pas) {
          // LE GRAVE REBAT : k frappes au pas du registre, chacune relit l'attaque ; la dernière va jusqu'au bout
          const k = Math.floor(dur / pas);
          for (let z = 0; z < k; ++z) {
            const a = s0 + z * pas;
            if (z < k - 1) { segs.push({ a, b: a + 0.8 * pas, sa: s0, sb: s0 + 0.8 * pas }); if (z) { strikes.push([a, a + pas]); added++; } }
            else { const rest = s1 - a; segs.push({ a, b: a + rest, sa: s0, sb: s0 + rest }); if (z) { strikes.push([a, s1]); added++; } }
          }
          t = s1; continue;
        }
        const same = (ev[q].f0 > 0 && q + 1 < n && ev[q + 1].f0 > 0 && Math.abs(ev[q + 1].cents - ev[q].cents) < 50) || (q + 1 < n && !(ev[q].f0 > 0) && !(ev[q + 1].f0 > 0));
        if (rate < 0.6 && v !== 1 && q + 1 < n && same && ev[q + 1].s0 - s0 < (0.4 + 0.5 * iota) * pas) {
          // L'AIGU TIENT : la seconde attaque disparaît, la première s'étend sur elle (fin tenue)
          const s2 = endOf(q + 1); t = holdSegs(segs, s0, s0, s1, s2 - s0); fused++; q++; continue;
        }
        segs.push({ a: s0, b: s1, sa: s0, sb: s1 }); t = s1;
      }
      const last = ev[n - 1].sN; if (last < P.n) segs.push({ a: last, b: P.n, sa: last, sb: P.n });
      return { rate, map: new H.TimeMap(segs), strikes };
    });
    if (!added && !fused) return null;
    return { desc: `register regime (law measured on another piece): ${L.map((f, i) => `${f.name} ${plans[i].rate} attacks/pulse`).join(', ')} — ${added} re-strikes in the low, ${fused} fusions in the high`,
      apply (layers, D) {
        const out = [];
        for (const S0 of layers) L.forEach((fam, i) => {
          const S = cloneOf(S0); S.map = plans[i].map; S.name = (S0.name || '') + ' ' + fam.name; isolate(S, st, i, P);
          const sk = plans[i].strikes; if (sk.length) S.gainDb.push(t => (sk.some(([x, y]) => t >= x && t < y) ? -4.2 : 0));
          out.push(S);
        });
        return { layers: out, D };
      } };
  }
};

// ============================================================================================ ESPACE
// BASCULE DE REGISTRE (#43) — la forme n'est pas un crescendo, c'est une INVERSION DE REGISTRE : on prépare longtemps EN
// HAUT, sans grave du tout, puis le grave entre d'un coup et l'aigu se retire (v0) ; le contraire — l'aigu entre (v1) ; la
// bascule avec une MARGE : ce qui devrait se taire passe encore, à −12 dB (v2). Bascule à l'attaque la plus proche de la
// section d'or ; le grave et l'aigu sont les voix extrêmes du son (familles de partiels, voix ou bandes), passage en 20 ms.
ECRITURES2.bascule = {
  kind: 'voice', profile: [0.4, 0.2, 0.6, 0.2, 0.9, 0.0, 0.0, 0.3],
  relevance: T => { const m = T.ms; return m && m.strata >= 2 && m.nEvents >= 3 ? 0.55 : 0; },
  make (P, ctx, iota, variant) {
    const ev = ctx.ms.events, n = ev.length, sr = P.sr, st = ctx.ms.strata, M = st.list.length; if (n < 3 || M < 2) return null;
    const reg = registersOf(st, P).slice(0, M), lo = reg.indexOf(Math.min(...reg)), hi = reg.indexOf(Math.max(...reg)); if (lo === hi) return null;
    const v = variant % 3, tB = ev[eventNear(ev, 0.618)].s0, R = 0.01 * sr, depth = v === 2 ? -(6 + 12 * iota) : -(12 + 48 * iota);
    const after = s => (s === null || s === undefined ? 0 : clamp((s - (tB - R)) / (2 * R), 0, 1));
    const [first, second] = v === 1 ? [hi, lo] : [lo, hi];
    return { desc: `register switch at ${(tB / sr).toFixed(2)} s: ${st.list[first].name} absent before, ${st.list[second].name} withdrawn after${v === 2 ? ' (with a margin: ${Math.round(-depth)} dB only)' : ''}`,
      apply (layers, D) {
        for (const S of layers) { attenuate(S, st, first, (t, s) => depth * (1 - after(s)), P); attenuate(S, st, second, (t, s) => depth * after(s), P); }
        return { layers, D };
      } };
  }
};

// ÉCHO (#27) — K échos (2 à 4 avec le dosage) ; chacun garde les événements les plus SAILLANTS (durée × force : de moins en
// moins à chaque écho, jamais moins de 12 %) et s'éteint d'écho en écho (×0,65). Délai : un quart de l'étendue du son (au
// pouls : un nombre entier de temps). Même hauteur (v0) ; chaque écho monte d'un degré de la gamme (v1), descend d'un
// degré (v2) — dans la gamme, aucune hauteur étrangère.
ECRITURES2.echo = {
  kind: 'mult', layers: 5, profile: [0.2, 0.6, 0.1, 0.4, 0.7, 0.0, 0.0, 0.6],
  // pertinence : la place que les événements laissent après leur extinction (un écho a besoin d'air)
  relevance: T => { const m = T.ms; return m && m.nEvents >= 2 ? clamp(0.35 + 0.6 * (m.tailShare || 0), 0, 0.9) : 0; },
  make (P, ctx, iota, variant) {
    const ev = ctx.ms.events, n = ev.length, sr = P.sr; if (n < 2) return null;
    const K = 2 + Math.round(2 * iota), span = ev[n - 1].sN - ev[0].s0, v = variant % 3, sc = scaleOf(ctx);
    let dly = 0.25 * span; if (ctx.grid.has) dly = Math.max(1, Math.round(dly / ctx.grid.beat)) * ctx.grid.beat; dly = Math.round(Math.max(0.08 * sr, dly));
    const sal = ev.map(e => (e.sN - e.s0) * Math.pow(10, e.loud / 20)), rank = ev.map((_, i) => i).sort((x, y) => sal[y] - sal[x]);
    const at = finder(ev), step = v === 1 ? 1 : v === 2 ? -1 : 0;
    const ratioFor = (e, k) => { if (!step || !sc || !(e && e.f0 > 0)) return 1; const i0 = degIndex(sc, e.cents), i1 = clamp(i0 + step * k, 0, sc.length - 1); return safeRatio(e.f0, sc[i1] - e.cents); };
    return { desc: `echo: ${K} echoes ${(dly / sr).toFixed(2)} s apart, each keeping fewer of the most salient events${step ? `, ${step > 0 ? 'climbing' : 'falling'} one degree per echo` : ''}`,
      apply (layers, D) {
        const out = [];
        for (const S0 of layers) {
          out.push(S0);
          for (let k = 1; k <= K; ++k) {
            const keep = new Set(rank.slice(0, Math.max(1, Math.round(n * Math.max(0.12, 1 - 0.85 * k / K))))), gate = eventGate(ev, e => keep.has(e.i), sr);
            const S = cloneOf(S0); S.delay = (S0.delay || 0) + k * dly; S.name = (S0.name || '') + ' echo ' + k;
            S.gainDb.push((t, s) => 20 * Math.log10(Math.pow(0.65, k)) + gate(s));
            if (step) S.r.push((t, s) => ratioFor(at(s), k));
            out.push(S);
          }
        }
        return { layers: out, D: D + K * dly };
      } };
  }
};

// PÉDALE (#21) — la basse devient une PÉDALE sur la FONDAMENTALE attestée : sous le son, une strate relit chacune de ses notes
// TIRÉE vers la fondamentale (en degrés de la gamme) et LIÉE jusqu'à l'attaque suivante (la tenue remplace la chute). Pédale
// pleine sur la fondamentale (v0), à l'octave grave (v1), à mi-chemin — la ligne garde une partie de son dessin (v2,
// dosage 0,5 à 0,8). Les attaques restent où elles sont ; les notes sans hauteur ne sont pas reprises.
ECRITURES2.pedale = {
  kind: 'mult', layers: 2, profile: [0.7, 0.2, 0.3, 0.1, 0.5, 0.2, 0.0, 0.1],
  // pertinence : une ligne qui bouge (la pédale n'a de sens que sous un mouvement)
  relevance: T => { const m = T.ms; return m && m.nPitched >= 3 && m.pitchedShare >= 0.5 && m.rangeCents >= 100 ? clamp(0.35 + 0.5 * (m.movingShare || 0), 0, 0.85) : 0; },
  make (P, ctx, iota, variant, H) {
    const ev = ctx.ms.events, n = ev.length, sr = P.sr, sc = scaleOf(ctx), fund = P.fundamentalCents;
    if (ev.filter(e => e.f0 > 0).length < 3 || fund === null || fund === undefined) return null;
    const v = variant % 3, amt = v === 2 ? 0.5 + 0.3 * iota : 1, oct = v === 1 ? -1200 : 0, leg = 0.4 + 0.6 * iota, lvl = -14 + 10 * iota;
    const endOf = q => (q + 1 < n ? ev[q + 1].s0 : ev[q].sN);
    const segs = []; let t = 0;
    if (ev[0].s0 > 0) { segs.push({ a: 0, b: ev[0].s0, sa: 0, sb: ev[0].s0 }); t = ev[0].s0; }
    for (let q = 0; q < n; ++q) {
      const e = ev[q], s0 = e.s0, s2 = endOf(q), s1 = Math.min(e.s1, s2);
      if (s2 - s1 < 0.02 * sr || s1 - s0 < 0.04 * sr) { segs.push({ a: s0, b: s2, sa: s0, sb: s2 }); continue; }
      // LEGATO : la note joue jusqu'à sa chute, puis sa tenue (ses 120 dernières ms avant la chute) s'étend sur la part
      // amt de l'espace qui la sépare de l'attaque suivante ; le reste relit la vraie chute
      const h = Math.max(s0 + 0.02 * sr, s1 - 0.12 * sr), gap = s2 - s1, Lh = leg * gap;
      holdSegs(segs, s0, s0, s1, (s1 - s0) + Lh, h);
      if (gap - Lh > 1) segs.push({ a: s1 + Lh, b: s2, sa: s1, sb: s1 + (gap - Lh) });
    }
    const last = ev[n - 1].sN; if (last < P.n) segs.push({ a: last, b: P.n, sa: last, sb: P.n });
    const map = new H.TimeMap(segs), at = finder(ev);
    const target = e => { if (!sc) return fund + oct; const i0 = degIndex(sc, e.cents), iF = degIndex(sc, fund), i = Math.round((1 - amt) * i0 + amt * iF); return sc[clamp(i, 0, sc.length - 1)] + oct; };
    const gate = eventGate(ev, e => e.f0 > 0, sr);
    return { desc: `pedal: under the sound, its notes pulled ${amt >= 1 ? 'onto' : Math.round(100 * amt) + ' % of the way to'} the fundamental${oct ? ' an octave down' : ''} and tied to the next attack`,
      apply (layers, D) {
        const out = [];
        for (const S0 of layers) {
          out.push(S0);
          const S = cloneOf(S0); S.map = map; S.name = (S0.name || '') + ' pedal';
          S.r.push((t2, s) => { const e = at(s); return e && e.f0 > 0 ? safeRatio(e.f0, target(e) - e.cents) : 1; });
          S.gainDb.push((t2, s) => lvl + gate(s));
          out.push(S);
        }
        return { layers: out, D };
      } };
  }
};

// outils partagés avec le lot 3
export { finder, scaleOf, snapTo, degIndex, safeRatio, ratioOf, eventGate, windowsOf, windowFinder, attenuate, isolate, holdSegs, registersOf, midiOf, eventNear, cloneOf, clamp, median, quantile, PHI, frac, gcd };
