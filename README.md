# Charivari

*Rough music · one sound · sixteen mutant mummers.*

Charivari is an instrument plugin by Vox Mira Studio. You give it one sound, the **subject**. It analyses it (pitch, tuning, scale, pulse, attacks, room) and parades it as **sixteen caricatured mummers**, from the likeness (pad 1) to the contrary (pad 16). The subject itself plays as a seventeenth pad.

- **Mockery** sets how far the troupe strays from the subject; the **Troupe** pad moves the sixteen mummers together.
- Each mummer has its own joystick between four poles (**gesture, body, mask, flesh**), its envelope, pan, gain and **lacquer** (a Moonvox timbre made from the subject).
- **Tuning: scale** puts the mummers on the degrees of the subject's tuning and scale. The tuning is found among 577 ODDSound tunings and the scale is chosen among the 2322 scales of ZD Ultimate, or you choose it by hand. With **Source: MTS-ESP**, the notes come from the ODDSound MTS-ESP master instead.
- **Sixteen stereo outputs** (1/2 … 31/32): each pad can be sent to its own pair. In REAPER, Charivari follows the track's channel count.

Formats: **CLAP** and **VST3**, for macOS (Apple Silicon and Intel), Windows (64-bit) and Linux (x86_64).

## Download

The installers are on the [Releases](../../releases) page, each with its SHA-256 checksum.

### macOS: `Charivari-<version>-macOS.pkg`
The installer is not signed by Apple. The first time you open it, macOS refuses it: click **Done**, then go to **System Settings › Privacy & Security** and click **Open Anyway**. The plugins go to `/Library/Audio/Plug-Ins/CLAP` and `/Library/Audio/Plug-Ins/VST3`. macOS 10.15 or later.

### Windows: `Charivari-<version>-Windows-x64-Setup.exe`
The installer is not signed: if Windows SmartScreen stops it, click **More info › Run anyway**. The plugins go to `C:\Program Files\Common Files\CLAP` and `…\Common Files\VST3`. Windows 10 or 11, 64-bit. The interface uses the Microsoft Edge WebView2 Runtime, which Windows 11 includes; on Windows 10, install it from Microsoft if the window stays empty.

### Linux: `Charivari-<version>-Linux-x86_64.tar.gz`
Unpack it and run `./install.sh` (for you: `~/.clap`, `~/.vst3`) or `sudo ./install.sh --system` (for everyone: `/usr/lib/clap`, `/usr/lib/vst3`). The interface needs WebKitGTK 4.1 and GTK 3 (Debian / Ubuntu: `sudo apt install libwebkit2gtk-4.1-0`).

**Status:** the macOS version is played and tested by the author in REAPER. The Windows and Linux versions are built automatically from this repository. Each build is checked by loading the plugin, reading its 48 parameters and 16 outputs, and playing 400 blocks of audio. The author has not played them yet, so please report anything wrong in [Issues](../../issues).

## Building from source

```
bash fetch_deps.sh      # CLAP 1.2.10, clap-wrapper 0.17.0 (+ clap-wrapper-patch), VST 3 SDK 3.8.0, Cmajor 1.0.3175 headers, CHOC
bash build_mac.sh       # macOS: CLAP + VST3 in ./build (CMake and Apple's command line tools)
bash build_pkg.sh       # macOS: the universal installer in ./dist
bash build_linux.sh     # Linux: CLAP + VST3 and the .tar.gz in ./dist
```
Windows: see `.github/workflows/build.yml` (CMake, Visual Studio 2022, Inno Setup).

What is where:
- `patch/`: the Cmajor patch itself, meaning the playing engine (`dsp.cmajor`) and the interface (`index.js`).
- `source/`: what `patch/` is made from.
  - `source/brain/`: the analysis and the births of the mummers, in JavaScript.
  - `source/ui4/`: the interface (`node build.mjs`; the esbuild command for the brain is at the top of that file).
  - `source/dsp5/`: the engine, in four parts that make `dsp.cmajor` when joined.
- `clap_project/`: the native plugin, generated with `cmaj generate --target=clap` from `patch/`. Vox Mira Studio modified `helpers/clap/cmaj_CLAPPlugin.h` (MTS-ESP client, REAPER track channels, sixteen outputs) and `CMakeLists.txt`. When regenerating, keep those and replace `entry.cpp` only.
- `clap-wrapper-patch/`: the four clap-wrapper files that pass the REAPER track's channel count to the VST3.

## Licence and credits

Copyright © 2026 Matthieu Guillin, Vox Mira Studio. Charivari is free software under the GNU General Public License, version 3 or (at your option) any later version: see `LICENSE`.

The frieze comes from the charivari miniatures of the *Roman de Fauvel* (BnF, ms. français 146), which are in the public domain. All credits, and the licences of the components Charivari is built with, are in `CREDITS.md` and `licences/`.
