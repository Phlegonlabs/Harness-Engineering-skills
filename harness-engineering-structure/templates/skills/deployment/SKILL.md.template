# Skill: Deployment

Use this skill when preparing a PR, creating a release, or deploying changes.

## PR Checklist

Before opening a PR:

1. **Validation passes**
   ```bash
   bun run harness:validate
   ```

2. **Branch is up to date with main**
   ```bash
   git fetch origin main
   git rebase origin/main
   ```

3. **Commit messages follow conventional commits**
   - `feat(scope): add project stats endpoint`
   - `fix(scope): handle null user in auth middleware`
   - `docs(scope): add ADR for caching strategy`
   - `harness(rules): tighten file-size limit`
   - `chore(deps): upgrade dependencies`

4. **PR description includes**
   - What changed and why
   - Link to ticket/issue (if applicable)
   - Screenshot or test output if applicable

## Opening a PR (GitHub CLI)

```bash
gh pr create \
  --title "feat(projects): add stats endpoint" \
  --body "## What
[What changed]

## Why
[Why it was needed / issue link]

## Testing
[How it was tested, coverage delta]" \
  --base main
```

## After PR is Merged

- [ ] Verify CI passed on main
- [ ] Update ticket status if using issue tracking
- [ ] Delete feature branch: `git push origin --delete feat/your-branch`

## NEVER

- **NEVER** force-push to main or master
- **NEVER** merge without CI passing
- **NEVER** run database migrations without human operator confirmation
- **NEVER** skip `bun run harness:validate`

## See Also

- `.github/pull_request_template.md` — PR checklist
- `CONTRIBUTING.md` — Full contribution workflow
- `docs/internal/boundaries.md` — What requires approval
