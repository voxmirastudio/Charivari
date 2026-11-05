// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// ============================================================================================
//  CHARIVARI — synthèse des enfants
//  • Partiels : trames uniformes (pas H = 128) ; entre deux trames, fréquence linéaire → phase
//    quadratique produite par RÉCURRENCE complexe (deux multiplications par échantillon, aucune
//    trigonométrie, renormalisée à chaque trame) ; amplitude linéaire ; phase initiale = phase
//    mesurée du parent (le partiel repart d'où il était). Naissance nette (0,5 ms) sur une attaque.
//  • Résidu : trames du son lui-même (fenêtre sinus N = 1024, pas 512 : reconstruction parfaite
//    quand l'enfant lit le parent dans l'ordre, puissance constante quand il le lit autrement).
//    Lecture à rebours = trame retournée (un souffle joué à l'envers reste un souffle).
//    Étirement : décalage déterministe des trames lues (suite du nombre d'or, ±N/4) — jamais la
//    même trame répétée (sinon bourdonnement à sr/512) ; les attaques ne sont jamais décalées.
// ============================================================================================
export const H = 128;
// saut d'amplitude sur une attaque à l'intérieur d'une trame : 0 avant, 1 après, fondu 0,5 ms (24 éch.)
const stepAt = (p, q) => { if (!p.steps) return -1; for (const [fq, k] of p.steps) if (fq === q) return k; return -1; };
const stepU = (k, kb) => { const x = (k - kb) / 24 + 0.5; return x <= 0 ? 0 : x >= 1 ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * x); };

/**
 * @param parts [{ t0 (trame de départ), f: Float64Array Hz, aL, aR, ph0?, sharpIn?, sharpOut? }]
 */
