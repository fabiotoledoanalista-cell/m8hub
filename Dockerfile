FROM oven/bun:1.3 AS builder
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile
COPY . .

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID

RUN echo "VITE_SUPABASE_URL=${VITE_SUPABASE_URL}" >> .env.production && \
    echo "VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}" >> .env.production && \
    echo "VITE_SUPABASE_PROJECT_ID=${VITE_SUPABASE_PROJECT_ID}" >> .env.production

RUN bun run build

FROM oven/bun:1.3-slim AS runner
WORKDIR /app
COPY --from=builder /app/.output ./.output
EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
CMD ["bun", ".output/server/index.mjs"]
