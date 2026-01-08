FROM node:20-bookworm

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# System libs required by Playwright Chromium
RUN apt-get update && apt-get install -y \
    libglib2.0-0 libnss3 libatk-bridge2.0-0 libx11-xcb1 libxcomposite1 libxdamage1 \
    libxfixes3 libxrandr2 libasound2 libcups2 libpango-1.0-0 libpangocairo-1.0-0 \
    libatk1.0-0 libx11-6 libxext6 libxcb1 libgtk-3-0 libgbm1 libxshmfence1 libxkbcommon0 libxrender1 \
  && rm -rf /var/lib/apt/lists/*

# Install Playwright Chromium into the project (bundled into the image)
ENV PLAYWRIGHT_BROWSERS_PATH=0
RUN npx playwright install chromium

# Copy source and build
COPY . .
RUN npm run build

# Run worker
CMD ["npm", "run", "worker:prod"]