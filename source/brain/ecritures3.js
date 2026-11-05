// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// ============================================================================================
//  CHARIVARI — ÉCRITURES, LOT 3a : le TEMPS de jgcompose (jgcompose_free, jgcompose_skills2) à l'échelle d'un échantillon.
//  Comme aux lots 1 et 2, chacune lit la PARTITION MICRO (partition.js) — événements, phrases, voix — et la GRILLE du sujet
//  (pouls, tatum, micro-groove) ; elle ne développe que ce qui y est attesté. Rendu : rien n'est resynthétisé, les strates
//  relisent l'original (cartes du temps, gains par événement, masques de voix). Aucun tirage : les choix se font par PAS
//  PREMIER avec le nombre d'éléments (pas_copremier de jgcompose), par mesure ou par rotation fixe.
//
//   contracter-dilater (#12) — chalouper (#83) — contamination du groove (#90) — couches désalignées (#50) —
//   dérive orientée (#56) — détaché (#85) — isopériodicité (#72) — additif (#10) — préaudibilité (#55) —
//   regroupement (#48) — retard / anticipation (#20) — respiration (#58, « souffle » chez jgcompose) — regrid
// ============================================================================================
import { finder, windowsOf, attenuate, isolate, holdSegs, cloneOf, clamp, median, gcd } from './ecritures2.js';

// pas premier avec n, à partir de p0 (jgcompose pas_copremier)
const coprime = (n, p0 = 3) => { let p = p0; while (n > 1 && gcd(p, n) !== 1) p++; return p; };
// k éléments sur n, par pas premier (aucun tirage) : les indices retenus
function pickCoprime (n, k, p0 = 3) { const out = new Set(), pas = coprime(n, p0); for (let j = 0; j < Math.min(n, k); ++j) { let q = (j * pas) % n; while (out.has(q)) q = (q + 1) % n; out.add(q); } return out; }
const endOf = (ev, q) => (q + 1 < ev.length ? ev[q + 1].s0 : ev[q].sN);

// RETIME — chaque attaque i sort à s0_i + δ_i (δ_n : décalage de la fin). L'événement i occupe la sortie
// [s0_i + δ_i, s0_{i+1} + δ_{i+1}] : plus court, sa fin est coupée ; plus long, sa fin est TENUE (relue ralentie)
function retime (P, ev, delta, H) {
  const n = ev.length, segs = [];
  let t = holdSegs(segs, 0, 0, ev[0].s0, ev[0].s0 + delta[0]);
  for (let i = 0; i < n; ++i) { const s0 = ev[i].s0, s1 = endOf(ev, i), L = (s1 + delta[i + 1]) - (s0 + delta[i]); t = holdSegs(segs, t, s0, s1, L); }
  const last = ev[n - 1].sN; if (last < P.n) { segs.push({ a: t, b: t + (P.n - last), sa: last, sb: P.n }); t += P.n - last; }
  return { map: new H.TimeMap(segs), D: Math.ceil(t) };
}
// un décalage n'est gardé que si chaque événement touché garde 30 ms (sinon il est abandonné, pas réduit)
function tryShift (ev, delta, i, d, MIN) {
  const lenThis = endOf(ev, i) + delta[i + 1] - (ev[i].s0 + delta[i] + d), lenPrev = i > 0 ? ev[i].s0 + delta[i] + d - (ev[i - 1].s0 + delta[i - 1]) : ev[i].s0 + delta[i] + d;
  if (lenThis < MIN || lenPrev < MIN) return false; delta[i] += d; return true;
}
// position d'une attaque dans la grille : distance (éch.) au point de grille le plus proche, et l'indice de ce point
function gridPos (g, s, step) { const x = (s - g.phase) / step, k = Math.round(x); return { k, off: s - (g.phase + k * step) }; }
// cycles du sujet, au moins minN : ses mesures au pouls, sinon ses temps, sinon ses énoncés (phrases, ou quatre parts) —
// un sujet de 1,6 s à 53 BPM n'a pas deux mesures (mesuré : additif, couches, dérive restaient muets sur la voix)
function cyclesOf (P, ctx, minN = 3) {
  const ev = ctx.ms.events, g = ctx.grid, a0 = ev[0].s0, a1 = ev[ev.length - 1].sN;
  if (g.has) for (const L of [g.bar, g.beat, g.beat / 2]) {
    if (L < 0.15 * P.sr) break;
    const out = []; let c = g.phase + Math.floor((a0 - g.phase) / L) * L;
    for (; c < a1 - 0.25 * L; c += L) out.push([Math.max(0, Math.round(c)), Math.min(P.n, Math.round(c + L))]);
    if (out.length >= minN) return out;
  }
  return windowsOf(P, ctx);
}

export const ECRITURES3 = {};

// ============================================================================================ TEMPS
// CONTRACTER-DILATER (#12) — accelerando ou ritardando ÉCRIT sur tout le sujet : les durées vont linéairement de
// ×(1 + a) à ×(1 − a) (a = 0,15 + 0,65·ι ; jgcompose : a = amount·0,8), l'étendue totale est préservée, les attaques simultanées
// le restent et les hauteurs ne bougent pas : accelerando (v0), ritardando (v1), le même geste recommencé à chaque énoncé
// (v2, la portée « motif »).
ECRITURES3.dilate = {
  kind: 'map', profile: [0.0, 0.9, 0.0, 0.6, 0.6, 0.0, 0.0, 0.0],
  relevance: T => { const m = T.ms; return m && m.nEvents >= 4 ? clamp(0.4 + 0.4 * Math.min(1, m.eventRate / 6), 0, 0.8) : 0; },
  make (P, ctx, iota, variant, H) {
    const ev = ctx.ms.events, n = ev.length, sr = P.sr; if (n < 4) return null;
    const v = variant % 3, a = (0.15 + 0.65 * iota) * (v === 1 ? -1 : 1);
    const spans = v === 2 ? windowsOf(P, ctx) : [[ev[0].s0, ev[n - 1].sN]];
    // W(s) = s0 + f0·x + (f1 − f0)·x²/(2L), x = s − s0 : l'image de chaque position source ; la carte en est l'inverse
    // (64 morceaux par fenêtre)
    const segs = []; let t = 0, prev = 0;
    for (const [s0, s1] of spans) {
      if (s0 > prev) { segs.push({ a: t, b: t + (s0 - prev), sa: prev, sb: s0 }); t += s0 - prev; }
      const L = s1 - s0, f0 = 1 + a, f1 = 1 - a, W = x => f0 * x + (f1 - f0) * x * x / (2 * L);
      for (let q = 0; q < 64; ++q) { const xa = L * q / 64, xb = L * (q + 1) / 64; segs.push({ a: t + W(xa), b: t + W(xb), sa: s0 + xa, sb: s0 + xb }); }
      t += W(L); prev = s1;
    }
    if (prev < P.n) { segs.push({ a: t, b: t + (P.n - prev), sa: prev, sb: P.n }); t += P.n - prev; }
    const map = new H.TimeMap(segs);
    return { desc: `${a > 0 ? 'accelerando' : 'ritardando'} written into the subject: durations ×${(1 + a).toFixed(2)} at the start, ×${(1 - a).toFixed(2)} at the end${v === 2 ? `, again in each of the ${spans.length} statements` : ''}, span kept`,
      apply (layers, D) { for (const S of layers) S.map = map; return { layers, D: Math.ceil(t) }; } };
  }
};

