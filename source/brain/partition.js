// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// ============================================================================================
//  CHARIVARI — PARTITION MICRO du sujet (conception validée le 01.10.2026)
//  Ce que jgcompose lit dans une partition, lu ici dans l'échantillon, à trois échelles :
//   • ÉVÉNEMENTS — les attaques et les notes du son : début, fin (là où l'événement s'éteint), hauteur (cents, degré de la
//     gamme déduite), force, raideur ;
//   • VOIX — ce qui, dans le son, se comporte comme des voix : de vraies voix si le son est polyphonique (deux hauteurs
//     simultanées sur au moins 30 % des trames voisées), sinon des FAMILLES DE PARTIELS (un seul instrument : ses rangs
//     harmoniques regroupés selon la partition qui les sépare le mieux — registre, parité, ou comportement : vite éteints /
//     tenus), sinon (son sans hauteur) des BANDES d'énergie égale. Chaque voix a son relevé de comportement (niveau, tenue,
//     déclin, retard d'attaque, agitation) — jgcompose ne développe que ce qui est attesté ;
//   • PHRASES et FORME — les groupes d'événements séparés par un silence, leur énergie, le sommet de la forme.
//  Rien n'est décidé ici : les écritures (ecritures.js) lisent cette partition.
// ============================================================================================
import { centsOf } from './microtonal.js';

const median = a => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const db = x => 20 * Math.log10(x + 1e-12);

