// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// banc : moteur vivant (JS)
// node cli_phv.js in.wav out.wav stretch <α>  |  shift <cents> <formants 0|1>  |  reverse  |  freeze <t s> <durée s>
import { readWav, writeWav } from './wav.js';
import { prepare, render, stretchMap } from './phv.js';
const [, , fin, fout, mode, a1, a2] = process.argv;
const w = readWav(fin), sr = w.sr, [L, R] = w.ch, n = w.n;
const t0 = Date.now();
const P = prepare(L, R, sr);
const t1 = Date.now();
let out;
if (mode === 'stretch') { const m = stretchMap(P, Number(a1)); out = render(P, { D: m.D, T: m.T }); }
else if (mode === 'shift') { const r = Math.pow(2, Number(a1) / 1200), f = a2 === '1'; out = render(P, { D: n, T: t => t, r: () => r, sb: () => (f ? 1 : r) }); }
else if (mode === 'reverse') out = render(P, { D: n, T: t => n - 1 - t });
else if (mode === 'identity') out = render(P, { D: n, T: t => t });
const t2 = Date.now();
writeWav(fout, [out.L, out.R], sr);
console.error(`prepare ${(t1 - t0) / 1000}s render ${(t2 - t1) / 1000}s  onsets ${P.onsets.length} f0med ${P.f0med.toFixed(1)}`);