export function synthPartials (parts, n, sr) {
  const L = new Float64Array(n), R = new Float64Array(n), w2s = 2 * Math.PI / sr, fadeA = Math.max(8, Math.round(0.0005 * sr));
  for (const p of parts) {
    const m = p.f.length; if (m < 2) continue;
    let amx = 0; for (let q = 0; q < m; ++q) amx = Math.max(amx, p.aL[q], p.aR[q]);
    if (amx < 1e-6) continue;                                        // −120 dB : inaudible
    const s0 = p.t0 * H;
    let th = p.tph ? p.tph[0] : (p.ph0 || 0);
    // entrée : rampe d'une trame, ou attaque nette (0,5 ms) à l'échantillon exact startSample —
    // si l'attaque tombe à moins de 0,5 ms de la première trame, son fondu se prolonge DANS la trame
    // (sinon saut d'amplitude : mesuré, clic sur un écho de percussion)
    const st = p.sharpIn ? Math.min(s0, p.startSample ?? (s0 - fadeA)) : s0 - H;
    const atkEnd = p.sharpIn ? st + fadeA : -1;
    const atk = s => s >= atkEnd ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, s - st) / fadeA);
    {
      const w = p.f[0] * w2s;
      // attaque : amplitude prolongée en log-linéaire depuis les deux premières trames (un partiel
      // frappé décroît déjà : il était plus fort à l'attaque qu'à la première trame), bornée ×¼…×2
      let rr0 = 1;
      if (p.sharpIn && m >= 2) { const a0 = p.aL[0] + p.aR[0], a1 = p.aL[1] + p.aR[1]; if (a0 > 0 && a1 > 0) rr0 = Math.min(2, Math.max(0.25, Math.exp(Math.log(a0 / a1) / H * (s0 - st)))); }
      for (let s = Math.max(0, st); s < Math.min(n, s0); ++s) {
        const k = s - st, ph = th - w * (s0 - s);
        const g = p.sharpIn ? (k < fadeA ? 0.5 - 0.5 * Math.cos(Math.PI * k / fadeA) : 1) * Math.pow(rr0, 1 - k / Math.max(1, s0 - st)) : k / H;
        L[s] += g * p.aL[0] * Math.cos(ph); R[s] += g * p.aR[0] * Math.cos(ph + (p.ipd ? p.ipd[0] : 0));
      }
    }
    for (let q = 0; q + 1 < m; ++q) {
      const a = s0 + q * H; if (a >= n) break; if (a < 0) { th += (p.f[q] + p.f[q + 1]) * w2s * H / 2; continue; }
      if (p.resets) for (const [fq, ph] of p.resets) if (fq === q) th = ph;
      if (p.tph) {
        // phase cubique imposée (McAulay-Quatieri) par récurrence d'ordre 3 : Δ³θ = 6β constant
        const w0 = p.f[q] * w2s, w1 = p.f[q + 1] * w2s, T = H;
        const t0 = p.tph[q], t1 = p.tph[q + 1];
        const e0 = t1 - t0 - w0 * T, dwv = w1 - w0;
        const al = 3 * e0 / (T * T) - dwv / T, be = -2 * e0 / (T * T * T) + dwv / (T * T);
        const d1 = w0 + al + be, d2 = 2 * al + 6 * be, d3 = 6 * be;      // Δθ(0), Δ²θ(0), Δ³θ
        let zr = Math.cos(t0), zi = Math.sin(t0), rr = Math.cos(d1), ri = Math.sin(d1), cr = Math.cos(d2), ci = Math.sin(d2);
        const xr = Math.cos(d3), xi = Math.sin(d3);
        const aL0 = p.aL[q], aL1 = p.aL[q + 1], aR0 = p.aR[q], aR1 = p.aR[q + 1];
        const p0 = p.ipd ? p.ipd[q] : 0, p1 = p.ipd ? p.ipd[q + 1] : 0, dpsi = (p1 - p0) / H;
        let yr = Math.cos(p0), yi = Math.sin(p0); const er = Math.cos(dpsi), ei = Math.sin(dpsi);
        const e = Math.min(n, a + H);
        const kb = stepAt(p, q);
        for (let s = a, k = 0; s < e; ++s, ++k) {
          const u = kb < 0 ? k / H : stepU(k, kb), ga = s < atkEnd ? atk(s) : 1, gl = (aL0 + (aL1 - aL0) * u) * ga, gr = (aR0 + (aR1 - aR0) * u) * ga;
          L[s] += gl * zr; R[s] += gr * (zr * yr - zi * yi);
          let t_ = zr * rr - zi * ri; zi = zr * ri + zi * rr; zr = t_;
          t_ = rr * cr - ri * ci; ri = rr * ci + ri * cr; rr = t_;
          t_ = cr * xr - ci * xi; ci = cr * xi + ci * xr; cr = t_;
          t_ = yr * er - yi * ei; yi = yr * ei + yi * er; yr = t_;
        }
        th = t1;
        continue;
      }
      const w0 = p.f[q] * w2s, w1 = p.f[q + 1] * w2s, dw = (w1 - w0) / H;
      const aL0 = p.aL[q], aL1 = p.aL[q + 1], aR0 = p.aR[q], aR1 = p.aR[q + 1];
      if (Math.max(aL0, aL1, aR0, aR1) < 1e-7) { th += (w0 + w1) * H / 2; continue; }
      // z = e^{iθ}, r = e^{iω}, c = e^{iΔω} : θ(t+1) = θ(t) + ω(t) + Δω/2 ; ω(t+1) = ω(t) + Δω
      let zr = Math.cos(th), zi = Math.sin(th);
      let rr = Math.cos(w0 + dw / 2), ri = Math.sin(w0 + dw / 2);
      const cr = Math.cos(dw), ci = Math.sin(dw);
      // voie droite : même phasor tourné de ψ(t) = ipd, linéaire dans la trame (délai entre micros)
      const p0 = p.ipd ? p.ipd[q] : 0, p1 = p.ipd ? p.ipd[q + 1] : 0, dpsi = (p1 - p0) / H;
      let yr = Math.cos(p0), yi = Math.sin(p0); const er = Math.cos(dpsi), ei = Math.sin(dpsi);
      const e = Math.min(n, a + H);
      const kb = stepAt(p, q);
      for (let s = a, k = 0; s < e; ++s, ++k) {
        const u = kb < 0 ? k / H : stepU(k, kb), ga = s < atkEnd ? atk(s) : 1, gl = (aL0 + (aL1 - aL0) * u) * ga, gr = (aR0 + (aR1 - aR0) * u) * ga;
        L[s] += gl * zr; R[s] += gr * (zr * yr - zi * yi);
        const nzr = zr * rr - zi * ri, nzi = zr * ri + zi * rr; zr = nzr; zi = nzi;
        const nrr = rr * cr - ri * ci, nri = rr * ci + ri * cr; rr = nrr; ri = nri;
        const nyr = yr * er - yi * ei, nyi = yr * ei + yi * er; yr = nyr; yi = nyi;
      }
      th += (w0 + w1) * H / 2;
      th -= 2 * Math.PI * Math.floor(th / (2 * Math.PI));
    }
    // sortie
    {
      const a = s0 + (m - 1) * H, w = p.f[m - 1] * w2s, len = p.sharpOut ? fadeA : H;
      for (let s = Math.max(0, a); s < Math.min(n, a + len); ++s) {
        const u = (s - a) / len, g = p.sharpOut ? 0.5 + 0.5 * Math.cos(Math.PI * u) : 1 - u, ph = th + w * (s - a);
        L[s] += g * p.aL[m - 1] * Math.cos(ph); R[s] += g * p.aR[m - 1] * Math.cos(ph + (p.ipd ? p.ipd[m - 1] : 0));
      }
    }
  }
  return [L, R];
}

