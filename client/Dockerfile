# ==============================================================================
# MindWell React Frontend - Multi-Stage Production Dockerfile
# Stage 1: Build Vite React 19 Client on Node.js 22 Alpine
# Stage 2: Serve Optimized Production Assets via NGINX 1.27 Alpine
# ==============================================================================

# --- Stage 1: Build ---
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm ci || npm install

# Copy frontend source code
COPY . .

# Build Vite SPA
RUN npm run build

# --- Stage 2: Production NGINX Server ---
FROM nginx:1.27-alpine

# Remove default nginx html
RUN rm -rf /usr/share/nginx/html/*

# Copy built static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom NGINX configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

# Run NGINX in foreground
CMD ["nginx", "-g", "daemon off;"]
