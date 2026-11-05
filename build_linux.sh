#!/bin/bash
# Charivari — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — GNU GPL, version 3 or later (LICENSE)
# Builds the CLAP and the VST3 for Linux (x86_64 or aarch64) and packs them with their installer:
#   dist/Charivari-<version>-Linux-<arch>.tar.gz   (Charivari.clap, Charivari.vst3, install.sh, LICENSE, CREDITS.md, licences/)
# Needs: git, cmake ≥ 3.21, a C++17 compiler, pkg-config, and the GTK 3 / WebKitGTK development files
#   (Debian / Ubuntu: sudo apt install build-essential cmake pkg-config libgtk-3-dev libwebkit2gtk-4.1-dev)
set -eu
HERE="$(cd "$(dirname "$0")" && pwd)"
VERSION="$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$HERE/patch/charivari.cmajorpatch" | head -1)"
ARCH="$(uname -m)"
BUILD="$HERE/build_linux"
bash "$HERE/fetch_deps.sh"
cmake -S "$HERE/clap_project" -B "$BUILD" -DCMAKE_BUILD_TYPE=Release \
  -DCLAP_INCLUDE_PATH="$HERE/deps/clap/include" -DCLAP_WRAPPER_PATH="$HERE/deps/clap-wrapper" -DVST3_SDK_ROOT="$HERE/deps/vst3sdk"
cmake --build "$BUILD" --config Release -j "$(nproc)" --target Charivari Charivari_vst3
CLAP=$(find "$BUILD" -maxdepth 2 -name "Charivari.clap" -type f | head -1)
VST3=$(find "$BUILD" -maxdepth 3 -name "Charivari.vst3" -type d | head -1)
[ -n "$CLAP" ] && [ -n "$VST3" ] || { echo "a plugin is missing in $BUILD"; exit 1; }
NAME="Charivari-$VERSION-Linux-$ARCH"
PKG="$HERE/dist/$NAME"
rm -rf "$PKG"; mkdir -p "$PKG"
cp "$CLAP" "$PKG/Charivari.clap"
cp -R "$VST3" "$PKG/Charivari.vst3"
strip --strip-unneeded "$PKG/Charivari.clap" "$PKG"/Charivari.vst3/Contents/*-linux/Charivari.so 2>/dev/null || true
mkdir -p "$PKG/Charivari.vst3/Contents/Resources"
cp "$HERE/LICENSE" "$HERE/CREDITS.md" "$PKG/Charivari.vst3/Contents/Resources/"
cp "$HERE/LICENSE" "$HERE/CREDITS.md" "$PKG/"; cp -R "$HERE/licences" "$PKG/licences"
cp "$HERE/packaging/linux/install.sh" "$PKG/install.sh"; chmod +x "$PKG/install.sh"
( cd "$HERE/dist" && tar czf "$NAME.tar.gz" "$NAME" && sha256sum "$NAME.tar.gz" > "$NAME.tar.gz.sha256" && cat "$NAME.tar.gz.sha256" )
echo "== $HERE/dist/$NAME.tar.gz"
