FROM node
WORKDIR /usr/src/action

COPY package*.json ./
RUN npm install
COPY . .
CMD [ "node", "index.js" ]