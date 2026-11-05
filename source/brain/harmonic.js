// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// ============================================================================================
//  CHARIVARI — trajectoires harmoniques (sons à hauteur)
//  Sur un segment où la fondamentale est sûre, chaque harmonique h suit f_h(t) = h·f0(t)·2^(c_h/1200)
//  — le vibrato de la fondamentale, mesuré précisément dans le grave, porte tous les harmoniques
//  (un partiel aigu sous vibrato profond, que la fenêtre ne voit plus, est retrouvé).
//  c_h (écart d'inharmonicité, cents) est MESURÉ sur les pics proches de h·f0 ; sans mesure, il est
//  prolongé par la raideur B ajustée (f_h = h·f0·√(1+B·h²), la loi des cordes raides).
//  Le raffinement hétérodyne verrouille ensuite chaque harmonique sur le son ; une porte d'émergence
//  (6 dB au-dessus du bruit mesuré à mi-chemin des harmoniques voisins) ne garde que ce qui existe.
// ============================================================================================

export function harmonicTracks (an, ft, segs, sr, opts = {}) {
  const fmax = Math.min(opts.fmax ?? 18000, 0.45 * sr), out = [];
  for (const [a, b] of segs) {
    // f0 lissée (médiane sur 3 trames)
    const F = [];
    for (let j = a; j <= b; ++j) {
      const v = [ft.f0[Math.max(a, j - 1)], ft.f0[j], ft.f0[Math.min(b, j + 1)]].filter(x => x > 0).sort((x, y) => x - y);
      F.push(v.length ? v[v.length >> 1] : NaN);
    }
    let fhi = 0, flo = 1e9; for (const v of F) if (v > 0) { fhi = Math.max(fhi, v); flo = Math.min(flo, v); }
    if (!(fhi > 0)) continue;
    const H = Math.floor(fmax / fhi);
    // écarts mesurés par rang
    const dev = Array.from({ length: H + 1 }, () => []), amp = new Float64Array(H + 1);
    for (let j = a; j <= b; ++j) {
      const fr = an.frames[j], f0 = F[j - a]; if (!fr || !(f0 > 0)) continue;
      for (const p of fr.peaks) {
        const h = Math.round(p.f / f0); if (h < 1 || h > H) continue;
        const c = 1200 * Math.log2(p.f / (h * f0));
        if (Math.abs(c) <= 60 && p.emerg >= 9) { dev[h].push(c); amp[h] += p.aL * p.aL + p.aR * p.aR; }
      }
    }
    const med = v => { const s = v.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
    // raideur B par moindres carrés sur les rangs mesurés (c_h ≈ 600·log2(1+B·h²) ≈ (600/ln2)·B·h²)
    let sxx = 0, sxy = 0;
    for (let h = 1; h <= H; ++h) if (dev[h].length >= 5) { const x = h * h, y = med(dev[h]) * Math.LN2 / 600; sxx += x * x; sxy += x * y; }
    const B = sxx > 0 ? Math.max(0, sxy / sxx) : 0;
    for (let h = 1; h <= H; ++h) {
      const c = dev[h].length >= 5 ? med(dev[h]) : 600 * Math.log2(1 + B * h * h);
      const J = [], Fh = [];
      for (let j = a; j <= b; ++j) { if (!an.frames[j] || !(F[j - a] > 0)) continue; J.push(j); Fh.push(h * F[j - a] * Math.pow(2, c / 1200)); }
      if (J.length < 6) continue;
      const m = J.length, ea = Math.sqrt(amp[h] / Math.max(1, dev[h].length) / 2) || 1e-6;
      out.push({ j: Int32Array.from(J), f: Float64Array.from(Fh), aL: new Float64Array(m).fill(ea), aR: new Float64Array(m).fill(ea),
        pL: new Float64Array(m), pR: new Float64Array(m), free: new Uint8Array(m).fill(1), harm: h, seg: [a, b], cents: c,
        gate: [(h + 0.5) / h, (h - 0.5) / h], spacing: flo * 0.97 });
    }
  }
  return out;
}
