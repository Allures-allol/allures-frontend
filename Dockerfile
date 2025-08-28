FROM node:lts-alpine

ENV NODE_ENV=production

WORKDIR /usr/src/app

# Устанавливаем зависимости для сборки native модулей
RUN apk add --no-cache python3 make g++

COPY my-app/package*.json ./

RUN npm install --production --verbose

COPY my-app/. .

EXPOSE 3000

RUN chown -R node /usr/src/app

USER node

CMD ["npm", "start"]
#

