// Charivari 1.0 — rough music for one sound
// Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio
// This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License
// as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
// This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty
// of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License (LICENSE) for more details.
// Credits (the frieze after the Roman de Fauvel, BnF ms. fr. 146; Moonvox) and third-party licences: CREDITS.md, licences/.
//
// CHARIVARI 1.0.1 — vox mira studio — WINDOW SIZE: 1100x740 (1.0.1: a ZD scale laid on the MTS-ESP master's notes, from the subject's tonic; 1.0: each mummer its own phosphor, its window and its joystick in it; the credits; V6.9.2: a spring-return lever sets the sixteen mummers in one-shot or hold; the isoperiodicity no longer cyclic — interversions and rhythmic characters; shading from one light at the upper left; each mummer's degree under its transformations; V6.9.1: multichannel — sixteen stereo outputs, each pad (the subject too) sent to the pair chosen in its header (OUT 1/2 … 31/32), the menu limited to the pairs of the REAPER track, a pad on a pair the track lacks folded onto 1/2 and shown in red; V6.9: the tempo read by the analysis shown and typed by hand (the troupe born again on the typed pulse); the scale chosen in the ZD Ultimate library, the analysis's proposal first, the scales its tuning cannot carry greyed; each mummer's degree of the Tuning switch stepped by hand through every degree; the tuning followed from an ODDSound MTS-ESP master (CLAP / VST3), its name shown; the switches readable on the metal; the bottom row by family — the audible macros, the playing, the tuning; V6.8: GESTURE on a struck mummer — each attack swells in from its own body, the mummer delayed by a value of the subject's beat; the hold never taken in a silence; V6.7: a pulse read on three to five clear attacks (how far above chance it fits, said in the analysis), the lacquered partials 6 dB louder; V6.6: the lacquer's motion on the subject's pulse when its morphology has one, humanised (each rate drifting ±2.5 % with the pad's attractor, free phases), at the index of the subject's own life with its colour kept; the hold entered inside the held zone with a long fade compensated by correlation and the grain cloud filling on an S; the host's snapshots recall the slots and every pad setting (a « Settings » parameter numbering settings records kept on this computer); V6.5: sound quality at every stage, measured — bandlimited reading everywhere (Kaiser sinc in the brain, 32-tap sinc in the engine), files at other rates decoded at their own rate and converted by the brain (140 dB), grains aligned to 1/16 of a sample and their body corrected grain by grain, noise grains summed in power, MASK oversampled with ADAA, FLESH demodulated at the 4th order, sympathetic strings with Thiran allpasses, zero-phase infrasound filter, coherent added noise, soft harmonic/noise split, aligned splices, complementary space bands, a physical room for the first reflections; transfers that wait, without giving up, for an engine the host has silenced (interface hidden, REAPER in the background), and say so; V6.4: breath as the subject breathes — noise shaped by its partials, pulsed at its period, leading its attacks; the room re-measured per octave and re-built from the subject's own decay and colour; sympathetic strings following the subject's envelope; a human flutter tongue; isoperiodicity as an isorhythm of the subject's own features and durations; hold mode: the loop under a cloud of grains sized by the analysis; détaché and release cuts given the subject's own release; the lacquer plays a Moonvox timbre CREATED from the subject. V6.3: the LACQUER — Moonvox fitted to the subject and laid by touches on each pad's partials, in their own phase, switched and dosed per pad, dosed for the troupe; the subject as a 17th pad — click its waveform: red frame, its own joystick, playback, envelope, pan and lacquer, its playhead; twelve crystallisations of jgcompose at the scale of the partials (crystal, clockwork, constellation, beating); the inverted synthesis rewired. V6.2: re-mutate one pad; a pan per pad; sympathetic strings that resonate with the subject's own timbre, tuned to its scale, its measured partials or their multiples; section players placed in space, detuned by the subject's microtonality; the hocket and the isoperiodicity on the subject's own rhythm; every periodic writing on its groove; an organic hold loop; the room of the subject analysed and caricatured (room gene); melodic writings exactly on the analysed degrees. V6.1: Mockery 0 keeps only the gentlest mutations, measured; the grains no longer splice hard at an attack; each instance owns its troupe — two instances of one preset no longer share subjects; SHADOW, MASK and BODY reworked in the engine; the subject's note on the listen button. V6: transposition back to the grains, with the air restored above them when they go down (the source's own top band, untransposed, where the body is kept); body inertia C — the harmonic bank with resonances bounded by the subject's own release, highs damped faster, no new resonance on noise; a worn instrument skin: fine stoved enamel chipped at the edges, vintage brushed aluminium plate, knobs after a 1970s field recorder (Mockery: a pointer lever on its own plaque), shadows from the upper left, a charivari engraved in the paint under the troupe, scrollable analysis; the troupe comes back from the disk after the engine is rebuilt even when the host loses the troupe number; v5.9: transposition through the harmonic bank (now on request); v5.8: the harmonic bank by default; envelope guard — no cut faster than the subject's own; acoustic morphology kept by reorganisations; troupe generations (double-click a slot); jgcompose lot 3a, 13 time writings: contract-dilate, sway, groove contamination, misaligned layers, oriented drift, détaché, isoperiodicity, additive, pre-audibility, regrouping, suspension, breathing, regrid; lot 3b, 14 pitch writings: alteration, neighbour notes, corruption, passing notes, development, modal borrowing, modulation, isorhythm, pivot note, response, melodic retrograde, changing tail, developing variation, contour neighbourhood; lot 3c, 14 form/spectrum/voice writings: open & closed endings, tonal answer, statement form, ending, form by dilation, saturated bar, progression, tutti strike, spectral halo, tuning to the bass, deviation, variation vector, counterpoint, heterophony; v5.7: jgcompose lot 2 — 19 writings: lamp, prism, fusion, canon between voices, parallelism, fixed partial, advent, budget, inverted arch, threshold, spectral permutation, A→B interpolation, contrametricity, silence, refrain window, register regime, register switch, echo, pedal; v5.6: the troupe kept on this computer)
// Rough music for one sound. The SUBJECT (a sample) is paraded as sixteen MUMMERS, caricatures of itself.
// Interface: vox mira charter (metal panel — here fine speckled painted metal like the Berlant Series 30 recorder —, screws,
// loupe, black screens). The subject is picked from a file, decoded at 48 kHz and kept in the preset state as 24-bit audio. The mummers
// are BORN HERE, in Web Workers (living engine: phase-gradient vocoder, harmonic region cloning, instrument mutations), then
// travel to the DSP in acknowledged packets (24-bit) with their living stasis loop and their ANATOMY (pitch, loudness,
// formants, events, source position, spectral envelope, frame by frame). The DSP plays them (playback and ADSR set per pad,
// crowd or solo voicing) and runs the four real-time poles, tuned to the scale found by the analysis (sent with the facts).

/*BRAIN_CODE*/

const FS = 48000, MAXLEN = 1 << 20, B64_CHUNK = 1 << 20, FULL24 = 8388607;

/*FRIEZE_MASK*/
// V6 skin: textures, knobs, scales (art/skin.js) and the engraved charivari (art/frieze.png), inlined by build.mjs
/*SKIN*/
const pct = v => Math.round(v * 100) + ' %';
const ms = v => v < 10 ? v.toFixed(1) + ' ms' : v < 1000 ? Math.round(v) + ' ms' : (v / 1000).toFixed(2) + ' s';
const panTxt = v => Math.abs(v) < 0.005 ? 'centre' : (v < 0 ? 'L ' : 'R ') + Math.round(Math.abs(v) * 100);
const gainTxt = v => v <= -59.9 ? 'silent' : (v >= 0.05 ? '+' : v <= -0.05 ? '−' : '') + Math.abs(v).toFixed(1) + ' dB';
const lacqTxt = v => v <= 0.9 + 1e-6 ? pct(v) : Math.round(v * 100) + '·+' + Math.round(100 * (v - 0.9)) + 'dB';
// contextual help (bubbles after one second without moving the mouse)
const HELP = {
  // (1.0) the credits, Mat: « mettre tous les crédits (l'auteur du dessin, Vox Mira Studio…) et les licences »
  brand: 'CHARIVARI 1.0.1 — by Matthieu Guillin, Vox Mira Studio, 2026. Free software under the GNU General Public License, version 3 or later: the source code is published with each release. Built with Cmajor, CHOC, QuickJS, CLAP, clap-wrapper, the VST 3 SDK and ODDSound\'s MTS-ESP client; their licences are in CREDITS.md and licences/, inside the plugin (Contents/Resources). The lacquer is after Moonvox (Vox Mira Studio). VST is a registered trademark of Steinberg Media Technologies GmbH.',
  frieze: 'THE FRIEZE — from the charivari miniatures of the Roman de Fauvel (Gervais du Bus, with the additions of Chaillou de Pesstain): Paris, Bibliothèque nationale de France, manuscrit français 146, early 14th century, painted by the illuminator known as the Fauvel Master. Public domain; redrawn for Charivari as an engraving in the paint.',
  param35: 'MOCKERY — how far the sixteen mummers stray from the subject. At 0 % they are close likenesses: only the gentlest mutations, chosen by their measured distance to the subject (a few dB at most); at 100 % the troupe spreads from pad 1, almost the same, to pad 16, its contrary (strongest doses, most mutations). Each mummer receives two to four mutations of the instrument (size, bells, mute, breath, bore, material, section…) and of its time (canon, hocket, bloom, aksak, spiral, stasis…), chosen from what the analysis found in the subject. Changing it gives birth to a new troupe (a few seconds per mummer; already born troupes come back from the cache).',
  param36: 'SHADOW — the subject walks behind each mummer. The original sound is read along the mummer\'s own time map (where each moment of the mummer came from in the subject) and mixed under it, so the caricature keeps a trace of its model. In stasis the shadow follows the same slow path as the loop. Where the mummer jumps in time (a cut, a repeat, a moved fragment) the shadow crossfades in 10 ms instead of racing through the gap, and where the mummer has no source it fades out in 5 ms. 0 %: off; 100 %: the shadow at −3 dB under the mummer.',
  param38: 'VOLUME — output level of the whole troupe (−48 to +6 dB), smoothed so it never clicks.',
  param39: 'BASE NOTE — the MIDI note of pad 1. Pads 1 to 16 follow chromatically upwards; the subject itself plays one note below the base note (its own pad: hold mode). Velocity sets the level over a 24 dB range.',
  pop: 'TROUPE — one joystick for the whole troupe: its position is added to each mummer\'s own joystick (dashed circle on the big joystick). Push it to move every mummer toward the same pole at once, for instance all towards BODY. Double-click: back to the centre.',
  param40: 'VOICING — Crowd: up to 24 notes sound together, the oldest is choked when a 25th arrives. Solo: each new note chokes the previous one (two voices overlap during the Choke time), like one mummer at a time.',
  param42: 'TUNING — Free: every mummer keeps the pitch of the subject. Scale: mummer after mummer climbs one degree of the scale found in the subject (its fundamental is the tonic), up to the second octave above it; beyond, the climb starts again one octave below the subject and rises through the fundamental to the second octave, and so on (the third octave kept nothing of the timbre). The whole troupe is born again. Each mummer\'s degree can then be stepped by hand in its report (◀ ▶); with Source on MTS-ESP the degrees are the notes of the MTS-ESP master.',
  param41: 'CHOKE — Solo voicing only: how long the previous note takes to die (−43 dB) when a new one starts. Short: a hard cut; long: the two notes overlap.',
  pMode: 'PLAY (selected mummer) — One-shot: the mummer plays to its end whatever the key does; the envelope is not used. Hold: while the key is held, the mummer freezes at its hold point (dashed line on the pad) into its LIVING STASIS — a loop born with it, never a plain repetition, and over it a cloud of GRAINS read in the held zone of its own sound (their size, number and envelope measured on the sound: at least four periods, no longer than the sound stays itself, on the grid of its period so they add in phase; read around a cursor that crosses the held zone four times slower than the sound), the loop 9 dB under the grains —; on release it leaves the stasis and ends naturally, shaped by the envelope.',
  pA: 'ATTACK (selected mummer, Hold) — linear rise from silence to full level when the key goes down, 0 to 2 s.',
  pD: 'DECAY (selected mummer, Hold) — time to fall from full level to the sustain level, 5 ms to 4 s.',
  pS: 'SUSTAIN (selected mummer, Hold) — level kept while the key is held, 0 to 100 %.',
  pR: 'RELEASE (selected mummer, Hold) — fade after the key is released, down to −43 dB, 5 ms to 8 s. Meanwhile the mummer leaves its stasis and plays its natural ending.',
  remut: 'RE-MUTATE (selected mummer) — this mummer alone is born again by other techniques, at the same dose; the fifteen others stay as they are. Each click gives another mummer (the next candidates the analysis finds most relevant and least worn by the rest of the troupe); Alt-click goes back one step, down to the original. Every version stays in the cache: going back is instant.',
  lacq: 'LACQUER (selected pad: a mummer or the subject) — switch it on to lay MOONVOX on this pad by touches. The brain CREATES a Moonvox timbre from the subject, the way one is made in Moonvox: a table of 48 oscillators and the oboe / brass waveshapers chosen together so that Moonvox gives back the subject\'s own harmonic profile, the subject\'s formants, the life of each of its partials, and a circulation that moves the timbre as much and as fast as the subject\'s own timbre moves (shown under the pad\'s mutations); it also measures how the phase of each partial behaves in this very sound. The engine splits the pad into its harmonics (up to 24) and lends each one that Moonvox timbre in motion — its circulation turning oboe / brass, tilt and formants, nudged by a Lorenz attractor, a living shimmer on every partial, odd partials to the left and even to the right — through three brushes the attractor walks over the partials. Every new partial keeps the phase of the one it replaces (where a partial is too weak to have one, the phase the sound gives it). Off by default; its dose: the Lacquer knob beside the envelope, and the troupe\'s Lacquer knob below.',
  pL: 'LACQUER DOSE (selected pad) — dry/wet of this pad\'s lacquer when it is switched on: at 0 the pad is untouched, at 90 % every partial carries most of Moonvox\'s colour and motion where a brush touches it; from 90 to 100 % the lacquer itself rises up to 10 dB louder (+10 dB at 100 %). Multiplied by the troupe\'s Lacquer knob. Double-click: 100 %.',
  pG: 'GAIN (selected pad, both modes) — the level of this mummer (or of the subject) in the troupe: up to +12 dB, down to silence at the bottom of its course. Double-click: 0 dB.',
  param44: 'LACQUER (troupe) — dry/wet of the lacquer over every pad where it is switched on (each pad also has its own dose). 0: no lacquer anywhere; 100 %: each pad at its own dose.',
  pP: 'PAN (selected mummer, both modes) — places the mummer between left and right with a −4.5 dB pan law: in the centre it is untouched; towards a side its own stereo width narrows and the mummer moves as one player (each side reaches +4.5 dB on its speaker, between the constant-power and the linear laws). Double-click: centre.',
  joy: 'POLES of the selected mummer — four real-time transformations that read the mummer\'s own anatomy (its pitch, loudness, formants and events, measured frame by frame at its birth) and tune themselves to the scale found in the subject. Up GESTURE, right BODY, down MASK, left FLESH; the corners mix two poles, the distance from the centre is the amount. The centre is the mummer as it was born. The level is kept constant while the poles move. Double-click: back to the centre.',
  poleN: 'GESTURE (up) — the gesture turned inside out. The mummer\'s events are measured at its birth: its attacks, at the exact sample; if it has none, its note changes; if none, its loudness swells; if none, the whole mummer is one breath. Every segment between two events is played BACKWARDS: the decay becomes a swell that sucks the sound into the next event, the attack arrives at the end. The amount crossfades (at equal loudness) from the forward reading to the reversed one: in between you hear both, the gesture and its inverse. At each event the reversed reading fades out through the attack while the next segment fades in (up to 20 ms), so nothing clicks. Each event also gives BODY\'s rotation a kick. A STRUCK mummer (its segments die out before the next attack: a drum, a pluck, a single hit) is not read from its silent end: each attack SWELLS in from its own body — read backwards from where it has fallen 20 dB down to its peak, then forwards from the peak — and the whole mummer is delayed by that length, so its hits keep their places against one another. There the amount picks the swell\'s length: a value of the subject\'s beat when it has a pulse (1/16 to 4 beats), otherwise a fraction of the body (¼ ⅓ ½ ⅔ ¾ 1), never longer than the body nor than the room before the next attack; at 0, the mummer as it was born.',
  poleE: 'BODY (right) — puts the mummer inside three resonant tubes (looped waveguides): the first on the mummer\'s own NOTE (as moved by FLESH), the two others on the next two degrees of the subject\'s scale (folded into 30 Hz – 2 kHz). The tubes keep their tuning while the melody passes through them, like the modes of a real body, and glide in 30 ms when FLESH transposes. They are coupled by a small 3-D rotation that sways around rest (more on each GESTURE event), and each tube has its own place in the stereo field, which turns slowly. Amount: resonance time from 0.05 s to 1.6 s, the dry sound recedes as the body grows (at the top you hear mostly the resonance), the level stays about constant. Soft saturation only above 0.7 keeps it from exploding; every coefficient glides sample by sample.',
  poleS: 'MASK (down) — works on the mummer\'s vowel: its three formants F1 F2 F3, measured frame by frame. 1) three bell filters push the formants (up to +15 dB); 2) a wavefolder stains what was pushed; 3) the stain rings in a comb tuned to the scale degree nearest the pitch, whose length is pulled by a spring that the measured loudness rises kick (a wavering reflection, as in Ripple Mirror); 4) inverse bells remove the formants at positions MIRRORED around a scale degree (as in Balance Stain\'s pitch invert). A little: a pushed, stained vowel. Full: the vowel flips (ah towards ee) and the stain sings.',
  poleW: 'FLESH (left) — a heterodyne bank splits the mummer into its measured harmonics (up to 24) and rebuilds them elsewhere. 0–15 %: every partial moves by the same number of hertz (a frequency shift: inharmonic, metallic); 15–60 %: the shift becomes a true transposition (the partials realign); the target climbs degree by degree along the subject\'s scale, up to 12 degrees, on a sticky staircase (it rests on each degree, then slides); 50–100 %: the formants flip (partials take the envelope\'s inverse); 70–100 %: every partial snaps onto the scale. What the bank cannot follow (breath, noise) is frequency-shifted with the fundamental. With no shift the bank is exactly transparent.',
  pad: 'A MUMMER — click to select it (and hear it). Its joystick, playback and envelope appear on the right. Top: its number, its first mutation and its length; bottom: its note and its other mutations (or its poles when its joystick is off-centre). The bright bar is the playhead; red in stasis. Greyed: not born yet. DRAG a born mummer onto an empty subject slot: it becomes a subject of its own (24-bit, stored in the preset) — select that slot to parade the mutants of this mutant.',
  slot: 'SUBJECT SLOTS — eight samples kept on this computer, in the plugin\'s own store (24-bit, up to 21.8 s each; not inside the preset: to share a troupe, share its audio files too). Click one to make it the subject: the troupe is analysed and born again (or restored from the cache). DOUBLE-CLICK a filled slot (or load the same file again) for ANOTHER TROUPE of the same subject: new masks, chosen away from those its earlier troupes wore (no chance involved: the same troupe always comes back the same). An empty slot also accepts a mummer dragged from its pad: its name then reads “mummer ‹ subject”.',
  pick: 'LOAD — choose an audio file as the subject of the selected slot. It is decoded at 48 kHz and kept on this computer at 24 bits (16- and 24-bit files exactly; float files lose only what lies below −144 dBFS), up to 21.8 s.',
  audition: 'LISTEN — hold to hear the subject itself. From MIDI it plays one note below the first mummer (the note shown on the button: base note C1 → subject on B0). It is the 17th pad: click its waveform to select it — its joystick, playback, envelope, pan and lacquer then appear on the right.',
  clear: 'CLEAR — empty the selected slot (the preset forgets the sample).',
  pwave: 'THE SUBJECT, THE 17th PAD — its waveform; the red ticks are the attacks found by the analysis, the bright line is its playhead (red in stasis). CLICK it to select the subject (red frame) and hear it: the right column then belongs to it — its own joystick (the four poles, outside the troupe\'s joystick), its playback mode and envelope, its pan and its lacquer, exactly as for a mummer. It plays from its own slot in the engine, sent with its anatomy after the analysis (until then, from its plain buffer, without poles).',
  facts: 'WHAT THE ANALYSIS FOUND — length and active part; fundamental and how tonal it is; the TUNING (where the pitches are: the ODDSound tuning closest to its partials) and the SCALE (which of them are played: the ZD Ultimate scale — 2322 scales, 20 families — closest to the keys that are active in the sound, with its degree labels): the scale tunes the four poles and the Tuning switch and gives every mummer its degrees; attacks and notes; PULSE: the tempo read on the attacks (from three clear attacks on: with fewer than six, the analysis says what share of arbitrary placements of as many attacks would fit a grid as well, and the pulse is used only when no more than 30 % do), the grid step (the finest regular value) and how many make a beat, and the other reading of the same grid when one is almost as good (80 or 120 on the same eighths, say) — every mummer is built on this grid; GROOVE: how far the attacks sit from the straight grid (median), the offset of each step of the beat (+ = behind, laid-back; − = ahead, pushed) — the mummers\' rhythmic events carry these offsets — the swing of a binary beat, and the attacks left out as off-grid (pick-ups, flams); then life (pitch and level wandering), brightness and formants. Click the tempo to type your own, click the scale to choose another one.',
  axes: 'TRAITS — the measures that decide which mutations each mummer receives: a tonal subject gets bells and sympathetic strings, a percussive one gets hocket and aksak, a long one gets stasis and spiral, and so on.',
  organs: 'THE SELECTED MUMMER — its mutations (genes) with their dose, its length, hold point and level, how GESTURE reads it (attacks, note changes, swells or one breath), and what each mutation did. Each dose is the one the analysis computed for this mummer: drag its bar (0–100 %) and release — this mummer alone is born again at that dose (at 0 % the mutation is off: born without it) (red bar: set by hand, kept in the troupe); double-click a bar: back to the computed dose. Scroll with the wheel.',
  status: 'STATUS — births (how many to come, which are being born), transfers to the engine and sounding voices. « Engine silent »: nothing has come from the engine for 1.5 s — the host is not running it, or not passing its messages while the interface is hidden (measured in REAPER: silent behind AMORPH\'s code view and with REAPER in the background, back at once with REAPER in front and the interface shown). Births go on; sending waits and resumes by itself.',
  loupe: 'LOUPE — shows the name and value of the control being moved.',
  allmode: 'ALL 16 — a lever that springs back to the middle: pushed to one-shot or to hold, it sets the sixteen mummers at once (the subject keeps its own). Afterwards every mummer stays its own: its play switch still changes it alone.',
  out: 'OUT (selected pad) — the stereo pair this mummer (or the subject) is sent to: 1/2 to 31/32. The plugin has sixteen stereo outputs; in REAPER it reads how many channels its track has and offers only the pairs the track has (an 8-channel track: 1/2 to 7/8). A pad set on a pair the track no longer has keeps its choice, shown in red (« 9/10 → 1/2 »), and sounds on 1/2 until the track has enough channels. Pan, envelope and lacquer stay the pad\'s own; Volume, Voicing and Choke stay common to the troupe.',
  param48: 'SOURCE — where the pitches come from. Analysis: the tuning and scale found in the subject (or the scale you chose in the analysis). MTS-ESP: the tuning of the ODDSound MTS-ESP master running in the session — its name is shown under the switch; the four poles follow it at once, and in scale mode each mummer is born on a note the master plays (the master note nearest the subject\'s fundamental is the first degree). With no master running, the analysis is kept. The Scale key then lays a ZD scale on the master\'s notes, from the subject\'s tonic (1.0). (MTS-ESP needs the plugin version.)',
  bpm: 'TEMPO — the pulse the analysis read (shown beside it). Click the number to type your own (20 to 400 BPM, Enter to apply): the subject\'s grid becomes exactly that tempo — the analysis\'s subdivision kept, the grid laid on the subject\'s attacks, its groove read again against it — and the troupe is born again on it (a tempo already tried comes back from the cache at once); the lacquer and GESTURE follow it. Double-click: back to the analysis.',
  scalepick: 'SCALE — click to choose another scale: first the one the analysis proposed, then the 2322 scales of ZD Ultimate by family. The tuning stays the analysis\'s (where the pitches are); the scale says which of them are played. A scale the tuning cannot carry (one of its keys has no pitch in this tuning) is greyed. The poles are retuned at once and the troupe is born again on the new scale (a scale already tried comes back from the cache). With Source on MTS-ESP (1.0) the scale is laid on the master\'s notes instead, its own choice: the tonic is the master\'s note nearest the subject\'s fundamental, each key is realised by the master\'s note the analysis gives it (a master with 12 notes to the octave carries every scale), a master that does not come back to the octave carries none; first « all the master\'s notes » (as before), then the analysis\'s proposal on the master. In scale mode the troupe is then born on those notes only.',
  degree: 'DEGREE (Tuning: scale) — the degree this mummer is born on. ◀ ▶ step through every degree of the scale (or of the MTS-ESP master), from the octave below the subject to the top of the second octave above it; this mummer alone is born again there. Double-click the degree: back to the one the ladder gives it.'
};
const KNOBS = [
  { id: 'param35', label: 'Mockery', min: 0, max: 1, def: 1, fmt: pct, loupe: 'Mockery' },
  { id: 'param36', label: 'Shadow', min: 0, max: 1, def: 0, fmt: pct, loupe: 'Shadow' },
  { id: 'param38', label: 'Volume', min: -48, max: 6, def: -6, fmt: v => v.toFixed(1) + ' dB', loupe: 'Volume' },
  { id: 'param39', label: 'Base note', min: 0, max: 112, def: 36, step: 1, fmt: v => noteName(Math.round(v)), loupe: 'Base note' }
];
// playback and ADSR: SET PER PAD (the selected mummer's settings, kept in the preset, sent to the DSP as "padPlay")
const PLAYK = [
  { id: 'pA', local: 1, label: 'Attack', min: 0, max: 2000, def: 2, curve: 3, fmt: ms, loupe: 'Attack' },
  { id: 'pD', local: 2, label: 'Decay', min: 5, max: 4000, def: 300, curve: 3, fmt: ms, loupe: 'Decay' },
  { id: 'pS', local: 3, label: 'Sustain', min: 0, max: 1, def: 1, fmt: pct, loupe: 'Sustain' },
  { id: 'pR', local: 4, label: 'Release', min: 5, max: 8000, def: 400, curve: 3, fmt: ms, loupe: 'Release' },
  { id: 'pP', local: 5, label: 'Pan', min: -1, max: 1, def: 0, fmt: panTxt, loupe: 'Pan' },
  { id: 'pG', local: 8, label: 'Gain', min: -60, max: 12, def: 0, fmt: gainTxt, loupe: 'Gain' }
];
// (V6.4) the lacquer of the selected pad on its own row: its switch and its dose (above 90 % its signal rises up to +10 dB)
const LACQK = { id: 'pL', local: 7, label: 'Dose', min: 0, max: 1, def: 1, fmt: lacqTxt, loupe: 'Lacquer' };
const SMALL = [{ id: 'param41', label: 'Choke', min: 5, max: 4000, def: 250, curve: 3, fmt: ms, loupe: 'Choke' },
  { id: 'param44', label: 'Lacquer', min: 0, max: 1, def: 1, fmt: pct, loupe: 'Lacquer · troupe' }];
const SWITCHES = [
  { id: 'param40', label: 'Voicing', off: 'crowd', on: 'solo' },
  { id: 'param42', label: 'Tuning', off: 'free', on: 'scale' },
  { id: 'param48', label: 'Source', off: 'analysis', on: 'MTS-ESP' }
];
const [SW_VOICE, SW_TUNE, SW_SRC] = SWITCHES;
const PLAYSW = { id: 'pMode', local: 0, label: 'Play', off: 'one-shot', on: 'hold' };
// [mode, attack, decay, sustain, release, pan, lacquer on (V6.3), lacquer dose, gain dB (V6.4), output pair 0–15 (V6.9: 1/2 … 31/32)]
const PLAY_DEF = [0, 2, 300, 1, 400, 0, 0, 1, 0, 0], PARENT_PLAY = [1, 2, 300, 1, 400, 0, 0, 1, 0, 0];
const pairTxt = b => `${2 * b + 1}/${2 * b + 2}`;
// (V6.4) THE TROUPE'S OWN SETTINGS. Measured in AMORPH on 17.10 (editor reopened, Mat touching nothing): Mockery came first as
// 0.5 (8 ms), then 1.0 — its initial value — while Mat had left it at 68 %; Tuning came back off, then on 8 s later; the troupe
// number as 524 288. A troupe never asked for (100 %, tuned) was born again — 16 births, nothing for it in the cache — while
// the one at 68 % waited on the disk. The settings that decide which mummers are born (Mockery, Tuning, Subject) are now kept
// with the troupe: at opening they are put back, and for 12 s whatever the host sends for them is taken as its own restore
// and answered with the troupe's values — unless Mat moves them himself.
const KEEP = ['param35', 'param42', 'param37', 'param48'], KEEP_MS = 12000;
const SUBJ = 16;                       // (V6.3) the subject as the 17th pad: its own slot in the engine, its own joystick
const GESTE = { 1: 'attacks', 2: 'note changes', 3: 'swells', 4: 'one breath' };
const GENE = { taille: 'size', pavillons: 'bells', sourdine: 'mute', souffle: 'breath', jeu: 'technique', matiere: 'material', perce: 'bore',
  section: 'section', sympathique: 'sympathetic', lieu: 'room', cristal: 'crystal', horloge: 'clockwork', constellation: 'constellation', battement: 'beating', eclosion: 'bloom', canon: 'canon', hoquet: 'hocket', chant: 'overtone', miroir: 'mirror',
  crible: 'sieve', etirement: 'stretch', vie: 'life', corps: 'body', retro: 'retrograde', aksak: 'aksak', spirale: 'spiral', rotation: 'rotation',
  stase: 'stasis', inversee: 'inverted', espace: 'space', inflexion: 'inflexion', contour: 'contour', marche: 'sequence', troue: 'holed theme',
  accumulation: 'accumulation', stimmtausch: 'voice exchange', micropoly: 'micropolyphony', multidirige: 'multi-directed',
  lampe: 'lamp', prisme: 'prism', fusion: 'fusion', canonvoix: 'voice canon', parallelisme: 'parallelism', partielfixe: 'fixed partial',
  avenement: 'advent', budget: 'speaking budget', arche: 'inverted arch', franchissement: 'threshold', permutation: 'spectral permutation',
  interpolation: 'A→B interpolation', contrametricite: 'contrametricity', silence: 'silence', refrain: 'refrain window', regime: 'register regime',
  bascule: 'register switch', echo: 'echo', pedale: 'pedal', dilate: 'contract-dilate', chalouper: 'sway', groove: 'groove contamination',
  couches: 'misaligned layers', derive: 'oriented drift', detache: 'détaché', isoperiode: 'isoperiodicity', additif: 'additive',
  preaudible: 'pre-audibility', regroupe: 'regrouping', retard: 'suspension', respiration: 'breathing', regrid: 'regrid',
  alteration: 'alteration', broderie: 'neighbour notes', corruption: 'corruption', densifier: 'passing notes', developpement: 'development',
  emprunt: 'modal borrowing', modulation: 'modulation', isorythmie: 'isorhythm', pivot: 'pivot note', reponse: 'response',
  retrograde: 'melodic retrograde', queue: 'changing tail', variation: 'developing variation', voisinage: 'contour neighbourhood',
  ouvertclos: 'open & closed endings', reptonale: 'tonal answer', formeenonce: 'statement form', fin: 'ending', dilatation: 'form by dilation',
  saturee: 'saturated bar', progression: 'progression', tutti: 'tutti strike', halo: 'spectral halo', accordage: 'tuning to the bass',
  deviation: 'deviation', vecteur: 'variation vector', contrepoint: 'counterpoint', heterophonie: 'heterophony' };