// CHALOUPER (#83) — au pouls : une part (0,4 + 0,6·ι, pas premier) des attaques — et pour (0,5 + 0,5·ι) du chemin — qui tombent sur la 2e croche de triolet
// (case 1 du temps en trois, jgcompose T = N/3) est renvoyée sur la 3e (case 2) : le temps « chaloupe » (v0) ; la même
// chose au demi-temps — le chaloupé serré (v1) ; le contraire, la case 2 ramenée en case 1 — le temps se raidit (v2). La note d'avant s'étend sur le temps gagné ; la grille ne bouge pas.
ECRITURES3.chalouper = {
  kind: 'map', profile: [0.0, 0.5, 0.0, 1.0, 0.2, 0.2, 0.0, 0.0],
  relevance: T => { const m = T.ms; return m && T.tempoBpm > 0 && m.nEvents >= 4 ? 0.65 : 0; },
  make (P, ctx, iota, variant, H) {
    const g = ctx.grid; if (!g.has) return null;
    const ev = ctx.ms.events, n = ev.length, sr = P.sr; if (n < 4) return null;
    const v = variant % 3, N = v === 1 ? g.beat / 2 : g.beat, T3 = N / 3, MIN = 0.03 * sr;
    if (N < 0.12 * sr) return null;
    const cand = [];
    ev.forEach((e, i) => {
      const r = (((e.s0 - g.phase) % N) + N) % N;
      if (v !== 2 && r >= N / 6 && r < N / 2) cand.push([i, 2 * T3 - r]);
      if (v === 2 && r >= N / 2 && r < 5 * N / 6) cand.push([i, T3 - r]);
    });
    if (!cand.length) return null;
    const pick = pickCoprime(cand.length, Math.max(1, Math.round(cand.length * (0.4 + 0.6 * iota))));
    const delta = new Float64Array(n + 1); let moved = 0;
    [...pick].sort((x, y) => x - y).forEach(j => { const [i, d0] = cand[j], d = d0 * (0.5 + 0.5 * iota); if (Math.abs(d) > 0.002 * sr && tryShift(ev, delta, i, d, MIN)) moved++; });
    if (!moved) return null;
    const { map, D: Dm } = retime(P, ev, delta, H);
    return { desc: `chaloupé: ${moved} of ${cand.length} attacks ${['moved from the 2nd to the 3rd triplet eighth', 'moved from the 2nd to the 3rd triplet sixteenth (half-beat sway)', 'pulled back from the 3rd to the 2nd triplet eighth'][v]}`,
      apply (layers, D) { for (const S of layers) S.map = map; return { layers, D: Dm }; } };
  }
};

// CONTAMINATION DU GROOVE (#90) — le micro-timing ATTESTÉ du sujet (l'écart de chaque attaque au point de grille le plus
// proche) devient la loi : exagéré (×(1,5 + ι), jgcompose ×1,5) (v0) ; retourné — ce qui traînait anticipe (×−(0,5 + ι))
// (v1) ; le gabarit de groove mesuré par position de tatum (grid.offs), doublé, imposé à toutes les attaques (chacune y va
// pour 0,3 + 0,7·ι du chemin) (v2). Sans
// pouls, ou sur un sujet exactement sur la grille, rien (jgcompose : no-op et remarque).
ECRITURES3.groove = {
  kind: 'map', profile: [0.0, 0.4, 0.0, 0.9, 0.2, 0.4, 0.0, 0.0],
  relevance: T => { const m = T.ms; return m && T.tempoBpm > 0 && m.nEvents >= 4 ? 0.6 : 0; },
  make (P, ctx, iota, variant, H) {
    const g = ctx.grid; if (!g.has) return null;
    const ev = ctx.ms.events, n = ev.length, sr = P.sr; if (n < 4) return null;
    const v = variant % 3, U = g.tatum, MIN = 0.03 * sr, delta = new Float64Array(n + 1);
    const offs = ev.map(e => gridPos(g, e.s0, U));
    const med = median(offs.map(o => Math.abs(o.off)));
    if (v !== 2 && med < 0.002 * sr) return null;
    let moved = 0;
    ev.forEach((e, i) => {
      let d;
      if (v === 0) d = offs[i].off * (0.5 + iota);
      else if (v === 1) d = -offs[i].off * (1.5 + iota);
      else { const pos = ((offs[i].k % g.m) + g.m) % g.m, tgt = 2 * (g.offs[pos] || 0); d = (0.3 + 0.7 * iota) * (tgt - offs[i].off); }
      d = clamp(d, -0.45 * U, 0.45 * U);
      if (Math.abs(d) > 0.001 * sr && tryShift(ev, delta, i, d, MIN)) moved++;
    });
    if (!moved) return null;
    const { map, D: Dm } = retime(P, ev, delta, H);
    return { desc: `groove contamination: ${['the subject\'s own micro-timing exaggerated', 'the micro-timing turned round (what dragged now pushes)', 'the measured groove template imposed on every attack'][v]} (${moved} attacks, median offset ${(1000 * med / sr).toFixed(1)} ms)`,
      apply (layers, D) { for (const S of layers) S.map = map; return { layers, D: Dm }; } };
  }
};

// COUCHES DÉSALIGNÉES (#50) — la cellule du sujet (sa première mesure au pouls, sinon sa première phrase) devient une boucle
// dans chaque voix (familles de partiels, voix ou bandes), re-étirée pour durer m temps : m en cycle dans [4, 5, 7] (v0),
// [4, 3, 5] (v1), [4, 7, 9] (v2) ; la voix liante (la première) reste à 4 — les couches se désalignent et ne se
// retrouvent qu'au plus petit commun multiple. Le dosage règle l'écart (m − 4)·(0,25 + 0,75·ι). Cellule trop longue pour le sujet → deux temps, puis un temps.
ECRITURES3.couches = {
  kind: 'multmap', layers: 3, profile: [0.0, 0.8, 0.5, 0.8, 0.6, 0.0, 0.0, 0.2],
  relevance: T => { const m = T.ms; if (!m || m.strata < 2 || m.nEvents < 3) return 0; return m.nEvents >= 4 && T.tempoBpm > 0 ? 0.6 : m.nPhrases >= 2 ? 0.45 : 0.35; },
  make (P, ctx, iota, variant, H) {
    const st = ctx.ms.strata, L = st.list.slice(0, 3), M = L.length; if (M < 2) return null;
    const ev = ctx.ms.events, n = ev.length, sr = P.sr, g = ctx.grid; if (n < 4) return null;
    // la cellule : la première mesure qui tient dans le sujet, sinon deux temps, sinon un temps (« m temps » = m quarts
    // de cellule) ; sans pouls, la première phrase
    let c0 = -1, c1 = -1, beat = 0;
    if (g.has) for (const [L, q] of [[g.bar, g.beat], [2 * g.beat, g.beat / 2], [g.beat, g.beat / 4]]) {
      let a = g.phase + Math.floor((ev[0].s0 - g.phase) / L) * L; if (a < 0) a += L;
      if (a + L <= P.n && L >= 0.2 * sr) { c0 = a; c1 = a + L; beat = q; break; }
    }
    if (c0 < 0 && ctx.ms.phrases.length >= 2) { const ph = ctx.ms.phrases[0]; c0 = ev[ph.a].s0; c1 = ev[ph.b].sN; beat = (c1 - c0) / 4; }
    // ni mesure, ni temps, ni deux phrases : la première moitié de la zone active (au moins 0,3 s)
    if (c0 < 0) { c0 = ev[0].s0; c1 = Math.min(P.n, c0 + Math.max(0.3 * sr, (ev[n - 1].sN - c0) / 2)); beat = (c1 - c0) / 4; }
    if (c0 < 0 || c1 - c0 < 0.2 * sr || c1 > P.n) return null;
    // dosage : l'écart à la voix liante, (m − 4)·(0,25 + 0,75·ι) — la vitesse du déphasage
    const v = variant % 3, ms = [[4, 5, 7], [4, 3, 5], [4, 7, 9]][v].map((m, i) => (i === 0 ? 4 : 4 + (m - 4) * (0.25 + 0.75 * iota)));
    const span = Math.max(P.n, c1 - c0), maps = ms.slice(0, M).map(m => {
      const len = m * beat, segs = []; let t = 0;
      while (t < span) { segs.push({ a: t, b: t + len, sa: c0, sb: c1 }); t += len; }
      return new H.TimeMap(segs);
    });
    return { desc: `misaligned layers: the ${((c1 - c0) / sr).toFixed(2)} s cell loops in each voice over ${ms.slice(0, M).map(m => m.toFixed(1)).join(', ')} beats (${L.map(f => f.name).join(', ')})`,
      apply (layers, D) {
        const out = [];
        for (const S0 of layers) L.forEach((fam, i) => { const S = cloneOf(S0); S.map = maps[i]; S.name = (S0.name || '') + ' ' + fam.name; isolate(S, st, i, P); out.push(S); });
        return { layers: out, D: Math.max(D, Math.ceil(span)) };
      } };
  }
};

