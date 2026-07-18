#!/usr/bin/env bash
set -e

cd /app

echo ">>> Node: $(node -v)  npm: $(npm -v)"

# Instala dependências apenas se node_modules não existir ou package.json mudou
if [ ! -d "node_modules" ] || [ package.json -nt node_modules ]; then
  echo ">>> Instalando dependências (npm ci)…"
  npm ci --legacy-peer-deps || npm install --legacy-peer-deps
fi

# Builda apenas se .output não existir
if [ ! -f ".output/server/index.mjs" ]; then
  echo ">>> Build de produção…"
  npm run build
fi

echo ">>> Subindo servidor Node em 0.0.0.0:${NODE_APP_PORT:-3000}"
export HOST=0.0.0.0
export PORT=${NODE_APP_PORT:-3000}
exec node .output/server/index.mjs
