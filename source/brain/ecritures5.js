// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// ============================================================================================
//  CHARIVARI — ÉCRITURES, LOT 3c : FORME, SPECTRE, INTONATION et VOIX de jgcompose (jgcompose_skills, jgcompose_skills2,
//  jgcompose_free) à l'échelle d'un échantillon. Mêmes règles qu'aux lots 3a et 3b : la partition micro et le tuning mesuré
//  du sujet désignent la technique ; aucune hauteur hors du réseau du tuning sauf là où l'opération EST une intonation
//  (accordage sur la basse, déviation : jgcompose y écrit des cents) ; aucun tirage (jgcompose tire au hasard dans
//  progression, contrepoint, hétérophonie : ici pas premier, alternance, mesure).
//  Et la règle de Mat (v5.8) : une forme réorganisée garde la morphologie d'un son acoustique — chaque bloc part d'une
//  attaque, la fin s'éteint comme le sujet (enveloppe.js), aucun silence que le sujet n'a pas.
//
//   ouvert / clos — réponse tonale — forme de l'énoncé — fin — forme par dilatation — mesure saturée — progression —
//   frappe tutti — halo spectral — accordage sur la basse — déviation — vecteur de variation — contrepoint — hétérophonie
// ============================================================================================
import { finder, windowsOf, safeRatio, holdSegs, attenuate, isolate, cloneOf, clamp, median } from './ecritures2.js';
import { coprime, pickCoprime, cyclesOf, retime, tryShift, endOf } from './ecritures3.js';
import { modeOf, linOf, centsOfLin, pcOf, latticeOf, nearestIdx, snapLat, fifthOf, ratioTo, statementsOf, perNote, inNote, isPitched, sign, S_CURVE } from './ecritures4.js';

export const ECRITURES5 = {};
const LV = db => Math.pow(10, db / 20);

// le motif du sujet : l'énoncé qui a le plus de hauteurs distinctes (3 à 9 notes, jgcompose _motif_atteste_voix), jamais plus
// de maxShare de la zone active ; rend { a, b (indices d'événements), fa, fb (source), notes }
function motifOf (P, ctx, maxShare = 0.35) {
  const ev = ctx.ms.events, n = ev.length, act = ev[n - 1].sN - ev[0].s0, M = modeOf(P, ctx);
  let best = null, bs = -1;
  for (const w of statementsOf(P, ctx)) {
    const pit = w.idx.filter(i => isPitched(ev[i])); if (pit.length < 2) continue;
    const distinct = new Set(pit.map(i => linOf(M, ev[i].cents))).size, sc = Math.min(9, distinct) + 0.01 * pit.length;
    if (sc > bs) { bs = sc; best = w; }
  }
  if (!best) return null;
  let a = best.idx[0], b = best.idx[best.idx.length - 1];
  const after = q => (q + 1 < n ? ev[q + 1].s0 : ev[q].sN);
  while (b > a + 1 && after(b) - ev[a].s0 > maxShare * act) b--;
  if (b - a + 1 > 9) b = a + 8;
  return { a, b, fa: ev[a].s0, fb: after(b), end: ev[b].sN };
}
// rapports de hauteur d'une copie du motif : chaque note à sa cible (degré linéaire) ; un événement sans hauteur suit la
// première note de la copie
function copyTable (ev, a, b, M, targetOf) {
  const tb = new Map(); let first = 1;
  for (let i = a; i <= b; ++i) { const e = ev[i]; if (!isPitched(e)) continue; const L = targetOf(e, i); const r = L === null ? 1 : ratioTo(e, centsOfLin(M, L)); tb.set(i, r); if (first === 1) first = r; }
  for (let i = a; i <= b; ++i) if (!tb.has(i)) tb.set(i, first);
  return tb;
}

// ============================================================================================ FORME
// OUVERT / CLOS (jgcompose skills2 ouvert_clos ; l'estampie médiévale) — les énoncés vont par paires de fins : les fins
// OUVERTES suspendent, la fin CLOSE conclut. Chaque énoncé sauf le dernier finit ouvert : sa dernière note prend la plus haute
// hauteur de l'énoncé (v0, jgcompose), le degré au-dessus de la tonique — l'ouvert de l'estampie (v1), la quinte — demi-
// cadence (v2) ; le dernier finit clos, sur la tonique (le clos de jgcompose ne change rien par défaut : ici il conclut).
// La note glisse vers sa fin sur la part (0,3 + 0,7·ι) de sa durée (toute la note à ι = 1). La tenue de jgcompose (1,6 temps)
// s'annule entre deux énoncés enchaînés : elle est laissée.
ECRITURES5.ouvertclos = {
  kind: 'melody', profile: [0.7, 0.0, 0.0, 0.0, 0.9, 0.0, 0.0, 0.0],
  relevance: T => { const m = T.ms; return m && m.nPitched >= 4 && (m.nPhrases >= 2 || T.tempoBpm > 0 || m.nEvents >= 8) ? clamp(0.35 + 0.35 * m.pitchedShare, 0, 0.7) : 0; },
  make (P, ctx, iota, variant) {
    const ev = ctx.ms.events, at = finder(ev), sr = P.sr, W = statementsOf(P, ctx).map(w => w.idx.filter(i => isPitched(ev[i]))).filter(g => g.length >= 2);
    if (W.length < 2) return null;
    const M = modeOf(P, ctx), lat = latticeOf(ctx, M), v = variant % 3, F = fifthOf(M, lat), frac = 0.3 + 0.7 * iota, changes = new Map();
    const nearest = (c, cls) => { let best = c, bd = Infinity; for (let o = -6; o <= 6; ++o) { const x = M.root + cls + o * M.p; if (Math.abs(x - c) < bd) { bd = Math.abs(x - c); best = x; } } return best; };
    const glide = (e, tgt) => { const len = Math.min(e.s1, e.sN) - e.s0, c = tgt + 0.5 * (e.lifeDev || 0) - e.cents; if (Math.abs(c) < 8) return; changes.set(e.i, [{ s: frac >= 0.999 ? e.s0 : e.s0 + (1 - frac) * len, c: Math.log2(safeRatio(e.f0, c)) * 1200 }]); };
    W.forEach((g, k) => {
      const last = ev[g[g.length - 1]];
      if (k === W.length - 1) { glide(last, nearest(last.cents, 0)); return; }
      const tgt = v === 0 ? Math.max(...g.map(i => ev[i].cents)) : v === 1 ? nearest(last.cents, M.cls[1 % M.n]) : nearest(last.cents, F.cents);
      glide(last, v === 0 ? snapLat(lat, tgt) : tgt);
    });
    if (!changes.size) return null;
    const f = inNote(P, changes, null);
    return { desc: `open and closed endings: ${W.length - 1} open ending${W.length > 2 ? 's' : ''} ${['on the summit of the statement', 'on the degree above the tonic', 'on the fifth (half cadence)'][v]}, the last closed on the tonic — ${changes.size} notes`,
      apply (layers, D) { for (const S of layers) S.r.push((t, s) => { const e = at(s); return e ? f.r(t, s, e) : 1; }); return { layers, D }; } };
  }
};

