# Build context: repo root (tactical-board). Build with: docker build -f server/Dockerfile .
FROM node:20-alpine

WORKDIR /app
COPY server/ ./server/
COPY shared/ ./shared/

WORKDIR /app/server
RUN npm ci
RUN npm run build
RUN npm prune --omit=dev

EXPOSE 3000
CMD ["node", "dist/server/src/index.js"]
