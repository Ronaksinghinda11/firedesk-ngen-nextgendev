# ----------- BUILD STAGE -----------
FROM node:20-bookworm AS builder

WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source & build
COPY . .
RUN npm run build || true


# ----------- RUNTIME STAGE -----------
FROM node:20-bookworm-slim AS runtime

WORKDIR /usr/src/app
ENV NODE_ENV=production

# Install Chrome / Puppeteer system dependencies
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json from build stage
COPY --from=builder /usr/src/app/package*.json ./
RUN npm ci --production

# Copy built application
COPY --from=builder /usr/src/app ./

# Health check using Node.js (avoids zombie process leak from wget)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1)).on('error', () => process.exit(1))"

EXPOSE 5000
CMD ["npm", "start"]
