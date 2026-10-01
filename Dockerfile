FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json
RUN npm ci --no-audit --no-fund
COPY . .
RUN mkdir -p backend/uploads && npm run build && npm prune --omit=dev
FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=5000
COPY --from=build --chown=node:node /app /app
USER node
EXPOSE 5000
CMD ["sh","-c","node scripts/migrate.mjs && node backend/dist/server.js"]
