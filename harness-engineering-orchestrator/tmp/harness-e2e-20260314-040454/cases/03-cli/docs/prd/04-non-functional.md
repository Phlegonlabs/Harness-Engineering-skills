## 5. Non-Functional Requirements

- TypeScript strict mode
- Single file should not exceed 400 lines by default
- Use Bun as the package manager
- GitBook, README, and ADR must stay in sync
- Phase state must remain recoverable via `.harness/state.json`
- `check:deps` must be executable both locally and in CI

---

## 6. Technical Constraints

- **Package Manager**: Bun
- **Language**: TypeScript (strict)
- **Project type**: Monorepo + CLI
- **Delivery mode**: Greenfield
- **AI Provider**: None
- **Team size**: Solo
- **Deployment**: To be confirmed in Phase 2

### Existing Repository Inputs

- **Detected dependencies**: No dependency manifest was detected yet.
- **Detected scripts**: No package scripts were detected yet.
