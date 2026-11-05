// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// ============================================================================================
//  CHARIVARI — tuning / gamme déduits du timbre : portage de jgcompose_microtonal
//  (lui-même portage fidèle du Microtonal Analyser) — empreinte en cents (grille 2400–10800 c,
//  pas 1 c, sans ancrage 440), mode harmonique/spectral choisi par l'harmonicité mesurée,
//  comparaison aux 577 tunings ODDSound repliés par période (cosinus lissé σ = 14 c × support
//  de période), degrés ACTIFS (> 0,6 × moyenne à ±20 c) = la gamme, nommée par Jaccard 12-TET.
//  Différence voulue : l'empreinte est déposée à partir de la CARTE DES PARTIELS (fréquences
//  mesurées à mieux que 0,1 c, pondérées amplitude × durée, trame par trame — le vibrato s'y
//  étale comme dans le spectre moyen), pas d'un spectre moyen à 16384 points.
//  Option `rootCents` : la tonique est IMPOSÉE (fondamentale du parent) ; on cherche alors le
//  tuning et la gamme qui, posés sur elle, expliquent le mieux les partiels.
//  GAMME ≠ TUNING (v5.5) : le tuning dit OÙ sont les hauteurs (les degrés ODDSound, en cents) ; la gamme dit LESQUELLES on
//  joue. La gamme est CHOISIE dans la bibliothèque ZD Ultimate (2322 gammes de REAPER, 20 familles, avec le nom de fonction
//  de chaque degré) : celle dont les degrés expliquent le mieux l'activité mesurée des degrés du tuning (chooseScale).
// ============================================================================================
import ZD from './zdscales.json' with { type: 'json' };
export const F0_REF = 8.17579891564371;          // Hz, MIDI 0
const LO = 2400, HI = 10800, RES = 1, SIGMA = 14;
export const centsOf = f => 1200 * Math.log2(f / F0_REF);
export const hzOf = c => F0_REF * Math.pow(2, c / 1200);
const NOTE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const noteName = c => { const m = Math.round(c / 100), dev = Math.round(c - 100 * m); return NOTE[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1) + (dev ? (dev > 0 ? '+' : '') + dev + 'c' : ''); };

export function loadTunings (data) {
  const tl = data.tunings || data;
  return tl.map(t => ({ n: t.name || t.n || '?', d: (t.degrees_cents || t.d).map(Number), p: Number(t.period_cents || t.p || 1200), s: t.source || t.s || 'ODDSound', path: t.cat || t.path || '' }))
    .filter(t => t.d.length >= 2);
}

const l1 = v => { let s = 0; for (const x of v) s += x; if (s > 0) for (let i = 0; i < v.length; ++i) v[i] /= s; return v; };
function conc (v, k = 12) {
  let s = 0; for (const x of v) s += x; if (s <= 0) return 0;
  const pk = []; for (let i = 1; i < v.length - 1; ++i) if (v[i] > v[i - 1] && v[i] >= v[i + 1]) pk.push(v[i]);
  pk.sort((a, b) => b - a); let t = 0; for (let i = 0; i < Math.min(k, pk.length); ++i) t += pk[i];
  return t / s;
}

/** points : [{ f, w }] (une fréquence de partiel à un instant, poids = amplitude × durée) */
export function fingerprintPoints (points, mode = 'auto', splat = 1.5) {
  const n = Math.round((HI - LO) / RES), S = new Float64Array(n);
  const kr = Math.ceil(4 * splat), ker = Array.from({ length: 2 * kr + 1 }, (_, i) => Math.exp(-0.5 * ((i - kr) / splat) ** 2));
  for (const { f, w } of points) {
    if (!(f > 0) || !(w > 0)) continue;
    const gi = Math.round((centsOf(f) - LO) / RES);
    if (gi < kr || gi > n - kr - 1) continue;
    for (let m = -kr; m <= kr; ++m) S[gi + m] += w * ker[m + kr];
  }
  const meta = { mode, harmonicity: 0 };
  const Hspec = l1(Float64Array.from(S));
  const Sal = new Float64Array(n);
  for (let h = 1; h <= 8; ++h) {
    const off = Math.round(1200 * Math.log2(h) / RES), w = Math.pow(0.7, h - 1);
    for (let i = 0; i + off < n; ++i) Sal[i] += w * S[i + off];
  }
  const oo = Math.round(1200 / RES);
  if (oo < n) { const g = new Float64Array(n); for (let i = 0; i + oo < n; ++i) g[i] = Sal[i + oo]; for (let i = 0; i < n; ++i) Sal[i] = Math.max(Sal[i] - 0.5 * g[i], 0); }
  const Hharm = l1(Sal);
  meta.harmonicity = conc(Hharm) - conc(Hspec);
  let H;
  if (mode === 'harmonic') H = Hharm; else if (mode === 'spectral') H = Hspec;
  else if (meta.harmonicity > 0.05) { H = Hharm; meta.mode = 'harmonic'; } else { H = Hspec; meta.mode = 'spectral'; }
  return { H, gridLo: LO, res: RES, meta };
}

