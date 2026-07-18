# --- build stage ---
FROM oven/bun:1 AS build
WORKDIR /app

COPY package.json bun.lock* bunfig.toml* ./
RUN bun install --frozen-lockfile || bun install

COPY . .
RUN bun run build

# --- runtime stage ---
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Nitro node-server preset gera um bundle standalone em .output/
COPY --from=build /app/.output ./.output

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
