import { renderArchitectureDoc, renderProductDoc } from "./discovery-renderers";

function projectTitle(projectName: string): string {
	return projectName
		.split("-")
		.map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
		.join(" ");
}

function today(): string {
	return new Date().toISOString().slice(0, 10);
}

export function baselineDiscoveryAnswers(
	projectName: string,
): Record<string, string> {
	const title = projectTitle(projectName);

	return {
		"prd.executive-summary": `**${title}** is an engineer-ready monorepo template that helps product and platform teams start shipping in a Bun + Turbo workspace with built-in validation, planning surfaces, and agent-readable project rules from day one.`,
		"prd.problem-statement":
			"**Current state:** New repositories often start as a loose collection of setup scripts, incomplete docs, and implicit conventions.\n\n**The gap:** Engineers and coding agents lose time rebuilding the same repository scaffolding, guessing architecture rules, and deciding how to organize the first production slice.\n\n**Impact:** Teams spend their early project time on setup churn instead of feature delivery, and quality drifts because the working agreements are not encoded in the repository.",
		"prd.target-audience":
			"| Persona | Description | Primary Goal |\n|---------|-------------|--------------|\n| Founding engineer | Starts a new product codebase and needs a production-shaped repo immediately | Land the first vertical slice without rebuilding tooling |\n| Platform or tech lead | Standardizes how agents and humans work in the same repository | Provide repeatable structure, validation, and handoff rules |\n| Product engineer using agents | Edits application code with AI assistance every day | Work inside a repo whose conventions are obvious and enforceable |",
		"prd.core-capabilities":
			"### Must Have (v1)\n- [ ] Ready-to-edit monorepo layout with `apps/web`, `apps/api`, and `packages/shared`\n- [ ] Root validation and task orchestration that work immediately after initialization\n- [ ] Task contracts, evaluator results, and handoff artifacts for long-running work\n- [ ] Repository-owned docs and rules that agents can follow without extra chat context\n\n### Should Have (v1)\n- [ ] Guided discovery flow for teams that want PRD and architecture interviews before implementation\n- [ ] Milestone and task planning generated from repository docs\n\n### Could Have (later)\n- [ ] Optional deployment presets per application workspace\n- [ ] Additional shared package templates for design systems or SDKs\n\n### Won't Have (out of scope)\n- One-click product-specific frameworks or business logic beyond the engineering scaffold",
		"prd.scope-boundaries":
			"**In scope:**\n- A working engineer template with monorepo structure, validation, docs, and planning surfaces\n- Minimal application and shared package scaffolds that compile and test\n- Optional discovery/orchestration tooling for teams that want a more guided workflow\n\n**Out of scope:**\n- Product-specific UI, domain models, or deployment infrastructure\n- Framework-specific code generation for every possible stack choice\n- Automatic feature implementation beyond the scaffold itself",
		"prd.success-metrics":
			"| Metric | Baseline | Target | Timeline |\n|--------|----------|--------|----------|\n| Time from clone to first successful validation | Template setup varies by repo | Under 15 minutes after `bun install` and `bun run harness:init` | First session |\n| Time to first project-specific code change | Often delayed by repo setup work | Same session as initialization | First day |\n| Repository guardrails active | Inconsistent in ad hoc starters | `build`, `test`, and `harness:validate` all pass in the template baseline | Before first feature branch |",
		"prd.assumptions-constraints":
			"**Assumptions:**\n- Teams want a strong default repository shape but still need to customize product details quickly\n- Bun and git are available in the development environment\n- The first shipped work will usually span at least one app workspace and one shared package\n\n**Constraints:**\n- The template must stay framework-agnostic at the business-logic level\n- Rules must remain repository-owned and executable offline\n- The default path must not require discovery interviews before coding can begin",
		"prd.proposed-milestones":
			"- [ ] Customize project identity and ownership surfaces — replace template naming, ownership, and environment defaults for the new repository\n  - Update harness/config.json with project name and ownership\n  - Replace template placeholders across docs and configs\n  - Validate initialization with harness:doctor\n- [ ] Implement the first vertical slice — ship one real cross-workspace feature through `apps/*` and `packages/*`\n  - Define shared types and contracts in packages/shared\n  - Implement API endpoint in apps/api\n  - Implement UI integration in apps/web\n  - Add cross-workspace integration tests\n- [ ] Harden for team delivery — add product-specific validation, deployment, and operational checks\n  - Review and tighten validation rules\n  - Add deployment configuration\n  - Add operational health checks and monitoring\n  - Validate end-to-end delivery pipeline",
		"prd.open-questions":
			"- No template-level blockers. Replace this list with project-specific open questions when the repository is adopted.",
		"arch.overview":
			"```text\n[Monorepo Root]\n  ├── apps/web          # client-facing app workspace\n  ├── apps/api          # API / runtime workspace\n  ├── packages/shared   # shared types and reusable logic\n  ├── harness/          # repository validation and orchestration runtime\n  └── docs/             # product, architecture, ADRs, and progress surfaces\n\n[Within each workspace]\nTypes → Config → Repo → Service → Runtime → UI\n```\n\nThe engineer template assumes that feature work starts inside one or more application workspaces and pulls shared contracts into `packages/shared`. The harness stays at the root and governs validation, planning, and repository policy.",
		"arch.system-boundaries":
			"| System | Direction | Protocol | Notes |\n|--------|-----------|----------|-------|\n| Developer or coding agent | inbound | local CLI / editor | Edits repository files and runs root commands |\n| GitHub Actions | outbound | CI workflow execution | Runs `bun install` and `bun run harness:validate` on pushes and pull requests |\n| Package registry | outbound | package manager network access | Used during `bun install` to resolve dependencies |\n| Product-specific external systems | outbound or inbound | project-defined later | Intentionally not preconfigured in the template baseline |",
		"arch.interfaces-contracts":
			"### Root command contract\n```text\nbun run harness:init -- <project-name>\nbun run build\nbun run test\nbun run harness:evaluate --task <id>\nbun run harness:validate\n```\n\n### Workspace contract\n```text\napps/* and packages/* each expose package.json scripts for build, lint, typecheck, and test.\nCross-workspace reuse happens through package exports such as @<project>/shared.\n```\n\n### Documentation contract\n```text\ndocs/product.md and docs/architecture.md are the human-readable source of truth.\nharness:plan reads them to materialize milestone and task placeholders.\n.harness/contracts, .harness/evaluations, and .harness/handoffs store execution artifacts.\n```",
		"arch.cross-cutting":
			"| Concern | Approach |\n|---------|----------|\n| **Logging** | Structured logging only; no `console.log` in production-oriented source files |\n| **Error handling** | Keep domain and service code typed; reserve thrown errors for infrastructure boundaries |\n| **Authentication** | Not preconfigured in the template; add it inside the relevant application workspace when product requirements exist |\n| **Configuration** | Root and workspace environment variables flow through `.env` patterns and are validated by repository conventions |\n| **Code organization** | Every workspace follows the same dependency layer order and exports public entrypoints instead of deep internal imports |",
		"arch.build-distribution-deployment":
			"```bash\n# Initialize the template for a real project\nbun run harness:init -- <project-name>\n\n# Build every workspace\nbun run build\n\n# Run all workspace tests\nbun run test\n\n# Validate repository structure and rules\nbun run harness:validate\n\n# Deploy\n# Add project-specific deploy commands once runtime targets are chosen\n```",
		"arch.execution-constraints":
			"| Constraint | Impact on Milestones | Notes |\n|-----------|----------------------|-------|\n| Changes in `packages/shared` can affect both app workspaces | Shared package changes may need to land before app-specific milestones finish | Use package exports to keep impact explicit |\n| Changes in `harness/rules/` or validation runtime affect the whole repository | These changes should be reviewed carefully and usually run before parallel feature work | Repository policy is globally enforced |\n| App-specific feature work can parallelize when workspaces and affected areas do not overlap | Milestones can run in separate worktrees when dependencies are clear | Use `harness:parallel-dispatch` only after backlog sync |",
		"arch.technical-risks":
			"| Risk | Likelihood | Impact | Mitigation |\n|------|-----------|--------|------------|\n| Template docs drift from runtime behavior | Medium | High | Keep docs generated or updated alongside runtime changes and validate links continuously |\n| Shared package becomes a dumping ground | Medium | Medium | Enforce public exports and keep feature-specific logic in the owning app until sharing is justified |\n| Teams skip initialization and keep template naming too long | Medium | Medium | `harness:doctor` warns until `harness:init` has been run with a project-specific name |",
		"arch.validation-plan":
			"1. Run `bun run harness:init -- <project-name>` when adopting the template.\n2. Use `bun run harness:orchestrate` to open the active task contract.\n3. Run `bun run harness:evaluate --task <id>` before marking a task done.\n4. Confirm `bun run build`, `bun run test`, and `bun run typecheck` pass.\n5. Run `bun run harness:validate` before handoff or push.\n6. Use `bun run harness:discover --reset` only when the team wants a guided PRD and architecture interview flow.",
	};
}

