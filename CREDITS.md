# Charivari

*Rough music · one sound · sixteen mutant mummers.*

Charivari takes one sound, the subject, and parades it as sixteen caricatured mummers. The subject plays as a seventeenth pad.

Copyright © 2026 Matthieu Guillin, Vox Mira Studio.

Charivari is free software. You can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License or (at your option) any later version. It is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the file `LICENSE` for the full text.

The complete source code is published with each release.

## Credits

- **Idea, sound and direction:** Matthieu Guillin, Vox Mira Studio.
- **Code:** written with Claude (Anthropic), under the direction of Matthieu Guillin.
- **The frieze under the troupe** comes from the charivari miniatures of the *Roman de Fauvel* (Gervais du Bus, with the additions of Chaillou de Pesstain). The source is Paris, Bibliothèque nationale de France, manuscrit français 146, early 14th century (c. 1316–1320), painted by the illuminator known as the Fauvel Master. The miniatures are in the public domain. For Charivari they were redrawn as an engraving in the paint.
- **The lacquer:** the Moonvox timbre, after Moonvox (Vox Mira Studio).
- **Scales:** the analysis chooses its scale in the *ZD Ultimate* key-snap library for REAPER (2322 scales in 20 families).
- **Tunings:** the analysis compares the subject with 577 tunings of the ODDSound library.
- **MTS-ESP:** the client library by ODDSound Ltd lets Charivari follow an MTS-ESP master.

## Built with

| Component | Copyright | Licence | Text |
|---|---|---|---|
| Cmajor (patch runtime, C++ helpers, JavaScript view helpers) | © 2024 Cmajor Software Ltd | GPLv3 (the API headers); ISC (the CLAP helper and the JavaScript helpers) | `LICENSE`, `licences/Cmajor.txt` |
| CHOC | © 2025 Tracktion Corporation | ISC | `licences/CHOC.txt` |
| QuickJS (inside CHOC) | © 2017–2021 Fabrice Bellard, Charlie Gordon | MIT | `licences/QuickJS.txt` |
| FLAC decoder (inside CHOC) | © 2000–2009 Josh Coalson, © 2011–2022 Xiph.Org Foundation | BSD 3-clause | `licences/FLAC.txt` |
| Ogg Vorbis decoder (inside CHOC) | © 2002–2020 Xiph.org Foundation | BSD 3-clause | `licences/OggVorbis.txt` |
| minimp3 (inside CHOC) | dedicated to the public domain | CC0 | `licences/minimp3.txt` |
| CLAP | © 2021 Alexandre Bique | MIT | `licences/CLAP.txt` |
| clap-wrapper (builds the VST3), modified by Vox Mira Studio to read the REAPER track's channel count | © 2022 defiantnerd | MIT | `licences/clap-wrapper.txt` |
| VST 3 SDK | © 2025 Steinberg Media Technologies GmbH | MIT | `licences/VST3_SDK.txt` |
| MTS-ESP client | © 2021 ODDSound Ltd | permissive (ISC-style) | `licences/MTS-ESP.txt` |
| WebView2 loader (inside CHOC, Windows build only) | © Microsoft Corporation | BSD 3-clause | `licences/WebView2Loader.txt` |

On Linux the interface uses the system's WebKitGTK and GTK 3 libraries (LGPL), which are not shipped with Charivari.

The CLAP plugin helper from Cmajor (`cmaj_CLAPPlugin.h`) was modified by Vox Mira Studio. The changes add the MTS-ESP client, the REAPER track channels and the sixteen stereo outputs.

## Trademarks

VST is a registered trademark of Steinberg Media Technologies GmbH. REAPER is a trademark of Cockos Incorporated: Charivari only calls the extension interface that REAPER offers to plugins. Charivari is not affiliated with, or endorsed by, Steinberg, Cockos or ODDSound.