// DÉRIVE ORIENTÉE (#56) — jgcompose : une boucle attestée glisse d'un pas de plus à chaque retour, par rapport au reste qui
// garde la grille. Ici une VOIX du sujet (famille de partiels, voix réelle ou bande) dérive d'énoncé en énoncé pendant que
// les autres gardent leur place : le k-ième énoncé de cette voix sort k pas plus tard — la voix aiguë (entre vraies voix :
// la principale) traîne (v0) ; la grave (la seconde) prend de l'avance, son énoncé mord sur la fin du précédent, coupée
// (v1) ; l'une traîne et l'autre devance (v2) — un phasing écrit. Pas = un tatum × (0,5 + ι) (sans pouls, 60 ms × (0,5 + ι)), jamais plus de 40 % de l'écart
// le plus court entre deux énoncés. (Sur le son entier, la dérive n'était qu'un ralenti uniforme : rien ne la mesurait.)
ECRITURES3.derive = {
  kind: 'multmap', layers: 3, profile: [0.0, 0.7, 0.2, 0.7, 0.7, 0.0, 0.0, 0.3],
  relevance: T => { const m = T.ms; return m && m.nEvents >= 4 && m.strata >= 2 ? 0.5 + (m.nPhrases >= 3 ? 0.15 : 0) : 0; },
  make (P, ctx, iota, variant, H) {
    const st = ctx.ms.strata, M = st.list.length; if (M < 2) return null;
    let W = windowsOf(P, ctx); if (W.length < 3) W = cyclesOf(P, ctx, 3); if (W.length < 3) return null;
    const sr = P.sr, v = variant % 3;
    let gapMin = Infinity; for (let k = 1; k < W.length; ++k) gapMin = Math.min(gapMin, W[k][0] - W[k - 1][0]);
    const step = Math.min(0.4 * gapMin, Math.max(0.01 * sr, (ctx.grid.has ? ctx.grid.tatum : 0.06 * sr) * (0.5 + iota)));
    // carte d'une voix qui dérive de sgn·k·pas : chaque énoncé k sort à a_k + sgn·k·pas ; entre deux sorties, la source
    // [a_k, a_{k+1}) est relue : coupée (il arrive tôt) ou tenue à partir de ses 120 dernières ms (il arrive tard)
    const driftMap = sgn => {
      const segs = [], O = W.map(([a], k) => a + sgn * k * step); let t = 0;
      if (W[0][0] > 0) { segs.push({ a: 0, b: W[0][0], sa: 0, sb: W[0][0] }); t = W[0][0]; }
      for (let k = 0; k < W.length; ++k) {
        const a = W[k][0], b = W[k][1], s1 = k + 1 < W.length ? W[k + 1][0] : P.n, L = k + 1 < W.length ? O[k + 1] - O[k] : s1 - a;
        t = holdSegs(segs, t, a, s1, L, Math.max(a + 1, Math.min(b, s1) - 0.12 * sr));
      }
      return { map: new H.TimeMap(segs), D: Math.ceil(t) };
    };
    // qui dérive : la voix aiguë / la grave (familles de partiels, bandes) ; entre vraies voix, la voix principale / la seconde
    // (mesuré : la seconde voix seule, trop faible, ne dérivait qu'à 1,5 dB du sujet)
    const [A0, B0] = st.kind === 'voices' ? [0, 1] : [M - 1, 0], movers = v === 0 ? [[A0, 1]] : v === 1 ? [[B0, -1]] : [[A0, 1], [B0, -1]];
    const maps = movers.map(([i, sg]) => ({ i, sg, ...driftMap(sg) }));
    const still = st.list.map((_, i) => i).filter(i => !movers.some(([j]) => j === i));
    const tot = ((W.length - 1) * step / sr * 1000).toFixed(0);
    return { desc: `oriented drift over ${W.length} statements: ${maps.map(m => `${st.list[m.i].name} ${m.sg > 0 ? 'later' : 'earlier'} by one more step each time`).join(', ')} (${(step / sr * 1000).toFixed(0)} ms, ${tot} ms in all) while the rest keeps its place`,
      apply (layers, D) {
        const out = [];
        for (const S0 of layers) {
          const A = cloneOf(S0); for (const m of maps) attenuate(A, st, m.i, () => -60, P); A.name = (S0.name || '') + ' ' + still.map(i => st.list[i].name).join('+'); out.push(A);
          for (const m of maps) { const B = cloneOf(S0); B.map = m.map; isolate(B, st, m.i, P); B.name = (S0.name || '') + ' ' + st.list[m.i].name + ' drift'; out.push(B); }
        }
        return { layers: out, D: Math.max(D, ...maps.map(m => m.D)) };
      } };
  }
};

