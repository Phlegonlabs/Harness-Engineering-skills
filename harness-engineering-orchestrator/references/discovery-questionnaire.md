# Discovery Questionnaire

Use this file only during **Phase 0: Discovery**.

## Rules

- Ask exactly one question at a time
- Wait for the user's answer before asking the next question
- Persist each answer immediately into the runtime state
- Do not invent fields outside the schema
- Skip questions that are irrelevant to the chosen project type

## Question Sequence

### Q0: Starting Point

```text
This project is:

1. Greenfield — starting from scratch
2. Existing codebase — continue a work-in-progress with the Harness workflow
```

If the user selects an existing codebase:

- skip or compress market research when appropriate
- audit the current repo before scaffolding
- still require PRD, Architecture, scaffold, and phase gates

### Q1: Project Name

```text
What is the name of your project?
Use the package-safe English name and the display name if branding differs.
```

### Q2: Project Concept

```text
Briefly describe what this project is.
Two or three sentences are enough.
```

### Q3: Users and Problem

```text
What problem does this project solve, and who is it for?
```

### Q4: Goals and Success

```text
What do you want this project to achieve within the target time frame?
Are there specific success metrics?
```

### Q4.5: Timeline and Deadline

```text
What is the target delivery timeline? Does this affect MVP scope?
```

### Q5: Project Type

Multi-select is allowed. A monorepo workspace is assumed by default; this question defines which product surfaces live inside that workspace today.

```text
What type of project is this?

1. Web App
2. iOS App
3. Android App
4. Cross-Platform Mobile App
5. CLI Tool
6. Agent Project
7. Desktop App
8. API / Backend Service
9. Combination / multi-surface workspace
```

### Q6: AI Needs

Ask this when the project includes agent behavior or may require AI features.

```text
Does this project need AI features?

1. OpenAI / Codex
2. Anthropic Claude
3. Google Gemini
4. Open Source (Ollama / vLLM)
5. Both (OpenAI + Anthropic)
6. Multi-Provider
7. Vercel AI SDK
8. No AI needed for now
```

### Q7: Feature Modules

Only show the options relevant to the selected project type.

| Project Type | Typical module prompts |
|------|------|
| Web App | Auth, Database, Realtime, File upload, Payments, i18n, Analytics |
| iOS App | Local data, iCloud sync, Push notifications, Apple Pay, i18n |
| CLI Tool | Config persistence, Plugin system, Auto-update |
| Agent Project | Memory, MCP / tools, Rate limiting, Logging |
| Android App | Local data, Push notifications, Google Pay, i18n, Analytics |
| API / Backend | Auth, Database, Rate limiting, Caching, Logging, Queues |
| Cross-Platform Mobile | Local data, Push notifications, In-app purchases, i18n |
| Desktop App | Local DB, Auto-update, Notifications, File system access |

Example prompt:

```text
Which feature modules does this project need?
Select all that apply, or say "none of the above".
```

### Q7.5: i18n / Localization

```text
Does the app need multi-language support? Which languages/locales?
```

### Q8: Team Size

```text
Who is developing this project?

1. Solo developer
2. Small team (2-5)
3. Larger team (6+)
```

Use the answer to tune branch protection, review expectations, and process strictness.

### Q9: Design Language

Ask this only for projects with a UI.

```text
What visual style should this product follow?
You can choose one or more, or describe a reference product.

1. Dark and modern
2. Clean and minimal
3. Bold and expressive
4. Professional and trustworthy
5. Soft and friendly
6. Custom / reference-driven
```

Follow up with:

```text
Are there any websites or apps you want to use as design references?
```

Record this so the frontend design work can align with the PRD and stack decisions.

### Q9.5: Existing Constraints

Ask this only for existing codebases.

```text
For existing codebases: which APIs/databases/services must be integrated?
```

## Discovery Exit Criteria

Discovery is complete when the workflow has enough information to do one of the following safely:

- enter Market Research
- skip research and enter Tech Stack
- write the first valid PRD draft

At minimum, the runtime state should know:

- whether the project is greenfield or existing
- project name
- project type(s)
- goals
- team size
- design language for UI projects
