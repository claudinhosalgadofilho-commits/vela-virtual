# Deploy em VPS (Node.js)

O projeto foi adaptado para gerar um bundle **Node.js standalone** via Nitro
(preset `node-server`). O build produz `.output/server/index.mjs`, executável
com `node` puro.

> Na VPS use **npm**, não misture Bun e npm. O repositório mantém
> `package-lock.json` como fonte única de instalação.

---

## 1. Variáveis de ambiente

Crie um arquivo `.env` na raiz da VPS (nunca comite):

```env
# Supabase / Lovable Cloud (obtenha no painel do projeto)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...   # apenas server-side
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_SUPABASE_PROJECT_ID=xxxx

# App
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
```

> `VITE_*` são embutidas no bundle no momento do `build`. Se mudar, precisa
> rebuildar. As demais são lidas em runtime pelas server functions.

---

## 2. Opção A — PM2 + Nginx (mais leve)

### Pré-requisitos na VPS

```bash
# Ubuntu 22.04+
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs nginx
sudo npm i -g pm2
```

### Build e start

```bash
git clone <seu-repo> app && cd app
npm ci --include=optional --no-audit --no-fund
NODE_OPTIONS=--max-old-space-size=2048 npm run build  # gera .output/
pm2 start .output/server/index.mjs --name vela-virtual --update-env
pm2 save
pm2 startup           # siga a instrução impressa (systemd)
```

### iContainer / pasta fixa `/etc/icontainer/runtime/node/vela-virtual`

O erro `package.json: no such file or directory` significa que o container está
na pasta certa, mas o projeto completo não foi enviado/clonado ali. Essa pasta
precisa conter pelo menos `package.json`, `package-lock.json`, `src/`, `public/`,
`vite.config.ts` e `run.sh`.

Se a VPS não usa Git, envie os arquivos do projeto por SFTP/upload do painel e
rode:

```bash
cd /etc/icontainer/runtime/node/vela-virtual
ls -la package.json package-lock.json src public vite.config.ts run.sh
chmod +x run.sh
rm -rf node_modules .output
bash run.sh
```

Se a VPS usa Git, clone dentro da pasta vazia:

```bash
cd /etc/icontainer/runtime/node
rm -rf vela-virtual
git clone <seu-repo> vela-virtual
cd vela-virtual
chmod +x run.sh
bash run.sh
```

Não coloque `git pull` dentro do comando de inicialização do container. Use Git
apenas para atualizar os arquivos antes de reiniciar.

### Nginx reverse proxy

`/etc/nginx/sites-available/vela-virtual`:

```nginx
server {
    listen 80;
    server_name seudominio.com www.seudominio.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/vela-virtual /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d seudominio.com -d www.seudominio.com
```

### Atualizar deploy

```bash
cd app
git pull
rm -rf node_modules .output
npm ci --include=optional --no-audit --no-fund
NODE_OPTIONS=--max-old-space-size=2048 npm run build
pm2 restart vela-virtual --update-env
```

---

## 3. Opção B — Docker

Já incluímos um `Dockerfile` multi-stage otimizado.

```bash
docker build -t vela-virtual .
docker run -d \
  --name vela-virtual \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env \
  vela-virtual
```

Com Nginx/Caddy/Traefik na frente para SSL.

---

## 4. Webhook do Mercado Pago

Depois do deploy, atualize a URL do webhook no painel do MP para:

```
https://seudominio.com/api/public/webhooks/mercadopago
```

---

## 5. Troubleshooting

| Sintoma | Causa provável | Fix |
|---|---|---|
| `fatal: not a git repository` | comando de start tentando rodar `git pull` em pasta sem `.git` | remova `git pull` do start; envie/clone o projeto completo antes |
| `package.json: no such file or directory` | projeto não está dentro da pasta `/etc/icontainer/runtime/node/vela-virtual` | envie/clone todos os arquivos do projeto para essa pasta |
| `npm ci` pede `package-lock.json` | lockfile não está na VPS ou start antigo força `npm ci` | envie `package-lock.json` ou use o `run.sh` atualizado, que cai para `npm install` |
| `run.sh: line 3: /.env: No such file` | script antigo tentando carregar `.env` com caminho vazio | substitua pelo `run.sh` atualizado; ele só carrega `.env` se existir |
| `Cannot find module '.output/server/index.mjs'` | build não rodou | `npm run build` |
| `ERESOLVE` com `zod` | lock/dependências antigas na VPS | `rm -rf node_modules package-lock.json` somente se o repo ainda estiver antigo; depois `git pull && npm install` |
| `Cannot find native binding` / Rolldown | dependência opcional não instalada | `rm -rf node_modules .output && npm ci --include=optional --no-audit --no-fund` |
| `Missing Supabase environment variable(s)` | `.env` não carregado pelo PM2 | `pm2 restart vela-virtual --update-env` após exportar as vars, ou use `pm2 start ecosystem.config.js` |
| 502 no Nginx | app não subiu | `pm2 logs vela-virtual` |
| `EADDRINUSE :3000` | porta ocupada | mudar `PORT` no `.env` e rebuildar (se necessário) |
| Página em branco / 500 | erro SSR | `pm2 logs vela-virtual --lines 200` |

---

## 6. Recomendações

- Use uma VPS com **mínimo 1GB RAM** (build precisa de ~2GB — se apertar,
  builde local/CI e envie apenas `.output/` + `package.json`).
- Configure `ufw`: libere apenas 22, 80, 443.
- Backup automático do `.env`.
- Monitore com `pm2 monit` ou Uptime Kuma.
