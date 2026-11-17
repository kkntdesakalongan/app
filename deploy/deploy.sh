#!/usr/bin/env bash
set -euo pipefail

root=/opt/kknkalongan
release="$root/releases/${GITHUB_SHA:-$(git rev-parse HEAD)}"
mkdir -p "$root/releases"
if [ -e "$release" ]; then
  release="$release-$(date +%s)"
fi
mkdir "$release"
git archive HEAD | tar -x -C "$release"
cd "$release"
pnpm install --frozen-lockfile
VITE_API_URL=/ pnpm build
set -a
source "$root/app.env"
set +a
pnpm --filter @southneuhof/api db:migrate
if [ ! -f "$root/.seeded" ]; then
  pnpm --filter @southneuhof/api db:seed
  touch "$root/.seeded"
fi
ln -sfn "$release" "$root/next"
mv -Tf "$root/next" "$root/current"
env -i HOME="$HOME" PATH="$PATH" USER="$USER" pm2 startOrRestart "$release/deploy/ecosystem.config.cjs" --update-env
env -i HOME="$HOME" PATH="$PATH" USER="$USER" pm2 save
sudo systemctl reload nginx
curl --fail --silent --show-error --retry 10 --retry-connrefused --retry-delay 2 http://127.0.0.1:5180/api/health
