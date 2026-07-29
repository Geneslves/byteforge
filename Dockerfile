ARG NODE_VERSION=22.23.1
ARG ALPINE_VERSION=3.23

FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS toolchain

ENV PNPM_HOME=/pnpm
ENV PATH="${PNPM_HOME}:${PATH}"

RUN corepack enable \
  && corepack prepare pnpm@10.33.0 --activate \
  && test "$(pnpm --version)" = "10.33.0"

WORKDIR /app

FROM toolchain AS builder

RUN apk add --no-cache python3 make g++

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

FROM toolchain AS production-dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS runtime

ARG VCS_REF=unknown
ARG BUILD_DATE=unknown
ARG REPOSITORY_URL=https://github.com/Geneslves/byteforge

LABEL org.opencontainers.image.title="ByteForge" \
  org.opencontainers.image.source="${REPOSITORY_URL}" \
  org.opencontainers.image.revision="${VCS_REF}" \
  org.opencontainers.image.created="${BUILD_DATE}"

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=production-dependencies --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/server ./server
COPY --from=builder --chown=node:node /app/functions ./functions
COPY --from=builder --chown=node:node /app/schema ./schema
COPY --from=builder --chown=node:node /app/scripts ./scripts

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/health/ready', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

CMD ["node", "server/index.js"]
