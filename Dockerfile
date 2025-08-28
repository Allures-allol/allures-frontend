FROM node:lts-alpine

ENV NODE_ENV=production

WORKDIR /usr/src/app

# копируем package.json из my-app
COPY my-app/package*.json ./

RUN npm install --production --silent

# копируем всё приложение
COPY my-app/. .

EXPOSE 3000

RUN chown -R node /usr/src/app

USER node

CMD ["npm", "start"]
