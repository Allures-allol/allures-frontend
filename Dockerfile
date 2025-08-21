# ===== Build stage =====
FROM node:20-alpine AS builder

WORKDIR /app

# Устанавливаем зависимости
COPY package*.json ./
RUN npm ci

# Копируем исходники
COPY . .

# Отключаем телеметрию и билдим standalone
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ===== Runner stage =====
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Копируем нужное из builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Указываем порт (по умолчанию Next слушает 3000)
EXPOSE 8069

# Запускаем
CMD ["node", "server.js"]