// RÉPONSE TONALE (jgcompose skills reponse_tonale ; la fugue) — le SUJET (le motif aux hauteurs les plus variées) est
// suivi de sa RÉPONSE à la quinte (+4 degrés de la gamme mesurée), dans une seconde voix : TONALE — sa deuxième note
// mutée d'un degré contre le sens du premier intervalle, sa dernière reprise du demi-intervalle final (le « rebond
// inversé » de jgcompose) — entrée à la fin du sujet plus la moitié de son premier écart (v0) ; en STRETTO, entrée après
// les deux premières notes du sujet (v1) ; RÉELLE — la quinte exacte du réseau, sans mutation (v2). La réponse sonne à
// −(1 + 6·(1 − ι)) dB (jgcompose : 90 × 0,94).
ECRITURES5.reptonale = {
  kind: 'mult', layers: 2, profile: [0.7, 0.3, 0.0, 0.2, 0.8, 0.0, 0.0, 0.3],
  relevance: T => { const m = T.ms; return m && m.nPitched >= 3 && m.rangeCents >= 100 ? clamp(0.35 + 0.35 * m.pitchedShare, 0, 0.7) : 0; },
  make (P, ctx, iota, variant, H) {
    const ev = ctx.ms.events, at = finder(ev), sr = P.sr, mo = motifOf(P, ctx, 0.45); if (!mo) return null;
    const M = modeOf(P, ctx), lat = latticeOf(ctx, M), v = variant % 3, F = fifthOf(M, lat), { a, b, fa } = mo;
    const pit = []; for (let i = a; i <= b; ++i) if (isPitched(ev[i])) pit.push(i); if (pit.length < 2) return null;
    const lin = pit.map(i => linOf(M, ev[i].cents)), rep = lin.map(L => L + F.deg);
    if (v === 0) { const iv = lin[1] - lin[0]; if (iv) rep[1] -= sign(iv); if (pit.length >= 3) { const ivf = lin[lin.length - 1] - lin[lin.length - 2]; rep[rep.length - 1] = rep[rep.length - 2] - Math.round(ivf / 2); } }
    const tb = new Map(); let first = 1;
    pit.forEach((i, j) => { const e = ev[i], r = v === 2 ? safeRatio(e.f0, snapLat(lat, e.cents + F.cents) - e.cents + 0.5 * (e.lifeDev || 0)) : ratioTo(e, centsOfLin(M, rep[j])); tb.set(i, r); if (first === 1) first = r; });
    for (let i = a; i <= b; ++i) if (!tb.has(i)) tb.set(i, first);
    const fb = ev[b].sN, len = fb - fa, gap0 = (a + 1 < ev.length ? ev[a + 1].s0 : fb) - ev[a].s0;
    const entry = v === 1 ? fa + Math.max(0.1 * sr, (pit.length >= 3 ? ev[pit[2]].s0 : ev[pit[1]].s0) - fa) : ev[b].sN + Math.round(gap0 / 2);
    const map = new H.TimeMap([{ a: entry, b: entry + len, sa: fa, sb: fb }]), g = -(1 + 6 * (1 - iota));
    return { desc: `${v === 2 ? 'real' : 'tonal'} answer at the fifth (${Math.round(F.cents)} c)${v === 0 ? ', head mutated, final rebound' : ''}, entering ${v === 1 ? 'in stretto after two notes' : 'after the subject'} (${(len / sr).toFixed(2)} s, ${g.toFixed(1)} dB)`,
      apply (layers, D) {
        const out = [];
        for (const S0 of layers) { out.push(S0); const B = cloneOf(S0); B.map = map; B.gain = S0.gain * LV(g); B.name = (S0.name || '') + ' answer'; B.r.push((t, s) => { const e = at(s); return (e && tb.get(e.i)) || 1; }); out.push(B); }
        return { layers: out, D: Math.max(D, Math.ceil(entry + len)) };
      } };
  }
};

// FORME DE L'ÉNONCÉ (jgcompose skills2 forme_enonce) — la forme bâtie sur le motif du sujet, à la place du sujet : ÉNONCÉ —
// VARIATION (la tête gardée, la suite déplacée du premier intervalle) — LIQUIDATION (la tête deux fois) — MARCHE de la tête
// (un degré plus bas à chaque pas ; jgcompose : le pas de −1 degré qui s'impose dans une gamme) — BLOC GRAVE (le motif une
// période plus bas ; une quinte sous ι = 0,5) — RETOUR littéral (v0, les six blocs) ; énoncé, liquidation, marche, retour
// (v1) ; énoncé, variation, bloc grave, retour (v2). Chaque bloc part de l'attaque du motif ; le retour garde la résonance
// du sujet. Marche : 1 + round(2·ι) pas. Le tout tient dans la durée permise (sinon les blocs du milieu tombent).
ECRITURES5.formeenonce = {
  kind: 'map', profile: [0.6, 0.5, 0.0, 0.2, 1.0, 0.0, 0.0, 0.0],
  relevance: T => { const m = T.ms; return m && m.nPitched >= 4 && m.nEvents >= 4 ? clamp(0.3 + 0.35 * m.pitchedShare, 0, 0.65) : 0; },
  make (P, ctx, iota, variant, H) {
    const ev = ctx.ms.events, at = finder(ev), sr = P.sr, mo = motifOf(P, ctx, 0.3); if (!mo) return null;
    const M = modeOf(P, ctx), lat = latticeOf(ctx, M), v = variant % 3, F = fifthOf(M, lat), { a, b, fa, fb } = mo;
    const pit = []; for (let i = a; i <= b; ++i) if (isPitched(ev[i])) pit.push(i); if (pit.length < 2) return null;
    const head = Math.min(3, b - a + 1), hb = a + head - 1, headEnd = endOf(ev, hb), Lm = fb - fa, Lh = headEnd - fa;
    const VEC0 = linOf(M, ev[pit[1]].cents) - linOf(M, ev[pit[0]].cents) || 1, steps = 1 + Math.round(2 * iota), low = iota >= 0.5 ? -M.n : -F.deg;
    const own = e => linOf(M, e.cents);
    const blocks = [];
    const add = (name, len, tbl) => blocks.push({ name, len, tbl });
    add('statement', Lm, null);
    if (v !== 1) add('variation', Lm, copyTable(ev, a, b, M, (e, i) => (i <= hb ? null : own(e) + VEC0)));
    if (v !== 2) { add('liquidation', Lh, null); add('liquidation', Lh, null); }
    if (v !== 2) for (let k = 1; k <= steps; ++k) add(`sequence ${k}`, Lh, copyTable(ev, a, hb, M, e => own(e) - k));
    if (v !== 1) add('low block', Lm, copyTable(ev, a, b, M, e => own(e) + low));
    add('return', mo.end - fa, null);
    // place : jamais plus que la durée permise (1,6 × le sujet, ou sujet + 4 s) ; les blocs du milieu tombent d'abord
    const cap = Math.max(1.6 * P.n, P.n + 4 * sr);
    while (blocks.length > 3 && blocks.reduce((x, y) => x + y.len, 0) > cap) blocks.splice(Math.floor(blocks.length / 2), 1);
    const segs = [], tabs = []; let t = 0;
    for (const B of blocks) { segs.push({ a: t, b: t + B.len, sa: fa, sb: fa + B.len }); tabs.push([t, t + B.len, B.tbl]); t += B.len; }
    const map = new H.TimeMap(segs);
    const r = (t2, s) => { for (const [x, y, tb] of tabs) if (t2 >= x && t2 < y) { if (!tb) return 1; const e = at(s); return (e && tb.get(e.i)) || 1; } return 1; };
    return { desc: `statement form on the subject's motif (${(Lm / sr).toFixed(2)} s): ${blocks.map(B => B.name).join(' — ')}`,
      apply (layers, D) { for (const S of layers) { S.map = map; S.r.push(r); } return { layers, D: Math.ceil(t) }; } };
  }
};

