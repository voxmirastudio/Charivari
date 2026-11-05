// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// ============================================================================================
//  CHARIVARI — pulse and micro-groove of the subject (after jgcompose_rhythm: infer_tempo, tempo_family,
//  _best_grid_res, _swing_ratio, extract_groove), measured on the audio attacks.
//
//  What differs from the jgcompose port (tempo.js), and why (measured on the jgcompose test files):
//   - attack TIMES: sharp attacks at the sample (refined), soft ones at the spectral-flux peak moved to the centre of its
//     analysis frame (+21.3 ms, the median offset measured between the two on sharp attacks) — the refinement of a soft
//     attack wanders by up to ±20 ms, the flux peak does not;
//   - WEIGHTS: the flux strength of each attack (0.2..1), not its rise in dB (a rise out of silence weighed 10 times a
//     loud attack inside the music and pulled the pulse onto the silences);
//   - TEMPLATE: the sextuplet positions (1/6, 5/6) join the beat, half, quarters and thirds — without them a 120 BPM
//     sextuplet line was read at 53.6 BPM;
//   - COVERAGE counts only the beats that fall inside the played phrases (a phrase ends at a silence longer than 1.2 s or
//     3 median inter-onset intervals): silences no longer vote for slow pulses;
//   - no accent correlation term (it flipped the percussion loop from 80 to 72.3 BPM), no confidence threshold: the
//     metrical FAMILY of the best reading is returned with its named ratios, as jgcompose does, and the caller decides;
//   - the period is then REFINED by least squares on the attacks assigned to the grid (precision better than 0.05 BPM
//     when the playing is steady), and the micro-groove is read against that straight grid.
// ============================================================================================
const BPM_MIN = 40, BPM_MAX = 220, STEPS = 600, TOL_FRAC = 0.10, TOL_MIN = 0.025, MIN_ONSETS = 6;
const RESON_SEC = 0.60, RESON_SIG = 1.10, MERGE = 0.012, SOFT_BIAS = 1024 / 48000;
const TEMPLATE = [[0, 1.00], [0.5, 0.55], [0.25, 0.35], [0.75, 0.35], [1 / 3, 0.30], [2 / 3, 0.30], [1 / 6, 0.22], [5 / 6, 0.22]];
const RATIOS = [[0.5, '/2 (half as fast)'], [2, '×2 (twice as fast)'], [0.25, '/4'], [4, '×4'], [1 / 3, '/3 (the beat becomes a bar of 3)'],
  [3, '×3'], [2 / 3, '×2/3 (dotted half)'], [1.5, '×3/2 (dotted quarter)'], [0.75, '×3/4'], [4 / 3, '×4/3 (dotted eighth)']];

const median = xs => { const s = xs.slice().sort((a, b) => a - b), m = s.length; return m ? (m % 2 ? s[m >> 1] : 0.5 * (s[m / 2 - 1] + s[m / 2])) : 0; };
const iqr = xs => { if (xs.length < 2) return 0; const s = xs.slice().sort((a, b) => a - b), n = s.length; return s[Math.min(n - 1, (3 * n) >> 2)] - s[n >> 2]; };

function phaseWeight (frac, ptol) {
  let best = 0;
  for (const [pos, w] of TEMPLATE) {
    let d = Math.abs(frac - pos); d = Math.min(d, 1 - d);
    if (d <= ptol) { const prox = 1 - (d / ptol) ** 2, v = w * (0.25 + 0.75 * prox); if (v > best) best = v; }
  }
  return best;
}

/** precise attack times and weights from detectOnsets() results ({ s, t, raw, strength, sharp }) */
export function attackTimes (onsets, sr) {
  const sharpOff = onsets.filter(o => o.sharp && Number.isFinite(o.raw)).map(o => o.t - o.raw);
  const bias = sharpOff.length >= 3 ? median(sharpOff) : SOFT_BIAS;
  const out = onsets.map(o => ({ t: o.sharp || !Number.isFinite(o.raw) ? o.t : o.raw + bias, w: Math.max(0.2, Math.min(1, o.strength ?? 1)), sharp: !!o.sharp }));
  out.sort((a, b) => a.t - b.t);
  const merged = [];
  for (const o of out) { const l = merged[merged.length - 1]; if (l && o.t - l.t <= MERGE) { if (o.w > l.w) { l.t = o.t; l.sharp = o.sharp; } l.w = Math.min(1, l.w + o.w); } else merged.push({ ...o }); }
  return { attacks: merged, softBias: bias };
}

