// ---------------------------------------------------------------- V6 SKIN — drawn here, from fixed seeds and golden-ratio
// sequences: the same worn panel every time. Light comes from the upper left: highlights up-left, shadows down-right.
const svgURL = s => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;
const fseq = (k, a) => (k * a) % 1;
// thin scratches: n slightly bent strokes, positions and angles on low-discrepancy sequences
function scratchPath (W, H, n, seed, lenMin, lenMax, spread, base = 0) {
  let d = '';
  for (let k = 1; k <= n; ++k) {
    const u = fseq(k + seed, 0.6180339887), v = fseq(k + seed, 0.7548776662), w = fseq(k + seed, 0.5698402910), z = fseq(k + seed, 0.4142135624);
    const x = u * W, y = v * H, L = lenMin + (lenMax - lenMin) * w * w, a = (base + (z - 0.5) * spread) * Math.PI / 180, b = (w - 0.5) * L * 0.14;
    const x2 = x + Math.cos(a) * L, y2 = y + Math.sin(a) * L, mx = (x + x2) / 2 - Math.sin(a) * b, my = (y + y2) / 2 + Math.cos(a) * b;
    d += `M${x.toFixed(1)} ${y.toFixed(1)}Q${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }
  return d;
}
const SKIN = {
  // stoved enamel: a fine grain of dark and light specks, below a pixel at 1x, low contrast
  grain: svgURL(`<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'><filter id='g' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='1.75' numOctaves='2' seed='11' stitchTiles='stitch' result='t'/><feColorMatrix in='t' type='matrix' values='0 0 0 0 .15 0 0 0 0 .14 0 0 0 0 .12 -1.15 0 0 0 .55' result='d'/><feColorMatrix in='t' type='matrix' values='0 0 0 0 .99 0 0 0 0 .98 0 0 0 0 .95 1.05 0 0 0 -.53' result='l'/><feMerge><feMergeNode in='d'/><feMergeNode in='l'/></feMerge></filter><rect width='128' height='128' filter='url(#g)'/></svg>`),
  // orange peel of the stoved paint: a soft relief lit from the upper left
  peel: svgURL(`<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='p' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='0.16' numOctaves='3' seed='9' stitchTiles='stitch' result='n'/><feDiffuseLighting in='n' surfaceScale='0.7' diffuseConstant='1' lighting-color='#fff' result='l'><feDistantLight azimuth='225' elevation='52'/></feDiffuseLighting><feColorMatrix in='l' type='matrix' values='0 0 0 0 .07 0 0 0 0 .06 0 0 0 0 .05 -1.1 0 0 0 .86' result='s'/><feColorMatrix in='l' type='matrix' values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 .96 1.1 0 0 0 -.93' result='h'/><feMerge><feMergeNode in='s'/><feMergeNode in='h'/></feMerge></filter><rect width='256' height='256' filter='url(#p)'/></svg>`),
  // slow clouds in the paint (two coats, unevenly sprayed)
  cloud: svgURL(`<svg xmlns='http://www.w3.org/2000/svg' width='1100' height='740'><filter id='c' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='0.005 0.007' numOctaves='3' seed='21'/><feColorMatrix type='matrix' values='0 0 0 0 .24 0 0 0 0 .21 0 0 0 0 .18 0 0 0 .75 -.3'/></filter><rect width='1100' height='740' filter='url(#c)'/></svg>`),
  // WEAR: paint chipped to the bare metal along the edges (a dark rim where the paint broke), rubbed spots, scratches
  wear: svgURL(`<svg xmlns='http://www.w3.org/2000/svg' width='1100' height='740'>
<filter id='c' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='0.11' numOctaves='3' seed='8'/><feColorMatrix type='matrix' values='0 0 0 0 .70 0 0 0 0 .685 0 0 0 0 .65 18 0 0 0 -12.1'/></filter>
<filter id='r' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='0.11' numOctaves='3' seed='8'/><feColorMatrix type='matrix' values='0 0 0 0 .17 0 0 0 0 .15 0 0 0 0 .12 13 0 0 0 -8.3'/><feOffset dx='.6' dy='.8'/></filter>
<filter id='u' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='0.012 0.02' numOctaves='4' seed='31'/><feColorMatrix type='matrix' values='0 0 0 0 .93 0 0 0 0 .91 0 0 0 0 .86 5 0 0 0 -2.95'/></filter>
<filter id='m'><feGaussianBlur stdDeviation='12'/></filter>
<mask id='e'><rect width='1100' height='740' fill='#000'/><rect x='-14' y='-14' width='1128' height='768' rx='26' fill='none' stroke='#fff' stroke-width='40' filter='url(#m)'/></mask>
<g mask='url(#e)'><rect width='1100' height='740' filter='url(#r)'/><rect width='1100' height='740' filter='url(#c)'/></g>
<rect width='1100' height='740' filter='url(#u)' opacity='.12'/>
<path d='${scratchPath(1100, 740, 70, 3, 6, 70, 70, -8)}' fill='none' stroke='rgba(246,242,232,.2)' stroke-width='.55'/>
<path d='${scratchPath(1100, 740, 36, 41, 5, 40, 140, 30)}' fill='none' stroke='rgba(24,20,16,.15)' stroke-width='.5'/></svg>`),
  // BRUSHED ALUMINIUM of the lower plate: long grain, a few oxidised blotches, pits, scratches across the grain
  brushed: svgURL(`<svg xmlns='http://www.w3.org/2000/svg' width='1060' height='140'>
<filter id='b' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='0.0016 1.05' numOctaves='3' seed='3' result='t'/><feColorMatrix in='t' type='matrix' values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 .98 1.7 0 0 0 -.8' result='l'/><feColorMatrix in='t' type='matrix' values='0 0 0 0 .12 0 0 0 0 .12 0 0 0 0 .11 -1.7 0 0 0 .74' result='d'/><feMerge><feMergeNode in='l'/><feMergeNode in='d'/></feMerge></filter>
<filter id='f' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='0.004 2.2' numOctaves='2' seed='13'/><feColorMatrix type='matrix' values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 1.2 0 0 0 -.55'/></filter>
<filter id='o' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='0.011 0.03' numOctaves='4' seed='17'/><feColorMatrix type='matrix' values='0 0 0 0 .38 0 0 0 0 .33 0 0 0 0 .25 5.5 0 0 0 -3.25'/></filter>
<filter id='p' x='0' y='0' width='100%' height='100%'><feTurbulence type='turbulence' baseFrequency='0.7' numOctaves='1' seed='5'/><feColorMatrix type='matrix' values='0 0 0 0 .1 0 0 0 0 .09 0 0 0 0 .08 -14 0 0 0 1.1'/></filter>
<rect width='1060' height='140' filter='url(#b)'/><rect width='1060' height='140' filter='url(#f)' opacity='.5'/><rect width='1060' height='140' filter='url(#o)' opacity='.55'/><rect width='1060' height='140' filter='url(#p)' opacity='.6'/>
<path d='${scratchPath(1060, 140, 46, 7, 8, 90, 50, 12)}' fill='none' stroke='rgba(255,255,255,.42)' stroke-width='.5'/>
<path d='${scratchPath(1060, 140, 30, 23, 4, 46, 160, -40)}' fill='none' stroke='rgba(30,28,24,.22)' stroke-width='.45'/></svg>`),
  // turned (lathe) face of an aluminium knob
  turned: 'repeating-radial-gradient(circle at 50% 50%,rgba(255,255,255,.10) 0 .6px,rgba(0,0,0,.07) .6px 1.2px,rgba(255,255,255,0) 1.2px 1.9px)',
  // the same brushing on the name plate (short tile)
  plate: svgURL(`<svg xmlns='http://www.w3.org/2000/svg' width='400' height='60'><filter id='b' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='0.004 1.1' numOctaves='3' seed='29' stitchTiles='stitch' result='t'/><feColorMatrix in='t' type='matrix' values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 .98 1.6 0 0 0 -.76' result='l'/><feColorMatrix in='t' type='matrix' values='0 0 0 0 .12 0 0 0 0 .12 0 0 0 0 .11 -1.6 0 0 0 .7' result='d'/><feMerge><feMergeNode in='l'/><feMergeNode in='d'/></feMerge></filter><rect width='400' height='60' filter='url(#b)'/></svg>`)
};
// --------------------------------------------------------------- KNOBS — each one after a knob of a 1970s field recorder
// lever (Mockery): a polished aluminium pointer lever with a faceted point on a black hub — the level knob of a reporter's
//   recorder; bakelite (Shadow): a black ribbed knob with a cream line on a bright ring — a meter selector; drum (Volume): a
//   large turned aluminium cylinder; bar (Base note): a black knob crossed by a raised bar — a filter selector; knurl (Choke):
//   a small knurled aluminium knob with a dial on its face — a phones level; selector (envelope): a small black pointer knob
//   on a ring — a channel selector. What turns is drawn in .knob; the light (gloss, sheen) stays put above it (.lit); the
//   lever and the bar are faceted: their faces are re-lit at each angle (lightKnob).
const KSTYLE = { param35: 'lever', param36: 'bakelite', param38: 'drum', param39: 'bar', param41: 'knurl', pA: 'selector', pD: 'selector', pS: 'selector', pR: 'selector', pP: 'selector', pL: 'selector', pG: 'selector', param44: 'knurl' };
const ridges = (n, r1, r2, w, col) => { let d = ''; for (let i = 0; i < n; ++i) { const a = 2 * Math.PI * i / n, c = Math.cos(a), s = Math.sin(a); d += `M${(r1 * c).toFixed(2)} ${(r1 * s).toFixed(2)}L${(r2 * c).toFixed(2)} ${(r2 * s).toFixed(2)}`; } return `<path d="${d}" stroke="${col}" stroke-width="${w}" fill="none"/>`; };
const LEVER = 'M0 -35 L9.6 -12 C11.6 -6 11.6 6 9.1 12 L7 20.5 C6.3 23.8 3.4 25.4 0 25.4 C-3.4 25.4 -6.3 23.8 -7 20.5 L-9.1 12 C-11.6 6 -11.6 -6 -9.6 -12 Z';
const CAP = {
  lever: () => `<svg class="cap" viewBox="-38 -38 76 76"><circle r="17.5" fill="#141312" stroke="#000" stroke-width=".7"/>${ridges(48, 15.6, 17.4, 0.7, '#2e2d2a')}
    <path data-f="bl" d="M0 -9 L-9.6 -12 C-11.6 -6 -11.6 6 -9.1 12 L-7 20.5 C-6.3 23.8 -3.4 25.4 0 25.4 Z"/><path data-f="br" d="M0 -9 L9.6 -12 C11.6 -6 11.6 6 9.1 12 L7 20.5 C6.3 23.8 3.4 25.4 0 25.4 Z"/>
    <path data-f="tl" d="M0 -35 L-9.6 -12 L0 -9 Z"/><path data-f="tr" d="M0 -35 L9.6 -12 L0 -9 Z"/>
    <path d="${LEVER}" fill="none" stroke="rgba(36,34,30,.85)" stroke-width=".7"/><path d="M0 -31.5 L0 -13" stroke="#232220" stroke-width="1" stroke-linecap="round"/>
    <circle cy="6" r="3.6" data-f="dm"/><circle cy="6" r="3.6" fill="none" stroke="rgba(30,28,25,.6)" stroke-width=".5"/></svg>`,
  bakelite: () => `<svg class="cap" viewBox="-20 -20 40 40"><circle r="16.5" fill="#131211"/>${ridges(40, 14.6, 16.5, 0.85, '#34322f')}<circle r="14.4" fill="#191817"/>
    <path d="M0 -14.2 L0 -4.5" stroke="#efe7d6" stroke-width="2.3" stroke-linecap="round"/></svg>`,
  drum: () => `<svg class="cap" viewBox="-20 -20 40 40"><path d="M0 -18.6 L0 -11" stroke="#1d1c1a" stroke-width="1.6" stroke-linecap="round"/><circle cy="-8.2" r="1.15" fill="#1d1c1a"/></svg>`,
  bar: () => `<svg class="cap" viewBox="-20 -20 40 40"><circle r="17.5" fill="#141312"/><circle r="17.5" fill="none" stroke="#2a2927" stroke-width=".8"/>
    <rect data-f="bar" x="-4.6" y="-17" width="9.2" height="34" rx="3.2"/><path data-f="bl" d="M-4.6 -13.8 L-4.6 13.8" stroke-width="1.1"/><path data-f="br" d="M4.6 -13.8 L4.6 13.8" stroke-width="1.1"/>
    <path d="M0 -15.5 L0 -6" stroke="#efe7d6" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  knurl: () => `<svg class="cap" viewBox="-20 -20 40 40">${ridges(56, 15.2, 18.4, 0.75, 'rgba(40,38,34,.55)')}${ridges(56, 15.2, 18.4, 0.4, 'rgba(255,255,255,.0)')}
    <g transform="rotate(3.2)">${ridges(56, 15.4, 18.2, 0.45, 'rgba(255,255,255,.55)')}</g>
    <g stroke="#2a2825" stroke-width=".55">${Array.from({ length: 11 }, (_, i) => { const a = (-135 + 27 * i) * Math.PI / 180, s = Math.sin(a), c = -Math.cos(a); return `<path d="M${(s * 9.5).toFixed(2)} ${(c * 9.5).toFixed(2)}L${(s * 12.4).toFixed(2)} ${(c * 12.4).toFixed(2)}"/>`; }).join('')}</g>
    <circle cy="-6" r="1.5" fill="#9e2133"/></svg>`,
  selector: () => `<svg class="cap" viewBox="-20 -20 40 40"><circle r="15.5" fill="#131211"/>${ridges(32, 13.6, 15.5, 0.9, '#33312e')}<circle r="13.4" fill="#1a1918"/>
    <path d="M0 -13.4 L0 -3.5" stroke="#efe7d6" stroke-width="2.4" stroke-linecap="round"/></svg>`
};
// printed scales: ticks around the knob (black ink on the aluminium plate, cream on the painted panel)
function scaleSVG (style, ink) {
  if (style === 'lever') {
    // Mockery: two dashed arcs and figures, as on a level dial — from the likeness (0) to the contrary (100)
    const arc = (r, w, dash) => { const a0 = -225 * Math.PI / 180, a1 = 45 * Math.PI / 180; return `<path d="M${(r * Math.cos(a0)).toFixed(2)} ${(r * Math.sin(a0)).toFixed(2)} A${r} ${r} 0 1 1 ${(r * Math.cos(a1)).toFixed(2)} ${(r * Math.sin(a1)).toFixed(2)}" fill="none" stroke="${ink}" stroke-width="${w}" stroke-dasharray="${dash}"/>`; };
    let t = ''; for (let i = 0; i <= 10; ++i) { const a = (-135 + 27 * i) * Math.PI / 180, s = Math.sin(a), c = -Math.cos(a), L = i % 5 === 0 ? 5 : 3; t += `<path d="M${(s * 31).toFixed(2)} ${(c * 31).toFixed(2)}L${(s * (31 + L)).toFixed(2)} ${(c * (31 + L)).toFixed(2)}" stroke="${ink}" stroke-width="${i % 5 ? 0.8 : 1.2}"/>`; }
    const num = (v, i) => { const a = (-135 + 27 * i) * Math.PI / 180; return `<text x="${(Math.sin(a) * 41.5).toFixed(1)}" y="${(-Math.cos(a) * 41.5 + 2).toFixed(1)}" font-size="5.6" text-anchor="middle" fill="${ink}" font-family="Helvetica Neue,Helvetica,Arial" font-weight="700">${v}</text>`; };
    return `<svg class="scale" viewBox="-48 -48 96 96">${arc(28.5, 0.9, '2.2 1.6')}${arc(36.8, 0.6, '0.8 1.8')}${t}${num(0, 0)}${num(20, 2)}${num(40, 4)}${num(60, 6)}${num(80, 8)}${num(100, 10)}
      <text x="-30" y="45" font-size="5" fill="${ink}" font-family="Helvetica Neue,Helvetica,Arial" font-weight="600" letter-spacing=".6">LIKE</text><text x="30" y="45" font-size="5" text-anchor="end" fill="${ink}" font-family="Helvetica Neue,Helvetica,Arial" font-weight="600" letter-spacing=".6">CONTRARY</text></svg>`;
  }
  let t = ''; for (let i = 0; i <= 10; ++i) { const a = (-135 + 27 * i) * Math.PI / 180, s = Math.sin(a), c = -Math.cos(a), L = i % 5 === 0 ? 3.6 : 2.4; t += `<path d="M${(s * 26.6).toFixed(2)} ${(c * 26.6).toFixed(2)}L${(s * (26.6 + L)).toFixed(2)} ${(c * (26.6 + L)).toFixed(2)}"/>`; }
  return `<svg class="scale" viewBox="-32 -32 64 64"><g stroke="${ink}" stroke-width="1.05" stroke-linecap="round">${t}</g></svg>`;
}
// light on the faceted knobs: each face has a sideways normal (in the knob's frame) and a tilt; turned by the knob's angle and
// lit from the upper left (L), it takes a grey between shadow and polish
const LIGHT = (() => { const v = [-0.55, -0.62, 0.56], n = Math.hypot(...v); return v.map(x => x / n); })();
const FACETS = {
  lever: { tl: [-0.82, -0.42, 0.62, 1], tr: [0.82, -0.42, 0.62, 1], bl: [-1, 0, 0.42, 1], br: [1, 0, 0.42, 1], dm: [0, 0, 0, 1] },
  bar: { bar: [0, 0, 0, 0], bl: [-1, 0, 0.8, 0], br: [1, 0, 0.8, 0] }
};
function litFacet ([nx, ny, tilt, metal], deg) {
  const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), h = Math.hypot(nx, ny) || 1;
  const x = (nx / h) * tilt, y = (ny / h) * tilt, z = Math.sqrt(Math.max(0, 1 - tilt * tilt));
  const X = x * c - y * s, Y = x * s + y * c, d = Math.max(0, X * LIGHT[0] + Y * LIGHT[1] + z * LIGHT[2]);
  const spec = Math.pow(d, 18) * 0.5, k = Math.min(1, 0.18 + 0.82 * d + spec);
  if (metal) { const g = Math.round(78 + 168 * k); return `rgb(${g},${g - 1},${g - 5})`; }
  const g = Math.round(22 + 70 * k); return `rgb(${g},${g - 1},${g - 2})`;
}
