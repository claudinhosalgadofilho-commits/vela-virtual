#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$SCRIPT_DIR}"

# Em Docker multi-stage o projeto costuma estar em /app. Em iContainer/bind mount,
# o projeto fica na mesma pasta do run.sh. Nunca usamos `git pull` aqui, porque
# algumas VPS recebem os arquivos por upload/SFTP e nem sempre têm uma pasta .git.
if [ -f "$PROJECT_DIR/package.json" ]; then
  cd "$PROJECT_DIR"
elif [ -f "/app/package.json" ]; then
  cd /app
else
  echo "ERRO: package.json não encontrado."
  echo "Pasta atual: $(pwd)"
  echo "Pasta do run.sh: $SCRIPT_DIR"
  echo ""
  echo "Envie/clone o projeto completo para esta pasta antes de rodar:"
  echo "  /etc/icontainer/runtime/node/vela-virtual"
  echo ""
  echo "Arquivos obrigatórios na pasta: package.json, package-lock.json, src/, public/, vite.config.ts"
  exit 1
fi

echo ">>> Node: $(node -v)  npm: $(npm -v)"
echo ">>> RAM disponível:"
free -h || true

# Limita heap do Node durante o build para evitar OOM em VPS com pouca RAM.
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=2048}"

# Carrega .env se existir. Se não existir, continua: variáveis podem vir do painel.
if [ -f ".env" ]; then
  set -a
  # shellcheck disable=SC1091
  source ./.env
  set +a
fi

# Instala dependências apenas se node_modules não existir.
# Usa npm puro porque a VPS/iContainer executa Node.js + npm; manter um único
# gerenciador evita lockfiles divergentes e conflitos de peer dependencies.
if [ ! -d "node_modules" ]; then
  # Força instalação de devDependencies mesmo se NODE_ENV=production estiver no .env
  # (o Vite/TanStack plugin fica em devDependencies e é necessário para o build).
  if [ -f "package-lock.json" ] || [ -f "npm-shrinkwrap.json" ]; then
    echo ">>> Instalando dependências (npm ci, incluindo devDependencies)…"
    NODE_ENV=development npm ci --include=dev --include=optional --no-audit --no-fund
  else
    echo ">>> package-lock.json não encontrado; usando npm install…"
    NODE_ENV=development npm install --include=dev --include=optional --no-audit --no-fund
  fi
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
  npm install "$ROLLDOWN_PKG" --no-save --include=optional --no-audit --no-fund || true
fi

# Builda apenas se .output não existir
if [ ! -f ".output/server/index.mjs" ]; then
  echo ">>> Build de produção (NODE_OPTIONS=$NODE_OPTIONS)…"
  NODE_ENV=development npm run build
fi

echo ">>> Subindo servidor Node em 0.0.0.0:${PORT:-${NODE_APP_PORT:-3000}}"
export HOST=0.0.0.0
export PORT=${PORT:-${NODE_APP_PORT:-3000}}
# Reseta NODE_OPTIONS para runtime (heap padrão do Node basta para servir).
unset NODE_OPTIONS
exec node .output/server/index.mjs
