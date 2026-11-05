// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// ============================================================================================
//  CHARIVARI — le SOUFFLE (partie non sinusoïdale du son), sans grain et sans « son de FFT »
//  Le résidu (son − partiels) est séparé en
//   • TRANSITOIRES : 2 ms avant → 25 ms après chaque attaque raide (fondu jusqu'à 45 ms) ; recopiés
//     tels quels, jamais étirés ;
//   • SOUFFLE STATIONNAIRE : banc de 53 filtres passe-bande au 1/6 d'octave (40 Hz – 18 kHz), le
//     SVF Simper/TPT de Balance Stain (zéro délai, inconditionnellement stable). Chaque bande donne
//     son ENVELOPPE (RMS 5 ms, phase nulle) ; et le résidu BLANCHI (chaque bande divisée par son
//     enveloppe, puis sommées) est l'EXCITATION : le grain fin du son lui-même, spectre aplati.
//  Resynthèse : excitation lue EN CONTINU (vitesse naturelle ; en palindrome autour de la position
//  quand la carte étire ou fige) → même banc → × enveloppes relues par la carte du temps et
//  transformées (corps, sourdine, taille…). Pas de trames, pas de fenêtres : un bruit continu.
// ============================================================================================
export const H = 128;
export const BANDS = (() => { const f = []; for (let fb = 40; fb < 18000; fb *= Math.pow(2, 1 / 6)) f.push(fb); return f; })();
const QB = 1 / (Math.pow(2, 1 / 12) - Math.pow(2, -1 / 12));          // largeur 1/6 d'octave ≈ 8,65

// SVF Simper/TPT (Balance Stain) : sortie passe-bande v1
// (sortie v1 × k = passe-bande de gain 1 au centre : sans ce k, la bande sort Q fois trop fort, +18,7 dB)
function svfCoefs (fc, sr, Q) { const g = Math.tan(Math.PI * Math.min(fc, 0.499 * sr) / sr), k = 1 / Q, a1 = 1 / (1 + g * (g + k)); return { a1, a2: g * a1, a3: g * g * a1, k }; }
function svfRun (x, c, out, gainArr) {
  let ic1 = 0, ic2 = 0; const { a1, a2, a3, k } = c;
  for (let i = 0; i < x.length; ++i) {
    const v3 = x[i] - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2;
    if (gainArr) out[i] += k * v1 * gainArr[i]; else out[i] = k * v1;
  }
}
// enveloppe RMS lissée à phase nulle (aller-retour, constante de temps tau), échantillonnée au pas H
function envOf (y, sr, tau, nf) {
  const a = Math.exp(-1 / (tau * sr)), n = y.length, e = new Float64Array(n);
  let s = 0; for (let i = 0; i < n; ++i) { s = a * s + (1 - a) * y[i] * y[i]; e[i] = s; }
  s = e[n - 1]; for (let i = n - 1; i >= 0; --i) { s = a * s + (1 - a) * e[i]; e[i] = s; }
  const out = new Float32Array(nf); for (let j = 0; j < nf; ++j) out[j] = Math.sqrt(e[Math.min(n - 1, j * H)]);
  return out;
}

/**
 * @param resid [L, R] ; sharp : échantillons des attaques raides
 */