// DÉTACHÉ (#85, refait V6.4) — chaque événement long (≥ 0,6 s) est rejoué en coups d'archet séparés.
// V6.4 — Mat : « des coups nets sans sens musical, par exemple sur le détaché ». La v6.3 ré-attaquait tous les P (de 1,10 à
// 0,42 s, jgcompose), sans rapport avec le temps du sujet, chaque reprise relisant l'attaque à son niveau plein (−1,1 dB)
// même là où la note s'était éteinte de 20 dB — des frappes qui tombaient n'importe où et trop fort. Désormais :
//   • les coups sont sur le TEMPS du sujet (sa grille, son micro-groove) : un temps, un demi, un quart — en subdivisant
//     progressivement au fil du sujet (v0), en élargissant (v1), au temps (v2 ; au demi-temps à forte dose) ; un coup ne
//     dure jamais moins de 0,1 s ;
//   • chaque coup relit l'attaque de la note (son articulation à elle) et sonne au NIVEAU où la note en est à cet instant
//     (son enveloppe relevée, rapportée à sa crête d'attaque, × 0,8 : le coup d'archet relance un peu) — le détaché suit la
//     dynamique de la phrase ;
//   • entre deux coups, la séparation d'un changement d'archet : 10 % du coup (12 à 60 ms), la fin du coup s'éteignant aux
//     vitesses du sujet (garde d'enveloppe).
ECRITURES3.detache = {
  kind: 'map', profile: [0.1, 0.5, 0.2, 0.9, 0.3, 0.3, 0.0, 0.0],
  relevance: T => { const m = T.ms; return m && m.nEvents >= 1 && (m.maxDur || 0) >= 0.6 ? clamp(0.3 + 0.6 * (m.longShare || 0) + (m.meanDur > 0.6 ? 0.15 : 0), 0, 0.85) : 0; },
  make (P, ctx, iota, variant, H) {
    const ev = ctx.ms.events, n = ev.length, sr = P.sr; if (!n) return null;
    const v = variant % 3, g = ctx.grid, beat = g.beat, A0 = ev[0].s0, A1 = ev[n - 1].sN;
    const Bk = Math.round(0.01 * sr), env = P.env, eAt = s => env[clamp(Math.floor(s / Bk), 0, env.length - 1)];
    const strokeAt = s => {
      const u = clamp((s - A0) / Math.max(1, A1 - A0), 0, 0.999), lv = v === 0 ? Math.floor(3 * u) : v === 1 ? 2 - Math.floor(3 * u) : (iota > 0.6 ? 1 : 0);
      return Math.max(0.1 * sr, beat / Math.pow(2, lv));
    };
    // (V6.4) la SÉPARATION entre deux coups est celle du sujet : ce que son niveau perd juste avant une attaque qui suit une
    // note (le coup de langue, le changement d'archet du sujet lui-même — médiane des creux, mesurés entre le niveau de la note
    // 150 à 80 ms avant l'attaque et le minimum des 80 ms qui la précèdent) ; sans transition mesurable, 12 dB. Les coups
    // s'enchaînent sans silence de la carte : le niveau creuse de cette profondeur pendant la séparation, aux vitesses du sujet
    // (garde d'enveloppe), puis le coup repart de son attaque. (Mesuré : séparations taillées dans la carte, 12 à 60 ms de
    // silence vrai, la note s'y coupait de 47 dB en 20 ms — trompette, 1 à 6 arrêts par variante, aucun en v6.3.)
    const dips = [];
    for (let q = 1; q < n; ++q) {
      const s0 = ev[q].s0; if (ev[q - 1].sN < s0 - 0.05 * sr || s0 - ev[q - 1].s0 < 0.2 * sr) continue;
      let sus = -200, mn = 200; for (let s = s0 - 0.15 * sr; s < s0 - 0.08 * sr; s += Bk) sus = Math.max(sus, eAt(s)); for (let s = s0 - 0.08 * sr; s < s0; s += Bk) mn = Math.min(mn, eAt(s));
      if (sus > -150) dips.push(clamp(sus - mn, 0, 40));
    }
    dips.sort((x, y) => x - y);
    const dipDb = dips.length >= 2 ? clamp(dips[dips.length >> 1], 3, 30) : 12;
    const segs = [], gains = []; let nRe = 0;
    if (A0 > 0) segs.push({ a: 0, b: A0, sa: 0, sb: A0 });
    for (let q = 0; q < n; ++q) {
      const s0 = ev[q].s0, s1 = endOf(ev, q), dur = s1 - s0;
      if (dur < 0.6 * sr) { segs.push({ a: s0, b: s1, sa: s0, sb: s1 }); continue; }
      let pk = -200; for (let s = s0; s < Math.min(s1, s0 + 0.06 * sr); s += Bk) pk = Math.max(pk, eAt(s));
      // les coups : sur la grille (phase du pouls), le premier au premier point de grille qui laisse au moins un demi-coup
      let a = s0; const starts = [s0];
      for (;;) { const L = strokeAt(a), nx = g.phase + Math.ceil((a + 0.5 * L - g.phase) / L) * L; if (nx > s1 - 0.1 * sr) break; starts.push(nx); a = nx; }
      // le gain d'un coup est posé dès la séparation qui le précède (la carte s'y tait) : la garde d'enveloppe, qui limite la
      // vitesse des gains, n'a pas à le faire descendre PENDANT l'attaque du coup
      let prevEnd = s0;
      for (let z = 0; z < starts.length; ++z) {
        const a0 = starts[z], b0 = z + 1 < starts.length ? starts[z + 1] : s1, L = b0 - a0, sep = z + 1 < starts.length ? clamp(0.1 * L, 0.012 * sr, 0.06 * sr) : 0, len = Math.max(0.02 * sr, L - sep);
        segs.push(z > 0 ? { a: a0, b: b0, sa: s0, sb: s0 + L, stroke: true } : { a: a0, b: b0, sa: s0, sb: s0 + L });
        const gz = z > 0 ? clamp(0.8 * (eAt(a0) - pk), -30, 0) : 0;
        if (z > 0) { nRe++; gains.push([prevEnd, a0 + len, gz]); }
        if (sep > 0) gains.push([a0 + len, b0, gz - dipDb]);
        prevEnd = a0 + len;
      }
    }
    const last = ev[n - 1].sN; if (last < P.n) segs.push({ a: last, b: P.n, sa: last, sb: P.n });
    if (!nRe) return null;
    const map = new H.TimeMap(segs);
    const gAt = t2 => { let lo = 0, hi = gains.length - 1; while (lo <= hi) { const m = (lo + hi) >> 1; if (t2 < gains[m][0]) hi = m - 1; else if (t2 >= gains[m][1]) lo = m + 1; else return gains[m][2]; } return 0; };
    const mean = gains.length ? gains.reduce((a2, x) => a2 + x[2], 0) / gains.length : 0;
    return { desc: `détaché: long notes played in separate bow strokes on the subject's beat (${['beat, then half, then quarter', 'quarter, then half, then beat', iota > 0.6 ? 'half-beats' : 'beats'][v]}; ${nRe} strokes, each at the level the note has reached, ${mean.toFixed(1)} dB on average; between them the subject's own separation, ${dipDb.toFixed(0)} dB)`,
      apply (layers, D) { for (const S of layers) { S.map = map; S.gainDb.push(t2 => gAt(t2)); } return { layers, D }; } };
  }
};