function phrasesOf (ts) {
  const iois = []; for (let i = 1; i < ts.length; ++i) iois.push(ts[i] - ts[i - 1]);
  const gap = Math.max(1.2, 3 * median(iois)), ph = [];
  let a = ts[0];
  for (let i = 1; i < ts.length; ++i) if (ts[i] - ts[i - 1] > gap) { ph.push([a, ts[i - 1]]); a = ts[i]; }
  ph.push([a, ts[ts.length - 1]]);
  return ph;
}

function combScore (ts, ws, P, phrases) {
  const n = ts.length, tol = Math.max(TOL_MIN, TOL_FRAC * P), ptol = Math.min(0.12, tol / P);
  const nb = 32, hist = new Float64Array(nb);
  for (let i = 0; i < n; ++i) hist[Math.floor((((ts[i] - ts[0]) % P) / P) * nb) % nb] += ws[i];
  let b = 0, bv = -1;
  for (let i = 0; i < nb; ++i) { const v = hist[i] + 0.5 * (hist[(i - 1 + nb) % nb] + hist[(i + 1) % nb]); if (v > bv) { bv = v; b = i; } }
  let phase = ts[0] + (b + 0.5) * P / nb;
  for (let it = 0; it < 2; ++it) {
    let s = 0, c = 0;
    for (let i = 0; i < n; ++i) { let d = (ts[i] - phase) / P; d = (d - Math.floor(d + 0.5)) * P; if (Math.abs(d) <= tol) { s += d * ws[i]; c += ws[i]; } }
    if (!c) break; phase += s / c;
  }
  let fit = 0, tw = 0; const occ = new Set();
  for (let i = 0; i < n; ++i) {
    const k = (ts[i] - phase) / P, kr = Math.floor(k), pw = phaseWeight(k - kr, ptol);
    fit += pw * ws[i]; tw += ws[i]; if (pw > 0) occ.add(kr);
  }
  fit /= tw || 1;
  // beats inside the played phrases only
  let total = 0, hit = 0;
  for (const [a, e] of phrases) {
    const k0 = Math.ceil((a - 0.5 * P - phase) / P), k1 = Math.floor((e + 0.5 * P - phase) / P);
    for (let k = k0; k <= k1; ++k) { total += 1; if (occ.has(k)) hit += 1; }
  }
  const coverage = total ? Math.min(1, hit / total) : 0;
  return { score: fit * coverage, fit, coverage, phase };
}
// metrical simplicity of the attacks' positions in the beat (template, tolerance 12 % of the tatum) × coverage of the
// beats inside the played phrases
function beatScore (ts, ws, P, phase, phrases) {
  let fit = 0, tw = 0; const occ = new Set(), ptol = 0.12 * Math.min(1, 0.5);
  for (let i = 0; i < ts.length; ++i) {
    const k = (ts[i] - phase) / P, kr = Math.floor(k + 0.07), frac = k - kr, pw = phaseWeight(Math.max(0, frac), 0.07);
    fit += pw * ws[i]; tw += ws[i]; if (frac < 0.07) occ.add(kr);          // a beat counts when it is ARTICULATED
  }
  fit /= tw || 1;
  let total = 0, hit = 0;
  for (const [a, e] of phrases) {
    const k0 = Math.ceil((a - 0.25 * P - phase) / P), k1 = Math.floor((e + 0.25 * P - phase) / P);
    for (let k = k0; k <= k1; ++k) { total += 1; if (occ.has(k)) hit += 1; }
  }
  return { score: fit * (total ? hit / total : 0), fit, coverage: total ? hit / total : 0, w: tw, hit, total };
}
const resonance = P => Math.exp(-0.5 * (Math.log(P / RESON_SEC) / RESON_SIG) ** 2);

// straight grid resolution that explains the attacks best (subdivisions of the beat), Occam: the coarsest within 0.05
function gridRes (ts, P, phase) {
  const fits = {};
  for (const R of [1, 2, 3, 4, 6, 8, 12]) {
    const step = P / R, tol = step * 0.20; let c = 0;
    for (const t of ts) { const x = (t - phase) / step; if (Math.abs(x - Math.round(x)) * step <= tol) c += 1; }
    fits[R] = c / ts.length;
  }
  const mx = Math.max(...Object.values(fits));
  const R = Math.min(...Object.keys(fits).map(Number).filter(r => fits[r] >= mx - 0.05));
  return { R, fits };
}