// fenêtre sinus (analyse = synthèse) : Σ w² = 1 au recouvrement 50 %
const GN = 1024, GH = 512;
const SINW = (() => { const w = new Float64Array(GN); for (let i = 0; i < GN; ++i) w[i] = Math.sin(Math.PI * (i + 0.5) / GN); return w; })();
const PHI = 0.6180339887498949;

/**
 * Relecture du résidu. frames : [{ src (centre source, éch.), rev?, gain?, gL?, gR? }] une par trame
 * de sortie (centre m·512). protect : attaques (échantillons source) jamais décalées.
 */
export function grainMap (resid, frames, n, opts = {}) {
  const [RL, RR] = resid, L = new Float64Array(n), R = new Float64Array(n), N = RL.length;
  const protect = opts.protect || [];
  const near = s => { for (const b of protect) if (Math.abs(b - s) < GN) return true; return false; };
  // ATTAQUES VERROUILLÉES : autour de chaque attaque lue par la carte, les trames sont lues d'affilée
  // (pente ±1) centrées sur elle — l'attaque est recopiée intacte, jamais doublée ni étalée, quelle
  // que soit la pente de la carte ailleurs (aksak, étirement) ; l'écart se rattrape plus loin.
  frames = frames.slice();
  for (const b of protect) {
    for (let m = 1; m < frames.length; ++m) {
      const f0 = frames[m - 1], f1 = frames[m];
      if (!f0 || !f1 || !!f0.rev !== !!f1.rev) continue;
      const lo = Math.min(f0.src, f1.src), hi = Math.max(f0.src, f1.src);
      if (b < lo || b >= hi || hi - lo > 4 * GH) continue;
      const tb = (m - 1) * GH + (b - f0.src) / (f1.src - f0.src) * GH;     // instant de sortie de l'attaque
      const dir = f1.rev ? -1 : 1;
      for (let k = Math.max(0, m - 3); k <= Math.min(frames.length - 1, m + 2); ++k) if (frames[k] && !!frames[k].rev === !!f1.rev) frames[k] = { ...frames[k], src: b + dir * (k * GH - tb) };
    }
  }
  let prev = null;
  for (let m = 0; m < frames.length; ++m) {
    const fr = frames[m]; if (!fr) { prev = null; continue; }
    let src = Math.round(fr.src);
    const coherent = prev !== null && Math.abs(src - prev - (fr.rev ? -GH : GH)) < 2;
    if (!coherent && prev !== null && !near(src)) {
      // lecture non consécutive : décalage d'or déterministe (décorrèle les répétitions)
      src += Math.round(((m * PHI) % 1 - 0.5) * GN / 2);
    }
    prev = Math.round(fr.src);
    const c = m * GH, g = fr.gain ?? 1, gL = (fr.gL ?? 1) * g, gR = (fr.gR ?? 1) * g;
    if (gL === 0 && gR === 0) continue;
    for (let i = 0; i < GN; ++i) {
      const o = c - GN / 2 + i; if (o < 0 || o >= n) continue;
      const k = fr.rev ? src + GN / 2 - 1 - i : src - GN / 2 + i;
      if (k < 0 || k >= N) continue;
      const w = SINW[i] * SINW[i];                     // analyse × synthèse
      L[o] += RL[k] * w * gL; R[o] += RR[k] * w * gR;
    }
  }
  return [L, R];
}
export const GRAIN_HOP = GH, GRAIN_N = GN;
