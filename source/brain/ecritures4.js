// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// ============================================================================================
//  CHARIVARI — ÉCRITURES, LOT 3b : la HAUTEUR de jgcompose (jgcompose_free, jgcompose_skills2) à l'échelle d'un échantillon.
//  Chacune lit la PARTITION MICRO (partition.js) — notes, phrases, voix — et le TUNING mesuré du sujet (ses classes de
//  hauteur, son réseau) : toute hauteur produite est un degré de la gamme mesurée ou un point de son réseau, jamais un
//  demi-ton tempéré imposé (jgcompose raisonne en 12 classes ; ici la période et les classes sont celles du sujet). Chaque
//  note garde la moitié de son écart propre à son degré (sa justesse vivante). Rendu : rien n'est resynthétisé — rapport de
//  hauteur par note (ou par portion de note), gains, et pour les deux écritures de FORME une carte du temps.
//  Aucun tirage : jgcompose tire au hasard pour densifier, altération, emprunt, modulation, réponse ; ici, pas premier avec
//  le nombre d'éléments, seuil sur un champ, ou mesure.
//
//   altération — broderie — corruption — densifier — développement (forme) — emprunt — modulation — isorythmie —
//   note pivot — réponse (forme) — rétrograde — queue changeante — variation développante — voisinage du contour
// ============================================================================================
import { finder, windowsOf, safeRatio, clamp, median } from './ecritures2.js';
import { coprime, pickCoprime, cyclesOf } from './ecritures3.js';
import { scaleClasses } from './microtonal.js';

const S_CURVE = u => (u <= 0 ? 0 : u >= 1 ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * u));
const isPitched = e => e.f0 > 0 && e.cents !== null && e.cents !== undefined;
const sign = x => (x > 0 ? 1 : x < 0 ? -1 : 0);

// ---------------------------------------------------------------------------------------------- le mode du sujet
// racine (la fondamentale mesurée), période et classes de la gamme ; sans tuning mesuré, les douze demi-tons autour de la
// hauteur médiane. Degré LINÉAIRE : octave × nombre de classes + classe (l'arithmétique des degrés se fait là).
function modeOf (P, ctx) {
  const t = P.tuning, root = ctx.axis ?? P.fundamentalCents;
  if (t && root !== null && root !== undefined) {
    const { period, cls } = scaleClasses(t), c = cls.filter(x => x >= 0 && x < period - 4);
    if (c.length >= 3) return { root, p: period, cls: c, n: c.length };
  }
  const pe = ctx.ms.events.filter(isPitched), r0 = pe.length ? Math.round(median(pe.map(e => e.cents)) / 100) * 100 : 6000;
  return { root: r0, p: 1200, cls: Array.from({ length: 12 }, (_, i) => 100 * i), n: 12 };
}
function linOf (M, c) {
  const r = c - M.root; let oct = Math.floor(r / M.p); const x = r - oct * M.p;
  let bi = 0, bd = Infinity; for (let i = 0; i <= M.n; ++i) { const k = i < M.n ? M.cls[i] : M.p, d = Math.abs(k - x); if (d < bd) { bd = d; bi = i; } }
  if (bi === M.n) { bi = 0; oct++; }
  return oct * M.n + bi;
}
const centsOfLin = (M, L) => { const o = Math.floor(L / M.n), j = L - o * M.n; return M.root + o * M.p + M.cls[j]; };
const pcOf = (M, c) => (((c - M.root) % M.p) + M.p) % M.p;
// le réseau du tuning (où sont les hauteurs), sinon la gamme sur plusieurs octaves
function latticeOf (ctx, M) {
  if (ctx.deg && ctx.deg.all && ctx.deg.all.length >= 3) return ctx.deg.all;
  const out = []; for (let L = -12 * M.n; L <= 12 * M.n; ++L) out.push(centsOfLin(M, L)); return out;
}
function nearestIdx (arr, c) { let lo = 0, hi = arr.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (arr[m] < c) lo = m; else hi = m; } return Math.abs(arr[lo] - c) <= Math.abs(arr[hi] - c) ? lo : hi; }
const snapLat = (lat, c) => lat[nearestIdx(lat, c)];
// la quinte du sujet : le point du réseau le plus proche de 702 c au-dessus de la racine, et le nombre de degrés qui la font
function fifthOf (M, lat) { const c = snapLat(lat, M.root + 702) - M.root; return { cents: c, deg: Math.max(1, linOf(M, M.root + c)) }; }
// rapport d'un événement vers une hauteur cible (cents absolus) : il garde la moitié de son écart propre
const ratioTo = (e, tgt) => safeRatio(e.f0, tgt + 0.5 * (e.lifeDev || 0) - e.cents);
// énoncés : les phrases ; à défaut les cycles (mesures, temps) ; chacun avec ses événements
function statementsOf (P, ctx) {
  const ev = ctx.ms.events, W = ctx.ms.phrases.length >= 2 ? windowsOf(P, ctx) : cyclesOf(P, ctx, 3);
  return W.map(([a, b]) => ({ a, b, idx: ev.filter(e => e.s0 >= a && e.s0 < b).map(e => e.i) })).filter(w => w.idx.length);
}
// pose un rapport par note sur les strates
const perNote = (ratio, at) => (t, s) => { const e = at(s); return (e && ratio.get(e.i)) || 1; };
// hauteur DANS une note : changements { s (source), c (cents relatifs à la note) } en courbe en S de 20 ms ; une légère
// réarticulation (creux de 3 dB sur ±12 ms) à chaque changement, le jeu lié d'un instrumentiste qui orne
function inNote (P, changes, orn) {
  const R = 0.02 * P.sr, Rd = 0.012 * P.sr;
  return {
    r: (t, s, e) => { const ch = changes.get(e.i); if (!ch) return 1; let c = 0, prev = 0; for (const x of ch) { c += (x.c - prev) * S_CURVE((s - x.s + R / 2) / R); prev = x.c; } return Math.pow(2, c / 1200); },
    g: (t, s, e) => { const ch = changes.get(e.i); if (!ch) return 0; let g = 0; for (const x of ch) { const d = Math.abs(s - x.s); if (d < Rd) g -= 3 * (1 - d / Rd); } if (orn) { const o = orn.get(e.i); if (o) for (const [a, b, db] of o) if (s >= a && s < b) g += db; } return g; }
  };
}

export const ECRITURES4 = {};

