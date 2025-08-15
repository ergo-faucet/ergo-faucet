FROM node:20.11-slim AS base
WORKDIR /app
COPY . /app

FROM base AS build
RUN --mount=type=cache,target=/root/.npm npm ci 
RUN npm run build 

FROM base AS prod-deps
ENV CI=true
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev
RUN mkdir -p /app/packages/common-types/node_modules \
    && mkdir -p /app/packages/controller/node_modules \
    && mkdir -p /app/packages/database/node_modules \
    && mkdir -p /app/packages/discord-auth/node_modules \
    && mkdir -p /app/packages/ergo-authentication/node_modules \
    && mkdir -p /app/packages/fastify-server/node_modules \
    && mkdir -p /app/packages/google-auth/node_modules \
    && mkdir -p /app/packages/google-recaptcha/node_modules \
    && mkdir -p /app/packages/x-auth/node_modules \
    && mkdir -p /app/services/faucet-service/node_modules

FROM base
COPY --from=build /app/packages/common-types/lib /app/packages/common-types/lib
COPY --from=build /app/packages/controller/lib /app/packages/controller/lib
COPY --from=build /app/packages/database/lib /app/packages/database/lib
COPY --from=build /app/packages/discord-auth/lib /app/packages/discord-auth/lib
COPY --from=build /app/packages/ergo-authentication/lib /app/packages/ergo-authentication/lib
COPY --from=build /app/packages/fastify-server/lib /app/packages/fastify-server/lib
COPY --from=build /app/packages/google-auth/lib /app/packages/google-auth/lib
COPY --from=build /app/packages/google-recaptcha/lib /app/packages/google-recaptcha/lib
COPY --from=build /app/packages/x-auth/lib /app/packages/x-auth/lib

COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=prod-deps /app/packages/common-types/node_modules /app/packages/common-types/node_modules
COPY --from=prod-deps /app/packages/controller/node_modules /app/packages/controller/node_modules
COPY --from=prod-deps /app/packages/database/node_modules /app/packages/database/node_modules
COPY --from=prod-deps /app/packages/discord-auth/node_modules /app/packages/discord-auth/node_modules
COPY --from=prod-deps /app/packages/ergo-authentication/node_modules /app/packages/ergo-authentication/node_modules
COPY --from=prod-deps /app/packages/fastify-server/node_modules /app/packages/fastify-server/node_modules
COPY --from=prod-deps /app/packages/google-auth/node_modules /app/packages/google-auth/node_modules
COPY --from=prod-deps /app/packages/google-recaptcha/node_modules /app/packages/google-recaptcha/node_modules
COPY --from=prod-deps /app/packages/x-auth/node_modules /app/packages/x-auth/node_modules
COPY --from=prod-deps /app/services/faucet-service/node_modules /app/services/faucet-service/node_modules

WORKDIR /app/services/faucet-service
CMD ["npm", "run", "start"]