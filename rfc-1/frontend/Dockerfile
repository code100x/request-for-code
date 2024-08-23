FROM node:22-alpine
WORKDIR /app
COPY package.json .
RUN npm install
RUN npm i -g serve
COPY . .
RUN npm run build
EXPOSE 3002
CMD [ "serve", "-s", "dist" ]