// ============================================================================================ HAUTEUR
// ALTÉRATION (jgcompose _alter_degree) — un degré de la gamme est altéré dans toute la pièce, de façon concertée : ses
// occurrences montent ou descendent d'un pas CHROMATIQUE (jgcompose : ±1 demi-ton, le microtonal « hors périmètre » ; ici
// ±100 c ramenés au point le plus proche du réseau mesuré, ou son point voisin si le réseau n'a rien là). Le degré : le plus
// fréquent hors tonique, haussé (v0) ; la tonique, baissée (v1, la cible par défaut de jgcompose) ; le plus fréquent hors
// tonique, haussé puis baissé à tour de rôle — la fausse relation (v2). Dosage : une part (0,3 + 0,7·ι) des occurrences,
// par pas premier (jgcompose : chaque note au hasard avec la probabilité amount).
ECRITURES4.alteration = {
  kind: 'melody', profile: [0.9, 0.0, 0.0, 0.0, 0.2, 0.0, 0.0, 0.0],
  relevance: T => { const m = T.ms; return m && m.nPitched >= 4 ? clamp(0.7 * m.pitchedShare * Math.min(1, m.nPitched / 6), 0, 0.7) : 0; },
  make (P, ctx, iota, variant) {
    const ev = ctx.ms.events, at = finder(ev), pe = ev.filter(isPitched); if (pe.length < 4) return null;
    const M = modeOf(P, ctx), lat = latticeOf(ctx, M), v = variant % 3;
    const cnt = new Map(); for (const e of pe) { const j = ((linOf(M, e.cents) % M.n) + M.n) % M.n; cnt.set(j, (cnt.get(j) || 0) + 1); }
    const order = [...cnt.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
    const pick = v === 1 ? (cnt.get(0) >= 2 ? 0 : (order.find(([, n]) => n >= 2) || [])[0]) : (order.find(([j, n]) => j !== 0 && n >= 2) || [])[0];
    if (pick === undefined) return null;
    const occ = pe.filter(e => ((linOf(M, e.cents) % M.n) + M.n) % M.n === pick);
    const chosen = pickCoprime(occ.length, Math.max(1, Math.round(occ.length * (0.3 + 0.7 * iota))));
    const ratio = new Map(); let z = 0;
    [...chosen].sort((a, b) => a - b).forEach(q => {
      const e = occ[q], base = centsOfLin(M, linOf(M, e.cents)), dir = v === 0 ? 1 : v === 1 ? -1 : (z % 2 ? -1 : 1); z++;
      // l'altération chromatique (±100 c) ramenée au réseau du tuning ; si le réseau n'a rien là, son point voisin
      let tgt = snapLat(lat, base + dir * 100);
      if (Math.abs(tgt - base) < 15) { const k = nearestIdx(lat, base), j = k + dir; if (j < 0 || j >= lat.length) return; tgt = lat[j]; }
      ratio.set(e.i, ratioTo(e, tgt));
    });
    if (!ratio.size) return null;
    const step = Math.round(Math.abs(snapLat(lat, centsOfLin(M, pick) + 100) - centsOfLin(M, pick)));
    return { desc: `alteration of degree ${pick + 1}: ${ratio.size} of its ${occ.length} occurrences ${['raised', 'lowered', 'raised and lowered in turn'][v]} by a chromatic step of the tuning (~${step} c)`,
      apply (layers, D) { for (const S of layers) S.r.push(perNote(ratio, at)); return { layers, D }; } };
  }
};

// BRODERIE (jgcompose skills2 broderie, et le levier « broderie » de densifier) — une note s'orne de son voisin d'un degré :
// au-dessous quand la ligne monte ensuite, au-dessus quand elle descend (règle de jgcompose). Note-voisine-note : le tiers
// du milieu passe au voisin et revient (v0) ; la voisine répétée en fin de note qui mène à la suivante (v1, la broderie
// de skills2 : 34 % de la durée, −2,2 dB — vélocité ×0,78) ; double broderie, voisine supérieure puis inférieure puis
// retour (v2). La part de la note donnée à l'ornement : 0,2 + 0,25·ι. Les notes sont LIÉES (la hauteur glisse en 20 ms, creux de 3 dB) : un ornement d'instrumentiste, pas un
// collage. Dosage : une part (0,3 + 0,7·ι) des notes d'au moins 0,2 s, par pas premier (jgcompose : round((n−1)·amount)).
ECRITURES4.broderie = {
  kind: 'melody', profile: [0.7, 0.1, 0.0, 0.2, 0.0, 0.5, 0.0, 0.0],
  relevance: T => { const m = T.ms; return m && m.nPitched >= 3 && (m.maxDur || 0) >= 0.2 ? clamp(0.3 + 0.4 * m.pitchedShare, 0, 0.7) : 0; },
  make (P, ctx, iota, variant) {
    const ev = ctx.ms.events, at = finder(ev), sr = P.sr, pe = ev.filter(isPitched); if (pe.length < 3) return null;
    const M = modeOf(P, ctx), v = variant % 3;
    const elig = pe.filter(e => Math.min(e.s1, e.sN) - e.s0 >= 0.2 * sr);
    if (!elig.length) return null;
    const chosen = pickCoprime(elig.length, Math.max(1, Math.round(elig.length * (0.3 + 0.7 * iota))));
    const changes = new Map(), orn = new Map(), g = -2.2;
    for (const q of chosen) {
      const e = elig[q], k = pe.indexOf(e), nx = pe[k + 1], L = linOf(M, e.cents), len = Math.min(e.s1, e.sN) - e.s0;
      const dir = nx && nx.cents > e.cents + 20 ? -1 : 1, nb = d => centsOfLin(M, L + d) - centsOfLin(M, L);
      // la part de la note donnée à l'ornement : w = 0,2 + 0,25·ι (le tiers à ι = 0,5 ; jgcompose : 34 %)
      const w = (0.2 + 0.25 * iota) * len, mid = e.s0 + len / 2;
      if (v === 0) { const a = mid - w / 2, b = mid + w / 2; changes.set(e.i, [{ s: a, c: nb(dir) }, { s: b, c: 0 }]); orn.set(e.i, [[a, b, g]]); }
      else if (v === 1) { const a = e.s0 + len - w; changes.set(e.i, [{ s: a, c: nb(dir) }]); orn.set(e.i, [[a, e.sN, g]]); }
      else { const a = mid - w, b = mid, c = mid + w; changes.set(e.i, [{ s: a, c: nb(1) }, { s: b, c: nb(-1) }, { s: c, c: 0 }]); orn.set(e.i, [[a, c, g]]); }
    }
    const f = inNote(P, changes, orn);
    return { desc: `${['neighbour note and back', 'neighbour note leading on', 'double neighbour, above then below'][v]} on ${changes.size} of ${elig.length} notes (one degree, slurred)`,
      apply (layers, D) { for (const S of layers) { S.r.push((t, s) => { const e = at(s); return e ? f.r(t, s, e) : 1; }); S.gainDb.push((t, s) => { const e = at(s); return e ? f.g(t, s, e) : 0; }); } return { layers, D }; } };
  }
};

// CORRUPTION (jgcompose skills2 corruption) — le thème se corrompt d'énoncé en énoncé (x = k/(N−1), le premier intact) :
// ses intervalles s'étirent autour de sa note la plus grave (b = 1 + 0,062·(0,5 + ι)·x ; jgcompose β = 1,062), il se
// désaccorde (c = (4 + 18x)·(0,5 + 0,5·ι) cents), ses accents s'aplatissent vers un crescendo uniforme (jgcompose force
// la vélocité 60 → 112), et après chaque troisième énoncé il s'abandonne : un trou à 72 % de l'énoncé (1,4 s chez
// jgcompose, ici au plus 28 % de l'énoncé, −(20 + 40·ι) dB). Désaccord vers le haut (v0, comme jgcompose) ; intervalles
// écrasés et désaccord vers le bas (v1) ; désaccord en battement, une note haute une note basse, abandon tous les deux
// énoncés (v2).
ECRITURES4.corruption = {
  kind: 'melody', profile: [0.6, 0.2, 0.2, 0.1, 0.6, 0.4, 0.0, 0.0],
  relevance: T => { const m = T.ms; return m && m.nEvents >= 4 && (m.nPhrases >= 3 || T.tempoBpm > 0 || m.nEvents >= 8) ? 0.55 : 0; },
  make (P, ctx, iota, variant) {
    const ev = ctx.ms.events, at = finder(ev), sr = P.sr, W = statementsOf(P, ctx), N = W.length; if (N < 3) return null;
    const v = variant % 3, A = 0.4 + 0.6 * iota, medL = median(ev.map(e => e.loud));
    const ratio = new Map(), gain = new Map(), holes = [];
    W.forEach((w, k) => {
      if (k === 0) return;
      const x = k / (N - 1), b = 1 + (v === 1 ? -1 : 1) * 0.062 * (0.5 + iota) * x, c = (4 + 18 * x) * (0.5 + 0.5 * iota);
      const pit = w.idx.filter(i => isPitched(ev[i])), base = pit.length ? Math.min(...pit.map(i => ev[i].cents)) : 0;
      w.idx.forEach((i, z) => {
        const e = ev[i], det = v === 0 ? c : v === 1 ? -c : (z % 2 ? -c : c);
        const cents = isPitched(e) ? base + (e.cents - base) * b - e.cents + det : det;
        ratio.set(i, isPitched(e) ? safeRatio(e.f0, cents) : Math.pow(2, cents / 1200));
        gain.set(i, clamp(A * (medL - 6 * (1 - x) - e.loud), -9, 6));
      });
      if ((v === 2 ? k % 2 === 1 : k % 3 === 2) && k < N - 1) { const len = w.b - w.a, h0 = w.a + 0.72 * len; holes.push([h0, h0 + Math.min(1.4 * sr, 0.28 * len)]); }
    });
    const depth = 20 + 40 * iota, R = 0.025 * sr;
    const hole = s => { let g = 0; for (const [a, b] of holes) if (s > a - R && s < b + R) g = Math.min(g, -depth * Math.min(S_CURVE((s - a + R) / R), S_CURVE((b + R - s) / R))); return g; };
    return { desc: `corruption over ${N} statements: intervals ${v === 1 ? 'squeezed' : 'stretched'} up to ×${(1 + (v === 1 ? -1 : 1) * 0.062 * (0.5 + iota)).toFixed(3)}, detuned ${v === 2 ? '±' : v === 1 ? '−' : '+'}${((22) * (0.5 + 0.5 * iota)).toFixed(0)} c by the end, accents flattened, ${holes.length} abandon${holes.length === 1 ? '' : 's'}`,
      apply (layers, D) { for (const S of layers) { S.r.push(perNote(ratio, at)); S.gainDb.push((t, s) => { const e = at(s); return (e ? (gain.get(e.i) || 0) : 0) + (s === null || s === undefined ? 0 : hole(s)); }); } return { layers, D }; } };
  }
};

// DENSIFIER (jgcompose _densify_scaled) — entre deux notes, des notes de passage dans la fin de la première (la part
// φ = 0,3 + 0,3·ι de sa durée sonore), liées : par degrés de la gamme quand le saut fait au moins deux degrés (v0,
// « passage » de jgcompose, sub = 2 ou 3) ; par les points du RÉSEAU du tuning entre les deux hauteurs — un passage
// chromatique, microtonal si le tuning l'est (v1) ; l'anticipation — la fin de la note prend déjà la hauteur de la
// suivante (v2). Notes ajoutées à −2,8 dB (vélocité −15). Dosage : une part (0,3 + 0,7·ι) des intervalles, par pas
// premier (jgcompose : au hasard, fraction amount × activité de la voix).
ECRITURES4.densifier = {
  kind: 'melody', profile: [0.7, 0.2, 0.0, 0.4, 0.0, 0.4, 0.0, 0.0],
  relevance: T => { const m = T.ms; return m && m.nPitched >= 4 && (m.movingShare || 0) > 0.2 ? clamp(0.3 + 0.5 * m.movingShare, 0, 0.75) : 0; },
  make (P, ctx, iota, variant) {
    const ev = ctx.ms.events, at = finder(ev), sr = P.sr, pe = ev.filter(isPitched); if (pe.length < 4) return null;
    const M = modeOf(P, ctx), lat = latticeOf(ctx, M), v = variant % 3, phi = 0.3 + 0.3 * iota;
    const pairs = [];
    for (let k = 0; k + 1 < pe.length; ++k) {
      const e = pe[k], n = pe[k + 1], len = Math.min(e.s1, n.s0) - e.s0; if (len < 0.15 * sr || n.s0 - e.s0 > 2 * sr) continue;
      const Le = linOf(M, e.cents), Ln = linOf(M, n.cents);
      let pts = [];
      if (v === 0 && Math.abs(Ln - Le) >= 2) { const d = sign(Ln - Le), m = Math.min(3, Math.abs(Ln - Le) - 1); for (let q = 1; q <= m; ++q) pts.push(centsOfLin(M, Le + Math.round(q * (Ln - Le) / (m + 1)))); pts = pts.map(c => c - centsOfLin(M, Le)); if (!d) pts = []; }
      if (v === 1) { const lo = Math.min(e.cents, n.cents) + 15, hi = Math.max(e.cents, n.cents) - 15, inn = lat.filter(c => c > lo && c < hi); if (inn.length) { const m = Math.min(4, inn.length), seq = n.cents > e.cents ? inn : inn.slice().reverse(); for (let q = 0; q < m; ++q) pts.push(seq[Math.floor((q + 0.5) * seq.length / m)] - e.cents); } }
      if (v === 2 && Math.abs(Ln - Le) >= 1) pts = [n.cents - e.cents];
      if (pts.length) pairs.push({ e, len, pts });
    }
    if (!pairs.length) return null;
    const chosen = pickCoprime(pairs.length, Math.max(1, Math.round(pairs.length * (0.3 + 0.7 * iota))));
    const changes = new Map(), orn = new Map();
    for (const q of chosen) {
      const { e, len, pts } = pairs[q], span = (v === 2 ? phi / 2 : phi) * len, a = e.s0 + len - span, d = span / pts.length;
      changes.set(e.i, pts.map((c, z) => ({ s: a + z * d, c }))); orn.set(e.i, [[a, e.sN, -2.8]]);
    }
    const f = inNote(P, changes, orn), nn = [...changes.values()].reduce((x, c) => x + c.length, 0);
    return { desc: `${['diatonic passing notes', 'chromatic passing notes through the tuning\'s own points', 'anticipations of the next note'][v]}: ${nn} notes slurred into the end of ${changes.size} of ${pairs.length} notes`,
      apply (layers, D) { for (const S of layers) { S.r.push((t, s) => { const e = at(s); return e ? f.r(t, s, e) : 1; }); S.gainDb.push((t, s) => { const e = at(s); return e ? f.g(t, s, e) : 0; }); } return { layers, D }; } };
  }
};

// DÉVELOPPEMENT (jgcompose _develop) — après la fin du sujet, son fragment le plus riche (la phrase qui a le plus de notes ;
// sans phrases, le cycle qui en a le plus — jamais plus de 45 % de la zone active) revient une fois tel quel, puis N fois
// transposé d'un degré de plus à chaque fois (marche modale ; jgcompose : DEVELOP_STEP −1, N = round(amount·6)) : en
// descendant (v0), en montant (v1), par tierces descendantes (v2). N de 1 à 3, tant que le tout tient dans (0,6 + 0,8·ι)
// fois la zone active. Le fragment emporte le silence qui le suit (jgcompose) ; la dernière copie garde sa résonance.
ECRITURES4.developpement = {
  kind: 'map', profile: [0.6, 0.5, 0.0, 0.1, 1.0, 0.0, 0.0, 0.0],
  relevance: T => { const m = T.ms; return m && m.nEvents >= 4 && m.nPitched >= 3 ? clamp(0.35 + 0.3 * m.pitchedShare, 0, 0.65) : 0; },
  make (P, ctx, iota, variant, H) {
    const ev = ctx.ms.events, n = ev.length, sr = P.sr, at = finder(ev); if (n < 4) return null;
    const M = modeOf(P, ctx), v = variant % 3, A0 = ev[0].s0, A1 = ev[n - 1].sN, act = A1 - A0;
    let best = null;
    for (const w of statementsOf(P, ctx)) if (!best || w.idx.length > best.idx.length) best = w;
    if (!best || best.idx.length < 2) return null;
    let a = best.idx[0], b = best.idx[best.idx.length - 1];
    const endAfter = q => (q + 1 < n ? ev[q + 1].s0 : ev[q].sN);
    while (b > a + 1 && endAfter(b) - ev[a].s0 > 0.45 * act) b--;
    const fa = ev[a].s0, fb = endAfter(b), Lf = fb - fa, lastEnd = ev[b].sN;
    if (Lf < 0.15 * sr) return null;
    // copies : autant que le permet (0,6 + 0,8·ι) fois la zone active, de 1 à 3 transposées
    const cap = (0.6 + 0.8 * iota) * act; let N = 3; while (N > 1 && (N + 1) * Lf > cap) N--;
    const step = v === 0 ? -1 : v === 1 ? 1 : -2, E = ev[n - 1].sN;
    const segs = [{ a: 0, b: E, sa: 0, sb: E }]; let t = E;
    for (let q = 0; q <= N; ++q) { const len = q === N ? lastEnd - fa : Lf; segs.push({ a: t, b: t + len, sa: fa, sb: fa + len }); t += len; }
    // rapports par copie : transposition modale de chaque note ; un événement sans hauteur suit la première note de la copie
    const tables = [];
    for (let q = 0; q <= N; ++q) {
      const tb = new Map(); let first = 1;
      for (let i = a; i <= b && i < n; ++i) { const e = ev[i]; if (!isPitched(e)) continue; const r = q ? ratioTo(e, centsOfLin(M, linOf(M, e.cents) + q * step)) : 1; tb.set(i, r); if (first === 1) first = r; }
      for (let i = a; i <= b && i < n; ++i) if (!tb.has(i)) tb.set(i, first);
      tables.push(tb);
    }
    const map = new H.TimeMap(segs), D = Math.ceil(t);
    const r = (t2, s) => { if (t2 < E) return 1; const q = clamp(Math.floor((t2 - E) / Lf), 0, N); const e = at(s); return (e && tables[q].get(e.i)) || 1; };
    return { desc: `development: after the subject, its richest fragment (${b - a + 1} events, ${(Lf / sr).toFixed(2)} s) restated, then ${N} time${N > 1 ? 's' : ''} ${['a degree lower each time', 'a degree higher each time', 'a third lower each time'][v]}`,
      apply (layers, D0) { for (const S of layers) { S.map = map; S.r.push(r); } return { layers, D: Math.max(D0, D) }; } };
  }
};

// champ temporel de l'emprunt et de la modulation (jgcompose _remap_field) : le pivot est le plus grand silence entre
// deux événements près du milieu (score : durée × proximité du centre) ; demi-largeur h = un quart de la zone active ;
// RETOUR : niveau 1 − |t − pivot|/h (A-B-A) ; RAMPE : de 0 avant pivot − h à 1 après pivot + h ; rampe à rebours
function fieldOf (P, ctx, mode) {
  const ev = ctx.ms.events, n = ev.length, A0 = ev[0].s0, A1 = ev[n - 1].sN, span = A1 - A0, mid = (A0 + A1) / 2;
  let tp = mid, bs = -1;
  for (let q = 0; q + 1 < n; ++q) { const gap = Math.max(0, ev[q + 1].s0 - ev[q].s1) + 0.1 * (ev[q + 1].s0 - ev[q].s0), c = (ev[q].s1 + ev[q + 1].s0) / 2, sc = gap * Math.max(0.1, 1 - Math.abs(c - mid) / (span / 2)); if (sc > bs) { bs = sc; tp = c; } }
  const h = 0.25 * span;
  if (mode === 'return') return t => Math.max(0, 1 - Math.abs(t - tp) / h);
  if (mode === 'ramp') return t => clamp((t - tp + h) / (2 * h), 0, 1);
  return t => 1 - clamp((t - tp + h) / (2 * h), 0, 1);
}

// EMPRUNT (jgcompose _emprunt) — la gamme PARALLÈLE : même racine, pas de la gamme pris à rebours (majeur → phrygien) ;
// ici les pas MESURÉS du sujet, renversés — dans un tuning microtonal, ses propres intervalles dans l'autre sens. Chaque
// note passe degré pour degré dans la gamme empruntée quand le champ l'atteint : au milieu, A-B-A (v0, le défaut annoncé
// de jgcompose) ; en rampe, sans retour (v1, ce que fait réellement son répartiteur) ; au début, puis retour à la gamme
// propre (v2). Dosage : une note migre quand le niveau du champ dépasse 1 − (0,35 + 0,65·ι) (jgcompose : au hasard avec
// la probabilité amount × niveau). Une gamme symétrique (dorien, tons entiers) n'a pas de parallèle : rien.
ECRITURES4.emprunt = {
  kind: 'melody', profile: [0.9, 0.0, 0.0, 0.0, 0.5, 0.0, 0.0, 0.0],
  relevance: T => { const m = T.ms; return m && m.nPitched >= 4 && m.rangeCents >= 150 ? clamp(0.3 + 0.4 * m.pitchedShare, 0, 0.7) : 0; },
  make (P, ctx, iota, variant) {
    const ev = ctx.ms.events, at = finder(ev), pe = ev.filter(isPitched); if (pe.length < 4) return null;
    const M = modeOf(P, ctx), v = variant % 3, steps = M.cls.map((c, i) => (i + 1 < M.n ? M.cls[i + 1] : M.p) - c).reverse();
    const par = [0]; for (let i = 0; i + 1 < M.n; ++i) par.push(par[i] + steps[i]);
    const field = fieldOf(P, ctx, ['return', 'ramp', 'reverse'][v]), thr = 1 - (0.35 + 0.65 * iota), ratio = new Map();
    for (const e of pe) {
      if (!(field(e.s0) > thr) || field(e.s0) <= 0) continue;
      const L = linOf(M, e.cents), o = Math.floor(L / M.n), j = L - o * M.n, tgt = M.root + o * M.p + par[j];
      if (Math.abs(tgt - centsOfLin(M, L)) < 8) continue;
      ratio.set(e.i, ratioTo(e, tgt));
    }
    if (!ratio.size) return null;
    return { desc: `modal borrowing: the parallel scale (the subject's own steps reversed: ${steps.map(x => Math.round(x)).join(' ')} c) ${['in the middle, then back', 'reached gradually, no return', 'at the start, then back to its own scale'][v]} — ${ratio.size} notes moved`,
      apply (layers, D) { for (const S of layers) S.r.push(perNote(ratio, at)); return { layers, D }; } };
  }
};

// MODULATION (jgcompose _modulate) — même champ que l'emprunt, vers une autre tonalité : la gamme du sujet posée sur sa
// QUINTE (le point du réseau le plus proche de 702 c), en rampe — les notes communes restent, les autres glissent au
// degré le plus proche de la nouvelle gamme (v0, la dominante, le repli par défaut de jgcompose) ; sur sa quarte — la
// sous-dominante, A-B-A (v1) ; la lecture littérale de jgcompose, degré pour degré dans la tonalité de la dominante — la
// mélodie y est transposée (v2, en rampe). Les hauteurs nouvelles sont ramenées au réseau du tuning.
ECRITURES4.modulation = {
  kind: 'melody', profile: [0.9, 0.0, 0.0, 0.0, 0.6, 0.0, 0.0, 0.0],
  relevance: T => { const m = T.ms; return m && m.nPitched >= 5 && m.rangeCents >= 150 ? clamp(0.3 + 0.35 * m.pitchedShare, 0, 0.65) : 0; },
  make (P, ctx, iota, variant) {
    const ev = ctx.ms.events, at = finder(ev), pe = ev.filter(isPitched); if (pe.length < 5) return null;
    const M = modeOf(P, ctx), lat = latticeOf(ctx, M), v = variant % 3, F = fifthOf(M, lat), shift = v === 1 ? -F.cents : F.cents;
    const field = fieldOf(P, ctx, v === 1 ? 'return' : 'ramp'), thr = 1 - (0.35 + 0.65 * iota), ratio = new Map();
    const target = [];
    for (let o = -12; o <= 12; ++o) for (const c of M.cls) target.push(M.root + shift + o * M.p + c);
    target.sort((x, y) => x - y);
    for (const e of pe) {
      const lv = field(e.s0); if (!(lv > thr) || lv <= 0) continue;
      const own = centsOfLin(M, linOf(M, e.cents));
      const tgt = v === 2 ? centsOfLin(M, linOf(M, e.cents) + F.deg) : snapLat(lat, target[nearestIdx(target, own)]);
      if (Math.abs(tgt - own) < 8) continue;
      ratio.set(e.i, ratioTo(e, tgt));
    }
    if (!ratio.size) return null;
    return { desc: `modulation ${['to the dominant (its own fifth, ' + Math.round(F.cents) + ' c), gradually: common tones stay', 'to the subdominant and back', 'to the dominant key, degree for degree (the line moves into it)'][v]} — ${ratio.size} notes moved`,
      apply (layers, D) { for (const S of layers) S.r.push(perNote(ratio, at)); return { layers, D }; } };
  }
};

// ISORYTHMIE (jgcompose _isorhythm_crossed) — une COULEUR (cycle de hauteurs) se superpose au rythme de la ligne (la
// TALEA, intacte) : les hauteurs des C premières notes reviennent en boucle sur toutes les suivantes, ramenées au registre
// de la ligne ; C = 3 (v0), 5 (v1), la période de hauteurs la plus régulière du sujet s'il en a une (≥ 60 % de retours),
// sinon 6, ou 2 sur une ligne de moins de huit notes, jamais 3 ni 5 — ce seraient v0 et v1 (v2) ; jamais égale au nombre de notes d'un énoncé (la couleur et la talea doivent se décaler). Chaque note va
// pour a = 0,3 + 0,7·ι vers sa couleur (jgcompose : (1 − amount)·sien + amount·emprunté), arrondie au degré.
ECRITURES4.isorythmie = {
  kind: 'melody', profile: [0.8, 0.2, 0.0, 0.3, 0.5, 0.0, 0.0, 0.0],
  relevance: T => { const m = T.ms; return m && m.nPitched >= 6 && (m.movingShare || 0) > 0.2 ? clamp(0.35 + 0.4 * m.movingShare, 0, 0.7) : 0; },
  make (P, ctx, iota, variant) {
    const ev = ctx.ms.events, at = finder(ev), pe = ev.filter(isPitched); if (pe.length < 6) return null;
    const M = modeOf(P, ctx), v = variant % 3, Ls = pe.map(e => linOf(M, e.cents));
    let C = v === 0 ? 3 : v === 1 ? 5 : 4;
    if (v === 2) { let bp = 0, bs = 0.6; for (let p = 2; p <= Math.floor(Ls.length / 2); ++p) { let ok = 0; for (let i = p; i < Ls.length; ++i) if (Ls[i] === Ls[i - p]) ok++; const sc = ok / (Ls.length - p); if (sc >= bs + 1e-9) { bs = sc; bp = p; } } C = bp || (Ls.length >= 8 ? 6 : 2); if (C === 3 || C === 5) C++; }
    const W = statementsOf(P, ctx), Tl = W.length >= 2 ? Math.round(median(W.map(w => w.idx.filter(i => isPitched(ev[i])).length))) : 0;
    if (C === Tl) C++;
    if (C >= pe.length - 1) return null;
    const color = Ls.slice(0, C), cc = color.reduce((x, y) => x + y, 0) / C, rc = Ls.reduce((x, y) => x + y, 0) / Ls.length, off = Math.round(rc - cc);
    const a = 0.3 + 0.7 * iota, ratio = new Map();
    for (let i = C; i < pe.length; ++i) { const tgt = Math.round((1 - a) * Ls[i] + a * (color[i % C] + off)); if (tgt !== Ls[i]) ratio.set(pe[i].i, ratioTo(pe[i], centsOfLin(M, tgt))); }
    if (!ratio.size) return null;
    return { desc: `isorhythm: a colour of ${C} pitches (the first ${C} notes) cycles over the line's own rhythm${Tl ? ` (talea of ${Tl} notes)` : ''} — ${ratio.size} notes take it`,
      apply (layers, D) { for (const S of layers) S.r.push(perNote(ratio, at)); return { layers, D }; } };
  }
};

// NOTE PIVOT (jgcompose skills2 note_pivot) — la TONIQUE est la hauteur la plus fréquente du sujet ; le PIVOT est la
// classe ABSENTE la plus consonante avec elle : jgcompose classe les douze intervalles (table RAP : quinte 3, quarte 4,
// tierce majeure et sixte 5, … triton 45) ; ici un intervalle est absent quand aucune note du sujet n'en est à moins de
// 50 c, et le pivot est le point du RÉSEAU du tuning le plus proche de cet intervalle (dans un tuning fin, sans cette
// règle, le « pivot » tombait à 35 c de la tonique). Dans chaque énoncé traité, la note d'après la tête (rang 3,
// jgcompose) prend le pivot (v0) ; ou la DERNIÈRE note — une cadence sur le pivot (v1) ; ou le SOMMET (v2) ; les toniques
// qui suivent s'esquivent vers le premier point du réseau à +200, −100, +100, −200 c qui ne soit pas la tonique.
// Dosage : la première part (0,3 + 0,7·ι) des énoncés, et la note glisse au pivot sur la part (0,3 + 0,7·ι) de sa fin
// (toute la note à ι = 1).
const RAP = { 0: 1, 7: 3, 5: 4, 4: 5, 9: 5, 2: 9, 3: 6, 8: 8, 10: 7, 11: 15, 1: 16, 6: 45 };
ECRITURES4.pivot = {
  kind: 'melody', profile: [0.9, 0.0, 0.0, 0.0, 0.4, 0.0, 0.0, 0.0],
  relevance: T => { const m = T.ms; return m && m.nPitched >= 4 ? clamp(0.3 + 0.3 * m.pitchedShare, 0, 0.6) : 0; },
  make (P, ctx, iota, variant) {
    const ev = ctx.ms.events, at = finder(ev), sr = P.sr, pe = ev.filter(isPitched); if (pe.length < 4) return null;
    const M = modeOf(P, ctx), lat = latticeOf(ctx, M), v = variant % 3, near = c => snapLat(lat, c), P12 = 1200;
    // tonique : la hauteur (au point du réseau) la plus fréquente, à l'octave près
    const pcs = pe.map(e => ((near(e.cents) % P12) + P12) % P12), cnt = new Map();
    for (const x of pcs) { let k = null; for (const y of cnt.keys()) if (Math.min(Math.abs(x - y), P12 - Math.abs(x - y)) < 25) { k = y; break; } cnt.set(k ?? x, (cnt.get(k ?? x) || 0) + 1); }
    const tonic = [...cnt.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
    const isTonic = c => { const x = ((near(c) % P12) + P12) % P12, d = Math.abs(x - tonic); return Math.min(d, P12 - d) < 25; };
    const present = semi => pcs.some(x => { const d = Math.abs(((x - tonic - 100 * semi) % P12 + P12) % P12); return Math.min(d, P12 - d) < 50; });
    const semis = Object.keys(RAP).map(Number).filter(k => k !== 0 && !present(k)).sort((a, b) => RAP[a] - RAP[b] || a - b);
    if (!semis.length) return null;
    const ivl = 100 * semis[0];
    const pivotNear = c => { let best = c, bd = Infinity; for (let o = -4; o <= 4; ++o) { const x = tonic + ivl + P12 * (Math.floor(c / P12) + o), d = Math.abs(x - c); if (d < bd) { bd = d; best = x; } } return near(best); };
    const lo = Math.min(...pe.map(e => e.cents)) - 300, hi = Math.max(...pe.map(e => e.cents)) + 300;
    const dodge = c => { for (const d of [200, -100, 100, -200]) { const x = near(c + d); if (!isTonic(x) && x > lo && x < hi) return x; } return null; };
    const W = statementsOf(P, ctx), nW = Math.max(1, Math.ceil(W.length * (0.3 + 0.7 * iota))), frac = 0.3 + 0.7 * iota, changes = new Map();
    const glide = (e, tgt) => { const len = Math.min(e.s1, e.sN) - e.s0, c = tgt + 0.5 * (e.lifeDev || 0) - e.cents; if (Math.abs(c) < 8) return; changes.set(e.i, [{ s: frac >= 0.999 ? e.s0 : e.s0 + (1 - frac) * len, c: Math.log2(safeRatio(e.f0, c)) * 1200 }]); };
    W.slice(0, nW).forEach(w => {
      const pit = w.idx.filter(i => isPitched(ev[i])); if (pit.length < 2) return;
      const jp = v === 0 ? Math.min(3, pit.length - 1) : v === 1 ? pit.length - 1 : pit.reduce((bj, i, j) => (ev[i].cents > ev[pit[bj]].cents ? j : bj), 0);
      glide(ev[pit[jp]], pivotNear(ev[pit[jp]].cents));
      for (let j = v === 1 ? 0 : jp + 1; j < pit.length; ++j) { if (j === jp) continue; const f = ev[pit[j]]; if (!isTonic(f.cents)) continue; const x = dodge(near(f.cents)); if (x !== null) glide(f, x); }
    });
    if (!changes.size) return null;
    const f = inNote(P, changes, null);
    return { desc: `pivot note: the absent interval ${semis[0] * 100} c above the tonic (the most consonant one missing) ${['after the head', 'as the cadence', 'at the summit'][v]} of ${nW} statement${nW > 1 ? 's' : ''}, tonics side-stepped — ${changes.size} notes`,
      apply (layers, D) { for (const S of layers) S.r.push((t, s) => { const e = at(s); return e ? f.r(t, s, e) : 1; }); return { layers, D }; } };
  }
};

// RÉPONSE (jgcompose _response) — chaque silence intérieur (le son éteint, au moins 0,3 s, au moins deux fois le silence
// médian entre événements — zéro pour une ligne liée —, et au moins un demi-temps au pouls) se remplit d'un ÉCHO de la phrase qui le précède, ramené à 90 % du silence
// (RESPONSE_FILL), à −2,5 dB (vélocité −8), dans une strate à part : la résonance du sujet reste dessous. L'écho est relu
// au plus trois fois plus vite (au-delà, il ne reprend que la fin de la phrase). Écho exact (v0) ; plus clairsemé — n'en
// restent que les notes les plus longues, une part 1 − 0,7·ι (v1) ; plus dense — chaque note glisse dans sa seconde moitié
// vers le degré moyen d'elle et de la suivante, −5 dB (v2). Dosage : une part (0,4 + 0,6·ι) des silences, par pas premier.
ECRITURES4.reponse = {
  kind: 'map', layers: 2, profile: [0.3, 0.4, 0.0, 0.3, 0.9, 0.0, 0.0, 0.2],
  relevance: T => { const m = T.ms; return m && (m.silences || 0) >= 1 && m.nEvents >= 3 ? clamp(0.4 + 0.1 * m.silences, 0, 0.75) : 0; },
  make (P, ctx, iota, variant, H) {
    const ev = ctx.ms.events, n = ev.length, sr = P.sr, at = finder(ev); if (n < 3) return null;
    const M = modeOf(P, ctx), v = variant % 3, gaps = []; for (let q = 0; q + 1 < n; ++q) gaps.push(Math.max(0, ev[q + 1].s0 - ev[q].s1));
    const thr = Math.max(0.3 * sr, 2 * median(gaps), ctx.grid.has ? ctx.grid.beat / 2 : 0);
    const sil = []; for (let q = 0; q + 1 < n; ++q) if (gaps[q] >= thr) sil.push(q);
    if (!sil.length) return null;
    const chosen = [...pickCoprime(sil.length, Math.max(1, Math.round(sil.length * (0.4 + 0.6 * iota))))].sort((a, b) => a - b).map(j => sil[j]);
    const segs = [], echoes = []; let prevB = 0;
    for (const q of chosen) {
      let a = q; while (a > 0 && gaps[a - 1] < thr) a--;          // début de la phrase : après le silence précédent
      const e = ev[q], s0 = ev[a].s0, s1 = e.s1, g0 = e.s1, G = ev[q + 1].s0 - g0, fill = 0.9 * G, o0 = g0 + 0.05 * G;
      const src0 = Math.max(s0, s1 - 3 * fill); if (s1 - src0 < 0.05 * sr || o0 < prevB) continue;
      segs.push({ a: o0, b: o0 + fill, sa: src0, sb: s1 }); prevB = o0 + fill;
      echoes.push({ q, a: Math.max(a, ev.findIndex(x => x.sN > src0)), o0, fill });
    }
    if (!segs.length) return null;
    const map = new H.TimeMap(segs);
    // v1 : notes gardées (les plus longues) ; v2 : glissements vers le degré moyen
    const mute = new Set(), changes = new Map();
    for (const E of echoes) {
      const idx = []; for (let i = E.a; i <= E.q; ++i) idx.push(i);
      if (v === 1) { const keep = Math.max(1, Math.round(idx.length * (1 - 0.7 * iota))), byLen = idx.slice().sort((x, y) => (ev[y].s1 - ev[y].s0) - (ev[x].s1 - ev[x].s0) || x - y); byLen.slice(keep).forEach(i => mute.add(i)); }
      if (v === 2) for (let k = 0; k + 1 < idx.length; ++k) { const x = ev[idx[k]], y = ev[idx[k + 1]]; if (!isPitched(x) || !isPitched(y)) continue; const Lx = linOf(M, x.cents), Ly = linOf(M, y.cents), mid = Math.round((Lx + Ly) / 2); if (mid !== Lx) changes.set(x.i, [{ s: (x.s0 + Math.min(x.s1, y.s0)) / 2, c: centsOfLin(M, mid) - centsOfLin(M, Lx) }]); }
    }
    const f = inNote(P, changes, null), R = 0.015 * sr;
    const eg = (t, s) => { const e = at(s); if (!e) return -2.5; let g = -2.5 + (v === 2 ? -2.5 : 0); if (mute.has(e.i)) g -= 60 * clamp(Math.min(s - e.s0, e.sN - s) / R, 0, 1); return g + f.g(t, s, e); };
    return { desc: `response: ${segs.length} of ${sil.length} silences answered by an echo of the phrase before (${['exact', 'thinned to its longest notes', 'filled with passing pitches'][v]}, 90 % of the silence, −2.5 dB)`,
      apply (layers, D) {
        const out = [];
        for (const S0 of layers) { out.push(S0); const B = H.cloneLayer(S0); B.map = map; B.name = (S0.name || '') + ' response'; B.gainDb.push(eg); if (v === 2) B.r.push((t, s) => { const e = at(s); return e ? f.r(t, s, e) : 1; }); out.push(B); }
        return { layers: out, D };
      } };
  }
};

// RÉTROGRADE MÉLODIQUE (jgcompose _retrograde_melodic) — les hauteurs lues à rebours sur le même rythme. Dosage
// d = 0,3 + 0,7·ι (jgcompose : curseur centré, d = |amount − 0,5|·2) : chaque degré va de d vers son rétrograde transposé
// pour garder une extrémité : la dernière note ancrée (v0), la première (v1) ; chaque énoncé à rebours séparément,
// dernière note ancrée (v2). Rétrograde pur (d = 1, aucune transposition) : les hauteurs d'origine exactes, justesse
// comprise ; sinon arrondies au degré de la gamme.
ECRITURES4.retrograde = {
  kind: 'melody', profile: [1.0, 0.0, 0.0, 0.0, 0.5, 0.0, 0.0, 0.0],
  relevance: T => { const m = T.ms; return m && m.nPitched >= 4 && m.rangeCents >= 100 ? clamp(0.3 + 0.4 * m.pitchedShare, 0, 0.7) : 0; },
  make (P, ctx, iota, variant) {
    const ev = ctx.ms.events, at = finder(ev), pe = ev.filter(isPitched); if (pe.length < 4) return null;
    const M = modeOf(P, ctx), v = variant % 3, d = 0.3 + 0.7 * iota, ratio = new Map();
    const groups = v === 2 ? statementsOf(P, ctx).map(w => w.idx.filter(i => isPitched(ev[i])).map(i => ev[i])).filter(g => g.length >= 2) : [pe];
    if (!groups.length) return null;
    for (const g of groups) {
      const idx = g.map(e => linOf(M, e.cents)), rev = idx.slice().reverse(), last = idx.length - 1, delta = v === 1 ? idx[0] - idx[last] : idx[last] - idx[0];
      g.forEach((e, i) => {
        const res = idx[i] + d * (rev[i] + delta - idx[i]);
        if (d >= 0.999 && delta === 0) { const src = g[last - i]; if (src !== e) ratio.set(e.i, safeRatio(e.f0, src.cents - e.cents)); return; }
        const L = Math.round(res); if (L !== idx[i]) ratio.set(e.i, ratioTo(e, centsOfLin(M, L)));
      });
    }
    if (!ratio.size) return null;
    return { desc: `melodic retrograde${v === 2 ? ' of each statement' : ''} (${Math.round(100 * d)} %), ${v === 1 ? 'first' : 'last'} note anchored — ${ratio.size} notes`,
      apply (layers, D) { for (const S of layers) S.r.push(perNote(ratio, at)); return { layers, D }; } };
  }
};

// QUEUE CHANGEANTE (jgcompose skills2 queue_changeante) — chaque énoncé garde sa TÊTE (ses trois premières notes,
// jgcompose qc_tete ; moins sur un énoncé court) et change sa QUEUE : L dernières notes, L lu dans la table de jgcompose
// (1,1,2,1,3,2,4,1,5,2) au rang 3n, × (0,5 + 0,5·ι) ; le pas vient des intervalles que le sujet joue lui-même, lus par pas premier. Queue haussée ou baissée d'un degré
// selon le signe de ce pas (v0, jgcompose) ; déplacée du pas entier (v1) ; renversée autour de la dernière note de la
// tête (v2). Le premier énoncé reste le modèle (jgcompose le touche aussi). Dosage : les énoncés jusqu'à la part
// (0,3 + 0,7·ι) (jgcompose : n/len ≤ amount).
ECRITURES4.queue = {
  kind: 'melody', profile: [0.8, 0.0, 0.0, 0.1, 0.7, 0.0, 0.0, 0.0],
  relevance: T => { const m = T.ms; return m && m.nPitched >= 8 && (m.nPhrases >= 2 || T.tempoBpm > 0) ? clamp(0.35 + 0.35 * m.pitchedShare, 0, 0.7) : 0; },
  make (P, ctx, iota, variant) {
    const ev = ctx.ms.events, at = finder(ev), pe = ev.filter(isPitched); if (pe.length < 8) return null;
    const M = modeOf(P, ctx), v = variant % 3, LONG = [1, 1, 2, 1, 3, 2, 4, 1, 5, 2];
    const W = statementsOf(P, ctx).map(w => w.idx.filter(i => isPitched(ev[i]))).filter(g => g.length >= 3); if (W.length < 2) return null;
    const Ls = pe.map(e => linOf(M, e.cents)), VEC = []; for (let i = 1; i < Ls.length; ++i) if (Ls[i] !== Ls[i - 1]) VEC.push(Ls[i] - Ls[i - 1]);
    if (!VEC.length) return null;
    const cop = coprime(VEC.length, 3), lo = Math.min(...Ls) - 2, hi = Math.max(...Ls) + 2, nW = 1 + Math.ceil((W.length - 1) * (0.3 + 0.7 * iota)), ratio = new Map();
    for (let k = 1; k < Math.min(W.length, nW); ++k) {
      const g = W[k], tete = Math.max(1, Math.min(3, g.length - 2)), L = clamp(Math.round(LONG[(3 * k) % 10] * (0.5 + 0.5 * iota)), 1, Math.min(5, g.length - tete)), pas = VEC[(k * cop) % VEC.length];
      const lin = g.map(i => linOf(M, ev[i].cents)), pivot = lin[tete - 1];
      for (let j = g.length - L; j < g.length; ++j) {
        const tgt = clamp(v === 0 ? lin[j] + sign(pas) : v === 1 ? lin[j] + pas : 2 * pivot - lin[j], lo, hi);
        if (tgt !== lin[j]) ratio.set(g[j], ratioTo(ev[g[j]], centsOfLin(M, tgt)));
      }
    }
    if (!ratio.size) return null;
    return { desc: `changing tail: ${Math.min(W.length, nW) - 1} of ${W.length - 1} statements keep their head and ${['move their tail a degree', 'move their tail by an interval the subject plays', 'mirror their tail around the head'][v]} — ${ratio.size} notes`,
      apply (layers, D) { for (const S of layers) S.r.push(perNote(ratio, at)); return { layers, D }; } };
  }
};

// VARIATION DÉVELOPPANTE (jgcompose skills2 variation_developpante, Schoenberg) — chaque énoncé reprend les hauteurs de
// l'énoncé PRÉCÉDENT déjà transformé (sur son propre rythme) et les transforme encore : transposition (de l'écart
// première-dernière, sinon deux degrés), inversion de la seconde moitié, rétrograde, en cycle ; le dernier énoncé
// LIQUIDE (le premier tiers en boucle). Cycle T-I-R (v0), I-R-T (v1), R-T-I (v2). L'augmentation de jgcompose (une durée)
// n'a pas d'équivalent en hauteur seule : elle est laissée. Chaque note va pour 0,4 + 0,6·ι vers sa cible, arrondie au
// degré, repliée à l'octave si elle sort de plus d'une octave du registre du sujet.
ECRITURES4.variation = {
  kind: 'melody', profile: [0.9, 0.0, 0.0, 0.1, 0.8, 0.0, 0.0, 0.0],
  relevance: T => { const m = T.ms; return m && m.nPitched >= 6 && (m.nPhrases >= 3 || T.tempoBpm > 0) ? clamp(0.35 + 0.35 * m.pitchedShare, 0, 0.7) : 0; },
  make (P, ctx, iota, variant) {
    const ev = ctx.ms.events, at = finder(ev), pe = ev.filter(isPitched); if (pe.length < 6) return null;
    const M = modeOf(P, ctx), v = variant % 3, a = 0.4 + 0.6 * iota;
    const W = statementsOf(P, ctx).map(w => w.idx.filter(i => isPitched(ev[i]))).filter(g => g.length >= 2); if (W.length < 3) return null;
    const all = pe.map(e => linOf(M, e.cents)), lo = Math.min(...all) - M.n, hi = Math.max(...all) + M.n;
    const fold = x => { while (x > hi) x -= M.n; while (x < lo) x += M.n; return x; };
    const OPS = { T: pp => pp.map(x => x + ((pp[pp.length - 1] - pp[0]) || 2)), I: pp => { const h = pp.length >> 1, c = pp[h]; return pp.map((x, i) => (i >= h ? 2 * c - x : x)); }, R: pp => pp.slice().reverse(), L: pp => pp.slice(0, Math.max(1, Math.floor(pp.length / 3))) };
    const cyc = [['T', 'I', 'R'], ['I', 'R', 'T'], ['R', 'T', 'I']][v], used = [], ratio = new Map();
    let pp = W[0].map(i => linOf(M, ev[i].cents));
    for (let k = 1; k < W.length; ++k) {
      const op = k === W.length - 1 ? 'L' : cyc[(k - 1) % 3]; used.push(op); pp = OPS[op](pp).map(fold);
      W[k].forEach((i, j) => { const own = linOf(M, ev[i].cents), tgt = Math.round((1 - a) * own + a * pp[j % pp.length]); if (tgt !== own) ratio.set(i, ratioTo(ev[i], centsOfLin(M, tgt))); });
    }
    if (!ratio.size) return null;
    const name = { T: 'transposition', I: 'inverted tail', R: 'retrograde', L: 'liquidation' };
    return { desc: `developing variation over ${W.length} statements: ${used.map(o => name[o]).join(' → ')} — ${ratio.size} notes`,
      apply (layers, D) { for (const S of layers) S.r.push(perNote(ratio, at)); return { layers, D }; } };
  }
};

// VOISINAGE DU CONTOUR (jgcompose skills2 voisinage_contour) — des notes intérieures changent de hauteur SANS changer le
// contour (le sens de chaque intervalle avec ses voisines est gardé) : chemins essayés dans l'ordre (5k + w) mod 6 parmi
// voisin d'un degré, quinte, octave, en haut et en bas (v0, jgcompose — ici la quinte et la période du tuning mesuré) ;
// la quinte et l'octave seulement, le registre s'ouvre (v1) ; voisins d'un et deux degrés seulement, la ligne frémit (v2).
// Positions par pas premier ; dosage : round((n − 2)·(0,3 + 0,7·ι)) notes. Jamais hors du registre du sujet élargi d'une
// quinte.
ECRITURES4.voisinage = {
  kind: 'melody', profile: [0.9, 0.0, 0.0, 0.0, 0.3, 0.1, 0.0, 0.0],
  relevance: T => { const m = T.ms; return m && m.nPitched >= 5 && m.rangeCents >= 200 ? clamp(0.3 + 0.4 * m.pitchedShare, 0, 0.7) : 0; },
  make (P, ctx, iota, variant) {
    const ev = ctx.ms.events, at = finder(ev), pe = ev.filter(isPitched); if (pe.length < 5) return null;
    const M = modeOf(P, ctx), lat = latticeOf(ctx, M), v = variant % 3, F = fifthOf(M, lat).deg;
    const CH = v === 0 ? [1, -1, F, -F, M.n, -M.n] : v === 1 ? [M.n, -M.n, F, -F] : [1, -1, 2, -2];
    const L = pe.map(e => linOf(M, e.cents)), cur = L.slice(), lo = Math.min(...L) - F, hi = Math.max(...L) + F, n = L.length, m = n - 2;
    // le contour se lit sur les hauteurs mesurées (zone morte de 20 c), pas sur les degrés : deux notes du même degré mais
    // à 40 c l'une de l'autre montent ou descendent bien
    const cc = pe.map(e => e.cents), cs = cc.slice(), sg = d => (d > 20 ? 1 : d < -20 ? -1 : 0);
    const nMod = Math.max(1, Math.round(m * (0.3 + 0.7 * iota))), pas = coprime(m, 3), ratio = new Map();
    for (let k = 0; k < nMod; ++k) {
      const j = 1 + (k * pas) % m;
      for (let w = 0; w < CH.length; ++w) {
        const x = L[j] + CH[(k * 5 + w) % CH.length], xc = centsOfLin(M, x) + 0.5 * (pe[j].lifeDev || 0);
        if (x < lo || x > hi || x === cur[j - 1] || x === cur[j + 1]) continue;
        if (sg(xc - cs[j - 1]) !== sg(cc[j] - cc[j - 1]) || sg(cs[j + 1] - xc) !== sg(cc[j + 1] - cc[j])) continue;
        cur[j] = x; cs[j] = xc; ratio.set(pe[j].i, ratioTo(pe[j], centsOfLin(M, x))); break;
      }
    }
    if (!ratio.size) return null;
    return { desc: `contour neighbourhood: ${ratio.size} inner notes take ${['a neighbour, a fifth or an octave', 'a fifth or an octave', 'a neighbour one or two degrees away'][v]} — the contour is kept`,
      apply (layers, D) { for (const S of layers) S.r.push(perNote(ratio, at)); return { layers, D }; } };
  }
};

// outils partagés avec le lot 3c
export { modeOf, linOf, centsOfLin, pcOf, latticeOf, nearestIdx, snapLat, fifthOf, ratioTo, statementsOf, perNote, inNote, isPitched, sign, S_CURVE };
