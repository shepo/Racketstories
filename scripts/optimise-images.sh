#!/usr/bin/env bash
# Resize source photos into the web-ready copies the site uses.
# Usage: scripts/optimise-images.sh <source-dir>   (needs ImageMagick)
# Writes static/images/<name>-{400,800}.webp and <name>-800.jpg (fallback + OG image).
set -euo pipefail
src="${1:?source dir}"
out="$(dirname "$0")/../static/images"
mkdir -p "$out"
for f in "$src"/*.jpg; do
  name="$(basename "$f" .jpg)"
  for w in 400 800; do
    convert "$f" -auto-orient -strip -resize "${w}x>" -quality 72 "$out/$name-$w.webp"
  done
  convert "$f" -auto-orient -strip -resize "800x>" -sampling-factor 4:2:0 -interlace JPEG -quality 74 "$out/$name-800.jpg"
done
ls -la "$out"
