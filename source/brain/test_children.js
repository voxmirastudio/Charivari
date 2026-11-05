// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
import { readWav, writeWav, resampleTo } from './wav.js';
import { buildModel } from './model.js';
import { designPopulation, birth } from './genome.js';
import { measure, specDist } from './metrics.js';
import fs from 'node:fs';
import v8 from 'node:v8';
const f = process.argv[2], outDir = process.argv[3], accord = process.env.ACCORD === '1', miroir = Number(process.env.MIROIR ?? 1);
fs.mkdirSync(outDir, { recursive: true });
const w = readWav(f); let ch = w.ch; if (w.sr !== 48000) ch = resampleTo(ch, w.sr, 48000);
const sr = 48000; const lim = Math.min(ch[0].length, 1048576); const [L, R] = [ch[0].slice(0, lim), ch[1].slice(0, lim)];   // 21,8 s au plus, comme dans Charivari
const cacheF = '/tmp/claude-0/-home-claude/404ef4cf-2def-5538-894a-a47c3052674d/scratchpad/cache_' + f.split('/').pop().replace(/[^a-z0-9]/gi, '_') + '.v8';
const t0 = Date.now(); let M;
if (process.env.NOCACHE !== '1' && fs.existsSync(cacheF)) { M = v8.deserialize(fs.readFileSync(cacheF)); }
else { M = buildModel(L, R, sr); const { _body, _bodyRaw, _rcache, ...keep } = M; fs.writeFileSync(cacheF, v8.serialize(keep)); }
const tModel = Date.now() - t0;
// clics : dérivée seconde > 10 × son RMS local (fenêtre 5 ms), hors zones où le parent en a aussi
const clicks = (X) => { let c = 0; const B = 240; for (let b = 10; b + B + 10 < X.length; b += B) { let s = 0; for (let i = b; i < b + B; ++i) { const d = X[i] - 2 * X[i - 1] + X[i - 2]; s += d * d; } const r = Math.sqrt(s / B) + 1e-9; for (let i = b; i < b + B; ++i) { const d = X[i] - 2 * X[i - 1] + X[i - 2]; if (Math.abs(d) > 10 * r && Math.abs(d) > 1e-3) { let k = 0; for (let j = i - 8; j <= i + 8; ++j) if (Math.abs(X[j] - 2 * X[j - 1] + X[j - 2]) > 5 * r) k += 1; if (k <= 3) { c += 1; break; } } } } return c; };  // clic = discontinuité isolée (≤ 3 échantillons), pas une attaque (large bande sur plusieurs)
const pop = designPopulation(M, { miroir });
const lines = [`${f.split('/').pop()} — modèle ${tModel} ms ; ${M.voices.length} partiels ; tonal ${(M.traits.tonal * 100).toFixed(0)} % ; fondamentale ${M.fundamentalName} ; tempo ${M.tempo ? M.tempo.bpm.toFixed(2) + ' BPM' : '—'} ; tuning ${M.tuning?.name} (${M.tuning?.scaleName}) ; clics parent ${clicks(L)}`,
  'pertinence : ' + Object.entries(pop.relevance).map(([g, r]) => `${g} ${r.toFixed(2)}`).join(', ')];
writeWav(`${outDir}/00_parent.wav`, [L, R], sr);
const mp = measure(L, R, sr);
lines.push(`parent : ${mp.dur.toFixed(2)} s, aigu>10k ${mp.hfPct.toFixed(2)} %, grave<40 ${mp.lfPct.toFixed(2)} %, centroïde ${mp.centroid.toFixed(0)} Hz, attaques ${mp.onsets}`);
pop.kids.forEach((kid, k) => {
  const t1 = Date.now();
  const c = birth(M, kid, pop.ctx, { accordCents: accord && M.ladder ? M.ladder[k] : 0 });
  const name = `${String(k + 1).padStart(2, '0')}_${kid.genome.map(x => x.g).join('+')}.wav`;
  writeWav(`${outDir}/${name}`, [c.L, c.R], sr);
  const mc = measure(c.L, c.R, sr);
  lines.push(`pad ${k + 1} (ι ${kid.iota.toFixed(2)}) ${name} — ${(c.D / sr).toFixed(2)} s, ${Date.now() - t1} ms, clics ${clicks(c.L)}+${clicks(c.R)}, aigu ${mc.hfPct.toFixed(2)} %, grave ${mc.lfPct.toFixed(2)} %, centroïde ${mc.centroid.toFixed(0)} Hz, attaques ${mc.onsets}, distance spectrale ${specDist(mc, mp).toFixed(1)} dB | ${c.desc.join(' · ')}`);
});
fs.writeFileSync(`${outDir}/_journal.txt`, lines.join('\n') + '\n');
console.log(lines.join('\n'));
