# ===== Build stage =====
FROM node:20-alpine AS builder
WORKDIR /app

# Копируем корневой package.json и lock для скриптов (если реально нужны)
COPY my-app/package*.json ./
RUN npm ci

# Копируем приложение
COPY my-app/ ./my-app
WORKDIR /app/my-app

# Ставим зависимости приложения
RUN npm ci

# Отключаем телеметрию и билдим standalone
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ===== Runner stage =====
FROM node:20-alpine AS runner
WORKDIR /app/my-app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Копируем билд и статику
COPY --from=builder /app/my-app/.next/standalone ./
COPY --from=builder /app/my-app/.next/static ./.next/static
COPY --from=builder /app/my-app/public ./public

# Если корневые скрипты нужны в рантайме, копируем node_modules из build
COPY --from=builder /app/node_modules ../node_modules

EXPOSE 8069
CMD ["node", "server.js"]
