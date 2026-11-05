#!/bin/bash
# Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — GNU GPL, version 3 or later (LICENSE, CREDITS.md)
# Charivari 1.0 — compilation CLAP + VST3 sur macOS (rien n'est téléchargé : tout est dans ce dossier,
# CMake 3.31.12 officiel de Kitware compris, dans deps/cmake/bin)
# (6.9) le client MTS-ESP d'ODDSound est compilé dans le plugin (clap_project/helpers/clap/mts, licence libre jointe) ; il
# trouve le Master au lancement par « /Library/Application Support/MTS-ESP/libMTS.dylib » s'il est installé, sinon rien ne change
# (6.9.1) seize sorties stéréo (1/2 … 31/32) ; le nombre de canaux de la piste est lu dans REAPER — en CLAP par REAPER lui-même,
# en VST3 par une retouche de quelques lignes de l'adaptateur (deps/clap-wrapper/src : clap_proxy.*, wrapasvst3.*, « Vox Mira Studio »)
#   bash build_mac.sh            compile (Apple Silicon) dans ./build
#   bash build_mac.sh install    compile, puis installe dans ~/Library/Audio/Plug-Ins (CLAP, VST3)
#   ARCHS="arm64;x86_64" bash build_mac.sh install    binaire universel (Apple Silicon + Intel), deux fois plus long
#   bash build_pkg.sh            (1.0) l'installeur à partager : compile en universel, puis dist/Charivari-<version>-macOS.pkg
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
ARCHS="${ARCHS:-arm64}"
BUILD="$HERE/build"
LOG="$HERE/build_log.txt"
exec > >(tee "$LOG") 2>&1
echo "== Charivari 1.0.1 (Vox Mira Studio) — $(date) — architectures: $ARCHS"
if ! xcode-select -p >/dev/null 2>&1 || ! command -v clang++ >/dev/null 2>&1; then
  echo "Il manque les outils de compilation d'Apple (gratuits). Lance :  xcode-select --install   puis relance ce script."; exit 1
fi
CMAKE="$(command -v cmake || true)"
for c in /opt/homebrew/bin/cmake /usr/local/bin/cmake /Applications/CMake.app/Contents/bin/cmake; do [ -z "$CMAKE" ] && [ -x "$c" ] && CMAKE="$c"; done
# sinon le CMake officiel de Kitware posé dans deps/cmake (l'outil en ligne de commande seul, hors de son application : sa
# signature Kitware reste entière) — on lui retire la marque « téléchargé » et on vérifie sa signature avant de s'en servir
if [ -z "$CMAKE" ] && [ -f "$HERE/deps/cmake/bin/cmake" ]; then
  xattr -dr com.apple.quarantine "$HERE/deps/cmake" 2>/dev/null || true
  chmod +x "$HERE/deps/cmake/bin/cmake"
  if codesign --verify --strict "$HERE/deps/cmake/bin/cmake" 2>/dev/null; then
    echo "CMake fourni, signé : $(codesign -dvv "$HERE/deps/cmake/bin/cmake" 2>&1 | grep -m1 '^Authority=' | cut -d= -f2)"
    CMAKE="$HERE/deps/cmake/bin/cmake"
  else
    echo "La signature du CMake fourni ne se vérifie pas : je ne m'en sers pas."
  fi
fi
if [ -z "$CMAKE" ]; then
  echo "CMake manque (gratuit). Au choix :  brew install cmake   ou l'application CMake depuis https://cmake.org/download/   puis relance ce script."; exit 1
fi
"$CMAKE" --version | head -1; clang++ --version | head -1
# (1.0.1) from the GitHub repository the dependencies are not in the folder yet: fetch_deps.sh fetches them (git)
if [ ! -f "$HERE/deps/clap/include/clap/clap.h" ] || [ ! -f "$HERE/clap_project/include/cmajor/API/cmaj_Engine.h" ]; then
  bash "$HERE/fetch_deps.sh" || { echo "ÉCHEC : dépendances (fetch_deps.sh)"; exit 1; }
fi
rm -f "$BUILD/CMakeCache.txt"
"$CMAKE" -S "$HERE/clap_project" -B "$BUILD" -DCMAKE_BUILD_TYPE=Release -DCMAKE_OSX_ARCHITECTURES="$ARCHS" \
  -DCLAP_INCLUDE_PATH="$HERE/deps/clap/include" -DCLAP_WRAPPER_PATH="$HERE/deps/clap-wrapper" \
  -DVST3_SDK_ROOT="$HERE/deps/vst3sdk" || { echo "ÉCHEC de la configuration (voir build_log.txt)"; exit 1; }
T0=$(date +%s)
"$CMAKE" --build "$BUILD" --config Release -j "$(sysctl -n hw.ncpu)" --target Charivari Charivari_vst3 || { echo "ÉCHEC de la compilation (voir build_log.txt)"; exit 1; }
echo "== compilé en $(( $(date +%s) - T0 )) s"
CLAPB=$(find "$BUILD" -name "Charivari.clap" -type d -prune | head -1)
VST3B=$(find "$BUILD" -name "Charivari.vst3" -type d -prune | head -1)
for b in "$CLAPB" "$VST3B"; do
  [ -n "$b" ] || { echo "un des deux plugins manque"; exit 1; }
  codesign --force --deep -s - "$b" >/dev/null 2>&1 && echo "signé (local, gratuit) : $b"
done
if [ "${1:-}" = "install" ]; then
  mkdir -p ~/Library/Audio/Plug-Ins/CLAP ~/Library/Audio/Plug-Ins/VST3
  rm -rf ~/Library/Audio/Plug-Ins/CLAP/Charivari.clap ~/Library/Audio/Plug-Ins/VST3/Charivari.vst3 ~/Library/Audio/Plug-Ins/Components/Charivari.component
  ditto "$CLAPB" ~/Library/Audio/Plug-Ins/CLAP/Charivari.clap
  ditto "$VST3B" ~/Library/Audio/Plug-Ins/VST3/Charivari.vst3
  echo "== installés dans ~/Library/Audio/Plug-Ins (CLAP, VST3) ; l'AU de l'essai précédent est retiré"
  killall -9 AudioComponentRegistrar >/dev/null 2>&1 || true
fi
echo "== terminé. Journal : $LOG"
