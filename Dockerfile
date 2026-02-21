# ── Stage 1: build ────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Copy source and generate Prisma client
COPY prisma ./prisma
RUN npx prisma generate

# Copy rest of source and build
COPY . .
RUN npm run build

# ── Stage 2: production image ─────────────────────────────────
FROM node:20-slim AS runner

# Install system dependencies required by Playwright (Chromium)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy production node_modules and built artefacts from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY --from=builder /app/prisma ./prisma

# Copy runtime files
COPY package.json package-lock.json server.js worker.js start.sh ./
RUN chmod +x start.sh

# Install Playwright Chromium browser inside the image
RUN npx playwright install chromium

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# start.sh validates required env vars, runs prisma db push, then starts the server.
# If any required env var is missing it exits with a clear error message.
CMD ["./start.sh"]
