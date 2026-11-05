#!/bin/bash
# Charivari — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — GNU GPL, version 3 or later (LICENSE)
# Publie Charivari sur GitHub, depuis le Mac de l'auteur, dans ce dossier, en deux temps :
#   bash publish_release.sh            1. envoie le code dans le dépôt public <compte>/Charivari (créé s'il n'existe pas) et
#                                         lance un essai des compilations Windows et Linux (onglet Actions, 10 à 20 min)
#   bash publish_release.sh --release  2. quand l'essai est vert : pose l'étiquette v<version> et crée la release avec
#                                         l'installeur macOS ; les installeurs Windows et Linux s'y ajoutent seuls, puis les
#                                         empreintes SHA-256 des trois s'écrivent en bas de la page
#   bash publish_release.sh --checksums  réécrit ces empreintes en bas de la page de la version (et retire d'anciens .sha256)
# GitHub CLI (gh, https://cli.github.com) : la première fois, « gh auth login » ouvre le navigateur ; on y colle le code
# affiché ici et on autorise GitHub CLI (dépôts et « workflows », révocable dans Settings › Applications)
set -eu
HERE="$(cd "$(dirname "$0")" && pwd)"; cd "$HERE"
V="$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' patch/charivari.cmajorpatch | head -1)"
PKG=""
for p in "$HERE/dist/Charivari-$V-macOS.pkg" "$HERE/../../plugin_v6_9/dist/Charivari-$V-macOS.pkg"; do [ -f "$p" ] && { PKG="$p"; break; }; done
[ -n "$PKG" ] || { echo "Installeur macOS Charivari-$V-macOS.pkg introuvable (bash build_pkg.sh d'abord)"; exit 1; }
command -v gh >/dev/null 2>&1 || { echo "Il manque GitHub CLI : télécharge l'installeur macOS sur https://cli.github.com, installe-le, puis relance."; exit 1; }
if ! gh auth status --hostname github.com >/dev/null 2>&1; then
  gh auth login --hostname github.com --git-protocol https --web --scopes workflow
elif ! gh auth status --hostname github.com 2>&1 | grep -q "workflow"; then
  gh auth refresh --hostname github.com --scopes workflow
fi
gh auth setup-git --hostname github.com
OWNER="$(gh api user --jq .login)"; UID_="$(gh api user --jq .id)"; REPO="$OWNER/Charivari"
echo "== Charivari $V → https://github.com/$REPO"
gh repo view "$REPO" >/dev/null 2>&1 || gh repo create "$REPO" --public \
  --description "Rough music for one sound: one sample paraded as sixteen caricatured mummers (CLAP, VST3 — macOS, Windows, Linux)"
[ -d .git ] || git init -q -b main
git config user.name "Matthieu Guillin"
git config user.email "$UID_+$OWNER@users.noreply.github.com"      # l'adresse anonyme que GitHub donne à chaque compte
git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$REPO.git"
git add -A
git diff --cached --quiet || git commit -q -m "Charivari $V"
git push -u origin main
if [ "${1:-}" = "--checksums" ]; then
  # (1.0.1) les empreintes dans le texte de la page plutôt qu'en fichiers .sha256 à côté des installeurs (Mat : « plusieurs
  # installeurs, un avec sha256 et un autre sans » — on aurait dit des doublons)
  T="v$V"; W="$(mktemp -d)"
  for a in $(gh release view "$T" -R "$REPO" --json assets --jq '.assets[].name'); do
    case "$a" in *.sha256) gh release delete-asset "$T" "$a" -R "$REPO" -y;; esac
  done
  gh release download "$T" -R "$REPO" --pattern 'Charivari-*' --dir "$W"
  BODY="$(gh release view "$T" -R "$REPO" --json body --jq .body | sed '/^### SHA-256/,$d' \
    | sed 's/Each installer has its `\.sha256`\. /Download only the installer for your system; its SHA-256 checksum is at the bottom of this page. /')"
  { printf '%s\n\n### SHA-256\n```\n' "$BODY"; ( cd "$W" && shasum -a 256 Charivari-* ); printf '```\n'; } > "$W/notes.md"
  gh release edit "$T" -R "$REPO" --notes-file "$W/notes.md"
  ( cd "$W" && shasum -a 256 Charivari-* ); rm -rf "$W"
  echo "== empreintes écrites en bas de : https://github.com/$REPO/releases/tag/$T"
  exit 0
fi
if [ "${1:-}" != "--release" ]; then
  # l'essai : les compilations Windows et Linux sur le code envoyé, sans release
  for i in 1 2 3 4 5 6; do gh workflow run build.yml -R "$REPO" --ref main >/dev/null 2>&1 && break; sleep 5; done
  echo "== code envoyé : https://github.com/$REPO"
  echo "== essai des compilations Windows et Linux : https://github.com/$REPO/actions"
  echo "   quand il est vert :  bash publish_release.sh --release"
  exit 0
fi
git rev-parse -q --verify "refs/tags/v$V" >/dev/null || git tag -a "v$V" -m "Charivari $V"
git push origin "v$V"
NOTES="$(mktemp)"; sed "s/@VERSION@/$V/g" packaging/release_notes.md > "$NOTES"
gh release view "v$V" -R "$REPO" >/dev/null 2>&1 || gh release create "v$V" -R "$REPO" --verify-tag --title "Charivari $V" --notes-file "$NOTES"
gh release upload "v$V" -R "$REPO" "$PKG" --clobber
rm -f "$NOTES"
echo "== la release : https://github.com/$REPO/releases/tag/v$V"
echo "== Windows et Linux en cours de compilation : https://github.com/$REPO/actions"
