ARG NODE_IMAGE=node:20-slim

# ---------- Base ----------
FROM ${NODE_IMAGE} AS base
WORKDIR /app
# Install system dependencies (Debian slim)
RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 \
  python3-venv \
  python3-pip \
  build-essential \
  ca-certificates \
  wget \
  curl \
  && rm -rf /var/lib/apt/lists/*
COPY package*.json ./

# ---------- Development ----------
FROM base AS development
# Install all dependencies including devDependencies
RUN npm ci
COPY src/ ./src/
COPY config/ ./config/
COPY public/ ./public/
RUN mkdir -p uploads
    # Create a dedicated non-root user and group in a Debian-compatible way
    RUN groupadd -g 1001 nodejs || true \
      && useradd -m -u 1001 -g nodejs -s /usr/sbin/nologin nodeuser || true \
      && chown -R nodeuser:nodejs /app
    USER nodeuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"
CMD ["npm", "start"]

# ---------- Production ----------
FROM base AS production
# Install only production dependencies
RUN npm ci --only=production
COPY src/ ./src/
COPY config/ ./config/
COPY public/ ./public/
RUN mkdir -p uploads
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001 && chown -R nodeuser:nodejs /app
USER nodeuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"
CMD ["npm", "start"]