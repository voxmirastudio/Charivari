// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// ============================================================================================
//  CHARIVARI — pouls du sample : portage fidèle de jgcompose_rhythm.infer_tempo
//  Peigne de périodes (balayage logarithmique 40–220 BPM), chaque période notée par
//    fit      = simplicité MÉTRIQUE moyenne des positions des attaques (gabarit : sur le temps 1,
//               à la moitié 0,55, au quart 0,35, au tiers 0,30 ; noyau progressif, jamais une falaise)
//    coverage = fraction des temps réellement occupés
//    accent   = corrélation (Pearson) entre la force d'une attaque et la valeur de sa position
//  score = fit × coverage × accent × résonance (log-normale LARGE autour de 100 BPM, ne départage
//  que de vrais ex æquo). Raffinement local, confiance absolue = √fit·√coverage.
// ============================================================================================
const BPM_MIN = 40, BPM_MAX = 220, STEPS = 480, TOL_FRAC = 0.10, TOL_MIN = 0.025;
const RESON_SEC = 0.60, RESON_SIG = 1.10, MIN_ONSETS = 6, ACCENT_W = 0.35;
const PHASE_TEMPLATE = [[0, 1.00], [0.5, 0.55], [0.25, 0.35], [0.75, 0.35], [1 / 3, 0.30], [2 / 3, 0.30]];

const tempoTol = P => Math.max(TOL_MIN, TOL_FRAC * P);
function pearson (xs, ys) {
  const n = xs.length; if (n < 3 || n !== ys.length) return null;
  let mx = 0, my = 0; for (let i = 0; i < n; ++i) { mx += xs[i]; my += ys[i]; } mx /= n; my /= n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; ++i) { const a = xs[i] - mx, b = ys[i] - my; sxy += a * b; sxx += a * a; syy += b * b; }
  if (sxx <= 1e-12 || syy <= 1e-12) return null;
  return sxy / Math.sqrt(sxx * syy);
}
function phaseWeight (frac, ptol) {
  let best = 0;
  for (const [pos, w] of PHASE_TEMPLATE) {
    let d = Math.abs(frac - pos); d = Math.min(d, 1 - d);
    if (d <= ptol) { const prox = 1 - (d / ptol) ** 2, v = w * (0.25 + 0.75 * prox); if (v > best) best = v; }
  }
  return best;
}
export function combScore (ons, P, wts) {
  const n = ons.length;
  if (n < 2 || P <= 0) return [0, 0, 0, 0];
  const span = ons[n - 1] - ons[0];
  if (span <= 0 || P > span) return [0, 0, 0, 0];
  const tol = tempoTol(P); let ptol = tol / P; if (ptol >= 0.12) ptol = 0.12;
  wts = wts || ons.map(() => 1);
  const nb = 32, hist = new Float64Array(nb);
  for (let i = 0; i < n; ++i) hist[Math.floor((((ons[i] - ons[0]) % P) / P) * nb) % nb] += wts[i];
  let b = 0, bv = -1;
  for (let i = 0; i < nb; ++i) { const v = hist[i] + 0.5 * (hist[(i - 1 + nb) % nb] + hist[(i + 1) % nb]); if (v > bv) { bv = v; b = i; } }
  let phase = ons[0] + (b + 0.5) * P / nb;
  for (let it = 0; it < 2; ++it) {
    const res = [];
    for (const t of ons) { let d = (t - phase) / P; d = (d - Math.floor(d + 0.5)) * P; if (Math.abs(d) <= tol) res.push(d); }
    if (!res.length) break;
    phase += res.reduce((a, c) => a + c, 0) / res.length;
  }
  let totW = 0; for (const w of wts) totW += w; totW = totW || 1;
  let fit = 0; const slots = new Set(), pws = [];
  const npts = Math.floor(span / P) + 1;
  for (let i = 0; i < n; ++i) {
    const k = (ons[i] - phase) / P, kr = Math.floor(k), frac = k - kr;
    const pw = phaseWeight(frac, ptol); pws.push(pw); fit += pw * wts[i];
    if (pw > 0) slots.add(kr);
  }
  fit /= totW;
  const coverage = Math.min(1, slots.size / Math.max(1, npts));
  if (fit <= 0 || coverage <= 0) return [0, 0, 0, phase];
  let acc = 1;
  if (n >= 4) { const r = pearson(pws, wts); if (r !== null) acc = Math.max(0.70, Math.min(1.40, 1 + ACCENT_W * r)); }
  return [fit * coverage * acc, fit, coverage, phase];
}
const resonance = P => Math.exp(-0.5 * (Math.log(P / RESON_SEC) / RESON_SIG) ** 2);

