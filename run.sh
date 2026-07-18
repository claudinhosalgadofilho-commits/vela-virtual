#!/usr/bin/env bash
set -e

cd /app

echo ">>> Node: $(node -v)  npm: $(npm -v)"

# Instala dependências apenas se node_modules não existir
if [ ! -d "node_modules" ]; then
  echo ">>> Instalando dependências (npm install)…"
  npm install --legacy-peer-deps --include=optional
fi

# Fix npm bug #4828: bindings nativos opcionais (Rolldown) são pulados com
# --legacy-peer-deps. Instala manualmente o binário Linux x64 se faltar.
if [ ! -d "node_modules/@rolldown/binding-linux-x64-gnu" ]; then
  echo ">>> Instalando binding nativo do Rolldown (workaround npm #4828)…"
  npm install @rolldown/binding-linux-x64-gnu --no-save --legacy-peer-deps || true
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
