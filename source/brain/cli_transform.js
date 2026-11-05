// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// banc : transformation globale par le moteur sinusoïdal (partiels + souffle)
// node cli_transform.js in.wav out.wav <étirement> <cents> <formants 0|1> [dense 0|1]
import { readWav, writeWav } from './wav.js';
import { buildModel } from './model.js';
import { renderChild, TimeMap, bodyAt, bodyGain } from './render.js';
const [, , fin, fout, sA, sC, sF, sD] = process.argv;
const a = Number(sA), cents = Number(sC), formant = sF === '1';
const w = readWav(fin), sr = w.sr, [L, R] = w.ch, n = w.n;
const M = buildModel(L, R, sr, { dense: sD === '1' });
const D = Math.round(n * a);
const S = { map: TimeMap.linear(0, D, 0, n), resid: { gain: 1, ratio: formant ? 1 : Math.pow(2, cents / 1200) } };
if (cents) {
  S.cents = (v, tau, c) => c + cents;
  if (formant) S.db = (v, tau, d, jq, c, c2) => d + formantKeep(M, jq, c, c2);
}
function formantKeep (M, jq, c, c2) { const B = bodyAt(M, jq); return Math.max(-30, Math.min(30, B.at(c2) - B.at(c))); }
const out = renderChild(M, [S], D, { noNorm: true });
writeWav(fout, [out.L, out.R], sr);