const gname = g => GENE[g] || g;
// (V6.4) a gene's dose as shown: at 0 % the gene is off (the mummer is born without it)
const doseTxt = v => (Math.round(v * 100) <= 0 ? 'off' : Math.round(v * 100) + ' %');
// (1.0.1) the master's tonic: its MIDI note and the pitch name the analysis uses for the fundamental (middle C = C4)
const tonicTxt = n => `note ${n} (${noteName(n + 12)})`;
function noteName (n) { return ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][((n % 12) + 12) % 12] + (Math.floor(n / 12) - 2); }
// 24-bit packed stereo: two frames (a b, c d) in three 32-bit words — the dynamic range of a 24-bit session
//   w0 = a<<8 | b>>16 & 0xff      w1 = (b & 0xffff)<<16 | c>>8 & 0xffff      w2 = (c & 0xff)<<24 | d & 0xffffff
const words24 = n => 3 * Math.ceil(n / 2);
function pack24 (L, R, n, scale) {
  const out = new Int32Array(words24(n)), q = v => { const x = Math.round(v * scale); return x > FULL24 ? FULL24 : x < -FULL24 - 1 ? -FULL24 - 1 : x; };
  for (let i = 0, w = 0; i < n; i += 2, w += 3) {
    const a = q(L[i]), b = q(R[i]), c = i + 1 < n ? q(L[i + 1]) : 0, d = i + 1 < n ? q(R[i + 1]) : 0;
    out[w] = (a << 8) | ((b >> 16) & 0xff); out[w + 1] = ((b & 0xffff) << 16) | ((c >> 8) & 0xffff); out[w + 2] = ((c & 0xff) << 24) | (d & 0xffffff);
  }
  return out;
}
// fingerprint of a subject's content: two independent FNV-1a hashes over every word (64 bits) and the length
function fingerprint (W, n) {
  let a = 2166136261 >>> 0, b = 0x811c9dc5 ^ 0x5bd1e995;
  for (let i = 0; i < W.length; ++i) { const w = W[i] | 0; a ^= w; a = Math.imul(a, 16777619) >>> 0; b ^= (w >>> 13) | (w << 19); b = Math.imul(b, 0x01000193) >>> 0; }
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0') + ':' + n;
}
// (V6.5) the sample rate written in a WAV / RF64, AIFF / AIFC or FLAC header (null for other formats)
function nativeRate (ab) {
  try {
    const v = new DataView(ab), n = ab.byteLength, s = (o, k) => String.fromCharCode(...new Uint8Array(ab, o, k));
    if (n < 26) return null;
    const id = s(0, 4);
    if ((id === 'RIFF' || id === 'RF64') && s(8, 4) === 'WAVE') { for (let p = 12; p + 16 <= n;) { const c = s(p, 4), sz = v.getUint32(p + 4, true); if (c === 'fmt ') return v.getUint32(p + 12, true); p += 8 + sz + (sz & 1); } return null; }
    if (id === 'FORM' && (s(8, 4) === 'AIFF' || s(8, 4) === 'AIFC')) {
      for (let p = 12; p + 26 <= n;) { const c = s(p, 4), sz = v.getUint32(p + 4, false);
        if (c === 'COMM') { const e = (v.getUint16(p + 16, false) & 0x7fff) - 16383 - 31; return Math.round(v.getUint32(p + 18, false) * Math.pow(2, e) + v.getUint32(p + 22, false) * Math.pow(2, e - 32)); }
        p += 8 + sz + (sz & 1); }
      return null;
    }
    if (id === 'fLaC') { const b = new Uint8Array(ab, 18, 3); return (b[0] << 12) | (b[1] << 4) | (b[2] >> 4); }
  } catch (e) { /* unknown */ }
  return null;
}
function unpack24 (W, n) {
  const L = new Float32Array(n), R = new Float32Array(n), s = 1 / FULL24;
  for (let i = 0, t = 0; i < n; i += 2, t += 3) {
    const w0 = W[t], w1 = W[t + 1], w2 = W[t + 2];
    L[i] = (w0 >> 8) * s; R[i] = ((((w0 & 0xff) << 24) | (((w1 >> 16) & 0xffff) << 8)) >> 8) * s;
    if (i + 1 < n) { L[i + 1] = ((((w1 & 0xffff) << 16) | (((w2 >> 24) & 0xff) << 8)) >> 8) * s; R[i + 1] = ((w2 << 8) >> 8) * s; }
  }
  return { L, R };
}
const sleep = t => new Promise(r => setTimeout(r, t));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
// (V6.9) FNV-1a of a string (keys of the hand settings); cents shown with their sign
const hstr = str => { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; ++i) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; };
const fmtC = c => (c > 0.005 ? '+' : c < -0.005 ? '−' : '') + Math.abs(c).toFixed(Math.abs(c) < 100 && Math.abs(c - Math.round(c)) > 0.05 ? 1 : 0) + ' c';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ------------------------------------------------------------------------------------------------ brain (workers)
class Brain {
  constructor (view) {
    this.view = view; this.workers = []; this.parent = null; this.queue = []; this.token = null; this.params = null;
    this.inline = null; this.inlineBusy = false; this.url = null; this.failed = new Map(); this.designKey = null;
  }
  maxWorkers () { const hc = navigator.hardwareConcurrency || 4; return clamp(hc - 2, 1, 6); }
  blobUrl () { if (!this.url) this.url = URL.createObjectURL(new Blob([BRAIN_CODE], { type: 'text/javascript' })); return this.url; }
  stop () {
    this.workers.forEach(w => w.worker.terminate()); this.workers = [];
    this.queue = []; this.token = null; this.parent = null; this.designKey = null;
    this.facts = null; this.inlineReady = false; this.inlineBusy = false;
  }
  destroy () { this.stop(); if (this.url) URL.revokeObjectURL(this.url); this.url = null; }
  // test at opening: does a worker start and answer? (diagnostics; if not, births run on the main thread)
  selfTest () {
    return new Promise(res => {
      let w; const t0 = performance.now();
      try { w = new Worker(this.blobUrl()); } catch (e) { res('refused: ' + e.message); return; }
      let to = null;
      const done = r => { clearTimeout(to); w.terminate(); res(r); };
      to = setTimeout(() => done('silent'), 8000);
      w.onmessage = () => done('ok ' + Math.round(performance.now() - t0) + ' ms');
      w.onerror = e => { if (e.preventDefault) e.preventDefault(); done('error: ' + (e.message || '?')); };
      w.postMessage({ type: 'ping', id: -1 });
    });
  }
  // new subject: one worker analyses it (facts, troupe); others are spawned on demand
  setParent (id, L, R, tune = null) {
    this.stop(); this.parent = { id, L, R }; this.failed.clear(); this.tune = tune; this.tuneJs = JSON.stringify(tune); this.seq = (this.seq || 0) + 1;
    if (!this.inline) this.spawn();
    else this.inlineRun({ type: 'parent', id, L, R, sr: FS, tune, seq: this.seq });
  }
  // (V6.9) what Mat sets by hand on the subject (tempo, scale, the MTS-ESP master's notes): every worker takes it after the
  // birth it may be giving (messages are taken in order); the troupe's design is asked again
  retune (tune) {
    const js = JSON.stringify(tune); if (!this.parent || js === this.tuneJs) return false;
    this.tune = tune; this.tuneJs = js; this.seq = (this.seq || 0) + 1; this.designKey = null;
    const m = { type: 'tune', id: this.parent.id, tune, seq: this.seq };
    if (this.inline) this.inlineRun(m); else for (const w of this.workers) w.worker.postMessage(m);
    return true;
  }
  spawn () {
    let worker;
    try { worker = new Worker(this.blobUrl()); } catch (e) { this.goInline('no Worker: ' + e.message); return null; }
    const w = { worker, ready: false, job: null }, first = this.workers.length === 0;
    worker.onmessage = e => this.onMsg(w, e.data);
    worker.onerror = e => { if (e.preventDefault) e.preventDefault(); this.onFail(w, e.message || 'error'); };
    this.workers.push(w);
    const P = this.parent;
    worker.postMessage({ type: 'parent', id: P.id, L: P.L, R: P.R, sr: FS, tune: this.tune || null, seq: this.seq || 0 });
    if (first && this.designKey) worker.postMessage({ type: 'design', id: P.id, miroir: this.designKey[0], accord: this.designKey[1], gen: this.designKey[2] });
    return w;
  }
  onFail (w, msg) {
    const i = this.workers.indexOf(w); if (i < 0) return;
    w.worker.terminate(); this.workers.splice(i, 1);
    if (!w.ready && !this.workers.some(x => x.ready)) { this.goInline(msg); return; }
    if (w.job) { const n = (this.failed.get(w.job.k) || 0) + 1; this.failed.set(w.job.k, n); if (n < 2) this.queue.unshift(w.job); else this.view.birthFailed(w.job.k, msg); }
    this.pump();
  }
  goInline (why) {
    this.workers.forEach(w => w.worker.terminate()); this.workers = [];
    try { this.inline = new Function('self', 'window', BRAIN_CODE + '\nreturn CharivariBrain;')(undefined, window); }
    catch (e) { this.view.say('brain unavailable: ' + e.message); return; }
    this.view.say('births on the main thread (' + why + '): the interface freezes during each birth');
    const P = this.parent; if (!P) return;
    this.inlineRun({ type: 'parent', id: P.id, L: P.L, R: P.R, sr: FS, tune: this.tune || null, seq: this.seq || 0 });
    if (this.designKey) this.inlineRun({ type: 'design', id: P.id, miroir: this.designKey[0], accord: this.designKey[1], gen: this.designKey[2] });
    this.pump();
  }
  inlineRun (m) {
    const run = () => {
      let r;
      try { r = this.inline.handle(m); } catch (e) { r = { type: 'error', id: m.id, k: m.k, token: m.token, message: e.message }; }
      this.onMsg(null, r);
    };
    setTimeout(run, 0);
  }
  // (V6.5) a file at another rate: converted by the brain's resampler, in a worker of its own (on the main thread if workers
  // are refused)
  resample (L, R, srIn, srOut) {
    return new Promise((res, rej) => {
      const m = { type: 'resample', id: -2, L, R, srIn, srOut };
      const inline = () => { try { const B = this.inline || new Function('self', 'window', BRAIN_CODE + '\nreturn CharivariBrain;')(undefined, window); const r = B.handle(m); res({ L: r.L, R: r.R }); } catch (e) { rej(e); } };
      let w; try { w = new Worker(this.blobUrl()); } catch (e) { setTimeout(inline, 0); return; }
      w.onmessage = e => { w.terminate(); const r = e.data; if (r && r.type === 'resampled') res({ L: r.L, R: r.R }); else rej(new Error(r && r.message || 'resampler')); };
      w.onerror = e => { if (e.preventDefault) e.preventDefault(); w.terminate(); setTimeout(inline, 0); };
      w.postMessage(m, [L.buffer, R.buffer]);
    });
  }
  design (miroir, accord, gen = 0) {
    if (!this.parent) return;
    const key = [miroir, accord, gen];
    if (this.designKey && this.designKey[0] === miroir && this.designKey[1] === accord && this.designKey[2] === gen) return;
    this.designKey = key;
    const m = { type: 'design', id: this.parent.id, miroir, accord, gen };
    if (this.inline) { this.inlineRun(m); return; }
    const w = this.workers[0] || this.spawn(); if (w) w.worker.postMessage(m);
  }
  // wanted births: token (troupe signature), list of missing mummers
  births (token, params, ks) {
    if (!this.parent) return;
    if (token !== this.token) {
      this.token = token; this.params = params; this.failed.clear();
      this.queue = ks.map(k => ({ k, token }));
      // workers busy with an outdated troupe are replaced (a birth can take 20 s)
      for (const w of this.workers.slice()) if (w.job && w.job.token !== token) {
        w.worker.terminate(); this.workers.splice(this.workers.indexOf(w), 1);
      }
      if (!this.inline && !this.workers.length) this.spawn();
    } else {
      this.params = params;
      for (const k of ks) if (!this.queue.some(j => j.k === k) && !this.workers.some(w => w.job && w.job.k === k) && !(this.inlineBusy && this.inlineBusy.k === k)) this.queue.push({ k, token });
    }
    // the selected pad first, then the subject's own slot (V6.3: prepared in under a second, it makes the subject playable with
    // its poles at once), then the mummers in order
    const sel = this.view.sel, rank = k => (k === sel ? -2 : k === 16 ? -1 : k); this.queue.sort((a, b) => rank(a.k) - rank(b.k));
    this.pump();
  }
  busyCount () { return this.inline ? (this.inlineBusy ? 1 : 0) : this.workers.filter(w => w.job).length; }
  busyKs () { return this.inline ? (this.inlineBusy ? [this.inlineBusy.k] : []) : this.workers.filter(w => w.job).map(w => w.job.k); }
  busyJobs () { return this.inline ? (this.inlineBusy ? [this.inlineBusy] : []) : this.workers.filter(w => w.job).map(w => w.job); }
  pump () {
    if (!this.parent) return;
    const P = this.parent;
    if (this.inline) {
      if (this.inlineBusy || !this.queue.length || !this.inlineReady) return;
      const j = this.queue.shift(); this.inlineBusy = j; j.t0 = performance.now();
      this.inlineRun({ type: 'birth', id: P.id, k: j.k, miroir: this.params.miroir, accord: this.params.accord, gen: this.params.gen || 0, remut: (this.params.remut || [])[j.k] || 0, doses: (this.params.doses || [])[j.k] || null, cents: (this.params.cents || [])[j.k] ?? null, token: j.token });
      return;
    }
    for (const w of this.workers) {
      if (!this.queue.length) break;
      if (!w.ready || w.job) continue;
      const j = this.queue.shift(); w.job = j; j.t0 = performance.now();
      w.worker.postMessage({ type: 'birth', id: P.id, k: j.k, miroir: this.params.miroir, accord: this.params.accord, gen: this.params.gen || 0, remut: (this.params.remut || [])[j.k] || 0, doses: (this.params.doses || [])[j.k] || null, cents: (this.params.cents || [])[j.k] ?? null, token: j.token });
    }
    const idle = this.workers.filter(w => !w.job).length;
    let want = Math.min(this.maxWorkers(), this.workers.length + Math.max(0, this.queue.length - idle));
    while (this.workers.length < want) { if (!this.spawn()) break; }
  }
  onMsg (w, m) {
    if (!m || !this.parent || m.id !== this.parent.id) { if (w) { w.job = null; } return; }
    if (m.type === 'ready') {
      if (w) w.ready = true; else this.inlineReady = true;
      // (V6.9) the facts of the latest hand settings (a worker that analysed before them answers again after them)
      if (!this.facts || this.facts.id !== m.id || (m.seq === this.seq && this.facts.seq !== this.seq)) { this.facts = { id: m.id, seq: m.seq, ...m.facts }; this.view.onFacts(this.facts); }
      this.pump(); return;
    }
    if (m.type === 'population') { this.view.onPopulation(m); return; }
    // a failed troupe design (an error without a mummer number) does not free a worker that may still be giving birth
    if (m.type === 'error' && m.k === undefined) { this.view.say('troupe design failed: ' + (m.message || '?')); return; }
    if (m.type === 'child' || m.type === 'error') {
      if (w) w.job = null; else this.inlineBusy = false;
      if (m.type === 'child') { if (m.token === this.token) this.view.onChild(m); }
      else if (m.k !== undefined && m.token === this.token) {
        const n = (this.failed.get(m.k) || 0) + 1; this.failed.set(m.k, n);
        this.view.birthFailed(m.k, m.message);
      }
      this.pump();
    }
  }
}

// ------------------------------------------------------------------------------------------------ sending to the DSP
// one stream at a time: header, then packets of 2046 words (24-bit audio, then anatomy); the DSP acknowledges
// (rxAck = first missing packet + 1024 × last received + 1)
class Sender {
  constructor (view) { this.view = view; this.q = []; this.cur = null; this.ack = 0; this.running = false; this.stats = []; this.serial = 0; }
  clear () { this.q = []; if (this.cur) this.cur.cancel = true; }
  push (job) { this.q = this.q.filter(j => j.kind !== 'stream' || j.target !== job.target); this.q.push(job); this.run(); }
  reset () { this.q = []; if (this.cur) this.cur.cancel = true; this.q.push({ kind: 'reset' }); this.run(); }
  pending (target) { return (this.cur && !this.cur.cancel && this.cur.target === target ? this.cur : null) || this.q.find(j => j.kind === 'stream' && j.target === target) || null; }
  async run () {
    if (this.running) return; this.running = true;
    try {
      while (this.q.length) {
        const job = this.q.shift(); this.cur = job;
        if (job.kind === 'reset') { this.view.pc.sendEventOrValue('popReset', [0, 0, 0, 0]); await sleep(30); }
        else await this.stream(job);
        this.cur = null;
      }
    } finally { this.running = false; this.cur = null; }
  }
  async stream (job) {
    const pc = this.view.pc, P = 2046, frames = job.pcm.length, chunks = Math.ceil(frames / P);
    if (job.target >= 0 && this.view.readyOf(job.target)) { pc.sendEventOrValue('popReset', [1, job.target, 0, 0]); await sleep(30); }
    if (job.cancel) return;
    // every stream has a serial (0..15) echoed in each ack: a late ack from the previous stream can no longer end this one
    // (seen in the test bench: a stale final ack made a mummer's transfer finish before it started)
    this.serial = (this.serial + 1) & 15; let serial = this.serial;
    this.ack = serial << 20; job.sent = 0; job.chunks = chunks; const t0 = performance.now();
    // [target + 64 × serial, words, peak, hold point, loop frames, signature, anatomy frames, audio frames]
    let hdrT = 0;
    const header = () => { hdrT = performance.now(); this.hdrs = (this.hdrs || 0) + 1; pc.sendEventOrValue('streamHeader', [job.target + 64 * serial, frames, job.peak, job.loopStart || 0, job.loopLen || 0, job.sig, job.anaFrames || 0, job.nFrames || 0]); };
    header();
    const packet = c => { const start = c * P, count = Math.min(P, frames - start), d = new Array(2048).fill(0);
      for (let i = 0; i < count; ++i) d[i] = job.pcm[start + i]; return { start, count, d }; };
    // ack-driven, paced sending (at most 4 packets per pump): the host's queue has an unknown capacity.
    // The DSP's ack gives the first missing packet AND the last received one: a hole shows at once and only the lost
    // packet is sent again (no more block resend after 150 ms — measured in Amorph: 7616 resends, 388 s of audio in
    // 1430 s). Adaptive window: +1 packet per advance, ÷2 on a loss (at most once per round trip).
    const last = new Float64Array(chunks).fill(-1);
    let next = 0, lastA = -1, W = this.W || 8, rtt = this.rtt || 60, lastCut = 0, lastMove = performance.now(), lastHigh = -1, pausedAt = 0, lostSince = 0;
    // (V6.4 — Mat : « avec la trompette le plugin affiche sending mummer 60 % et reste bloqué là ») a stream the engine no
    // longer receives (its reception reset — the engine rebuilt by the host while a transfer ran — or acks that stopped) waited
    // forever: the header went again only while nothing at all had arrived, and the stuck transfer counted as « coming », so
    // nothing asked for it again. Now: the engine says it is not receiving this stream (status: reception off, or another
    // target) 1.5 s after the header, or no ack has moved for 6 s → the stream starts again from its header (new serial),
    // five times at most; then it gives up and the pad is asked for again by the next decision.
    const restart = (why, counted = true) => {
      if (counted) { job.restarts = (job.restarts || 0) + 1; this.restarts = (this.restarts || 0) + 1; } else this.wakes = (this.wakes || 0) + 1; this.lastRestart = `${job.target}:${why}@${Math.round(100 * a0() / Math.max(1, chunks))}%`;
      this.serial = (this.serial + 1) & 15; serial = this.serial; this.ack = serial << 20;
      last.fill(-1); next = 0; lastA = -1; lastHigh = -1; W = 8; lastMove = performance.now(); lostSince = 0; header();
    };
    const a0 = () => { const raw = (this.ack >> 20) === serial ? this.ack : serial << 20; return raw & 1023; };
    const send = c => { pc.sendEventOrValue('streamChunk', packet(c)); last[c] = performance.now(); this.nSent = (this.nSent || 0) + 1; };
    await new Promise(done => {
      let timer = null, finished = false;
      const finish = () => { if (finished) return; finished = true; clearTimeout(timer); this.kick = null; done(); };
      let tp = performance.now(); this.gapMax = 0; this.hdrs = 1;
      const pump = () => {
        if (finished) return;
        { const t = performance.now(); this.gapMax = Math.max(this.gapMax, t - tp); tp = t; }
        if (job.cancel || !this.view.isConnected) return finish();
        // (V6.5) THE ENGINE SILENT. Mat : « la naissance reste bloquée à sending mummer ». Measured in his REAPER (22.10): the
        // engine sent nothing at all — no status, no telemetry, no ack — for 11 minutes, then everything came back the moment
        // REAPER was brought to the front with the interface shown; later, 50 minutes of silence while the interface was hidden
        // behind AMORPH's code view, REAPER in front or not. The transfer took that silence for losses: five restarts, then it
        // gave up and the mummer stayed « sending … 0 % ». Now the silence of the engine (no status for 1.5 s; it sends one every
        // 0.1 s) holds the transfer as it is — no packet sent, nothing counted as lost, no restart counted —; when the engine
        // speaks again the stream starts again from its header (the packets sent into the silence may have been dropped by the
        // host)
        if (this.view.engineAsleep()) {
          const t = performance.now(); if (!job.sleptAt) job.sleptAt = t;
          clearTimeout(timer); timer = setTimeout(pump, 200); return;
        }
        if (job.sleptAt) { const t = performance.now(); job.sleepMs = (job.sleepMs || 0) + t - job.sleptAt; job.sleptAt = 0; restart('engine woke', false); clearTimeout(timer); timer = setTimeout(pump, 30); return; }
        // a pad is being played from the interface: the transfer steps aside so the notes are not queued behind packets
        // ((V6.4) for 3 s at most: a note held longer — or one whose release was lost — no longer stops the transfer; it goes on
        // a packet at a time)
        let slow = false;
        if (this.view.playing()) { const t = performance.now(); if (!pausedAt) pausedAt = t; if (t - pausedAt < 3000) { clearTimeout(timer); timer = setTimeout(pump, 20); return; } slow = true; } else pausedAt = 0;
        const raw = (this.ack >> 20) === serial ? this.ack : serial << 20, a = raw & 1023, high = (raw >> 10) & 1023, now = performance.now(); job.sent = a;
        this.live = { a, high, next, chunks, W, rtt: Math.round(rtt), serial, ackSer: this.ack >> 20 };
        if (a >= chunks) return finish();
        if (a !== lastA || high !== lastHigh) { lastMove = now; lastHigh = high; }
        // (the engine also stops receiving when the last packet is in: « not receiving » must last 0.8 s, the final ack comes first)
        { const st = this.view.st, off = st && now - hdrT > 1500 && (!(st[0] > 0.5) || Math.round(st[2]) !== job.target);
          if (!off) lostSince = 0; else if (!lostSince) lostSince = now;
          const lost = off && now - lostSince > 800;
          if (lost || (!slow && now - lastMove > 6000)) {
            if ((job.restarts || 0) >= 5) { job.failed = true; this.failedStreams = (this.failedStreams || 0) + 1; return finish(); }
            restart(lost ? 'engine not receiving' : 'no ack'); clearTimeout(timer); timer = setTimeout(pump, 30); return;
          } }
        if (a > lastA) { if (lastA >= 0) { W = Math.min(32, W + 1); if (last[a - 1] > 0) rtt = 0.8 * rtt + 0.2 * (now - last[a - 1]); } lastA = a; }
        const rto = Math.max(150, 3 * rtt);
        let budget = slow ? 1 : 4, lost = false;
        // selective resend: the first missing one as soon as a later packet arrived, then any packet silent for rto
        if (high > a && last[a] > 0 && now - last[a] > 1.5 * rtt) { send(a); budget--; lost = true; }
        for (let c = a + 1; c < Math.min(next, chunks) && budget > 0; ++c) if (last[c] > 0 && now - last[c] > rto && c >= high) { send(c); budget--; lost = true; }
        if (last[a] > 0 && now - last[a] > rto && budget > 0) { send(a); budget--; lost = true; }
        if (lost) { job.rewinds = (job.rewinds || 0) + 1; if (now - lastCut > rtt) { W = Math.max(2, W >> 1); lastCut = now; } if (a === 0 && high === 0 && job.rewinds % 4 === 0) header(); }
        while (next < chunks && next < a + W && budget > 0) { send(next); next += 1; budget--; }
        clearTimeout(timer); timer = setTimeout(pump, slow ? 60 : 8);
      };
      this.kick = pump;
      pump();
    });
    this.rtt = rtt;
    this.W = W;
    job.ms = performance.now() - t0 - (job.sleepMs || 0);
    if (!job.cancel && frames > 0) this.stats.push({ sec: (job.nFrames || 0) / FS, ms: job.ms, rewinds: job.rewinds || 0 });
    if (!job.cancel && job.done) job.done(job);
  }
}

// ------------------------------------------------------------------------------------------------ the troupe's memory
// AMORPH keeps only the PARAMETERS of a patch: its stored values (where the subjects used to live) are neither saved in the
// project nor kept when the editor reopens — measured in the host (v5.6): the editor's cold open re-applies the preset and
// rebuilds the engine ("Applying preset: charivari" in compile.log at each reopen), the stored state comes back empty, and the
// host's own state restore refuses anything above 8 MiB anyway. So everything the troupe owns lives in the WebView's
// IndexedDB of REAPER on this computer (persistent, on disk), under the troupe NUMBER, which is a hidden parameter (param43,
// saved with the project and restored by the host after every rebuild):
//   subjects — the subjects' audio (24-bit, as loaded), keyed by a fingerprint of their content (shared by every troupe);
//   troupes  — per troupe number: the eight slots (name, length, fingerprint, ancestry) and the play settings of the 17 pads;
//   kids     — mummers already born (engine version + subject + mockery + tuning + pad): a reopening re-sends, never re-births.
// Six populations of mummers at most (the oldest go); subjects stay as long as a troupe names them.
// (V6.4) the layout of a kept mummer (audio, hold loop, anatomy, lacquer and grain words) as the DSP reads it: changed only
// when the DSP's reading changes
const REC_FORMAT = 'v6.4';
// (V6.5) a brain whose code changed without changing one sample of what it calculates keeps the fingerprint of the calculation
// it repeats: the mummers already born under it are not born again for nothing. The 6.5 brain of 22.10 (an envelope guard
// that JavaScriptCore could not run on one mummer, a faster search of the grains' alignment, the splices' energies slid
// instead of summed again): 80 births on five subjects identical to the bit with the brain of 21.10 (8e9df98d)
// The 6.6 brain of 22.10 (a pulse read on 3 to 5 attacks, tempo2): the same births on every subject whose pulse it does not
// change; those whose pulse it now reads (sparse) carry ':sp' in their keys and their signatures, and only they are born again
// The 6.8 brain of 23.10 chooses the hold elsewhere where it fell in a silence (18 mummers of 204 on twelve subjects,
// loops 6 to 71 % under −40 dB before, 4 % at most after; the others identical to the bit): a new fingerprint — the
// mummers kept play at once and are born again behind them, replaced only where their sound changed (getOlder)
// (V6.9) the 6.9 brain (fb5f15ee) gives the 6.8 brain's (6da52dfa) mummers word for word when nothing is set by hand (measured
// on 6 subjects, 102 mummers free and 34 tuned, every one identical): it keeps their place in the cache — what is set by hand
// (tempo, scale, degree, MTS-ESP) has keys of its own
// (V6.9.2) the genes changed since the 6.8 brain, and their version (the brain's GENE_VERSION): a mummer of the cache that
// carries one of them, written by an earlier version, is born again (measured: 7 of 384 mummers of the test troupes)
const GENE_CHANGED = ['isoperiode'], GENE_VERSION = 2;
// (V6.9.2) the 6.9.2 brain (b6029fe9): the same troupes (384 mummers of the test subjects, same genomes), every mummer the same
// word for word except those that carry the isoperiodicity (7 of 384), which GENE_CHANGED has born again
// (1.0.1) the brain that lays a ZD scale on an MTS-ESP master (babea823): with no scale on the master, the same mummers word
// for word (measured on the 330 Hz vowel: 17 of 17 with nothing set, 17 of 17 on a 12-TET master, Tuning: scale)
const ENGINE_SAME = { 'd5df8a56': '8e9df98d', '151fb289': '8e9df98d', 'fb5f15ee': '6da52dfa', 'b6029fe9': '6da52dfa', 'babea823': '6da52dfa' };
const ENGINE = (() => { let h = 2166136261 >>> 0; for (let i = 0; i < BRAIN_CODE.length; i += 1) { h ^= BRAIN_CODE.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } const x = h.toString(16); return ENGINE_SAME[x] || x; })();
class KidCache {
  constructor () { this.db = null; this.status = 'trying'; this.hits = 0; this.ready = this.open(); this.tidying = this.ready.then(ok => (ok ? this.tidy().then(() => this.budget()) : null)).catch(() => null); }
  open () {
    return new Promise(res => {
      if (!window.indexedDB) { this.status = 'absent'; res(false); return; }
      let req;
      try { req = indexedDB.open('charivari-enfants', 3); } catch (e) { this.status = 'refused: ' + e.message; res(false); return; }
      req.onupgradeneeded = () => { const db = req.result; for (const n of ['kids', 'pops', 'subjects', 'troupes', 'live']) if (!db.objectStoreNames.contains(n)) db.createObjectStore(n); };
      req.onsuccess = () => { this.db = req.result; this.status = 'ok'; res(true); };
      req.onerror = () => { this.status = 'error: ' + (req.error ? req.error.message : '?'); res(false); };
      req.onblocked = () => { this.status = 'blocked'; res(false); };
    });
  }
  // (V6.4) THE MUMMERS OF AN EARLIER VERSION. Mat: « à chaque réouverture les mummers sont recalculés … pourquoi le cache
  // repart de zéro ? ce n'est pas souhaitable ». Every key begins with the fingerprint of the calculation (ENGINE): a new
  // version of the calculation found nothing on the disk and all sixteen were born again before they could be played. Now
  // the same mummer (same subject, Mockery, tuning, troupe, pad, re-mutation and doses) kept by an earlier version is played
  // at once and born again in the background under this version; it is replaced only if its sound has changed. Only records
  // in the engine's current format are taken (REC_FORMAT; the V6.4 records before it carry genes0 and fit the same DSP).
  async getOlder (pk, k) {
    await this.ready; if (!this.db) return null;
    const i = pk.indexOf(':'); if (i < 0) return null;
    const tail = pk.slice(i), base = tail + ':' + k;
    if (!this._keys) this._keys = (await this.tx('kids', 'readonly', st => st.getAllKeys())) || [];
    const found = [];
    for (const key of this._keys) {
      if (typeof key !== 'string' || !key.endsWith(base)) continue;
      const eng = key.slice(0, key.length - base.length); if (!eng || eng === ENGINE || eng.includes(':')) continue;
      const pv = await this.tx('pops', 'readonly', st => st.get(eng + tail)); found.push({ key, t: pv ? pv.t : 0 });
    }
    found.sort((a, b) => b.t - a.t);
    for (const f of found) {
      const r = await this.tx('kids', 'readonly', st => st.get(f.key));
      if (r && r.pcm && r.pcm.length && (r.format === REC_FORMAT || (!r.format && k !== 'subject' && Array.isArray(r.genes0)))) return r;
    }
    return null;
  }
  popKey (h, frames, p) { return `${ENGINE}:${h.toString(16)}:${frames}:${Math.round(p.miroir * 100)}:${p.accord ? 1 : 0}${p.gen ? ':g' + p.gen : ''}${p.sparse ? ':sp' : ''}${p.tv || ''}`; }
  tx (store, mode, fn) {
    return new Promise(res => {
      if (!this.db) { res(null); return; }
      let out = null;
      try {
        const t = this.db.transaction(store, mode), st = t.objectStore(store);
        const r = fn(st); if (r) r.onsuccess = () => { out = r.result; };
        t.oncomplete = () => res(out ?? null); t.onerror = () => res(null); t.onabort = () => res(null);
      } catch (e) { res(null); }
    });
  }
  async get (pk, k) { await this.ready; const r = await this.tx('kids', 'readonly', st => st.get(pk + ':' + k)); if (r) this.touch(pk); return r; }
  async getSubject (h) { await this.ready; return this.tx('subjects', 'readonly', st => st.get(h)); }
  async putSubject (h, rec) { await this.ready; if (!this.db) return false; await this.tx('subjects', 'readwrite', st => st.put(rec, h)); return !!(await this.tx('subjects', 'readonly', st => st.count(h))); }
  async getTroupe (id) { await this.ready; return this.tx('troupes', 'readonly', st => st.get(String(id))); }
  async putTroupe (id, rec) { await this.ready; if (!this.db) return; await this.tx('troupes', 'readwrite', st => st.put(rec, String(id))); }
  async troupeIds () { await this.ready; return (await this.tx('troupes', 'readonly', st => st.getAllKeys())) || []; }
  // (V6.6) SETTINGS RECORDS. Mat: « les snapshots d'AMORPH ne conservent pas les réglages du plugin comme le mode hold ou les
  // panoramiques ; il faut que tous ces réglages soient rappelés par les snapshots ». A snapshot keeps the parameters only
  // (measured: AMORPH's ParameterPresets/<preset>/presets.json holds 128 normalised values per snapshot, nothing else), and the
  // pad settings live in the troupe on this computer. Every state of those settings (the slots with their re-mutations and
  // doses, the play settings of the 17 pads: hold, envelope, pan, gain, lacquer) is now written once under a number
  // ('S' + n in the troupes store, beside the troupes: what names a subject keeps it on the disk), and that number goes to
  // param47 « Settings » — a snapshot keeps it, recalling the snapshot brings the settings back. Numbers: a counter shared by
  // every instance (one transaction), on 20 bits (exact through the host's normalised value), never 0 nor 524 288 (the value
  // the host gives back when it has lost a parameter); the 4 000 most recent kept.
  async newState (rec) {
    await this.ready; if (!this.db) return 0;
    const id = await new Promise(res => {
      try {
        const t = this.db.transaction('troupes', 'readwrite'), st = t.objectStore('troupes'); let n = 0;
        const g = st.get('S#');
        g.onsuccess = () => {
          n = Math.max(1, Math.round((g.result && g.result.next) || 1)); if (n === 524288) n += 1;
          let next = n % 1048575 + 1; if (next === 524288) next += 1;
          st.put({ next }, 'S#'); st.put({ ...rec, state: true, t: Date.now() }, 'S' + n);
        };
        t.oncomplete = () => res(n); t.onerror = () => res(0); t.onabort = () => res(0);
      } catch (e) { res(0); }
    });
    if (id && id % 100 === 0) this.pruneStates(id);
    return id;
  }
  async getState (id) { await this.ready; if (!this.db || !id) return null; return this.tx('troupes', 'readonly', st => st.get('S' + id)); }
  async pruneStates (last) {
    const keys = ((await this.troupeIds()) || []).filter(k => typeof k === 'string' && /^S\d+$/.test(k)), KEEP_N = 4000;
    if (keys.length <= KEEP_N) return;
    const age = k => ((last - Number(k.slice(1))) % 1048575 + 1048575) % 1048575;
    const old = keys.sort((a, b) => age(b) - age(a)).slice(0, keys.length - KEEP_N);
    for (let i = 0; i < old.length; i += 64) { const part = old.slice(i, i + 64); await this.tx('troupes', 'readwrite', st => { for (const k of part) st.delete(k); return null; }); }
  }
  // présence : chaque éditeur ouvert note toutes les 2 s qu'il vit ; une troupe que personne n'a vue depuis 5 s est fermée
  async beat (id, sess) { await this.ready; if (!this.db || !id) return; await this.tx('live', 'readwrite', st => st.put({ seen: Date.now(), sess: sess || '' }, String(id))); }
  async liveOf (id) { await this.ready; if (!this.db || !id) return null; return this.tx('live', 'readonly', st => st.get(String(id))); }
  async lastClosed (maxAgeMs) {
    await this.ready; if (!this.db) return 0;
    const keys = (await this.tx('live', 'readonly', st => st.getAllKeys())) || [], now = Date.now(); let best = 0, bt = 0;
    for (const k of keys) { const r = await this.tx('live', 'readonly', st => st.get(k)); if (!r || Number(k) === 524288) continue; const age = now - r.seen; if (age > 5000 && age < maxAgeMs && r.seen > bt && await this.hasSubjects(k)) { bt = r.seen; best = Number(k); } }
    // the troupe a v5.9 editor may have filed under 524 288: taken back only when it is the only one with subjects
    if (!best && await this.hasSubjects(524288)) best = 524288;
    return best;
  }
  async forkTroupe (from, owner, sess) {
    const t = await this.getTroupe(from), used = new Set((await this.troupeIds()).map(String));
    let id = Date.now() % 1048575 + 1; while (used.has(String(id)) || id === 524288) id = id % 1048575 + 1;
    await this.putTroupe(id, { ...(t || {}), t: Date.now(), from, owner: owner || '' }); await this.beat(id, sess);
    return id;
  }
  // a troupe that names at least one subject (an empty troupe is never taken back)
  async hasSubjects (id) { const t = await this.getTroupe(id); return !!(t && t.slots && Object.values(t.slots).some(m => m && m.hash)); }
  async counts () { await this.ready; const c = {}; for (const n of ['subjects', 'troupes', 'kids']) c[n] = await this.tx(n, 'readonly', st => st.count()); return c; }
  // subjects no troupe names any more are dropped (a cleared slot, a replaced subject) — only when a slot is cleared by
  // hand, never while subjects are being written (a subject not yet named would go: seen in the bench, 2 of 3 lost)
  async collect (protect = []) {
    await this.ready; if (!this.db) return;
    // (V6.6) troupes and settings records read at once (thousands of records, one transaction)
    const keep = new Set(protect), all0 = (await this.tx('troupes', 'readonly', st => st.getAll())) || [];
    for (const t of all0) if (t && t.slots) for (const m of Object.values(t.slots)) if (m && m.hash) keep.add(m.hash);
    const all = (await this.tx('subjects', 'readonly', st => st.getAllKeys())) || [];
    for (const h of all) if (!keep.has(h)) await this.tx('subjects', 'readwrite', st => { st.delete(h); return null; });
  }
  // MEMORY OF THE BORN (v6.1): a budget in bytes instead of six populations, the least recently USED going first, the
  // populations the troupe is wearing never. Measured in AMORPH on 02.10: 96 mummers on the disk (six populations) for
  // 4 subjects and as many Mockery positions — after an engine rebuild 3 mummers came back from the disk and 13 were born
  // again: the population had been pushed out by the others. Budget: half of what the WebView grants (1.5 GB when it does
  // not say), at most 4 GB; a write the storage refuses makes room (oldest first) and is tried again once.
  async budget () {
    if (this._budget) return this._budget;
    let b = 1.5e9;
    try { if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); this.est = e || null; if (e && e.quota > 0) b = Math.min(4e9, 0.5 * e.quota); this.quota = e && e.quota; } } catch (e) { /* no estimate */ }
    return (this._budget = b);
  }
  protect (keys) { this.kept = new Set(keys.filter(Boolean)); }
  async touch (pk) { if (!this.db || (this.touched || (this.touched = new Set())).has(pk)) return; this.touched.add(pk); const v = await this.tx('pops', 'readonly', st => st.get(pk)); if (v) await this.tx('pops', 'readwrite', st => st.put({ ...v, t: Date.now() }, pk)); }
  async evictOne (except) {
    const pops = (await this.tx('pops', 'readonly', st => st.getAllKeys())) || []; let old = null, ot = Infinity;
    for (const key of pops) { if (key === except || (this.kept && this.kept.has(key))) continue; const v = await this.tx('pops', 'readonly', st => st.get(key)); const t = v ? v.t : 0; if (t < ot) { ot = t; old = key; } }
    if (old === null) return false;
    // (V6.4) every mummer the population holds: the re-mutated and hand-dosed ones too (their keys are '3:r1', '3:dxyz'…: only
    // 0 … 15 were deleted, the others stayed on the disk without being counted any more)
    const pv = await this.tx('pops', 'readonly', st => st.get(old)), ks = new Set([...Array.from({ length: 16 }, (_, q) => String(q)), ...Object.keys((pv && pv.kb) || {})]);
    await this.tx('kids', 'readwrite', st => { for (const q of ks) st.delete(old + ':' + q); return null; });
    await this.tx('pops', 'readwrite', st => st.delete(old)); this.evicted = (this.evicted || 0) + 1;
    return true;
  }
  // (V6.4) at opening: the mummers no population counts any more (left by the eviction above before V6.4) are removed
  async tidy () {
    await this.ready; if (!this.db || this.tidied) return; this.tidied = true;
    const pops = (await this.tx('pops', 'readonly', st => st.getAllKeys())) || [], valid = new Set();
    for (const key of pops) { const v = await this.tx('pops', 'readonly', st => st.get(key)); if (v && v.kb) for (const q of Object.keys(v.kb)) valid.add(key + ':' + q); else for (let q = 0; q < 16; ++q) valid.add(key + ':' + q); }
    const all = (await this.tx('kids', 'readonly', st => st.getAllKeys())) || [], orphans = all.filter(x => typeof x === 'string' && !valid.has(x));
    for (let i = 0; i < orphans.length; i += 32) { const part = orphans.slice(i, i + 32); await this.tx('kids', 'readwrite', st => { for (const x of part) st.delete(x); return null; }); }
    this.orphans = orphans.length; this._keys = null;
  }
  async put (pk, k, rec) {
    await this.ready; await this.tidying; if (!this.db) return;
    const bytes = (rec.pcm ? rec.pcm.byteLength : 0) + (rec.anaFrames && rec.anaFrames.byteLength ? rec.anaFrames.byteLength : 0) + 4096;
    const write = () => new Promise(res => {
      try { const t = this.db.transaction('kids', 'readwrite'); t.objectStore('kids').put(rec, pk + ':' + k); t.oncomplete = () => res(true); t.onerror = () => { this.lastErr = (t.error && t.error.name) || 'error'; res(false); }; t.onabort = () => { this.lastErr = (t.error && t.error.name) || 'abort'; res(false); }; } catch (e) { this.lastErr = e.name || 'throw'; res(false); }
    });
    let ok = await write();
    if (!ok && await this.evictOne(pk)) ok = await write();
    if (!ok) { this.refused = (this.refused || 0) + 1; return; }
    this.written = (this.written || 0) + 1;
    const pv = await this.tx('pops', 'readonly', st => st.get(pk)), kb = { ...((pv && pv.kb) || {}) }; kb[k] = bytes;
    await this.tx('pops', 'readwrite', st => st.put({ t: Date.now(), kb }, pk));
    // over budget: the least recently used populations go (never the one being written, never one the troupe wears)
    const budget = await this.budget();
    for (let guard = 0; guard < 64; ++guard) {
      const keys = (await this.tx('pops', 'readonly', st => st.getAllKeys())) || []; let total = 0;
      for (const key of keys) { const v = await this.tx('pops', 'readonly', st => st.get(key)); if (v && v.kb) for (const b of Object.values(v.kb)) total += b; else total += 16 * 3e6; }
      this.bytes = total;
      if (total <= budget || !(await this.evictOne(pk))) break;
    }
  }
}

