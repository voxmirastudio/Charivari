#!/bin/bash
# Charivari — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — GNU GPL, version 3 or later (LICENSE)
# Fetches what the plugin is built with, at the exact versions of the release, with git (nothing else is downloaded):
#   deps/clap            CLAP 1.2.10 (MIT)
#   deps/clap-wrapper    clap-wrapper 0.17.0 (MIT), with the four files Vox Mira Studio modified (clap-wrapper-patch/src)
#   deps/vst3sdk         VST 3 SDK 3.8.0 build 66 (MIT): base, cmake, pluginterfaces, public.sdk
#   clap_project/include Cmajor 1.0.3175 headers (GPLv3 / ISC) and CHOC a08bfd8 (ISC), as `cmaj generate` wrote them
# Run it once before build_mac.sh / build_linux.sh (the Windows build in .github/workflows runs it too).
set -eu
HERE="$(cd "$(dirname "$0")" && pwd)"
D="$HERE/deps"; INC="$HERE/clap_project/include"
mkdir -p "$D" "$INC"
q () { git -c advice.detachedHead=false "$@"; }

if [ ! -f "$D/clap/include/clap/clap.h" ]; then
  q clone --quiet --depth 1 --branch 1.2.10 https://github.com/free-audio/clap "$D/clap"
fi
if [ ! -f "$D/clap-wrapper/CMakeLists.txt" ]; then
  q clone --quiet --depth 1 --branch v0.17.0 https://github.com/free-audio/clap-wrapper "$D/clap-wrapper"
fi
cp "$HERE"/clap-wrapper-patch/src/* "$D/clap-wrapper/src/"
if [ ! -f "$D/vst3sdk/pluginterfaces/base/funknown.h" ]; then
  q clone --quiet --depth 1 --branch v3.8.0_build_66 https://github.com/steinbergmedia/vst3sdk "$D/vst3sdk"
  q -C "$D/vst3sdk" submodule --quiet update --init --depth 1 base cmake pluginterfaces public.sdk
fi
if [ ! -f "$INC/cmajor/API/cmaj_Engine.h" ]; then
  T="$D/.cmajor"; rm -rf "$T"
  q clone --quiet --depth 1 --branch 1.0.3175 --filter=blob:none --sparse https://github.com/cmajor-lang/cmajor "$T"
  q -C "$T" sparse-checkout set include/cmajor
  rm -rf "$INC/cmajor"; cp -R "$T/include/cmajor" "$INC/cmajor"; rm -rf "$T"
fi
if [ ! -f "$INC/choc/choc/gui/choc_WebView.h" ]; then
  T="$D/.choc"; rm -rf "$T"; mkdir -p "$T"
  q -C "$T" init --quiet; q -C "$T" remote add origin https://github.com/Tracktion/choc
  q -C "$T" fetch --quiet --depth 1 origin a08bfd84494921700703a8433b9d1a304edfafd2; q -C "$T" checkout --quiet FETCH_HEAD
  rm -rf "$INC/choc"; mkdir -p "$INC/choc"; cp -R "$T/choc" "$INC/choc/choc"; cp "$T/LICENSE.md" "$INC/choc/LICENSE.md"; rm -rf "$T"
fi
echo "deps ready: CLAP 1.2.10, clap-wrapper 0.17.0 (+ patch), VST 3 SDK 3.8.0, Cmajor 1.0.3175 headers, CHOC a08bfd8"