export function analyseSouffle (resid, sharp, sr) {
  const n = resid[0].length, nf = Math.ceil(n / H) + 1, nb = BANDS.length;
  // fenêtre des transitoires
  const wT = new Float64Array(n), pre = Math.round(0.002 * sr), hold = Math.round(0.025 * sr), rel = Math.round(0.02 * sr);
  for (const b of sharp) for (let i = Math.max(0, b - pre); i < Math.min(n, b + hold + rel); ++i) {
    const k = i - b; const w = k < 0 ? 0.5 - 0.5 * Math.cos(Math.PI * (k + pre) / pre) : k < hold ? 1 : 0.5 + 0.5 * Math.cos(Math.PI * (k - hold) / rel);
    wT[i] = Math.max(wT[i], w);
  }
  const trans = resid.map(x => { const t = new Float64Array(n); for (let i = 0; i < n; ++i) t[i] = x[i] * wT[i]; return t; });
  const stat = resid.map((x, c) => { const s = new Float64Array(n); for (let i = 0; i < n; ++i) s[i] = x[i] - trans[c][i]; return s; });
  const coefs = BANDS.map(fb => svfCoefs(fb, sr, QB));
  const env = [[], []], exc = [new Float64Array(n), new Float64Array(n)];
  const y = new Float64Array(n);
  for (let c = 0; c < 2; ++c) {
    let emax = 0; const envs = [];
    for (let b = 0; b < nb; ++b) { svfRun(stat[c], coefs[b], y); const e = envOf(y, sr, 0.005, nf); envs.push(e); for (const v of e) emax = Math.max(emax, v); }
    const floor = emax * 1e-4;
    for (let b = 0; b < nb; ++b) {
      svfRun(stat[c], coefs[b], y);
      const e = envs[b];
      for (let i = 0; i < n; ++i) { const j = i / H, j0 = Math.floor(j), u = j - j0; const ev = e[j0] * (1 - u) + e[Math.min(nf - 1, j0 + 1)] * u; exc[c][i] += y[i] / (ev + floor); }
      env[c].push(e);
    }
  }
  // étalonnage par bande : l'excitation, refiltrée par la bande et × son enveloppe, doit rendre l'énergie du souffle
  const calib = [new Float64Array(nb), new Float64Array(nb)];
  for (let c = 0; c < 2; ++c) for (let b = 0; b < nb; ++b) {
    svfRun(exc[c], coefs[b], y);
    const e = env[c][b]; let num = 0, den = 0;
    for (let i = 0; i < n; i += 4) { const ev = e[Math.floor(i / H)]; num += ev * ev; den += (y[i] * ev) ** 2; }
    calib[c][b] = den > 0 ? Math.sqrt(num / den) : 0;
  }
  const Z = { bands: BANDS, env, exc: exc.map(x => Float32Array.from(x)), trans, calib, nf, coefs, global: [1, 1] };
  // étalonnage global : les bandes voisines se recouvrent (somme cohérente) — la relecture à
  // l'identique doit rendre exactement l'énergie du souffle stationnaire
  const [a, b] = renderSouffle({ souffle: Z, sr }, { map: { seg: t => (t < n ? 0 : -1), segs: [{ a: 0, b: n, sa: 0, sb: n }], at: t => (t < n ? t : null), end: n }, resid: { gain: 1 } }, n);
  const pw = x => x.reduce((q, v) => q + v * v, 0);
  Z.global = [Math.sqrt(pw(stat[0]) / (pw(a) || 1)), Math.sqrt(pw(stat[1]) / (pw(b) || 1))];
  return Z;
}

const lin = (arr, x) => { const i = Math.floor(x); if (i < 0) return arr[0]; if (i >= arr.length - 1) return arr[arr.length - 1]; const u = x - i; return arr[i] + (arr[i + 1] - arr[i]) * u; };

/**
 * Souffle d'une strate. S : { map, resid: { gain, map?, ratio?, gate(τ)? }, noiseDb(b, fb, τ)?, noiseShift(τ)?, noiseGate(τ)? }
 *   noiseShift : facteur de taille k (le corps du souffle est relu en f·k) ; ratio : transposition du souffle.
 */
