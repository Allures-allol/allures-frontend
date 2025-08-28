FROM node:lts-alpine

WORKDIR /usr/src/app

# Копируем package.json и package-lock.json
COPY my-app/package*.json ./

# Ставим все зависимости для билда, включая dev
RUN npm install --legacy-peer-deps

# Копируем весь фронт
COPY my-app/. .

# Собираем production билд
RUN npm run build

# После билда можно удалить dev-зависимости, чтобы образ был легче
RUN npm prune --production

EXPOSE 3000
CMD ["npm", "start"]
