// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// ============================================================================================
//  CHARIVARI — décomposition complète : partiels (enveloppes exactes) + résidu + attaques
//  Passe 1 : analyse du son, suivi, raffinement hétérodyne, retrait.
//  Passes 2..P : on ré-analyse CE QUI RESTE : les partiels cachés par un voisin fort (couples qui
//  battent, partiels faibles) apparaissent une fois les forts retirés. Un pic du reste qui tombe
//  sur un partiel déjà extrait n'est pas un nouveau partiel (c'est son erreur de modèle) : écarté.
//  Résidu final = son − resynthèse du modèle (exact par construction : la somme rend le parent).
// ============================================================================================
import { analyzePeaks, trackPartials, resynth, HOP } from './sines.js';
import { refineTracks } from './refine.js';
import { detectOnsets } from './onsets.js';
import { f0Track, harmonicSegments } from './f0.js';
import { harmonicTracks } from './harmonic.js';

export function decompose (L, R, sr, opts = {}) {
  const n = L.length, passes = opts.passes ?? 3, hop2 = opts.hop2 ?? 128;
  const M = new Float64Array(n); for (let i = 0; i < n; ++i) M[i] = 0.5 * (L[i] + R[i]);
  const on = detectOnsets(M, sr, opts);
  const sharp = on.onsets.filter(o => o.sharp).map(o => o.s);
  const WL = Float64Array.from(L), WR = Float64Array.from(R);
  const all = [], log = [];
  let bounds = null;
  // 0. matière harmonique d'abord (trajectoires portées par la fondamentale)
  const an0 = analyzePeaks(WL, WR, sr, { bounds: sharp, emergeDb: 6, keepFloor: true });
  const ft = f0Track(an0), segs = harmonicSegments(ft);
  bounds = an0.bounds;
  if (opts.harmonic !== false && segs.length) {
    const ht = harmonicTracks(an0, ft, segs, sr);
    const rh = refineTracks(ht, WL, WR, sr, bounds, { hop: HOP, hop2, inPlace: true });
    for (const t of rh.tracks) t.pass = 0;
    all.push(...rh.tracks);
    log.push({ pass: 0, harmonic: segs.length, found: rh.tracks.length });
  }
  for (let p = 0; p < passes; ++p) {
    const an = p === 0 && !all.length ? an0 : analyzePeaks(WL, WR, sr, { bounds: sharp, emergeDb: 6, ref: an0, relDb: -60 });
    bounds = an.bounds;
    let tr = trackPartials(an, all.length ? { maxPerr: opts.dense ? 1.1 : 0.8, minEmerg: opts.dense ? 9 : 15 } : { minEmerg: opts.dense ? 9 : 15, maxPerr: opts.dense ? 1.2 : 1.0 });
    if (all.length) {
      // écarter ce qui tombe sur un partiel déjà extrait (à fc près, ou 15 Hz) sur la moitié de sa vie
      const occ = new Map();
      for (const t of all) { let am = 0; for (let q = 0; q < t.j.length; ++q) am = Math.max(am, t.aL[q] + t.aR[q]); for (let q = 0; q < t.j.length; ++q) { if ((t.j[q] * hop2) % HOP || t.aL[q] + t.aR[q] < 0.1 * am) continue; const jj = t.j[q] * hop2 / HOP; let l = occ.get(jj); if (!l) occ.set(jj, l = []); l.push([t.f[q], Math.max(15, t.fc)]); } }
      tr = tr.filter(t => { let hit = 0; for (let q = 0; q < t.j.length; ++q) if ((occ.get(t.j[q]) || []).some(([f, w]) => Math.abs(f - t.f[q]) < w)) hit += 1; return hit < 0.5 * t.j.length; });
    }
    if (!tr.length) { log.push({ pass: p + 1, found: 0 }); break; }
    const rf = refineTracks(tr, WL, WR, sr, bounds, { hop: HOP, hop2, others: all, otherHop: hop2, inPlace: true });
    for (const t of rf.tracks) t.pass = p + 1;
    all.push(...rf.tracks);
    log.push({ pass: p + 1, found: rf.tracks.length });
  }
  const [SL, SR] = resynth(all, n, hop2, sr, { bounds });
  const rL = new Float64Array(n), rR = new Float64Array(n);
  for (let i = 0; i < n; ++i) { rL[i] = L[i] - SL[i]; rR[i] = R[i] - SR[i]; }
  return { tracks: all, hop: hop2, bounds, onsets: on.onsets, f0: ft, segs, sines: [SL, SR], resid: [rL, rR], log };
}
