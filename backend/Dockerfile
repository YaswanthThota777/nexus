FROM node:22.19.0-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY .env.example ./.env.example

EXPOSE 8080
CMD ["node", "src/server.js"]