// least-squares period and phase on the attacks assigned to the grid of step P/R
function refine (ts, ws, P, phase, R) {
  let per = P, ph = phase;
  for (let it = 0; it < 3; ++it) {
    const step = per / R, tol = step * 0.25; let sw = 0, sx = 0, sy = 0, sxx = 0, sxy = 0, n = 0;
    for (let i = 0; i < ts.length; ++i) {
      const x = Math.round((ts[i] - ph) / step); if (Math.abs(ts[i] - ph - x * step) > tol) continue;
      const w = ws[i]; sw += w; sx += w * x; sy += w * ts[i]; sxx += w * x * x; sxy += w * x * ts[i]; n += 1;
    }
    if (n < 4) break;
    const den = sw * sxx - sx * sx; if (Math.abs(den) < 1e-12) break;
    const slope = (sw * sxy - sx * sy) / den, icp = (sy - slope * sx) / sw;
    if (!(slope > 0) || Math.abs(slope * R / per - 1) > 0.03) break;
    per = slope * R; ph = icp;
  }
  // phase brought next to the first attack
  ph = ph + Math.ceil((ts[0] - ph) / per - 0.5) * per;
  return { period: per, phase: ph };
}

// TATUM from the inter-onset intervals INSIDE each phrase (phrases may be offset from one another — rubato between phrases,
// a pick-up — so no global phase is imposed): the grid step q whose integer multiples explain the intervals, each interval
// counted once per multiple (1/k), timing precision σ = 12 ms. Finer grids explain everything but pay 1/k: the coarsest
// grid that fits wins.
function tatumOf (ts, ws, phrases, sparse = false) {
  const pairs = [];
  for (const [a, e] of phrases) {
    const idx = []; for (let i = 0; i < ts.length; ++i) if (ts[i] >= a - 1e-9 && ts[i] <= e + 1e-9) idx.push(i);
    for (let x = 0; x < idx.length; ++x) for (let y = x + 1; y < idx.length; ++y) {
      const d = ts[idx[y]] - ts[idx[x]]; if (d > (sparse ? SPARSE_DMAX : 2.5)) break;
      if (d > 0.04) pairs.push([d, ws[idx[x]] * ws[idx[y]]]);
    }
  }
  if (pairs.length < (sparse ? 3 : 4)) return null;
  // share of the intervals that fall on a multiple of q, corrected for chance (a fine grid catches random intervals too:
  // chance ≈ σ√(2π)/q); every divisor of the true tatum explains as much, so the COARSEST grid within 85 % of the best wins
  const sig = 0.012, tw = pairs.reduce((a, p) => a + p[1], 0);
  const score = q => { let s = 0; for (const [d, w] of pairs) { const k = Math.max(1, Math.round(d / q)), e = (d - k * q) / sig; s += w * Math.exp(-0.5 * e * e); } const base = Math.min(0.99, sig * Math.sqrt(2 * Math.PI) / q); return (s / tw - base) / (1 - base); };
  const lo = 0.06, hi = 1.5, N = 1400, qs = [], vs = [];
  for (let i = 0; i <= N; ++i) { const q = lo * Math.pow(hi / lo, i / N); qs.push(q); vs.push(score(q)); }
  const vmax = Math.max(...vs); let bi = -1;
  for (let i = 1; i < N; ++i) if (vs[i] >= vs[i - 1] && vs[i] >= vs[i + 1] && vs[i] >= 0.85 * vmax) bi = i;
  if (bi < 0) return null;
  let bq = qs[bi], bs = vs[bi], st = bq * 0.003;
  for (let it = 0; it < 14; ++it) { for (const c of [bq - st, bq + st]) { const v = score(c); if (v > bs) { bs = v; bq = c; } } st *= 0.6; }
  return { q: bq, score: bs };
}
// phase of each phrase on the tatum grid, then the tatum refined by ROBUST least squares (one slope, one intercept per
// phrase, Tukey biweight on the residuals, scale = 4.685 × 1.4826 × MAD, never under 6 ms): a pick-up or a flam 40 ms off
// the grid no longer bends the tatum (percussion loop: 0.24868 s with plain least squares, 0.25000 s robust)
function phraseGrid (ts, ws, phrases, q0) {
  let q = q0;
  const members = phrases.map(([a, e]) => { const idx = []; for (let i = 0; i < ts.length; ++i) if (ts[i] >= a - 1e-9 && ts[i] <= e + 1e-9) idx.push(i); return idx; });
  const circ = (idx, qq) => { let c = 0, sn = 0; for (const i of idx) { const g = 2 * Math.PI * ts[i] / qq; c += ws[i] * Math.cos(g); sn += ws[i] * Math.sin(g); } return Math.atan2(sn, c) / (2 * Math.PI) * qq; };
  let phases = members.map(idx => circ(idx, q));
  // integer grid index of each attack, fixed from the circular phase (outliers cannot shift the numbering)
  const nOf = () => members.map((idx, p) => idx.map(i => Math.round((ts[i] - phases[p]) / q)));
  let ns = nOf(), rw = ts.map(() => 1);
  for (let it = 0; it < 12; ++it) {
    // weighted LS: common slope q, one intercept per phrase
    let num = 0, den = 0; const mean = [];
    members.forEach((idx, p) => {
      let sw = 0, sn = 0, st = 0; idx.forEach((i, k) => { const w = ws[i] * rw[i]; sw += w; sn += w * ns[p][k]; st += w * ts[i]; });
      const nb = sw ? sn / sw : 0, tb = sw ? st / sw : 0; mean.push([nb, tb, sw]);
      idx.forEach((i, k) => { const w = ws[i] * rw[i]; num += w * (ns[p][k] - nb) * (ts[i] - tb); den += w * (ns[p][k] - nb) ** 2; });
    });
    if (!(den > 0)) break;
    const qn = num / den; if (!(qn > 0) || Math.abs(qn / q0 - 1) > 0.04) break;
    q = qn; phases = mean.map(([nb, tb]) => tb - nb * q);
    // residuals → Tukey weights
    const res = []; members.forEach((idx, p) => idx.forEach((i, k) => res.push([i, ts[i] - phases[p] - ns[p][k] * q])));
    const mad = median(res.map(r => Math.abs(r[1]))), c = Math.max(0.006, 4.685 * 1.4826 * mad);
    for (const [i, r] of res) { const u = r / c; rw[i] = Math.abs(u) < 1 ? (1 - u * u) ** 2 : 0; }
    if (it === 3) ns = nOf();                     // renumber once the tatum has settled
  }
  return { q, phases, weights: rw };
}

