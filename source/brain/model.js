// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// ============================================================================================
//  CHARIVARI — le PARENT comme micro-partition
//  Tout ce qui suit est MESURÉ sur le son (aucun tirage) :
//   • voix-partiels : trajectoire (cents), dynamique (dB), image stéréo, naissance, rang harmonique ;
//     chaque courbe séparée en TENDANCE (< 4 Hz, le geste) et VIE (le reste : vibrato, trémolo,
//     battements, micro-dérives) — la vie est ce que les mutations amplifient, transfèrent, gardent ;
//   • résidu : souffle, bruit, transitoires (le son lui-même, jamais un bruit fabriqué) ;
//   • micro-événements : attaques (raides/douces), leur force ;
//   • notes : segments harmoniques (fondamentale, début, fin) ;
//   • pouls (tempo, phase, confiance) ; tuning + gamme déduits du timbre, tonique = fondamentale ;
//   • traits : richesse de chaque couche (ce qui décide quelles opérations ont de la matière).
// ============================================================================================
import fs from 'node:fs';
import { decompose } from './decompose.js';
import { analyseSouffle, BANDS } from './souffle.js';
import { inferTempo } from './tempo.js';
import { loadTunings, fingerprintPoints, matchTunings, centsOf, hzOf, noteName, scaleLadder } from './microtonal.js';

let TUN = null;
export function tunings () { if (!TUN) TUN = loadTunings(JSON.parse(fs.readFileSync(new URL('./tunings.json', import.meta.url)))); return TUN; }

// passe-bas à phase nulle d'ordre 2 (aller-retour) sur une courbe échantillonnée à `rate` Hz
export function smooth (x, fc, rate) {
  const n = x.length; if (n < 3) return Float64Array.from(x);
  const K = Math.tan(Math.PI * Math.min(fc, rate * 0.45) / rate), q = Math.SQRT1_2, nn = 1 / (1 + K / q + K * K);
  const b0 = K * K * nn, b1 = 2 * b0, b2 = b0, a1 = 2 * (K * K - 1) * nn, a2 = (1 - K / q + K * K) * nn;
  const run = v => { let z1 = v[0] - b0 * v[0], z2 = b2 * v[0] - a2 * v[0];         // régime permanent (gain continu 1)
    for (let i = 0; i < v.length; ++i) { const u = v[i], y = b0 * u + z1; z1 = b1 * u - a1 * y + z2; z2 = b2 * u - a2 * y; v[i] = y; } };
  const P = Math.min(n - 1, Math.round(3 * rate / fc));
  const e = new Float64Array(n + 2 * P);
  for (let i = 0; i < P; ++i) e[i] = 2 * x[0] - x[P - i];
  e.set(x, P);
  for (let i = 0; i < P; ++i) e[P + n + i] = 2 * x[n - 1] - x[n - 2 - i];
  run(e); e.reverse(); run(e); e.reverse();
  return e.slice(P, P + n);
}