// (1.0) EACH MUMMER ITS OWN PHOSPHOR (Mat: « que la couleur de chaque sample de chaque mummer soit un peu différente, et que sa
// fenêtre correspondante prenne sa couleur, pour mieux comprendre que la partie de droite correspond à chaque mummer »).
// The subject keeps the cyan of the screens. Sixteen shades in even hue steps of 8.3° (OKLCH) from near that cyan to an
// amber, each keeping the lightness and chroma of the cyan it replaces, dealt so that neighbours differ (Mat chose « dispersé »):
// pad p wears shade 7·p mod 16 — side by side 58° to 74° apart, one above the other 33° to 99°, on a diagonal at least 25°.
// Per row: wave, text, pad label, dim, pad foot, glow, bar root, scrollbar, counter, glass (the window's black, faintly tinted).
const hexA = (h, a) => `rgba(${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)},${a})`;
const PHOS_KEYS = ['m', 't', 'pt', 'd', 'pb', 'g', 'te', 'sc', 'dn', 'gl'];
const PHOS = [
  ['#61e1dd', '#9fe0e0', '#8fdad9', '#5f9091', '#597b7d', '#e8fbfd', '#235a4f', '#3c6c6c', '#7d9d9d', '#011211'],
  ['#abda8e', '#beddb3', '#b4d6a7', '#758e70', '#667a65', '#effbef', '#4a542d', '#54694c', '#8c9c86', '#0a1106'],
  ['#f4c072', '#e9cea2', '#e5c594', '#958361', '#7e725a', '#fdf6e8', '#67482b', '#725f40', '#a2947e', '#150d03'],
  ['#92dfa4', '#b1dfbf', '#a6d9b4', '#6b9079', '#607b6c', '#ebfcf3', '#3f5736', '#4b6b55', '#869d8c', '#061108'],
  ['#e3c86f', '#ded3a2', '#d9cb93', '#8d8762', '#78755b', '#f9f8e8', '#614b26', '#6b6240', '#9d967e', '#120e03'],
  ['#79e2bb', '#a7e0cc', '#99dac3', '#649083', '#5c7b73', '#e9fcf7', '#335940', '#436c5e', '#819e93', '#03120c'],
  ['#cfd076', '#d2d7a6', '#cbd098', '#848a66', '#71775d', '#f5f9ea', '#594f26', '#626643', '#969980', '#0f0f03'],
  ['#66e2d2', '#a1e0d9', '#91dad2', '#60908d', '#597b7a', '#e8fcfb', '#285a4a', '#3d6c67', '#7e9e99', '#02120f'],
  ['#b8d785', '#c4dbae', '#bcd4a1', '#7a8d6c', '#6a7962', '#f1faed', '#50532a', '#596849', '#909b84', '#0c1005'],
  ['#fbbc76', '#edcca4', '#eac396', '#998162', '#80715a', '#fff6e8', '#69462e', '#755e41', '#a5937f', '#160c03'],
  ['#9fdd99', '#b7deb9', '#add8ad', '#708f74', '#637a68', '#edfbf0', '#455631', '#4f6a50', '#899c89', '#081107'],
  ['#ecc46f', '#e4d0a1', '#dfc893', '#918561', '#7b735a', '#fbf7e8', '#644928', '#6f613f', '#a0957e', '#140d03'],
  ['#85e1af', '#ace0c5', '#9fdabb', '#67907e', '#5e7b6f', '#eafcf5', '#39583a', '#466c59', '#839d8f', '#04120a'],
  ['#dacc72', '#d8d5a3', '#d2cd95', '#898863', '#74765c', '#f7f9e9', '#5d4d25', '#676441', '#9a987e', '#110f03'],
  ['#6fe2c6', '#a3e1d3', '#95dbca', '#619088', '#5a7b76', '#e8fcf9', '#2d5a45', '#406c63', '#7f9e96', '#02120e'],
  ['#c4d47d', '#cbd9aa', '#c4d29c', '#7f8b68', '#6d7860', '#f3faeb', '#555127', '#5e6745', '#939a81', '#0d1004']
].map(r => { const o = Object.fromEntries(r.map((c, i) => [PHOS_KEYS[i], c])); o.r = hexA(o.m, 0.3); return o; });
// the subject: the screens as they were
const PHOS_SUBJ = { m: '#5fe0e8', t: '#9fdfe6', pt: '#8fd9e0', d: '#5f8f96', pb: '#597a80', g: '#e8fbff', te: '#1f5a55', sc: '#3c6b70', dn: '#7d9da0', gl: '#05080a', r: 'rgba(255,255,255,.025)' };
const phos = p => (p >= 0 && p < 16 ? PHOS[p] : PHOS_SUBJ);

// ------------------------------------------------------------------------------------------------ view
class CharivariView extends HTMLElement {
  constructor (pc) {
    super(); this.pc = pc; this.attachShadow({ mode: 'open' });
    this.values = {}; this.st = null; this.info = {}; this.tel = null; this.facts = null; this.kids = {}; this.pop = null;
    this.sess = 's' + Math.round(performance.timeOrigin || Date.now()).toString(36) + '.' + Math.round(performance.now() * 1000).toString(36);
    this.sel = 0; this.slot = 1; this.stored = {}; this.pcm = {}; this.hash = {}; this.stateLoaded = false; this.kidPcm = {}; this.ghost = null;
    // the troupe: its number (param43), its slots (name, length, fingerprint) and what is being fetched from the disk
    this.inst = 0; this.instReady = false; this.meta = {}; this.loading = {}; this.missing = {}; this.saveTimer = null; this.dbCounts = null; this.troupePlay = null;
    this.handlers = []; this.edit = new Set(); this.held = new Map(); this.want = null; this.errors = {}; this.pendingGenes = {}; this.geneDrag = null;
    this.brain = new Brain(this); this.sender = new Sender(this); this.recTimer = null; this.gotParams = new Set();
    this.cache = new KidCache(); this.recSeq = 0; this.birthMs = []; this.stale = {}; this.staleHits = 0; this.stateId = 0; this.stateJson = null; this.stateRecallAt = -1e9; this.ownStates = new Set(); this.t0 = performance.now(); this.pArr = {}; this.tal = {}; this.touched = new Set(); this.savedParams = null; this.reasserted = 0;
    this.play = Array.from({ length: 17 }, (_, p) => (p === 16 ? PARENT_PLAY : PLAY_DEF).slice()); this.playTimer = null;
  }

  // ------------------------------------------------------------------ layout
  template () {
    const pads = Array.from({ length: 16 }, (_, p) => `
      <div class="pad" data-pad="${p}" data-help="pad" style="--pt:${phos(p).pt};--pb:${phos(p).pb};--pg:${phos(p).g}"><canvas width="226" height="144"></canvas>
        <div class="pad-top"><span class="pn">${p + 1}</span><span class="cat"></span><span class="d"></span></div>
        <div class="pad-bot"><span class="nt"></span><span class="jd"></span></div></div>`).join('');
    const knob = (k, cls = '') => { const st = KSTYLE[k.id] || 'bakelite'; return `<div class="control ${cls} k-${st}" data-knob="${k.id}" data-help="${k.id}"><div class="label">${k.label}</div>
      <div class="knob-stack">${scaleSVG(st, k.local ? '#f2ede2' : '#22211e')}<div class="knob-body"><div class="knob" ${k.local ? 'data-local' : 'data-param'}="${k.id}">${CAP[st]()}</div></div><div class="lit"></div></div>
      <div class="val">--</div></div>`; };
    const sw = s => `<div class="sw" data-sw="${s.id}" data-help="${s.id}"><span class="sw-l">${s.label}</span><div class="sw-pill"><span data-v="0">${s.off}</span><i class="tog"><u><b></b></u></i><span data-v="1">${s.on}</span></div></div>`;
    const slots = Array.from({ length: 8 }, (_, i) => `<button class="slot" data-slot="${i + 1}" data-help="slot"><b>${i + 1}</b><span>—</span></button>`).join('');
    return `<style>${this.css()}</style>
<div class="panel">
  <div class="screw s-tl" style="--a:34deg"></div><div class="screw s-tr" style="--a:-62deg"></div><div class="screw s-bl" style="--a:78deg"></div><div class="screw s-br" style="--a:8deg"></div>
  <div class="head"><div><div class="brand" data-help="brand">Charivari</div><div class="brand-sub">rough music · one sound · sixteen mutant mummers · v1.0.1</div></div>
    <div class="status-bezel" data-help="status"><div class="status-screen"><div class="st-line" data-st>waiting for the engine</div><div class="st-bar"><div data-bar></div></div></div></div></div>
  <div class="divider"></div>
  <div class="main">
    <div class="col-left">
      <div class="section-label">Subject</div>
      <div class="slots">${slots}</div>
      <div class="parent-row"><button class="btn" data-pick data-help="pick">load a file…</button><button class="btn" data-audition data-help="audition">listen</button><button class="btn ghost" data-clear data-help="clear">clear</button>
        <input type="file" data-file accept="audio/*,.wav,.aif,.aiff,.flac,.mp3,.ogg" hidden></div>
      <div class="screen parent-screen" data-subjpad data-help="pwave"><canvas data-pwave width="600" height="382"></canvas><canvas class="phead" data-phead width="600" height="382"></canvas></div>
      <!-- (V6.9) what can be set by hand on the subject: keys of their own (Mat: « le tempo et les scales sont difficilement
           cliquables et repérables, il faut quelque chose de plus clair pour l'œil et la souris ») -->
      <div class="hand-rows">
        <div class="hrow"><button class="btn hk" data-bpmkey data-help="bpm"><span class="hl">Tempo</span><b data-bpmval>—</b><i>✎</i></button><button class="btn hk back" data-bpmback2 data-help="bpm" style="display:none">↺ <span data-bpmana></span></button></div>
        <div class="hrow"><button class="btn hk" data-scalekey data-help="scalepick"><span class="hl">Scale</span><b data-scaleval>—</b><i>▾</i></button><button class="btn hk back" data-scaleback data-help="scalepick" style="display:none">↺</button></div>
      </div>
      <div class="screen facts" data-facts data-help="facts">—</div>
    </div>
    <div class="col-mid">
      <div class="section-label">Troupe <span class="hint">from the likeness (pad 1) to the contrary (pad 16)</span></div>
      <div class="grid">${pads}</div>
      <div class="screen axes" data-help="axes"><canvas data-axes width="940" height="140"></canvas></div>
      <div class="frieze-box" data-help="frieze"><div class="frieze" aria-hidden="true"></div></div>
    </div>
    <div class="col-right">
      <div class="section-label sel-head" data-selhead><span><span data-selkind>Mummer</span> <span data-selname>—</span></span><span class="sel-keys"><button class="btn outk" data-outk data-help="out"><span>out</span><b data-outv>1/2</b><i>▾</i></button><button class="btn remut" data-remut data-help="remut">re-mutate</button></span></div>
      <div class="joy-wrap"><div class="pole n" data-help="poleN">GESTURE</div><div class="pole e" data-help="poleE">BODY</div><div class="pole s" data-help="poleS">MASK</div><div class="pole w" data-help="poleW">FLESH</div>
        <canvas class="joy" data-joy data-help="joy" width="440" height="440"></canvas></div>
      <div class="play-block"><div class="play-top lacq-row" data-playtop>${sw(PLAYSW)}<div class="lacq-box" data-help="lacq"><button class="btn lacq" data-lacq data-help="lacq">lacquer</button>${knob(LACQK, 'small')}</div></div><div class="adsr">${PLAYK.map(k => knob(k, 'small')).join('')}</div></div>
      <div class="screen organs" data-organs data-help="organs"></div>
    </div>
  </div>
  <div class="hydro-row"><i class="bscrew l" style="--a:-24deg"></i><i class="bscrew r" style="--a:51deg"></i>
    <!-- (V6.9) by family, Mat: the audible macros (Mockery, Shadow, the Troupe pad, the Lacquer) | the playing (Voicing, Choke,
         Base note) | the tuning (free / scale, analysis / MTS-ESP) | Volume -->
    <div class="plaque">${knob(KNOBS[0])}</div>${knob(KNOBS[1])}
    <div class="control" data-help="pop"><div class="label">Troupe</div><canvas class="popjoy" data-pop width="180" height="180"></canvas><div class="val" data-popval>centre</div></div>
    ${knob(SMALL[1], 'small')}
    <div class="vdivider"></div>
    <div class="switches">${sw(SW_VOICE)}<div class="sw mom" data-allmode data-help="allmode"><span class="sw-l">All 16</span><div class="sw-pill"><span data-v="0">one-shot</span><i class="tog"><u><b></b></u></i><span data-v="1">hold</span></div></div></div>${knob(SMALL[0], 'small')}${knob(KNOBS[3])}
    <div class="vdivider"></div>
    <div class="switches tune">${sw(SW_TUNE)}${sw(SW_SRC)}<div class="mts-name" data-mtsname data-help="param48">—</div></div>
    <div class="vdivider"></div>
    ${knob(KNOBS[2])}
    <div class="vdivider"></div>
    <div class="loupe-bezel" data-help="loupe"><div class="loupe-screen" data-loupe>
      <div class="loupe-idle"><div class="loupe-brand">CHARIVARI</div><div class="loupe-dots"><div class="loupe-dot"></div><div class="loupe-dot"></div><div class="loupe-dot"></div></div><div class="scanline"></div></div>
      <div class="loupe-active"><div data-lname>—</div><div data-lval>—</div><div class="loupe-bar"><div data-lbar></div></div></div></div></div>
  </div>
  <div class="footer" data-log>pad 1 = base note · the subject = base note − 1 · play and envelope: selected mummer · double-click: back to centre · rest the mouse 1 s for help</div>
  <div class="bubble" data-bubble></div>
</div>`;
  }

