// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
import { readWav, writeWav } from './wav.js';
import { buildModel } from './model.js';
import { renderChild, TimeMap } from './render.js';
const SP = '/tmp/claude-0/-home-claude/404ef4cf-2def-5538-894a-a47c3052674d/scratchpad/';
const f = process.argv[2];
const w = readWav(f); const sr = 48000; let [L, R] = w.ch; const n = Math.min(L.length, sr * Number(process.env.SEC ?? 6)); L = L.slice(0, n); R = R.slice(0, n);
const t0 = Date.now(); const M = buildModel(L, R, sr); console.log('modèle', Date.now() - t0, 'ms', JSON.stringify(M.traits, (k, v) => typeof v === 'number' ? Math.round(v * 1000) / 1000 : v));
console.log('fondamentale', M.fundamentalName, M.fundamentalHz.toFixed(2), 'tempo', M.tempo ? M.tempo.bpm.toFixed(2) : '-', 'tuning', M.tuning?.name, M.tuning?.scaleName, 'échelle', M.ladder?.map(Math.round).join(' '));
const t1 = Date.now();
const ch = renderChild(M, [{ map: TimeMap.identity(n), resid: { gain: 1 } }], n);
let e = 0, ex = 0; for (let i = 0; i < n; ++i) { const g = Math.pow(10, -ch.gainDb / 20); e += (ch.L[i] * g - L[i]) ** 2 + (ch.R[i] * g - R[i]) ** 2; ex += L[i] ** 2 + R[i] ** 2; }
console.log('identité : rendu', Date.now() - t1, 'ms, écart au parent', (10 * Math.log10(e / ex)).toFixed(1), 'dB, gain', ch.gainDb.toFixed(2), 'dB, pièces', ch.nParts);
writeWav(SP + 'identite.wav', [ch.L, ch.R], sr);