export function microScore (P, ctx) {
  const sr = P.sr, hop = P.hopF, nfr = P.frames.length, T = P.traits;
  // (V6.3) la fin de la zone active arrondie à la trame tombait parfois après la fin du fichier (99 échantillons sur la boucle de
  // percussions) : les cartes qui tiennent la dernière note lisaient au-delà du son, un trou de 10 ms à 9,988 s (mummer 16)
  const a0 = Math.round(T.activeStart * sr), a1 = Math.min(P.n, Math.round(T.activeEnd * sr));
  const envAt = s => P.env[Math.max(0, Math.min(P.env.length - 1, Math.floor(s / (0.01 * sr))))];
  // ---------------------------------------------------------------- 1. événements
  let starts = [];
  for (const o of P.onsetsAll) starts.push({ s: o.s, sharp: !!o.sharp });
  for (const q of P.notes) starts.push({ s: Math.round(q.t0 * sr), sharp: false });
  starts = starts.filter(x => x.s >= a0 - 0.02 * sr && x.s < a1).sort((x, y) => x.s - y.s);
  const st = [];
  for (const x of starts) { const l = st[st.length - 1]; if (l && x.s - l.s < 0.05 * sr) { l.sharp = l.sharp || x.sharp; continue; } st.push({ ...x }); }
  if (!st.length || st[0].s > a0 + 0.05 * sr) st.unshift({ s: a0, sharp: false });
  const events = [];
  for (let i = 0; i < st.length; ++i) {
    const s0 = Math.max(0, st[i].s), sN = i + 1 < st.length ? st[i + 1].s : a1;
    if (sN - s0 < 0.02 * sr) continue;
    // force : crête de l'enveloppe (10 ms) dans l'événement ; fin : là où il passe 30 dB sous sa crête (ou l'événement suivant)
    let pk = -200, pkS = s0; for (let s = s0; s < sN; s += Math.round(0.01 * sr)) { const e = envAt(s); if (e > pk) { pk = e; pkS = s; } }
    let s1 = sN; for (let s = pkS; s < sN; s += Math.round(0.01 * sr)) if (envAt(s) < pk - 30) { s1 = s; break; }
    // hauteur : médiane des trames voisées si elles couvrent la moitié de l'événement
    const j0 = Math.floor(s0 / hop), j1 = Math.max(j0 + 1, Math.ceil(s1 / hop)), fs = [];
    for (let j = j0; j < Math.min(nfr, j1); ++j) if (P.voiced[j] > 0) fs.push(P.voiced[j]);
    const f0 = fs.length >= 0.5 * (j1 - j0) ? median(fs) : 0;
    const cents = f0 > 0 ? centsOf(f0) : null;
    let deg = null, degDev = 0;
    if (cents !== null && ctx && ctx.deg && ctx.deg.all.length) { let bi = 0, bd = 1e9; ctx.deg.all.forEach((c, k) => { const d = Math.abs(c - cents); if (d < bd) { bd = d; bi = k; } }); deg = bi; degDev = cents - ctx.deg.all[bi]; }
    // (V6.2) lifeDev : l'écart au degré gardé comme intonation vivante par les écritures de la ligne — seulement s'il en est une
    // (≤ 20 c) ; au-delà ce n'est plus de l'intonation mais une autre hauteur, et la note réécrite se pose sur le degré
    events.push({ i: events.length, s0, s1, sN, t0: s0 / sr, t1: s1 / sr, f0, cents, deg, degDev, lifeDev: Math.abs(degDev) <= 20 ? degDev : 0, loud: pk - P.peakDb, sharp: st[i].sharp });
  }
  // ---------------------------------------------------------------- 2. phrases et forme
  const iois = []; for (let i = 1; i < events.length; ++i) iois.push((events[i].s0 - events[i - 1].s0) / sr);
  const gapMin = Math.max(0.12, 1.5 * median(iois));
  const phrases = []; let pa = 0;
  for (let i = 1; i <= events.length; ++i) {
    if (i === events.length || (events[i].s0 - events[i - 1].s1) / sr > gapMin) {
      const ev = events.slice(pa, i), en = mean(ev.map(e => e.loud)), top = ev.reduce((b, e) => (e.loud > b.loud ? e : b), ev[0]);
      phrases.push({ a: pa, b: i - 1, s0: ev[0].s0, s1: ev[ev.length - 1].s1, loud: en, peakEvent: top.i, pitched: ev.filter(e => e.f0 > 0).length });
      pa = i;
    }
  }
  let summit = 0; phrases.forEach((p, k) => { if (p.loud > phrases[summit].loud) summit = k; });
  // ---------------------------------------------------------------- 3. voix
  const voicedShare = P.voicedShare ?? 0;
  const strata = voicedShare >= 0.2 ? (polyphonyOf(P).share >= 0.3 ? voicesOf(P) : partialFamilies(P)) : bandsOf(P);
  const pitched = events.filter(e => e.f0 > 0);
  const range = pitched.length ? Math.max(...pitched.map(e => e.cents)) - Math.min(...pitched.map(e => e.cents)) : 0;
  const steps = []; for (let i = 1; i < pitched.length; ++i) steps.push(Math.abs(pitched[i].cents - pitched[i - 1].cents));
  return {
    events, phrases, summit, strata,
    traits: {
      nEvents: events.length, nPitched: pitched.length, pitchedShare: events.length ? pitched.length / events.length : 0,
      nPhrases: phrases.length, rangeCents: range, stepCents: median(steps), movingShare: steps.length ? steps.filter(x => x > 40).length / steps.length : 0,
      eventRate: events.length / Math.max(0.1, (a1 - a0) / sr), meanDur: mean(events.map(e => (e.s1 - e.s0) / sr)),
      strata: strata.list.length, separation: strata.separation, kind: strata.kind,
      // part de chaque événement où il s'est déjà éteint (place pour un écho), écart de registre entre les voix extrêmes
      // (octaves), part des événements longs (plus de deux écarts médians d'attaques)
      tailShare: events.length ? mean(events.map(e => (e.sN - e.s1) / Math.max(1, e.sN - e.s0))) : 0,
      spreadOct: (() => { const r = strata.kind === 'partials' ? strata.list.map(f => f.ranks.reduce((a, b) => a + b, 0) / f.ranks.length) : strata.kind === 'bands' ? [strata.cuts[0] / 2, 2 * strata.cuts[1]] : [1, 2]; return Math.log2(Math.max(...r) / Math.max(1e-6, Math.min(...r))); })(),
      longShare: events.length > 1 ? events.filter(e => (e.sN - e.s0) / sr > 2 * median(iois)).length / events.length : 0,
      // la plus longue tenue (s, de l'attaque à l'attaque suivante)
      maxDur: events.length ? Math.max(...events.map((e, q) => ((q + 1 < events.length ? events[q + 1].s0 : e.sN) - e.s0) / sr)) : 0,
      // silences intérieurs d'au moins 0,3 s (le son éteint avant l'attaque suivante)
      silences: events.filter((e, q) => q + 1 < events.length && (events[q + 1].s0 - e.s1) / sr >= 0.3).length
    }
  };
}

