FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY services/worker-events/package*.json ./
COPY backend/prisma ./prisma
COPY services/worker-events/scripts ./scripts
COPY services/worker-events/tsconfig*.json ./
COPY services/worker-events/nest-cli.json ./
RUN npm ci

COPY services/worker-events/src ./src

RUN npm run build
RUN npm prune --omit=dev

FROM node:20-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3005

CMD ["node", "dist/main.js"]
