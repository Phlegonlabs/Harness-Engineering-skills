# Cross-Platform Notes

Reference for building and running projects across Unix (macOS/Linux) and Windows environments. Ensures agents and scripts work correctly regardless of platform.

---

## Command Equivalents

| Operation | Unix (bash/zsh) | Windows (PowerShell) | Windows (Git Bash) |
|-----------|-----------------|---------------------|--------------------|
| Remove file | `rm file.txt` | `Remove-Item file.txt` | `rm file.txt` |
| Remove directory | `rm -rf dir/` | `Remove-Item -Recurse -Force dir/` | `rm -rf dir/` |
| Copy file | `cp src dest` | `Copy-Item src dest` | `cp src dest` |
| Copy directory | `cp -r src/ dest/` | `Copy-Item -Recurse src/ dest/` | `cp -r src/ dest/` |
| Move / rename | `mv old new` | `Move-Item old new` | `mv old new` |
| Create directory (nested) | `mkdir -p a/b/c` | `New-Item -ItemType Directory -Force a/b/c` | `mkdir -p a/b/c` |
| Read file | `cat file.txt` | `Get-Content file.txt` | `cat file.txt` |
| Search in files | `grep -r "pattern" src/` | `Select-String -Recurse -Pattern "pattern" src/` | `grep -r "pattern" src/` |
| List files | `ls -la` | `Get-ChildItem -Force` | `ls -la` |
| Environment variable | `export VAR=value` | `$env:VAR = "value"` | `export VAR=value` |
| Redirect to null | `> /dev/null 2>&1` | `> $null 2>&1` | `> /dev/null 2>&1` |
| Chain commands | `cmd1 && cmd2` | `cmd1; if ($?) { cmd2 }` | `cmd1 && cmd2` |
| Which / where | `which bun` | `Get-Command bun` | `which bun` |
| Print working dir | `pwd` | `Get-Location` | `pwd` |

---

## Path Separator Handling

### In JavaScript / TypeScript
- Always use **forward slashes** (`/`) in code — Node.js and Bun normalize them on all platforms
- Use `path.join()` or `path.resolve()` for constructing filesystem paths
- Never hardcode backslashes (`\`) in path strings

```typescript
// ✅ Correct
import path from 'node:path'
const configPath = path.join(projectRoot, 'config', 'env.ts')

// ❌ Wrong — breaks on Unix
const configPath = `${projectRoot}\\config\\env.ts`
```

### In Shell Scripts
- If a script must run on both platforms, use Git Bash syntax (Unix-compatible)
- For npm/bun scripts in `package.json`, use forward slashes — they work on both platforms
- Avoid platform-specific path assumptions in CI workflows

### In Configuration Files
- `tsconfig.json`, `biome.json`, `.gitignore`: always use forward slashes
- These tools normalize paths internally

---

## Bun on Windows Caveats

### Native Modules
- Some npm packages with native C/C++ bindings may not compile on Windows
- Prefer pure JS/TS alternatives when available (e.g., `better-sqlite3` → `sql.js` for development)
- If a native module is required, document the Windows build prerequisites

### File Watching
- Bun's file watcher (`bun --watch`) works on Windows but may have higher latency than on macOS/Linux
- For large projects, consider using `--no-clear-screen` to reduce flicker
- If watch mode is unreliable, fall back to manual restart during development

### Binary Linking
- `bun link` and global installs place binaries in platform-specific locations
- On Windows: `%USERPROFILE%\.bun\bin\`
- Ensure this directory is in the system `PATH`

### Shell Scripts in package.json
- `bun run` executes scripts using the system shell — on Windows this may be `cmd.exe` or PowerShell
- For cross-platform scripts, prefer using Bun's built-in capabilities or Node.js scripts over shell commands

```jsonc
// ✅ Cross-platform
{ "scripts": { "clean": "bun run scripts/clean.ts" } }

// ❌ Unix-only
{ "scripts": { "clean": "rm -rf dist && rm -rf .cache" } }
```

---

## Git Worktree Paths on Windows

### Forward Slashes
- Git internally uses forward slashes — worktree paths should use forward slashes even on Windows
- `git worktree add ../worktrees/milestone-1 milestone/m1` works correctly on Windows with Git Bash

### Long Path Support
Windows has a default 260-character path limit. Enable long paths for deep directory structures:

```bash
# Enable long paths in Git (required for monorepos with deep nesting)
git config --global core.longpaths true
```

Also enable long paths at the OS level (requires admin privileges):

```powershell
# PowerShell (Run as Administrator)
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
  -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```

### Worktree Cleanup
- On Windows, ensure worktree directories are fully closed (no file locks) before running `git worktree remove`
- Close any editors, terminals, or file explorers pointing to the worktree directory

---

## Agent Instruction Guidelines

When writing agent instructions or documentation:

1. **Never assume bash** — the user may be on PowerShell, cmd.exe, or Git Bash
2. **Offer both variants** when shell commands are required:
   ```
   # Unix / Git Bash
   mkdir -p docs/adr && touch docs/adr/README.md

   # PowerShell
   New-Item -ItemType Directory -Force docs/adr
   New-Item docs/adr/README.md
   ```
3. **Prefer Bun scripts** over raw shell commands — `bun run <script>` is cross-platform
4. **Test on both platforms** if the project has contributors on different operating systems
5. **Use `node:path`** and `node:os`** in scripts that need to detect or adapt to the current platform