export function renderBaselineProductDoc(projectName: string): string {
	return renderProductDoc(baselineDiscoveryAnswers(projectName));
}

export function renderBaselineArchitectureDoc(projectName: string): string {
	return renderArchitectureDoc(baselineDiscoveryAnswers(projectName));
}

export function renderReadyProgressDoc(): string {
	return [
		"# Delivery Progress",
		"",
		"> This repository starts in a ready-to-customize state.",
		"> Run `bun run harness:plan` when you want the starter milestones and tasks materialized from the docs.",
		"",
		"---",
		"",
		"## Planning Status",
		"",
		"| Surface | Status | Notes |",
		"|--------|--------|-------|",
		"| `docs/product.md` | Ready | Engineer-template PRD baseline is ready to customize |",
		"| `docs/architecture.md` | Ready | Monorepo architecture baseline is ready to customize |",
		"| Discovery | Optional | Run `bun run harness:discover --reset` to enter guided discovery mode |",
		"| Backlog sync | Ready | Run `bun run harness:plan` to materialize starter milestones and tasks |",
		"| Task loop | Ready | Use `harness:orchestrate` + `harness:evaluate` for contract-driven execution |",
		"",
		"---",
		"",
		"## Milestones",
		"",
		"| Milestone | Goal | Status | Depends On | Parallel | Worktree |",
		"|-----------|------|--------|------------|----------|----------|",
		"| *(run `bun run harness:plan` to generate milestone records)* | - | - | - | - | - |",
		"",
		"---",
		"",
		"## Tasks",
		"",
		"| Task | Milestone | Kind | Status | Validation | Notes |",
		"|------|-----------|------|--------|------------|-------|",
		"| *(run `bun run harness:plan` to generate starter tasks)* | - | - | - | - | - |",
		"",
		"---",
		"",
		"## Active Worktrees",
		"",
		"| Worktree | Milestone | Branch | Status |",
		"|----------|-----------|--------|--------|",
		"| - | - | - | No active milestone worktrees |",
		"",
		"---",
		"",
		"## Activity Log",
		"",
		`- Ready template baseline refreshed on ${today()}.`,
	].join("\n");
}