// ONE grid for the whole subject (a metronomic performance keeps its grid across its silences): comb search of the tatum
// within ±4 % of the phrase estimate, phase by circular mean, score = weighted share of attacks within σ = 10 ms of the
// grid, CORRECTED FOR CHANCE (a grid of step q catches σ√(2π)/q of random attacks). The global reading is kept when it
// explains the attacks at least 0.8 × as well as one phase per phrase (phrases under 3 attacks count as chance) (fewer
// free parameters, and the long lever arm pins the tatum: synth melody 0.2534 s per phrase → 0.2500 s global)
const SIG_G = 0.010;
function gridScore (ts, ws, idxs, q, phase) {
  let s = 0, w = 0; for (const i of idxs) { const r = ts[i] - phase - Math.round((ts[i] - phase) / q) * q; s += ws[i] * Math.exp(-0.5 * (r / SIG_G) ** 2); w += ws[i]; }
  const c = Math.min(0.99, SIG_G * Math.sqrt(2 * Math.PI) / q);
  return w ? (s / w - c) / (1 - c) : 0;
}
const circPhase = (ts, ws, idxs, q) => { let c = 0, sn = 0; for (const i of idxs) { const g = 2 * Math.PI * ts[i] / q; c += ws[i] * Math.cos(g); sn += ws[i] * Math.sin(g); } return Math.atan2(sn, c) / (2 * Math.PI) * q; };
function globalGrid (ts, ws, q0) {
  const all = ts.map((_, i) => i); let bq = q0, bp = 0, bs = -1;
  for (let k = -400; k <= 400; ++k) { const q = q0 * (1 + 0.04 * k / 400), ph = circPhase(ts, ws, all, q), sc = gridScore(ts, ws, all, q, ph); if (sc > bs) { bs = sc; bq = q; bp = ph; } }
  return { q: bq, phase: bp, score: bs };
}

/**
 * Pulse and micro-groove.
 * @param attacks [{t (s), w (0..1), sharp}] from attackTimes()
 * @returns null (too few attacks) or { bpm, period, phase, confidence, fit, coverage, candidates, family, ambiguous,
 *           grid: { R, step, tatum: q, phrases: phrases.length, global: globalFit, fitLocal, fitGlobal, regularity }, groove: { biasMs, rigidity, swing, templateMs[R], residualMs[], n }, attacks }
 */
