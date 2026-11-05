// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// Audio 24 bits empaqueté : deux images stéréo (a b, c d) dans trois mots de 32 bits — la dynamique d'une session 24 bits
// (≈ 144 dB) au lieu des 96 dB du 16 bits, pour 1,5 mot par image au lieu de 2 en flottant.
//   w0 = a<<8 | b>>16 & 0xff      w1 = (b & 0xffff)<<16 | c>>8 & 0xffff      w2 = (c & 0xff)<<24 | d & 0xffffff
export const FULL24 = 8388607;
export const words24 = n => 3 * Math.ceil(n / 2);
export function pack24 (L, R, n, scale, out = new Int32Array(words24(n)), off = 0) {
  const q = v => { const x = Math.round(v * scale); return x > FULL24 ? FULL24 : x < -FULL24 - 1 ? -FULL24 - 1 : x; };
  for (let i = 0, w = off; i < n; i += 2, w += 3) {
    const a = q(L[i]), b = q(R[i]), c = i + 1 < n ? q(L[i + 1]) : 0, d = i + 1 < n ? q(R[i + 1]) : 0;
    out[w] = (a << 8) | ((b >> 16) & 0xff);
    out[w + 1] = ((b & 0xffff) << 16) | ((c >> 8) & 0xffff);
    out[w + 2] = ((c & 0xff) << 24) | (d & 0xffffff);
  }
  return out;
}
/** image i (0..n−1) → [gauche, droite] entiers 24 bits signés */
export function frame24 (W, off, i) {
  const t = off + 3 * (i >> 1);
  if ((i & 1) === 0) { const w0 = W[t], w1 = W[t + 1]; return [w0 >> 8, (((w0 & 0xff) << 24) | (((w1 >> 16) & 0xffff) << 8)) >> 8]; }
  const w1 = W[t + 1], w2 = W[t + 2]; return [(((w1 & 0xffff) << 16) | (((w2 >> 24) & 0xff) << 8)) >> 8, (w2 << 8) >> 8];
}
export function unpack24 (W, n, off = 0, scale = 1 / FULL24) {
  const L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; ++i) { const [a, b] = frame24(W, off, i); L[i] = a * scale; R[i] = b * scale; }
  return { L, R };
}
