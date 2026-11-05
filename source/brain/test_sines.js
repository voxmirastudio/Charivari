// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
import { readWav, writeWav, resampleTo } from './wav.js';
import { analyzePeaks, trackPartials, resynth, HOP } from './sines.js';
import { detectOnsets } from './onsets.js';
import { refineTracks } from './refine.js';
const SP = '/tmp/claude-0/-home-claude/404ef4cf-2def-5538-894a-a47c3052674d/scratchpad/';
const E = Number(process.env.E ?? 6), NMAX = Number(process.env.NMAX ?? 4096), CUT = process.env.CUT !== '0';
const db = x => (10 * Math.log10(x)).toFixed(1);
for (const f of process.argv.slice(2)) {
  const w = readWav(f); let ch = w.ch; if (w.sr !== 48000) ch = resampleTo(ch, w.sr, 48000);
  const sr = 48000, [L, R] = ch, n = L.length;
  const M = new Float64Array(n); for (let i = 0; i < n; ++i) M[i] = 0.5 * (L[i] + R[i]);
  const t0 = Date.now();
  const on = detectOnsets(M, sr);
  const bounds = CUT ? on.onsets.filter(o => o.sharp).map(o => o.s) : [];
  const an = analyzePeaks(L, R, sr, { bounds, emergeDb: E, Nmax: NMAX });
  const tr0 = trackPartials(an);
  const rf = refineTracks(tr0, L, R, sr, an.bounds);
  const tr = rf.tracks;
  const [SL, SR] = resynth(tr, n, rf.hop, sr, { bounds: an.bounds });
  const t1 = Date.now();
  let ex = 0, es = 0, er = 0;
  const rL = new Float64Array(n), rR = new Float64Array(n);
  for (let i = 0; i < n; ++i) { rL[i] = L[i] - SL[i]; rR[i] = R[i] - SR[i]; ex += L[i] ** 2 + R[i] ** 2; es += SL[i] ** 2 + SR[i] ** 2; er += rL[i] ** 2 + rR[i] ** 2; }
  // tonalité restant dans le résidu
  const an2 = analyzePeaks(rL, rR, sr, { bounds, emergeDb: 9, Nmax: NMAX });
  const tr2 = trackPartials(an2, { minLen: 10, maxPerr: 0.5 });
  const [QL, QR] = resynth(tr2, n, HOP, sr, { bounds: an.bounds });
  globalThis.__dbg = { tr, tr2, sr };
  let eq = 0; for (let i = 0; i < n; ++i) eq += QL[i] ** 2 + QR[i] ** 2;
  // pré-écho : énergie des sinus dans les 20 ms avant chaque attaque raide / énergie du son
  const pe = [];
  for (const o of on.onsets.filter(o => o.sharp)) {
    let a = 0, b = 0; for (let i = Math.max(0, o.s - 960); i < o.s; ++i) { a += SL[i] ** 2 + SR[i] ** 2; b += L[i] ** 2 + R[i] ** 2; }
    if (b > 0) pe.push(a / b);
  }
  pe.sort((a, b) => a - b);
  const nFr = an.frames.filter(Boolean).length, npk = an.frames.reduce((a, b) => a + (b ? b.peaks.length : 0), 0);
  const lens = tr.map(t => (t.j[t.j.length - 1] - t.j[0] + 1) * rf.hop / HOP).sort((a, b) => a - b);
  console.log(`${f.split('/').pop()} ${(n / sr).toFixed(2)} s | attaques ${on.onsets.length} (raides ${bounds.length}) | trames analysées ${nFr}/${an.frames.length} pics/trame ${(npk / nFr).toFixed(1)} | pistes ${tr.length} (durée médiane ${(lens[lens.length >> 1] * HOP / sr * 1000).toFixed(0)} ms)`);
  console.log(`   sinus ${db(es / ex)} dB | résidu ${db(er / ex)} dB | tonal resté dans le résidu ${db(eq / es)} dB sous les sinus | pré-écho médian ${pe.length ? db(pe[pe.length >> 1]) : '-'} dB, max ${pe.length ? db(pe[pe.length - 1]) : '-'} dB | ${Date.now() - t0} ms`);
  const base = SP + f.split('/').pop().replace(/\.wav$/, '').replace(/ /g, '_');
  writeWav(base + '_sines.wav', [SL, SR], sr); writeWav(base + '_resid.wav', [rL, rR], sr);
}