// FIN (jgcompose skills2 fin) — la manière de finir : FERMÉE — la dernière note tenue (1 + 3·ι temps ; sans pouls, autant de
// 0,5 s), +2 dB (vélocité +14), puis l'extinction du sujet (v0) ; OUVERTE — le sujet s'arrête avant sa fin, à
// (0,85 − 0,25·ι) de sa zone active, sur une note, et s'éteint en son temps (v1 ; la coupe nette de jgcompose serait sur une
// trame la coupe que Mat refuse) ; INTERRUPTION — la dernière note devient la hauteur médiane des hauteurs non toniques du
// sujet, frappée de nouveau (son attaque relue) 400 ms à +3 dB, puis l'extinction (v2).
ECRITURES5.fin = {
  kind: 'map', profile: [0.2, 0.5, 0.0, 0.1, 0.9, 0.0, 0.2, 0.0],
  relevance: T => { const m = T.ms; return m && m.nEvents >= 3 ? 0.5 : 0; },
  make (P, ctx, iota, variant, H) {
    const ev = ctx.ms.events, n = ev.length, at = finder(ev), sr = P.sr; if (n < 3) return null;
    const v = variant % 3, last = ev[n - 1], beat = ctx.grid.has ? ctx.grid.beat : 0.5 * sr, A0 = ev[0].s0, A1 = last.sN;
    if (v === 0) {
      const len = Math.min(last.s1, last.sN) - last.s0, hold = (1 + 3 * iota) * beat, segs = [];
      if (last.s0 > 0) segs.push({ a: 0, b: last.s0, sa: 0, sb: last.s0 });
      const t = holdSegs(segs, last.s0, last.s0, last.s0 + Math.max(0.05 * sr, len), Math.max(0.05 * sr, len) + hold, last.s0 + Math.max(0.03 * sr, len - 0.12 * sr));
      const map = new H.TimeMap(segs);
      return { desc: `closed ending: the last note held ${(hold / sr).toFixed(2)} s longer, +2 dB, then the subject's own release`,
        apply (layers, D) { for (const S of layers) { S.map = map; S.gainDb.push((t2, s) => (t2 >= last.s0 ? 2 : 0)); } return { layers, D: Math.ceil(t) }; } };
    }
    if (v === 1) {
      const T = A0 + (0.85 - 0.25 * iota) * (A1 - A0); let q = 0; while (q + 1 < n && ev[q + 1].s0 <= T) q++;
      const stop = Math.max(ev[q].s0 + 0.15 * sr, Math.min(T, endOf(ev, q))), map = new H.TimeMap([{ a: 0, b: stop, sa: 0, sb: stop }]);
      return { desc: `open ending: the subject stops at ${(100 * (stop - A0) / Math.max(1, A1 - A0)).toFixed(0)} % of itself and dies away in its own time`,
        apply (layers, D) { for (const S of layers) S.map = map; return { layers, D: Math.ceil(stop) }; } };
    }
    const M = modeOf(P, ctx), pe = ev.filter(isPitched); if (pe.length < 3 || !isPitched(last)) return null;
    const tonic = median(pe.map(e => ((linOf(M, e.cents) % M.n) + M.n) % M.n)), others = [...new Set(pe.map(e => linOf(M, e.cents)).filter(L => ((L % M.n) + M.n) % M.n !== tonic))].sort((x, y) => x - y);
    if (!others.length) return null;
    const tgt = others[others.length >> 1], r = ratioTo(last, centsOfLin(M, tgt)), strike = Math.round((0.25 + 0.3 * iota) * sr);
    const segs = [{ a: 0, b: last.s0, sa: 0, sb: last.s0 }, { a: last.s0, b: last.s0 + strike, sa: last.s0, sb: last.s0 + strike }];
    const map = new H.TimeMap(segs);
    return { desc: `interrupted ending: the last note becomes the middle non-tonic pitch (degree ${tgt}), struck for ${(strike / sr).toFixed(2)} s at +3 dB`,
      apply (layers, D) { for (const S of layers) { S.map = map; S.r.push((t2, s) => (t2 >= last.s0 ? r : 1)); S.gainDb.push(t2 => (t2 >= last.s0 ? 3 : 0)); } return { layers, D: Math.ceil(last.s0 + strike) }; } };
  }
};

