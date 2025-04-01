# Stage 1: Build frontend
FROM node:14 as frontend-builder
WORKDIR /app
# Copy frontend package files
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps

# Copy frontend source
COPY frontend/ ./
# Build frontend with additional error output
RUN npm run build || (cat /npm-debug.log && exit 1)

# Stage 2: API Gateway
FROM node:14
WORKDIR /app

# Copy API Gateway package files
COPY api-gateway/package*.json ./
RUN npm install

# Copy API Gateway source
COPY api-gateway/ ./

# Create frontend directory structure
RUN mkdir -p ../frontend

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/build ../frontend/build

ENV PORT=3000
EXPOSE 3000
CMD ["node", "index.js"]