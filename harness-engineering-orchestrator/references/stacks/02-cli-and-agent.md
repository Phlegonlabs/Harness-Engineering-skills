## 02. CLI and Agent

### CLI (Bun)

```bash
mkdir [NAME] && cd [NAME]
bun init -y
bun add @clack/prompts chalk
```

### Agent Project

```bash
mkdir [NAME] && cd [NAME]
bun init -y
bun add ai @ai-sdk/anthropic @ai-sdk/openai zod pino
```

### Notes

- CLI projects focus on entry point and bin configuration
- Agent projects focus on orchestrator, tools, and schema validation
- Agent projects should also ship a project-local `SKILLS.md` plus an API-wrapper skill so agent workflows do not scatter raw API calls