// ISOPÉRIODICITÉ (#72) — chaque voix rejoue en boucle, à sa propre période, une CELLULE du sujet : 8, 4, 2 quarts de module
// (v0), 7, 5, 3 — des rapports premiers entre eux (v1), 4, 3, 2 (v2) ; le module : deux temps au pouls (jgcompose), sinon deux
// écarts médians d'attaques ; dosage : module × (0,5 + 0,5·ι) ; jamais moins de 0,12 s. Les voix ne se retrouvent qu'aux
// multiples communs de leurs périodes.
// (V6.4 — Mat : « des boucles peu intéressantes ; elles devraient s'inspirer de la morphologie du sample de base et surtout
// être beaucoup plus complexes ». En v6.2–6.3 chaque voix relisait les six premiers événements, toujours dans le même ordre,
// sur leurs écarts mis à l'échelle : une cellule identique à chaque tour.) Chaque voix est maintenant une boucle
// ISORYTHMIQUE (talea / color, Machaut, Messiaen) tirée de la morphologie du sujet :
//   • COLOR — les événements qu'elle rejoue, choisis pour leur DIFFÉRENCE de morphologie (durée de leur son, force, hauteur,
//     attaque raide ou non : le plus fort d'abord, puis chaque fois le plus éloigné de ceux déjà pris), dans leur ordre du
//     sujet ; 5, 7, 3 événements selon la voix (toujours premiers avec la talea) ;
//   • TALEA — ses durées : une suite d'écarts d'attaques RÉELS du sujet (3, 4, 5 selon la voix, prise à un autre endroit pour
//     chaque voix), mise à l'échelle de la période de la voix ;
//   • la color et la talea n'ont pas la même longueur : la voix ne revient au même (événement, durée) qu'après color × talea
//     cases (15, 28, 15) ; et à chaque grand retour la color tourne d'un cran — la boucle se transforme en restant elle-même ;
//   • chaque case relit son événement depuis l'attaque, pas plus longtemps que le son de l'événement (sa fin réelle, 30 dB sous
//     sa crête) : un son court laisse un silence, un son long est coupé par l'attaque suivante (garde d'enveloppe).
// Les bornes suivent le micro-groove du sujet ; chaque voix sonne dans sa strate (famille de partiels, bande).
// (V6.4 — Mat : « quand je baisse Isoperiodicity à zéro, j'ai toujours cette transformation active, et rien ne se passe ».
// La dose ne faisait que raccourcir le module (× 0,5 à × 1) : de 60 % à 0 %, des boucles toujours là, un peu plus rapides.)
// Sous la dose calculée, la dose dit QUAND les voix tombent dans leurs boucles : le sujet est d'abord lu tel quel, puis, à
// l'attaque la plus proche de la part (1 − dose ÷ dose calculée) de sa zone active, chaque voix se fige dans sa boucle ; à la
// dose calculée, dès la première attaque (le mummer d'origine) ; vers 0 %, de plus en plus tard — à 0 % le gène est éteint.
// Au-dessus de la dose calculée, comme avant : des cellules plus longues.
// (V6.9.2 — Mat : « l'isopériodicité est encore très cyclique, il faudrait quelque chose de plus complexe et moins attendu ».
// Mesuré sur la v6.4–6.9 : le RYTHME de chaque voix revenait à l'identique toutes les 3 à 6 frappes — 0,6 à 3,1 s (boucle de
// percussion : 1,2 et 0,6 s ; exemple à 120 : 1,35 à 3,1 s ; ligne mélodique : 1,2 à 2,4 s) ; seuls les événements tournaient,
// et les périodes 8:4:2 recalaient les voix sur la plus lente. Choisi par Mat : les deux procédés de Messiaen ensemble.)
//   • INTERVERSIONS — à chaque tour, la talea est relue dans un autre ordre : des bords vers le centre (dernière, première,
//     avant-dernière, deuxième…), cette permutation appliquée une fois de plus à chaque tour ; l'ordre de départ ne revient
//     qu'après l'ordre de la permutation (3 tours pour 3 ou 4 durées, 5 pour 5, 6 pour 6 — calculé ci-dessous, orderOf) ;
//   • PÉRIODES — chaque voix boucle sur la somme RÉELLE de ses durées (3, 4, 5 écarts d'attaques du sujet pris à des endroits
//     différents), à une même échelle pour toutes : leurs rapports sont ceux des phrases du sujet (6:7:9 doubles-croches, par
//     exemple), plus des 8:4:2 qui se recalaient à chaque période de la plus lente ; l'échelle est la proportion simple la
//     plus proche de la dose (½, ⅔, ¾, 1 — la grille du sujet reste la grille) ;
//   • PERSONNAGES RYTHMIQUES (Le Sacre, analysé par Messiaen) — une voix GRANDIT : à chaque tour sa plus courte durée prend
//     une unité de plus ; une RAPETISSE : sa plus longue en perd une (jamais sous la moitié de sa valeur d'origine ni sous
//     60 ms) ; la troisième reste IMMOBILE. L'unité : le tatum du sujet (sans pouls, le quart de son écart médian), divisé
//     (par 2, ou par 3 sur une battue ternaire) tant qu'il dépasse la moitié de la plus courte durée — la grille du sujet,
//     plus fine. À sa borne (le double de sa période d'origine, ou la moitié) un personnage change de rôle : celui qui
//     grandissait rapetisse, et inversement — ils ne se figent jamais. L'immobile prend la talea la plus longue (5 durées :
//     son ordre ne revient qu'après 5 tours, 25 frappes), celui qui grandit 3, celui qui rapetisse 4. Qui grandit, qui
//     rapetisse : selon la variante (grave / médium / aigu).
// Rien n'est tiré au hasard : la même troupe revient toujours à l'identique.
const INTERVERT = T => { const o = []; for (let a = 0, b = T - 1; a <= b; ) { o.push(b--); if (a <= b) o.push(a++); } return o; };
ECRITURES3.isoperiode = {
  kind: 'multmap', layers: 3, profile: [0.0, 0.9, 0.4, 0.9, 0.5, 0.0, 0.0, 0.1],
  relevance: T => { const m = T.ms; return m && m.strata >= 2 && m.nEvents >= 3 ? 0.5 + (T.tempoBpm > 0 ? 0.15 : 0) : 0; },
  make (P, ctx, iota, variant, H) {
    const st = ctx.ms.strata, L = st.list.slice(0, 3), M = L.length; if (M < 2) return null;
    const ev = ctx.ms.events, n = ev.length, sr = P.sr; if (n < 3) return null;
    const iois = []; for (let i = 1; i < n; ++i) iois.push(ev[i].s0 - ev[i - 1].s0);
    const v = variant % 3, c0 = ev[0].s0, span = P.n, act = ev[n - 1].sN - c0;
    // (V6.4) où les voix tombent dans leurs boucles : la première attaque à partir de la part (1 − amt) de la zone active
    const amt = clamp(ctx.amt ?? 1, 0, 1), qs = amt >= 1 ? 0 : ev.findIndex(e => e.s0 >= c0 + (1 - amt) * act);
    if (qs < 0 || qs >= n - 1) return null;
    const ts = ev[qs].s0;
    // la morphologie de chaque événement : durée de son son (log), force, hauteur, attaque raide
    const snd = q => Math.max(0.02 * sr, Math.min(ev[q].s1, endOf(ev, q)) - ev[q].s0);
    const feat = ev.map((e, q) => [Math.log2(snd(q) / sr) / 3, e.loud / 20, e.f0 > 0 ? (e.cents - (P.fundamentalCents ?? 6000)) / 1200 : -1, e.sharp ? 1 : 0]);
    const dist2 = (a, b) => a.reduce((s2, x, i) => s2 + (x - b[i]) ** 2, 0);
    const pickColor = (cn, avoid) => {
      // le plus fort que les voix précédentes n'ont pas pris (tous pris : le plus fort tout court — un sujet de trois événements)
      let first = ev.reduce((bi, e, q) => (avoid.has(q) ? bi : bi < 0 || e.loud > ev[bi].loud ? q : bi), -1);
      if (first < 0) first = ev.reduce((bi, e, q) => (e.loud > ev[bi].loud ? q : bi), 0);
      const got = [first];
      while (got.length < Math.min(cn, n)) { let bq = -1, bd = -1; for (let q = 0; q < n; ++q) { if (got.includes(q)) continue; const d = Math.min(...got.map(g => dist2(feat[q], feat[g]))) * (avoid.has(q) ? 0.5 : 1); if (d > bd) { bd = d; bq = q; } } if (bq < 0) break; got.push(bq); }
      return got.sort((a, b) => a - b);
    };
    // la talea de chaque voix : 3, 4, 5 écarts RÉELS du sujet, pris à des endroits différents ; sa période en est la somme
    // les personnages : 1 grandit, −1 rapetisse, 0 immobile (selon la variante) ; la longueur de la talea suit le rôle
    const ROLE = [[1, 0, -1], [-1, 1, 0], [0, -1, 1]][v], TROLE = { 1: 3, '-1': 4, 0: 5 };
    const CN = [5, 7, 3], used = new Set(), warp = ctx.grid.warp;
    const plans = L.map((f, vi) => {
      const color = pickColor(CN[vi], used); color.forEach(q => used.add(q));
      const off = (vi * Math.max(1, Math.floor((iois.length) / (M + 1)))) % iois.length, tn = Math.min(TROLE[ROLE[vi]], iois.length);
      const talea = Array.from({ length: tn }, (_, j) => iois[(off + j) % iois.length]);
      return { color, talea, sum: talea.reduce((a, b) => a + b, 0) };
    });
    // l'échelle commune : la proportion simple la plus proche de la dose (½ ⅔ ¾ 1 ; au-dessus de la dose calculée, des
    // cellules plus longues : 1¼ 1½ 2), divisée par deux tant que la plus longue période dépasse les ¾ de la zone active
    const want = 0.5 + 0.5 * iota, SC = [0.5, 2 / 3, 0.75, 1, 1.25, 1.5, 2];
    let sc = SC.reduce((b, x) => (Math.abs(Math.log(x / want)) < Math.abs(Math.log(b / want)) ? x : b), 1);
    const longest = Math.max(...plans.map(pl => pl.sum)), shortestStroke = Math.min(...plans.map(pl => Math.min(...pl.talea)));
    while (longest * sc > 0.75 * act && shortestStroke * sc / 2 >= 0.06 * sr) sc /= 2;
    let unit = ctx.grid.has ? ctx.grid.tatum : median(iois) / 4;
    const div = ctx.grid.has && ctx.grid.m % 3 === 0 ? 3 : 2;
    while (unit > 0.5 * shortestStroke * sc && unit / div >= 0.03 * sr) unit /= div;
    unit = Math.max(0.03 * sr, unit);
    const roleName = r => (r > 0 ? 'grows' : r < 0 ? 'shrinks' : 'stays');
    // l'ordre d'une permutation (le nombre de tours avant que l'ordre de départ revienne)
    const orderOf = T => { const pi = INTERVERT(T); let cur = pi.slice(), k = 1; while (k < 64 && cur.some((x, i) => x !== i)) { cur = cur.map(i => pi[i]); k += 1; } return k; };
    // (V6.4) une cellule enchaîne la suivante sans silence (le legato de la v6.3) ; quand la suivante entre plus bas (6 dB et
    // plus), la cellule s'éteint aux temps du sujet : la suivante commence d'autant plus tard (au plus la moitié de sa durée)
    // et la traîne de relâchement remplit le silence (mesuré : violoncelle « la cour »,
    // 4 à 6 arrêts imposés par variante — −25 dB en 15 ms sur un son qui continuait —, la v6.3 aucun)
    const Bk = Math.round(0.01 * sr), lvl = x => (P.env ? P.env[clamp(Math.floor(x / Bk), 0, P.env.length - 1)] : 0);
    const Rel = clamp(2 * ((ctx.envp && ctx.envp.relMs) || 200), 60, 600) / 1000 * sr;
    const stats = [];
    const maps = plans.map(({ color, talea }, vi) => {
      const segs = [], C = color.length, T = talea.length, pi = INTERVERT(T), role = ROLE[vi];
      const tal = talea.map(x => Math.max(0.03 * sr, x * sc)), orig = tal.slice(), per0 = orig.reduce((a, b) => a + b, 0);
      const floorOf = i => Math.max(0.06 * sr, 0.5 * orig[i]);
      let order = Array.from({ length: T }, (_, i) => i), t = ts, raw = ts, j = 0, pass = 0, grown = 0, swaps = 0, live = role;
      if (ts > 0) segs.push({ a: 0, b: ts, sa: 0, sb: ts });
      let pv = null;
      while (t < span) {
        const k = j - pass * T;
        if (k >= T) {
          // fin d'un tour : la talea relue dans l'ordre suivant (interversion) ; le personnage grandit / rapetisse d'une unité
          pass += 1; order = order.map(i => pi[i]);
          const per = tal.reduce((a, b) => a + b, 0);
          // à sa borne, le personnage change de rôle (il ne se fige pas)
          if (live > 0 && per + unit > 2 * per0) { live = -1; swaps += 1; }
          else if (live < 0) { let m = 0; tal.forEach((x, i) => { if (x > tal[m]) m = i; }); if (per - unit < 0.5 * per0 || tal[m] - unit < floorOf(m)) { live = 1; swaps += 1; } }
          if (live > 0) { let m = 0; tal.forEach((x, i) => { if (x < tal[m]) m = i; }); tal[m] += unit; grown += 1; }
          else if (live < 0) { let m = 0; tal.forEach((x, i) => { if (x > tal[m]) m = i; }); if (tal[m] - unit >= floorOf(m)) { tal[m] -= unit; grown += 1; } }
          continue;
        }
        const rot = Math.floor(j / (C * T)), q = color[(j + rot) % C], slot = tal[order[k]], s0 = ev[q].s0;
        raw += slot; const tb = Math.max(t + 0.02 * sr, warp(raw)); let a = t, sa = s0, len = Math.min(tb - t, P.n - s0);
        if (pv && pv.b >= t - 1 && lvl(s0) < lvl(pv.sb - 1) - 6) { const d = Math.min(Rel, 0.5 * len); a += d; sa += d; len -= d; }
        if (len > 0) { const g = { a, b: a + len, sa, sb: sa + len }; segs.push(g); pv = g; }
        t = tb; j += 1;
      }
      stats.push({ per0: per0 / sr, T, C, back: orderOf(T), role, steps: grown, swaps, perEnd: tal.reduce((a, b) => a + b, 0) / sr });
      return new H.TimeMap(segs);
    });
    const frac = { 0.5: '½', [2 / 3]: '⅔', 0.75: '¾', 1: '1', 1.25: '1¼', 1.5: '1½', 2: '2' }[sc] || sc.toFixed(3);
    return { desc: `isoperiodicity: ${ts > c0 ? `the subject read as it is until ${(ts / sr).toFixed(2)} s, then ` : ''}each voice an isorhythmic loop of the subject on its own durations (× ${frac}), read in a new order at every pass (interversions) — ${L.map((f, i) => { const z = stats[i]; return `${f.name} every ${z.per0.toFixed(2)} s, ${z.C} contrasting events over ${z.T} durations, their first order back after ${z.back} passes, ${roleName(z.role)}${z.role ? ` (${z.steps} step${z.steps === 1 ? '' : 's'} of ${(unit / sr * 1000).toFixed(0)} ms${z.swaps ? `, roles swapped ${z.swaps}×` : ''}, ${z.perEnd.toFixed(2)} s at the end)` : ''}`; }).join('; ')}`,
      apply (layers, D) {
        const out = [];
        for (const S0 of layers) L.forEach((fam, i) => { const S = cloneOf(S0); S.map = maps[i]; S.name = (S0.name || '') + ' ' + fam.name; isolate(S, st, i, P); out.push(S); });
        return { layers: out, D };
      } };
  }
};

