# ===== Build stage =====
FROM node:20-alpine AS builder
WORKDIR /app/my-app

# Копируем package.json и package-lock.json приложения
COPY my-app/package*.json ./

# Ставим зависимости приложения
RUN npm ci

# Копируем весь проект
COPY my-app/ ./

# Билдим Next.js
RUN npm run build

# ===== Runner stage =====
FROM node:20-alpine AS runner
WORKDIR /app/my-app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Копируем билд и зависимости
COPY --from=builder /app/my-app/.next ./.next
COPY --from=builder /app/my-app/public ./public
COPY --from=builder /app/my-app/package*.json ./
COPY --from=builder /app/my-app/node_modules ./node_modules

# Экспонируем порт 8069
EXPOSE 8069

# Стандартный запуск Next.js
CMD ["npm", "start"]
