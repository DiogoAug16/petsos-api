FROM node:lts-alpine

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV HUSKY=0
ENV npm_config_ignore_scripts=true

COPY package*.json ./

RUN npm install --omit=dev

COPY . .

EXPOSE 3030

RUN chown -R node:node /usr/src/app
USER node

CMD ["node", "server.js"]