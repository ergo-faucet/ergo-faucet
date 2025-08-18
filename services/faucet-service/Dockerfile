FROM node:20.11-slim AS base
WORKDIR /app
COPY . /app

FROM base AS build
RUN --mount=type=cache,target=/root/.npm npm ci 
RUN npm run build 

FROM base AS prod-deps
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev
RUN for dir in $(find packages services -maxdepth 2 -name package.json -exec dirname {} \;); do   mkdir -p "$dir/node_modules"; done


FROM base
COPY --from=build /app/packages /app/packages
COPY --from=build /app/services /app/services

COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=prod-deps /app/packages /app/packages
COPY --from=prod-deps /app/services /app/services

WORKDIR /app/services/faucet-service
CMD ["npm", "run", "start"]