// FORME PAR DILATATION (jgcompose skills2 forme_par_dilatation) — tout le sujet dilaté d'un facteur f (jgcompose 3,4972 ;
// ici f = 1 + 1,5·ι, la durée permise le borne), les hauteurs intactes, SAUF une CELLULE gardée à sa taille réelle, posée à
// sa place dilatée : l'événement le plus fort (v0), le premier (v1) ; ou chaque note garde la durée de son SON — seuls les
// silences et les résonances entre les notes s'étirent : une dilatation pointilliste (v2 ; sur une trame sans silences, la
// fin de chaque note est tenue).
ECRITURES5.dilatation = {
  kind: 'map', profile: [0.0, 1.0, 0.0, 0.3, 0.7, 0.0, 0.2, 0.0],
  relevance: T => { const m = T.ms; return m && m.nEvents >= 3 ? 0.5 : 0; },
  make (P, ctx, iota, variant, H) {
    const ev = ctx.ms.events, n = ev.length, sr = P.sr; if (n < 3) return null;
    const v = variant % 3, cap = Math.max(1.6 * P.n, P.n + 4 * sr), A0 = ev[0].s0, A1 = ev[n - 1].sN;
    const f = Math.max(1.1, Math.min(1 + 1.5 * iota, (cap - A0 - (P.n - A1)) / Math.max(1, A1 - A0)));
    const segs = []; let t = 0;
    if (A0 > 0) { segs.push({ a: 0, b: A0, sa: 0, sb: A0 }); t = A0; }
    if (v === 2) {
      for (let q = 0; q < n; ++q) { const e = ev[q], s2 = endOf(ev, q), snd = Math.min(e.s1, s2) - e.s0; t = holdSegs(segs, t, e.s0, s2, f * (s2 - e.s0), e.s0 + Math.max(0.03 * sr, snd - (e.s1 >= s2 ? 0.12 * sr : 0))); }
    } else {
      const cell = v === 0 ? ev.reduce((bi, e, q) => (e.loud > ev[bi].loud ? q : bi), 0) : 0, c0 = ev[cell].s0, c1 = endOf(ev, cell);
      if (c0 > A0) { segs.push({ a: t, b: t + f * (c0 - A0), sa: A0, sb: c0 }); t += f * (c0 - A0); }
      // la cellule à sa taille réelle, puis le temps qu'elle aurait pris dilatée est rempli par sa propre résonance tenue
      t = holdSegs(segs, t, c0, c1, f * (c1 - c0), c0 + Math.max(0.03 * sr, Math.min(ev[cell].s1, c1) - c0 - 0.12 * sr));
      if (A1 > c1) { segs.push({ a: t, b: t + f * (A1 - c1), sa: c1, sb: A1 }); t += f * (A1 - c1); }
    }
    if (P.n > A1) { segs.push({ a: t, b: t + (P.n - A1), sa: A1, sb: P.n }); t += P.n - A1; }
    const map = new H.TimeMap(segs);
    return { desc: `form by dilation ×${f.toFixed(2)}${v === 2 ? ': each note keeps the length of its sound, only what lies between them grows' : `, the ${v === 0 ? 'loudest' : 'first'} event kept at its real size`}`,
      apply (layers, D) { for (const S of layers) S.map = map; return { layers, D: Math.ceil(t) }; } };
  }
};

// MESURE SATURÉE (jgcompose skills2 mesure_saturee) — une mesure se SATURE : à ses notes s'ajoutent round(n·(f − 1)) frappes
// sur une grille régulière (f = 1,6 + 1,4·ι ; jgcompose 1 + 2·amount), qui relisent tour à tour les attaques de la mesure
// (leurs hauteurs reviennent en cycle), la mesure entière à +2 dB (vélocité 118) ; puis les quatre mesures suivantes
// S'ÉCLAIRCISSENT : on garde la note j et l'on saute à j + 1 + ⌊6j/L⌋ (jgcompose), les autres s'effacent. La première
// mesure (v0) ; la mesure de la note la plus forte, hors la première (v1) ; à rebours — l'éclaircie devient une accumulation vers la
// dernière mesure, saturée (v2). Les frappes ajoutées forment une strate à part : le sujet garde ses résonances.
ECRITURES5.saturee = {
  kind: 'mult', layers: 2, profile: [0.0, 0.5, 0.0, 0.9, 0.9, 0.0, 0.0, 0.0],
  relevance: T => { const m = T.ms; return m && m.nEvents >= 6 && (T.tempoBpm > 0 || m.nPhrases >= 3) ? 0.55 : 0; },
  make (P, ctx, iota, variant, H) {
    const ev = ctx.ms.events, n = ev.length, at = finder(ev), sr = P.sr; if (n < 6) return null;
    const W = cyclesOf(P, ctx, 3); if (W.length < 3) return null;
    const v = variant % 3, inW = (w, e) => e.s0 >= w[0] && e.s0 < w[1];
    // v1 : la mesure de la note la plus forte, hors la première (sinon v1 redit v0)
    let ws = v === 0 ? 0 : v === 2 ? W.length - 1 : (() => { let bi = -1, bl = -1e9; W.forEach((w, q) => { if (!q) return; for (const e of ev) if (inW(w, e) && e.loud > bl) { bl = e.loud; bi = q; } }); return bi; })();
    if (ws < 0) ws = 0;
    const satEv = ev.filter(e => inW(W[ws], e)); if (!satEv.length) return null;
    const fct = 1.6 + 1.4 * iota, nAdd = Math.max(1, Math.round(satEv.length * (fct - 1))), [wa, wb] = W[ws], step = (wb - wa) / (nAdd + 1);
    const strikes = [];
    for (let j = 1; j <= nAdd; ++j) { const e = satEv[(j - 1) % satEv.length], d = Math.min(0.6 * step, Math.max(0.03 * sr, endOf(ev, e.i) - e.s0)); strikes.push({ a: Math.round(wa + j * step), b: Math.round(wa + j * step + d), sa: e.s0, sb: e.s0 + d }); }
    // éclaircie : les événements des quatre mesures qui suivent (v2 : qui précèdent, lus à rebours)
    const zone = v === 2 ? W.slice(Math.max(0, ws - 4), ws) : W.slice(ws + 1, ws + 5);
    let L = ev.filter(e => zone.some(w => inW(w, e))); if (v === 2) L = L.reverse();
    const keep = new Set(); for (let j = 0; j < L.length; j += 1 + Math.floor(6 * j / Math.max(1, L.length))) keep.add(L[j].i);
    const thin = new Set(L.filter(e => !keep.has(e.i)).map(e => e.i)), depth = 30 + 30 * iota;
    const gA = (t, s) => { const e = at(s); if (!e) return 0; return (inW(W[ws], e) ? 2 : 0) - (thin.has(e.i) ? depth : 0); };
    const map = new H.TimeMap(strikes);
    return { desc: `saturated bar ${ws + 1}: ${nAdd} strikes added to its ${satEv.length} notes, then ${v === 2 ? 'an accumulation towards it' : 'the next bars thin out'} (${thin.size} of ${L.length} notes fade)`,
      apply (layers, D) {
        const out = [];
        for (const S0 of layers) { const A = cloneOf(S0); A.gainDb.push(gA); out.push(A); const B = cloneOf(S0); B.map = map; B.gainDb.push(() => 2); B.name = (S0.name || '') + ' strikes'; out.push(B); }
        return { layers: out, D };
      } };
  }
};