// ADDITIF (#10) — le cycle du sujet (sa mesure au pouls, sinon son temps, sinon ses énoncés) revient chaque fois PLUS LONG
// d'une unité u (u = (0,04 + 0,16·ι) cycle, soit 0,16 à 0,8 temps pour une mesure à quatre temps) : la répétition k dure P + u·k, tout y est relu étiré, une tenue qui traverse le joint s'étire
// avec (v0) ; SOUSTRACTIF : chaque fois plus courte, la fin coupée, jamais avant la dernière attaque intérieure (v1) ;
// additif par la FIN seulement — la dernière note de chaque cycle s'allonge, le reste ne bouge pas (v2).
ECRITURES3.additif = {
  kind: 'map', profile: [0.0, 0.8, 0.0, 0.7, 0.8, 0.0, 0.0, 0.0],
  relevance: T => { const m = T.ms; return m && m.nEvents >= 4 && (T.tempoBpm > 0 || m.nPhrases >= 3) ? 0.6 : 0; },
  make (P, ctx, iota, variant, H) {
    const ev = ctx.ms.events, n = ev.length, sr = P.sr, g = ctx.grid; if (n < 4) return null;
    const W = cyclesOf(P, ctx, 3);
    if (W.length < 2) return null;
    const v = variant % 3, u = (0.04 + 0.16 * iota) * median(W.map(([a, b]) => b - a));
    const segs = []; let t = 0, prev = 0;
    W.forEach(([a, b], k) => {
      if (a > prev) { segs.push({ a: t, b: t + (a - prev), sa: prev, sb: a }); t += a - prev; }
      const len = b - a, inner = ev.filter(e => e.s0 > a && e.s0 < b), lastIn = inner.length ? inner[inner.length - 1].s0 : a;
      if (v === 0) { const Lk = len + u * k; segs.push({ a: t, b: t + Lk, sa: a, sb: b }); t += Lk; }
      else if (v === 1) { const Lk = Math.max(lastIn - a + 0.03 * sr, len - u * k); segs.push({ a: t, b: t + Math.min(len, Lk), sa: a, sb: a + Math.min(len, Lk) }); t += Math.min(len, Lk); }
      else { t = holdSegs(segs, t, a, b, len + u * k, lastIn); }
      prev = b;
    });
    if (prev < P.n) { segs.push({ a: t, b: t + (P.n - prev), sa: prev, sb: P.n }); t += P.n - prev; }
    const map = new H.TimeMap(segs.filter(x => x.b > x.a));
    return { desc: `${v === 1 ? 'subtractive' : 'additive'} process: each of the ${W.length} cycles ${v === 1 ? 'shorter' : 'longer'} by ${(u / sr * 1000).toFixed(0)} ms than the last${v === 2 ? ' (its last note held)' : ''}`,
      apply (layers, D) { for (const S of layers) S.map = map; return { layers, D: Math.ceil(t) }; } };
  }
};

