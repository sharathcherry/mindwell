# ==============================================================================
# MindWell API Server - Production Dockerfile
# Base: Node.js 22 Alpine with Prisma ORM support
# ==============================================================================

FROM node:22-alpine

WORKDIR /app

# Install OpenSSL and libc compatibility libraries required by Prisma engine on Alpine
RUN apk add --no-cache openssl libc6-compat

# Copy dependency manifests and Prisma schema first for Docker layer caching
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci || npm install

# Generate Prisma Client
RUN npx prisma generate

# Copy remaining application code
COPY . .

# Default environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Expose API port
EXPOSE 3001

# Start the Node.js Express server
CMD ["npm", "start"]