// PROGRESSION (jgcompose _progression) — le sujet en accords parallèles qui suivent une progression de degrés : quatre
// sections (ses énoncés, sinon quatre parts aux attaques), chacune posée sur un degré — la voix de base transposée au degré
// (degré pour degré, dans la gamme mesurée), une tierce et une quinte modales au-dessus (degrés + 2, + 4 ; jgcompose : des
// tierces empilées) : cadence I-IV-V-I (v0, son défaut) ; cycle de quartes I-IV-VII-III (v1) ; balancier I-V-I-V (v2).
// Jgcompose remplace les voix par les accords et tire au hasard ses progressions « aléatoire » et « markov » : ici le sujet
// reste la voix du bas, et seules les trois progressions écrites existent. Voix ajoutées à −(9 − 6·ι) dB ; trois voix
// au-dessus de ι = 0,5, deux sinon.
ECRITURES5.progression = {
  kind: 'mult', layers: 3, profile: [1.0, 0.0, 0.3, 0.0, 0.8, 0.0, 0.0, 0.2],
  relevance: T => { const m = T.ms; return m && m.nPitched >= 3 && T.tonal > 0.4 ? clamp(0.3 + 0.4 * m.pitchedShare, 0, 0.7) : 0; },
  make (P, ctx, iota, variant) {
    const ev = ctx.ms.events, n = ev.length, at = finder(ev); if (n < 4) return null;
    const M = modeOf(P, ctx), pe = ev.filter(isPitched); if (pe.length < 3) return null;
    let W = statementsOf(P, ctx).map(w => [w.a, w.b]);
    if (W.length < 4) { const A0 = ev[0].s0, A1 = ev[n - 1].sN, cut = q => { const x = A0 + q * (A1 - A0) / 4; let bi = 0; ev.forEach((e, i) => { if (Math.abs(e.s0 - x) < Math.abs(ev[bi].s0 - x)) bi = i; }); return ev[bi].s0; }; W = [0, 1, 2, 3].map(q => [q ? cut(q) : 0, q < 3 ? cut(q + 1) : P.n]); }
    W = W.slice(0, 4);
    const v = variant % 3, prog = [[0, 3, 4, 0], [0, 3, 6, 2], [0, 4, 0, 4]][v], K = iota >= 0.5 ? 3 : 2;
    const secOf = s => { for (let q = W.length - 1; q >= 0; --q) if (s >= W[q][0]) return q; return 0; };
    const rootLin = linOf(M, median(pe.map(e => e.cents)));
    const ratioFor = (e, shift) => { if (!shift) return 1; if (isPitched(e)) return ratioTo(e, centsOfLin(M, linOf(M, e.cents) + shift)); return Math.pow(2, (centsOfLin(M, rootLin + shift) - centsOfLin(M, rootLin)) / 1200); };
    const tabs = Array.from({ length: K }, (_, k) => { const tb = new Map(); for (const e of ev) tb.set(e.i, ratioFor(e, prog[secOf(e.s0) % prog.length] + 2 * k)); return tb; });
    const g = -(9 - 6 * iota);
    return { desc: `progression ${['I-IV-V-I', 'I-IV-VII-III (cycle of fourths)', 'I-V-I-V'][v]} over ${W.length} sections, the subject in ${K}-voice modal chords (upper voices ${g.toFixed(1)} dB)`,
      apply (layers, D) {
        const out = [];
        for (const S0 of layers) for (let k = 0; k < K; ++k) { const S = cloneOf(S0); const tb = tabs[k]; S.r.push((t, s) => { const e = at(s); return (e && tb.get(e.i)) || 1; }); if (k) { S.gain = S0.gain * LV(g); S.name = (S0.name || '') + ` voice ${k + 1}`; } out.push(S); }
        return { layers: out, D };
      } };
  }
};

// FRAPPE TUTTI (jgcompose skills frappe_tutti) — tout l'orchestre frappe les PARTIELS d'une fondamentale : une
// fondamentale une ou deux octaves sous la note frappée (deux à partir de ι = 0,6), ses partiels 1, 2, 3, 4, 5, 6, 8
// (jgcompose), chacun une copie de l'attaque du sujet transposée EXACTEMENT sur le partiel (le 5e à −13,7 c du tempéré :
// l'intonation naturelle, comme le bend de jgcompose), décalées de 26 ms en arpège, durée un tiers de temps × (1 + 0,06 r),
// niveau 0,55 + 0,45 · k^−0,55. Sur l'attaque la plus forte (v0) ; au début de chaque énoncé, quatre au plus (v1) ; sur
// la dernière attaque, en point final (v2). 3 + round(3·ι) partiels.
ECRITURES5.tutti = {
  kind: 'mult', layers: 6, profile: [0.6, 0.2, 0.6, 0.4, 0.6, 0.0, 0.0, 0.3],
  relevance: T => { const m = T.ms; return m && m.nEvents >= 2 && T.tonal > 0.3 ? 0.5 : 0; },
  make (P, ctx, iota, variant, H) {
    const ev = ctx.ms.events, n = ev.length, sr = P.sr; if (n < 2) return null;
    const v = variant % 3, beat = ctx.grid.has ? ctx.grid.beat : 0.5 * sr;
    const hits = v === 0 ? [ev.reduce((x, e) => (e.loud > x.loud ? e : x), ev[0])] : v === 2 ? [ev[n - 1]] : statementsOf(P, ctx).slice(0, 4).map(w => ev[w.idx[0]]);
    const PART = [1, 2, 3, 4, 5, 6, 8], K = Math.min(6, 3 + Math.round(3 * iota)), oct = iota >= 0.6 ? 2 : 1;
    const layersSeg = Array.from({ length: K }, () => []), ratios = [];
    for (const e of hits) {
      const F0 = e.f0 > 0 ? e.f0 : (P.f0At ? P.f0At(e.s0) : 0) || P.f0med || 110;
      let F = F0 / Math.pow(2, oct); while (F < 30) F *= 2;
      for (let r = 0; r < K; ++r) {
        const k = PART[r], on = Math.round(e.s0 + r * 0.026 * sr), d = Math.min(Math.round(beat / 3 * (1 + 0.06 * r)), Math.max(0.03 * sr, endOf(ev, e.i) - e.s0) * 3);
        layersSeg[r].push({ a: on, b: on + d, sa: e.s0, sb: e.s0 + Math.min(d, Math.max(0.03 * sr, P.n - e.s0 - 1)), ratio: k * F / F0 });
      }
    }
    for (let r = 0; r < K; ++r) ratios.push(PART[r]);
    const maps = layersSeg.map(sg => new H.TimeMap(sg)), lvl = k => 20 * Math.log10(0.55 + 0.45 * Math.pow(k, -0.55)) - 3;
    return { desc: `tutti strike on the partials ${ratios.join(', ')} of a fundamental ${oct} octave${oct > 1 ? 's' : ''} below, ${hits.length} strike${hits.length > 1 ? 's' : ''} (${['loudest attack', 'each statement', 'final point'][v]}), arpeggiated 26 ms, exact harmonic intonation`,
      apply (layers, D) {
        const out = [];
        for (const S0 of layers) {
          out.push(S0);
          maps.forEach((mp, r) => { const S = cloneOf(S0); S.map = mp; S.gain = S0.gain * LV(lvl(PART[r])); S.name = (S0.name || '') + ` partial ${PART[r]}`; S.r.push(t => { const i = mp.seg(t); return i >= 0 ? mp.segs[i].ratio : 1; }); out.push(S); });
        }
        return { layers: out, D: Math.max(D, ...maps.map(m => Math.ceil(m.end))) };
      } };
  }
};