function gKernel (sb) { const r = Math.max(1, Math.ceil(4 * sb)); return { k: Array.from({ length: 2 * r + 1 }, (_, i) => Math.exp(-0.5 * ((i - r) / sb) ** 2)), r }; }
function cSmooth (F, { k, r }) {
  const nb = F.length, o = new Float64Array(nb);
  for (let x = 0; x < nb; ++x) { const v = F[x]; if (!v) continue; for (let j = -r; j <= r; ++j) o[((x + j) % nb + nb) % nb] += v * k[j + r]; }
  return o;
}
function foldH (H, p) {
  const nb = Math.round(p / RES), F = new Float64Array(nb);
  for (let i = 0; i < H.length; ++i) { const c = LO + i * RES; const pos = Math.round((((c % p) + p) % p) / RES) % nb; F[pos] += H[i]; }
  return l1(F);
}
function periodSupport (H, p) {
  const lag = Math.round(p / RES); let den = 0, num = 0;
  for (let i = 0; i < H.length; ++i) den += H[i] * H[i];
  if (den <= 0) return 0;
  for (let i = 0; i + lag < H.length; ++i) num += H[i] * H[i + lag];
  return num / den;
}
const normRoot = rc => { let r = rc; while (r < 2400) r += 1200; while (r >= 8400) r -= 1200; return r; };

/**
 * @param opts.rootCents  tonique imposée (cents absolus, grille F0_REF) ; sinon meilleure rotation
 * @returns candidats triés par fit
 */
export function matchTunings (fp, tunings, opts = {}) {
  const { H } = fp, top = opts.top ?? 6, ker = gKernel(SIGMA / RES), { k, r: kr } = ker;
  const minPeriod = opts.minPeriod ?? 480, maxDensity = opts.maxDensity ?? 48;
  const byP = new Map();
  tunings.forEach((t, i) => { const p = Math.round(t.p * 10) / 10; if (p < minPeriod) return; if (!byP.has(p)) byP.set(p, []); byP.get(p).push(i); });
  const res2 = [], rStep = Math.max(1, Math.round(2 / RES));
  for (const [p, mem] of byP) {
    const F = foldH(H, p), nb = F.length, Fs = cSmooth(F, ker);
    let nF = 0; for (const v of Fs) nF += v * v; nF = Math.sqrt(nF) + 1e-12;
    const Gs = cSmooth(Fs, ker), sup = periodSupport(H, p);
    for (const ti of mem) {
      const deg = tunings[ti].d, kk = deg.length, dens = kk * 1200 / p;
      if (dens > maxDensity || kk > 128) continue;
      const dn = new Float64Array(nb), dpos = [];
      for (const d of deg) { const c = ((Math.round(d / RES) % nb) + nb) % nb; dpos.push(c); for (let m = -kr; m <= kr; ++m) dn[((c + m) % nb + nb) % nb] += k[m + kr]; }
      let nD = 0; for (const v of dn) nD += v * v; nD = Math.sqrt(nD); if (nD <= 0) continue;
      let bR = 0, bN = -1e18;
      const rots = opts.rootCents !== undefined ? [((Math.round((((opts.rootCents % p) + p) % p) / RES) % nb) + nb) % nb] : Array.from({ length: Math.ceil(nb / rStep) }, (_, i) => i * rStep);
      for (const rr of rots) { let s = 0; for (const c of dpos) { let x = c + rr; if (x >= nb) x -= nb; s += Gs[x]; } if (s > bN) { bN = s; bR = rr; } }
      const cos = bN / (nF * nD);
      res2.push({ cos, sup, ti, p, rootMod: bR * RES, nb, F, fit: cos * (0.45 + 0.55 * Math.min(1, sup / 0.30)) });
    }
  }
  res2.sort((a, b) => b.fit - a.fit);
  const out = [];
  for (const rr of res2) {
    if (out.length >= top) break;
    const t = tunings[rr.ti], { p, F, nb, rootMod: rm } = rr;
    let rc;
    if (opts.rootCents !== undefined) rc = opts.rootCents;
    else {
      let bo = 0, be = -1;
      for (let kk = -2; kk < 12; ++kk) { const tg = rm + kk * p; let e = 0; for (let i = 0; i < H.length; ++i) { const c = LO + i * RES; if (c >= tg - 30 && c <= tg + 30) e += H[i]; } if (e > be) { be = e; bo = kk; } }
      rc = normRoot(rm + bo * p);
    }
    const w = Math.round(20 / RES), act = [];
    for (const d of t.d) { const di = ((Math.round((((d + rm) % p) + p) % p / RES) % nb) + nb) % nb; let a = 0; for (let m = -w; m <= w; ++m) a += F[((di + m) % nb + nb) % nb]; act.push(a); }
    const mean = act.reduce((a, b) => a + b, 0) / (act.length || 1);
    const active = act.map((a, j) => a > mean * 0.6 ? j : -1).filter(j => j >= 0);
    const cand = { name: t.n, source: t.s, path: t.path, fit: rr.fit, cos: rr.cos, sup: rr.sup, period: p, degrees: t.d.slice(), rootCents: rc, rootHz: hzOf(rc), rootNote: noteName(rc), rootMod: rm, activeDegrees: active, nActive: active.length, act };
    cand.activeRaw = active.slice();
    cand.scaleName = nameScale(cand);
    out.push(cand);
  }
  return out;
}

