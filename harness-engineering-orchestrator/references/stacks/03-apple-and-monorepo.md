## 03. Apple and Monorepo

### iOS App (SwiftUI)

- Create the project via Xcode
- Maintain Features / Core / Models layered structure
- Still generate Harness documentation and runtime

### Monorepo (Turborepo + Bun)

```bash
bunx create-turbo@latest [NAME] --package-manager bun
cd [NAME]
```

### Notes

- Monorepo requires explicit root-level AGENTS / CLAUDE / docs
- Package README and shared boundary rules must remain consistent
