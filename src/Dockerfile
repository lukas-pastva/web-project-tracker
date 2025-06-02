FROM node:20-alpine AS client-build
WORKDIR /app/client
ENV NPM_CONFIG_LEGACY_PEER_DEPS=true

COPY client/package*.json ./
COPY client/vite.config.js ./
COPY client/src ./src
RUN npm install && npm run build

FROM node:20-alpine
WORKDIR /app/server

RUN apk add --no-cache curl

COPY server/package*.json ./
RUN npm install

COPY server .
COPY --from=client-build /app/client/dist ./public

ENV PORT=8080
EXPOSE 8080
CMD ["node", "src/index.js"]