// PRÉAUDIBILITÉ (#55) — au pouls : six sections ; chaque attaque d'abord tirée vers la grille (le tatum, (0,5 + 0,5·ι) du
// chemin), puis une part (1 − taux)·(0,6 + 0,8·ι) déplacée de ±Q (Q = tatum/4 × (0,5 + ι), signe alterné, pas premier 5)
// selon la courbe relevée par jgcompose
// [1,00 0,95 0,88 0,56 1,00 0,52] (v0) ; la courbe à rebours (v1) ; constante à 0,5 (v2). La forme de l'exactitude :
// le temps s'entend, se trouble, revient, se trouble.
ECRITURES3.preaudible = {
  kind: 'map', profile: [0.0, 0.5, 0.0, 0.9, 0.6, 0.3, 0.0, 0.0],
  relevance: T => { const m = T.ms; return m && T.tempoBpm > 0 && m.nEvents >= 6 ? 0.55 : 0; },
  make (P, ctx, iota, variant, H) {
    const g = ctx.grid; if (!g.has) return null;
    const ev = ctx.ms.events, n = ev.length, sr = P.sr; if (n < 6) return null;
    const v = variant % 3, CURVE = [1.0, 0.95, 0.88, 0.56, 1.0, 0.52], curve = v === 0 ? CURVE : v === 1 ? CURVE.slice().reverse() : CURVE.map(() => 0.5);
    const U = g.tatum, Q = U / 4 * (0.5 + iota), MIN = 0.03 * sr, A0 = ev[0].s0, A1 = ev[n - 1].sN, delta = new Float64Array(n + 1);
    for (let i = 0; i < n; ++i) { const { off } = gridPos(g, ev[i].s0, U); tryShift(ev, delta, i, -off * (0.5 + 0.5 * iota), MIN); }
    const sec = i => clamp(Math.floor(6 * (ev[i].s0 - A0) / Math.max(1, A1 - A0)), 0, 5);
    let moved = 0;
    for (let s = 0; s < 6; ++s) {
      const idx = []; for (let i = 0; i < n; ++i) if (sec(i) === s) idx.push(i);
      const k = Math.round(idx.length * Math.min(1, (1 - curve[s]) * (0.6 + 0.8 * iota))), pick = pickCoprime(idx.length, k, 5); let z = 0;
      for (const j of [...pick].sort((x, y) => x - y)) { if (tryShift(ev, delta, idx[j], (z % 2 ? -1 : 1) * Q, MIN)) moved++; z++; }
    }
    const { map, D: Dm } = retime(P, ev, delta, H);
    return { desc: `pre-audibility: attacks set on the grid, then ${moved} pushed off it by ±${(Q / sr * 1000).toFixed(0)} ms following the curve ${curve.map(x => x.toFixed(2)).join(' ')}`,
      apply (layers, D) { for (const S of layers) S.map = map; return { layers, D: Dm }; } };
  }
};

// REGROUPEMENT (#48) — au pouls, sur l'unité (le tatum) : des groupes de 3+3+2 (v0), 3+3+3+3+4 (v1), puis en cycle les
// quatre tables de jgcompose prises à rebours [2 2 2 2] [3 3 2] [3 3 3 3 4] [4 4 4 4] (v2 ; dans l'ordre de jgcompose, la
// première mesure — [4 4 4 4] — tombait souvent avant la première attaque et v2 sonnait comme v1), à partir du premier temps fort qui précède la
// première attaque. Une attaque qui tombe sur une frontière de groupe est accentuée (+1,5 à +6 dB), les autres s'effacent
// (−1 à −3 dB) ; et chaque note s'éteint à la frontière suivante, d'autant plus que la dose est forte (0 dB à ι = 0,2,
// −60 dB à ι = 1, fondu de 20 ms). Aucune attaque ne bouge : c'est l'accent qui regroupe.
ECRITURES3.regroupe = {
  kind: 'gate', profile: [0.0, 0.3, 0.0, 1.0, 0.4, 0.2, 0.0, 0.0],
  relevance: T => { const m = T.ms; return m && T.tempoBpm > 0 && m.nEvents >= 6 ? 0.6 : 0; },
  make (P, ctx, iota, variant) {
    const g = ctx.grid; if (!g.has) return null;
    const ev = ctx.ms.events, n = ev.length, sr = P.sr; if (n < 6) return null;
    const v = variant % 3, U = g.tatum, TABLES = [[4, 4, 4, 4], [3, 3, 3, 3, 4], [3, 3, 2], [2, 2, 2, 2]];
    const plan = v === 0 ? [[3, 3, 2]] : v === 1 ? [[3, 3, 3, 3, 4]] : TABLES.slice().reverse();
    const bounds = []; let c = g.phase + Math.floor((ev[0].s0 + 0.25 * U - g.phase) / g.bar) * g.bar, tb = 0;
    while (c < ev[n - 1].sN + U) { const tab = plan[tb % plan.length]; for (const w of tab) { bounds.push(c); c += w * U; } tb++; }
    const onB = s => bounds.some(b => Math.abs(s - b) < 0.25 * U), nextB = s => { for (const b of bounds) if (b > s + 0.25 * U) return b; return Infinity; };
    const acc = 1.5 + 4.5 * iota, low = -(1 + 2 * iota), depth = 60 * clamp((iota - 0.2) / 0.8, 0, 1), at = finder(ev), R = 0.02 * sr;
    const accOf = ev.map(e => (onB(e.s0) ? acc : low)), cutOf = ev.map(e => nextB(e.s0)), nAcc = accOf.filter(x => x > 0).length;
    if (!nAcc) return null;
    const gain = (t, s) => { const e = at(s); if (!e) return 0; const b = cutOf[e.i]; return accOf[e.i] - (s > b ? depth * clamp((s - b) / R, 0, 1) : 0); };
    return { desc: `regrouping in ${plan.map(x => x.join('+')).join(' / ')} units: ${nAcc} attacks on a group boundary accented (+${acc.toFixed(1)} dB), the others ${low.toFixed(1)} dB, notes dying ${depth.toFixed(0)} dB at the next boundary`,
      apply (layers, D) { for (const S of layers) S.gainDb.push(gain); return { layers, D }; } };
  }
};

// RETARD / ANTICIPATION (#20) — à chaque changement de hauteur, une part (0,4 + 0,4·ι, pas premier — jgcompose tire au
// hasard, ici aucun tirage) des notes arrive EN RETARD de d = (0,2 + 0,3·ι) de l'écart d'attaque : la note d'avant tient
// jusqu'à elle (v0) ; ou ANTICIPE de d, la note d'avant coupée (v1) ; une fois l'un, une fois l'autre (v2).
ECRITURES3.retard = {
  kind: 'map', profile: [0.3, 0.5, 0.0, 0.8, 0.3, 0.2, 0.0, 0.0],
  relevance: T => { const m = T.ms; return m && m.nPitched >= 4 && (m.movingShare || 0) > 0.2 ? clamp(0.35 + 0.5 * m.movingShare, 0, 0.85) : 0; },
  make (P, ctx, iota, variant, H) {
    const ev = ctx.ms.events, n = ev.length, sr = P.sr; if (n < 4) return null;
    const cand = []; for (let i = 1; i < n; ++i) if (ev[i].f0 > 0 && ev[i - 1].f0 > 0 && Math.abs(ev[i].cents - ev[i - 1].cents) > 40) cand.push(i);
    if (cand.length < 2) return null;
    const v = variant % 3, pick = pickCoprime(cand.length, Math.max(1, Math.round(cand.length * (0.4 + 0.4 * iota)))), MIN = 0.03 * sr, delta = new Float64Array(n + 1);
    let moved = 0, z = 0;
    for (const j of [...pick].sort((x, y) => x - y)) { const i = cand[j], ioi = ev[i].s0 - ev[i - 1].s0, d = (0.2 + 0.3 * iota) * ioi * (v === 0 ? 1 : v === 1 ? -1 : (z % 2 ? -1 : 1)); if (tryShift(ev, delta, i, d, MIN)) moved++; z++; }
    if (!moved) return null;
    const { map, D: Dm } = retime(P, ev, delta, H);
    return { desc: `${['suspension', 'anticipation', 'suspension and anticipation'][v]}: ${moved} of ${cand.length} changes of pitch ${v === 1 ? 'arrive early' : v === 0 ? 'arrive late, the note before held' : 'late or early in turn'}`,
      apply (layers, D) { for (const S of layers) S.map = map; return { layers, D: Dm }; } };
  }
};