export function buildModel (L, R, sr, opts = {}) {
  const n = L.length, t0 = Date.now();
  const d = decompose(L, R, sr, { passes: opts.passes ?? 2, dense: !!opts.dense });
  const hop = d.hop, rate = sr / hop;
  // ---------------- voix-partiels ----------------
  const voices = d.tracks.map((t, i) => {
    // fréquence plancher 8 Hz (un partiel grave démodulé peut donner une estimation négative sur un creux)
    for (let q = 0; q < t.f.length; ++q) if (!(t.f[q] >= 8)) t.f[q] = q ? Math.max(8, t.f[q - 1]) : 8;
    const m = t.f.length, cents = new Float64Array(m), db = new Float64Array(m), pan = new Float64Array(m);
    for (let q = 0; q < m; ++q) {
      cents[q] = centsOf(Math.max(1, t.f[q]));
      const a = Math.hypot(t.aL[q], t.aR[q]) + 1e-12; db[q] = 20 * Math.log10(a);
      pan[q] = Math.atan2(t.aR[q], t.aL[q]) / (Math.PI / 2);      // 0 = gauche, 0,5 = centre, 1 = droite
    }
    // différence de phase entre voies (image stéréo : délai entre micros) — déroulée dans le temps
    const ipd = new Float64Array(m);
    if (t.pL && t.pR) { let prev = 0; for (let q = 0; q < m; ++q) { let d = t.pR[q] - t.pL[q]; d -= 2 * Math.PI * Math.round((d - prev) / (2 * Math.PI)); ipd[q] = d; prev = d; } }
    // avance de phase EXACTE d'une trame à la suivante (phases mesurées, 2πM au plus près de
    // l'intégrale de la fréquence) : garde les sauts de phase des creux de battement
    const adv = new Float64Array(m);
    for (let q = 0; q + 1 < m; ++q) { const pred = Math.PI * (t.f[q] + t.f[q + 1]) * hop / sr; const dp = t.pL[q + 1] - t.pL[q]; adv[q] = dp + 2 * Math.PI * Math.round((pred - dp) / (2 * Math.PI)); }
    // plancher : une trame muette (porte fermée) ne doit pas tirer la tendance vers −240 dB — sinon
    // la « vie » des trames voisines deviendrait +100 dB (mesuré : enfants à −160 dB de gain)
    let dmx = -300; for (let q = 0; q < m; ++q) dmx = Math.max(dmx, db[q]);
    const dbF = db.map(x => Math.max(x, dmx - 80));
    const cT = smooth(cents, 4, rate), dT = smooth(dbF, 4, rate);
    let en = 0, amax = 0; for (let q = 0; q < m; ++q) { const a2 = t.aL[q] ** 2 + t.aR[q] ** 2; en += a2; amax = Math.max(amax, Math.sqrt(a2)); }
    let lifeC = 0, lifeD = 0, wsum = 0;
    for (let q = 0; q < m; ++q) { const w = t.aL[q] ** 2 + t.aR[q] ** 2; lifeC += w * (cents[q] - cT[q]) ** 2; lifeD += w * (db[q] - dT[q]) ** 2; wsum += w; }
    return { id: i, j0: t.j[0], m, f: t.f, aL: t.aL, aR: t.aR, pL: t.pL, ipd, adv, cents, db, pan, centsTrend: cT, dbTrend: dT,
      harm: t.harm || 0, pass: t.pass, startAt: t.startAt, endAt: t.endAt, energy: en * hop, amax,
      lifeCents: Math.sqrt(lifeC / (wsum || 1)), lifeDb: Math.sqrt(lifeD / (wsum || 1)) };
  });
  // ---------------- énergies des couches ----------------
  let eS = 0, eR = 0, eX = 0;
  for (let i = 0; i < n; ++i) { eS += d.sines[0][i] ** 2 + d.sines[1][i] ** 2; eR += d.resid[0][i] ** 2 + d.resid[1][i] ** 2; eX += L[i] ** 2 + R[i] ** 2; }
  // enveloppe globale (10 ms) et zone active
  const B = Math.round(0.01 * sr), env = [];
  for (let b = 0; b < n; b += B) { let e = 0; for (let i = b; i < Math.min(n, b + B); ++i) e += L[i] ** 2 + R[i] ** 2; env.push(10 * Math.log10(e / B / 2 + 1e-20)); }
  const peakDb = Math.max(...env);
  let a0 = 0; while (a0 < env.length && env[a0] < peakDb - 60) a0 += 1;
  let a1 = env.length - 1; while (a1 > a0 && env[a1] < peakDb - 60) a1 -= 1;
  // ---------------- notes ----------------
  const notes = d.segs.map(([a, b]) => {
    const v = []; for (let j = a; j <= b; ++j) if (d.f0.f0[j] > 0) v.push(d.f0.f0[j]);
    v.sort((x, y) => x - y);
    return { t0: a * 256 / sr, t1: (b + 1) * 256 / sr, f0: v[v.length >> 1] };
  });
  // fondamentale dominante (poids = confiance × durée), affinée à ±50 c
  const hist = new Map();
  for (const [a, b] of d.segs) for (let j = a; j <= b; ++j) { const c = Math.round(centsOf(d.f0.f0[j]) / 10) * 10; hist.set(c, (hist.get(c) || 0) + d.f0.conf[j]); }
  let fc = null, fw = 0; for (const [c, w] of hist) if (w > fw) { fw = w; fc = c; }
  if (fc !== null) { let s = 0, ws = 0; for (const [a, b] of d.segs) for (let j = a; j <= b; ++j) { const c = centsOf(d.f0.f0[j]); if (Math.abs(c - fc) < 50) { s += c * d.f0.conf[j]; ws += d.f0.conf[j]; } } fc = s / ws; }
  // sans segment harmonique : la hauteur la plus présente de la carte des partiels (pic de l'empreinte)
  const pts = []; for (const v of voices) for (let q = 0; q < v.m; ++q) pts.push({ f: v.f[q], w: Math.hypot(v.aL[q], v.aR[q]) });
  const fp = fingerprintPoints(pts);
  if (fc === null && pts.length) { let bi = 0; for (let i = 1; i < fp.H.length; ++i) if (fp.H[i] > fp.H[bi]) bi = i; fc = fp.gridLo + bi * fp.res; }
  // ---------------- vibrato (sur la fondamentale des notes) ----------------
  let vibRate = 0, vibDepth = 0, vibW = 0;
  for (const [a, b] of d.segs) {
    if (b - a < 60) continue;
    const c = []; for (let j = a; j <= b; ++j) c.push(centsOf(d.f0.f0[j]));
    const tr = smooth(Float64Array.from(c), 2, sr / 256), dev = c.map((x, i) => x - tr[i]);
    let zc = 0; for (let i = 1; i < dev.length; ++i) if ((dev[i - 1] < 0) !== (dev[i] < 0)) zc += 1;
    const rateHz = zc / 2 / (dev.length * 256 / sr), depth = Math.sqrt(dev.reduce((s, x) => s + x * x, 0) / dev.length) * Math.SQRT2;
    const w = b - a; vibRate += rateHz * w; vibDepth += depth * w; vibW += w;
  }
  if (vibW) { vibRate /= vibW; vibDepth /= vibW; }
  // ---------------- pouls ----------------
  const tcs = inferTempo(d.onsets.map(o => o.t), d.onsets.map(o => Math.max(0.1, o.rise / 20)));
  const tempo = tcs.length && tcs[0].confidence >= (opts.tempoConf ?? 0.72) ? tcs[0] : null;
  // ---------------- tuning / gamme, tonique = fondamentale ----------------
  let tuning = null, ladder = null, tuningFree = null;
  if (pts.length) {
    tuningFree = matchTunings(fp, tunings(), { top: 1 })[0] || null;
    tuning = matchTunings(fp, tunings(), { top: 1, rootCents: fc })[0] || null;
    if (tuning) ladder = scaleLadder(tuning, 16);
  }
  // ---------------- stéréo, centroïde ----------------
  let panSpread = 0, pw = 0, cen = 0, cw = 0;
  for (const v of voices) for (let q = 0; q < v.m; ++q) { const w = v.aL[q] ** 2 + v.aR[q] ** 2; panSpread += w * (v.pan[q] - 0.5) ** 2; pw += w; cen += w * v.f[q]; cw += w; }
  let rc = 0, rl = 0, rr = 0; for (let i = 0; i < n; ++i) { rc += d.resid[0][i] * d.resid[1][i]; rl += d.resid[0][i] ** 2; rr += d.resid[1][i] ** 2; }
  const traits = {
    dur: n / sr, activeStart: a0 * 0.01, activeEnd: (a1 + 1) * 0.01,
    tonal: eS / (eS + eR + 1e-20),                       // part d'énergie portée par les partiels
    nVoices: voices.length, nHarm: voices.filter(v => v.harm).length,
    onsets: d.onsets.length, sharpOnsets: d.onsets.filter(o => o.sharp).length, onsetRate: d.onsets.length / (n / sr),
    notes: notes.length, pitchRangeCents: notes.length ? 1200 * Math.log2(Math.max(...notes.map(q => q.f0)) / Math.min(...notes.map(q => q.f0))) : 0,
    vibRate, vibDepth, harmonicity: fp.meta.harmonicity,
    lifeCents: voices.reduce((s, v) => s + v.lifeCents * v.energy, 0) / (voices.reduce((s, v) => s + v.energy, 0) || 1),
    lifeDb: voices.reduce((s, v) => s + v.lifeDb * v.energy, 0) / (voices.reduce((s, v) => s + v.energy, 0) || 1),
    panSpread: Math.sqrt(panSpread / (pw || 1)), residCorr: rc / Math.sqrt(rl * rr + 1e-30),
    centroid: cen / (cw || 1), tempoBpm: tempo ? tempo.bpm : 0, tempoConf: tcs.length ? tcs[0].confidence : 0
  };
  // fréquences aux trames voisines d'une attaque raide : l'estimateur y moyenne à travers le saut
  // de phase du partiel ré-excité ; on y reprend la fréquence de la trame voisine du même côté
  const sharp = d.onsets.filter(o => o.sharp).map(o => o.s);
  for (const v of voices) for (const b of sharp) {
    const qb = b / hop - v.j0; if (qb < 1 || qb > v.m - 2) continue;
    const qa = Math.floor(qb), qc = Math.ceil(qb);
    if (qa - 1 >= 0) v.f[qa] = v.f[qa - 1];
    if (qc + 1 < v.m) v.f[qc] = v.f[qc + 1];
    v.cents[qa] = centsOf(v.f[qa]); v.cents[qc] = centsOf(v.f[qc]);
  }
  // le souffle (résidu) et l'énergie des partiels par bande de 1/6 d'octave (pour les gestes qui
  // font passer l'énergie des partiels dans le souffle : chuchoter)
  const souffle = analyseSouffle(d.resid, sharp, sr);
  const nfr = Math.ceil(n / hop) + 1, partBands = BANDS.map(() => new Float32Array(nfr));
  for (const v of voices) for (let q = 0; q < v.m; ++q) { const b = Math.round(6 * Math.log2(v.f[q] / BANDS[0])); if (b >= 0 && b < BANDS.length) partBands[b][v.j0 + q] += (v.aL[q] ** 2 + v.aR[q] ** 2) / 4; }
  for (const pb of partBands) for (let j = 0; j < nfr; ++j) pb[j] = Math.sqrt(pb[j]);
  return { sr, n, L, R, hop, voices, sharpBounds: sharp, souffle, partBands, resid: d.resid, sines: d.sines, bounds: d.bounds, onsets: d.onsets, f0: d.f0, segs: d.segs, notes,
    fundamentalCents: fc, fundamentalHz: fc !== null ? hzOf(fc) : 0, fundamentalName: fc !== null ? noteName(fc) : '',
    tempo, tempoCands: tcs, tuning, tuningFree, ladder, fingerprint: fp, traits, env, peakDb, ms: Date.now() - t0 };
}
