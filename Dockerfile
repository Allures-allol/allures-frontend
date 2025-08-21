# ===== Build stage =====
FROM node:20-alpine AS builder
WORKDIR /app

# Копируем корневые node_modules и package.json
COPY my-app/package*.json ./       # корневой package.json
COPY node_modules ./node_modules  # если нужны скрипты

# Копируем приложение
COPY my-app/ ./my-app/

WORKDIR /app/my-app
RUN npm ci
RUN npm run build

# ===== Runner stage =====
FROM node:20-alpine AS runner
WORKDIR /app/my-app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Копируем билд
COPY --from=builder /app/my-app/.next/standalone ./
COPY --from=builder /app/my-app/.next/static ./.next/static
COPY --from=builder /app/my-app/public ./public

# Если нужны корневые скрипты:
COPY --from=builder /app/node_modules ../node_modules

EXPOSE 8069
CMD ["node", "server.js"]