// ------------------------------------------------------------------------------------------ gammes ZD Ultimate
const ZD_N = ZD.names.length;
const ZD_MASK = Int32Array.from(ZD.pats, pt => { let m = 0; for (let i = 0; i < 12; ++i) if (pt[i] !== '0') m |= 1 << i; return m; });
const ZD_THEO = Uint8Array.from(ZD.fam, f => /Theoretical/i.test(ZD.families[f]) ? 1 : 0);
const popc = m => { let c = 0; while (m) { m &= m - 1; c++; } return c; };
/** nom 12-TET d'un jeu de degrés (repli, hors choix) : le premier masque identique de la bibliothèque, les familles nommées
 *  avant les ensembles « Theoretical » (catalogue de classes de hauteurs, sans nom d'usage) */
export function nameScale (c) {
  if (Math.abs(c.period - 1200) > 3 || c.degrees.length > 12) return c.nActive + ' notes';
  let mask = 1; for (const di of c.activeDegrees) mask |= 1 << (((Math.round(c.degrees[di] / 100) % 12) + 12) % 12);
  let th = -1; for (let s = 0; s < ZD_N; ++s) if (ZD_MASK[s] === mask) { if (!ZD_THEO[s]) return ZD.names[s]; if (th < 0) th = s; }
  return th >= 0 ? popc(mask) + '-note set (no common name)' : c.nActive + ' notes';
}