// (V6.6) A SPARSE PULSE. Mat: « pourquoi un sample avec trois attaques très claires, qui doivent donner une mesure facilement
// mesurable, ne donne aucun tempo et aucun groove ? » (t_d_kik_05: attacks at 0.700, 1.093 and 3.110 s). The reading
// needed 6 attacks: with fewer, the measure of the fit says nothing — measured on 600 arrangements of three attacks over
// the same 2.41 s (the inner one spread by a Weyl sequence), 80 % reached the confidence of 0.45 that makes a pulse, and
// 25 % fitted a grid at least as well as the kick. From 3 to 5 attacks the same reading is now made (intervals up to 4.5 s,
// 3 pairs at least), and its confidence is how much better than chance the attacks sit: the share of 240 arrangements of
// as many attacks over the same span (first and last kept, the inner ones spread by Weyl sequences, the same weights) that
// fit WORSE. The caller keeps a sparse pulse from 0.70 (parent.js: the kick, 149 BPM on beats 1, 2 and 7, passes with
// 0.75; an arrangement of three arbitrary attacks gets a pulse 3 times in 10, instead of 8)
const SPARSE_MIN = 3, SPARSE_DMAX = 4.5, SPARSE_NULL = 240, WEYL = [0.6180339887498949, 0.7548776662466927, 0.5698402909980532];
export function analyseTempo (attacks, opts = {}) {
  const ts = attacks.map(a => a.t), ws = attacks.map(a => a.w), n = ts.length;
  if (n >= MIN_ONSETS) return analyseCore(ts, ws, opts, false);
  if (n < SPARSE_MIN) return null;
  const r = analyseCore(ts, ws, opts, true); if (!r) return r;
  const span = ts[n - 1] - ts[0]; let worse = 0, tot = 0;
  for (let j = 1; j <= SPARSE_NULL; ++j) {
    const mid = []; for (let i = 0; i < n - 2; ++i) mid.push(ts[0] + 0.03 + (span - 0.06) * ((j * WEYL[i]) % 1));
    mid.sort((a, b) => a - b);
    const o = analyseCore([ts[0], ...mid, ts[n - 1]], ws, opts, true); tot += 1;
    if (!o || o.confidence < r.confidence) worse += 1;
  }
  const raw = r.confidence;
  r.confidence = tot ? worse / tot : 0;
  r.sparse = { n, chance: tot ? 1 - worse / tot : 1, raw };
  return r;
}
function analyseCore (ts, ws, opts, sparse) {
  const span = ts[ts.length - 1] - ts[0]; if (span <= 0) return null;
  const phrases = phrasesOf(ts);
  const tat = tatumOf(ts, ws, phrases, sparse); if (!tat) return null;
  let { q, phases, weights: rw } = phraseGrid(ts, ws, phrases, tat.q);
  let globalFit = false, fitLocal = 0, fitGlobal = 0;
  if (phrases.length > 1) {
    const all = ts.map((_, i) => i);
    // judged on ALL the attacks: a phrase of one or two attacks proves nothing about its own phase (it counts as chance)
    phrases.forEach(([a, e], p) => { const idx = all.filter(i => ts[i] >= a - 1e-9 && ts[i] <= e + 1e-9); if (idx.length < 3) return; fitLocal += gridScore(ts, ws, idx, q, phases[p]) * idx.reduce((x, i) => x + ws[i], 0); });
    fitLocal /= ws.reduce((x, y) => x + y, 0);
    const G = globalGrid(ts, ws, q); fitGlobal = G.score;
    if (G.score >= 0.8 * fitLocal && G.score > 0.3) {
      const R1 = phraseGrid(ts, ws, [[ts[0], ts[ts.length - 1]]], G.q);
      q = R1.q; phases = phrases.map(() => R1.phases[0]); rw = R1.weights; globalFit = true;
    }
  }
  // grid RESOLUTION (jgcompose _best_grid_res): the tatum from the intervals can be one level too coarse when the finest
  // values are rare (a few sixteenths in a line of eighths); share of attacks within 20 % of a step of the grid q/d,
  // d ∈ {1, 2, 3, 4}, Occam: the coarsest within 0.05 of the best
  {
    const share = d => { const st = q / d; let c = 0, w = 0; phrases.forEach(([a, e], p) => { for (let i = 0; i < ts.length; ++i) if (ts[i] >= a - 1e-9 && ts[i] <= e + 1e-9) { const x = (ts[i] - phases[p]) / st; if (Math.abs(x - Math.round(x)) <= 0.2) c += ws[i]; w += ws[i]; } }); return w ? c / w : 0; };
    const f = [1, 2, 3, 4].map(share), mx = Math.max(...f), d = [1, 2, 3, 4].find((_, k) => f[k] >= mx - 0.05);
    if (d > 1) {
      const R2 = globalFit ? phraseGrid(ts, ws, [[ts[0], ts[ts.length - 1]]], q / d) : phraseGrid(ts, ws, phrases, q / d);
      q = R2.q; phases = globalFit ? phrases.map(() => R2.phases[0]) : R2.phases; rw = R2.weights;
    }
  }
  // REGULARITY: chance-corrected share of the attacks that sit on the final grid (σ 10 ms; a phrase of fewer than 3 attacks
  // counts as chance unless the grid is global) — noise and loose playing make attacks that any fine grid half-explains
  let regularity = 0;
  {
    const all = ts.map((_, i) => i); let acc = 0;
    phrases.forEach(([a, e], p) => { const idx = all.filter(i => ts[i] >= a - 1e-9 && ts[i] <= e + 1e-9); if (idx.length < 3 && !globalFit) return; acc += gridScore(ts, ws, idx, q, phases[p]) * idx.reduce((x, i) => x + ws[i], 0); });
    regularity = Math.max(0, acc / ws.reduce((x, y) => x + y, 0));
  }
  // beat = m tatums (40..220 BPM); in each phrase the downbeat is the tatum offset that makes the playing simplest;
  // score = metrical simplicity × coverage of the beats inside the phrases × broad resonance (jgcompose)
  const cands = [];
  for (const m of [1, 2, 3, 4, 6, 8, 12, 16, 24]) {
    const P = m * q, bpm = 60 / P;
    if (bpm < (opts.bpmMin || BPM_MIN) - 0.5 || bpm > (opts.bpmMax || BPM_MAX) + 0.5) continue;
    let fitS = 0, wS = 0, hit = 0, tot = 0; const downs = [];
    phrases.forEach((ph, p) => {
      let best = null;
      for (let r = 0; r < m; ++r) { const sc = beatScore(ts, ws, P, phases[p] + r * q, [ph]); if (!best || sc.score > best.sc.score) best = { sc, r }; }
      fitS += best.sc.fit * best.sc.w; wS += best.sc.w; hit += best.sc.hit; tot += best.sc.total; downs.push(phases[p] + best.r * q);
    });
    const fit = wS ? fitS / wS : 0, cov = tot ? hit / tot : 0;
    cands.push({ bpm, m, period: P, downs, score: fit * Math.sqrt(cov) * resonance(P), fit, coverage: cov });
  }
  if (!cands.length) return null;
  cands.sort((a, b) => b.score - a.score);
  const b = cands[0];
  const family = [];
  for (const o of cands.slice(1)) {
    if (o.score < b.score * 0.75) continue;
    const r = o.bpm / b.bpm, hit = RATIOS.find(([v]) => Math.abs(r - v) / v < 0.04);
    family.push({ bpm: o.bpm, ratio: hit ? hit[1] : '×' + (b.m / o.m).toFixed(2), rel: o.score / b.score });
  }
  const ambiguous = family.length > 0 && family[0].rel > 0.95;
  // groove (jgcompose extract_groove, in ms): signed residuals of the attacks to the straight tatum grid of their phrase
  // (> 0 = behind the grid, laid-back; < 0 = ahead, pushed), slots = the m tatums of the beat, assigned by ROUNDING
  // (jgcompose took the floor, which files a pushed downbeat under the previous slot). The attacks the robust fit rejected
  // (pick-ups, flams: Tukey weight < 0.1) are counted apart and kept out of the template.
  const R = b.m, period = b.period, step = q, res = [], bySlot = Array.from({ length: R }, () => []);
  let outliers = 0;
  phrases.forEach(([a, e], p) => {
    for (let i = 0; i < ts.length; ++i) {
      if (ts[i] < a - 1e-9 || ts[i] > e + 1e-9) continue;
      if (rw[i] < 0.1) { outliers += 1; continue; }
      const x = (ts[i] - b.downs[p]) / step, n = Math.round(x), r = (x - n) * step;
      res.push(r * 1000); bySlot[((n % R) + R) % R].push(r * 1000);
    }
  });
  const biasMs = median(res), rigidity = Math.min(1, iqr(res) / (step * 500));
  const slotN = bySlot.map(v => v.length);
  const templateMs = bySlot.map(v => v.length >= 2 ? Math.round(median(v) * 10) / 10 : 0);
  // swing long:short of each pair of tatums of a binary beat, read on the template (1 = straight, 2 = triplet swing);
  // a ternary beat has no binary swing (null)
  let swing = null;
  if (R % 2 === 0) {
    const rs = [];
    for (let k = 0; 2 * k + 1 < R; ++k) {
      const i0 = 2 * k, i1 = i0 + 1, i2 = (i0 + 2) % R;
      if (slotN[i0] < 2 || slotN[i1] < 2 || slotN[i2] < 2) continue;
      const lo = step * 1000 + templateMs[i1] - templateMs[i0], sh = step * 1000 + templateMs[i2] - templateMs[i1];
      if (lo > 0 && sh > 0) rs.push(lo / sh);
    }
    swing = rs.length ? Math.round(rs.reduce((x, y) => x + y, 0) / rs.length * 1000) / 1000 : 1;
  }
  // reference downbeat: that of the heaviest phrase, brought back before the first attack
  let hp = 0, hw = -1;
  phrases.forEach(([a, e], p) => { let w = 0; for (let i = 0; i < ts.length; ++i) if (ts[i] >= a - 1e-9 && ts[i] <= e + 1e-9) w += ws[i]; if (w > hw) { hw = w; hp = p; } });
  const phase = b.downs[hp] - Math.ceil((b.downs[hp] - ts[0]) / period) * period;
  const conf = Math.min(1, Math.sqrt(b.fit) * Math.sqrt(b.coverage)) * (1 - 0.5 * rigidity) * (ambiguous ? 0.8 : 1);
  return {
    bpm: 60 / period, period, phase, confidence: conf, fit: b.fit, coverage: b.coverage, family, ambiguous,
    candidates: cands.slice(0, 6).map(o => ({ bpm: o.bpm, score: o.score, fit: o.fit, coverage: o.coverage, m: o.m })),
    grid: { R, step, tatum: q, phrases: phrases.length, global: globalFit, fitLocal, fitGlobal, regularity },
    groove: { biasMs, rigidity, swing, templateMs, slotN, residualMs: res, outliers, n: ts.length },
    attacks: ts
  };
}