  // V6 — a worn instrument under a lamp from the upper left: stoved warm-grey enamel with a fine grain and a soft orange peel,
  // chipped to the metal along the edges, rubbed and scratched; a brushed aluminium plate below (oxidised blotches, pits,
  // scratches across the grain, polished by the hands around Mockery); knobs after a 1970s field recorder; a charivari
  // engraved in the paint under the troupe, the mummers' legs hidden behind the plate. Every pattern is fixed: same panel
  // every time.
  css () {
    return `
:host{display:block;width:100%;height:100%;background:#14120f;font-family:'Helvetica Neue',Helvetica,sans-serif;user-select:none;-webkit-user-select:none;
  --ink:#f3efe6;--ink2:#e8e2d6;--hint:#d6cfc1;--emb:0 1px 0 rgba(0,0,0,.34),0 -1px 0 rgba(255,255,255,.06);--acc:#a51f33;--acc-soft:#d9687a;--glow:#e8fbff;--cyan:#5fe0e8;--screen:#05080a;--teal:#1f5a55;
  --alu-ink:#1e1d1a;--alu-emb:0 1px 0 rgba(255,255,255,.55);--chrome:conic-gradient(from 0deg,#eeece6,#9b988f 12%,#f7f6f2 25%,#8f8c84 38%,#e6e4dd 50%,#97948c 62%,#f4f2ee 75%,#8e8b83 88%,#eeece6);}
*{box-sizing:border-box;outline:none;-webkit-tap-highlight-color:transparent;}
.panel{position:relative;width:1100px;height:740px;margin:0 auto;border-radius:7px;padding:10px 22px 9px;
  background-color:#8a857b;
  background-image:${SKIN.wear},${SKIN.grain},${SKIN.peel},${SKIN.cloud},
    radial-gradient(ellipse 62% 58% at 47% 33%,rgba(255,251,242,.13),rgba(255,251,242,0) 72%),
    radial-gradient(ellipse 32% 45% at 0% 0%,rgba(34,28,20,.24),rgba(34,28,20,0) 72%),radial-gradient(ellipse 32% 45% at 100% 0%,rgba(34,28,20,.2),rgba(34,28,20,0) 72%),
    radial-gradient(ellipse 32% 45% at 0% 100%,rgba(34,28,20,.28),rgba(34,28,20,0) 72%),radial-gradient(ellipse 32% 45% at 100% 100%,rgba(34,28,20,.28),rgba(34,28,20,0) 72%),
    linear-gradient(180deg,#968f84 0%,#8a857b 48%,#7c776e 100%);
  background-size:1100px 740px,128px 128px,256px 256px,1100px 740px,100% 100%,100% 100%,100% 100%,100% 100%,100% 100%,100% 100%;
  box-shadow:0 30px 80px rgba(0,0,0,.8),0 2px 6px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.42),inset 1px 0 0 rgba(255,255,255,.16),inset -1px 0 0 rgba(0,0,0,.28),inset 0 -2px 2px rgba(0,0,0,.35);
  display:flex;flex-direction:column;}
/* slotted screws, countersunk in the paint, each turned its own way */
.screw{position:absolute;width:15px;height:15px;border-radius:50%;z-index:20;background:radial-gradient(circle at 36% 30%,#fbfaf4 0,#d2d0c8 20%,#929089 56%,#57554f 100%);
  box-shadow:0 0 0 1.6px rgba(30,26,20,.28),0 1px 0 1.6px rgba(255,255,255,.18),1px 2px 2px rgba(0,0,0,.5),inset -1px -1.5px 2px rgba(0,0,0,.35);}
.screw::before{content:'';position:absolute;left:1.6px;right:1.6px;top:50%;height:2.5px;margin-top:-1.25px;border-radius:1px;transform:rotate(var(--a,30deg));
  background:linear-gradient(180deg,#151412 0,#3b3934 62%,#d2cfc6 100%);}
.s-tl{top:8px;left:8px}.s-tr{top:8px;right:8px}.s-bl{bottom:8px;left:8px}.s-br{bottom:8px;right:8px}
.head{display:flex;justify-content:space-between;align-items:center;padding:0 16px;}
/* name plate: brushed aluminium, black engraved letters, a printed frame */
.brand{position:relative;display:inline-block;color:#1c1b18;font:700 18px 'Helvetica Neue',Helvetica,sans-serif;letter-spacing:5.5px;text-transform:uppercase;line-height:1;padding:7px 13px 6px 15px;border-radius:2px;
  background:${SKIN.plate},linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.26) 28%,rgba(0,0,0,.06) 55%,rgba(255,255,255,.2) 82%,rgba(0,0,0,.04) 100%),linear-gradient(180deg,#d2cfc7,#aeaba3);
  background-size:400px 60px,100% 100%,100% 100%;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.8),inset 0 -1px 0 rgba(0,0,0,.3),0 0 0 1px rgba(40,36,30,.55),1px 2px 3px rgba(0,0,0,.45);text-shadow:0 1px 0 rgba(255,255,255,.6);}
.brand::after{content:'';position:absolute;inset:3px;border:1px solid rgba(28,27,24,.7);border-radius:1px;pointer-events:none;}
.brand-sub{color:var(--ink2);font-size:9px;font-weight:500;letter-spacing:4.2px;text-transform:uppercase;margin-top:7px;text-shadow:var(--emb);}
.divider{margin:6px 0 8px;height:1px;background:rgba(32,27,20,.5);box-shadow:0 1px 0 rgba(255,250,240,.26);}
.status-bezel{width:470px;height:44px;border-radius:5px;padding:3px;background:linear-gradient(180deg,#3d3b36,#1a1916);border:1px solid #0d0c0a;
  box-shadow:0 1px 0 rgba(255,255,255,.32),1px 3px 6px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.14);}
.status-screen{position:relative;height:100%;border-radius:3px;background:radial-gradient(ellipse at 30% 20%,#0b1a1c 0%,#040809 90%);padding:5px 9px;display:flex;flex-direction:column;justify-content:center;gap:5px;box-shadow:inset 0 2px 6px rgba(0,0,0,.9);}
.status-screen::after,.pad::after,.parent-screen::after{content:'';position:absolute;inset:0;border-radius:inherit;background:linear-gradient(162deg,rgba(255,255,255,.075) 0%,rgba(255,255,255,0) 36%);pointer-events:none;}
.st-line{font:bold 10px 'Courier New',monospace;color:var(--glow);letter-spacing:.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 0 5px rgba(95,224,232,.3);}
.st-bar{height:3px;background:rgba(255,255,255,.1);border-radius:2px;overflow:hidden;}
.st-bar div{height:100%;width:0;background:linear-gradient(90deg,var(--teal),var(--cyan));transition:width .1s linear;}
.main{display:flex;gap:16px;flex:1;min-height:0;}
.section-label{font-size:9.5px;color:var(--ink);text-transform:uppercase;font-weight:600;letter-spacing:2.6px;margin:0 0 5px;text-shadow:var(--emb);white-space:nowrap;overflow:hidden;}
.section-label .hint{font-weight:400;letter-spacing:.6px;text-transform:none;color:var(--hint);margin-left:6px;}
.section-label [data-selname]{color:#ffd1d8;}
.col-left{width:300px;display:flex;flex-direction:column;min-height:0;}
.col-mid{position:relative;width:470px;display:flex;flex-direction:column;}
.col-right{flex:1;display:flex;flex-direction:column;min-width:0;min-height:0;}
/* black bakelite keys */
.slots{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-bottom:5px;}
.slot,.btn{border-radius:3px;border:1px solid #0a0a09;background:linear-gradient(180deg,#363431 0%,#1f1e1c 46%,#141312 100%);cursor:pointer;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.15),inset 1px 0 0 rgba(255,255,255,.05),inset 0 -1px 0 rgba(0,0,0,.6),0 1px 0 rgba(255,255,255,.22),1px 2px 2px rgba(0,0,0,.42),2px 6px 10px rgba(0,0,0,.27);}
.slot{height:30px;color:#bdb8ae;font:600 8.5px 'Helvetica Neue';display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;padding:0 3px;}
.slot b{font:bold 9px 'Courier New',monospace;color:#e2ddd2;}
.slot span{max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.slot.on{border-color:var(--acc);box-shadow:0 0 0 1px var(--acc),0 0 8px rgba(184,35,58,.45),inset 0 1px 0 rgba(255,255,255,.15);color:#fff;}
.slot.empty span{opacity:.45;}
.slot.drop{border-color:#5fe0e8;box-shadow:0 0 0 1px rgba(95,224,232,.55),0 1px 0 rgba(235,240,225,.3);}
.slot.drop.over{background:linear-gradient(#35504f,#16201f);box-shadow:0 0 0 1px #5fe0e8,0 0 10px rgba(95,224,232,.6);}
.slot:active,.btn:active{background:linear-gradient(180deg,#191817,#252321);box-shadow:inset 0 2px 3px rgba(0,0,0,.7),0 1px 0 rgba(255,255,255,.22);}
.drag-ghost{position:fixed;display:none;pointer-events:none;z-index:60;padding:3px 7px;background:#0b0d0b;color:#8fd9e0;font:bold 9px 'Courier New',monospace;border:1px solid #5fe0e8;border-radius:3px;box-shadow:0 2px 8px rgba(0,0,0,.6);white-space:nowrap;}
.parent-row{display:flex;gap:4px;margin-bottom:6px;}
.btn{flex:1;height:22px;color:#ece6da;font:700 8.5px 'Helvetica Neue';letter-spacing:.6px;text-transform:uppercase;}
.btn.ghost{flex:.5;color:#a9a397;}
/* black glass screens set into the paint */
/* (V6.9.2) shading from one light, at the upper left: in a recess the shadow falls to the lower right, its far lip (lower
   right) catches the light, its near lip is in shade, and the paint around is softly darkened (ambient occlusion); raised
   parts cast a short contact shadow and a long soft one, both to the lower right */
.screen{position:relative;background:var(--screen);border:1px solid #0c0d0b;border-radius:4px;box-shadow:inset 1px 2px 8px rgba(0,0,0,.95),inset 0 0 0 1px rgba(255,255,255,.025),1px 1px 0 rgba(255,250,240,.26),-1px -1px 0 rgba(0,0,0,.24),1px 2px 6px 1px rgba(20,16,10,.24);}
.parent-screen{height:191px;margin-bottom:6px;flex:none;}   /* the proportions of a mummer's pad (113 × 72) */
.parent-screen canvas,.axes canvas{width:100%;height:100%;display:block;}
.parent-screen canvas.phead{position:absolute;left:0;top:0;}
.facts{padding:7px 7px 6px 9px;font:9.5px 'Courier New',monospace;color:#9fdfe6;line-height:1.42;flex:1;min-height:0;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#3c6b70 transparent;}
.facts::-webkit-scrollbar{width:6px}.facts::-webkit-scrollbar-thumb{background:#3c6b70;border-radius:3px;border:1px solid #05080a}.facts::-webkit-scrollbar-track{background:rgba(255,255,255,.03);border-radius:3px}
.facts b{color:var(--glow);}
.facts div{white-space:normal;overflow:visible;padding-left:10px;text-indent:-10px;overflow-wrap:anywhere;}
.axes{flex:none;height:70px;margin:6px 0 4px;}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;}
.pad{position:relative;height:72px;border-radius:4px;background:var(--screen);border:1px solid #0c0d0b;box-shadow:inset 1px 2px 8px rgba(0,0,0,.95),inset 0 0 0 1px rgba(255,255,255,.025),1px 1px 0 rgba(255,250,240,.26),-1px -1px 0 rgba(0,0,0,.24),1px 2px 6px 1px rgba(20,16,10,.24);cursor:pointer;overflow:hidden;touch-action:none;}
.pad canvas{position:absolute;inset:0;width:100%;height:100%;}
.pad.sel{border-color:var(--acc);box-shadow:0 0 0 1px var(--acc),0 0 10px rgba(184,35,58,.5),inset 0 2px 8px rgba(0,0,0,.9);}
.pad.wait canvas,.pad.wait .pad-top,.pad.wait .pad-bot{opacity:.4;}
.pad.stale canvas{opacity:.45;}
.pad.hit{filter:brightness(1.35);}
.pad-top,.pad-bot{position:absolute;left:5px;right:5px;display:flex;justify-content:space-between;align-items:center;gap:4px;font:bold 9px 'Courier New',monospace;color:var(--pt,#8fd9e0);pointer-events:none;}
.pad-top{top:3px}.pad-bot{bottom:3px;color:var(--pb,#597a80);font-size:8.5px;}
.pad .pn{color:var(--pg,var(--glow))}
.pad .cat{font-size:8px;letter-spacing:1px;color:#e3a3ad;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;text-align:center;}
.pad .jd{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:right;}
/* the charivari, engraved in the paint (a groove darkened by the years, its lower lip catching the light) */
.frieze-box{position:relative;flex:1;min-height:0;}
.frieze{position:absolute;left:0;top:3px;width:470px;height:120px;pointer-events:none;background:url("${FRIEZE_MASK}") 0 0/470px 120px no-repeat;}
.joy-wrap{position:relative;width:206px;height:206px;margin:7px auto 9px;}
.joy{width:196px;height:196px;position:absolute;left:5px;top:5px;border-radius:6px;background:var(--screen);border:1px solid #0c0d0b;box-shadow:inset 1px 2px 10px rgba(0,0,0,.95),1px 1px 0 rgba(255,250,240,.28),-1px -1px 0 rgba(0,0,0,.24),1px 2px 7px 1px rgba(20,16,10,.24);cursor:crosshair;touch-action:none;}
.pole{position:absolute;font-size:8.5px;font-weight:600;letter-spacing:2.2px;color:var(--ink);text-shadow:var(--emb);cursor:help;}
.pole.n{top:-11px;left:50%;transform:translateX(-50%)}.pole.s{bottom:-11px;left:50%;transform:translateX(-50%)}
.pole.e{right:-22px;top:50%;transform:translateY(-50%) rotate(90deg)}.pole.w{left:-24px;top:50%;transform:translateY(-50%) rotate(-90deg)}
.play-block{display:flex;flex-direction:column;align-items:center;gap:5px;margin:4px 0 6px;}
.play-block .sw-l{width:auto;}
.play-top{display:flex;align-items:center;gap:5px;max-width:100%;}
.lacq-row{display:flex;align-items:center;gap:5px;}
.lacq-row .sw-pill span{min-width:0;letter-spacing:.4px;}
.lacq-row .sw-pill{gap:3px;padding:3px 5px 2px;}
.lacq-row .btn.lacq{padding:3px 6px;}
.lacq-row .sw-l{display:none;}
.lacq-row .control.small .val{min-width:36px;padding:2px 1px;font-size:8px;}
/* (V6.9.2) the lacquer's switch and its dose in one frame (Mat: « sur le même encart, pour comprendre leur lien »): a line
   engraved in the paint around them, shaded from the upper left like the rest */
.lacq-box{display:flex;align-items:center;gap:4px;padding:3px 3px 3px 4px;border-radius:4px;border:1px solid rgba(28,24,18,.55);
  box-shadow:1px 1px 0 rgba(255,250,240,.22),inset 1px 1px 0 rgba(255,250,240,.16),inset 1px 2px 5px rgba(20,16,10,.16);background:rgba(20,16,10,.05);}
.lacq-box .btn.lacq{padding:3px 5px 3px 4px;letter-spacing:0;display:flex;align-items:center;gap:4px;}
.lacq-box .btn.lacq::before{content:'';width:6px;height:6px;border-radius:50%;flex:none;background:radial-gradient(circle at 35% 30%,#5a2a30,#2a1014 70%);box-shadow:inset 0 1px 1px rgba(0,0,0,.7),0 1px 0 rgba(255,255,255,.12);}
.lacq-box .btn.lacq.on::before{background:radial-gradient(circle at 35% 30%,#ffd0d6,#e2324c 45%,#8f1a2c 100%);box-shadow:0 0 5px 1px rgba(226,50,76,.7),0 1px 0 rgba(255,255,255,.12);}
.btn.remut{font-size:9px;padding:3px 8px;letter-spacing:.4px;white-space:nowrap;}
.btn.lacq{font-size:9px;padding:3px 8px;letter-spacing:.4px;white-space:nowrap;flex:0 0 auto;}
.sel-keys{display:flex;gap:5px;align-items:center;}
.pad-bot .nt{flex:none;white-space:nowrap;}
.btn.outk{flex:0 0 auto;height:17px;display:flex;align-items:center;gap:5px;padding:0 8px;text-transform:none;letter-spacing:0;}
.btn.outk span{font:700 8px 'Helvetica Neue',Helvetica,sans-serif;letter-spacing:1.2px;text-transform:uppercase;color:#b9b3a6;}
.btn.outk b{font:bold 11px 'Courier New',monospace;color:#e8fbff;text-shadow:0 0 5px rgba(95,224,232,.35);white-space:nowrap;}
.btn.outk i{font-style:normal;font-size:11px;color:#5fe0e8;}
.btn.outk:hover{border-color:#5fe0e8;box-shadow:0 0 0 1px rgba(95,224,232,.55),0 0 9px rgba(95,224,232,.35),inset 0 1px 0 rgba(255,255,255,.15);}
.btn.outk.set b{color:#ffc2cb;}
.btn.outk.fold{border-color:var(--acc);box-shadow:0 0 0 1px var(--acc),0 0 7px rgba(184,35,58,.45);}
.btn.outk.fold b{color:#ff8a9a;}
.omenu{position:absolute;z-index:60;padding:6px;border-radius:5px;background:linear-gradient(180deg,#3d3b36,#1a1916);border:1px solid #0d0c0a;box-shadow:0 10px 30px rgba(0,0,0,.75),inset 0 1px 0 rgba(255,255,255,.14);font:10px 'Helvetica Neue',Helvetica,sans-serif;color:#d9efe4;}
.omenu .oh{padding:1px 3px 5px;color:#e8e2d6;letter-spacing:.4px;white-space:nowrap;}
.omenu .og{display:grid;grid-template-columns:repeat(4,52px);gap:3px;}
.omenu .oi{height:22px;border-radius:2px;background:#05080a;color:#e8fbff;font:bold 10.5px 'Courier New',monospace;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:inset 0 1px 3px rgba(0,0,0,.9);}
.omenu .oi:hover{background:#12302f;}
.omenu .oi.cur{outline:1px solid #d9687a;color:#ffc2cb;}
.btn.lacq.on{color:#fff;border-color:var(--acc);box-shadow:0 0 0 1px var(--acc),0 0 8px rgba(184,35,58,.5),inset 0 1px 0 rgba(255,255,255,.15);}
.sel-head{display:flex;align-items:center;justify-content:space-between;overflow:visible;gap:6px;}
.sel-head .btn.remut{flex:0 0 auto;height:17px;font-size:8px;padding:0 7px;letter-spacing:.5px;}
.sel-head.subj .remut{display:none;}
.adsr{display:flex;gap:2px;}
.adsr .control.small .val{min-width:36px;padding:2px 1px;}
.adsr .control.small .label{letter-spacing:.2px;}
.parent-screen{cursor:pointer;}
.parent-screen .phead{position:absolute;inset:0;pointer-events:none;}
.parent-screen.sel{border-color:var(--acc);box-shadow:0 0 0 1px var(--acc),0 0 10px rgba(184,35,58,.5),inset 0 2px 8px rgba(0,0,0,.9);}
.organs{flex:1;padding:5px 8px;font:9px 'Courier New',monospace;color:var(--ot,#9fdfe6);line-height:1.32;overflow-x:hidden;overflow-y:auto;min-height:0;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:var(--osc,#3c6b70) transparent;}
.organs::-webkit-scrollbar{width:5px}.organs::-webkit-scrollbar-thumb{background:var(--osc,#3c6b70);border-radius:3px}.organs::-webkit-scrollbar-track{background:transparent}
.organs .ln{white-space:normal !important;overflow:visible !important;text-overflow:clip !important;}
.organs b{color:var(--og,var(--glow))}.organs .op{display:flex;align-items:center;gap:6px;}
.organs .ln{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.organs .dim{color:var(--od,#5f8f96);}
.organs .bar{flex:1;height:3px;background:rgba(255,255,255,.08);border-radius:2px;overflow:hidden;}
.organs .op.dose{cursor:ew-resize;padding:1px 0;touch-action:none;}
.organs .op.dose .bar{height:5px;}
.organs .op.dose:hover .bar{background:rgba(255,255,255,.16);}
.organs .op.hand .bar i{background:linear-gradient(90deg,#b8233a,#ff8fa0);}
.organs .op.hand .gv{color:#ffb3bf;}
.organs .gv{min-width:30px;text-align:right;}
.organs .bar i{display:block;height:100%;background:linear-gradient(90deg,var(--ote,var(--teal)),var(--om,var(--cyan)));}
/* (1.0) the selected pad's window: its glass faintly tinted, a thin ring of its phosphor */
.col-right .organs,.col-right .joy{background:var(--oglass,var(--screen));}
.col-right .organs{box-shadow:inset 1px 2px 8px rgba(0,0,0,.95),inset 0 0 0 1px var(--oring,rgba(255,255,255,.025)),1px 1px 0 rgba(255,250,240,.26),-1px -1px 0 rgba(0,0,0,.24),1px 2px 6px 1px rgba(20,16,10,.24);}
.col-right .joy{box-shadow:inset 1px 2px 10px rgba(0,0,0,.95),inset 0 0 0 1px var(--oring,rgba(255,255,255,0)),1px 1px 0 rgba(255,250,240,.28),-1px -1px 0 rgba(0,0,0,.24),1px 2px 7px 1px rgba(20,16,10,.24);}
/* the lower plate: vintage brushed aluminium, a printed frame line, two screws */
.hydro-row{position:relative;z-index:3;display:flex;justify-content:center;gap:7px;padding:6px 24px 6px;margin-top:6px;align-items:center;border-radius:5px;
  background-color:#b3b0a8;
  background-image:${SKIN.brushed},
    linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.2) 12%,rgba(0,0,0,.05) 27%,rgba(255,255,255,.3) 44%,rgba(0,0,0,.07) 61%,rgba(255,255,255,.18) 79%,rgba(0,0,0,.05) 100%),
    radial-gradient(ellipse 8% 46% at 12.5% 52%,rgba(255,255,255,.2),rgba(255,255,255,0) 72%),
    radial-gradient(ellipse 30% 70% at 3% 100%,rgba(60,50,35,.16),rgba(60,50,35,0) 70%),radial-gradient(ellipse 30% 70% at 97% 100%,rgba(60,50,35,.14),rgba(60,50,35,0) 70%),
    linear-gradient(180deg,#c6c3bb 0%,#b4b1a9 46%,#a09d95 100%);
  background-size:1060px 140px,100% 100%,100% 100%,100% 100%,100% 100%,100% 100%;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.82),inset 1px 0 0 rgba(255,255,255,.45),inset -1px 0 0 rgba(0,0,0,.2),inset 0 -1px 0 rgba(0,0,0,.38),
    0 0 0 1px rgba(36,32,26,.65),0 -1px 2px rgba(0,0,0,.18),1px 3px 3px rgba(0,0,0,.45),2px 9px 16px rgba(0,0,0,.35);}
.hydro-row::before{content:'';position:absolute;inset:4px 16px;border:1px solid rgba(28,27,24,.55);border-radius:3px;pointer-events:none;box-shadow:0 1px 0 rgba(255,255,255,.35);}
.bscrew{position:absolute;top:50%;width:10px;height:10px;margin-top:-5px;border-radius:50%;background:radial-gradient(circle at 36% 30%,#fdfcf7 0,#d5d2ca 22%,#8f8c85 60%,#55534d 100%);
  box-shadow:0 0 0 1.2px rgba(40,36,30,.35),1px 1.5px 1.5px rgba(0,0,0,.45);}
.bscrew::before{content:'';position:absolute;left:1px;right:1px;top:50%;height:1.8px;margin-top:-.9px;background:linear-gradient(180deg,#171613,#3a3833 60%,#cfccc3);transform:rotate(var(--a,20deg));border-radius:1px;}
.bscrew.l{left:4px}.bscrew.r{right:4px}
.hydro-row .label,.hydro-row .sw-l{color:var(--alu-ink);text-shadow:var(--alu-emb);}
.hydro-row .vdivider{flex:none;background:rgba(28,27,24,.42);box-shadow:1px 0 0 rgba(255,255,255,.5);}
.hydro-row > *{flex-shrink:0;}
/* (V6.9.2) a row that never moves (Mat: « quand je bouge Troupe, selon ce qu'il affiche, les boutons et la loupe sortent du
   cadre aluminium ») : every value window has a fixed width, the switch columns too, so nothing can push its neighbours;
   the whole row is measured inside the engraved frame at the widest values (Troupe « G 100 · B 100 », Volume « −48.0 dB ») */
.hydro-row .val{box-sizing:border-box;width:58px;min-width:0;overflow:hidden;text-overflow:clip;}
.hydro-row .control.small .val{width:46px;min-width:0;}
.hydro-row [data-popval]{width:76px;font-size:8.5px;padding:2px 3px;}
.hydro-row .control{flex:none;}
.hydro-row .switches{flex:none;width:150px;}
.hydro-row .switches.tune{width:160px;}
.hydro-row .switches.tune .sw-l{letter-spacing:.7px;}
.mts-name{width:100%;text-align:right;}
/* the Mockery plaque: a raised, more polished plate, as the level controls of a field recorder */
.plaque{position:relative;padding:3px 12px 4px;border-radius:5px;
  background:${SKIN.plate},linear-gradient(90deg,rgba(255,255,255,.05),rgba(255,255,255,.38) 40%,rgba(0,0,0,.05) 70%,rgba(255,255,255,.2)),linear-gradient(180deg,#dad7cf,#bbb8b0);
  background-size:400px 60px,100% 100%,100% 100%;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.95),inset 0 -1px 0 rgba(0,0,0,.25),0 0 0 1px rgba(40,36,30,.5),1px 2px 2px rgba(0,0,0,.35),2px 5px 9px rgba(0,0,0,.18);}
.control{display:flex;flex-direction:column;align-items:center;}
.label{font-size:9px;color:var(--ink);text-transform:uppercase;margin-bottom:5px;font-weight:600;letter-spacing:1.6px;text-shadow:var(--emb);white-space:nowrap;}
.knob-stack{position:relative;width:50px;height:50px;display:flex;align-items:center;justify-content:center;}
.knob-stack .scale{position:absolute;left:-7px;top:-7px;width:64px;height:64px;pointer-events:none;overflow:visible;}
.knob-body{position:relative;display:flex;align-items:center;justify-content:center;border-radius:50%;}
.knob{position:relative;border-radius:50%;transform:rotate(var(--deg,-135deg));cursor:ns-resize;touch-action:none;}
.knob .cap{display:block;width:100%;height:100%;overflow:visible;pointer-events:none;}
.lit{position:absolute;left:50%;top:50%;border-radius:50%;transform:translate(-50%,-50%);pointer-events:none;}
/* lever (Mockery) */
.k-lever .label{color:#8f1a2c;font-size:9.5px;letter-spacing:2.2px;margin-bottom:6px;}
.k-lever .knob-stack{width:72px;height:72px;margin:0 8px;}
.k-lever .knob-stack .scale{left:-12px;top:-12px;width:96px;height:96px;}
.k-lever .knob-body{width:72px;height:72px;filter:drop-shadow(1.4px 2.8px 1.8px rgba(0,0,0,.5));}
.k-lever .knob{width:72px;height:72px;border-radius:0;}
.k-lever .val{margin-top:13px;}
/* bakelite (Shadow) and selector (envelope) on a bright ring */
.k-bakelite .knob-body,.k-bar .knob-body{width:44px;height:44px;background:var(--chrome);box-shadow:1px 2.5px 3px rgba(0,0,0,.5),inset 0 0 0 .6px rgba(0,0,0,.45),3px 7px 11px rgba(0,0,0,.28);}
.k-bakelite .knob{width:36px;height:36px;}
.k-bakelite .lit,.k-bar .lit{width:33px;height:33px;background:radial-gradient(circle at 34% 26%,rgba(255,255,255,.4) 0,rgba(255,255,255,.1) 20%,rgba(255,255,255,0) 44%),radial-gradient(circle,rgba(0,0,0,0) 58%,rgba(0,0,0,.4) 100%);}
.k-selector .knob-body{width:32px;height:32px;background:var(--chrome);box-shadow:1px 2px 2.5px rgba(0,0,0,.5),inset 0 0 0 .6px rgba(0,0,0,.45),3px 7px 11px rgba(0,0,0,.28);}
.k-selector .knob{width:27px;height:27px;}
.k-selector .lit{width:25px;height:25px;background:radial-gradient(circle at 34% 26%,rgba(255,255,255,.42) 0,rgba(255,255,255,.1) 22%,rgba(255,255,255,0) 46%),radial-gradient(circle,rgba(0,0,0,0) 58%,rgba(0,0,0,.4) 100%);}
/* drum (Volume): a large turned aluminium cylinder */
.k-drum .knob-stack{width:52px;height:52px;}
.k-drum .knob-stack .scale{left:-6px;top:-6px;width:64px;height:64px;}
.k-drum .knob-body{width:46px;height:46px;background:${SKIN.turned},conic-gradient(from 12deg,#ebe9e3,#a29f97 13%,#f7f6f2 26%,#9a978f 39%,#dedcd5 51%,#a5a29a 64%,#f4f3ef 77%,#9a9790 90%,#ebe9e3);
  box-shadow:1.4px 3px 3.5px rgba(0,0,0,.5),3px 8px 13px rgba(0,0,0,.28),inset 0 0 0 1px rgba(0,0,0,.4),inset 0 0 0 2.4px rgba(255,255,255,.4),inset 0 0 0 3.2px rgba(0,0,0,.2);}
.k-drum .knob{width:46px;height:46px;}
.k-drum .lit{width:44px;height:44px;background:radial-gradient(circle at 32% 24%,rgba(255,255,255,.45) 0,rgba(255,255,255,0) 40%);}
/* bar (Base note) */
.k-bar .knob{width:38px;height:38px;}
/* knurl (Choke): small knurled aluminium knob */
.k-knurl .knob-body{width:34px;height:34px;background:${SKIN.turned},radial-gradient(circle,#dcdad3 0,#c6c3bb 62%,#a3a098 64%,#cfccc4 76%,#9c9991 100%);box-shadow:1px 2px 2.5px rgba(0,0,0,.5),inset 0 0 0 .6px rgba(0,0,0,.45),3px 6px 10px rgba(0,0,0,.28);}
.k-knurl .knob{width:34px;height:34px;}
.k-knurl .lit{width:34px;height:34px;background:conic-gradient(from 30deg,rgba(255,255,255,.28),rgba(255,255,255,0) 18%,rgba(255,255,255,.22) 50%,rgba(255,255,255,0) 68%,rgba(255,255,255,.28)),radial-gradient(circle at 34% 26%,rgba(255,255,255,.35),rgba(255,255,255,0) 45%);}
.control.small .label{font-size:8px;letter-spacing:.5px;margin-bottom:4px;}
.control.small .knob-stack{width:38px;height:38px;}
.control.small .knob-stack .scale{left:-6px;top:-6px;width:50px;height:50px;}
.control.small.dim{opacity:.45;}
.val{font-size:9.5px;color:var(--glow);margin-top:5px;font-family:'Courier New',monospace;font-weight:bold;background:linear-gradient(180deg,#020303,#0b0e0f);padding:2px 6px;border-radius:2px;border:1px solid #000;min-width:48px;text-align:center;white-space:nowrap;
  box-shadow:inset 0 1px 3px rgba(0,0,0,.9),0 1px 0 rgba(255,255,255,.4),0 -1px 0 rgba(0,0,0,.18);text-shadow:0 0 4px rgba(95,224,232,.3);}
.control.small .val{font-size:8.5px;min-width:44px;padding:2px 3px;margin-top:4px;}
.smalls{display:flex;gap:7px;}
/* toggles: a chrome bat lever in a round cup */
.switches{display:flex;flex-direction:column;gap:7px;}
.sw{display:flex;align-items:center;justify-content:space-between;gap:7px;cursor:pointer;}
.sw-l{font-size:8px;color:var(--ink);text-transform:uppercase;font-weight:600;letter-spacing:1.4px;text-shadow:var(--emb);width:56px;text-align:right;}
.sw-pill{display:flex;align-items:center;gap:5px;}
/* (V6.9) the words of a switch readable on the metal — Mat: « certaines couleurs de police sont illisibles sur le gris, c'est le cas
   de solo quand crowd est sélectionné ». Measured (WCAG ratio, on the row's aluminium from its light top #c6c3bb to its dark
   foot #a09d95): the word not chosen was 2.1–2.3:1 (ink at 42 %), it is now charcoal #3d3b37, 6.4–4.1:1 (5.2:1 at mid-height);
   the chosen word, red #97182b at 3.1–4.8:1, is now a deeper red #6e0d1c, 6.9–4.5:1, in bold with a red rule under it. On the
   painted grey of the panel no light ink reaches 4.5:1 (white: 3.75:1), the word not chosen was 1.6–1.9:1: the play switch of
   the right column sits on a small aluminium plate, with the same inks. */
.sw-pill span{font:600 8px 'Helvetica Neue',Helvetica,sans-serif;letter-spacing:.8px;text-transform:uppercase;color:#3d3b37;min-width:42px;white-space:nowrap;transition:color .12s;text-shadow:var(--alu-emb);border-bottom:1.5px solid transparent;padding-bottom:1px;}
.sw-pill span[data-v="0"]{text-align:right}.sw-pill span[data-v="1"]{text-align:left}
.sw-pill span.on{color:#6e0d1c;font-weight:800;border-bottom-color:#8f1a2c;}
.col-right .sw-pill{padding:3px 6px 2px;border-radius:3px;background:linear-gradient(180deg,#d6d3cb,#bdbab2);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.85),inset 0 -1px 0 rgba(0,0,0,.25),0 0 0 1px rgba(36,32,26,.55),1px 2px 2px rgba(0,0,0,.3);}
.hydro-row .switches{gap:5px;}
.hydro-row .sw-l{width:auto;min-width:40px;letter-spacing:1.1px;}
.hydro-row .sw-pill span{min-width:0;}
.hydro-row .switches.tune .sw-l{min-width:0;text-align:left;}
.hydro-row .switches.tune .sw-pill span[data-v="0"]{min-width:44px;}
.mts-name{align-self:flex-end;font:600 7.5px 'Courier New',monospace;color:#3d3b37;letter-spacing:.3px;text-shadow:var(--alu-emb);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.mts-name.on{color:#6e0d1c;}
.mts-name.off{opacity:.75;}
.tog{position:relative;display:block;width:22px;height:22px;border-radius:50%;flex:none;
  background:radial-gradient(circle,#2b2a26 0,#232220 36%,#0b0a09 45%,rgba(0,0,0,0) 48%),var(--chrome);box-shadow:1px 2px 2.5px rgba(0,0,0,.45),inset 0 0 0 .6px rgba(0,0,0,.5);}
.tog u{position:absolute;inset:0;filter:drop-shadow(1px 2px 1.4px rgba(0,0,0,.6));}
.tog b{position:absolute;left:50%;top:50%;width:5.4px;height:15px;margin:-13.5px 0 0 -2.7px;border-radius:2.7px 2.7px 1.6px 1.6px;transform-origin:50% 13.5px;transform:rotate(-40deg);
  background:linear-gradient(90deg,#8a8780 0%,#fbfaf6 34%,#cfccc4 58%,#77746d 100%);transition:transform .12s;}
.sw.is-on .tog b{transform:rotate(40deg);}
/* (V6.9.2) a spring-return lever: at rest in the middle, pushed to a side it sets the sixteen mummers, released it comes back */
.sw.mom .tog b{transform:rotate(0deg);transition:transform .16s cubic-bezier(.3,1.6,.5,1);}
.sw.mom.push-0 .tog b{transform:rotate(-40deg);transition:transform .06s;}
.sw.mom.push-1 .tog b{transform:rotate(40deg);transition:transform .06s;}
.sw.mom .sw-pill span{cursor:pointer;}
.sw.mom.push-0 .sw-pill span[data-v="0"],.sw.mom.push-1 .sw-pill span[data-v="1"]{color:#6e0d1c;font-weight:800;border-bottom-color:#8f1a2c;}
.popjoy{width:62px;height:62px;border-radius:4px;background:var(--screen);border:2px solid #171614;box-shadow:inset 0 2px 6px rgba(0,0,0,.9),0 0 0 1.5px #a3a098,0 0 0 2.5px rgba(30,28,24,.55),1px 3px 4px 2px rgba(0,0,0,.22);cursor:crosshair;touch-action:none;}
.vdivider{width:1px;height:66px;background:linear-gradient(to bottom,transparent,rgba(0,0,0,.55),transparent);box-shadow:1px 0 0 rgba(255,255,255,.14);}
.loupe-bezel{flex:none;width:128px;height:64px;border-radius:6px;padding:4px;background:linear-gradient(180deg,#eceae4,#a19e96 47%,#d5d2cb 53%,#8b8880);border:1px solid #47443e;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.85),1px 3px 4px rgba(0,0,0,.45);position:relative;display:flex;}
.loupe-screen{flex:1;border-radius:3px;background:radial-gradient(ellipse at 30% 20%,#1a0508 0%,#0a0203 90%);position:relative;overflow:hidden;border:1px solid #0d0d0d;box-shadow:inset 0 2px 6px rgba(0,0,0,.95);}
.loupe-screen::after{content:'';position:absolute;inset:0;background:linear-gradient(162deg,rgba(255,255,255,.07),rgba(255,255,255,0) 40%);pointer-events:none;}
.loupe-idle{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;transition:opacity .25s;}
.loupe-screen.active .loupe-idle{opacity:0}
.loupe-brand{font:bold 8px 'Courier New',monospace;letter-spacing:3px;color:rgba(217,104,122,.7);}
.loupe-dots{display:flex;gap:5px}.loupe-dot{width:4px;height:4px;border-radius:50%;background:rgba(217,104,122,.5)}
@keyframes scan{0%{top:-2px;opacity:0}8%{opacity:.3}92%{opacity:.1}100%{top:calc(100% + 2px);opacity:0}}
.scanline{position:absolute;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--acc-soft) 50%,transparent);animation:scan 4s ease-in-out infinite;}
.loupe-active{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:4px;}
.loupe-screen.active .loupe-active{display:flex}
[data-lname]{font-size:8px;color:var(--glow);text-transform:uppercase;letter-spacing:1.5px;font-weight:700;white-space:nowrap;}
[data-lval]{font:bold 14px 'Courier New',monospace;color:#fff;text-shadow:0 0 12px var(--acc-soft);white-space:nowrap;}
.loupe-bar{width:80%;height:3px;background:rgba(255,255,255,.1);border-radius:2px;overflow:hidden}
[data-lbar]{height:100%;width:50%;background:linear-gradient(90deg,var(--acc),var(--glow));}
.footer{margin-top:5px;text-align:center;font-size:7.5px;color:var(--ink2);text-transform:uppercase;letter-spacing:2.4px;opacity:.9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:var(--emb);}
/* (V6.9) the tempo and scale keys: black bakelite like the others, the value lit, the pen and the arrow in cyan; a cyan ring
   under the mouse; set by hand, the value turns pink in a red ring and the ↺ key brings the analysis back */
.hand-rows{display:flex;flex-direction:column;gap:4px;margin-bottom:6px;flex:none;}
.hrow{display:flex;gap:4px;}
.btn.hk{height:25px;display:flex;align-items:center;gap:7px;padding:0 9px;min-width:0;text-transform:none;letter-spacing:0;}
.btn.hk .hl{flex:none;width:42px;text-align:left;font:700 8px 'Helvetica Neue',Helvetica,sans-serif;letter-spacing:1.4px;text-transform:uppercase;color:#b9b3a6;}
.btn.hk b{flex:1;min-width:0;text-align:left;font:bold 11px 'Courier New',monospace;color:#e8fbff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 0 5px rgba(95,224,232,.35);}
.btn.hk i{flex:none;font-style:normal;font-size:12px;color:#5fe0e8;}
.btn.hk:hover{border-color:#5fe0e8;box-shadow:0 0 0 1px rgba(95,224,232,.55),0 0 9px rgba(95,224,232,.35),inset 0 1px 0 rgba(255,255,255,.15);}
.btn.hk.hand{border-color:var(--acc);box-shadow:0 0 0 1px var(--acc),0 0 7px rgba(184,35,58,.45),inset 0 1px 0 rgba(255,255,255,.15);}
.btn.hk.hand b{color:#ffc2cb;text-shadow:0 0 5px rgba(255,140,160,.35);}
.btn.hk.off{cursor:default;opacity:.55;}
.btn.hk.off:hover{border-color:#0a0a09;box-shadow:inset 0 1px 0 rgba(255,255,255,.15),inset 0 -1px 0 rgba(0,0,0,.6),0 1px 0 rgba(255,255,255,.26),1px 2px 3px rgba(0,0,0,.42);}
.btn.hk.back{flex:0 0 auto;padding:0 8px;gap:4px;font:700 11px 'Helvetica Neue',Helvetica,sans-serif;color:#ffc2cb;}
.btn.hk.back span{font:bold 9.5px 'Courier New',monospace;color:#ffc2cb;}
/* (V6.9) what can be set by hand in the analysis, the typed tempo, the scale menu, the degree selector */
.facts .edit{cursor:pointer;border-bottom:1px dotted rgba(95,224,232,.55);}
.facts .edit:hover{color:#fff;border-bottom-color:#5fe0e8;}
.facts .edit.off{cursor:default;border-bottom-color:transparent;opacity:.7;}
.facts .hand{color:#ffb3bf;}
.bpm-in{position:absolute;z-index:70;width:64px;height:25px;padding:0 8px;font:bold 12px 'Courier New',monospace;color:#fff;background:#05080a;border:1px solid #5fe0e8;border-radius:2px;box-shadow:0 0 0 2px rgba(95,224,232,.25),0 4px 10px rgba(0,0,0,.6);}
.smenu{position:absolute;z-index:60;left:22px;top:118px;width:600px;height:470px;display:flex;flex-direction:column;border-radius:5px;padding:6px;
  background:linear-gradient(180deg,#3d3b36,#1a1916);border:1px solid #0d0c0a;box-shadow:0 14px 40px rgba(0,0,0,.75),inset 0 1px 0 rgba(255,255,255,.14);font:10.5px 'Helvetica Neue',Helvetica,sans-serif;color:#d9efe4;}
.sm-head{display:flex;justify-content:space-between;align-items:center;padding:2px 4px 6px;color:#e8e2d6;letter-spacing:.5px;}
.sm-head b{color:#fff;}
.sm-x{width:20px;height:20px;border-radius:3px;border:1px solid #0a0a09;background:linear-gradient(180deg,#363431,#141312);color:#e2ddd2;cursor:pointer;font:bold 12px 'Helvetica Neue';}
.sm-prop{padding:5px 8px;margin-bottom:6px;border-radius:3px;background:#05080a;cursor:pointer;display:flex;justify-content:space-between;gap:10px;box-shadow:inset 0 1px 3px rgba(0,0,0,.9);}
.sm-prop b{color:#5fe0e8;} .sm-prop i,.sm-it i,.sm-fam i{font-style:normal;color:#7d9da0;font-family:'Courier New',monospace;white-space:nowrap;}
.sm-prop:hover,.sm-it:hover{background:#12302f;}
.sm-prop.cur,.sm-it.cur{outline:1px solid #d9687a;}
.sm-body{flex:1;display:flex;gap:6px;min-height:0;}
.sm-fams{width:190px;overflow-y:auto;background:#05080a;border-radius:3px;padding:3px;box-shadow:inset 0 1px 3px rgba(0,0,0,.9);}
.sm-list{flex:1;overflow-y:auto;background:#05080a;border-radius:3px;padding:3px;box-shadow:inset 0 1px 3px rgba(0,0,0,.9);}
.sm-fam,.sm-it{display:flex;justify-content:space-between;gap:8px;padding:3px 6px;border-radius:2px;cursor:pointer;white-space:nowrap;}
.sm-fam span,.sm-it span{overflow:hidden;text-overflow:ellipsis;}
.sm-fam.sel{background:#1f5a55;color:#fff;}
.sm-fam.no,.sm-it.no{color:#5d6b6c;cursor:default;}
.sm-it.no:hover{background:none;}
.sm-it.prop span::after{content:' · proposed';color:#5fe0e8;}
.organs .degsel{display:flex;align-items:center;gap:5px;margin:4px 0 5px;color:var(--og,#e8fbff);white-space:nowrap !important;}
.organs .degsel b{color:var(--om,#5fe0e8);}
.organs .dg{width:20px;height:17px;padding:0;border-radius:2px;border:1px solid #0a0a09;background:linear-gradient(180deg,#363431,#141312);color:#e2ddd2;font:9px 'Helvetica Neue';cursor:pointer;}
.organs .dg:disabled{opacity:.35;cursor:default;}
.organs .dgv{cursor:default;}
.organs .dgv.hand b{color:#ffb3bf;}
.organs .dgn{color:var(--odn,#7d9da0);font-size:9px;}
.bubble{position:absolute;z-index:50;max-width:270px;padding:7px 9px;border-radius:4px;background:rgba(6,10,8,.96);border:1px solid #3a473d;
  box-shadow:0 6px 18px rgba(0,0,0,.6);color:#d9efe4;font:10.5px/1.38 'Helvetica Neue',Helvetica,sans-serif;pointer-events:none;opacity:0;transition:opacity .12s;}
.bubble.on{opacity:1;}
.bubble b{color:#fff;letter-spacing:.6px;}`;
  }

  $ (q) { return this.shadowRoot.querySelector(q); }
  $$ (q) { return this.shadowRoot.querySelectorAll(q); }
  on (n, e, f, o) { n.addEventListener(e, f, o); this.handlers.push([n, e, f, o]); }