export function renderSouffle (model, S, D) {
  const Z = model.souffle, sr = model.sr, nb = Z.bands.length, rs = S.resid;
  const map = rs.map || S.map, nfo = Math.ceil(D / H) + 1;
  const out = [new Float64Array(D), new Float64Array(D)];
  // lecture de l'excitation : toujours EN AVANT à vitesse naturelle ; quand la lecture s'écarte de
  // plus de W de la position de la carte (étirement, stase, rétrograde), une seconde tête repart
  // derrière la position et les deux se croisent en 25 ms à puissance constante — pas de palindrome
  // (ses retournements faisaient 8 petits chocs par seconde), pas de trames courtes.
  const exReaders = (X) => {
    const e = new Float64Array(D), W = Math.round(0.25 * sr), XF = Math.round(0.025 * sr);
    let pos = null, pos2 = null, xf = 0;
    const rd = p => { const i = Math.floor(p), f = p - i; return i >= 0 && i + 1 < X.length ? X[i] * (1 - f) + X[i + 1] * f : 0; };
    for (let t = 0; t < D; ++t) {
      const si = map.seg(t); if (si < 0) { pos = null; pos2 = null; continue; }
      const sg = map.segs[si], src = sg.sa + (sg.sb - sg.sa) * (t - sg.a) / (sg.b - sg.a), slope = (sg.sb - sg.sa) / (sg.b - sg.a);
      if (pos === null || (Math.abs(slope - 1) < 1e-9 && pos2 === null && Math.abs(pos - src) < 1)) { pos = src; }
      else if (pos2 === null && Math.abs(pos - src) > W) { pos2 = src - W / 2; xf = 0; }
      let v;
      if (pos2 !== null) { const u = xf / XF; v = rd(pos) * Math.cos(Math.PI / 2 * u) + rd(pos2) * Math.sin(Math.PI / 2 * u); pos2 += 1; if (++xf >= XF) { pos = pos2; pos2 = null; } }
      else v = rd(pos);
      e[t] = v; pos += 1;
    }
    return e;
  };
  // gains de bande au pas H
  const G = [[], []];
  for (let c = 0; c < 2; ++c) for (let b = 0; b < nb; ++b) G[c].push(new Float32Array(nfo));
  for (let m = 0; m < nfo; ++m) {
    const tau = m * H, src = map.at(Math.min(tau, map.end - 1e-6));
    if (src === null || tau >= map.end) continue;
    const jq = src / H, k = S.noiseShift ? S.noiseShift(tau) : 1, ratio = rs.ratio ?? 1;
    const g0 = (rs.gain ?? 1) * (rs.gate ? rs.gate(tau) : 1) * (S.noiseGate ? S.noiseGate(tau) : 1) * (S.gain ?? 1);
    const np = S.noisePan ? S.noisePan(tau) : [1, 1];
    if (g0 <= 0) continue;
    for (let b = 0; b < nb; ++b) {
      const fb = Z.bands[b];
      // position de lecture de l'enveloppe : corps agrandi (k) et souffle transposé (ratio)
      const pos = b + 6 * Math.log2(k / ratio);
      const extra = S.noiseDb ? Math.pow(10, S.noiseDb(b, fb, tau, jq) / 20) : 1;
      for (let c = 0; c < 2; ++c) {
        const bi = Math.floor(pos), uu = pos - bi;
        let ev = 0;
        if (bi >= 0 && bi < nb) ev += (1 - uu) * lin(Z.env[c][bi], jq);
        if (bi + 1 >= 0 && bi + 1 < nb) ev += uu * lin(Z.env[c][bi + 1], jq);
        G[c][b][m] = ev * Z.calib[c][Math.max(0, Math.min(nb - 1, Math.round(pos)))] * Z.global[c] * extra * g0 * np[c];
      }
    }
  }
  // excitation relue puis banc de synthèse
  const gi = new Float64Array(D);
  for (let c = 0; c < 2; ++c) {
    const e = exReaders(Z.exc[c]);
    for (let b = 0; b < nb; ++b) {
      const g = G[c][b]; let any = false; for (let m = 0; m < nfo; ++m) if (g[m] > 0) { any = true; break; }
      if (!any) continue;
      for (let t = 0; t < D; ++t) { const j = t / H, j0 = j | 0, f = j - j0; gi[t] = g[j0] * (1 - f) + g[Math.min(nfo - 1, j0 + 1)] * f; }
      svfRun(e, Z.coefs[b], out[c], gi);
    }
  }
  return out;
}