// HALO SPECTRAL (jgcompose _spectralize, son halo) — les notes TENUES et GRAVES (le dixième le plus long des notes, sous le
// milieu du registre ; sinon la plus longue) s'entourent de leurs propres partiels, chacun une copie de la note transposée
// exactement (×k) : 2, 3, … N (v0 ; N = 2 + round(3·ι), jgcompose 1 + round(halo·7)) ; les partiels impairs seulement
// (v1, un halo de clarinette) ; 2, 3, 4 et la fondamentale retirée — on entend la hauteur virtuelle (v2, spec_replace).
// Niveau du partiel k : (1 − 0,5 × 0,5)^k de la note (jgcompose spec_env = 0,5) ; ils ne sonnent que pendant ces notes ; les
// notes tenues : le dixième le plus long (jgcompose GRAIN_HELD_QUANTILE 0,90), jusqu'aux deux cinquièmes à ι = 1.
ECRITURES5.halo = {
  kind: 'mult', layers: 4, profile: [0.4, 0.0, 0.7, 0.0, 0.3, 0.2, 0.0, 0.3],
  relevance: T => { const m = T.ms; return m && m.nPitched >= 1 && T.tonal > 0.4 && (m.maxDur || 0) >= 0.3 ? clamp(0.35 + 0.3 * T.tonal, 0, 0.65) : 0; },
  make (P, ctx, iota, variant, H) {
    const ev = ctx.ms.events, sr = P.sr, pe = ev.filter(isPitched); if (!pe.length) return null;
    const v = variant % 3, durOf = e => Math.min(e.s1, e.sN) - e.s0, mid = median(pe.map(e => e.cents));
    const qd = pe.map(durOf).sort((a, b) => a - b), thr = qd[Math.floor((0.9 - 0.3 * iota) * (qd.length - 1))];
    let held = pe.filter(e => durOf(e) >= thr && e.cents <= mid + 1); if (!held.length) held = [pe.reduce((x, e) => (durOf(e) > durOf(x) ? e : x), pe[0])];
    const N = 2 + Math.round(3 * iota), ks = (v === 1 ? [3, 5, 7] : v === 2 ? [2, 3, 4] : Array.from({ length: N - 1 }, (_, i) => i + 2)).slice(0, 4);
    const fmax = Math.max(...held.map(e => e.f0)), use = ks.filter(k => k * fmax <= 6000); if (!use.length) return null;
    const segs = held.map(e => ({ a: e.s0, b: endOf(ev, e.i), sa: e.s0, sb: endOf(ev, e.i) })), map = new H.TimeMap(segs);
    const heldSet = new Set(held.map(e => e.i)), at = finder(ev), cutDb = -(20 + 30 * iota);
    return { desc: `spectral halo: ${held.length} held low note${held.length > 1 ? 's' : ''} ringed by ${v === 1 ? 'odd ' : ''}partials ${use.join(', ')}${v === 2 ? ', the fundamental withdrawn (virtual pitch)' : ''}`,
      apply (layers, D) {
        const out = [];
        for (const S0 of layers) {
          const A = cloneOf(S0); if (v === 2) A.gainDb.push((t, s) => { const e = at(s); return e && heldSet.has(e.i) ? cutDb : 0; }); out.push(A);
          for (const k of use) { const S = cloneOf(S0); S.map = map; S.gain = S0.gain * LV(20 * Math.log10(Math.pow(0.75, k))); S.r.push(() => k); S.name = (S0.name || '') + ` halo ${k}`; out.push(S); }
        }
        return { layers: out, D };
      } };
  }
};

// ============================================================================================ INTONATION
// ACCORDAGE SUR LA BASSE (jgcompose skills2 accordage_basse) — chaque note au-dessus de la basse s'accorde sur le partiel
// de cette basse le plus proche (rangs 2 à 9, 11, 13 — jgcompose), si elle en est à moins de 45 c (ab_seuil 0,45 demi-ton) :
// l'intonation juste d'un ensemble qui écoute son grave. La basse : la note la plus grave de l'énoncé (v0, la basse
// instantanée de jgcompose) ; la fondamentale du sujet à l'octave sous sa note la plus grave (v1, une pédale) ; la note qui
// précède (v2, l'intonation mélodique : chaque intervalle juste) — chaque fois comme 4e partiel d'une basse deux octaves
// plus bas. Chaque note va pour 0,4 + 0,6·ι de son écart.
const PARTIALS = [2, 3, 4, 5, 6, 7, 8, 9, 11, 13].map(k => [k, 1200 * Math.log2(k)]);
ECRITURES5.accordage = {
  kind: 'melody', profile: [0.5, 0.0, 0.0, 0.0, 0.1, 0.4, 0.0, 0.0],
  relevance: T => { const m = T.ms; return m && m.nPitched >= 3 && m.rangeCents >= 150 ? clamp(0.3 + 0.35 * m.pitchedShare, 0, 0.65) : 0; },
  make (P, ctx, iota, variant) {
    const ev = ctx.ms.events, at = finder(ev), pe = ev.filter(isPitched); if (pe.length < 3) return null;
    const v = variant % 3, a = 0.4 + 0.6 * iota, ratio = new Map(), devs = [];
    const lowest = Math.min(...pe.map(e => e.cents)), M = modeOf(P, ctx);
    let pedal = M.root; while (pedal > lowest) pedal -= M.p; while (pedal + M.p <= lowest) pedal += M.p;
    // la basse SONNE deux octaves sous la note de référence (son 4e partiel) : la série harmonique d'une vraie basse couvre
    // alors les intervalles de la ligne (tierce = 5e partiel, quinte = 6e, septième = 7e, neuvième = 9e) ; posée sur la note
    // elle-même, rien dans l'octave au-dessus n'avait de partiel (mesuré : une note accordée sur 16)
    const tune = (e, bass0) => {
      const bass = bass0 - 2400, d = e.cents - bass; if (e.cents - bass0 < 50) return;
      let bk = null, bd = Infinity; for (const [k, c] of PARTIALS) { const x = Math.abs(d - c); if (x < bd) { bd = x; bk = c; } }
      if (bd > 45) return; const c = a * (bk - d); if (Math.abs(c) < 1) return;
      ratio.set(e.i, safeRatio(e.f0, c)); devs.push(c);
    };
    if (v === 0) for (const w of statementsOf(P, ctx)) { const pit = w.idx.filter(i => isPitched(ev[i])); if (pit.length < 2) continue; const bass = Math.min(...pit.map(i => ev[i].cents)); pit.forEach(i => tune(ev[i], bass)); }
    else if (v === 1) pe.forEach(e => tune(e, pedal));
    else for (let k = 1; k < pe.length; ++k) tune(pe[k], pe[k - 1].cents);
    if (!ratio.size) return null;
    return { desc: `tuning to the bass (${['the lowest note of each statement', 'a pedal on the fundamental', 'the note before'][v]}): ${ratio.size} notes drawn onto its partials, median ${Math.round(median(devs.map(Math.abs)))} c`,
      apply (layers, D) { for (const S of layers) S.r.push(perNote(ratio, at)); return { layers, D }; } };
  }
};

