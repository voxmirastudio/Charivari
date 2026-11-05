// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// Lecture / écriture WAV (PCM 16/24/32, float 32/64, WAVE_FORMAT_EXTENSIBLE) -> Float64Array par canal
import fs from 'node:fs';

export function readWav (path) {
  const b = fs.readFileSync(path);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') throw new Error('pas un WAV : ' + path);
  let p = 12, fmt = null, data = null;
  while (p + 8 <= b.length) {
    const id = b.toString('ascii', p, p + 4), sz = b.readUInt32LE(p + 4);
    if (id === 'fmt ') fmt = { tag: b.readUInt16LE(p + 8), ch: b.readUInt16LE(p + 10), sr: b.readUInt32LE(p + 12), bits: b.readUInt16LE(p + 22), ext: sz >= 40 ? b.readUInt16LE(p + 32) : 0 };
    if (id === 'data') data = { off: p + 8, len: Math.min(sz, b.length - p - 8) };
    p += 8 + sz + (sz & 1);
  }
  if (!fmt || !data) throw new Error('WAV incomplet');
  let tag = fmt.tag; if (tag === 0xfffe) tag = fmt.ext;
  const bps = fmt.bits / 8, n = Math.floor(data.len / (bps * fmt.ch));
  const chans = Array.from({ length: fmt.ch }, () => new Float64Array(n));
  for (let i = 0; i < n; ++i) {
    for (let c = 0; c < fmt.ch; ++c) {
      const o = data.off + (i * fmt.ch + c) * bps;
      let v;
      if (tag === 3) v = bps === 4 ? b.readFloatLE(o) : b.readDoubleLE(o);
      else if (bps === 2) v = b.readInt16LE(o) / 32768;
      else if (bps === 3) { let x = b[o] | (b[o + 1] << 8) | (b[o + 2] << 16); if (x & 0x800000) x -= 0x1000000; v = x / 8388608; }
      else if (bps === 4) v = b.readInt32LE(o) / 2147483648;
      else if (bps === 1) v = (b[o] - 128) / 128;
      chans[c][i] = v;
    }
  }
  if (chans.length === 1) chans.push(Float64Array.from(chans[0]));
  return { sr: fmt.sr, ch: chans.slice(0, 2), n };
}

// écriture 32 bits flottants (aucune perte pour l'écoute et les mesures)
export function writeWav (path, chans, sr) {
  const n = chans[0].length, nc = chans.length, bytes = n * nc * 4;
  const b = Buffer.alloc(44 + bytes);
  b.write('RIFF', 0); b.writeUInt32LE(36 + bytes, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(3, 20); b.writeUInt16LE(nc, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * nc * 4, 28); b.writeUInt16LE(nc * 4, 32); b.writeUInt16LE(32, 34);
  b.write('data', 36); b.writeUInt32LE(bytes, 40);
  let o = 44;
  for (let i = 0; i < n; ++i) for (let c = 0; c < nc; ++c) { b.writeFloatLE(chans[c][i], o); o += 4; }
  fs.writeFileSync(path, b);
}

// (V6.5) rééchantillonnage : resample.js (Kaiser, 140 dB, plat jusqu'à 95,5 % de Nyquist)
export { resampleTo } from './resample.js';
