## 4. State Sources and Validation Strategy

- **Machine-readable state**: `.harness/state.json`
- **Session recovery index**: `docs/PROGRESS.md`
- **Session recovery modules**: `docs/progress/`
- **Single source of requirements**: `docs/PRD.md` + `docs/prd/`
- **Single source of architecture**: `docs/ARCHITECTURE.md` + `docs/architecture/`

### Validation Commands

- `bun harness:env` validates Bun / Git / Node
- `bun harness:validate --phase ...` validates the phase gate
- `bun harness:validate --task T001` validates the task gate
- `bun harness:validate --milestone M1` validates the milestone gate
- `bun harness:validate` calculates and writes back the Harness Score
