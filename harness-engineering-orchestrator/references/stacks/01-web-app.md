## 01. Web Apps

### Next.js + Vercel

```bash
bunx create-next-app@latest [NAME] --typescript --tailwind --app --src-dir --import-alias "@/*" --no-git
cd [NAME]
```

### Cloudflare + Hono

```bash
bunx create-cloudflare@latest [NAME] --framework=hono --no-git
cd [NAME]
```

### Common Expectations

- Bun as the package manager
- Generate AGENTS / CLAUDE / modular docs
- TypeScript strict mode
- Biome + CI + `.env.example`
