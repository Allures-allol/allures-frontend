FROM node:lts-alpine

ENV NODE_ENV=production
WORKDIR /usr/src/app

COPY my-app/package*.json ./

# Обновляем зависимости перед установкой и ставим с игнором peerDeps
RUN npm install @mui/material@latest --legacy-peer-deps \
    && npm install --production --legacy-peer-deps

COPY my-app/. .

RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
