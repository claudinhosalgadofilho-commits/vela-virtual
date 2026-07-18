# --- build stage ---
FROM node:22 AS build
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm ci --include=optional --no-audit --no-fund

COPY . .
ENV NODE_OPTIONS=--max-old-space-size=2048
RUN npm run build

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
