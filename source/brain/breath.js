// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// ============================================================================================
//  CHARIVARI V6.4 — LE SOUFFLE DU SUJET, relevé (pour que le gène « breath » en ajoute du même)
//  Mat : « l'effet breath n'est pas assez naturel : se renseigner acoustiquement sur ce que veut dire "mettre du souffle"
//  pour une trompette ». Ce que l'acoustique en dit, et ce qu'on mesure ici sur le sujet lui-même :
//   • le souffle d'un instrument à vent est la turbulence du jet (entre les lèvres, à l'anche, au biseau) : un bruit large
//     bande qui PASSE PAR L'INSTRUMENT — sa répartition en fréquence suit celle de la note (son enveloppe, ses formants),
//     plus présent là où les harmoniques faiblissent, dans l'aigu (Klatt 1990 : le bruit d'aspiration se remarque d'abord
//     au-dessus des harmoniques affaiblis ; dans un son soufflé les harmoniques aigus sont REMPLACÉS par du bruit) ;
//   • il est PULSÉ à la période : le jet ne coule que lèvres ouvertes, le bruit vient par bouffées synchrones de l'onde
//     (Chafe 1990, « pulsed noise in self-sustained oscillations » ; Klatt module son bruit d'aspiration de moitié sur la
//     période). Un bruit continu, non pulsé, ne fusionne pas avec le son : on entend un souffle À CÔTÉ de l'instrument ;
//   • il suit l'enveloppe de la note, la précède à l'attaque (l'air passe avant que les lèvres n'accrochent) et la suit à
//     la fin (l'air qui s'échappe) ;
//   • « plus de souffle », c'est : la part de bruit qui monte, les harmoniques aigus qui s'affaiblissent (pente spectrale :
//     moins de cuivre), le fondamental relativement plus fort — la note reste une note.
//  Relevé sur le sujet (banc harmonique, td.js splitHarmonic : H = partiels, N = le reste) :
//   part de bruit par octave (dB sous les partiels), profondeur et phase de la pulsation du bruit 1,5–8 kHz pliée sur la
//   phase du fondamental (comparée à la phase du maximum de l'onde), avance du bruit sur les attaques, traîne après les
//   fins, pente bruit/partiels (le bruit suit-il la note ?). Mesuré sur la trompette de Mat (« vrac p lancinante ») : bruit
//   de −12 à −21 dB par octave, pulsé (profondeur 0,22) au maximum de l'onde (0,03 contre 0,97 de période), en avance de
//   10 ms sur les attaques, pente 0,94 (il suit la note) — c'est cette trompette qui donne les valeurs par défaut.
// ============================================================================================
import { splitHarmonic, fundamentalPhase } from './td.js';
import { fft } from './fft.js';

export const BANDS = [[0, 500], [500, 1000], [1000, 2000], [2000, 4000], [4000, 8000], [8000, 24000]];
// valeurs de la trompette de Mat, pour un sujet dont le souffle ne se mesure pas (synthèse propre, trop peu de notes)
export const TRUMPET = { nhr: [-14.4, -21.2, -17.3, -17.3, -17.9, -11.9], pulse: 0.22, lead: 0.010, slope: 0.94 };

