FROM node:22-alpine

RUN npm install -g pnpm@9

WORKDIR /app
COPY package.json pnpm-lock.yaml tsconfig.json ./
RUN pnpm install --frozen-lockfile

COPY src/ ./src/

# Railway sets PORT; fall back to 3000 for local
ENV HOST=0.0.0.0

RUN addgroup -S billing && adduser -S billing -G billing
USER billing

CMD ["node", "--import", "tsx/esm", "src/server.ts"]
