## 06. API / Backend Service

### Option A: Hono (Lightweight, Edge-Native)

```bash
bunx create-hono@latest [NAME]
cd [NAME]
bun add drizzle-orm postgres zod pino
bun add -d drizzle-kit @types/bun vitest
```

### Option B: Fastify (Full-Featured, Node)

```bash
mkdir [NAME] && cd [NAME]
bun init -y
bun add fastify @fastify/cors @fastify/helmet @fastify/rate-limit
bun add drizzle-orm postgres zod pino
bun add -d drizzle-kit @types/bun vitest
```

### PostgreSQL + Drizzle ORM

```bash
# Generate migrations
bunx drizzle-kit generate

# Apply migrations
bunx drizzle-kit migrate

# Open Drizzle Studio (DB browser)
bunx drizzle-kit studio
```

### Zod Validation

Use Zod for request/response validation on all endpoints:

```typescript
import { z } from "zod";

const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});
```

### Project Structure

```
src/
├── index.ts             # Server entry point
├── routes/
│   ├── health.ts        # Health check endpoint
│   └── users.ts         # Example resource routes
├── db/
│   ├── schema.ts        # Drizzle schema definitions
│   ├── index.ts         # Database connection
│   └── migrations/      # Generated migrations
├── middleware/
│   ├── auth.ts          # Authentication middleware
│   └── validate.ts      # Zod validation middleware
├── services/            # Business logic
├── types/               # Shared TypeScript types
└── utils/               # Helpers, constants
drizzle.config.ts        # Drizzle Kit configuration
vitest.config.ts         # Test configuration
Dockerfile               # Container build
```

### Deployment Targets

#### Railway

```bash
# Install Railway CLI
bun add -g @railway/cli

# Deploy
railway up
```

#### Fly.io

```bash
# Install Fly CLI and launch
fly launch
fly deploy
```

#### Docker

```dockerfile
FROM oven/bun:1 AS base
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production
COPY src ./src
EXPOSE 3000
CMD ["bun", "run", "src/index.ts"]
```

### Testing Setup (Vitest)

```bash
# Run tests
bun run test

# Run tests in watch mode
bun run test --watch

# Run tests with coverage
bun run test --coverage
```

### Notes

- Bun as the package manager and runtime
- TypeScript strict mode enabled
- Biome for linting and formatting
- Generate `.env.example` with required environment variables
- Still generate Harness documentation and runtime files