/** @returns candidats triés [{bpm, period, phase, score, fit, coverage, confidence, octave}] ou [] */
export function inferTempo (onsetsSec, weights = null, bpmMin = BPM_MIN, bpmMax = BPM_MAX, k = 5) {
  const pairs = onsetsSec.map((t, i) => [t, weights ? weights[i] : 1]).sort((a, b) => a[0] - b[0]);
  const ons = [], wts = [];
  for (const [t, w] of pairs) { if (ons.length && t - ons[ons.length - 1] <= 0.012) { wts[wts.length - 1] += w; continue; } ons.push(t); wts.push(w); }
  if (ons.length < MIN_ONSETS) return [];
  const span = ons[ons.length - 1] - ons[0]; if (span <= 0) return [];
  const lo = 60 / Math.max(1, bpmMax); let hi = 60 / Math.max(1, bpmMin); hi = Math.min(hi, span / 2);
  if (hi <= lo) return [];
  const raw = [];
  for (let i = 0; i <= STEPS; ++i) { const P = lo * Math.pow(hi / lo, i / STEPS); const [s, f, c] = combScore(ons, P, wts); raw.push([P, s, f, c]); }
  const best = [];
  for (let i = 1; i < raw.length - 1; ++i) if (raw[i][1] > 0 && raw[i][1] >= raw[i - 1][1] && raw[i][1] >= raw[i + 1][1]) best.push(raw[i]);
  if (!best.length) return [];
  best.sort((a, b) => b[1] - a[1]);
  const out = [];
  for (const [P, s, f, c] of best.slice(0, 24)) {
    let P2 = P, s2 = s, f2 = f, c2 = c, step = P * 0.02;
    for (let it = 0; it < 14; ++it) {
      for (const cand of [P2 - step, P2 + step]) { const [sc, fi, co] = combScore(ons, cand, wts); if (sc > s2) { P2 = cand; s2 = sc; f2 = fi; c2 = co; } }
      step *= 0.6;
    }
    const bpm = 60 / P2;
    if (!(bpmMin - 0.5 <= bpm && bpm <= bpmMax + 0.5)) continue;
    if (out.some(o => Math.abs(bpm - o.bpm) / o.bpm < 0.02)) continue;
    out.push({ bpm, period: P2, phase: combScore(ons, P2, wts)[3], score: s2 * resonance(P2), rawScore: s2, fit: f2, coverage: c2 });
    if (out.length >= Math.max(k, 5) * 3) break;
  }
  if (!out.length) return [];
  out.sort((a, b) => b.score - a.score);
  const b = out[0];
  b.confidence = Math.min(1, Math.sqrt(b.fit) * Math.sqrt(b.coverage)); b.octave = false;
  const top = b.score || 1;
  for (const o of out.slice(1)) {
    o.confidence = Math.min(1, o.score / top) * b.confidence;
    const r = o.bpm / b.bpm;
    o.octave = [0.25, 1 / 3, 0.5, 2, 3, 4, 2 / 3, 3 / 4, 4 / 3, 1.5].some(x => Math.abs(r - x) / x < 0.04);
  }
  return out.slice(0, k);
}
