#!/bin/bash
# Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — GNU GPL, version 3 or later (LICENSE)
# Fabrique l'installeur macOS de Charivari : un seul .pkg qui pose le CLAP et le VST3 (binaire universel, Apple Silicon +
# Intel) dans /Library/Audio/Plug-Ins pour tous les utilisateurs du Mac, avec LICENSE, CREDITS.md et licences/ dans chaque
# plugin (Contents/Resources). Rien n'est téléchargé ; l'installeur n'est pas signé par Apple (pas de compte développeur).
#   bash build_pkg.sh               compile en universel (build_mac.sh), puis fabrique dist/Charivari-<VERSION>-macOS.pkg
#   SKIP_BUILD=1 bash build_pkg.sh  reprend les plugins déjà compilés dans ./build (ils doivent être universels)
set -u
export COPYFILE_DISABLE=1   # les outils d'archive du Mac n'ajoutent pas de fichiers « ._ »
HERE="$(cd "$(dirname "$0")" && pwd)"
VERSION="1.0.1"
ID="com.voxmirastudio.charivari"
DIST="$HERE/dist"
WORK="$HERE/build_pkg"
PKG="$DIST/Charivari-$VERSION-macOS.pkg"
for f in LICENSE CREDITS.md licences; do
  [ -e "$HERE/$f" ] || { echo "il manque $f à côté de ce script"; exit 1; }
done
for t in pkgbuild productbuild lipo codesign ditto; do
  command -v "$t" >/dev/null 2>&1 || { echo "il manque l'outil Apple « $t » (xcode-select --install)"; exit 1; }
done

if [ "${SKIP_BUILD:-0}" != "1" ]; then
  ARCHS="arm64;x86_64" bash "$HERE/build_mac.sh" || { echo "ÉCHEC de la compilation : pas d'installeur"; exit 1; }
fi
CLAPB=$(find "$HERE/build" -name "Charivari.clap" -type d -prune | head -1)
VST3B=$(find "$HERE/build" -name "Charivari.vst3" -type d -prune | head -1)
[ -n "$CLAPB" ] && [ -n "$VST3B" ] || { echo "les plugins compilés manquent dans ./build"; exit 1; }

# le binaire de chaque plugin doit porter les deux architectures
for b in "$CLAPB" "$VST3B"; do
  bin="$b/Contents/MacOS/Charivari"
  [ -f "$bin" ] || bin=$(find "$b/Contents/MacOS" -type f | head -1)
  a=$(lipo -archs "$bin" 2>/dev/null)
  case " $a " in *" arm64 "*) ;; *) echo "pas d'arm64 dans $bin ($a)"; exit 1;; esac
  case " $a " in *" x86_64 "*) ;; *) echo "pas d'x86_64 dans $bin ($a) : relance sans SKIP_BUILD"; exit 1;; esac
  echo "binaire universel ($a) : $(basename "$b")"
  v=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "$b/Contents/Info.plist" 2>/dev/null)
  id=$(/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "$b/Contents/Info.plist" 2>/dev/null)
  [ "$v" = "$VERSION" ] || { echo "version « $v » dans $(basename "$b") au lieu de $VERSION : relance sans SKIP_BUILD"; exit 1; }
  echo "version $v, identifiant $id : $(basename "$b")"
done

