FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all project files
COPY . .

# Build the project (creates dist/ folder)
RUN npm run build

# Production image
FROM node:20-alpine
WORKDIR /app

# Install 'serve' to serve static files
RUN npm install -g serve

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

# Expose the API port
EXPOSE 3000

# Start the Node.js production server
CMD ["serve", "-s", "dist", "-l", "3000"]
