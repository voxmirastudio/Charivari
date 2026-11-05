// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
import { readWav, writeWav, resampleTo } from './wav.js';
import { buildModel } from './model.js';
import { designPopulation, birth } from './population.js';
import { measure, specDist } from './metrics.js';
import { grainIndex } from './grain.js';
import fs from 'node:fs'; import v8 from 'node:v8';
const f = process.argv[2], outDir = process.argv[3], accord = process.env.ACCORD === '1', only = process.env.ONLY ? process.env.ONLY.split(',').map(Number) : null;
fs.mkdirSync(outDir, { recursive: true });
const w = readWav(f); let ch = w.ch; if (w.sr !== 48000) ch = resampleTo(ch, w.sr, 48000);
const sr = 48000, lim = Math.min(ch[0].length, 1048576), L = ch[0].slice(0, lim), R = ch[1].slice(0, lim);
const cacheF = '/tmp/claude-0/-home-claude/404ef4cf-2def-5538-894a-a47c3052674d/scratchpad/cache3_' + f.split('/').pop().replace(/[^a-z0-9]/gi, '_') + '.v8';
let M, t0 = Date.now();
if (process.env.NOCACHE !== '1' && fs.existsSync(cacheF)) M = v8.deserialize(fs.readFileSync(cacheF));
else { M = buildModel(L, R, sr, { dense: true }); const { _body, _bodyRaw, _rcache, ...keep } = M; if (keep.souffle) delete keep.souffle.stat; fs.writeFileSync(cacheF, v8.serialize(keep)); }
const tModel = Date.now() - t0;
const clicks = (X) => { let c = 0; const B = 240; for (let b = 10; b + B + 10 < X.length; b += B) { let s = 0; for (let i = b; i < b + B; ++i) { const d = X[i] - 2 * X[i - 1] + X[i - 2]; s += d * d; } const r = Math.sqrt(s / B) + 1e-9; for (let i = b; i < b + B; ++i) { const d = X[i] - 2 * X[i - 1] + X[i - 2]; if (Math.abs(d) > 10 * r && Math.abs(d) > 1e-3) { let k = 0; for (let j = i - 8; j <= i + 8; ++j) if (Math.abs(X[j] - 2 * X[j - 1] + X[j - 2]) > 5 * r) k += 1; if (k <= 3) { c += 1; break; } } } } return c; };
const gaps = (A, B2) => { const Bk = 480, env = []; for (let b = 0; b + Bk <= A.length; b += Bk) { let e = 0; for (let i = b; i < b + Bk; ++i) e += A[i] ** 2 + B2[i] ** 2; env.push(10 * Math.log10(e / Bk / 2 + 1e-20)); } const pk = Math.max(...env); let lead = 0; while (lead < env.length && env[lead] < pk - 40) lead++; let last = -1, g = 0; for (let i = 0; i < env.length; ++i) if (env[i] >= pk - 45) { if (last >= 0 && i - last > 20) g = Math.max(g, (i - last) * 0.01); last = i; } return { lead: lead * 0.01, gap: g }; };
const pop = designPopulation(M, { miroir: Number(process.env.MIROIR ?? 1) });
const mp = measure(L, R, sr), gp = grainIndex(L, R, sr), sp = gaps(L, R);
const lines = [`${f.split('/').pop()} — modèle ${tModel} ms (dense) ; ${M.voices.length} partiels ; tonal ${(M.traits.tonal * 100).toFixed(0)} % ; fondamentale ${M.fundamentalName} ; tempo ${M.tempo ? M.tempo.bpm.toFixed(2) + ' BPM' : '—'} ; tuning ${M.tuning?.name} (${M.tuning?.scaleName}) ; formants ${pop.ctx.formants.map(Math.round).join('/')} Hz`,
  `parent : ${mp.dur.toFixed(2)} s, grain ${(100 * gp).toFixed(1)} %, centroïde ${mp.centroid.toFixed(0)} Hz, silence initial ${sp.lead.toFixed(2)} s, plus long trou ${sp.gap.toFixed(2)} s, clics ${clicks(L)}`];
writeWav(`${outDir}/00_parent.wav`, [L, R], sr);
pop.kids.forEach((kid, k) => {
  if (only && !only.includes(k + 1)) return;
  const t1 = Date.now();
  const c = birth(M, kid, pop.ctx, { accordCents: accord && M.ladder ? M.ladder[k] : 0 });
  const name = `${String(k + 1).padStart(2, '0')}_${kid.genome.map(x => x.g).join('+')}.wav`;
  writeWav(`${outDir}/${name}`, [c.L, c.R], sr);
  const mc = measure(c.L, c.R, sr), gc = grainIndex(c.L, c.R, sr), sc = gaps(c.L, c.R);
  lines.push(`pad ${k + 1} ${name} — ${(c.L.length / sr).toFixed(2)} s, ${Date.now() - t1} ms, clics ${clicks(c.L)}+${clicks(c.R)}, grain ${(100 * gc).toFixed(1)} %, centroïde ${mc.centroid.toFixed(0)} Hz, silence initial ${sc.lead.toFixed(2)} s, plus long trou ${sc.gap.toFixed(2)} s, distance spectrale ${specDist(mc, mp).toFixed(1)} dB | ${c.desc.join(' · ')}`);
  console.log(lines[lines.length - 1].slice(0, 400));
});
fs.writeFileSync(`${outDir}/_journal.txt`, lines.join('\n') + '\n');
console.log(lines.slice(0, 2).join('\n'));
