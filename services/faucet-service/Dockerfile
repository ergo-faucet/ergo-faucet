# syntax=docker.io/docker/dockerfile:1.7-labs

FROM node:22.18-slim AS base
WORKDIR /app
COPY . /app

FROM base AS build
RUN npm i -g npm@11.6.2
RUN --mount=type=cache,target=/root/.npm npm ci
RUN npm run build


FROM base AS prod-deps
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

FROM base
COPY --from=build --exclude=*/node_modules /app/packages /app/packages
COPY --from=build --exclude=node_modules /app/services/faucet-service /app/services/faucet-service

COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=prod-deps /app/packages /app/packages
COPY --from=prod-deps /app/services/faucet-service/node_modules /app/services/faucet-service/node_modules

WORKDIR /app/services/faucet-service
CMD ["npm", "run", "start"]