// ---------------------------------------------------------------------------------------------- polyphonie
// après avoir retiré les rangs de la fondamentale suivie (±35 c), une seconde série harmonique d'au moins 3 rangs portant
// 20 % de l'énergie des pics de la trame ?
export function polyphonyOf (P) {
  let voicedN = 0, two = 0; const f2 = new Float64Array(P.frames.length);
  for (let j = 0; j < P.frames.length; ++j) {
    const F = P.voiced[j]; if (!(F > 0)) continue; voicedN++;
    const pk = P.frames[j].peaks; let et = 0; for (const p of pk) et += p.a * p.a;
    const rest = pk.filter(p => { const r = p.f / F, k = Math.round(r); return !(k >= 1 && Math.abs(1200 * Math.log2(r / k)) < 35); });
    let er = 0; for (const p of rest) er += p.a * p.a; if (er < 0.2 * et || rest.length < 3) continue;
    const amax = Math.max(...rest.map(p => p.a)); let best = 0, bs = 0;
    for (const p of rest) { if (p.a < 0.3 * amax) continue; for (let d = 1; d <= 4; ++d) { const c = p.f / d; if (c < 40) break; let s = 0, n = 0; for (const q of rest) { const r = q.f / c, k = Math.round(r); if (k >= 1 && k <= 16 && Math.abs(1200 * Math.log2(r / k)) < 35) { s += q.a / Math.sqrt(k); n++; } } if (n >= 3 && s > bs) { bs = s; best = c; } } }
    if (best > 0 && Math.abs(1200 * Math.log2(best / F)) > 60) { two++; f2[j] = best; }
  }
  return { share: voicedN ? two / voicedN : 0, f2 };
}

// voix : la fondamentale suivie et la seconde série ; masques en peigne (±40 c autour des rangs de chaque voix)
function voicesOf (P) {
  const { f2 } = polyphonyOf(P), n = f2.length, sm = new Float64Array(n);
  for (let j = 0; j < n; ++j) { const v = []; for (let q = Math.max(0, j - 3); q <= Math.min(n - 1, j + 3); ++q) if (f2[q] > 0) v.push(f2[q]); sm[j] = v.length >= 3 ? median(v) : 0; }
  const at = (arr, s) => arr[Math.max(0, Math.min(n - 1, Math.round(s / P.hopF)))];
  const comb = (F, f) => { if (!(F > 0)) return false; const r = f / F, k = Math.round(r); return k >= 1 && Math.abs(1200 * Math.log2(r / k)) < 40; };
  const list = [
    { name: 'voice 1 (lead)', has: (f, s) => comb(at(P.voiced, s), f) || !comb(at(sm, s), f) },
    { name: 'voice 2', has: (f, s) => comb(at(sm, s), f) && !comb(at(P.voiced, s), f) }
  ];
  return { kind: 'voices', list, separation: 1 };
}

