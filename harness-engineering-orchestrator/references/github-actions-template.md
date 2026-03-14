# GitHub Actions CI/CD Template

## CI Pipeline (Shared Across All Project Types)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - name: Install dependencies
        run: bun install --frozen-lockfile
      - name: Type check
        run: bun run typecheck
      - name: Lint
        run: bun run lint
      - name: Test with coverage
        run: bun test --coverage
      - name: Build
        run: bun run build
      - name: Check file sizes (max 400 lines)
        run: |
          find src -name "*.ts" -o -name "*.tsx" | while read file; do
            lines=$(wc -l < "$file")
            if [ "$lines" -gt 400 ]; then
              echo "❌ $file has $lines lines (max 400)"
              exit 1
            fi
          done
      - name: Check for console.log
        run: |
          if grep -r "console\.log" src/ --include="*.ts" --include="*.tsx" 2>/dev/null; then
            echo "❌ Use logger instead of console.log"
            exit 1
          fi
      - name: Check for eval()
        run: |
          if grep -rP "\beval\s*\(" src/ --include="*.ts" --include="*.tsx" 2>/dev/null; then
            echo "❌ eval() is forbidden — use safe alternatives"
            exit 1
          fi
      - name: Check for innerHTML assignment
        run: |
          if grep -rP "\.innerHTML\s*=" src/ --include="*.ts" --include="*.tsx" 2>/dev/null; then
            echo "❌ innerHTML assignment is forbidden — use safe DOM APIs or framework bindings"
            exit 1
          fi
      - name: Verify dependency direction
        run: bun run check:deps
        continue-on-error: true
```

---

## CD Pipeline — Choose Based on Deployment Platform

### Vercel (Web App — Next.js / Remix)

```yaml
# .github/workflows/cd-vercel.yml
name: CD — Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy-preview:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - name: Deploy to Vercel Preview
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

  deploy-production:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    needs: []
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - name: Deploy to Vercel Production
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### Cloudflare Pages + Workers

```yaml
# .github/workflows/cd-cloudflare.yml
name: CD — Cloudflare

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run build
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: ${{ vars.PROJECT_NAME }}
          directory: dist
      - name: Deploy Workers (if any)
        run: bunx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### iOS App — TestFlight (Staging) + App Store (Production)

```yaml
# .github/workflows/cd-ios.yml
name: CD — iOS

on:
  push:
    branches: [main]

jobs:
  deploy-testflight:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Xcode
        uses: maxim-lobanov/setup-xcode@v1
        with:
          xcode-version: latest-stable
      - name: Install certificates
        uses: apple-actions/import-codesign-certs@v2
        with:
          p12-file-base64: ${{ secrets.CERTIFICATES_P12 }}
          p12-password: ${{ secrets.CERTIFICATES_P12_PASSWORD }}
      - name: Build and upload to TestFlight
        run: |
          xcodebuild archive \
            -scheme "${{ vars.SCHEME_NAME }}" \
            -archivePath build/app.xcarchive \
            -configuration Release
          xcodebuild -exportArchive \
            -archivePath build/app.xcarchive \
            -exportOptionsPlist ExportOptions.plist \
            -exportPath build/ipa
          xcrun altool --upload-app \
            -f build/ipa/*.ipa \
            -u "${{ secrets.APPLE_ID }}" \
            -p "${{ secrets.APPLE_APP_PASSWORD }}"
```

### Tag-based Release (Shared Across All Project Types)

```yaml
# .github/workflows/release.yml
# Auto-release on version tag push
# Usage: git tag v1.0.0 && git push origin v1.0.0
name: Release

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install --frozen-lockfile
      - run: bun run typecheck
      - run: bun test
      - run: bun run build
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
          draft: false
          prerelease: ${{ contains(github.ref, '-rc') || contains(github.ref, '-beta') || contains(github.ref, '-alpha') }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### CLI Tool — GitHub Releases + NPM

```yaml
# .github/workflows/cd-cli.yml
name: CD — CLI Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - name: Build binaries (cross-platform)
        run: |
          bun build src/index.ts --compile --target=bun-linux-x64 --outfile dist/cli-linux
          bun build src/index.ts --compile --target=bun-darwin-arm64 --outfile dist/cli-macos-arm
          bun build src/index.ts --compile --target=bun-darwin-x64 --outfile dist/cli-macos-x64
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          files: dist/*
          generate_release_notes: true
      - name: Publish to NPM
        run: bun publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## PR Automation

```yaml
# .github/workflows/pr-checks.yml
name: PR Checks

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  pr-validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Validate commit message format
        uses: wagoid/commitlint-github-action@v5

      - name: Check PR has Task-ID
        run: |
          PR_BODY="${{ github.event.pull_request.body }}"
          if ! echo "$PR_BODY" | grep -q "Task-ID:"; then
            echo "❌ PR body must contain Task-ID: T[ID]"
            exit 1
          fi

      - name: Check PR references PRD
        run: |
          PR_BODY="${{ github.event.pull_request.body }}"
          if ! echo "$PR_BODY" | grep -q "PRD#\|Closes:"; then
            echo "⚠️  Consider referencing PRD item (Closes: PRD#F00X)"
          fi
```

---

## PR Template (.github/PULL_REQUEST_TEMPLATE.md)

```markdown
## What this PR does

[Brief description]

## Task Information

- **Task-ID**: T[ID]
- **Closes**: PRD#F[ID]
- **Milestone**: M[N] — [Name]

## Checklist

- [ ] `bun run typecheck` — 0 errors
- [ ] `bun run lint` — 0 warnings
- [ ] `bun test` — all passing
- [ ] `bun run build` — successful
- [ ] All modified files ≤ 400 lines
- [ ] No `console.log` / `any` / `@ts-ignore`
- [ ] AGENTS.md / CLAUDE.md updated (if architecture changed)
- [ ] LEARNING.md updated (if issues resolved or Spike completed)

## Screenshots (if applicable)

[Please attach screenshots for UI changes]
```