# la charge : ce que l'installeur pose dans /Library/Audio/Plug-Ins (CLAP/, VST3/) — rien au-dessus, pour ne jamais
# toucher aux droits des dossiers du système
rm -rf "$WORK"
ROOT="$WORK/root"
mkdir -p "$ROOT/CLAP" "$ROOT/VST3" "$WORK/resources" "$DIST"
ditto "$CLAPB" "$ROOT/CLAP/Charivari.clap"
ditto "$VST3B" "$ROOT/VST3/Charivari.vst3"
xattr -cr "$ROOT" 2>/dev/null || true
for b in "$ROOT/CLAP/Charivari.clap" "$ROOT/VST3/Charivari.vst3"; do
  mkdir -p "$b/Contents/Resources"
  # -X : sans les attributs étendus du Mac (com.apple.provenance que macOS pose sur les fichiers écrits par une application,
  # que « xattr -c » ne retire pas et que pkgbuild emballait en fichiers « ._ » cachés dans les plugins)
  cp -X "$HERE/LICENSE" "$HERE/CREDITS.md" "$b/Contents/Resources/"
  rm -rf "$b/Contents/Resources/licences"; mkdir "$b/Contents/Resources/licences"
  for t in "$HERE"/licences/*.txt; do cp -X "$t" "$b/Contents/Resources/licences/"; done
  # les textes ajoutés changent le contenu du paquet : on le re-signe (signature locale, gratuite) pour qu'il reste valide
  codesign --force --deep -s - "$b" >/dev/null 2>&1 || { echo "signature locale impossible : $b"; exit 1; }
  codesign --verify --deep --strict "$b" || { echo "la signature ne se vérifie pas : $b"; exit 1; }
done
chmod -R u=rwX,go=rX "$ROOT"

# les plugins restent à leur place même si une copie existe ailleurs sur le Mac (pas de « relocation »)
pkgbuild --analyze --root "$ROOT" "$WORK/components.plist" >/dev/null || { echo "ÉCHEC pkgbuild --analyze"; exit 1; }
i=0
while /usr/libexec/PlistBuddy -c "Print :$i" "$WORK/components.plist" >/dev/null 2>&1; do
  # (la clé manque pour un plugin : on l'ajoute ; sans elle l'installeur peut « reloger » le plugin dans une autre copie
  # du même identifiant trouvée sur le disque, par exemple dans ~/Library, au lieu de /Library)
  /usr/libexec/PlistBuddy -c "Set :$i:BundleIsRelocatable false" "$WORK/components.plist" 2>/dev/null \
    || /usr/libexec/PlistBuddy -c "Add :$i:BundleIsRelocatable bool false" "$WORK/components.plist" \
    || { echo "ÉCHEC : impossible de fixer l'emplacement du composant $i"; exit 1; }
  [ "$(/usr/libexec/PlistBuddy -c "Print :$i:BundleIsRelocatable" "$WORK/components.plist")" = "false" ] \
    || { echo "ÉCHEC : le composant $i reste relogeable"; exit 1; }
  echo "emplacement fixé : $(/usr/libexec/PlistBuddy -c "Print :$i:RootRelativeBundlePath" "$WORK/components.plist")"
  i=$((i + 1))
done
[ "$i" -ge 2 ] || { echo "ÉCHEC : pkgbuild --analyze n'a pas trouvé les deux plugins"; exit 1; }
pkgbuild --root "$ROOT" --component-plist "$WORK/components.plist" --identifier "$ID" --version "$VERSION" \
  --install-location /Library/Audio/Plug-Ins "$WORK/Charivari.pkg" || { echo "ÉCHEC pkgbuild"; exit 1; }
if pkgutil --payload-files "$WORK/Charivari.pkg" | grep -q '/\._'; then
  echo "ÉCHEC : des fichiers cachés « ._ » sont dans la charge :"; pkgutil --payload-files "$WORK/Charivari.pkg" | grep '/\._'; exit 1
fi
echo "charge propre : aucun fichier caché « ._ »"

# les pages de l'installeur : bienvenue, puis les crédits (à lire, sans case « j'accepte » : la GPL n'en demande pas)
cat > "$WORK/resources/welcome.html" <<EOF
<html><body style="font-family:-apple-system,Helvetica,sans-serif;font-size:13px;line-height:1.45">
<h2 style="margin-top:0">Charivari $VERSION</h2>
<p>Rough music for one sound: one sample, paraded as sixteen caricatured mummers. The subject plays as a seventeenth pad.</p>
<p>This installs the <b>CLAP</b> and <b>VST3</b> plugins, for Apple Silicon and Intel Macs (macOS 10.15 or later), for every user of this Mac:</p>
<ul><li>/Library/Audio/Plug-Ins/CLAP/Charivari.clap</li><li>/Library/Audio/Plug-Ins/VST3/Charivari.vst3</li></ul>
<p>Rescan your plugins in your host afterwards. Sixteen stereo outputs (1/2 to 31/32): in REAPER Charivari follows the track's channel count.</p>
<p>By Matthieu Guillin, Vox Mira Studio. Free software under the GNU General Public License, version 3 or later.</p>
</body></html>
EOF
cp "$HERE/CREDITS.md" "$WORK/resources/CREDITS.txt"
cat > "$WORK/distribution.xml" <<EOF
<?xml version="1.0" encoding="utf-8"?>
<installer-gui-script minSpecVersion="2">
  <title>Charivari $VERSION</title>
  <organization>com.voxmirastudio</organization>
  <welcome file="welcome.html" mime-type="text/html"/>
  <readme file="CREDITS.txt" mime-type="text/plain"/>
  <options customize="never" require-scripts="false" hostArchitectures="arm64,x86_64"/>
  <domains enable_localSystem="true"/>
  <volume-check><allowed-os-versions><os-version min="10.15"/></allowed-os-versions></volume-check>
  <choices-outline><line choice="$ID"/></choices-outline>
  <choice id="$ID" title="Charivari $VERSION" visible="false"><pkg-ref id="$ID"/></choice>
  <pkg-ref id="$ID" version="$VERSION" onConclusion="none">Charivari.pkg</pkg-ref>
</installer-gui-script>
EOF
rm -f "$PKG"
productbuild --distribution "$WORK/distribution.xml" --resources "$WORK/resources" --package-path "$WORK" "$PKG" \
  || { echo "ÉCHEC productbuild"; exit 1; }

# contrôle : ce que le .pkg contient, et son empreinte pour la page de téléchargement
pkgutil --payload-files "$WORK/Charivari.pkg" | grep -E "Charivari\.(clap|vst3)(/Contents/(Info\.plist|Resources/(LICENSE|CREDITS\.md)))?$" | sort
( cd "$DIST" && shasum -a 256 "$(basename "$PKG")" > "$(basename "$PKG").sha256" && cat "$(basename "$PKG").sha256" )
echo "== $PKG ($(du -h "$PKG" | cut -f1))"
for d in ~/Library/Audio/Plug-Ins/CLAP/Charivari.clap ~/Library/Audio/Plug-Ins/VST3/Charivari.vst3; do
  [ -e "$d" ] && echo "attention : une autre copie est installée pour ton seul compte ($d) ; ton hôte verra les deux"
done
echo "== terminé"