/** CHOIX DE LA GAMME dans la bibliothèque ZD Ultimate (gammes d'octave) — le moteur du Microtonal Analyser, mode clavier
 *  à 12 touches, avec la gamme CHOISIE au lieu d'être seulement nommée.
 *  1. TOUCHES : chaque hauteur que le tuning offre dans l'octave au-dessus de la tonique prend sa touche (classe de 12).
 *     Tuning d'octave à 12 degrés : le i-ème degré sur la i-ème touche (le clavier MTS-ESP) ; à moins de 12 degrés :
 *     touches distinctes, ordre gardé, écart total minimal aux demi-tons ; à plus de 12 degrés, ou tuning qui ne se répète
 *     pas à l'octave (réseau des degrés replié dans l'octave) : la touche la plus proche, plusieurs hauteurs par touche — la
 *     touche est alors réalisée par la plus active (les shrutis d'un raga). La touche 0 est toujours la tonique exacte.
 *  2. ACTIVITÉ d'une hauteur : énergie de l'empreinte repliée à l'octave (lissée σ 8 c) à ±20 c — le activeSubset12 de
 *     l'analyseur ; d'une touche : celle de sa hauteur la plus active, normalisée au maximum des touches.
 *  3. GAMME : celle des 2322 gammes de la bibliothèque, réalisable (chaque touche porte une hauteur), qui maximise le
 *     Jaccard pondéré  Σ_{touches de la gamme} a / (nombre de touches de la gamme + Σ_{touches hors gamme} a) : une touche
 *     active laissée dehors coûte son activité, une touche muette prise dedans coûte tout son manque — c'est là que se
 *     décide le nombre de notes. À égalité (même masque), une famille nommée passe avant un ensemble « Theoretical »
 *     (catalogue sans nom d'usage), puis l'ordre du fichier.
 *  Résultat sur le candidat : scaleCents (hauteurs jouées au-dessus de la tonique, octave 1200 c), scaleLabels (nom de
 *  fonction ZD de chaque degré : 1…7, A = 10…), scaleName / scaleFamily, scaleFit, scaleAlt (gammes nommées suivantes),
 *  keyCents / keyActivity (les 12 touches), activeDegrees (indices des degrés du tuning joués, tuning d'octave seulement ;
 *  le seuil 0,6 × moyenne reste dans activeRaw). */
