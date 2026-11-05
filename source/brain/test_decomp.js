// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
import { readWav, writeWav, resampleTo } from './wav.js';
import { decompose } from './decompose.js';
import { analyzePeaks, trackPartials, resynth, HOP } from './sines.js';
const SP = '/tmp/claude-0/-home-claude/404ef4cf-2def-5538-894a-a47c3052674d/scratchpad/';
const db = x => (10 * Math.log10(x)).toFixed(1);
for (const f of process.argv.slice(2)) {
  const w = readWav(f); let ch = w.ch; if (w.sr !== 48000) ch = resampleTo(ch, w.sr, 48000);
  const sr = 48000, [L, R] = ch, n = L.length, t0 = Date.now();
  const d = decompose(L, R, sr, { passes: Number(process.env.PASSES ?? 3) });
  const t1 = Date.now();
  const [SL, SR] = d.sines, [rL, rR] = d.resid;
  let ex = 0, es = 0, er = 0; for (let i = 0; i < n; ++i) { ex += L[i] ** 2 + R[i] ** 2; es += SL[i] ** 2 + SR[i] ** 2; er += rL[i] ** 2 + rR[i] ** 2; }
  const anX = analyzePeaks(L, R, sr, { bounds: d.bounds.slice(1, -1), keepFloor: true });
  const an2 = analyzePeaks(rL, rR, sr, { bounds: d.bounds.slice(1, -1), emergeDb: 9, ref: anX, relDb: -60 });
  const tr2 = trackPartials(an2, { minLen: 10, maxPerr: 0.5, join: false });
  globalThis.__res = { tr2, d };
  const [QL, QR] = resynth(tr2, n, HOP, sr, { bounds: d.bounds });
  let eq = 0; for (let i = 0; i < n; ++i) eq += QL[i] ** 2 + QR[i] ** 2;
  console.log(`${f.split('/').pop()} | passes ${JSON.stringify(d.log)} | partiels ${d.tracks.length} | sinus ${db(es / ex)} dB, résidu ${db(er / ex)} dB, tonal du résidu ${db(eq / es)} dB sous les sinus | ${t1 - t0} ms`);
  const base = SP + f.split('/').pop().replace(/\.wav$/, '').replace(/ /g, '_');
  writeWav(base + '_sines.wav', [SL, SR], sr); writeWav(base + '_resid.wav', [rL, rR], sr);
}