  // ------------------------------------------------------------------ life cycle
  connectedCallback () {
    this.shadowRoot.innerHTML = this.template();
    this.knobs = [...KNOBS, ...SMALL, ...PLAYK, LACQK].map(k => ({ ...k, el: this.$(`[data-knob="${k.id}"]`) }));
    this.knobs.forEach(k => this.bindKnob(k));
    [...SWITCHES, PLAYSW].forEach(s => { const el = this.$(`[data-sw="${s.id}"]`); this.on(el, 'click', () => s.local !== undefined ? this.setPlay(this.sel, s.local, this.play[this.sel][s.local] > 0.5 ? 0 : 1) : this.userSet(s.id, this.v(s.id) > 0.5 ? 0 : 1)); });
    this.bindHelp();
    this.bindJoy(this.$('[data-joy]'), () => this.sel, true);
    this.bindJoy(this.$('[data-pop]'), () => -1, false);
    this.$$('.pad').forEach(el => {
      const p = Number(el.dataset.pad); let drag = null;
      this.on(el, 'pointerdown', e => { e.preventDefault(); el.setPointerCapture(e.pointerId); this.select(p); this.noteOn(this.base() + p, 'pad' + p); el.classList.add('hit'); drag = { x: e.clientX, y: e.clientY, on: false }; });
      // dragged beyond 10 px, a born mummer leaves its pad: dropped on an EMPTY subject slot, it becomes a subject
      this.on(el, 'pointermove', e => {
        if (!drag) return;
        if (!drag.on && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 10 && this.kids[p]) { drag.on = true; this.noteOff('pad' + p); el.classList.remove('hit'); this.dragStart(p); }
        if (drag.on) this.dragMove(e.clientX, e.clientY);
      });
      const up = e => {
        this.noteOff('pad' + p); el.classList.remove('hit');
        if (drag && drag.on) { if (e && e.type === 'pointerup') this.dragDrop(p, e.clientX, e.clientY); else this.dragEnd(); }
        drag = null;
      };
      this.on(el, 'pointerup', up); this.on(el, 'pointercancel', up); this.on(el, 'lostpointercapture', up);
    });
    this.$$('.slot').forEach(el => this.on(el, 'click', () => this.userSet('param37', Number(el.dataset.slot))));
    this.$$('.slot').forEach(el => this.on(el, 'dblclick', () => this.nextGeneration(Number(el.dataset.slot))));
    this.on(this.$('[data-pick]'), 'click', () => this.$('[data-file]').click());
    this.on(this.$('[data-file]'), 'change', e => { const f = e.target.files && e.target.files[0]; if (f) this.importFile(f); e.target.value = ''; });
    const aud = this.$('[data-audition]');
    this.on(aud, 'pointerdown', e => { aud.setPointerCapture(e.pointerId); this.noteOn(this.base() - 1, 'parent'); });
    this.on(this.$('[data-remut]'), 'click', e => { if (this.sel < SUBJ) this.remutate(this.sel, e.altKey ? -1 : 1); });
    // (V6.4) a gene's dose by hand: drag its bar in the report (0–100 %), release to make the mummer be born again; double-click:
    // back to the dose the analysis gave it
    { const box = this.$('[data-organs]');
      const rowOf = e => { const r = e.target && e.target.closest ? e.target.closest('.op.dose') : null; return r && box.contains(r) ? r : null; };
      const valAt = (row, x) => { const b = row.querySelector('.bar').getBoundingClientRect(); return clamp((x - b.left) / Math.max(1, b.width), 0, 1); };
      const show = (row, v) => { row.querySelector('.bar i').style.width = Math.round(v * 100) + '%'; row.querySelector('.gv').textContent = doseTxt(v); row.classList.add('hand'); };
      // a press alone changes nothing (the double-click needs the bar to stay where it is): only a drag of 3 px or more
      // (the press cancels the browser's own click events: the double press is recognised here — two presses on the same bar
      // within 350 ms, without a drag)
      const reset = (k, i) => { const kid = this.kids[k], pg = this.pendingGenes[k], d0 = (kid && kid.genes0) || (pg && pg.d0); if (d0 && d0[i]) this.setDose(k, i, d0[i].iota); };
      let lastPress = null;
      this.on(box, 'pointerdown', e => { const row = rowOf(e); if (!row || this.sel === SUBJ || e.button !== 0) return; e.preventDefault();
        const now = performance.now(), gi = Number(row.dataset.gi);
        if (lastPress && lastPress.k === this.sel && lastPress.i === gi && now - lastPress.t < 350) { lastPress = null; this.geneDrag = null; reset(this.sel, gi); return; }
        lastPress = { k: this.sel, i: gi, t: now };
        box.setPointerCapture(e.pointerId);
        const i0 = row.querySelector('.bar i'), t0 = row.querySelector('.gv');
        this.geneDrag = { k: this.sel, i: Number(row.dataset.gi), row, x0: e.clientX, v: NaN, moved: false, w0: i0.style.width, t0: t0.textContent, h0: row.classList.contains('hand') }; });
      this.on(box, 'pointermove', e => { const g = this.geneDrag; if (!g) return; if (!g.moved && Math.abs(e.clientX - g.x0) < 3) return; g.moved = true; lastPress = null; g.v = valAt(g.row, e.clientX); show(g.row, g.v); this.say(`${gname(this.genesShown(g.k)[g.i].g)}: ${Math.round(g.v * 100) <= 0 ? 'off' : Math.round(g.v * 100) + ' %'} (release to give birth${Math.round(g.v * 100) <= 0 ? ' without it' : ''})`); });
      const end = e => { const g = this.geneDrag; if (!g) return; this.geneDrag = null; try { box.releasePointerCapture(e.pointerId); } catch (x) { /* already released */ }
        if (!g.moved) { g.row.querySelector('.bar i').style.width = g.w0; g.row.querySelector('.gv').textContent = g.t0; g.row.classList.toggle('hand', g.h0); return; }
        const old = this.genesShown(g.k)[g.i]; if (old && Number.isFinite(old.iota) && Math.abs(old.iota - g.v) >= 0.005) this.setDose(g.k, g.i, g.v); else this.drawOrgans(); };
      this.on(box, 'pointerup', end); this.on(box, 'pointercancel', end);
    }
    // (V6.3) the lacquer of the selected pad: on / off (its dose: the Lacquer knob of the envelope row)
    this.on(this.$('[data-lacq]'), 'click', () => this.setPlay(this.sel, 6, this.play[this.sel][6] > 0.5 ? 0 : 1));
    // (V6.9 multichannel) the selected pad's output pair
    this.on(this.$('[data-outk]'), 'click', () => this.openOut());
    // (V6.9.2) the spring-return lever: the side pressed (left half one-shot, right half hold) sets the sixteen mummers
    { const el = this.$('[data-allmode]'), pill = el.querySelector('.sw-pill');
      const release = () => { el.classList.remove('push-0', 'push-1'); };
      this.on(el, 'pointerdown', e => {
        e.preventDefault(); const r = pill.getBoundingClientRect(), side = e.target.closest('[data-v]') ? Number(e.target.closest('[data-v]').dataset.v) : (e.clientX >= r.left + r.width / 2 ? 1 : 0);
        el.classList.remove('push-0', 'push-1'); el.classList.add('push-' + side);
        try { el.setPointerCapture(e.pointerId); } catch (x) { /* not capturable */ }
        this.setAllModes(side);
      });
      this.on(el, 'pointerup', release); this.on(el, 'pointercancel', release); this.on(el, 'lostpointercapture', release); }
    // (V6.3) the subject is the 17th pad: a click on its waveform selects it and plays it, like a pad
    const sp = this.$('[data-subjpad]');
    this.on(sp, 'pointerdown', e => { e.preventDefault(); sp.setPointerCapture(e.pointerId); this.select(SUBJ); this.noteOn(this.base() - 1, 'subjpad'); });
    const spUp = () => this.noteOff('subjpad');
    this.on(sp, 'pointerup', spUp); this.on(sp, 'pointercancel', spUp); this.on(sp, 'lostpointercapture', spUp);
    this.on(aud, 'pointerup', () => this.noteOff('parent')); this.on(aud, 'pointercancel', () => this.noteOff('parent')); this.on(aud, 'lostpointercapture', () => this.noteOff('parent'));
    this.on(this.$('[data-clear]'), 'click', () => this.clearSlot());
    // (V6.9) the tempo and scale keys
    this.on(this.$('[data-bpmkey]'), 'click', e => { if (!e.currentTarget.classList.contains('off')) this.openBpm(e.currentTarget); });
    this.on(this.$('[data-bpmback2]'), 'click', () => this.setTempo(0));
    this.on(this.$('[data-scalekey]'), 'click', e => { if (!e.currentTarget.classList.contains('off')) this.openScaleMenu(); else if (this.mtsActive()) this.say(e.currentTarget.title || 'the MTS-ESP master: no scale menu'); });
    this.on(this.$('[data-scaleback]'), 'click', () => this.setScale(-1));
    // (V6.9) in the analysis: the tempo (click: type it; the analysis's reading ↺: back to it), the scale menu
    { const fb = this.$('[data-facts]');
      this.on(fb, 'click', e => { const t = e.target.closest ? e.target : null; if (!t) return;
        if (t.closest('[data-bpmback]')) { this.setTempo(0); return; }
        const b = t.closest('[data-bpm]'); if (b) { this.openBpm(b); return; }
        if (t.closest('[data-scalepick]')) this.openScaleMenu(); });
      this.on(fb, 'dblclick', e => { if (e.target.closest && e.target.closest('[data-bpm]')) { this.closeOverlays(); this.setTempo(0); } }); }
    // (V6.9) the degree of the selected mummer (Tuning: scale): ◀ ▶, double-click on it: back to the ladder's
    { const ob = this.$('[data-organs]');
      this.on(ob, 'click', e => { const b = e.target.closest ? e.target.closest('[data-dg]') : null; if (!b || this.sel === SUBJ) return; const i = this.degIndex(this.sel); if (i >= 0) this.setDegree(this.sel, i + Number(b.dataset.dg)); });
      this.on(ob, 'dblclick', e => { if (e.target.closest && e.target.closest('[data-dgv]') && this.sel !== SUBJ) { const d = this.defIndex(this.sel); if (d >= 0) this.setDegree(this.sel, d); } }); }

    this.pl = ({ endpointID, value }) => { if (!this.pArr[endpointID] && /^param(35|42|43)$/.test(endpointID)) this.pArr[endpointID] = [Math.round(performance.now() - this.t0), Number(value)];
      if (this.guarded(endpointID, Number(value))) { this.gotParams.add(endpointID); this.reasserted += 1; const sv = this.savedParams[endpointID]; setTimeout(() => this.setParam(endpointID, sv, true), 0); return; }
      this.values[endpointID] = Number(value); this.gotParams.add(endpointID); this.onParam(endpointID); if (endpointID === 'param43' && !this.instReady) this.resolveTroupe(); if (endpointID === 'param47') this.onStateParam(); };
    this.gotParams = new Set(); this.paramWait = setTimeout(() => { this.paramWait = null; this.resolveTroupe(); this.reconcile(); }, 600);
    this.pc.addAllParameterListener(this.pl);
    for (let i = 1; i <= 46; ++i) this.pc.requestParameterValue('param' + i);
    this.pc.requestParameterValue('param48');
    // (V6.5) the link with the engine, counted for the diagnostics: messages received and their age
    this.link = { st: 0, tSt: 0, tel: 0, tTel: 0, ack: 0, tAck: 0, lag: 0, lagAt: 0 };
    this.hs = e => { this.link.st += 1; this.link.tSt = performance.now(); const first = !this.st, ch0 = this.st ? this.st[94] + ':' + this.st[95] : ''; this.st = Array.from(e?.value ?? e); this.drawStatus(); if (first) { this.syncDsp(); this.reconcile(); } if (first || ch0 !== this.st[94] + ':' + this.st[95]) { this.drawOut(); this.drawPads(); } };
    this.hc = e => { const v = Array.from(e?.value ?? e); this.info[v[0]] = v; this.drawOrgans(); };
    this.ht = e => { this.link.tel += 1; this.link.tTel = performance.now(); this.tel = Array.from(e?.value ?? e); };
    this.ha = e => { this.link.ack += 1; this.link.tAck = performance.now(); this.sender.ack = Number(e?.value ?? e); if (this.sender.kick) this.sender.kick(); };
    this.pc.addEndpointListener('status', this.hs);
    this.pc.addEndpointListener('childInfo', this.hc);
    this.pc.addEndpointListener('telemetry', this.ht);
    this.pc.addEndpointListener('rxAck', this.ha);
    // (V6.9) the MTS-ESP master seen by the engine
    this.hm = e => this.onMts(Array.from(e?.value ?? e));
    this.pc.addEndpointListener('mtsInfo', this.hm);
    this.pc.requestFullStoredState(state => {
      this.stored = (state && state.values) || {};
      // the instance's claim (v6.1): kept in its own stored state; made once when missing
      this.claim = typeof this.stored.claim === 'string' && this.stored.claim ? this.stored.claim : null;
      if (!this.claim) this.newClaim();
      this.stateLoaded = true;
      const p37 = (state?.parameters || []).find(p => p.name === 'param37' || p.endpointID === 'param37');
      if (p37) this.slot = Math.round(p37.value);
      const p43 = (state?.parameters || []).find(p => p.name === 'param43' || p.endpointID === 'param43');
      if (p43 && !this.gotParams.has('param43')) { this.values.param43 = Number(p43.value); this.gotParams.add('param43'); }
      this.resolveTroupe();
    });
    this.pc.sendEventOrValue('uiRequest', 1);
    this.workerTest = 'running'; this.brain.selfTest().then(r => { this.workerTest = r; });
    this.drawSlots(); this.select(0); this.drawSwitches(); this.drawPop(); this.drawMts();
    this.beatTimer = setInterval(() => { if (this.inst) this.cache.beat(this.inst, this.sess); }, 2000);
    // (V6.5) the page's own lateness (a busy main thread, or timers slowed by the system), and the title kept current
    // even when no status arrives and no frame is drawn
    { let tq = performance.now(); const hist = [];
      this.lagTimer = setInterval(() => {
        const t = performance.now(), l = t - tq - 500, L = this.link; tq = t;
        if (l > L.lag || t - L.lagAt > 30000) { L.lag = Math.max(0, l); L.lagAt = t; }
        // rates over the last 10 s: telemetry comes 25 times a second from an engine that runs in real time
        hist.push([t, L.tel, L.st, L.ack, this.sender.nSent || 0]); while (hist.length > 1 && t - hist[0][0] > 10000) hist.shift();
        const h0 = hist[0], dt = Math.max(0.5, (t - h0[0]) / 1000);
        L.rate = `${((L.tel - h0[1]) / dt).toFixed(1)}/s telemetry, ${((L.ack - h0[3]) / dt).toFixed(1)}/s acks, ${((this.sender.nSent || 0) - h0[4]) / dt | 0}/s packets sent`;
        this.drawStatus();
      }, 500); }
    const loop = () => { if (!this.isConnected) return; this.drawPads(); this.drawSubjectHead(); this.drawStatus(); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  }
  disconnectedCallback () {
    cancelAnimationFrame(this.raf); clearInterval(this.lagTimer); clearTimeout(this.recTimer); clearTimeout(this.paramWait); clearTimeout(this.helpTimer); clearInterval(this.beatTimer); clearTimeout(this.keepTimer);
    // the editor closes: its troupe is marked closed at once (a quick reopening must not take it for another open editor)
    if (this.inst && this.cache.db) this.cache.tx('live', 'readwrite', st => st.put({ seen: Date.now() - 6000, sess: '' }, String(this.inst)));
    this.handlers.forEach(([n, e, f, o]) => n.removeEventListener(e, f, o)); this.handlers = [];
    this.pc.removeAllParameterListener(this.pl);
    [['status', this.hs], ['childInfo', this.hc], ['telemetry', this.ht], ['rxAck', this.ha], ['mtsInfo', this.hm]].forEach(([k, f]) => this.pc.removeEndpointListener(k, f));
    this.held.forEach(n => this.midi(0x80, n, 0)); this.held.clear();
    this.sender.clear(); this.brain.destroy();
    this.edit.forEach(id => this.pc.sendParameterGestureEnd(id)); this.edit.clear();
    if (this.playTimer) { clearTimeout(this.playTimer); this.savePlay(); }
    if (this.saveTimer) { clearTimeout(this.saveTimer); this.saveTroupe(); }
  }

  // ------------------------------------------------------------------ the troupe: which one, and what it owns
  // number = param43 (restored by the host with the project and after each rebuild); a DSP update resets parameters to their
  // initial values, so the number is also kept in the stored state of the running session and put back into param43
  newClaim () { this.claim = 'c' + Date.now().toString(36) + Math.round(performance.now() * 1000).toString(36); this.stored.claim = this.claim; this.pc.sendStoredStateValue('claim', this.claim); }
  async resolveTroupe () {
    // the number must be known (or 600 ms without an answer) before anything is decided: deciding on 0 would clear a DSP that
    // still holds the troupe when the editor reattaches without rebuilding
    if (!this.stateLoaded || this.resolving || this.instReady) return;
    if (!this.gotParams.has('param43') && this.paramWait) return;
    this.resolving = true;
    // 1. the number in param43, if a troupe of this computer has it; 2. the number kept by the running session; 3. the host
    // gave back a number nobody owns (measured in AMORPH, v5.6: after a reopening param43 came back as 524 288 — exactly half
    // its range — instead of the number written): the troupe whose editor closed last (within 30 min, seen by nobody since)
    // takes this instance back, and its number is written again. A new instance (param43 = 0) adopts nothing.
    // (v6 : 524 288 n'est JAMAIS un numéro de troupe — c'est la valeur que l'hôte rend quand il a perdu le paramètre. La v5.9
    // l'adoptait quand aucune troupe fermée récemment ne se présentait : une troupe 524 288 vide naissait, puis chaque
    // réouverture la retrouvait « par son numéro » — case vide, sujet rechargé, enfants refaits. Mesuré dans AMORPH le 02.10 :
    // « troupe #524288 [number] · slot 1 is empty », 1 sujet et 2 troupes sur le disque. Désormais : le numéro de la session,
    // puis la troupe fermée en dernier qui a des sujets — sans limite d'âge)
    const BAD = 524288, raw = Math.round(this.v('param43', 0)), fromParam = raw === BAD ? 0 : raw, fromState = Math.round(Number(this.stored.instance) || 0);
    // (v6.1 : deux instances sur le preset « charivari » — un sujet chargé dans l'une apparaissait dans l'autre et effaçait ses
    // enfants. Le numéro perdu par l'hôte faisait reprendre la troupe fermée en dernier : celle de L'AUTRE instance, partagée.
    // Désormais : le numéro gardé par la session d'abord (il est propre à l'instance), puis param43 ; sans l'un ni l'autre, une
    // COPIE de la dernière troupe fermée — jamais la troupe elle-même. Deux instances ne partagent plus rien.)
    let id = 0, how = 'new';
    if (fromState && fromState !== BAD && await this.cache.getTroupe(fromState)) { id = fromState; how = 'session'; }
    else if (fromParam && await this.cache.getTroupe(fromParam)) { id = fromParam; how = 'number'; }
    else if (raw) { const c = await this.cache.lastClosed(Infinity); if (c) { id = await this.cache.forkTroupe(c, this.claim, this.sess); how = `copied from #${c} (host gave ${raw})`; } else if (fromParam) { id = fromParam; how = 'number from host'; } }
    // (v6.1 : le numéro rendu à 0 et rien dans l'état — mesuré dans AMORPH le 02.10 après le chargement du projet :
    // « troupe #574090 [new] », cases vides, sujet rechargé, troupe refaite. Une instance sans numéro reçoit une COPIE de la
    // troupe fermée en dernier : ses sujets, ses réglages par pad, ses générations — une vraie nouvelle instance montre les
    // derniers sujets au lieu de cases vides, et la troupe d'origine reste à son propriétaire)
    else { const c = await this.cache.lastClosed(Infinity); if (c) { id = await this.cache.forkTroupe(c, this.claim, this.sess); how = `copied from #${c}`; } }
    // (v6.1) OWNERSHIP — two instances loaded from the same preset carry the same troupe number, so the number alone shared
    // one troupe between them (a subject loaded in one replaced the other's). Each instance now keeps a claim in its own
    // stored state, written into the troupe it uses: a troupe claimed by another instance, or open right now in another
    // editor (its heartbeat, less than 5 s old, from another session), is COPIED — subjects, pad settings and generations
    // come along (the mummers themselves are shared on the disk, nothing is born again) and the copy is ours alone
    if (id && (how === 'session' || how === 'number' || how === 'number from host')) {
      const t = await this.cache.getTroupe(id), lv = await this.cache.liveOf(id), now = Date.now();
      const busy = !!(lv && lv.sess && lv.sess !== this.sess && now - lv.seen < 5000), other = !!(t && t.owner && t.owner !== this.claim);
      if (busy || other) {
        if (busy && !other) this.newClaim();               // the same claim open twice: a preset copied with its state
        const c = id; id = await this.cache.forkTroupe(c, this.claim, this.sess); how = `copied from #${c} (${busy ? 'open in another editor' : 'belongs to another instance'})`;
      }
    }
    // an unclaimed troupe (written before v6.1) becomes ours at once; our heartbeat starts now
    if (id) { const t2 = await this.cache.getTroupe(id); if (t2 && !t2.owner) await this.cache.putTroupe(id, { ...t2, owner: this.claim }); this.cache.beat(id, this.sess); }
    this.instHow = how;
    if (id && id !== fromParam) this.setParam('param43', id, true);
    await this.useTroupe(id);
    await this.migrateStored();
    this.instReady = true; this.resolving = false;
    this.loadPlay(); this.syncDsp(); this.drawSlots(); this.reconcile();
    await this.adoptState();
    // (V6.4) once the opening is over, the troupe keeps the settings in use (a troupe written before V6.4 has none yet)
    clearTimeout(this.keepTimer); this.keepTimer = setTimeout(() => { if (this.isConnected && this.inst) this.saveTroupe(); }, KEEP_MS + 500);
  }
  async useTroupe (id) {
    this.inst = id; this.meta = {}; this.missing = {}; this.troupePlay = null;
    if (id) {
      this.pc.sendStoredStateValue('instance', id); this.stored.instance = id;
      const t = await this.cache.getTroupe(id);
      if (t && t.slots) for (const [k, m] of Object.entries(t.slots)) if (m && m.hash) this.meta[k] = m;
      this.troupePlay = t && t.play ? t.play : null;
      // (V6.4) the troupe's Mockery, Tuning and Subject, put back at once
      this.savedParams = t && t.params ? { ...t.params } : null; this.applySaved();
    }
    this.cache.counts().then(c => { this.dbCounts = c; });
  }
  // subjects of an older version (kept as base64 in the stored state of a running session): moved to the disk once
  async migrateStored () {
    for (let slot = 1; slot <= 8; ++slot) {
      const m = this.stored['parent' + slot]; if (!m || !m.chunks || this.meta[slot]) continue;
      const P = this.legacyPcm(slot); if (!P) continue;
      const hash = fingerprint(P.W, P.n);
      if (await this.cache.putSubject(hash, { W: P.W, n: P.n, name: m.name || m.nom || 'subject', t: Date.now() })) {
        this.meta[slot] = { name: m.name || m.nom || 'subject', frames: P.n, hash, from: m.from || null };
        this.pcm[slot] = P;
        for (let c = 0; c < m.chunks; ++c) { this.pc.sendStoredStateValue(`parent${slot}_${c}`, ''); delete this.stored[`parent${slot}_${c}`]; }
        this.pc.sendStoredStateValue('parent' + slot, ''); delete this.stored['parent' + slot];
        await this.ensureTroupe(); this.saveTroupe();
      }
    }
  }
  async ensureTroupe () {
    if (this.inst) return this.inst;
    // a new number: the clock in milliseconds (folded on 20 bits, exact through the host's normalised parameter), never one
    // already used by a troupe of this computer
    const used = new Set((await this.cache.troupeIds()).map(String));
    let id = Date.now() % 1048575 + 1; while (used.has(String(id)) || id === 524288) id = id % 1048575 + 1;
    this.inst = id; this.setParam('param43', id, true); this.cache.beat(id, this.sess);
    this.pc.sendStoredStateValue('instance', id); this.stored.instance = id;
    return id;
  }
  // (V6.4) during the opening, a value from the host for a setting the troupe keeps, other than the troupe's, and not moved by Mat
  guarded (id, v) {
    if (!KEEP.includes(id) || !this.savedParams || this.touched.has(id) || performance.now() - this.t0 > KEEP_MS) return false;
    const sv = this.savedParams[id]; return Number.isFinite(sv) && !(Math.abs(v - sv) <= 1e-4);
  }
  // (V6.4) the troupe's settings put back (at opening, once the troupe is known)
  applySaved () {
    if (!this.savedParams) return;
    for (const id of KEEP) { const sv = this.savedParams[id]; if (Number.isFinite(sv) && !this.touched.has(id) && !(Math.abs(this.v(id, NaN) - sv) <= 1e-4)) { this.reasserted += 1; this.setParam(id, sv, true); } }
  }
  // (V6.4) a setting Mat moves himself
  userSet (id, v) { this.touched.add(id); this.setParam(id, v, true); }
  saveTroupeSoon () { clearTimeout(this.saveTimer); this.saveTimer = setTimeout(() => this.saveTroupe(), 300); }
  // (V6.6) what a troupe keeps, and what a settings record keeps: its slots and the play settings of the 17 pads
  slotsNow () { const slots = {}; for (const [k, m] of Object.entries(this.meta)) if (m && m.hash) slots[k] = { name: m.name, frames: m.frames, hash: m.hash, from: m.from || null, gen: m.gen || 0, remut: m.remut || null, dose: m.dose || null, ...(m.sp ? { sp: true } : {}), ...(m.bpm > 0 ? { bpm: m.bpm } : {}), ...(m.scale >= 0 ? { scale: m.scale } : {}), ...(m.mscale >= 0 ? { mscale: m.mscale } : {}), ...(m.deg ? { deg: m.deg } : {}) }; return slots; }
  playNow () { return { v: 1, pads: this.play.map(x => x.slice()) }; }
  stateJsonOf (slots, play) { return JSON.stringify({ slots, play }); }
  // a new state of the settings: written once, its number to param47 (a snapshot then keeps it)
  noteState (slots, play, params) {
    if (this.applyingState || !this.inst) return;
    const js = this.stateJsonOf(slots, play); if (js === this.stateJson) return;
    this.stateJson = js;
    this.cache.newState({ slots, play, params, troupe: this.inst }).then(id => {
      if (id) this.ownStates.add(id);
      if (!id || this.stateJson !== js || !this.isConnected) return;      // a newer state came meanwhile
      this.stateId = id; this.setParam('param47', id, true);
    });
  }
  // recalled (a snapshot, an automation, the project): the slots and the play settings of that moment come back
  onStateParam () {
    const n = Math.round(this.v('param47', 0)); if (!n || n === 524288) return;
    this.stateRecallAt = performance.now();
    if (!this.instReady || n === this.stateId) return;
    this.cache.getState(n).then(rec => {
      if (Math.round(this.v('param47', 0)) !== n || n === this.stateId) return;
      if (!rec || !rec.slots) { this.say(`settings #${n} are not on this computer`); return; }
      this.applyState(rec, n);
    });
  }
  applyState (rec, n) {
    this.applyingState = true; this.stateId = n;
    try {
      const slots = rec.slots || {};
      for (let k = 1; k <= 8; ++k) {
        const m = slots[k], cur = this.meta[k];
        if (m && m.hash) { if (!cur || cur.hash !== m.hash) { delete this.pcm[k]; delete this.missing[k]; } this.meta[k] = { ...m }; }
        else if (cur) { delete this.meta[k]; delete this.pcm[k]; delete this.missing[k]; }
      }
      if (rec.play && Array.isArray(rec.play.pads)) { this.troupePlay = rec.play; this.loadPlay(); }
      this.stateJson = this.stateJsonOf(this.slotsNow(), this.playNow());
      this.syncDsp(); this.drawSlots(); this.drawPads(); this.reconcile();
      this.saveTroupe();
    } finally { this.applyingState = false; }
    this.say(`settings #${n} recalled`);
  }
  // at opening: the number the host gave back (the project's, a snapshot's) — the same settings as the troupe's are adopted,
  // other ones are recalled
  // (a number this opening wrote itself — the migration of older subjects writes a few — is not a recall: measured in the bench,
  // the first of them, still in param47 when the opening ended, took the slots back to one subject)
  async adoptState () {
    const n = Math.round(this.v('param47', 0)); if (!n || n === 524288 || this.ownStates.has(n)) return;
    const rec = await this.cache.getState(n); if (!rec || !rec.slots) return;
    if (Math.round(this.v('param47', 0)) !== n || this.ownStates.has(n) || n === this.stateId) return;
    const js = this.stateJsonOf(rec.slots, rec.play), cur = this.stateJsonOf(this.slotsNow(), this.playNow());
    if (js === cur) { this.stateId = n; this.stateJson = js; return; }
    this.applyState(rec, n);
  }
  saveTroupe () {
    this.saveTimer = null; if (!this.inst) return;
    const slots = this.slotsNow();
    // (V6.4) the troupe's settings: during the opening, those Mat has not moved keep the troupe's values (the host's are not his)
    const params = {}, opening = performance.now() - this.t0 <= KEEP_MS;
    for (const id of KEEP) { const sv = this.savedParams && this.savedParams[id], cur = this.values[id]; params[id] = opening && Number.isFinite(sv) && !this.touched.has(id) ? sv : Number.isFinite(cur) ? cur : sv; }
    this.savedParams = params;
    const play = this.playNow();
    this.cache.putTroupe(this.inst, { slots, play, params, t: Date.now(), owner: this.claim || '' }).then(() => this.cache.counts()).then(c => { this.dbCounts = c; });
    this.noteState(slots, play, params);
  }
  // the audio of a slot, from memory or from the disk (asynchronous: reconcile waits for it)
  loadSubject (slot) {
    if (this.pcm[slot]) return Promise.resolve(this.pcm[slot]);
    const m = this.meta[slot]; if (!m) return Promise.resolve(null);
    if (this.loading[slot]) return this.loading[slot];
    this.loading[slot] = this.cache.getSubject(m.hash).then(rec => {
      delete this.loading[slot];
      if (this.meta[slot] !== m) return null;
      if (rec && rec.W && rec.n) { this.pcm[slot] = { W: rec.W, n: rec.n }; delete this.missing[slot]; return this.pcm[slot]; }
      this.missing[slot] = true; this.say(`subject ${slot} (${m.name}) is not on this computer: load the file again`); this.drawSlots();
      return null;
    });
    return this.loading[slot];
  }

  // ------------------------------------------------------------------ contextual help: a bubble after one second without moving
  // the mouse over a control; any movement or click hides it
  bindHelp () {
    const panel = this.$('.panel'), bub = this.$('[data-bubble]');
    let last = null, target = null;
    const hide = () => { clearTimeout(this.helpTimer); bub.classList.remove('on'); };
    const show = () => {
      if (!target || !HELP[target.dataset.help]) return;
      const t = HELP[target.dataset.help], i = t.indexOf(' — ');
      bub.innerHTML = i > 0 ? `<b>${esc(t.slice(0, i))}</b> — ${esc(t.slice(i + 3))}` : esc(t);
      const r = panel.getBoundingClientRect(), sc = r.width / panel.offsetWidth || 1;
      let x = (last.x - r.left) / sc + 14, y = (last.y - r.top) / sc + 18;
      bub.style.left = '0px'; bub.style.top = '0px'; bub.classList.add('on');
      const bw = bub.offsetWidth, bh = bub.offsetHeight;
      if (x + bw > panel.offsetWidth - 8) x = Math.max(8, (last.x - r.left) / sc - bw - 10);
      if (y + bh > panel.offsetHeight - 8) y = Math.max(8, (last.y - r.top) / sc - bh - 12);
      bub.style.left = x + 'px'; bub.style.top = y + 'px';
    };
    this.on(panel, 'pointermove', e => {
      if (last && Math.abs(e.clientX - last.x) < 2 && Math.abs(e.clientY - last.y) < 2) return;
      last = { x: e.clientX, y: e.clientY }; hide();
      target = e.target && e.target.closest ? e.target.closest('[data-help]') : null;
      if (target && !down) this.helpTimer = setTimeout(show, 1000);
    });
    let down = false;
    this.on(panel, 'pointerdown', () => { hide(); target = null; down = true; }, true);
    this.on(panel, 'pointerup', () => { down = false; }, true);
    this.on(panel, 'pointercancel', () => { down = false; }, true);
    this.on(panel, 'pointerleave', () => { hide(); target = null; last = null; });
    this.on(panel, 'wheel', hide, { passive: true });
  }

  // ------------------------------------------------------------------ playback and ADSR per pad (preset state "play")
  loadPlay () {
    const st = this.troupePlay || this.stored.play;
    if (st && Array.isArray(st.pads)) st.pads.forEach((x, p) => { if (p < 17 && Array.isArray(x) && x.length >= 5 && x.every(Number.isFinite)) this.play[p] = [...x.slice(0, 5), x.length > 5 ? clamp(x[5], -1, 1) : 0, x.length > 6 && x[6] > 0.5 ? 1 : 0, x.length > 7 ? clamp(x[7], 0, 1) : 1, x.length > 8 ? clamp(x[8], -60, 12) : 0, x.length > 9 ? clamp(Math.round(x[9]), 0, 15) : 0]; });
    this.drawPlay();
  }
  savePlay () { this.playTimer = null; const v = { v: 1, pads: this.play.map(x => x.slice()) }; this.stored.play = v; this.pc.sendStoredStateValue('play', v); this.troupePlay = v; if (this.inst) this.saveTroupeSoon(); }
  // [pad, mode, A, D, S, R, pan, lacquer dry/wet — 0 when the pad's lacquer is off (V6.3), gain dB (V6.4), spare]
  sendPlay (p) { const x = this.play[p]; this.pc.sendEventOrValue('padPlay', [p === 16 ? -1 : p, x[0], x[1], x[2], x[3], x[4], x[5] || 0, x[6] > 0.5 ? clamp(x[7] ?? 1, 0, 1) : 0, clamp(x[8] ?? 0, -60, 12), clamp(Math.round(x[9] || 0), 0, 15)]); }
  // (V6.9.2) the sixteen mummers in one-shot (0) or hold (1) at once; each stays its own afterwards
  setAllModes (v) {
    for (let p = 0; p < 16; ++p) { this.play[p][0] = v; this.sendPlay(p); }
    clearTimeout(this.playTimer); this.playTimer = setTimeout(() => this.savePlay(), 400);
    this.drawPlay(); this.drawPads();
    this.say(`the sixteen mummers in ${v ? 'hold' : 'one-shot'} — each can still be changed on its own`);
  }
  setPlay (p, field, value) {
    this.play[p][field] = value; this.sendPlay(p);
    clearTimeout(this.playTimer); this.playTimer = setTimeout(() => this.savePlay(), 400);
    this.drawPlay(); this.drawPads();
  }
  // everything the DSP does not keep by itself: playback settings of the 17 pads, the analysed scale
  syncDsp () { for (let p = 0; p < 17; ++p) this.sendPlay(p); this.sendScale(); this.sendLacqMod(); this.sendMtsKeep(); }
  // (V6.6) THE LACQUER'S MOTION. Mat: « la modulation dans la laque est toujours la même … si le sample montre une périodicité
  // dans sa morphologie, le rate doit dépendre du tempo relevé sur le sample … avec parcimonie dans son index … organique, pas
  // strictement sync, humaniser » — and, asked where (life of the partials, circulatio, formants): « le numéro trois sans
  // hésiter » (all of the motion). Sent to the engine: the subject's pulse when its morphology has one (tempo2: confidence
  // ≥ 0.45), and the index that makes the lacquered partials move as much as the subject's own notes live (its amplitude life,
  // held between 1.5 dB — the lacquer stays alive — and 3 dB rms). The index for a given motion, measured in the engine on a
  // held saw (the motion of partials 1–12 between 1 and 20 Hz): 1.27 dB rms at 0.05, 1.50 at 0.08, 1.67 at 0.10, 2.17 at 0.15,
  // 2.75 at 0.20, 3.28 at 0.24 — 7.4 dB at 1, the V6.5 lacquer
  lacqModOf (f) {
    const L = clamp(Number(f && f.lifeDb) || 0, 1.5, 3), pts = [[1.27, 0.05], [1.5, 0.08], [1.67, 0.10], [2.17, 0.15], [2.75, 0.20], [3.28, 0.24]];
    let sc = 0.24; for (let i = 1; i < pts.length; ++i) if (L <= pts[i][0]) { const [a, sa] = pts[i - 1], [b, sb] = pts[i]; sc = sa + (sb - sa) * (L - a) / (b - a); break; }
    const pu = f && f.pulse, beat = pu && pu.used && pu.bpm > 15 && pu.bpm < 480 ? pu.bpm / 60 : 0;
    return [beat, sc, 0, 0];
  }
  sendLacqMod () { if (this.facts) this.pc.sendEventOrValue('lacqMod', this.lacqModOf(this.facts)); }
  // (V6.9) the degrees of ZD scale s on the analysis's tuning, as the brain sends them (worker.js, scaleOf): the keys of the
  // scale, each at the pitch its tuning gives it, rising, within 5 c counted once
  sendScaleOf (s) {
    const f = this.facts, sm = f && f.scaleMenu; if (!sm || !sm.keyCents || !f.scale || !f.zd) return;
    const mk = f.zd.masks[s], cls = []; for (let j = 0; j < 12; ++j) if ((mk >> j & 1) && sm.keyCents[j] !== null) cls.push(sm.keyCents[j]);
    cls.sort((x, y) => x - y); const deg = []; for (const c of cls) { if (1200 - c < 5) continue; if (deg.length && c - deg[deg.length - 1] < 5) continue; deg.push(c); }
    if (!deg.length) return;
    const a = new Array(64).fill(0), n = Math.min(61, deg.length); a[0] = n; a[1] = 1200; a[2] = f.scale.rootHz; for (let i = 0; i < n; ++i) a[3 + i] = deg[i];
    this.pc.sendEventOrValue('scaleIn', a);
  }
  sendScale () {
    const sc = this.facts && this.facts.scale; if (!sc || !sc.degrees || !sc.degrees.length) return;
    const n = Math.min(61, sc.degrees.length), a = new Array(64).fill(0);
    a[0] = n; a[1] = sc.period; a[2] = sc.rootHz; for (let i = 0; i < n; ++i) a[3 + i] = sc.degrees[i];
    this.pc.sendEventOrValue('scaleIn', a);
  }
  playVal (k) { return this.play[this.sel][k.local]; }
  // (V6.9 multichannel) the pairs the track has (status 95; 16 when the host does not say), the selected pad's out key
  trackPairs () { const s = this.st, n = s && s.length > 95 ? Math.round(s[95]) : 16; return n >= 1 && n <= 16 ? n : 16; }
  drawOut () {
    const el = this.$('[data-outk]'); if (!el) return;
    const b = clamp(Math.round(this.play[this.sel][9] || 0), 0, 15), tp = this.trackPairs(), fold = b >= tp, ch = this.st && this.st.length > 94 ? Math.round(this.st[94]) : 0;
    const t = fold ? `${pairTxt(b)} → 1/2` : pairTxt(b), v = el.querySelector('[data-outv]'); if (v.textContent !== t) v.textContent = t;
    el.classList.toggle('set', b > 0 && !fold); el.classList.toggle('fold', fold);
    el.title = fold ? `set on ${pairTxt(b)}, which this ${ch}-channel track does not have: sounds on 1/2 until the track has ${2 * b + 2} channels` : ch ? `${pairTxt(b)} — the track has ${ch} channels` : pairTxt(b);
  }
  openOut () {
    this.closeOverlays(); if (this.omenu) { this.omenu(); return; }
    const p = this.sel, tp = this.trackPairs(), ch = this.st && this.st.length > 94 ? Math.round(this.st[94]) : 0, cur = clamp(Math.round(this.play[p][9] || 0), 0, 15);
    const o = this.overlayAt(this.$('[data-outk]')), box = document.createElement('div'); box.className = 'omenu';
    const n = Math.max(tp, cur + 1);
    box.innerHTML = `<div class="oh">${p === SUBJ ? 'subject' : 'mummer ' + (p + 1)} → ${ch ? ch + '-channel track' : 'output pair'}</div><div class="og">${Array.from({ length: n }, (_, b) => `<div class="oi${b === cur ? ' cur' : ''}" data-ob="${b}"${b >= tp ? ' style="opacity:.5"' : ''}>${pairTxt(b)}</div>`).join('')}</div>`;
    box.style.left = Math.round(Math.min(o.x + o.w - 228, 1100 - 252)) + 'px'; box.style.top = Math.round(o.y + o.h + 4) + 'px';
    o.panel.appendChild(box);
    const close = () => { this.omenu = null; box.remove(); o.panel.removeEventListener('pointerdown', outside, true); window.removeEventListener('keydown', key, true); };
    const outside = e => { if (!box.contains(e.target) && !(e.target.closest && e.target.closest('[data-outk]'))) close(); };
    const key = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    box.addEventListener('click', e => { const it = e.target.closest('[data-ob]'); if (!it) return; close(); const b = Number(it.dataset.ob); if (b < tp || b === cur) { this.setPlay(p, 9, b); this.say(`${p === SUBJ ? 'subject' : 'mummer ' + (p + 1)} → out ${pairTxt(b)}`); } });
    setTimeout(() => o.panel.addEventListener('pointerdown', outside, true), 0); window.addEventListener('keydown', key, true);
    this.omenu = close;
  }
  drawPlay () {
    if (!this.knobs) return;
    this.drawOut();
    this.knobs.filter(k => k.local).forEach(k => this.drawKnob(k));
    // in one-shot mode the envelope is not used: its knobs are dimmed (still editable)
    const hold = this.play[this.sel][0] > 0.5;
    this.knobs.filter(k => k.local && k.local <= 4).forEach(k => k.el.classList.toggle('dim', !hold));
    // (V6.3) the lacquer: its button lit when on, its dose dimmed when off
    const lq = this.play[this.sel][6] > 0.5, lb = this.$('[data-lacq]');
    // (V6.9.2) its state on a lamp in the key (the key keeps its width: the frame holds in the column)
    if (lb) { lb.classList.toggle('on', lq); if (lb.textContent !== 'lacquer') lb.textContent = 'lacquer'; lb.title = lq ? 'lacquer on — click to switch it off' : 'lacquer off — click to switch it on'; }
    this.knobs.filter(k => k.local === 7).forEach(k => k.el.classList.toggle('dim', !lq));
    const sh = this.$('[data-selhead]'); if (sh) sh.classList.toggle('subj', this.sel === SUBJ);
    this.drawSwitches();
  }

  // ------------------------------------------------------------------ parameters
  v (id, d = 0) { return this.values[id] ?? d; }
  base () { return Math.round(this.v('param39', 36)); }
  setParam (id, value, gesture) {
    if (gesture) this.pc.sendParameterGestureStart(id);
    this.values[id] = value; this.pc.sendEventOrValue(id, value); this.onParam(id);
    if (gesture) this.pc.sendParameterGestureEnd(id);
  }
  begin (id) { this.touched.add(id); if (!this.edit.has(id)) { this.edit.add(id); this.pc.sendParameterGestureStart(id); } }
  end () { this.edit.forEach(id => this.pc.sendParameterGestureEnd(id)); this.edit.clear(); }
  onParam (id) {
    const k = this.knobs && this.knobs.find(x => x.id === id);
    if (k) this.drawKnob(k);
    const n = Number(id.slice(5));
    if (n >= 1 && n <= 32) { if (Math.floor((n - 1) / 2) === this.sel) this.drawJoy(); }
    if ((n === 45 || n === 46) && this.sel === SUBJ) this.drawJoy();
    if (id === 'param33' || id === 'param34') this.drawPop();
    if (id === 'param40' || id === 'param42' || id === 'param48') this.drawSwitches();
    if (id === 'param48') { this.drawMts(); this.drawFacts(); this.sendMtsKeep(); this.scheduleReconcile(50); }
    if (id === 'param42') this.drawOrgans();
    if (id === 'param37') { const s = Math.round(this.v('param37', 1)); if (s !== this.slot) { this.slot = s; this.drawSlots(); this.reconcile(); } }
    // the host restores the troupe number after the editor opened (deferred restore): the troupe follows it
    // (V6.6) …unless the same recall brings a settings record (param47 arrives with it): the record holds the slots and the
    // play settings of that moment, and the instance keeps its own troupe (a snapshot's troupe number may be an older troupe,
    // or another instance's)
    if (id === 'param43' && this.instReady) {
      const n = Math.round(this.v('param43', 0));
      if (n && n !== this.inst) setTimeout(() => {
        if (Math.round(this.v('param43', 0)) !== n || n === this.inst) return;
        if (performance.now() - this.stateRecallAt < 600) { this.setParam('param43', this.inst, true); return; }
        this.useTroupe(n).then(() => { this.loadPlay(); this.syncDsp(); this.drawSlots(); this.reconcile(); });
      }, 150);
    }
    if (id === 'param35' || id === 'param42') this.scheduleReconcile(id === 'param35' ? 700 : 50);
    if (KEEP.includes(id) && this.instReady && this.inst) this.saveTroupeSoon();
  }
  scheduleReconcile (t) { clearTimeout(this.recTimer); this.recTimer = setTimeout(() => this.reconcile(), t); }

  // ------------------------------------------------------------------ knobs (charter)
  norm (k, v) { const n = (v - k.min) / (k.max - k.min); return k.curve ? Math.pow(clamp(n, 0, 1), 1 / k.curve) : n; }
  denorm (k, n) { n = clamp(n, 0, 1); const u = k.curve ? Math.pow(n, k.curve) : n; return k.min + u * (k.max - k.min); }
  bindKnob (k) {
    const knob = k.el.querySelector('.knob');
    this.on(knob, 'pointerdown', e => {
      e.preventDefault(); knob.setPointerCapture(e.pointerId);
      const cur = () => k.local ? this.playVal(k) : this.v(k.id, k.def), name = () => k.local ? k.loupe + ' · ' + (this.sel === SUBJ ? 'subject' : this.sel + 1) : k.loupe;
      const y0 = e.clientY, n0 = this.norm(k, cur()); if (!k.local) this.begin(k.id); this.loupe(name(), k.fmt(cur()), n0);
      const move = ev => {
        const n = clamp(n0 + (y0 - ev.clientY) / (ev.shiftKey ? 2000 : 300), 0, 1);
        let v = this.denorm(k, n); if (k.step) v = Math.round(v / k.step) * k.step;
        if (k.local) this.setPlay(this.sel, k.local, v);
        else { this.values[k.id] = v; this.pc.sendEventOrValue(k.id, v); this.onParam(k.id); }
        this.loupe(name(), k.fmt(v), this.norm(k, v));
      };
      const up = () => { knob.removeEventListener('pointermove', move); knob.removeEventListener('pointerup', up); knob.removeEventListener('pointercancel', up); if (!k.local) this.end(); this.loupe(null); };
      knob.addEventListener('pointermove', move); knob.addEventListener('pointerup', up); knob.addEventListener('pointercancel', up);
    });
    this.on(knob, 'dblclick', () => k.local ? this.setPlay(this.sel, k.local, k.def) : this.userSet(k.id, k.def));
    this.drawKnob(k);
  }
  drawKnob (k) {
    const v = k.local ? this.playVal(k) : this.v(k.id, k.def), n = this.norm(k, v);
    const deg = n * 270 - 135; k.el.querySelector('.knob').style.setProperty('--deg', `${deg}deg`);
    k.el.querySelector('.val').textContent = k.fmt(v);
    // faceted knobs (lever, bar): each face re-lit from the upper left at the new angle
    const F = FACETS[KSTYLE[k.id]];
    if (F) for (const [f, nrm] of Object.entries(F)) k.el.querySelectorAll(`[data-f="${f}"]`).forEach(e => e.setAttribute(e.hasAttribute('stroke-width') ? 'stroke' : 'fill', litFacet(nrm, deg)));
  }
  drawSwitches () {
    [...SWITCHES, PLAYSW].forEach(s => {
      const on = (s.local !== undefined ? this.play[this.sel][s.local] : this.v(s.id)) > 0.5, el = this.$(`[data-sw="${s.id}"]`); if (!el) return;
      el.querySelectorAll('.sw-pill span').forEach(x => x.classList.toggle('on', (x.dataset.v === '1') === on)); el.classList.toggle('is-on', on);
    });
  }
  loupe (name, val, norm) {
    const s = this.$('[data-loupe]');
    if (!name) { s.classList.remove('active'); return; }
    s.classList.add('active'); this.$('[data-lname]').textContent = name; this.$('[data-lval]').textContent = val;
    this.$('[data-lbar]').style.width = Math.round(clamp(norm, 0, 1) * 100) + '%';
  }

  // ------------------------------------------------------------------ joysticks (selected mummer / troupe)
  joyIds (pad) { return pad < 0 ? ['param33', 'param34'] : pad === SUBJ ? ['param45', 'param46'] : ['param' + (pad * 2 + 1), 'param' + (pad * 2 + 2)]; }
  bindJoy (cv, padOf, big) {
    const setFrom = e => {
      const r = cv.getBoundingClientRect(), m = big ? 0.07 : 0.1;
      const x = clamp(((e.clientX - r.left) / r.width - 0.5) / (0.5 - m), -1, 1);
      const y = clamp(-((e.clientY - r.top) / r.height - 0.5) / (0.5 - m), -1, 1);
      const [ix, iy] = this.joyIds(padOf());
      this.values[ix] = x; this.values[iy] = y; this.pc.sendEventOrValue(ix, x); this.pc.sendEventOrValue(iy, y);
      big ? this.drawJoy() : this.drawPop();
      this.loupe(big ? (padOf() === SUBJ ? 'Subject' : 'Mummer ' + (padOf() + 1)) : 'Troupe', this.poleText(x, y), Math.hypot(x, y) / Math.SQRT2);
    };
    this.on(cv, 'pointerdown', e => {
      e.preventDefault(); cv.setPointerCapture(e.pointerId);
      this.joyIds(padOf()).forEach(id => this.begin(id)); setFrom(e);
      const move = ev => setFrom(ev);
      const up = () => { cv.removeEventListener('pointermove', move); cv.removeEventListener('pointerup', up); cv.removeEventListener('pointercancel', up); this.end(); this.loupe(null); };
      cv.addEventListener('pointermove', move); cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    });
    this.on(cv, 'dblclick', () => { this.joyIds(padOf()).forEach(id => this.setParam(id, 0, true)); big ? this.drawJoy() : this.drawPop(); });
  }
  poleText (x, y) {
    const parts = [];
    if (y > 0.02) parts.push('G ' + Math.round(y * 100)); if (y < -0.02) parts.push('M ' + Math.round(-y * 100));
    if (x > 0.02) parts.push('B ' + Math.round(x * 100)); if (x < -0.02) parts.push('F ' + Math.round(-x * 100));
    return parts.length ? parts.join(' · ') : 'centre';
  }
  drawJoyCanvas (cv, x, y, px, py, big, ph = PHOS_SUBJ) {
    const g = cv.getContext('2d'), W = cv.width, H = cv.height, m = (big ? 0.07 : 0.1) * W;
    g.clearRect(0, 0, W, H);
    g.strokeStyle = hexA(ph.m, 0.12); g.lineWidth = 1;
    for (let i = 1; i < 8; ++i) { const t = m + (W - 2 * m) * i / 8; g.beginPath(); g.moveTo(t, m); g.lineTo(t, H - m); g.stroke(); g.beginPath(); g.moveTo(m, t); g.lineTo(W - m, t); g.stroke(); }
    g.strokeStyle = hexA(ph.m, 0.35); g.beginPath(); g.moveTo(W / 2, m); g.lineTo(W / 2, H - m); g.moveTo(m, H / 2); g.lineTo(W - m, H / 2); g.stroke();
    const X = v => W / 2 + v * (W / 2 - m), Y = v => H / 2 - v * (H / 2 - m);
    if (px !== null && (px || py)) { g.strokeStyle = 'rgba(217,104,122,0.55)'; g.setLineDash([4, 4]); g.beginPath(); g.arc(X(clamp(x + px, -1, 1)), Y(clamp(y + py, -1, 1)), big ? 9 : 4, 0, 7); g.stroke(); g.setLineDash([]); }
    g.strokeStyle = hexA(ph.g, 0.5); g.beginPath(); g.moveTo(W / 2, H / 2); g.lineTo(X(x), Y(y)); g.stroke();
    const r = big ? 11 : 5;
    const grd = g.createRadialGradient(X(x) - r / 3, Y(y) - r / 3, 1, X(x), Y(y), r);
    grd.addColorStop(0, '#ffd9df'); grd.addColorStop(1, '#b8233a');
    g.fillStyle = grd; g.beginPath(); g.arc(X(x), Y(y), r, 0, 7); g.fill();
  }
  drawJoy () {
    const [ix, iy] = this.joyIds(this.sel);
    // the troupe's joystick moves the mummers, not the subject (V6.3): no troupe offset shown for it
    this.drawJoyCanvas(this.$('[data-joy]'), this.v(ix), this.v(iy), this.sel === SUBJ ? null : this.v('param33'), this.sel === SUBJ ? null : this.v('param34'), true, phos(this.sel));
  }
  drawPop () {
    const x = this.v('param33'), y = this.v('param34');
    this.drawJoyCanvas(this.$('[data-pop]'), x, y, null, null, false);
    this.$('[data-popval]').textContent = this.poleText(x, y);
    this.drawJoy();
  }
  select (p) {
    this.sel = p;
    this.$$('.pad').forEach(el => el.classList.toggle('sel', Number(el.dataset.pad) === p));
    const sp = this.$('[data-subjpad]'); if (sp) sp.classList.toggle('sel', p === SUBJ);
    this.drawJoy(); this.drawOrgans(); this.drawPlay(); this.drawRemut();
  }

  // ------------------------------------------------------------------ MIDI (press = note held until release)
  midi (st, n, vel) { if (n >= 0 && n <= 127) this.pc.sendMIDIInputEvent('midiIn', (st << 16) | (n << 8) | vel); }
  noteOn (n, who) { if (this.held.has(who)) this.midi(0x80, this.held.get(who), 0); this.held.set(who, n); this.midiT = performance.now(); this.midi(0x90, n, 100); }
  // the note-off is sent twice (a lost note-off would leave a mummer holding in stasis; a second one is harmless)
  noteOff (who) { if (!this.held.has(who)) return; const n = this.held.get(who); this.held.delete(who); this.midiT = performance.now(); this.midi(0x80, n, 0); setTimeout(() => { if (![...this.held.values()].includes(n)) this.midi(0x80, n, 0); }, 60); }
  playing () { return this.held.size > 0 || performance.now() - (this.midiT || -1e9) < 250; }

  // ------------------------------------------------------------------ state: who must be born, who must be sent
  readyOf (k) { return !!(this.st && (k === SUBJ ? this.st[89] > 0 : this.st[40 + k] > 0)); }
  // (V6.3) the subject's own slot: its signature in the engine (status 90) follows the subject's content only
  subjSig () { const H = this.hashOf(this.slot), tv = this.tvar(false); return ((H & 0xffffff) ^ 0x5bd1e9 ^ (this.sparseNow() ? 0x2c6f3 : 0) ^ (tv ? hstr(tv) & 0xffffff : 0)) & 0xffffff || 1; }
  subjKey () { const P = this.pcm[this.slot]; return P ? `${ENGINE}:${this.hashOf(this.slot).toString(16)}:${P.n}:subject${this.sparseNow() ? ':sp' : ''}${this.tvar(false)}` : null; }
  // (V6.6) a pulse read on 3 to 5 attacks (tempo2) changes what is born from that subject (the grid of the writings, the
  // loop's length on the beat): its mummers have their own place in the cache and their own signature in the engine — the
  // other subjects keep theirs (nothing else in the brain changed). Known from the analysis, kept in the slot (sp) so that
  // a reopening asks for the right mummers before the analysis is back
  sparseOf (f) { return !!(f && f.pulse && f.pulse.used && f.pulse.sparse); }
  sparseNow () { const m = this.meta[this.slot]; return this.facts ? this.sparseOf(this.facts) : !!(m && m.sp); }
  // gen : la génération de la troupe de ce sujet (0 : la première ; un double-clic sur l'emplacement en fait naître une autre)
  params () { const m = this.meta[this.slot], accord = this.v('param42', 0) > 0.5; return { miroir: Math.round(clamp(this.v('param35', 1), 0, 1) * 100) / 100, accord, gen: (m && m.gen) || 0, sparse: this.sparseNow(), tv: this.tvar(accord), remut: Array.from({ length: 16 }, (_, k) => (m && m.remut && m.remut[k]) || 0), doses: Array.from({ length: 16 }, (_, k) => this.dosesOf(k)), cents: Array.from({ length: 16 }, (_, k) => { const d = this.degOf(k); return d ? d.c : null; }) }; }
  // (V6.4) the doses Mat set by hand on a mummer's genes (the report's bars): valid for the re-mutation they were set on
  dosesOf (k) { const m = this.meta[this.slot], e = m && m.dose && m.dose[k]; return e && Array.isArray(e.d) && (e.r || 0) === this.remutOf(k) ? e.d : null; }
  doseKey (d) { if (!d) return ''; let h = 2166136261 >>> 0; for (const v of d) { const x = Math.round(clamp(v, 0, 1) * 1000); h ^= x; h = Math.imul(h, 16777619) >>> 0; h ^= 31; h = Math.imul(h, 16777619) >>> 0; } return h.toString(36); }
  // (V6.2) a re-mutated pad has its own signature in the DSP and its own place in the cache
  remutOf (k) { const m = this.meta[this.slot]; return (m && m.remut && m.remut[k]) || 0; }
  wantK (k) { const r = this.remutOf(k), d = this.dosesOf(k), g = this.degOf(k), w = this.want; if ((!r && !d && !g) || w === null) return w; let x = w; if (r) x = (x ^ Math.imul(r * 16 + k + 1, 0x2545F491)) & 0xffffff; if (d) x = (x ^ Math.imul((parseInt(this.doseKey(d), 36) >>> 0) | 1, 0x27d4eb2d) ^ (k + 1)) & 0xffffff; if (g) x = (x ^ Math.imul((Math.round(g.c * 100) + 0x100000) | 1, 0x165667B1) ^ ((k + 1) << 4)) & 0xffffff; if (x === w) x ^= 1; return x; }
  kKey (k) { const r = this.remutOf(k), d = this.dosesOf(k), g = this.degOf(k); return (r ? `${k}:r${r}` : `${k}`) + (d ? `:d${this.doseKey(d)}` : '') + (g ? `:a${Math.round(g.c * 100)}` : ''); }
  sigOf (hash, p) { return ((hash ^ Math.imul(p.gen || 0, 0x9E3779B1) ^ (p.sparse ? 0x5bd1 : 0) ^ (p.tv ? hstr(p.tv) : 0)) & 0xffff) * 256 + (p.accord ? 128 : 0) + Math.round(p.miroir * 100); }
  // ------------------------------------------------------------------ (V6.9) set by hand on a subject: tempo, scale, degrees
  // Kept in the slot (bpm, scale, deg) with the troupe and in the settings records (snapshots). With nothing set, every key
  // and every signature is the one of V6.8: the same mummers, from the cache.
  tuneOf (slot = this.slot) { const m = this.meta[slot]; return { bpm: m && m.bpm > 0 ? m.bpm : 0, scale: m && Number.isInteger(m.scale) && m.scale >= 0 ? m.scale : -1, mscale: m && Number.isInteger(m.mscale) && m.mscale >= 0 ? m.mscale : -1 }; }
  mtsActive () { return this.v('param48', 0) > 0.5 && !!(this.mts && this.mts.state > 0 && this.mts.hz); }
  tuneMsg () { const t = this.tuneOf(), on = this.mtsActive(); return { bpm: t.bpm, scale: t.scale, mts: on ? { hz: this.mts.hz, name: this.mts.name } : null, ...(on && t.mscale >= 0 ? { mscale: t.mscale } : {}) }; }
  // what the hand settings add to the keys ('' when none): the tempo and the scale for every birth; the master's notes for the
  // births of the Tuning switch (they give the degrees)
  tvar (accord, slot = this.slot) { const t = this.tuneOf(slot); let v = ''; if (t.bpm) v += ':t' + Math.round(t.bpm * 100); if (t.scale >= 0) v += ':s' + t.scale; if (accord && this.mtsActive()) v += ':m' + this.mts.key + (t.mscale >= 0 ? ':ms' + t.mscale : ''); return v; }
  // the degrees in use: the master's when MTS-ESP gives them, otherwise the scale's (the chosen one, or the analysis's)
  domKey () { const t = this.tuneOf(); if (this.mtsActive()) return 'm' + this.mts.key + (t.mscale >= 0 ? '/' + t.mscale : ''); return 's' + (t.scale >= 0 ? t.scale : 'a'); }
  // (1.0) a ZD scale the master can carry (its tonic and every key on one of its notes)
  mtsPlayable (s) { const f = this.facts, M = f && f.mtsMenu, zd = f && f.zd; if (!M || !zd || !(s >= 0)) return false; const mk = zd.masks[s]; return !!(mk & 1) && !(mk & ~M.avail); }
  // a degree chosen by hand for mummer k (Tuning: scale), valid on the degrees it was chosen on
  degOf (k) { if (k === SUBJ || !(this.v('param42', 0) > 0.5)) return null; const m = this.meta[this.slot], e = m && m.deg && m.deg[k]; return e && e.d === this.domKey() && Number.isFinite(e.c) ? e : null; }
  // the index, in the degrees shown, of the degree mummer k is born on (or would be)
  degIndex (k) {
    const f = this.facts, D = f && f.degrees; if (!D || !D.cents.length) return -1;
    const e = this.degOf(k); if (e && e.i >= 0 && e.i < D.cents.length && Math.abs(D.cents[e.i] - e.c) < 0.02) return e.i;
    const c = e ? e.c : f.accord ? f.accord[k] : null; if (!Number.isFinite(c)) return -1;
    let b = 0; D.cents.forEach((x, i) => { if (Math.abs(x - c) < Math.abs(D.cents[b] - c)) b = i; }); return b;
  }
  defIndex (k) { const f = this.facts, D = f && f.degrees; if (!D || !f.accord) return -1; const c = f.accord[k]; let b = 0; D.cents.forEach((x, i) => { if (Math.abs(x - c) < Math.abs(D.cents[b] - c)) b = i; }); return b; }
  setDegree (k, i) {
    const m = this.meta[this.slot], f = this.facts, D = f && f.degrees; if (!m || !D || k === SUBJ || !(this.v('param42', 0) > 0.5)) return;
    i = clamp(Math.round(i), 0, D.cents.length - 1); if (i === this.degIndex(k)) return;
    const back = i === this.defIndex(k);
    m.deg = Array.from({ length: 16 }, (_, j) => (j === k ? (back ? null : { d: this.domKey(), i, c: D.cents[i] }) : (m.deg && m.deg[j]) || null));
    if (m.deg.every(x => !x)) delete m.deg;
    delete this.kids[k]; delete this.errors[k];
    this.saveTroupe(); this.reconcile(); this.drawPads(); this.drawOrgans();
    this.say(`mummer ${k + 1}: degree ${D.labels[i]} (${fmtC(D.cents[i])})${back ? ' — the ladder\'s own' : ''} — born again`);
  }
  setTempo (v) {
    const m = this.meta[this.slot], f = this.facts; if (!m) { this.say('load a subject first'); return; }
    const ana = f && f.pulse && f.pulse.ana && f.pulse.ana.used ? f.pulse.ana.bpm : 0;
    if (v !== 0 && !(v >= 20 && v <= 400)) { this.say('a tempo between 20 and 400 BPM'); return; }
    v = Math.round(v * 100) / 100;
    const back = !v || (ana && Math.abs(v - ana) < 0.005);
    if (back ? !m.bpm : m.bpm === v) return;
    if (back) delete m.bpm; else m.bpm = v;
    // the engine's lacquer and GESTURE follow at once (the brain's facts confirm it once the subject is read again)
    if (f) { const a = this.lacqModOf(back ? { ...f, pulse: f.pulse && f.pulse.ana ? { ...f.pulse, bpm: f.pulse.ana.bpm, used: f.pulse.ana.used } : f.pulse } : { ...f, pulse: { ...(f.pulse || {}), bpm: v, used: true } }); this.pc.sendEventOrValue('lacqMod', a); }
    this.kids = {}; this.saveTroupe(); this.reconcile(); this.drawFacts(); this.drawPads();
    this.say(back ? 'tempo: back to the analysis — the troupe on its pulse' : `tempo ${v.toFixed(2)} BPM typed — the troupe is born again on it`);
  }
  setScale (s) {
    if (this.mtsActive()) { this.setMtsScale(s); return; }
    const m = this.meta[this.slot], f = this.facts, sm = f && f.scaleMenu; if (!m || !sm) return;
    const back = s < 0 || s === sm.proposed;
    if (back ? !(m.scale >= 0) : m.scale === s) return;
    if (back) delete m.scale; else m.scale = s;
    this.sendScaleOf(back ? sm.proposed : s);          // the poles retuned at once
    this.kids = {}; this.saveTroupe(); this.reconcile(); this.drawFacts(); this.drawPads();
    this.say(back ? `scale: back to the analysis's (${sm.proposedName})` : `scale ${f.zd.names[s]} — the poles retuned, the troupe born again on it`);
  }
  // (1.0) a ZD scale laid on the MTS-ESP master's notes (Mat: « pour les tunings à 12 notes, toutes les scales de 3 à 12 notes
  // doivent pouvoir être sélectionnées »), its own choice beside the scale chosen on the analysis: s < 0, all the master's notes
  setMtsScale (s) {
    const m = this.meta[this.slot], f = this.facts, M = f && f.mtsMenu; if (!m || !M) return;
    const back = !(s >= 0);
    if (!back && !this.mtsPlayable(s)) return;
    if (back ? !(m.mscale >= 0) : m.mscale === s) return;
    if (back) delete m.mscale; else m.mscale = s;
    this.sendMtsKeep();                                 // the poles on the scale's notes at once
    if (this.v('param42', 0) > 0.5) this.kids = {};     // only the tuned troupe (Tuning: scale) is born on the master's notes
    this.saveTroupe(); this.reconcile(); this.drawFacts(); this.drawPads();
    this.say(back ? 'scale: every note of the MTS-ESP master again' : `scale ${f.zd.names[s]} laid on the MTS-ESP master from ${tonicTxt(M.tonic)} — the poles retuned${this.v('param42', 0) > 0.5 ? ', the troupe born again on it' : ''}`);
  }
  // the engine's poles on the notes of that scale only: [on, then 1 for each of the 128 notes kept] (off: every note)
  sendMtsKeep () {
    const f = this.facts, M = f && f.mtsMenu, zd = f && f.zd, s = this.tuneOf().mscale, a = new Array(129).fill(0);
    if (this.mtsActive() && M && zd && this.mtsPlayable(s)) { const mk = zd.masks[s]; a[0] = 1; for (let j = 0; j < 12; ++j) if ((mk >> j & 1) && M.keyNotes[j]) for (const n of M.keyNotes[j]) a[1 + n] = 1; }
    this.pc.sendEventOrValue('mtsKeep', a);
  }
  // (V6.9) the MTS-ESP master, as the engine sees it (the plugin's native client): [state (−1 no client, 0 no master,
  // 1 master), 128 note frequencies, name length, name characters]
  onMts (v) {
    const st = Math.round(v[0]), hz = st > 0 ? Array.from(v.slice(1, 129), x => Math.round(x * 1e4) / 1e4) : null, n = clamp(Math.round(v[129] || 0), 0, 48);
    let name = ''; for (let i = 0; i < n; ++i) name += String.fromCharCode(Math.round(v[130 + i]));
    const key = hz ? (hstr(hz.join(',')) >>> 0).toString(36) : '', was = this.mts, act0 = this.mtsActive(), k0 = act0 ? was.key : '';
    this.mts = { state: st, hz, name, key };
    const act1 = this.mtsActive();
    if (!was || was.name !== name || was.state !== st || was.key !== key) { this.drawMts(); this.drawFacts(); }
    if (act0 !== act1 || (act1 && k0 !== key)) this.scheduleReconcile(60);
  }
  drawMts () {
    const el = this.$('[data-mtsname]'); if (!el) return;
    const on = this.v('param48', 0) > 0.5, M = this.mts, st = M ? M.state : -1;
    const txt = st < 0 ? (on ? 'MTS-ESP: plugin only' : '') : st === 0 ? (on ? 'no master: analysis kept' : 'no MTS-ESP master') : (on ? '' : 'master: ') + (M.name || 'unnamed tuning');
    el.textContent = txt || '\u00a0'; el.title = st > 0 ? 'MTS-ESP master: ' + (M.name || 'unnamed tuning') : txt;
    el.classList.toggle('on', on && st > 0); el.classList.toggle('off', !on || st <= 0);
  }
  reconcile () {
    const s = this.st; if (!s || !this.stateLoaded || !this.instReady) return;
    // Mockery and Tuning must be known before deciding who is born (otherwise a wrong troupe would start)
    if (this.paramWait && !(this.gotParams.has('param35') && this.gotParams.has('param42') && this.gotParams.has('param48'))) return;
    // (V6.9) the master's notes give the degrees: they are awaited from the engine (2 s at most) before a tuned troupe is asked
    if (this.v('param42', 0) > 0.5 && this.v('param48', 0) > 0.5 && !this.mts && performance.now() - this.t0 < 2000) { this.scheduleReconcile(200); return; }
    // the subject's audio is being read from the disk: nothing is decided (and nothing is cleared in the DSP) until it is here
    if (!this.pcm[this.slot] && this.meta[this.slot] && !this.missing[this.slot]) { this.loadSubject(this.slot).then(() => this.reconcile()); return; }
    const P = this.pcm[this.slot] || null;
    if (!P) {
      if (s[80] >= 0 || this.anyReady()) { this.sender.reset(); this.sender.push({ kind: 'stream', target: -1, pcm: new Int32Array(0), peak: 1, sig: -1 }); }
      this.brain.stop(); this.facts = null; this.pop = null; this.kids = {}; this.want = null;
      this.drawFacts(); this.drawOrgans(); return;
    }
    const H = this.hashOf(this.slot), pSig = H & 0xffffff;
    if (s[80] !== pSig && !(this.sender.pending(-1) && this.sender.pending(-1).sig === pSig)) {
      this.sender.reset();
      this.sender.push({ kind: 'stream', target: -1, pcm: P.W, nFrames: P.n, peak: 1, sig: pSig, done: () => this.say(`subject ${this.slot} sent to the engine`) });
      this.kids = {};
    }
    if (!this.brain.parent || this.brain.parent.id !== pSig) {
      const { L, R } = unpack24(P.W, P.n);
      this.facts = null; this.pop = null; this.drawFacts();
      this.drawParentWave(L, R);
      this.brain.setParent(pSig, L, R, this.tuneMsg());
    } else this.brain.retune(this.tuneMsg());
    const p = this.params(), want = this.sigOf(H, p);
    this.want = want;
    // (V6.4) diagnosis: what the engine still held when this editor first decided (after a reopening: an engine kept, or emptied)
    if (!this.dspAtOpen) { let held = 0, other = 0; for (let k = 0; k < 16; ++k) { if (s[80] === pSig && s[64 + k] === this.wantK(k)) held++; else if (s[64 + k] > 0) other++; } this.dspAtOpen = { held, other, parent: s[80] === pSig, at: Math.round(performance.now() - this.t0) }; }
    this.brain.design(p.miroir, p.accord, p.gen);
    const need = [];
    for (let k = 0; k < 16; ++k) {
      const wk = this.wantK(k), inDsp = s[64 + k] === wk && s[80] === pSig;
      const coming = this.sender.pending(k) && this.sender.pending(k).sig === wk;
      if (!inDsp && !coming) need.push(k);
    }
    // (V6.3) the subject's own slot (the 17th pad): the subject itself with its anatomy and lacquer, once per subject
    { const ss = this.subjSig(), inDsp = s[90] === ss && s[80] === pSig, coming = this.sender.pending(SUBJ) && this.sender.pending(SUBJ).sig === ss;
      if (!inDsp && !coming) need.push(SUBJ); }
    // (V6.4) the pads kept from an earlier version still to be checked (their birth asked again: a decision that took over
    // before the births were asked must not leave them unchecked); those of another troupe or another dose are forgotten
    for (const q of Object.keys(this.stale)) { const k = Number(q), st = this.stale[k]; if (st.token !== want || st.sig !== (k === SUBJ ? this.subjSig() : this.wantK(k))) delete this.stale[k]; }
    const recheck = Object.keys(this.stale).map(Number).filter(k => !need.includes(k));
    // the cache first; only the mummers it lacks are born
    const pk = this.cache.popKey(H, P.n, p), seq = ++this.recSeq, sk = this.subjKey();
    this.popKey = pk; this.cache.protect([pk, sk, ...this.wornKeys()]);
    if (!need.length) { this.brain.births(want, p, recheck); return; }
    (async () => {
      const missing = [];
      for (const k of need) {
        const rec = k === SUBJ ? await this.cache.get(sk, 'subject') : await this.cache.get(pk, this.kKey(k));
        if (seq !== this.recSeq || this.want !== want) return;          // another decision took over
        // (V6.9.2) a mummer kept by an earlier version with a gene that has changed since (the isoperiodicity): it plays at once
        // and is born again (replaced only if its sound changed) — every other one is kept as it is
        if (rec && rec.pcm && rec.pcm.length && k !== SUBJ && (rec.gv || 0) < GENE_VERSION && Array.isArray(rec.genome) && rec.genome.some(g => GENE_CHANGED.includes(g))) {
          this.staleHits += 1; this.stale[k] = { rec, token: want, sig: this.wantK(k) }; this.onChild({ ...rec, k, token: want, remut: this.remutOf(k), doses: this.dosesOf(k), fromCache: true, stale: true }); missing.push(k); continue;
        }
        if (rec && rec.pcm && rec.pcm.length) { this.cache.hits += 1; this.tally(k === SUBJ ? 'subject' : pk, 'r'); this.onChild({ ...rec, k, token: want, remut: this.remutOf(k), doses: k === SUBJ ? null : this.dosesOf(k), fromCache: true }); continue; }
        this.tally(k === SUBJ ? 'subject' : pk, 'm');
        // (V6.4) nothing under this version: the same mummer kept by an earlier version plays at once, and is born again
        const old = await this.cache.getOlder(k === SUBJ ? sk : pk, k === SUBJ ? 'subject' : this.kKey(k));
        if (seq !== this.recSeq || this.want !== want) return;
        if (old) { this.staleHits += 1; this.stale[k] = { rec: old, token: want, sig: k === SUBJ ? this.subjSig() : this.wantK(k) }; this.onChild({ ...old, k, token: want, remut: this.remutOf(k), doses: k === SUBJ ? null : this.dosesOf(k), fromCache: true, stale: true }); }
        missing.push(k);
      }
      this.brain.births(want, p, [...missing, ...recheck.filter(k => !missing.includes(k))]);
    })();
  }
  anyReady () { for (let k = 0; k < 16; ++k) if (this.readyOf(k)) return true; return false; }
  // the populations the troupe wears: every filled slot at the current Mockery and Tuning, at its own generation
  wornKeys () {
    const p = this.params(), out = [];
    for (const [slot, m] of Object.entries(this.meta)) if (m && m.hash && this.pcm[slot]) { try { out.push(this.cache.popKey(this.hashOf(Number(slot)), this.pcm[slot].n, { ...p, gen: m.gen || 0, sparse: Number(slot) === this.slot ? p.sparse : !!m.sp, tv: this.tvar(p.accord, Number(slot)) })); } catch (e) { /* not read yet */ } }
    return out;
  }
  onFacts (f) {
    const m = this.meta[this.slot], was = m ? !!m.sp : false;
    this.facts = f; this.sendScale(); this.sendLacqMod(); this.sendMtsKeep(); this.drawFacts(); this.drawPads(); this.drawOrgans();
    const sp = this.sparseOf(f);
    if (m && was !== sp) { m.sp = sp; this.saveTroupeSoon(); this.reconcile(); }
  }
  onPopulation (m) {
    const p = this.params();
    if (Math.round(m.miroir * 100) !== Math.round(p.miroir * 100) || m.accord !== p.accord || (m.gen || 0) !== (p.gen || 0)) return;
    this.pop = m.kids; this.drawOrgans();
  }
  onChild (m) {
    if (m.token !== this.want) return;
    // a birth asked before the pad was re-mutated again: dropped, and the pad asked for anew
    if ((m.remut || 0) !== this.remutOf(m.k)) { this.scheduleReconcile(30); return; }
    if (m.k !== SUBJ && this.doseKey(m.doses || null) !== this.doseKey(this.dosesOf(m.k))) { this.scheduleReconcile(30); return; }
    // (V6.9) a birth asked before this mummer's degree was changed by hand
    if (m.k !== SUBJ && !m.fromCache && m.accordCents !== undefined) { const g = this.degOf(m.k); if ((g ? g.c : null) !== (m.cents ?? null)) { this.scheduleReconcile(30); return; } }
    delete this.pendingGenes[m.k];
    // (V6.4) a mummer restored from an earlier version, now born under this one: if its sound is the same word for word, the DSP
    // keeps what it plays (no cut); otherwise the new one replaces it
    const subj0 = m.k === SUBJ, st0 = this.stale[m.k];
    let same = false, replaced = false;
    if (!m.stale) delete this.stale[m.k];
    if (!m.fromCache && st0 && st0.token === m.token && st0.sig === (subj0 ? this.subjSig() : this.wantK(m.k))) {
      // (the words AND what the DSP reads with them: the level of full scale, the lengths, the hold loop, the anatomy)
      const o = st0.rec, keys = ['peak', 'childLen', 'loopStart', 'loopLen', 'loopSeamless', 'anaFrames'];
      same = keys.every(q => o[q] === m[q]) && o.pcm.length === m.pcm.length && o.pcm.every((x, i) => x === m.pcm[i]); replaced = !same;
    }
    this.kids[m.k] = { stale: !!m.stale, checked: same, replaced, desc: m.desc, genome: m.genome, genes: m.genes || null, genes0: m.genes0 || null, active: m.active || null, layers: m.layers, gainDb: m.gainDb, ms: m.ms, accordCents: m.accordCents,
      dur: m.childLen / FS, loopStart: m.loopStart / FS, sig: m.token, fromCache: !!m.fromCache, gesteLevel: m.gesteLevel, anaCounts: m.anaCounts, lacquer: m.lacquer || null };
    delete this.errors[m.k];
    if (!m.fromCache) { this.birthMs.push(m.ms); this.tally(m.k === SUBJ ? 'subject' : this.popKey, 'b'); }
    // boucle du son réel (v5.5) : le DSP y entre et en sort sans fondu — signalé par un début de boucle négatif (−(début + 1))
    const subj = m.k === SUBJ;
    if (!same) this.sender.push({ kind: 'stream', target: m.k, pcm: m.pcm, nFrames: m.childLen, peak: m.peak, loopStart: m.loopSeamless ? -(m.loopStart + 1) : m.loopStart, loopLen: m.loopLen, anaFrames: m.anaFrames, sig: subj ? this.subjSig() : this.wantK(m.k) });
    if (this.cache.status !== 'ok' && !subj) this.kidPcm[m.k] = { pcm: m.pcm, childLen: m.childLen, peak: m.peak };   // for adoption, without cache
    if (!m.fromCache && (subj ? this.subjKey() : this.popKey)) {
      const { pcm, peak, childLen, loopStart, loopLen, loopSeamless, anaFrames, gesteLevel, anaCounts, desc, genome, genes, genes0, active, doses, layers, gainDb, accordCents, ms, lacquer, gv } = m;
      this.cache.put(subj ? this.subjKey() : this.popKey, subj ? 'subject' : this.kKey(m.k), { format: REC_FORMAT, pcm, peak, childLen, loopStart, loopLen, loopSeamless, anaFrames, gesteLevel, anaCounts, desc, genome, genes, genes0, active, doses, layers, gainDb, accordCents, ms, lacquer, gv: gv || 0 });
    }
    if (m.k === this.sel) this.drawOrgans();
  }
  // (V6.2) one mummer born again by other techniques (genetique.js, redesignKid); the others stay
  remutate (k, d) {
    const m = this.meta[this.slot]; if (!m || !this.pcm[this.slot]) { this.say('load a subject first'); return; }
    const r0 = (m.remut && m.remut[k]) || 0, r = Math.max(0, r0 + d); if (r === r0) return;
    m.remut = Array.from({ length: 16 }, (_, i) => i === k ? r : (m.remut && m.remut[i]) || 0);
    if (m.dose && m.dose[k]) m.dose = m.dose.map((x, i) => (i === k ? null : x));
    delete this.kids[k]; delete this.errors[k]; delete this.pendingGenes[k];
    this.saveTroupe(); this.reconcile(); this.drawPads(); this.drawOrgans(); this.drawRemut();
    this.say(r ? `mummer ${k + 1}: re-mutation ${r}` : `mummer ${k + 1}: back to its first birth`);
  }
  drawRemut () { const b = this.$('[data-remut]'); if (!b) return; const r = this.remutOf(this.sel), t = r ? `re-mutate · ${r}` : 're-mutate'; if (b.textContent !== t) b.textContent = t; }
  birthFailed (k, msg) { this.errors[k] = msg; this.say(k === SUBJ ? `the subject's own slot could not be prepared: ${msg}` : `mummer ${k + 1} could not be born: ${msg}`); }

  // ------------------------------------------------------------------ drawing
  // (V6.5) the engine is silent: no status for 1.5 s (it sends one every 0.1 s while the host runs it)
  engineAsleep () { const L = this.link; return !!(L && L.tSt && performance.now() - L.tSt > 1500); }
  drawStatus () {
    const s = this.st, el = this.$('[data-st]'), bar = this.$('[data-bar]'); if (!el) return;
    const ASLEEP = 'engine silent: the host is not running it (window hidden?)';
    if (!s) { const w = performance.now() - this.t0 > 4000 ? 'waiting for the engine: the host is not running it (window hidden?)' : 'waiting for the engine'; if (el.textContent !== w) el.textContent = w; this.diag(w); return; }
    const cur = this.sender.cur, parts = []; let prog = 1;
    if (this.engineAsleep()) parts.push(ASLEEP);
    const m = this.meta[this.slot];
    if (!this.instReady) parts.push('reading the troupe…');
    else if (!m) parts.push('slot ' + this.slot + ' is empty');
    else if (this.missing[this.slot]) parts.push('subject ' + this.slot + ' is not on this computer');
    else if (!this.pcm[this.slot]) parts.push('restoring the subject…');
    else if (!this.facts) parts.push('analysing the subject…');
    const busy = this.brain.busyKs(), left = this.brain.queue.length;
    if (busy.length || left) {
      // a long birth shows its age (a 20 s subject with many strata can take a minute: it is working, not stuck)
      const now = performance.now(), jobs = this.brain.busyJobs();
      parts.push(`births: ${busy.length + left} to come · being born ${jobs.map(j => (j.k === SUBJ ? 'subject pad' : j.k + 1) + (j.t0 && now - j.t0 > 5000 ? ` (${Math.round((now - j.t0) / 1000)} s)` : '')).join(', ') || '—'}`);
      prog = (16 - busy.length - left) / 16;
    }
    if (cur && cur.kind === 'stream' && cur.chunks) {
      const pc = Math.round(100 * (cur.sent || 0) / cur.chunks);
      parts.push(cur.target < 0 ? `sending the subject ${pc} %` : cur.target === SUBJ ? `sending the subject pad ${pc} %` : `sending mummer ${cur.target + 1} ${pc} %`);
      if (!busy.length && !left) prog = (cur.sent || 0) / cur.chunks;
    }
    if (!parts.length) {
      let n = 0; for (let k = 0; k < 16; ++k) if (s[40 + k] > 0 && s[64 + k] === this.wantK(k)) n += 1;
      parts.push(`${n} mummers ready · ${s[5]} voice${s[5] === 1 ? '' : 's'}`);
    }
    const t = parts.join(' · ');
    if (el.textContent !== t) el.textContent = t;
    this.diag(t);
    bar.style.width = Math.round(clamp(prog, 0, 1) * 100) + '%';
  }
  // diagnostics readable by the host's probe (page title, invisible in the plugin)
  diag (t) {
    const mode = this.brain.inline ? 'main thread' : 'workers ' + this.brain.workers.length + '/' + this.brain.maxWorkers();
    const st = this.sender.stats, sa = st.reduce((a, x) => a + x.sec, 0), sm = st.reduce((a, x) => a + x.ms, 0), sr = st.reduce((a, x) => a + x.rewinds, 0);
    const bm = this.birthMs.length ? this.birthMs.reduce((a, x) => a + x, 0) / this.birthMs.length / 1000 : 0;
    const perf = ` · ${st.length} transfers: ${sa.toFixed(1)} s of audio in ${(sm / 1000).toFixed(1)} s, ${sr} resends · ${this.birthMs.length} births, mean ${bm.toFixed(1)} s`;
    const L = this.link || { st: 0, tel: 0, ack: 0, lag: 0 }, now = performance.now(), age = x => (x ? ((now - x) / 1000).toFixed(1) + ' s ago' : 'never'), lv = this.sender.live;
    const link = ` · link: status ${L.st} (${age(L.tSt)}), telemetry ${L.tel} (${age(L.tTel)}), acks ${L.ack} (${age(L.tAck)}), page late ${Math.round(L.lag)} ms, ${document.visibilityState}, ${L.rate || ''}` +
      (this.sender.cur && lv ? ` · stream ${this.sender.cur.target}: ack ${lv.a}/${lv.chunks} high ${lv.high} sent ${lv.next} window ${lv.W} rtt ${lv.rtt} ms serial ${lv.serial}/${lv.ackSer} headers ${this.sender.hdrs} longest pause ${Math.round(this.sender.gapMax || 0)} ms` : '');
    const title = 'Charivari 1.0.1 · ' + t + perf + link + ' · ' + mode + ' (test ' + this.workerTest + ') · cache ' + this.cache.status + ' (' + this.cache.hits + ' restored' + (this.staleHits ? ', ' + this.staleHits + ' from the previous version' : '') + ') · diag ' + Object.entries(this.tal).map(([k, v]) => `${k} @${v.at}ms restored ${v.r} missing ${v.m} born ${v.b}`).join(' / ') + ' · writes ' + (this.cache.written || 0) + ' ok ' + (this.cache.refused || 0) + ' refused' + (this.cache.lastErr ? ' (' + this.cache.lastErr + ')' : '') + ' · streams restarted ' + (this.sender.restarts || 0) + (this.sender.wakes ? ', ' + this.sender.wakes + ' after the engine woke' : '') + (this.sender.lastRestart ? ' (' + this.sender.lastRestart + ')' : '') + (this.sender.failedStreams ? ', given up ' + this.sender.failedStreams : '') + ' · engine at opening ' + (this.dspAtOpen ? `${this.dspAtOpen.parent ? 'subject + ' + this.dspAtOpen.held + ' pads' : 'no subject'}${this.dspAtOpen.other ? ' (+' + this.dspAtOpen.other + ' others)' : ''} @${this.dspAtOpen.at}ms` : '—') + ' · orphans removed ' + (this.cache.orphans ?? '?') + ' · estimate ' + (this.cache.est ? Math.round(this.cache.est.usage / 1e6) + '/' + Math.round(this.cache.est.quota / 1e6) + ' MB' : '—') + ' · params ' + Object.entries(this.pArr).map(([k, v]) => `${k}@${v[0]}ms=${+v[1].toFixed(3)}`).join(' ') + ' · kept ' + (this.savedParams ? KEEP.map(k => `${k}=${+Number(this.savedParams[k]).toFixed(3)}`).join(' ') : '—') + ' (put back ' + this.reasserted + ')' + ' · state ' + (this.stateLoaded ? 'read' : 'awaited') + ' · troupe #' + this.inst + (this.instHow ? ' [' + this.instHow + ']' : '') + (this.dbCounts ? ` (disk: ${this.dbCounts.subjects} subjects, ${this.dbCounts.troupes} troupes, ${this.dbCounts.kids} mummers${this.cache.bytes ? `, ${Math.round(this.cache.bytes / 1e6)} MB of ${Math.round((this.cache._budget || 0) / 1e6)}` : ''}${this.cache.evicted ? `, ${this.cache.evicted} populations let go` : ''}${this.cache.refused ? `, ${this.cache.refused} writes refused` : ''})` : '') + ' · settings #' + this.stateId + ' · slot ' + this.slot + ` · mockery ${Math.round(100 * this.v('param35', 1))} shadow ${Math.round(100 * this.v('param36', 0))} note ${Math.round(this.v('param39', 36))} tuning ${this.v('param42', 0) > 0.5 ? 'scale' : 'free'}` + ` · source ${this.v('param48', 0) > 0.5 ? 'MTS-ESP' : 'analysis'} (master ${this.mts ? this.mts.state + (this.mts.name ? ' ' + this.mts.name : '') : '?'})` + ` · hand ${(() => { const t = this.tuneOf(), m = this.meta[this.slot]; return (t.bpm ? t.bpm + ' BPM ' : '') + (t.scale >= 0 ? 'scale #' + t.scale + ' ' : '') + (m && m.deg ? m.deg.filter(Boolean).length + ' degrees' : '') || '—'; })()}` + ' · scale ' + (this.st ? this.st[82] + '/' + Math.round(this.st[84]) + ' c' : '?') + ' · poles H' + (this.st ? this.st[85] : '?') + ' M' + (this.st ? this.st[86] : '?') + ' C' + (this.st ? this.st[87] : '?') +
      ' · ' + (this.$('[data-log]')?.textContent || '');
    if (document.title !== title) document.title = title;
  }
  drawSlots () {
    this.$$('.slot').forEach(el => {
      const i = Number(el.dataset.slot), m = this.meta[i];
      el.classList.toggle('on', i === this.slot); el.classList.toggle('empty', !m);
      el.querySelector('span').textContent = m ? (this.missing[i] ? '? ' : '') + (m.name || m.nom) + (m.gen ? ` · troupe ${m.gen + 1}` : '') : 'empty';
    });
  }
  drawParentWave (L, R) {
    const cv = this.$('[data-pwave]'), g = cv.getContext('2d'), W = cv.width, H = cv.height;
    g.clearRect(0, 0, W, H); if (!L || !L.length) return;
    const cols = 150, n = L.length, amp = new Float32Array(cols); let mx = 1e-9;
    for (let c = 0; c < cols; ++c) { let a = 0; const i0 = Math.floor(c * n / cols), i1 = Math.floor((c + 1) * n / cols);
      for (let i = i0; i < i1; i += 4) a = Math.max(a, Math.abs(L[i]), Math.abs(R[i])); amp[c] = a; mx = Math.max(mx, a); }
    g.fillStyle = 'rgba(95,224,232,0.75)';
    for (let c = 0; c < cols; ++c) { const h = (amp[c] / mx) * (H / 2 - 8); g.fillRect(c * W / cols + 0.5, H / 2 - h, W / cols - 1, 2 * h); }
    this.pwave = { n };
  }
  // (V6.3) the subject's playhead, on its own layer above the waveform (the DSP's telemetry 34: position, 35: stasis)
  drawSubjectHead () {
    const cv = this.$('[data-phead]'); if (!cv) return;
    const pos = this.tel && this.tel.length > 35 ? this.tel[34] : -1, st = this.tel && this.tel[35] > 0, key = pos >= 0 ? Math.round(pos * 600) + (st ? 's' : '') : 'off';
    if (key === this.pheadKey) return; this.pheadKey = key;
    const g = cv.getContext('2d'), W = cv.width, H = cv.height; g.clearRect(0, 0, W, H);
    if (pos < 0) return;
    const x = clamp(pos, 0, 1) * W; g.fillStyle = st ? '#d9687a' : '#ffd9df'; g.fillRect(x - 1, 4, 3, H - 8);
  }
  // (V6.9) the tempo and scale keys
  drawHandKeys () {
    const f = this.facts, m = this.meta[this.slot], hand = this.tuneOf(), mtsOn = this.mtsActive(), q = s => this.$(s); if (!q('[data-bpmkey]')) return;
    const pu = f && f.pulse, an = pu && pu.ana, bk = q('[data-bpmkey]'), sk = q('[data-scalekey]'), bb = q('[data-bpmback2]'), sb = q('[data-scaleback]');
    // what is set by hand shows at once (the brain's facts follow a moment later)
    const anaTxt = an && an.used ? an.bpm.toFixed(2) + ' BPM' : null;
    q('[data-bpmval]').textContent = !f || !m ? '—' : hand.bpm ? hand.bpm.toFixed(2) + ' BPM' : pu && pu.forced ? anaTxt || 'none · type one' : pu && pu.used ? pu.bpm.toFixed(2) + ' BPM' : 'none · type one';
    bk.classList.toggle('hand', !!hand.bpm); bk.classList.toggle('off', !f || !m);
    bk.title = !f ? 'load a subject first' : hand.bpm ? `typed — the analysis read ${anaTxt || 'no pulse'}` : 'click to type a tempo';
    bb.style.display = hand.bpm ? '' : 'none'; q('[data-bpmana]').textContent = an && an.used ? an.bpm.toFixed(2) : '—'; bb.title = 'back to the analysis';
    const t = f && f.tuning, sm = f && f.scaleMenu, zd = f && f.zd;
    // (1.0) on an MTS-ESP master: the scale laid on its notes, or all of them
    const mm = f && f.mtsMenu, msOk = mtsOn && this.mtsPlayable(hand.mscale);
    const name = mtsOn ? (!f ? '—' : hand.mscale >= 0 && zd ? zd.names[hand.mscale] + (msOk ? ' · MTS-ESP' : ' (not on this master)') : 'all notes · MTS-ESP: ' + (this.mts.name || 'unnamed tuning'))
      : !t ? (f ? 'no pitch to measure' : '—')
      : hand.scale >= 0 && zd && t.scaleIndex !== hand.scale ? zd.names[hand.scale]
      : hand.scale < 0 && sm && t.scaleIndex !== sm.proposed ? sm.proposedName
      : t.scaleName + (t.labels ? ' · ' + t.labels.join(' ') : '');
    q('[data-scaleval]').textContent = name;
    sk.classList.toggle('hand', mtsOn ? hand.mscale >= 0 : hand.scale >= 0 && !!t); sk.classList.toggle('off', mtsOn ? !mm || !mm.octave : !t);
    sk.title = mtsOn ? (!mm ? 'no fundamental in the subject to set a tonic on: the master\'s notes are used as they are'
        : !mm.octave ? 'this master does not come back to the octave: no ZD scale can be laid on it (all its notes are used)'
        : hand.mscale >= 0 ? `laid on the master from ${tonicTxt(mm.tonic)} — the analysis proposes ${mm.proposedName || '—'} on it` : `click to lay a scale on the master's notes, from ${tonicTxt(mm.tonic)}`)
      : !t ? '' : hand.scale >= 0 && sm ? `chosen — the analysis proposed ${sm.proposedName}` : 'click to choose a scale';
    sb.style.display = (mtsOn ? hand.mscale >= 0 : hand.scale >= 0 && t) ? '' : 'none'; sb.title = mtsOn ? 'back to all the master\'s notes' : sm ? 'back to the analysis\'s: ' + sm.proposedName : '';
  }
  drawFacts () {
    this.drawHandKeys();
    const f = this.facts, box = this.$('[data-facts]');
    const ca = this.$('[data-axes]'), a = ca.getContext('2d'), AW = ca.width, AH = ca.height;
    a.clearRect(0, 0, AW, AH);
    if (!f) { box.innerHTML = this.meta[this.slot] ? (this.missing[this.slot] ? 'this subject is not on this computer: “load a file…” again' : 'analysing the subject…') : 'empty slot: “load a file…”'; return; }
    // measured attacks on the waveform
    if (this.pwave && f.onsetTimes) {
      const cv = this.$('[data-pwave]'), g = cv.getContext('2d'), W = cv.width, dur = this.pwave.n / FS;
      g.strokeStyle = 'rgba(217,104,122,0.9)'; g.lineWidth = 2;
      for (const t of f.onsetTimes) { const x = t / dur * W; g.beginPath(); g.moveTo(x, 3); g.lineTo(x, 19); g.stroke(); }
    }
    const fx = (x, d = 0) => Number.isFinite(x) ? x.toFixed(d) : '—';
    // tuning (where the pitches are: ODDSound) and scale (which ones are played: ZD Ultimate, chosen on the measured keys)
    // the TUNING on its own line (v5.6: on the scale's line a long scale name — « 7-note set (Theoretical 7-23) » and its
    // labels — pushed it past the edge of the screen, where it was cut: the tuning was always found, it was not shown)
    // (V6.9) the tuning of an MTS-ESP master when it gives the pitches; the scale is a menu (the analysis's proposal first)
    const mtsOn = this.mtsActive(), hand = this.tuneOf(), sm = f.scaleMenu;
    const tunLine = mtsOn ? `tuning <b>MTS-ESP: ${esc(this.mts.name || 'unnamed tuning')}</b> · analysis ${f.tuning ? esc(f.tuning.name) : '—'}`
      : f.tuning ? `tuning <b>${esc(f.tuning.name)}</b>` : 'tuning <b>—</b> (no pitch to measure)';
    const tun = f.tuning ? `<span title="${esc((f.tuning.family ? f.tuning.family + ' — ' : '') + (f.tuning.lib ? f.tuning.lib + ' library' : '') + (f.tuning.alt && f.tuning.alt.length ? ' · next: ' + f.tuning.alt.join(', ') : '') + ' · tuning: ' + f.tuning.name)}"><b>${esc(f.tuning.scaleName)}</b>${f.tuning.labels ? ' (' + f.tuning.labels.join(' ') + ')' : ''}</span>${sm && sm.current !== sm.proposed ? ` <span class="hand">chosen · proposed: ${esc(sm.proposedName)}</span>` : ''}${mtsOn ? ' <span class="hand">(the master gives the degrees)</span>' : ''}` : '—';
    // (1.0) on an MTS-ESP master: the scale laid on its notes (or all of them), the analysis's beside it
    const mm = f.mtsMenu, msOk = mtsOn && this.mtsPlayable(hand.mscale);
    const scaleLine = !mtsOn ? `scale ${tun}` : `scale <b>${msOk ? esc(f.zd.names[hand.mscale]) + '</b> on the master from ' + tonicTxt(mm.tonic) : 'all the master\'s notes</b>' + (mm && !mm.octave ? ' (no octave: no ZD scale fits)' : '')} · analysis ${tun}`;
    const vib = f.vibDepth > 5 ? `vibrato ${fx(f.vibRate, 1)} Hz ± ${fx(f.vibDepth)} c` : 'no vibrato';
    // pulse (tempo2) : BPM, grid step (tatum) × per beat, the other reading of the same grid ; micro-groove of the attacks
    const pu = f.pulse, short = r => String(r).split(' (')[0];
    // (V6.9) the tempo: the analysis's as read, a click to type another one (the analysis's reading kept beside it)
    const bpmEl = v => `<b>${v}</b>`, an = pu && pu.ana;
    const pulseLine = !pu ? `pulse ${bpmEl('—')}` : pu.forced
      ? `pulse ${bpmEl(fx(pu.bpm, 2))} BPM <span class="hand">typed · analysis ${an && an.used ? fx(an.bpm, 2) : '—'}</span> · grid ${fx(pu.tatumMs, pu.tatumMs >= 100 ? 0 : 1)} ms ×${pu.perBeat}`
      : pu.used
      ? `pulse ${bpmEl(fx(pu.bpm, 2))} BPM · grid ${fx(pu.tatumMs, pu.tatumMs >= 100 ? 0 : 1)} ms ×${pu.perBeat}${pu.family && pu.family.length ? ` · or ${fx(pu.family[0].bpm, 1)} ${short(pu.family[0].ratio)}` : ''}${pu.sparse ? ` · from ${pu.sparse.n} attacks (${fx(100 * pu.sparse.chance)} % of arbitrary ones fit as well)` : ''}`
      : `pulse ${bpmEl('—')} (${fx(pu.bpm, 1)} BPM too loose: ${fx(100 * pu.conf)} %${pu.sparse ? `, ${pu.sparse.n} attacks: ${fx(100 * pu.sparse.chance)} % of arbitrary ones fit as well` : ''})`;
    const gv = pu && pu.used ? pu.groove : null;
    const grooveLine = !gv ? 'groove —' : `groove <b>± ${fx(gv.residualMs, 1)} ms</b> · per step ${gv.templateMs.map(v => fx(v, 1)).join('/')} ms${gv.swing ? ' · swing ' + fx(gv.swing, 2) : ''}${gv.outliers ? ` · ${gv.outliers} off` : ''}`;
    box.innerHTML = [
      `<b>${fx(f.dur, 2)} s</b> · active ${fx(f.activeStart, 2)}–${fx(f.activeEnd, 2)} s · read in ${f.ms} ms`,
      `fundamental <b>${esc(f.fundamentalName || '—')}</b>${f.fundamentalHz ? ' (' + fx(f.fundamentalHz, 1) + ' Hz)' : ''} · tonal <b>${fx(100 * f.tonal)} %</b>`,
      tunLine,
      scaleLine,
      `attacks <b>${f.onsets}</b> (${f.sharpOnsets} sharp) · notes ${f.notes} · range ${fx(f.pitchRangeCents)} c`,
      pulseLine, grooveLine,
      `${vib} · life ± ${fx(f.lifeCents)} c / ${fx(f.lifeDb, 1)} dB`,
      `brightness ${fx(f.centroid)} Hz · formants ${f.formants && f.formants.length ? f.formants.map(x => Math.round(x)).join(' · ') + ' Hz' : '—'}`,
      f.room ? (f.room.measured ? `room <b>${f.room.t60.map(x => fx(x, 2)).join(' / ')} s</b> (low / mid / high, ${f.room.tails} tail${f.room.tails === 1 ? '' : 's'}${Number.isFinite(f.room.tailDb) ? ', ' + fx(f.room.tailDb) + ' dB' : ''})${f.room.near + f.room.far ? ` · planes ${f.room.near} near / ${f.room.far} far` : ''}` : 'room <b>—</b> (no free tail to measure)') : 'room —'
    ].map(x => `<div>${x}</div>`).join('');
    const AX = [
      ['tonality', f.tonal, fx(100 * f.tonal) + ' %'], ['partials', f.nHarm / 24, fx(f.nHarm)],
      ['attacks', f.onsetRate / 8, fx(f.onsetRate, 1) + '/s'], ['range', f.pitchRangeCents / 2400, fx(f.pitchRangeCents) + ' c'],
      ['vibrato', f.vibDepth / 60, fx(f.vibDepth) + ' c'], ['life', f.lifeDb / 6, fx(f.lifeDb, 1) + ' dB'],
      ['brightness', Math.log2(Math.max(1, f.centroid / 100)) / 6, fx(f.centroid) + ' Hz'], ['peaks', f.nVoices / 40, fx(f.nVoices)],
      ['pulse', f.tempoConf, fx(100 * f.tempoConf) + ' %'], ['length', f.dur / 21.8, fx(f.dur, 1) + ' s']
    ];
    // (V6.4) a strip under the troupe: five columns, two rows — each trait its name and value on a line, its bar under them
    a.font = 'bold 16px Courier New'; a.textBaseline = 'middle';
    const COLS = 5, cw = AW / COLS, rowH = AH / 2, pad = 14;
    [0, 2, 4, 6, 8, 1, 3, 5, 7, 9].forEach((j, i) => {
      const [name, val, txt] = AX[j], col = i % COLS, row = Math.floor(i / COLS), x0 = col * cw + pad, x1 = (col + 1) * cw - pad, y = rowH * row + rowH * 0.36;
      a.textAlign = 'left'; a.fillStyle = '#5f8f96'; a.fillText(name, x0, y);
      a.textAlign = 'right'; a.fillStyle = '#c9eef2'; a.fillText(txt, x1, y);
      const by = rowH * row + rowH * 0.74;
      a.fillStyle = 'rgba(255,255,255,0.08)'; a.fillRect(x0, by - 3, x1 - x0, 6);
      a.fillStyle = '#5fe0e8'; a.fillRect(x0, by - 3, (x1 - x0) * clamp(Number.isFinite(val) ? val : 0, 0, 1), 6);
    });
    a.textAlign = 'left';
    // thin separators between the columns
    a.fillStyle = 'rgba(255,255,255,0.05)'; for (let c = 1; c < COLS; ++c) a.fillRect(Math.round(c * cw), 10, 1, AH - 20);
  }
  drawPads () {
    const s = this.st, busy = this.brain.busyKs();
    this.$$('.pad').forEach(el => {
      const p = Number(el.dataset.pad), k = p, ok = this.readyOf(k), info = this.info[k];
      const fresh = ok && s[64 + k] === this.wantK(k), kid = this.kids[k], pk = this.pop && this.pop[k] && !this.remutOf(k) ? this.pop[k] : null;
      el.classList.toggle('wait', !ok); el.classList.toggle('stale', ok && !fresh);
      const cv = el.querySelector('canvas'), g = cv.getContext('2d'), W = cv.width, H = cv.height;
      g.clearRect(0, 0, W, H);
      if (info && ok) {
        const w = info.slice(40, 168); let mx = 1e-6; for (const x of w) mx = Math.max(mx, x);
        g.fillStyle = hexA(phos(p).m, 0.55);
        w.forEach((a, i) => { const h = (a / mx) * (H / 2 - 34); g.fillRect(i * W / 128, H / 2 - h, Math.max(1, W / 128 - 0.5), 2 * h); });
        if (this.play[p][0] > 0.5 && info[1] > 0 && info[3] > 0) {
          const x = info[2] / info[1] * W; g.strokeStyle = 'rgba(217,104,122,0.6)'; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(x, 26); g.lineTo(x, H - 26); g.stroke(); g.setLineDash([]);
        }
      }
      const pos = this.tel ? this.tel[p] : -1, inStase = this.tel && this.tel[16 + p] > 0;
      if (pos >= 0) { g.fillStyle = inStase ? '#d9687a' : '#ffd9df'; g.fillRect(pos * W, 22, 3, H - 44); }
      if (busy.includes(k)) { const t = performance.now() / 600; g.fillStyle = hexA(phos(p).m, 0.8); for (let d = 0; d < 3; ++d) { const a = 0.5 + 0.5 * Math.sin(t * 3 - d); g.globalAlpha = a; g.beginPath(); g.arc(W / 2 - 16 + d * 16, H / 2, 4, 0, 7); g.fill(); } g.globalAlpha = 1; }
      const [ix, iy] = this.joyIds(p), jx = this.v(ix), jy = this.v(iy);
      if (jx || jy) { g.fillStyle = '#d9687a'; g.beginPath(); g.arc(W - 22 + jx * 14, H - 52 - jy * 14, 5, 0, 7); g.fill(); g.strokeStyle = 'rgba(217,104,122,.35)'; g.strokeRect(W - 36, H - 66, 28, 28); }
      const genome = kid ? kid.genome : pk ? pk.genome.map(x => x.g) : null;
      const set = (sel, t) => { const e = el.querySelector(sel); if (e.textContent !== t) e.textContent = t; };
      set('.d', ok && info ? info[1].toFixed(1) + ' s' : '');
      set('.cat', genome ? gname(genome[0]) + (this.remutOf(k) ? ' ·' + this.remutOf(k) : '') : '');
      { const ob = clamp(Math.round(this.play[p][9] || 0), 0, 15); set('.nt', noteName(this.base() + p) + (ob ? ' ▸' + (ob >= this.trackPairs() ? '1/2' : pairTxt(ob)) : '')); }
      set('.jd', inStase ? 'stasis' : (jx || jy) ? this.poleText(jx, jy) : this.errors[k] ? 'failed' : genome ? genome.slice(1).map(gname).join('·') : busy.includes(k) ? 'being born…' : '…');
    });
    // the subject plays one note below the first mummer (V6.1: its note shown on the button)
    const au = this.$('[data-audition]'), at = 'listen · ' + noteName(this.base() - 1);
    if (au && au.textContent !== at) au.textContent = at;
  }
  drawOrgans () {
    const p = this.sel, k = p, kid = this.kids[k], pk = k === SUBJ || this.remutOf(k) || this.dosesOf(k) ? null : this.pop && this.pop[k], info = this.info[k];
    const sk = this.$('[data-selkind]'), skT = k === SUBJ ? 'Subject' : 'Mummer'; if (sk && sk.textContent !== skT) sk.textContent = skT;
    this.$('[data-selname]').textContent = k === SUBJ ? '· 17th pad' : `${p + 1}`;
    const box = this.$('[data-organs]');
    // (1.0) the right column wears the phosphor of the selected pad
    { const ph = phos(k); if (this.phosOn !== ph) { this.phosOn = ph; const cr = this.$('.col-right'); if (cr) for (const [v, c] of [['--ot', ph.t], ['--od', ph.d], ['--og', ph.g], ['--om', ph.m], ['--ote', ph.te], ['--osc', ph.sc], ['--odn', ph.dn], ['--oglass', ph.gl], ['--oring', ph.r]]) cr.style.setProperty(v, c); this.drawJoy(); } }
    // (V6.3) the subject as the 17th pad: what its slot holds and the lacquer found for it
    if (k === SUBJ) {
      const ln = [];
      ln.push(`<div class="ln">the subject itself, from its own slot: poles, playback, envelope, pan and lacquer</div>`);
      if (info && this.readyOf(k)) {
        ln.push(`<div class="ln dim">${info[1].toFixed(2)} s · hold at ${info[2].toFixed(2)} s · ${kid ? this.bornTxt(kid, 'prepared') : ''}</div>`);
        if (info[4] > 0) ln.push(`<div class="ln dim">gesture reads ${GESTE[info[7]] || '—'}${info[8] > 0 ? ' (' + info[8] + ' marks)' : ''} · pitch ${Math.round(info[9])} Hz</div>`);
      } else ln.push(`<div class="ln dim">${this.errors[k] ? 'could not be prepared: ' + esc(this.errors[k]) : this.pcm[this.slot] ? 'being prepared — until then it plays from its plain buffer, without poles' : 'no subject'}</div>`);
      if (kid && kid.lacquer) ln.push(this.lacqLine(kid.lacquer));
      const html = ln.join(''); if (box.innerHTML !== html) box.innerHTML = html; return;
    }
    if (!kid && !pk && !this.pendingGenes[k]) { box.innerHTML = this.errors[k] ? 'could not be born: ' + esc(this.errors[k]) : 'waiting to be born…'; return; }
    // (V6.4) the genes of THIS mummer as it was born (a re-mutated one showed the genes of its first birth), each at its dose —
    // a bar Mat drags by hand (0–100 %): the mummer is born again at that dose
    if (this.geneDrag && this.geneDrag.k === k) return;
    const genes = this.genesShown(k), d0 = (kid && kid.genes0) || (this.pendingGenes[k] && this.pendingGenes[k].d0) || null;
    // (V6.4) a gene that finds nothing to act on in this subject at its computed dose (its transformation gives nothing) is not
    // shown — Mat: « ne pas faire apparaître les gènes grisés qui ne font rien, cela porte à confusion » ; a gene that a hand
    // dose leaves with nothing to do stays (its bar is still Mat's), shown off
    const act = this.pendingGenes[k] ? this.pendingGenes[k].act0 || null : kid ? kid.active : pk ? pk.active : null;
    let html = '';
    genes.forEach((x, i) => { const ok = Number.isFinite(x.iota), hand = ok && d0 && d0[i] && Math.abs(d0[i].iota - x.iota) > 0.004, idle = ok && Array.isArray(act) && act[i] === false && !(hand && this.pendingGenes[k]);
      if (idle && !hand) return;
      html += `<div class="op${ok ? ' dose' : ''}${hand ? ' hand' : ''}" data-gi="${i}"><span style="width:84px">${esc(gname(x.g))}</span><div class="bar"><i style="width:${ok ? Math.round(clamp(x.iota, 0, 1) * 100) : 0}%"></i></div><span class="gv">${ok ? (idle ? 'off' : doseTxt(x.iota)) : ''}</span></div>`; });
    // (V6.9.2) in scale mode the degree right under the transformations (Mat: « sous les transformations, pas à la fin du texte »)
    const dl = this.degreeLine(k);
    html += dl;
    if (kid && info && this.readyOf(k)) {
      html += `<div class="ln dim">${info[1].toFixed(2)} s · hold at ${info[2].toFixed(2)} s · ${kid.layers} layer${kid.layers > 1 ? 's' : ''} · ${kid.gainDb >= 0 ? '+' : ''}${kid.gainDb.toFixed(1)} dB · ${this.bornTxt(kid)}</div>`;
      if (info[4] > 0) html += `<div class="ln dim">gesture reads ${GESTE[info[7]] || '—'}${info[8] > 0 ? ' (' + info[8] + ' marks)' : ''} · pitch ${Math.round(info[9])} Hz</div>`;
    } else if (info && this.readyOf(k)) html += `<div class="ln dim">${info[1].toFixed(2)} s · hold at ${info[2].toFixed(2)} s</div>`;
    if (kid && kid.lacquer) html += this.lacqLine(kid.lacquer);
    const desc = kid ? kid.desc : pk ? pk.desc || [] : [];
    if (!kid && this.pendingGenes[k]) html += `<div class="ln dim">being born again with these doses…</div>`;
    // (V6.9) in scale mode the degree is a selector (under the transformations): the « tuned » line is not repeated
    for (const d of desc) { if (dl && /^tuned [+\u2212-]?\d/.test(d)) continue; html += `<div class="ln" title="${esc(d)}">· ${esc(d)}</div>`; }
    if (box.innerHTML !== html) box.innerHTML = html;
  }
  // (V6.9) the degree of mummer k (Tuning: scale): ◀ ▶ through every degree, the pitch it lands on, set by hand or not
  degreeLine (k) {
    const f = this.facts, D = f && f.degrees; if (k === SUBJ || !(this.v('param42', 0) > 0.5) || !D || !D.cents.length) return '';
    const i = this.degIndex(k); if (i < 0) return '';
    const e = this.degOf(k), c = D.cents[i], f0 = f.fundamentalHz || 0;
    const nt = f0 > 0 ? (() => { const m = 69 + 12 * Math.log2(f0 * Math.pow(2, c / 1200) / 440), r = Math.round(m), d = Math.round((m - r) * 100); return ' · ' + noteName(r + 12) + (d ? (d > 0 ? '+' : '−') + Math.abs(d) + 'c' : ''); })() : '';
    return `<div class="ln degsel" data-help="degree" title="${esc((D.mts ? 'MTS-ESP master, ' : 'scale, ') + 'degree ' + (i + 1) + ' of ' + D.cents.length + (e ? ', set by hand (double-click: back to the ladder)' : ''))}"><button class="dg" data-dg="-1"${i <= 0 ? ' disabled' : ''}>◀</button><span class="dgv${e ? ' hand' : ''}" data-dgv>${D.mts ? '' : 'degree '}<b>${esc(D.labels[i])}</b>${nt} ${fmtC(c)}</span><button class="dg" data-dg="1"${i >= D.cents.length - 1 ? ' disabled' : ''}>▶</button><span class="dgn">${i + 1}/${D.cents.length}${e ? ' ✎' : ''}</span></div>`;
  }
  // (V6.9) the tempo typed in place (Enter or leaving the field applies it, Escape gives up)
  closeOverlays () { if (this.bpmIn) { const x = this.bpmIn; this.bpmIn = null; x.remove(); } if (this.smenu) this.smenu.close(); }
  overlayAt (el) { const panel = this.$('.panel'), r = el.getBoundingClientRect(), pr = panel.getBoundingClientRect(), z = pr.width / (panel.offsetWidth || 1100) || 1; return { panel, x: (r.left - pr.left) / z, y: (r.top - pr.top) / z, w: r.width / z, h: r.height / z }; }
  openBpm (el) {
    const f = this.facts; if (!f || !this.meta[this.slot]) return;
    this.closeOverlays();
    const o = this.overlayAt(el), inp = document.createElement('input'); inp.className = 'bpm-in'; inp.type = 'text'; inp.inputMode = 'decimal'; inp.spellcheck = false;
    const cur = f.pulse && f.pulse.bpm > 0 ? f.pulse.bpm : 0; inp.value = cur ? cur.toFixed(2) : '';
    const key = el.matches && el.matches('[data-bpmkey]');
    inp.style.left = Math.round(key ? o.x + 56 : o.x - 5) + 'px'; inp.style.top = Math.round(key ? o.y + 1 : o.y - 3) + 'px'; if (key) { inp.style.width = Math.round(o.w - 82) + 'px'; inp.style.height = Math.round(o.h - 2) + 'px'; } inp.placeholder = 'BPM';
    o.panel.appendChild(inp); this.bpmIn = inp; inp.focus(); inp.select();
    let done = false;
    const fin = ok => { if (done) return; done = true; const v = parseFloat(String(inp.value).replace(',', '.')); if (this.bpmIn === inp) this.bpmIn = null; inp.remove(); if (ok && String(inp.value).trim() !== '' && Number.isFinite(v)) this.setTempo(v); };
    inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') fin(true); else if (e.key === 'Escape') fin(false); });
    inp.addEventListener('keyup', e => e.stopPropagation());
    inp.addEventListener('blur', () => fin(true));
  }
  // (V6.9) THE SCALE MENU, as ReaControlMIDI's: the analysis's proposal on top, then the 20 families of ZD Ultimate, each opening
  // its scales; a scale the tuning cannot carry is greyed (the keys it lacks in the tip)
  // (1.0) with Source on MTS-ESP the same menu lays a scale on the master's notes: « all the master's notes » first (as in
  // 6.9), then the analysis's proposal on the master; a scale the master cannot carry is greyed the same way
  openScaleMenu () {
    const f = this.facts, zd = f && f.zd, mtsOn = this.mtsActive(), mm = f && f.mtsMenu;
    const sm = mtsOn ? (mm ? { avail: mm.avail, proposed: mm.proposed, proposedName: mm.proposedName } : null) : f && f.scaleMenu;
    if (!sm || !zd || (!mtsOn && !f.tuning)) { if (mtsOn) this.say('the MTS-ESP master: no tonic to lay a scale on yet (the subject\'s fundamental)'); return; }
    this.closeOverlays();
    const panel = this.$('.panel'), box = document.createElement('div'); box.className = 'smenu';
    const KEYN = ['1', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7'];
    const cur = mtsOn ? (this.mtsPlayable(this.tuneOf().mscale) ? this.tuneOf().mscale : -1) : Number.isInteger(f.tuning.scaleIndex) ? f.tuning.scaleIndex : sm.proposed;
    const where = mtsOn ? 'this master' : 'this tuning';
    const miss = s => { const mk = zd.masks[s], out = []; for (let j = 0; j < 12; ++j) if ((mk >> j & 1) && !(sm.avail >> j & 1)) out.push(KEYN[j]); if (!(mk & 1)) out.unshift('no tonic'); return out; };
    const nOf = s => { let c = 0, mk = zd.masks[s]; while (mk) { mk &= mk - 1; c++; } return c; };
    const keys = s => { const mk = zd.masks[s], o = []; for (let j = 0; j < 12; ++j) if (mk >> j & 1) o.push(KEYN[j]); return o.join(' '); };
    const fams = zd.families.map((name, fi) => { const idx = []; zd.fam.forEach((x, s) => { if (x === fi) idx.push(s); }); return { name, fi, idx, ok: idx.filter(s => !miss(s).length).length }; });
    let famSel = zd.fam[cur >= 0 ? cur : sm.proposed] ?? 0;
    const list = () => fams[famSel].idx.map(s => { const m = miss(s); return `<div class="sm-it${s === cur ? ' cur' : ''}${s === sm.proposed ? ' prop' : ''}${m.length ? ' no' : ''}" data-s="${s}" title="${esc(zd.names[s] + ' — ' + keys(s) + (m.length ? ` · ${where} has no pitch on: ` + m.join(', ') : ''))}"><span>${esc(zd.names[s])}</span><i>${nOf(s)}</i></div>`; }).join('');
    const head = mtsOn ? `Scale · on the MTS-ESP master <b>${esc(this.mts.name || 'unnamed tuning')}</b> · tonic ${tonicTxt(mm.tonic)}${mm.octave ? '' : ' · no octave: no ZD scale fits'}` : `Scale · on the tuning <b>${esc(f.tuning.name)}</b>`;
    const prop = sm.proposed >= 0 ? `<div class="sm-prop${cur === sm.proposed ? ' cur' : ''}" data-s="${sm.proposed}"><span>proposed by the analysis${mtsOn ? ' on the master' : ''}: <b>${esc(sm.proposedName)}</b></span><i>${keys(sm.proposed)}</i></div>` : '';
    box.innerHTML = `<div class="sm-head"><span>${head}</span><button class="sm-x" data-smx>×</button></div>
      ${mtsOn ? `<div class="sm-prop${cur < 0 ? ' cur' : ''}" data-s="-1"><span>all the master's notes</span><i>as the master plays them</i></div>` : ''}${prop}
      <div class="sm-body"><div class="sm-fams">${fams.map(F => `<div class="sm-fam${F.fi === famSel ? ' sel' : ''}${F.ok ? '' : ' no'}" data-fam="${F.fi}"><span>${esc(F.name)}</span><i>${F.ok}/${F.idx.length}</i></div>`).join('')}</div><div class="sm-list" data-smlist>${list()}</div></div>`;
    panel.appendChild(box);
    const lst = box.querySelector('[data-smlist]'), showFam = fi => { if (fi === famSel) return; famSel = fi; box.querySelectorAll('.sm-fam').forEach(x => x.classList.toggle('sel', Number(x.dataset.fam) === fi)); lst.innerHTML = list(); lst.scrollTop = 0; };
    { const c = lst.querySelector('.cur'); if (c) lst.scrollTop = Math.max(0, c.offsetTop - lst.clientHeight / 2); }
    const close = () => { if (this.smenu !== api) return; this.smenu = null; box.remove(); panel.removeEventListener('pointerdown', outside, true); window.removeEventListener('keydown', key, true); };
    const outside = e => { if (!box.contains(e.target)) close(); };
    const key = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    box.addEventListener('pointerover', e => { const F = e.target.closest && e.target.closest('.sm-fam'); if (F) showFam(Number(F.dataset.fam)); });
    box.addEventListener('click', e => {
      if (e.target.closest('[data-smx]')) { close(); return; }
      const F = e.target.closest('.sm-fam'); if (F) { showFam(Number(F.dataset.fam)); return; }
      const it = e.target.closest('[data-s]'); if (!it || it.classList.contains('no')) return;
      close(); this.setScale(Number(it.dataset.s));
    });
    setTimeout(() => panel.addEventListener('pointerdown', outside, true), 0); window.addEventListener('keydown', key, true);
    const api = { close }; this.smenu = api;
  }
  // (V6.4) diagnosis (title of the page, read by the AMORPH probe): per population, mummers restored / missing / born
  tally (pk, what) { const f = String(pk).split(':'), key = pk === 'subject' ? 'subject' : `s${(f[1] || '').slice(-4)} m${f[3]}${f[4] === '1' ? ' tuned' : ''}${f[5] ? ' ' + f[5] : ''}`; const t = this.tal[key] || (this.tal[key] = { r: 0, m: 0, b: 0, at: Math.round(performance.now() - this.t0) }); t[what] += 1; }
  // (V6.4) where this pad's sound comes from
  bornTxt (kid, verb = 'born') {
    const s = (kid.ms / 1000).toFixed(1) + ' s';
    return kid.stale ? 'kept from the previous version, checked again in the background' : kid.checked ? 'restored from cache (unchanged in this version)'
      : kid.replaced ? `${verb} again for this version in ${s}` : kid.fromCache ? 'restored from cache' : `${verb} in ${s}`;
  }
  genesShown (k) {
    const kid = this.kids[k], pk = this.pop && this.pop[k] && !this.remutOf(k) && !this.dosesOf(k) ? this.pop[k] : null;
    if (this.pendingGenes[k]) return this.pendingGenes[k];
    if (kid && kid.genes) return kid.genes;
    if (pk) return pk.genome;
    return kid ? kid.genome.map(g => ({ g, iota: NaN })) : [];
  }
  // (V6.4) a gene's dose set by hand: this mummer alone is born again (its other genes, its re-mutation unchanged); a dose put back
  // where the analysis had it clears the hand setting
  setDose (k, i, v) {
    const m = this.meta[this.slot]; if (!m || !this.pcm[this.slot] || k === SUBJ) return;
    const genes = this.genesShown(k); if (!genes[i] || !Number.isFinite(genes[i].iota) || Math.abs(genes[i].iota - clamp(v, 0, 1)) < 0.005) return;
    const kid = this.kids[k], d0 = (kid && kid.genes0) || (this.pendingGenes[k] && this.pendingGenes[k].d0) || null, cur = genes.map(x => x.iota); cur[i] = Math.round(clamp(v, 0, 1) * 100) / 100;
    const same = d0 && d0.length === cur.length && d0.every((x, j) => Math.abs(x.iota - cur[j]) < 0.004);
    m.dose = Array.from({ length: 16 }, (_, j) => (j === k ? (same ? null : { r: this.remutOf(k), d: cur }) : (m.dose && m.dose[j]) || null));
    this.pendingGenes[k] = genes.map((x, j) => ({ ...x, iota: cur[j] }));
    if (d0) this.pendingGenes[k].d0 = d0;
    const a0 = (kid && kid.active) || genes.act0 || null; if (a0) this.pendingGenes[k].act0 = a0;
    delete this.kids[k]; delete this.errors[k];
    this.saveTroupe(); this.reconcile(); this.drawPads(); this.drawOrgans();
    this.say(cur[i] <= 0 ? `mummer ${k + 1}: ${gname(genes[i].g)} off — born again without it` : `mummer ${k + 1}: ${gname(genes[i].g)} at ${Math.round(cur[i] * 100)} % — born again`);
  }
  // (V6.4) the lacquer of a pad: the Moonvox timbre CREATED from the subject (its oscillators, its waveshapers, its circulation),
  // how close it lands, how locked this sound's phases are; and the hold grains measured on this sound
  lacqLine (q) {
    const f = (x, d = 1) => Number.isFinite(x) ? x.toFixed(d) : '—';
    // (V6.4) a subject without partials (a drum hit): no Moonvox timbre can be created from it
    if (q.none) return `<div class="ln dim">lacquer: no Moonvox timbre created — the subject has no partials (no pitch)</div>` + (q.grains ? `<div class="ln dim">${esc(q.grains)}</div>` : '');
    const tim = q.designed ? `Moonvox timbre created from the subject: ${q.oscillators} oscillators, oboe ${f(q.oboe, 2)}, brass ${f(q.brass, 2)} (balance ${f(q.balance, 1)}), tilt ${f(q.tilt, 1)}, circulation ${f(q.rate, 2)} Hz`
      : `Moonvox ${esc(q.timbre || '—')} (oboe ${f(q.oboe, 2)}, brass ${f(q.brass, 2)}, tilt ${f(q.tilt, 1)})`;
    return `<div class="ln dim">lacquer: ${tim} · fits the subject within ${f(q.fitDb)} dB · waveform lock ${f(q.lock, 2)}</div>` + (q.grains ? `<div class="ln dim">${esc(q.grains)}</div>` : '');
  }

  // ------------------------------------------------------------------ subject: file -> preset state -> DSP + brain
  say (t) { const e = this.$('[data-log]'); if (e) e.textContent = t; }
  async importFile (file) {
    try {
      this.say('decoding ' + file.name + '…');
      const bytes = await file.arrayBuffer();
      const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      // (V6.5) a WAV, AIFF or FLAC at another rate is decoded at ITS rate, then converted by the brain (Kaiser, 140 dB, flat
      // to 95.5 % of Nyquist: 21.06 kHz from 44.1 kHz); other formats, or a refused rate, are converted by the browser
      const srIn = nativeRate(bytes);
      let L = null, R = null, len = 0;
      if (srIn && srIn !== FS && srIn >= 8000 && srIn <= 384000) {
        try {
          const buf = await new OAC(2, 1, srIn).decodeAudioData(bytes.slice(0));
          const cap = Math.min(buf.length, Math.ceil((MAXLEN + 64) * srIn / FS));
          const l0 = buf.getChannelData(0).slice(0, cap), r0 = (buf.numberOfChannels > 1 ? buf.getChannelData(1) : buf.getChannelData(0)).slice(0, cap);
          this.say(`converting ${file.name} from ${srIn} to ${FS} Hz…`);
          ({ L, R } = await this.brain.resample(l0, r0, srIn, FS)); len = Math.round(buf.length * FS / srIn);
        } catch (e) { L = null; }
      }
      if (!L) {
        const buf = await new OAC(2, FS, FS).decodeAudioData(bytes);
        L = buf.getChannelData(0); R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L; len = buf.length;
      }
      const frames = Math.min(L.length, MAXLEN), slot = this.slot;
      const buf = { length: len };
      this.storeSubject(slot, L, R, frames, { name: file.name.replace(/\.[^.]+$/, '') });
      this.say(`${file.name}: ${(frames / FS).toFixed(2)} s${buf.length > frames ? ' (cut at 21.8 s, the engine\'s limit)' : ''} · slot ${slot}`);
    } catch (e) { this.say('cannot load: ' + e.message); }
  }
  // a subject into a slot: 24 bits at its own level (a 16- or 24-bit file is stored exactly; float audio loses only what lies
  // below −144 dBFS), on the disk under its fingerprint, named in the troupe
  async storeSubject (slot, L, R, frames, meta) {
    const pcm = pack24(L, R, frames, FULL24), hash = fingerprint(pcm, frames);
    // le même sujet chargé une fois de plus : la génération suivante de sa troupe (de nouveaux masques, jamais tirés au hasard)
    // (v6 : seulement s'il est rechargé dans la case qui le tient déjà — chargé dans une case vide, un sujet connu revient avec
    // sa dernière troupe, déjà née sur ce disque. En v5.9 tout rechargement faisait une troupe nouvelle : après une réouverture
    // qui montrait la case vide, recharger le fichier faisait naître seize enfants de plus, à chaque fois)
    const prev = await this.cache.getSubject(hash), last = prev && Number.isFinite(prev.gens) ? prev.gens : -1;
    const again = !!(this.meta[slot] && this.meta[slot].hash === hash), gen = last < 0 ? 0 : again ? last + 1 : last;
    this.pcm[slot] = { W: pcm, n: frames }; delete this.hash[slot]; delete this.missing[slot];
    this.meta[slot] = { name: meta.name, frames, hash, from: meta.from || null, gen };
    this.drawSlots();
    this.reconcile();
    const ok = await this.cache.putSubject(hash, { W: pcm, n: frames, name: meta.name, t: Date.now(), gens: gen });
    if (!ok) { this.say(`subject ${slot} could not be kept on this computer (storage ${this.cache.status}): it will be lost when the editor closes`); return; }
    await this.ensureTroupe(); this.saveTroupe();
  }
  // A MUMMER BECOMES A SUBJECT: its born audio (24-bit, at its true level, without the poles, which are played live) is stored
  // in an empty slot; selecting that slot parades its own troupe — mutants of a mutant
  async adoptMummer (k, slot) {
    if (this.meta[slot]) { this.say(`slot ${slot} is not empty: clear it first`); return; }
    const kid = this.kids[k]; if (!kid) { this.say(`mummer ${k + 1} is not born yet`); return; }
    const rec = (this.popKey ? await this.cache.get(this.popKey, this.kKey(k)) : null) || this.kidPcm[k];
    if (!rec || !rec.pcm) { this.say(`mummer ${k + 1}: its audio is no longer here (cache ${this.cache.status}) — let it be born again`); return; }
    const n = Math.min(rec.childLen, MAXLEN), { L, R } = unpack24(rec.pcm, n), g = rec.peak || 1;
    for (let i = 0; i < n; ++i) { L[i] *= g; R[i] *= g; }
    const from = this.meta[this.slot], parentName = from ? (from.name || from.nom) : 'subject';
    await this.storeSubject(slot, L, R, n, { name: `${k + 1} ‹ ${parentName}`, from: { slot: this.slot, mummer: k + 1, genome: kid.genome } });
    this.say(`mummer ${k + 1} is now subject ${slot} (${(n / FS).toFixed(2)} s, 24-bit) · click slot ${slot} to parade its own troupe`);
  }
  dragStart (k) {
    if (!this.ghost) { this.ghost = document.createElement('div'); this.ghost.className = 'drag-ghost'; this.shadowRoot.appendChild(this.ghost); }
    this.ghost.textContent = `mummer ${k + 1} → an empty slot`; this.ghost.style.display = 'block';
    this.$$('.slot').forEach(el => el.classList.toggle('drop', !this.meta[el.dataset.slot]));
  }
  dragMove (x, y) {
    if (!this.ghost) return;
    this.ghost.style.left = (x + 14) + 'px'; this.ghost.style.top = (y + 10) + 'px';
    const hit = this.shadowRoot.elementFromPoint ? this.shadowRoot.elementFromPoint(x, y) : null, over = hit && hit.closest ? hit.closest('.slot') : null;
    this.$$('.slot').forEach(el => el.classList.toggle('over', el === over));
  }
  dragEnd () {
    if (this.ghost) this.ghost.style.display = 'none';
    this.$$('.slot').forEach(el => { el.classList.remove('drop'); el.classList.remove('over'); });
  }
  dragDrop (k, x, y) {
    const hit = this.shadowRoot.elementFromPoint ? this.shadowRoot.elementFromPoint(x, y) : null, over = hit && hit.closest ? hit.closest('.slot') : null;
    this.dragEnd();
    if (over) this.adoptMummer(k, Number(over.dataset.slot));
  }
  // ANOTHER TROUPE of the same subject: the next generation (a new set of masks chosen away from those already worn by its
  // earlier troupes; the earlier troupes stay in the cache)
  async nextGeneration (slot) {
    const m = this.meta[slot]; if (!m || !m.hash) return;
    const rec = await this.cache.getSubject(m.hash), gen = Math.max(m.gen || 0, rec && Number.isFinite(rec.gens) ? rec.gens : 0) + 1;
    this.meta[slot] = { ...m, gen };
    if (rec && rec.W) this.cache.putSubject(m.hash, { ...rec, gens: gen });
    this.say(`subject ${slot}: troupe ${gen + 1} — new masks, away from those its ${gen} earlier troupe${gen > 1 ? 's' : ''} wore`);
    this.saveTroupe(); this.drawSlots();
    if (slot === this.slot) this.reconcile(); else this.userSet('param37', slot);
  }
  clearSlot () {
    const slot = this.slot; if (!this.meta[slot]) return;
    delete this.meta[slot]; delete this.pcm[slot]; delete this.hash[slot]; delete this.missing[slot];
    this.drawSlots(); this.say('slot ' + slot + ' emptied'); this.drawParentWave(null);
    this.saveTroupe();
    setTimeout(() => this.cache.collect(Object.values(this.meta).map(m => m.hash)).then(() => this.cache.counts()).then(c => { this.dbCounts = c; }), 1000);
    this.reconcile();
  }
  // a subject kept by an older version in the stored state of the running session (base64, 24- or 16-bit)
  legacyPcm (slot) {
    const m = this.stored['parent' + slot];
    if (!m || !m.chunks) return null;
    const parts = []; for (let c = 0; c < m.chunks; ++c) parts.push(this.stored[`parent${slot}_${c}`]);
    if (!parts.every(x => typeof x === 'string' && x.length)) { this.say('subject ' + slot + ' incomplete in the preset'); return null; }
    const bin = atob(parts.join('')), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; ++i) u8[i] = bin.charCodeAt(i);
    const raw = new Int32Array(u8.buffer, 0, u8.length >> 2);
    let P;
    if (m.bits === 24) P = { W: raw, n: Math.min(m.frames || 0, Math.floor(raw.length / 3) * 2) };
    else {
      // older presets stored the subject at 16 bits (one word per frame): moved to 24 bits exactly (×256)
      const n = raw.length, L = new Float32Array(n), R = new Float32Array(n);
      for (let i = 0; i < n; ++i) { const v = raw[i]; L[i] = ((v << 16) >> 16) / 32768; R[i] = (v >> 16) / 32768; }
      P = { W: pack24(L, R, n, 8388608), n };
    }
    return P;
  }
  hashOf (slot) {
    if (this.hash[slot] !== undefined) return this.hash[slot];
    const W = this.pcm[slot].W; let h = 2166136261 >>> 0;
    const step = Math.max(1, Math.floor(W.length / 65536));
    for (let i = 0; i < W.length; i += step) { h ^= W[i]; h = Math.imul(h, 16777619) >>> 0; }
    h ^= W.length; h = Math.imul(h, 16777619) >>> 0;
    this.hash[slot] = h; return h;
  }
}

if (!customElements.get('charivari-view-v5')) customElements.define('charivari-view-v5', CharivariView);
export default function createPatchView (pc) { return new CharivariView(pc); }