// DÉVIATION (jgcompose skills2 deviation) — les notes TENUES (0,8 s chez jgcompose ; ici au moins 0,4 × la plus longue
// tenue du sujet, et 0,25 s) ondulent : c(u) = profondeur × sin(2π f t), la phase repartant à chaque note, profondeur
// 9 c × (0,5 + 1,5·ι) (jgcompose dev_cents 9, à ι = 1/3) ; la fréquence glisse de 0,6 à 2,9 Hz au fil du sujet (v0, jgcompose), de 2,9 à
// 0,6 Hz (v1) ; ou c'est le vibrato propre du sujet (sinon 1,5 Hz) dont la profondeur croît le long de la note (v2).
ECRITURES5.deviation = {
  kind: 'melody', profile: [0.3, 0.0, 0.0, 0.0, 0.0, 0.9, 0.0, 0.0],
  relevance: T => { const m = T.ms; return m && m.nPitched >= 1 && (m.maxDur || 0) >= 0.4 ? clamp(0.3 + 0.3 * Math.min(1, m.maxDur / 1.5), 0, 0.6) : 0; },
  make (P, ctx, iota, variant) {
    const ev = ctx.ms.events, at = finder(ev), sr = P.sr, pe = ev.filter(isPitched); if (!pe.length) return null;
    const v = variant % 3, durOf = e => Math.min(e.s1, e.sN) - e.s0, mx = Math.max(...pe.map(durOf)), thr = Math.max(0.25 * sr, Math.min(0.8 * sr, 0.4 * mx));
    const held = pe.filter(e => durOf(e) >= thr); if (!held.length) return null;
    const A0 = ev[0].s0, A1 = ev[ev.length - 1].sN, depth = 9 * (0.5 + 1.5 * iota), vib = P.traits.vibRate > 2 ? P.traits.vibRate : 1.5;
    const fOf = e => { const x = clamp((e.s0 - A0) / Math.max(1, A1 - A0), 0, 1); return v === 0 ? 0.6 + 2.3 * x : v === 1 ? 2.9 - 2.3 * x : vib; };
    const set = new Map(held.map(e => [e.i, { f: fOf(e), len: durOf(e) }]));
    return { desc: `deviation: ${held.length} held note${held.length > 1 ? 's' : ''} sway ±${depth.toFixed(1)} c at ${v === 2 ? `the subject's own ${vib.toFixed(1)} Hz, deepening along each note` : v === 0 ? '0.6 → 2.9 Hz' : '2.9 → 0.6 Hz'}`,
      apply (layers, D) { for (const S of layers) S.r.push((t, s) => { const e = at(s); const q = e && set.get(e.i); if (!q) return 1; const u = (s - e.s0) / sr, w = v === 2 ? clamp((s - e.s0) / q.len, 0, 1) : 1; return Math.pow(2, depth * w * Math.sin(2 * Math.PI * q.f * u) / 1200); }); return { layers, D }; } };
  }
};

// VECTEUR DE VARIATION (jgcompose skills2 vecteur_variation) — un vecteur d'intervalles appliqué en boucle aux notes (la
// note j reçoit C[j mod 7]) : celui de jgcompose, [−2825, 0, −361, −361, 0, +854, +854] c, ramené à moins d'une octave
// (−2825 → −425 : deux octaves de moins), les ancres (rangs 1 et 4) à 0 ; jgcompose arrondit au demi-ton et perd ses cents :
// ici chaque note tombe sur le point du réseau du tuning le plus proche de la cible. Le vecteur (v0), à rebours (v1),
// renversé (v2) ; × (0,3 + 0,7·ι).
ECRITURES5.vecteur = {
  kind: 'melody', profile: [0.9, 0.0, 0.0, 0.0, 0.3, 0.0, 0.0, 0.0],
  relevance: T => { const m = T.ms; return m && m.nPitched >= 5 ? clamp(0.3 + 0.3 * m.pitchedShare, 0, 0.6) : 0; },
  make (P, ctx, iota, variant) {
    const ev = ctx.ms.events, at = finder(ev), pe = ev.filter(isPitched); if (pe.length < 5) return null;
    const M = modeOf(P, ctx), lat = latticeOf(ctx, M), v = variant % 3, a = 0.3 + 0.7 * iota;
    let C = [-425, 0, -361, -361, 0, 854, 854]; if (v === 1) C = C.slice().reverse(); if (v === 2) C = C.map(x => -x);
    const ratio = new Map();
    pe.forEach((e, j) => { const off = a * C[j % 7]; if (!off) return; const tgt = snapLat(lat, e.cents - (e.degDev || 0) + off); if (Math.abs(tgt - (e.cents - (e.degDev || 0))) < 8) return; ratio.set(e.i, ratioTo(e, tgt)); });
    if (!ratio.size) return null;
    return { desc: `variation vector ${C.map(x => Math.round(a * x)).join(' ')} c${['', ' (reversed)', ' (inverted)'][v]} over ${pe.length} notes, onto the tuning — ${ratio.size} moved`,
      apply (layers, D) { for (const S of layers) S.r.push(perNote(ratio, at)); return { layers, D }; } };
  }
};

