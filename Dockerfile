# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8.9.0

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY client/package.json client/pnpm-lock.yaml* ./client/

# Install dependencies
RUN pnpm install --frozen-lockfile
RUN cd client && pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build client
RUN cd client && pnpm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8.9.0

# Install production dependencies only
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Copy built client and server
COPY --from=builder /app/client/build ./client/build
COPY --from=builder /app/server ./server
COPY --from=builder /app/database ./database

# Create uploads directory
RUN mkdir -p uploads

# Create non-root user and set permissions
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 5000

ENV NODE_ENV=production

CMD ["node", "server/index.js"]
