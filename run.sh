#!/usr/bin/env bash
set -e

cd /app

echo ">>> Node: $(node -v)  npm: $(npm -v)"
echo ">>> RAM disponível:"
free -h || true

# Limita heap do Node durante o build para evitar OOM em VPS com pouca RAM.
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=2048}"

# Instala dependências apenas se node_modules não existir
if [ ! -d "node_modules" ]; then
  echo ">>> Instalando dependências (npm install)…"
  npm install --legacy-peer-deps --include=optional --no-audit --no-fund
fi

# Fix npm bug #4828: bindings nativos opcionais (Rolldown) são pulados com
# --legacy-peer-deps. Instala manualmente o binário Linux se faltar.
ARCH=$(uname -m)
case "$ARCH" in
  x86_64)  ROLLDOWN_PKG="@rolldown/binding-linux-x64-gnu" ;;
  aarch64) ROLLDOWN_PKG="@rolldown/binding-linux-arm64-gnu" ;;
  *)       ROLLDOWN_PKG="" ;;
esac
if [ -n "$ROLLDOWN_PKG" ] && [ ! -d "node_modules/$ROLLDOWN_PKG" ]; then
  echo ">>> Instalando binding nativo do Rolldown ($ROLLDOWN_PKG)…"
  npm install "$ROLLDOWN_PKG" --no-save --legacy-peer-deps --no-audit --no-fund || true
fi

# Builda apenas se .output não existir
if [ ! -f ".output/server/index.mjs" ]; then
  echo ">>> Build de produção (NODE_OPTIONS=$NODE_OPTIONS)…"
  npm run build
fi

echo ">>> Subindo servidor Node em 0.0.0.0:${PORT:-${NODE_APP_PORT:-3000}}"
export HOST=0.0.0.0
export PORT=${PORT:-${NODE_APP_PORT:-3000}}
# Reseta NODE_OPTIONS para runtime (heap padrão do Node basta para servir).
unset NODE_OPTIONS
exec node .output/server/index.mjs
