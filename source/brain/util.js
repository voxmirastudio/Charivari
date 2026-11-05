// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// ============================================================================================
//  CHARIVARI — petits outils partagés (moteur vivant)
// ============================================================================================
/** passe-bas Butterworth 2 aller-retour (phase nulle), prolongement antisymétrique aux bords */
export function smooth (x, fc, rate) {
  const n = x.length; if (n < 3) return Float64Array.from(x);
  const K = Math.tan(Math.PI * Math.min(fc, rate * 0.45) / rate), q = Math.SQRT1_2, nn = 1 / (1 + K / q + K * K);
  const b0 = K * K * nn, b1 = 2 * b0, b2 = b0, a1 = 2 * (K * K - 1) * nn, a2 = (1 - K / q + K * K) * nn;
  const run = v => { let z1 = v[0] - b0 * v[0], z2 = b2 * v[0] - a2 * v[0];
    for (let i = 0; i < v.length; ++i) { const u = v[i], y = b0 * u + z1; z1 = b1 * u - a1 * y + z2; z2 = b2 * u - a2 * y; v[i] = y; } };
  const P = Math.min(n - 1, Math.round(3 * rate / fc));
  const e = new Float64Array(n + 2 * P);
  for (let i = 0; i < P; ++i) e[i] = 2 * x[0] - x[P - i];
  e.set(x, P);
  for (let i = 0; i < P; ++i) e[P + n + i] = 2 * x[n - 1] - x[n - 2 - i];
  run(e); e.reverse(); run(e); e.reverse();
  return e.slice(P, P + n);
}
/** ressort amorti de 0 à 1 (dépassement puis repos) : t en s, T = période propre, z = amortissement */
export function spring (t, T, z = 0.35) {
  if (t <= 0) return 0;
  const w = 2 * Math.PI / T, wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + z / Math.sqrt(1 - z * z) * Math.sin(wd * t));
}