// familles de partiels : amplitude de chaque rang trame à trame, relevé de comportement, et la partition des rangs (registre,
// parité, comportement) dont les familles diffèrent le plus
function partialFamilies (P) {
  const nf = P.frames.length, H = 24, sr = P.sr, hop = P.hopF;
  const A = Array.from({ length: H }, () => new Float64Array(nf).fill(-120));
  let fr = 0;
  for (let j = 0; j < nf; ++j) {
    const F = P.voiced[j]; if (!(F > 0)) continue; fr++;
    let mx = 0; for (const p of P.frames[j].peaks) mx = Math.max(mx, p.a);
    for (const p of P.frames[j].peaks) { const r = p.f / F, k = Math.round(r); if (k >= 1 && k <= H && Math.abs(1200 * Math.log2(r / k)) < 35) A[k - 1][j] = Math.max(A[k - 1][j], db(p.a / (mx || 1))); }
  }
  const Hn = Math.max(4, Math.min(H, Math.floor(8000 / (P.f0med || 200))));
  // relevé par rang : niveau moyen, présence, agitation (|Δ dB| trame à trame), déclin (pente sur les notes), retard d'attaque
  const feat = [];
  for (let h = 0; h < Hn; ++h) {
    const a = A[h], pres = [], lv = [], dd = [];
    for (let j = 0; j < nf; ++j) if (P.voiced[j] > 0) { pres.push(a[j] > -60 ? 1 : 0); if (a[j] > -60) lv.push(a[j]); if (j > 0 && P.voiced[j - 1] > 0 && a[j] > -60 && a[j - 1] > -60) dd.push(Math.abs(a[j] - a[j - 1])); }
    const dec = [], lag = [];
    for (const q of P.notes) {
      let jm = q.j0, vm = -1e9; for (let j = q.j0; j < q.j1; ++j) if (a[j] > vm) { vm = a[j]; jm = j; }
      if (vm < -60) continue;
      lag.push((jm - q.j0) * hop / sr);
      if (q.j1 - jm >= 6) { let sx = 0, sy = 0, sxx = 0, sxy = 0, k = 0; for (let j = jm; j < q.j1; ++j) if (a[j] > -80) { const x = (j - jm) * hop / sr; sx += x; sy += a[j]; sxx += x * x; sxy += x * a[j]; k++; } if (k >= 4) dec.push((k * sxy - sx * sy) / (k * sxx - sx * sx + 1e-12)); }
    }
    feat.push({ h: h + 1, level: lv.length ? mean(lv) : -80, presence: mean(pres), agitation: mean(dd), decay: dec.length ? median(dec) : 0, lag: lag.length ? median(lag) : 0 });
  }
  // variables centrées réduites, puis séparation des moyennes de groupe
  const keys = ['level', 'presence', 'agitation', 'decay', 'lag'];
  const zs = keys.map(k => { const v = feat.map(f => f[k]), m = mean(v), sd = Math.sqrt(mean(v.map(x => (x - m) ** 2))) || 1; return v.map(x => (x - m) / sd); });
  const sepOf = groups => { const means = groups.map(g => keys.map((_, i) => mean(g.map(h => zs[i][h - 1])))); let s = 0, c = 0; for (let x = 0; x < means.length; ++x) for (let y = x + 1; y < means.length; ++y) { s += Math.sqrt(means[x].reduce((u, v, i) => u + (v - means[y][i]) ** 2, 0)); c++; } return c ? s / c : 0; };
  const ranks = feat.map(f => f.h);
  const byDecay = ranks.slice().sort((x, y) => feat[x - 1].decay - feat[y - 1].decay), half = Math.ceil(byDecay.length / 2);
  const cands = [
    { basis: 'register', groups: [ranks.filter(h => h <= 3), ranks.filter(h => h > 3 && h <= 8), ranks.filter(h => h > 8)].filter(g => g.length), names: ['low partials', 'middle partials', 'high partials'] },
    { basis: 'parity', groups: [ranks.filter(h => h % 2), ranks.filter(h => !(h % 2))], names: ['odd partials', 'even partials'] },
    { basis: 'behaviour', groups: [byDecay.slice(0, half).sort((x, y) => x - y), byDecay.slice(half).sort((x, y) => x - y)], names: ['fast-dying partials', 'holding partials'] }
  ].filter(c => c.groups.every(g => g.length));
  for (const c of cands) c.sep = sepOf(c.groups);
  cands.sort((x, y) => y.sep - x.sep);
  const best = cands[0];
  const behav = g => Object.fromEntries(keys.map(k => [k, mean(g.map(h => feat[h - 1][k]))]));
  const list = best.groups.map((g, i) => {
    const set = new Set(g);
    return { name: best.names[i] || 'partials', ranks: g, behaviour: behav(g), has: (f, s, F) => { const Fx = F > 0 ? F : P.f0med; return set.has(Math.max(1, Math.min(Hn, Math.round(f / Fx)))); }, hasRank: h => set.has(Math.max(1, Math.min(h, Hn))) };
  });
  // piste d'amplitude (dB) d'une famille, par trame de source : l'enveloppe temporelle de la voix
  const envOf = g => { const e = new Float64Array(nf); for (let j = 0; j < nf; ++j) { let s = 0; for (const h of g) s += Math.pow(10, A[h - 1][j] / 10); e[j] = 10 * Math.log10(s + 1e-12); } return e; };
  list.forEach((v, i) => { v.env = envOf(best.groups[i]); });
  return { kind: 'partials', basis: best.basis, list, separation: best.sep, features: feat };
}

// sans hauteur : trois bandes d'énergie égale (spectre moyen)
function bandsOf (P) {
  const B = P.Pavg.length, sr = P.sr, Nf = P.Nf; let tot = 0; for (let k = 1; k < B; ++k) tot += P.Pavg[k];
  const cuts = []; let acc = 0; for (let k = 1; k < B && cuts.length < 2; ++k) { acc += P.Pavg[k]; if (acc >= tot * (cuts.length + 1) / 3) cuts.push(k * sr / Nf); }
  const lo = cuts[0] || 500, hi = cuts[1] || 3000;
  const list = [
    { name: `low band (< ${Math.round(lo)} Hz)`, has: f => f < lo },
    { name: `middle band`, has: f => f >= lo && f < hi },
    { name: `high band (> ${Math.round(hi)} Hz)`, has: f => f >= hi }
  ];
  return { kind: 'bands', list, separation: 0.5, cuts: [lo, hi] };
}