// ============================================================================================ VOIX
// CONTREPOINT (jgcompose _contrepoint) — entre les VRAIES voix du sujet (une ligne et sa seconde voix), un curseur
// d'indépendance : en TEMPS — la seconde voix décalée d'un énoncé à l'autre de ±(0,175 × écart médian × (0,5 + ι)), en
// alternance (jgcompose : au hasard), le premier et le dernier énoncé à leur place (v0) ; en HAUTEUR — mouvement CONTRAIRE :
// à chaque note, la seconde voix va d'un degré à l'opposé de la ligne (v1) ; FUSION — mouvement parallèle : elle va dans le
// même sens d'un degré (v2). Une part (0,3 + 0,7·ι) des notes, par pas premier. Seulement là où le sujet a deux voix.
ECRITURES5.contrepoint = {
  kind: 'multmap', layers: 2, profile: [0.5, 0.5, 0.0, 0.3, 0.5, 0.0, 0.0, 0.4],
  relevance: T => { const m = T.ms; return m && m.kind === 'voices' && m.strata >= 2 && m.nEvents >= 4 ? 0.6 : 0; },
  make (P, ctx, iota, variant, H) {
    const st = ctx.ms.strata; if (st.kind !== 'voices' || st.list.length < 2) return null;
    const ev = ctx.ms.events, n = ev.length, at = finder(ev), sr = P.sr, v = variant % 3, M = modeOf(P, ctx); if (n < 4) return null;
    let map = null, ratio = null, desc;
    if (v === 0) {
      const W = statementsOf(P, ctx); if (W.length < 3) return null;
      const iois = []; for (let i = 1; i < n; ++i) iois.push(ev[i].s0 - ev[i - 1].s0);
      const cap = 0.175 * median(iois) * (0.5 + iota), O = W.map((w, k) => w.a + (k === 0 || k === W.length - 1 ? 0 : (k % 2 ? cap : -cap)));
      const segs = []; let t = 0; if (W[0].a > 0) { segs.push({ a: 0, b: W[0].a, sa: 0, sb: W[0].a }); t = W[0].a; }
      for (let k = 0; k < W.length; ++k) { const a = W[k].a, s1 = k + 1 < W.length ? W[k + 1].a : P.n, L = k + 1 < W.length ? O[k + 1] - O[k] : s1 - a; t = holdSegs(segs, t, a, s1, L, Math.max(a + 1, s1 - 0.12 * sr)); }
      map = new H.TimeMap(segs); desc = `counterpoint in time: the second voice ±${(cap / sr * 1000).toFixed(0)} ms from the line, statement by statement`;
    } else {
      const pe = ev.filter(isPitched); if (pe.length < 4) return null;
      const chosen = pickCoprime(pe.length - 1, Math.max(1, Math.round((pe.length - 1) * (0.3 + 0.7 * iota))));
      ratio = new Map(); const step = d => Math.pow(2, (centsOfLin(M, linOf(M, M.root) + d) - centsOfLin(M, linOf(M, M.root))) / 1200);
      for (const q of chosen) { const e = pe[q + 1], dir = sign(e.cents - pe[q].cents); if (!dir) continue; ratio.set(e.i, step(v === 1 ? -dir : dir)); }
      if (!ratio.size) return null;
      desc = `counterpoint in pitch: the second voice in ${v === 1 ? 'contrary' : 'parallel'} motion, a degree ${v === 1 ? 'against' : 'with'} the line on ${ratio.size} notes`;
    }
    return { desc,
      apply (layers, D) {
        const out = [];
        for (const S0 of layers) {
          const A = cloneOf(S0); attenuate(A, st, 1, () => -60, P); out.push(A);
          const B = cloneOf(S0); isolate(B, st, 1, P); if (map) B.map = map; if (ratio) B.r.push(perNote(ratio, at)); B.name = (S0.name || '') + ' second voice'; out.push(B);
        }
        return { layers: out, D: map ? Math.max(D, Math.ceil(map.end)) : D };
      } };
  }
};

// HÉTÉROPHONIE (jgcompose _heterophonize) — la ligne et son DOUBLE qui diverge : chaque attaque du double décalée de
// ±0,175 × ι × l'écart (signe alterné par pas premier ; jgcompose : au hasard), des notes de passage glissées dans la fin d'une
// part 0,35 × ι de ses notes (jgcompose : _densify_scaled), son contour adouci de 20 × ι % vers le centre de la ligne, une
// part 0,10 × ι de ses notes à l'octave (de la période) dans le registre du sujet — tous les leviers (v0) ; le temps et les
// ornements seulement, une hétérophonie serrée (v1) ; DEUX doubles : l'un orné et décalé, l'autre adouci et à l'octave,
// décalé en sens inverse (v2). Doubles à −3 dB.
ECRITURES5.heterophonie = {
  kind: 'mult', layers: 3, profile: [0.5, 0.4, 0.0, 0.4, 0.4, 0.4, 0.0, 0.3],
  relevance: T => { const m = T.ms; return m && m.nPitched >= 4 && m.nEvents >= 5 ? clamp(0.3 + 0.35 * m.pitchedShare, 0, 0.65) : 0; },
  make (P, ctx, iota, variant, H) {
    const ev = ctx.ms.events, n = ev.length, at = finder(ev), sr = P.sr; if (n < 5) return null;
    const M = modeOf(P, ctx), v = variant % 3, pe = ev.filter(isPitched); if (pe.length < 4) return null;
    const MIN = 0.03 * sr, cop = coprime(n, 3);
    const shifted = sg => { const delta = new Float64Array(n + 1); for (let i = 1; i < n - 1; ++i) { const ioi = ev[i].s0 - ev[i - 1].s0, d = sg * (((i * cop) % 2) ? 1 : -1) * 0.175 * iota * ioi; tryShift(ev, delta, i, d, MIN); } return retime(P, ev, delta, H); };
    const Ls = pe.map(e => linOf(M, e.cents)), mean = Ls.reduce((x, y) => x + y, 0) / Ls.length, lo = Math.min(...Ls), hi = Math.max(...Ls);
    const ornaments = () => { const changes = new Map(); const ch = pickCoprime(pe.length - 1, Math.round((pe.length - 1) * 0.35 * iota)); for (const q of ch) { const e = pe[q], nx = pe[q + 1], L1 = Ls[q], L2 = Ls[q + 1]; if (Math.abs(L2 - L1) < 2) continue; const len = Math.min(e.s1, nx.s0) - e.s0; if (len < 0.12 * sr) continue; const mid = Math.round((L1 + L2) / 2); changes.set(e.i, [{ s: e.s0 + 0.65 * len, c: centsOfLin(M, mid) - centsOfLin(M, L1) }]); } return changes; };
    const pitchTable = (smooth, octave) => { const tb = new Map(), oc = new Set([...pickCoprime(pe.length, Math.round(pe.length * 0.10 * iota), 5)]); pe.forEach((e, j) => { let L = Ls[j]; if (smooth) L = Math.round(L + 0.2 * iota * (mean - L)); if (octave && oc.has(j)) L = L + M.n <= hi + M.n / 2 ? L + M.n : L - M.n; if (L < lo - M.n || L > hi + M.n) L = Ls[j]; if (L !== Ls[j]) tb.set(e.i, ratioTo(e, centsOfLin(M, L))); }); return tb; };
    const doubles = [];
    if (v !== 2) doubles.push({ time: shifted(1), orn: ornaments(), tb: v === 0 ? pitchTable(true, true) : null, name: 'double' });
    else { doubles.push({ time: shifted(1), orn: ornaments(), tb: null, name: 'ornamented double' }); doubles.push({ time: shifted(-1), orn: null, tb: pitchTable(true, true), name: 'smoothed double' }); }
    return { desc: `heterophony: ${doubles.map(d => d.name).join(' and ')} diverging from the line (shifts ±${Math.round(17.5 * iota)} % of the gaps${v === 1 ? ', ornaments' : ', ornaments, smoothed contour, octave leaps'})`,
      apply (layers, D) {
        const out = []; let D2 = D;
        for (const S0 of layers) {
          out.push(S0);
          for (const d of doubles) {
            const B = cloneOf(S0); B.map = d.time.map; B.gain = S0.gain * LV(-3); B.name = (S0.name || '') + ' ' + d.name;
            if (d.orn && d.orn.size) { const f = inNote(P, d.orn, null); B.r.push((t, s) => { const e = at(s); return e ? f.r(t, s, e) : 1; }); }
            if (d.tb && d.tb.size) B.r.push(perNote(d.tb, at));
            out.push(B); D2 = Math.max(D2, d.time.D);
          }
        }
        return { layers: out, D: D2 };
      } };
  }
};
