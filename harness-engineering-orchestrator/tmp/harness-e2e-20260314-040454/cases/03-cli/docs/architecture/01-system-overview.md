## 1. System Overview

### 1.1 Project Type
- **Type**: Monorepo + CLI
- **Workspace base**: Monorepo (Bun workspaces, default)
- **Delivery mode**: Greenfield
- **AI Provider**: None
- **Package Manager**: Bun
- **Primary goal**: Enable the project to have a closed-loop for state, progress, and validation from the scaffold onward.

### 1.2 Existing Repository Signal

- **Detected top-level directories**: No existing app directories were detected yet.
- **Detected dependency/tooling signal**: No dependency manifest was detected yet.

### 1.3 Core Flow

```text
Project Setup → PRD / Architecture → .harness runtime → Backlog parse
       ↓                 ↓                  ↓               ↓
   AGENTS/CLAUDE     GitBook / ADR     validate/resume   PROGRESS sync
```