export function chooseScale (c, fp) {
  if (!c || !fp) return c;
  const p = c.period, octave = Math.abs(p - 1200) <= 3, rm = (((c.rootCents % 1200) + 1200) % 1200);
  // hauteurs offertes dans l'octave (cents au-dessus de la tonique) et degré du tuning qui les porte
  let cand = [];
  if (octave) c.degrees.forEach((d, i) => { cand.push({ x: ((d % p) + p) % p * 1200 / p, i }); });
  else for (let k = -24; k <= 24; ++k) c.degrees.forEach((d, i) => { const x = (((k * p + d) % 1200) + 1200) % 1200; cand.push({ x, i: -1 }); });
  // la tonique exacte en tête ; ce qui tombe à moins de 25 c d'elle ou de son octave (un comma, un degré à 1199 c) n'est
  // que la tonique déplacée : écarté ; doublons à moins de 3 c fusionnés
  const tonic = { x: 0, i: octave ? c.degrees.findIndex(d => Math.abs(((d % p) + p) % p) < 1e-6) : -1 };
  cand = [tonic, ...cand.filter(q => q.x >= 25 && q.x <= 1200 - 25).sort((u, v) => u.x - v.x)];
  const ded = []; for (const q of cand) { if (ded.length && q.x - ded[ded.length - 1].x < 3) continue; ded.push(q); }
  cand = ded;
  // activité (empreinte repliée à l'octave, lissée σ 8 c, ±20 c)
  const nb = Math.round(1200 / RES), Fo = cSmooth(foldH(fp.H, 1200), gKernel(8 / RES)), w = Math.round(20 / RES);
  const actAt = x => { const di = ((Math.round((x + rm) / RES) % nb) + nb) % nb; let e = 0; for (let m = -w; m <= w; ++m) e += Fo[((di + m) % nb + nb) % nb]; return e; };
  for (const q of cand) q.a = actAt(q.x);
  // touches
  const key = new Int32Array(cand.length).fill(-1), k = cand.length;
  if (octave && k === 12) cand.forEach((q, r) => { key[r] = r; });
  else if (octave && k < 12) {
    const INF = 1e18, cost = Array.from({ length: k }, () => new Float64Array(12).fill(INF)), from = Array.from({ length: k }, () => new Int32Array(12).fill(-1));
    cost[0][0] = Math.abs(cand[0].x);
    for (let r = 1; r < k; ++r) for (let j = r; j < 12; ++j) { const e = Math.abs(cand[r].x - 100 * j); for (let q = r - 1; q < j; ++q) if (cost[r - 1][q] + e < cost[r][j]) { cost[r][j] = cost[r - 1][q] + e; from[r][j] = q; } }
    let j = 0, bc = INF; for (let q = k - 1; q < 12; ++q) if (cost[k - 1][q] < bc) { bc = cost[k - 1][q]; j = q; }
    for (let r = k - 1; r >= 0; --r) { key[r] = j; j = from[r][j]; }
  } else cand.forEach((q, r) => { key[r] = ((Math.round(q.x / 100) % 12) + 12) % 12; });
  const a = new Float64Array(12), rep = new Int32Array(12).fill(-1);
  rep[0] = 0; a[0] = cand[0].a;
  cand.forEach((q, r) => { const j = key[r]; if (r === 0 || j <= 0) return; if (rep[j] < 0 || q.a > a[j]) { a[j] = q.a; rep[j] = r; } });
  let mx = 0; for (const v of a) mx = Math.max(mx, v); if (!(mx > 0)) return c;
  for (let j = 0; j < 12; ++j) a[j] /= mx;
  let avail = 0; for (let j = 0; j < 12; ++j) if (rep[j] >= 0) avail |= 1 << j;
  // touches ACTIVES : la règle de l'analyseur (activeSubset12) — au-dessus de 0,7 × la moyenne des 12 touches (une touche
  // que le tuning ne porte pas compte pour l'énergie à sa position tempérée, comme le clavier idéal de l'analyseur)
  let mean = 0; for (let j = 0; j < 12; ++j) mean += rep[j] >= 0 ? a[j] : actAt(100 * j) / mx; mean /= 12;
  let A = 1; for (let j = 1; j < 12; ++j) if (rep[j] >= 0 && a[j] > 0.7 * mean) A |= 1 << j;
  let tot = 0; for (const v of a) tot += v;
  const Jw = m => { let num = 0, n = 0; for (let j = 0; j < 12; ++j) if (m >> j & 1) { num += a[j]; n++; } return num / (n + tot - num); };
  const Jm = m => popc(m & A) / popc(m | A);
  // la gamme de la bibliothèque la plus proche des touches actives (Jaccard des masques) ; à égalité, celle dont les
  // touches expliquent le mieux l'activité (Jaccard pondéré), puis famille nommée, puis ordre du fichier
  const sc = []; for (let s = 0; s < ZD_N; ++s) { const m = ZD_MASK[s]; if (!(m & 1) || (m & ~avail)) continue; sc.push([Jm(m), Jw(m), s]); }
  if (!sc.length) return c;
  sc.sort((x, y) => (y[0] - x[0]) || (y[1] - x[1]) || (ZD_THEO[x[2]] - ZD_THEO[y[2]]) || (x[2] - y[2]));
  for (const e of sc) e.splice(0, 1);
  c.activeKeys = A; c.scaleMatch = popc(ZD_MASK[sc[0][1]] & A) / popc(ZD_MASK[sc[0][1]] | A);
  const s0 = sc[0][1], m0 = ZD_MASK[s0], cents = [], lab = [], degs = [];
  for (let j = 0; j < 12; ++j) if (m0 >> j & 1) { const q = cand[rep[j]]; cents.push(Math.round(q.x * 100) / 100); lab.push(ZD.pats[s0][j]); if (q.i >= 0) degs.push(q.i); }
  c.scaleCents = cents; c.scaleLabels = lab; c.scaleFit = sc[0][0]; c.scaleIndex = s0; c.scaleMask = m0; c.scaleLib = 'ZD Ultimate';
  c.scaleName = ZD_THEO[s0] ? cents.length + '-note set (' + ZD.names[s0] + ')' : ZD.names[s0];
  c.scaleFamily = ZD_THEO[s0] ? '' : ZD.families[ZD.fam[s0]];
  if (octave && degs.length === cents.length) { c.activeDegrees = degs; }
  c.nActive = cents.length;
  const alt = [], seen = new Set([m0]);
  for (const [j, s] of sc) { if (alt.length >= 3) break; if (ZD_THEO[s] || seen.has(ZD_MASK[s])) continue; seen.add(ZD_MASK[s]); alt.push({ name: ZD.names[s], family: ZD.families[ZD.fam[s]], fit: j, notes: popc(ZD_MASK[s]) }); }
  c.scaleAlt = alt;
  c.keyActivity = Array.from(a, v => Math.round(v * 1000) / 1000);
  c.keyCents = Array.from(rep, r => r >= 0 ? Math.round(cand[r].x * 100) / 100 : null);
  // (V6.9) what a scale chosen by hand needs: the tuning degree that realises each key, and the analysis's own proposal
  c.keyDeg = Array.from(rep, r => r >= 0 ? cand[r].i : null); c.octave = octave;
  c.scaleProposed = { index: s0, name: c.scaleName, family: c.scaleFamily };
  return c;
}

