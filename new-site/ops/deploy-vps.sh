#!/bin/bash
set -euo pipefail
umask 022
base=/srv/jroth.space
export HOME="$base/.home"
export ASTRO_TELEMETRY_DISABLED=1
mkdir -p "$HOME" "$base/releases"
exec 9>"$base/.deploy.lock"
flock -n 9 || exit 0
if [ ! -d "$base/repository.git" ]; then
 git init --bare "$base/repository.git" >/dev/null
 git --git-dir="$base/repository.git" remote add origin https://github.com/andropar/andropar.github.io.git
fi
git --git-dir="$base/repository.git" fetch --quiet --depth=1 origin main
revision=$(git --git-dir="$base/repository.git" rev-parse FETCH_HEAD)
content=/srv/jroth-editor/new-site
content_hash=$(python3 - "$content" <<'PYTHON'
import hashlib, pathlib, sys
root=pathlib.Path(sys.argv[1]); digest=hashlib.sha256()
for folder in ('src/content/blog', 'public/blog/uploads'):
 for p in sorted((root/folder).rglob('*')):
  if p.is_file():
   digest.update(str(p.relative_to(root)).encode()); digest.update(p.read_bytes())
print(digest.hexdigest()[:16])
PYTHON
)
release="$revision-$content_hash"
if [ "$(readlink "$base/current" 2>/dev/null || true)" = "$base/releases/$release" ]; then exit 0; fi
build=$(mktemp -d "$base/.build.XXXXXXXX")
trap 'rm -rf "$build"' EXIT
git --git-dir="$base/repository.git" archive "$revision" | tar -x -C "$build"
cd "$build/new-site"
if [ -d "$content/src/content/blog" ]; then
 rm -rf src/content/blog public/blog/uploads
 cp -a "$content/src/content/blog" src/content/blog
 mkdir -p public/blog
 cp -a "$content/public/blog/uploads" public/blog/uploads
 chmod -R u+rwX,go+rX src/content/blog public/blog/uploads
fi
npm ci --no-audit --no-fund > "$build/npm-install.log" 2>&1 || { tail -n 60 "$build/npm-install.log"; exit 1; }
npm run build
[ -s dist/index.html ] && [ -s dist/admin/decap.js ] && [ -s dist/cv.pdf ]
if [ ! -d "$base/releases/$release" ]; then mv dist "$base/releases/$release"; fi
ln -s "$base/releases/$release" "$base/.current-$release"
mv -Tf "$base/.current-$release" "$base/current"
printf 'Deployed %s\n' "$release"

# Keep the five most recent releases, including the active one.
python3 - "$base" <<'PYTHON'
import pathlib, shutil, sys
base=pathlib.Path(sys.argv[1]); current=(base/'current').resolve()
releases=sorted((base/'releases').iterdir(), key=lambda p:p.stat().st_mtime, reverse=True)
for release in releases[5:]:
 if release.is_dir() and release.resolve()!=current: shutil.rmtree(release)
PYTHON
