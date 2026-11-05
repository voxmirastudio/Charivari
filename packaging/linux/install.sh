#!/bin/bash
# Charivari — installs the CLAP and the VST3 on Linux (GNU GPL, version 3 or later: LICENSE)
#   ./install.sh               for you only: ~/.clap and ~/.vst3
#   sudo ./install.sh --system for every user: /usr/lib/clap and /usr/lib/vst3
#   ./install.sh --uninstall   (or sudo ./install.sh --system --uninstall) removes them
set -eu
HERE="$(cd "$(dirname "$0")" && pwd)"
SYS=0; UN=0
for a in "$@"; do case "$a" in --system) SYS=1;; --uninstall) UN=1;; *) echo "unknown option: $a"; exit 1;; esac; done
if [ "$SYS" = 1 ]; then CLAPD=/usr/lib/clap; VST3D=/usr/lib/vst3; DOC=/usr/share/doc/charivari; else CLAPD="$HOME/.clap"; VST3D="$HOME/.vst3"; DOC="${XDG_DATA_HOME:-$HOME/.local/share}/doc/charivari"; fi
if [ "$UN" = 1 ]; then
  rm -f "$CLAPD/Charivari.clap"; rm -rf "$VST3D/Charivari.vst3" "$DOC"; echo "Charivari removed from $CLAPD and $VST3D"; exit 0
fi
mkdir -p "$CLAPD" "$VST3D" "$DOC"
cp "$HERE/Charivari.clap" "$CLAPD/Charivari.clap"
rm -rf "$VST3D/Charivari.vst3"; cp -R "$HERE/Charivari.vst3" "$VST3D/Charivari.vst3"
cp "$HERE/LICENSE" "$HERE/CREDITS.md" "$DOC/"; rm -rf "$DOC/licences"; cp -R "$HERE/licences" "$DOC/licences"
echo "Charivari installed: $CLAPD/Charivari.clap and $VST3D/Charivari.vst3 — rescan your plugins."
# the interface is a web view: it needs WebKitGTK 4.1 and GTK 3 on this system
if command -v ldconfig >/dev/null 2>&1 && ! ldconfig -p 2>/dev/null | grep -q "libwebkit2gtk-4.1.so"; then
  echo "Note: libwebkit2gtk-4.1 was not found. Charivari's window needs it (Debian / Ubuntu: sudo apt install libwebkit2gtk-4.1-0)."
fi