// (V6.9) A TYPED TEMPO. Mat: « nous avons besoin de la reconnaissance de l'analyse tel quel, plus une possibilité de modifier
// le chiffre issu de l'analyse : si l'analyse m'affiche 123.54 je dois pouvoir rentrer à la main 130 ou 121.53 ». The typed
// tempo becomes the subject's pulse: its beat is exactly 60 / bpm; the SUBDIVISION is the analysis's (its tatum kept as near
// as the beat allows: the number of tatums per beat among 1, 2, 3, 4, 6, 8, 12, 16, 24 whose tatum is closest, in ratio, to
// the analysed one — 123.54 ×4 typed 130 stays ×4, typed 61.77 becomes ×8 on the same sixteenths); without an analysis, the
// coarsest of 1, 2, 3, 4, 6, 8 that explains the attacks within 0.05 of the best (share of attacks within 20 % of a step).
// The grid is laid on the attacks (one grid for the whole subject, phase by the weighted circular mean of the attacks on the
// tatum; the downbeat the tatum offset that makes the playing simplest, as the analysis does), and the micro-groove is read
// against it exactly as the analysis reads it (signed residuals per tatum of the beat, robust weights, swing). With no attack,
// or one, the grid starts on the first attack (or at 0).
const FORCE_R = [1, 2, 3, 4, 6, 8, 12, 16, 24];
export function forceTempo (attacks, bpm, ref) {
  const ts = attacks.map(a => a.t), ws = attacks.map(a => a.w), n = ts.length, period = 60 / bpm;
  let R;
  if (ref && ref.grid && ref.grid.tatum > 0) {
    R = FORCE_R[0]; for (const r of FORCE_R) if (Math.abs(Math.log(period / r / ref.grid.tatum)) < Math.abs(Math.log(period / R / ref.grid.tatum)) - 1e-12) R = r;
  } else if (n >= 2) {
    const fits = [1, 2, 3, 4, 6, 8].map(r => { const q = period / r, ph = circPhase(ts, ws, ts.map((_, i) => i), q); let c = 0, w = 0; for (let i = 0; i < n; ++i) { const x = (ts[i] - ph) / q; if (Math.abs(x - Math.round(x)) <= 0.2) c += ws[i]; w += ws[i]; } return w ? c / w : 0; });
    const mx = Math.max(...fits); R = [1, 2, 3, 4, 6, 8][fits.findIndex(v => v >= mx - 0.05)];
  } else R = ref && ref.grid ? ref.grid.R : 4;
  const q = period / R, all = ts.map((_, i) => i);
  // the grid's phase: the weighted circular mean of the attacks on the tatum, then refined by ROBUST least squares with the
  // tatum fixed (Tukey biweight on the residuals, scale 4.685 × 1.4826 × MAD, never under 6 ms — the analysis's phraseGrid
  // with its slope held at the typed tempo): a flam or a pick-up does not pull the grid
  let ph0 = n >= 2 ? circPhase(ts, ws, all, q) : n ? ts[0] : 0;
  if (n >= 2) for (let it = 0; it < 12; ++it) {
    const r = ts.map(t => { const x = (t - ph0) / q; return (x - Math.round(x)) * q; }), mad = median(r.map(Math.abs)), c = Math.max(0.006, 4.685 * 1.4826 * mad);
    let sw = 0, sr = 0; for (let i = 0; i < n; ++i) { const u = r[i] / c, w = Math.abs(u) < 1 ? ws[i] * (1 - u * u) ** 2 : 0; sw += w; sr += w * r[i]; }
    if (!(sw > 0)) break; const d = sr / sw; ph0 += d; if (Math.abs(d) < 1e-7) break;
  }
  // the downbeat: the tatum offset that makes the playing simplest (the analysis's beat score over the played phrases)
  let down = ph0;
  if (n >= 2) {
    const phrases = phrasesOf(ts); let best = -1;
    for (let r = 0; r < R; ++r) { const sc = beatScore(ts, ws, period, ph0 + r * q, phrases).score; if (sc > best + 1e-12) { best = sc; down = ph0 + r * q; } }
  }
  // the micro-groove against the straight grid (robust weights as phraseGrid: Tukey biweight, scale 4.685 × 1.4826 × MAD, ≥ 6 ms)
  const res0 = ts.map(t => { const x = (t - down) / q; return (x - Math.round(x)) * q; });
  const mad = median(res0.map(Math.abs)), cT = Math.max(0.006, 4.685 * 1.4826 * mad);
  const res = [], bySlot = Array.from({ length: R }, () => []); let outliers = 0;
  for (let i = 0; i < n; ++i) {
    const u = res0[i] / cT, rw = Math.abs(u) < 1 ? (1 - u * u) ** 2 : 0;
    if (rw < 0.1) { outliers += 1; continue; }
    const k = Math.round((ts[i] - down) / q); res.push(res0[i] * 1000); bySlot[((k % R) + R) % R].push(res0[i] * 1000);
  }
  const biasMs = median(res), rigidity = Math.min(1, iqr(res) / (q * 500));
  const slotN = bySlot.map(v => v.length), templateMs = bySlot.map(v => v.length >= 2 ? Math.round(median(v) * 10) / 10 : 0);
  let swing = null;
  if (R % 2 === 0) {
    const rs = [];
    for (let k = 0; 2 * k + 1 < R; ++k) {
      const i0 = 2 * k, i1 = i0 + 1, i2 = (i0 + 2) % R;
      if (slotN[i0] < 2 || slotN[i1] < 2 || slotN[i2] < 2) continue;
      const lo = q * 1000 + templateMs[i1] - templateMs[i0], sh = q * 1000 + templateMs[i2] - templateMs[i1];
      if (lo > 0 && sh > 0) rs.push(lo / sh);
    }
    swing = rs.length ? Math.round(rs.reduce((x, y) => x + y, 0) / rs.length * 1000) / 1000 : 1;
  }
  const phase = n ? down - Math.ceil((down - ts[0]) / period) * period : down;
  const regularity = n >= 2 ? Math.max(0, gridScore(ts, ws, all, q, down)) : 0;
  return {
    bpm, period, phase, confidence: 1, forced: true, fit: regularity, coverage: 1, family: [], ambiguous: false, candidates: [],
    grid: { R, step: q, tatum: q, phrases: 1, global: true, fitLocal: 0, fitGlobal: regularity, regularity },
    groove: { biasMs, rigidity, swing, templateMs, slotN, residualMs: res, outliers, n },
    attacks: ts
  };
}
