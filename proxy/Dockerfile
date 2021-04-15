FROM node:15.14.0

WORKDIR /usr/app

COPY package*.json ./
COPY . .

RUN npm install && npm install forever

CMD [ "npm", "start" ]
