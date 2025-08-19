# syntax=docker.io/docker/dockerfile:1.7-labs

FROM node:20.11-slim AS base
WORKDIR /app
COPY . /app

RUN find . -name "node_modules" -type d -prune -exec rm -rf '{}' + \
 && find . -name "dist" -type d -prune -exec rm -rf '{}' + \
 && find . -name ".next" -type d -prune -exec rm -rf '{}' + \
 && find . -type f -name "tsconfig.tsbuildinfo" -exec rm {} + \
 && find . -type f -name "tsconfig.build.tsbuildinfo" -exec rm {} +

FROM base AS build
RUN --mount=type=cache,target=/root/.npm npm ci
RUN npm run build


FROM base AS prod-deps
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev
RUN for dir in $(find packages services -maxdepth 2 -name package.json -exec dirname {} \;); do \
      mkdir -p "$dir/node_modules"; \
    done



FROM base
COPY --from=build --exclude=*/node_modules /app/packages /app/packages
COPY --from=build --exclude=node_modules /app/services/faucet-service /app/services/faucet-service

COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=prod-deps /app/packages /app/packages
COPY --from=prod-deps /app/services/faucet-service/node_modules /app/services/faucet-service/node_modules

WORKDIR /app/services/faucet-service
CMD ["npm", "run", "start"]