// (V6.9) THE SCALE CHOSEN BY HAND. Mat: « nous devrons avoir le choix entre celle proposée (qui s'affiche en premier lieu) et
// toutes celles qui font partie du fichier idéal scale, avec un menu déroulant comme dans le plugin ReaControlMIDI ». The
// TUNING stays the analysis's (where the pitches are); the chosen ZD scale says which keys are played, each key realised by
// the same pitch of the tuning the analysis gave it (keyCents). A scale is playable when the tuning carries every one of its
// keys and its tonic (the menu shows the others greyed). Writes the same fields as chooseScale; returns false if unplayable.
export function scalePlayable (c, s) {
  if (!c || !c.keyCents || !(s >= 0 && s < ZD_N)) return false;
  const m = ZD_MASK[s]; if (!(m & 1)) return false;
  for (let j = 0; j < 12; ++j) if ((m >> j & 1) && c.keyCents[j] === null) return false;
  return true;
}
export function availMask (c) { let a = 0; if (c && c.keyCents) for (let j = 0; j < 12; ++j) if (c.keyCents[j] !== null) a |= 1 << j; return a; }
export function forceScale (c, s) {
  if (!scalePlayable(c, s)) return false;
  const m = ZD_MASK[s], cents = [], lab = [], degs = [];
  for (let j = 0; j < 12; ++j) if (m >> j & 1) { cents.push(c.keyCents[j]); lab.push(ZD.pats[s][j]); if (c.keyDeg[j] >= 0) degs.push(c.keyDeg[j]); }
  c.scaleCents = cents; c.scaleLabels = lab; c.scaleIndex = s; c.scaleMask = m; c.scaleLib = 'ZD Ultimate';
  c.scaleName = ZD_THEO[s] ? cents.length + '-note set (' + ZD.names[s] + ')' : ZD.names[s];
  c.scaleFamily = ZD_THEO[s] ? '' : ZD.families[ZD.fam[s]];
  const A = c.activeKeys || 1; c.scaleMatch = popc(m & A) / popc(m | A);
  if (c.keyActivity) { let num = 0, tot = 0, k = 0; for (let j = 0; j < 12; ++j) { tot += c.keyActivity[j]; if (m >> j & 1) { num += c.keyActivity[j]; k++; } } c.scaleFit = num / (k + tot - num); }
  if (c.octave && degs.length === cents.length) c.activeDegrees = degs;
  c.nActive = cents.length;
  return true;
}
// the library for the menu: names, families, and each scale's mask (bit j = key j)
export const ZD_LIB = { names: ZD.names, families: ZD.families, fam: ZD.fam, masks: Array.from(ZD_MASK), theo: Array.from(ZD_THEO) };

