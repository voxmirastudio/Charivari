// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// ============================================================================================
//  CHARIVARI — lecture du PARENT pour concevoir ses enfants (moteur vivant)
//  Tout ce que la conception demande, mesuré sur le son : attaques, notes, fondamentale, tuning et
//  gamme (empreinte des pics réalloués), pouls, vibrato, vie, part tonale, rangs harmoniques, formants.
//  Rien n'est resynthétisé ici : le rendu relit l'original (phv.js).
// ============================================================================================
import { prepare } from './phv.js';
import { detectOnsets } from './onsets.js';
import { attackTimes, analyseTempo } from './tempo2.js';
import { loadTunings, fingerprintPoints, matchTunings, chooseScale, centsOf, hzOf, noteName, scaleLadder } from './microtonal.js';
import { smooth } from './util.js';
import TUNINGS_DATA from './tunings.json' with { type: 'json' };

let TUN = null;
const tunings = () => TUN || (TUN = loadTunings(TUNINGS_DATA));

export function analyseParent (L, R, sr, opts = {}) {
  const t0 = Date.now();
  const P = prepare(L, R, sr, opts);
  const n = P.n, hop = P.hopF, nfr = P.frames.length, rate = sr / hop;
  // enveloppe 10 ms, zone active — mesurée sans continu ni infrasons (passe-haut 20 Hz aller-retour) : un décalage continu
  // d'interface (mesuré : −81 dBFS sur la fourchette, 16 dB au-dessus de sa vraie fin) ferait croire que le son dure
  const Bk = Math.round(0.01 * sr), env = [], hL = hp20(L, sr), hR = hp20(R, sr);
  for (let b = 0; b < n; b += Bk) { let e = 0; for (let i = b; i < Math.min(n, b + Bk); ++i) e += hL[i] * hL[i] + hR[i] * hR[i]; env.push(10 * Math.log10(e / Bk / 2 + 1e-20)); }
  const peakDb = Math.max(...env);
  let a0 = 0; while (a0 < env.length && env[a0] < peakDb - 60) a0 += 1;
  let a1 = env.length - 1; while (a1 > a0 && env[a1] < peakDb - 60) a1 -= 1;
  // attaques (toutes, avec raideur)
  const onsets = detectOnsets(P.M, sr).onsets;
  // notes : suites de trames voisées à hauteur continue (sauts < 80 c), ≥ 60 ms
  const notes = []; let s = -1;
  for (let j = 0; j <= nfr; ++j) {
    const ok = j < nfr && P.voiced[j] > 0 && (s < 0 || Math.abs(1200 * Math.log2(P.voiced[j] / P.voiced[j - 1])) < 80);
    if (ok && s < 0) s = j;
    if (!ok && s >= 0) { if ((j - s) * hop >= 0.06 * sr) { const v = Array.from(P.voiced.slice(s, j)).sort((a, b) => a - b); notes.push({ t0: s * hop / sr, t1: j * hop / sr, f0: v[v.length >> 1], j0: s, j1: j }); } s = -1; if (j < nfr && P.voiced[j] > 0) s = j; }
  }
  // fondamentale : histogramme (10 c) des trames voisées pondéré par l'énergie
  const hist = new Map();
  for (let j = 0; j < nfr; ++j) if (P.voiced[j] > 0) { const c = Math.round(centsOf(P.voiced[j]) / 10) * 10; hist.set(c, (hist.get(c) || 0) + Math.sqrt(P.frameEnergy[j])); }
  let fc = null, fw = 0; for (const [c, w] of hist) if (w > fw) { fw = w; fc = c; }
  // empreinte microtonale : pics réalloués (fréquence exacte) pondérés par leur amplitude
  const pts = []; for (const fr of P.frames) for (const p of fr.peaks) pts.push({ f: p.f, w: p.a });
  const fp = fingerprintPoints(pts);
  if (fc === null && pts.length) { let bi = 0; for (let i = 1; i < fp.H.length; ++i) if (fp.H[i] > fp.H[bi]) bi = i; fc = fp.gridLo + bi * fp.res; }
  let tuning = null, ladder = null;
  // tuning (OÙ sont les hauteurs : ODDSound) puis gamme (LESQUELLES on joue : ZD Ultimate, choisie sur l'activité des touches)
  if (pts.length) { tuning = matchTunings(fp, tunings(), { top: 1, rootCents: fc })[0] || null; if (tuning) { chooseScale(tuning, fp); ladder = scaleLadder(tuning, 16); } }
  // pouls
  // pouls, tatum et micro-groove (tempo2.js) ; au-dessous de 0,45 de confiance, pas de pouls : les enfants suivent l'unité
  // propre du son (confiance mesurée : 0,77–0,80 sur les boucles, 0,47–0,70 sur les lignes jouées, 0,35 sur une trompette
  // en vrac)
  const AT = attackTimes(onsets, sr).attacks, T2 = analyseTempo(AT);
  // (V6.6) a pulse read on 3 to 5 attacks (tempo2: confidence = share of arbitrary arrangements that fit worse) is kept from 0.70
  const tempo = T2 && T2.confidence >= (opts.tempoConf ?? (T2.sparse ? 0.70 : 0.45)) ? T2 : null;
  // vibrato et vie, sur les notes
  let vibRate = 0, vibDepth = 0, vibW = 0, lifeC = 0, lifeD = 0, lw = 0;
  for (const q of notes) {
    const m = q.j1 - q.j0; if (m < 12) continue;
    const c = Float64Array.from({ length: m }, (_, i) => centsOf(P.voiced[q.j0 + i]));
    const tr = smooth(c, 2, rate), dev = Array.from(c, (x, i) => x - tr[i]);
    let zc = 0; for (let i = 1; i < m; ++i) if ((dev[i - 1] < 0) !== (dev[i] < 0)) zc += 1;
    const depth = Math.sqrt(dev.reduce((a, x) => a + x * x, 0) / m);
    vibRate += zc / 2 / (m / rate) * m; vibDepth += depth * Math.SQRT2 * m; vibW += m;
    const d = Float64Array.from({ length: m }, (_, i) => 10 * Math.log10(P.frameEnergy[q.j0 + i] + 1e-20)), dt = smooth(d, 4, rate);
    let sd = 0; for (let i = 0; i < m; ++i) sd += (d[i] - dt[i]) ** 2;
    lifeC += depth * m; lifeD += Math.sqrt(sd / m) * m; lw += m;
  }
  if (vibW) { vibRate /= vibW; vibDepth /= vibW; }
  // part tonale, rangs harmoniques présents, nombre de pics
  let eT = 0, eH = 0, nh = [], np = [];
  for (let j = 0; j < nfr; ++j) {
    const e = P.frameEnergy[j]; eT += e; const pk = P.frames[j].peaks; np.push(pk.length);
    const F = P.voiced[j]; if (!(F > 0)) continue;
    let ehj = 0, cnt = 0; const seen = new Set();
    for (const p of pk) { const h = Math.round(p.f / F); if (h >= 1 && Math.abs(1200 * Math.log2(p.f / (h * F))) < 35) { ehj += p.a * p.a * 3; if (!seen.has(h)) { seen.add(h); cnt++; } } }
    eH += Math.min(e, ehj); nh.push(cnt);
  }
  const med = a => { if (!a.length) return 0; const b = a.slice().sort((x, y) => x - y); return b[b.length >> 1]; };
  // formants : pics du spectre moyen lissé au tiers d'octave (250 Hz – 6,5 kHz)
  const Bf = P.Pavg.length, Nf = P.Nf, bands = [];
  for (let fcb = 60; fcb < 16000; fcb *= Math.pow(2, 1 / 6)) { const lo = Math.floor(fcb / Math.pow(2, 1 / 6) * Nf / sr), hi = Math.ceil(fcb * Math.pow(2, 1 / 6) * Nf / sr); let e = 0; for (let k = Math.max(1, lo); k <= Math.min(Bf - 1, hi); ++k) e += P.Pavg[k]; bands.push([fcb, 10 * Math.log10(e / Math.max(1, hi - lo + 1) + 1e-30)]); }
  const sm = bands.map((_, i) => { let s2 = 0, w = 0; for (let k = -2; k <= 2; ++k) { const b = bands[i + k]; if (b) { const ww = 1 - Math.abs(k) / 3; s2 += ww * b[1]; w += ww; } } return s2 / w; });
  const pkF = []; for (let i = 1; i < sm.length - 1; ++i) if (sm[i] > sm[i - 1] && sm[i] >= sm[i + 1] && bands[i][0] > 250 && bands[i][0] < 6500) pkF.push([bands[i][0], sm[i]]);
  pkF.sort((a, b) => b[1] - a[1]);
  let cen = 0, cw = 0; for (let k = 1; k < Bf; ++k) { cen += k * sr / Nf * P.Pavg[k]; cw += P.Pavg[k]; }
  const traits = {
    dur: n / sr, activeStart: a0 * 0.01, activeEnd: (a1 + 1) * 0.01,
    tonal: eT > 0 ? eH / eT : 0, nHarm: med(nh), nVoices: med(np),
    onsets: onsets.length, sharpOnsets: onsets.filter(o => o.sharp).length, onsetRate: onsets.length / (n / sr),
    notes: notes.length, pitchRangeCents: notes.length ? 1200 * Math.log2(Math.max(...notes.map(q => q.f0)) / Math.min(...notes.map(q => q.f0))) : 0,
    vibRate, vibDepth, harmonicity: fp.meta.harmonicity, lifeCents: lw ? lifeC / lw : 0, lifeDb: lw ? lifeD / lw : 0,
    centroid: cw ? cen / cw : 0, tempoBpm: tempo ? tempo.bpm : 0, tempoConf: T2 ? T2.confidence : 0
  };
  return Object.assign(P, { env, peakDb, onsetsAll: onsets, notes, fundamentalCents: fc, fundamentalHz: fc !== null ? hzOf(fc) : 0,
    fundamentalName: fc !== null ? noteName(fc) : '', tuning, ladder, tempo, tempoAll: T2, attacks: AT, fingerprint: fp, traits,
    formants: pkF.length ? pkF.slice(0, 3).map(p => p[0]) : [1200], ms: Date.now() - t0 });
}

// passe-haut Butterworth d'ordre 2 à 20 Hz, aller-retour (phase nulle)
function hp20 (x, sr) {
  const w = 2 * Math.PI * 20 / sr, c = Math.cos(w), al = Math.sin(w) / Math.SQRT2, a0 = 1 + al;
  const b0 = (1 + c) / 2 / a0, b1 = -(1 + c) / a0, b2 = b0, a1 = -2 * c / a0, a2 = (1 - al) / a0;
  const y = Float64Array.from(x), run = () => { let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < y.length; ++i) { const u = y[i], v = b0 * u + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = u; y2 = y1; y1 = v; y[i] = v; } };
  run(); y.reverse(); run(); y.reverse();
  return y;
}