// RESPIRATION (#58, « souffle » chez jgcompose) — le sujet respire par fenêtres (ses énoncés ; jgcompose : 6 s) dont les
// états tournent : INSPIRATION (les notes raccourcissent à mesure, ×(1 − 0,45x), et montent, de −1,4 à +1,2 dB) —
// EXPIRATION (elles s'allongent, ×(1 + 0,9x), et s'éteignent peu à peu) — REPOS (tenues ×1,8, −1,7 dB) ; x : le rang de la
// note dans sa fenêtre ; la dernière note de chaque fenêtre laisse un souffle (jgcompose 0,45 s ; ici 0,15 + 0,30·ι s,
// jamais plus de la moitié de la note). Les attaques ne bougent pas. Ordre inspiration-expiration-repos sur les énoncés
// (v0), expiration-inspiration (v1), inspiration-expiration sur des demi-énoncés — le souffle court (v2). Dosage : les
// facteurs × ι.
ECRITURES3.respiration = {
  kind: 'map', profile: [0.0, 0.5, 0.0, 0.5, 0.7, 0.6, 0.3, 0.0],
  relevance: T => { const m = T.ms; return m && m.nEvents >= 5 && m.nPhrases >= 1 ? 0.55 : 0; },
  make (P, ctx, iota, variant, H) {
    const ev = ctx.ms.events, n = ev.length, sr = P.sr; if (n < 5) return null;
    const v = variant % 3, order = [['in', 'out', 'rest'], ['out', 'in'], ['in', 'out']][v], breath = (0.15 + 0.3 * iota) * sr;
    let W = windowsOf(P, ctx);
    if (v === 2) W = W.flatMap(([a, b]) => { const m = Math.round((a + b) / 2); return [[a, m], [m, b]]; });
    const fac = new Float64Array(n).fill(1), gdb = new Float64Array(n), cutLast = new Set();
    W.forEach(([a, b], q) => {
      const idx = []; for (let i = 0; i < n; ++i) if (ev[i].s0 >= a && ev[i].s0 < b) idx.push(i); if (!idx.length) return;
      const state = order[q % order.length];
      idx.forEach((i, r) => {
        const x = idx.length > 1 ? r / (idx.length - 1) : 0;
        const f = state === 'in' ? 1 - 0.45 * x : state === 'out' ? 1 + 0.9 * x : 1.8, gv = state === 'in' ? 0.85 + 0.35 * x : state === 'out' ? 1.05 - 0.35 * x : 0.82;
        fac[i] = 1 + (f - 1) * iota; gdb[i] = 20 * Math.log10(1 + (gv - 1) * iota);
      });
      cutLast.add(idx[idx.length - 1]);
    });
    // durées : une note plus courte s'éteint (fondu de 20 ms) avant sa fin ; plus longue, sa tenue s'étend vers l'attaque
    // suivante (jamais au-delà) ; la dernière note d'une fenêtre se tait 0,45 s avant la fenêtre suivante
    const segs = [], fadeAt = new Float64Array(n).fill(Infinity), at = finder(ev); let t = 0;
    if (ev[0].s0 > 0) { segs.push({ a: 0, b: ev[0].s0, sa: 0, sb: ev[0].s0 }); t = ev[0].s0; }
    for (let i = 0; i < n; ++i) {
      const e = ev[i], s0 = e.s0, s2 = endOf(ev, i), s1 = Math.min(e.s1, s2), sound = s1 - s0;
      if (fac[i] > 1 && s2 - s1 > 0.02 * sr) { const ext = Math.min(s2 - s1, (fac[i] - 1) * sound), h = Math.max(s0 + 0.02 * sr, s1 - 0.12 * sr); holdSegs(segs, s0, s0, s1, sound + ext, h); if (s2 - s1 - ext > 1) segs.push({ a: s1 + ext, b: s2, sa: s1, sb: s1 + (s2 - s1 - ext) }); }
      else { segs.push({ a: s0, b: s2, sa: s0, sb: s2 }); if (fac[i] < 1) fadeAt[i] = s0 + Math.max(0.03 * sr, fac[i] * sound); }
      if (cutLast.has(i)) fadeAt[i] = Math.min(fadeAt[i], s2 - Math.min(breath, 0.5 * (s2 - s0)));
    }
    const last = ev[n - 1].sN; if (last < P.n) segs.push({ a: last, b: P.n, sa: last, sb: P.n });
    const map = new H.TimeMap(segs), R = 0.02 * sr;
    // le fondu suit la position SOURCE dans la note (la carte ne change pas l'endroit d'une coupure : elle est avant la tenue)
    const gain = (t2, s) => { const e = at(s); if (!e) return 0; const f = fadeAt[e.i]; return gdb[e.i] + (s > f ? -80 * clamp((s - f) / R, 0, 1) : 0); };
    return { desc: `breathing over ${W.length} windows (${order.join(' / ')}): notes shorten while rising, lengthen while dying${order.includes('rest') ? ', rest held' : ''}; ${cutLast.size} breaths of up to ${(breath / sr).toFixed(2)} s`,
      apply (layers, D) { for (const S of layers) { S.map = map; S.gainDb.push(gain); } return { layers, D }; } };
  }
};

// REGRID — remettre sur la grille : chaque attaque tirée vers le point le plus proche (force 0,3 + 0,7·ι ; le biais propre
// du sujet, sa médiane d'écart, est gardé) ; accents de mesure : temps fort +2,5 dB, autre temps +0,6, contretemps −1,2
// (jgcompose : +40/+10/−20 en vélocité à accent 0,5) ; grille au tatum (v0), au tatum avec SWING — les points impairs
// retardés d'un cinquième d'unité — croches 3:2, jgcompose r = 1 + 0,5·swing (v1), au temps (v2).
ECRITURES3.regrid = {
  kind: 'map', profile: [0.0, 0.4, 0.0, 0.9, 0.3, 0.0, 0.0, 0.0],
  relevance: T => { const m = T.ms; return m && T.tempoBpm > 0 && m.nEvents >= 4 ? 0.5 : 0; },
  make (P, ctx, iota, variant, H) {
    const g = ctx.grid; if (!g.has) return null;
    const ev = ctx.ms.events, n = ev.length, sr = P.sr; if (n < 4) return null;
    // au temps (v2) : au demi-temps si le temps dépasse 0,6 s (à 53 BPM, des attaques tirées de 0,5 s ne trouvaient plus de place)
    const v = variant % 3, step = v === 2 ? (g.beat > 0.6 * sr ? g.beat / 2 : g.beat) : g.tatum, MIN = 0.03 * sr, force = 0.3 + 0.7 * iota, delta = new Float64Array(n + 1);
    const pos = ev.map(e => gridPos(g, e.s0, step)), bias = median(pos.map(p => p.off));
    let moved = 0;
    ev.forEach((e, i) => {
      let tgt = g.phase + pos[i].k * step + bias;
      if (v === 1 && ((pos[i].k % 2) + 2) % 2 === 1) tgt += 0.2 * step;
      const d = force * (tgt - e.s0); if (Math.abs(d) > 0.001 * sr && tryShift(ev, delta, i, d, MIN)) moved++;
    });
    const perBeat = Math.max(1, Math.round(g.beat / g.tatum)), at = finder(ev);
    const accOf = ev.map(e => { const { k } = gridPos(g, e.s0, g.tatum), inBar = ((k % (4 * perBeat)) + 4 * perBeat) % (4 * perBeat); return iota * (inBar === 0 ? 2.5 : inBar % perBeat === 0 ? 0.6 : -1.2); });
    const { map, D: Dm } = retime(P, ev, delta, H);
    return { desc: `regrid on the ${v === 2 ? 'beat' : 'tatum'}${v === 1 ? ' with swing' : ''}: ${moved} attacks pulled ${Math.round(100 * force)} % of the way, the subject's own bias kept (${(1000 * bias / sr).toFixed(1)} ms), bar accents`,
      apply (layers, D) { for (const S of layers) { S.map = map; S.gainDb.push((t, s) => { const e = at(s); return e ? accOf[e.i] : 0; }); } return { layers, D: Dm }; } };
  }
};

// outils partagés avec le lot 3b
export { coprime, pickCoprime, cyclesOf, retime, tryShift, gridPos, endOf };
