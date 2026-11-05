// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — GNU GPL, version 3 or later (LICENSE)
// assemble index.js : source de l'interface + peau V6 (art/skin.js, art/frieze.png) + cerveau (IIFE) en chaîne, fins de ligne CRLF
// le cerveau (brain.iife.js) se refait depuis brain/ avec esbuild 0.28.2 (octet pour octet, empreinte b6029fe9) :
//   npx esbuild@0.28.2 ../brain/worker.js --bundle --format=iife --global-name=CharivariBrain --minify --outfile=brain.iife.js
import fs from 'node:fs';
const rd = f => fs.readFileSync(new URL(f, import.meta.url));
const src = rd('./index.src.js').toString('utf8');
const brain = rd('./brain.iife.js').toString('utf8');
const skin = rd('./art/skin.js').toString('utf8');
const mask = 'data:image/png;base64,' + rd('./art/frieze.png').toString('base64');
let out = src;
for (const [mark, val] of [['/*SKIN*/', skin], ['/*FRIEZE_MASK*/', 'const FRIEZE_MASK = ' + JSON.stringify(mask) + ';'], ['/*BRAIN_CODE*/', 'const BRAIN_CODE = ' + JSON.stringify(brain) + ';']]) {
  if (!out.includes(mark)) throw new Error('marqueur absent : ' + mark);
  out = out.replace(mark, () => val);
}
const crlf = out.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
fs.writeFileSync(new URL('./index.js', import.meta.url), crlf);
console.log('index.js', crlf.length, 'octets,', crlf.split('\r\n').length, 'lignes');
