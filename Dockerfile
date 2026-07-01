# Multi-stage build for Next.js app
FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Set build-time environment variables (required for NextAuth)
ENV NEXTAUTH_SECRET=build-time-secret
ENV NEXTAUTH_URL=http://localhost:3000
ENV DATABASE_URL=file:./dev.db

# Accept Google Maps API key as build argument
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner

# Install OpenSSL for Prisma (required for SQLite)
RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Create directory for SQLite database and public directory
RUN mkdir -p /app/prisma /app/public

# Copy and set up entrypoint script (as root for chmod)
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application with entrypoint
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