// (1.0) A ZD SCALE ON AN MTS-ESP MASTER. Mat: « pourquoi quand je choisis MTS-ESP la scale est désactivée ? Pour les tunings à
// 12 notes, toutes les scales de 3 à 12 notes doivent pouvoir être sélectionnées ». The tonic is the analysis's: the master's
// note nearest the subject's fundamental (Mat chose it). The master's notes in the octave above it are read as a tuning and
// get their keys by the analysis's own rule (chooseScale: 12 notes, the i-th on the i-th key; fewer, distinct keys at the
// least distance; more, the nearest key, realised by the pitch the subject uses most), which also gives the analysis's
// proposal on the master. A master that does not come back to the octave within 3 c carries no ZD scale (octave scales).
// Each key is then found in every octave of the master: its note there is the master's note nearest its pitch plus whole
// octaves, within 25 c. Returns the keys (cents above the tonic, null where the master has no pitch), the notes realising each
// key over the 128 (keyNotes), the keys available (bit j) and the proposal; null without a master or a fundamental.
export function masterScale (mts, f0, fp) {
  const hz = mts && mts.hz; if (!Array.isArray(hz) || !(f0 > 0)) return null;
  const pts = []; hz.forEach((h, n) => { if (h > 0 && Number.isFinite(h)) pts.push({ n, c: 1200 * Math.log2(h / f0) }); });
  if (pts.length < 2) return null;
  let z = pts[0]; for (const q of pts) if (Math.abs(q.c) < Math.abs(z.c)) z = q;
  const rel = pts.map(q => ({ n: q.n, x: q.c - z.c }));
  const near = x => { let b = rel[0]; for (const q of rel) if (Math.abs(q.x - x) < Math.abs(b.x - x)) b = q; return b; };
  const out = { tonic: z.n, octave: false, keyCents: new Array(12).fill(null), keyNotes: new Array(12).fill(null), avail: 0, proposed: -1, proposedName: '' };
  const o1 = near(1200); out.octave = Math.abs(o1.x - 1200) <= 3;
  if (!out.octave || !fp) return out;
  const inOct = rel.filter(q => q.x > -1e-9 && q.x < 1200 - 0.5).sort((a, b) => a.x - b.x || (a.n === z.n ? -1 : b.n === z.n ? 1 : a.n - b.n)), deg = [], dn = [];
  for (const q of inOct) { if (deg.length && q.x - deg[deg.length - 1] < 1) continue; deg.push(q.x); dn.push(q.n); }
  const c = { name: 'MTS-ESP', period: 1200, degrees: deg, activeDegrees: deg.map((_, i) => i), rootCents: centsOf(hz[z.n]) };
  chooseScale(c, fp);
  if (!c.keyCents || !c.keyDeg) return out;
  for (let j = 0; j < 12; ++j) {
    const kc = c.keyCents[j], kd = c.keyDeg[j]; if (kc === null || kd === null || kd < 0) continue;
    const notes = new Set([dn[kd]]);
    for (let o = -11; o <= 11; ++o) { if (!o) continue; const t = kc + 1200 * o, q = near(t); if (Math.abs(q.x - t) <= 25) notes.add(q.n); }
    out.keyCents[j] = kc; out.keyNotes[j] = [...notes].sort((a, b) => a - b); out.avail |= 1 << j;
  }
  if (Number.isInteger(c.scaleIndex) && c.scaleIndex >= 0) { out.proposed = c.scaleIndex; out.proposedName = c.scaleName; }
  return out;
}
// the master's notes a scale keeps (on: 128 flags) and the scale's function of each (lab: '1', 'b3' … as ZD writes them)
export function masterKeep (M, s) {
  if (!M || !(s >= 0 && s < ZD_N)) return null;
  const m = ZD_MASK[s]; if (!(m & 1) || (m & ~M.avail)) return null;
  const on = new Uint8Array(128), lab = new Array(128).fill(null);
  for (let j = 0; j < 12; ++j) if ((m >> j & 1) && M.keyNotes[j]) for (const n of M.keyNotes[j]) { on[n] = 1; lab[n] = ZD.pats[s][j]; }
  return { on, lab, s };
}

/** classes de hauteur de la GAMME (cents au-dessus de la tonique, dans sa période) : la gamme ZD choisie (période 1200) ;
 *  sinon les degrés actifs du tuning dans sa période */
export function scaleClasses (t) {
  if (!t) return null;
  if (t.scaleCents && t.scaleCents.length) return { period: 1200, cls: t.scaleCents.slice().sort((a, b) => a - b) };
  const p = t.period || 1200;
  return { period: p, cls: [...new Set([0, ...t.activeDegrees.map(i => ((t.degrees[i] % p) + p) % p)])].sort((a, b) => a - b) };
}

/** échelle de la gamme : cents au-dessus de la tonique des `count` premiers degrés ACTIFS, en montant
 *  (enfant 1 = degré 0 = la tonique, enfant 2 = degré actif suivant, … on passe à la période suivante) */
export function scaleLadder (cand, count) {
  if (cand.scaleCents && cand.scaleCents.length) { const sc = cand.scaleCents.filter(x => x >= 0 && x < 1200 - 1e-6); const out = []; for (let k = 0; k < count; ++k) out.push(sc[k % sc.length] + 1200 * Math.floor(k / sc.length)); return out; }
  const p = cand.period;
  const act = [...new Set([0, ...cand.activeDegrees.map(i => ((cand.degrees[i] % p) + p) % p)])].filter(c => c < p - 1e-6).sort((a, b) => a - b);
  const out = [];
  for (let k = 0; k < count; ++k) out.push(act[k % act.length] + p * Math.floor(k / act.length));
  return out;
}