export function renderQualityGradesDoc(): string {
	return [
		"# Quality Grades",
		"",
		"Tracks the quality of the engineer template itself. Replace these entries with product-specific grades as the repository is adopted.",
		"",
		`**Last updated:** ${today()} | **Updated by:** Project leads`,
		"",
		"---",
		"",
		"## Grading Scale",
		"",
		"| Grade | Meaning |",
		"|-------|---------|",
		"| **A** | Production-ready, well-tested, well-documented |",
		"| **B** | Functional, some gaps in tests or docs |",
		"| **C** | Works but needs attention (tech debt, missing tests) |",
		"| **D** | Fragile, known issues, needs refactor |",
		"| **F** | Broken or severely degraded |",
		"",
		"---",
		"",
		"## Domain Grades",
		"",
		"| Domain | Code Quality | Test Coverage | Documentation | Overall | Notes |",
		"|--------|-------------|---------------|---------------|---------|-------|",
		"| Harness runtime | A | B | A | A- | Validation and orchestration flows are live and repo-owned |",
		"| Workspace scaffold | B | B | B | B | Apps and packages are intentionally minimal but ready to customize |",
		"| Documentation surfaces | B | n/a | B | B | Docs are actionable defaults and should be replaced with project context after initialization |",
		"",
		"---",
		"",
		"## Layer Grades",
		"",
		"| Layer | Grade | Coverage | Notes |",
		"|-------|-------|----------|-------|",
		"| Types | B | Minimal scaffold coverage | Shared contracts exist and should be expanded by the first product slice |",
		"| Config | B | Convention coverage | Environment patterns are documented but product validation is still project-specific |",
		"| Repo | B | Structural coverage | Repository layer rules exist even when feature-specific repositories are not yet implemented |",
		"| Service | B | Scaffold tests | Shared service example and rules are present |",
		"| Runtime | B | Scaffold tests | App runtime workspaces compile and test successfully |",
		"| UI | B | Scaffold tests | UI workspace is intentionally thin and awaits product-specific components |",
		"",
		"---",
		"",
		"## Action Items",
		"",
		"Items that need to be addressed to improve grades:",
		"",
		"- [ ] Replace template-specific goals, milestones, and grades with project-specific ones during adoption.",
		"- [ ] Add product-specific deployment and runtime checks once target environments are chosen.",
		"",
		"---",
		"",
		"## How to Update",
		"",
		"When a domain or layer grade changes:",
		"",
		"1. Update the table above.",
		"2. Add specific action items for anything below B.",
		"3. Create ADRs for significant architectural decisions that affected the grade.",
		"4. Run `bun run harness:entropy` to check for pattern drift.",
		"",
		"Entropy scans run weekly (via `.github/workflows/harness-validate.yml`) and may surface issues to address here.",
	].join("\n");
}