function bandpass (X, sr, lo, hi) {
  const out = Float64Array.from(X);
  const run = (fc, hp) => { const w = 2 * Math.PI * fc / sr, al = Math.sin(w) / (2 * 0.707), c = Math.cos(w); const b0 = hp ? (1 + c) / 2 : (1 - c) / 2, b1 = hp ? -(1 + c) : 1 - c, b2 = b0, a0 = 1 + al, a1 = -2 * c, a2 = 1 - al; let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < out.length; ++i) { const x = out[i], y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x; y2 = y1; y1 = y; out[i] = y; } };
  // aller puis retour : phase nulle (la phase de la bouffée dans la période n'est pas décalée par le filtre)
  run(lo, true); run(hi, false); out.reverse(); run(lo, true); run(hi, false); out.reverse(); return out;
}
export function breathStats (P, Hm, Nm, z1, Fo, G) {
  const sr = P.sr, D = Hm.length, nb = Fo.length;
  const NF = 2048, win = new Float64Array(NF).map((_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / NF));
  const eH = BANDS.map(() => 0), eN = BANDS.map(() => 0);
  let nfr = 0; const re = new Float64Array(NF), im = new Float64Array(NF), re2 = new Float64Array(NF), im2 = new Float64Array(NF);
  for (let s = 0; s + NF <= D; s += NF / 2) {
    const F = Fo[Math.min(nb - 1, Math.floor((s + NF / 2) / G))]; if (!(F > 40)) continue;
    for (let i = 0; i < NF; ++i) { re[i] = Hm[s + i] * win[i]; im[i] = 0; re2[i] = Nm[s + i] * win[i]; im2[i] = 0; }
    fft(re, im); fft(re2, im2); nfr++;
    for (let k = 1; k < NF / 2; ++k) { const f = k * sr / NF, h = re[k] * re[k] + im[k] * im[k], nn = re2[k] * re2[k] + im2[k] * im2[k]; for (let b = 0; b < BANDS.length; ++b) if (f >= BANDS[b][0] && f < BANDS[b][1]) { eH[b] += h; eN[b] += nn; } }
  }
  const nhr = BANDS.map((b, i) => 10 * Math.log10((eN[i] + 1e-20) / (eH[i] + 1e-20)));
  // pulsation : énergie du bruit 1,5–8 kHz pliée sur la phase du fondamental ; phase du maximum de l'onde (H)
  const nb2 = bandpass(Nm, sr, 1500, 8000), BINS = 32, fold = new Float64Array(BINS), cnt = new Float64Array(BINS), foldH = new Float64Array(BINS);
  const { th, ok } = fundamentalPhase(z1, D, G);
  for (let i = 0; i < D; ++i) { if (!ok[i]) continue; const F = Fo[Math.min(nb - 1, Math.floor(i / G))]; if (!(F > 40)) continue; let x = th[i] / (2 * Math.PI); x -= Math.floor(x); const q = Math.min(BINS - 1, Math.floor(x * BINS)); fold[q] += nb2[i] * nb2[i]; foldH[q] += Hm[i]; cnt[q]++; }
  const fe = Array.from(fold, (v, q) => cnt[q] ? v / cnt[q] : 0), fmax = Math.max(...fe), fmin = Math.min(...fe);
  const fh = Array.from(foldH, (v, q) => cnt[q] ? v / cnt[q] : 0);
  // phase du pic : barycentre circulaire de l'énergie au-dessus de la moyenne
  const circ = arr => { const m = arr.reduce((a, v) => a + v, 0) / arr.length; let c = 0, s2 = 0; arr.forEach((v, q) => { const w = Math.max(0, v - m), a = 2 * Math.PI * (q + 0.5) / BINS; c += w * Math.cos(a); s2 += w * Math.sin(a); }); let x = Math.atan2(s2, c) / (2 * Math.PI); return x - Math.floor(x); };
  // enveloppes 5 ms : avance du bruit sur les attaques, traîne après les fins, pente bruit/partiels
  const B = 240, nE = Math.floor(D / B), eHb = new Float64Array(nE), eNb = new Float64Array(nE);
  for (let b = 0; b < nE; ++b) { let a = 0, c = 0; for (let i = b * B; i < (b + 1) * B; ++i) { a += Hm[i] * Hm[i]; c += nb2[i] * nb2[i]; } eHb[b] = 10 * Math.log10(a / B + 1e-14); eNb[b] = 10 * Math.log10(c / B + 1e-14); }
  const leads = [];
  for (const q of P.notes || []) {
    const a = Math.floor(q.t0 * sr / B), e = Math.min(nE - 1, Math.floor(q.t1 * sr / B)); if (e - a < 8) continue;
    let pH = -200, pN = -200; for (let b = a; b <= Math.min(e, a + 60); ++b) { pH = Math.max(pH, eHb[b]); pN = Math.max(pN, eNb[b]); }
    let tH = -1, tN = -1; for (let b = Math.max(0, a - 20); b <= Math.min(e, a + 60); ++b) { if (tH < 0 && eHb[b] > pH - 10) tH = b; if (tN < 0 && eNb[b] > pN - 10) tN = b; }
    if (tH >= 0 && tN >= 0) leads.push((tH - tN) * B / sr);
  }
  const med = a => { if (!a.length) return NaN; const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
  let sx = 0, sy = 0, sxx = 0, sxy = 0, nn = 0; for (let b = 0; b < nE; ++b) { const F = Fo[Math.min(nb - 1, Math.floor(b * B / G))]; if (!(F > 40) || eHb[b] < -70) continue; sx += eHb[b]; sy += eNb[b]; sxx += eHb[b] * eHb[b]; sxy += eHb[b] * eNb[b]; nn++; }
  return { nfr, nhr, pulse: (fmax - fmin) / (fmax + fmin + 1e-30), pulsePhase: circ(fe), wavePhase: (fh.indexOf(Math.max(...fh)) + 0.5) / BINS, lead: med(leads), nLead: leads.length, slope: nn > 10 ? (nn * sxy - sx * sy) / (nn * sxx - sx * sx) : NaN };
}
/** le souffle du sujet (mis en cache) : chaque valeur vient du sujet si elle s'y mesure, sinon de la trompette de Mat */
export function breathOf (P) {
  if (P.__breath) return P.__breath;
  let st = null;
  try {
    const S = splitHarmonic(P), Hm = Float64Array.from(S.H[0], (v, i) => 0.5 * (v + S.H[1][i])), Nm = Float64Array.from(S.N[0], (v, i) => 0.5 * (v + S.N[1][i]));
    st = breathStats(P, Hm, Nm, S.z1[0], S.Fo, S.G);
  } catch (e) { st = null; }
  const enough = st && st.nfr >= 40;
  // part de bruit par octave : celle du sujet, bornée entre −30 et −8 dB (au-dessus, ce n'est plus son souffle mais un bruit
  // qui ne suit pas la note — mesuré : clarinette basse +2 à +4 dB au-dessus de 1 kHz, pente bruit/partiels 0,30)
  const nhr = TRUMPET.nhr.map((v, b) => enough && Number.isFinite(st.nhr[b]) && (st.slope > 0.5 || b < 2) ? Math.max(-30, Math.min(-8, st.nhr[b])) : v);
  const pulse = enough && st.pulse >= 0.15 ? st.pulse : TRUMPET.pulse;
  // la bouffée tombe au maximum de l'onde quand le sujet le montre (pic du bruit à moins d'un quart de période du maximum
  // de l'onde), sinon au maximum de l'onde quand même (le jet coule lèvres ouvertes, au maximum du débit)
  const lead = enough && st.nLead >= 3 && st.lead > 0 ? Math.min(0.04, Math.max(0.008, st.lead)) : TRUMPET.lead;
  // phase de la bouffée par rapport au maximum de l'onde, relevée (filtre à phase nulle) quand la pulsation se mesure
  let phase = 0; if (enough && st.pulse >= 0.15) { phase = st.pulsePhase - st.wavePhase; phase -= Math.round(phase); }
  return (P.__breath = { nhr, pulse, lead, phase, measured: st ? { nhr: st.nhr, pulse: st.pulse, pulsePhase: st.pulsePhase, wavePhase: st.wavePhase, lead: st.lead, nLead: st.nLead, slope: st.slope, nfr: st.nfr } : null });
}
