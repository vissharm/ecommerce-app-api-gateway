# Stage 1: Build frontend
FROM node:14 as frontend-builder
WORKDIR /frontend
# Copy frontend package files
COPY frontend/package*.json ./
RUN npm install
# Copy frontend source
COPY frontend/ ./
# Build frontend
RUN npm run build

# Stage 2: API Gateway
FROM node:14
WORKDIR /app

# Copy API Gateway package files
COPY api-gateway/package*.json ./
RUN npm install

# Copy API Gateway source
COPY api-gateway/ ./

# Create directory for frontend build
RUN mkdir -p /app/public

# Copy built frontend from builder stage
COPY --from=frontend-builder /frontend/build /app/public

# Create directory for shared lib
RUN mkdir -p /app/node_modules/shared

ENV PORT=8080
EXPOSE 8080
CMD ["node", "index.js"]