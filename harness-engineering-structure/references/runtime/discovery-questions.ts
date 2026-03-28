import type { DiscoveryQuestion } from "./types";

export const PRD_QUESTIONS: DiscoveryQuestion[] = [
	{
		id: "prd.executive-summary",
		stage: "PRD",
		prompt: "请用一段完整文字说明这个产品是什么、给谁用、核心价值是什么。",
		docTargets: ["docs/product.md#Executive Summary"],
		expectedAnswerShape: "short-paragraph",
	},
	{
		id: "prd.problem-statement",
		stage: "PRD",
		prompt:
			"请描述当前状态、缺口和影响。最好按 Current state / The gap / Impact 组织。",
		docTargets: ["docs/product.md#Problem Statement"],
		expectedAnswerShape: "three-part-paragraph",
	},
	{
		id: "prd.target-audience",
		stage: "PRD",
		prompt: "请列出主要用户画像、描述和核心目标。最好直接给 markdown 表格。",
		docTargets: ["docs/product.md#Target Audience"],
		expectedAnswerShape: "markdown-table",
	},
	{
		id: "prd.core-capabilities",
		stage: "PRD",
		prompt:
			"请按 Must / Should / Could / Won't 给出能力列表。最好直接给 markdown 小节和清单。",
		docTargets: ["docs/product.md#Core Capabilities"],
		expectedAnswerShape: "markdown-section",
	},
	{
		id: "prd.scope-boundaries",
		stage: "PRD",
		prompt: "请给出 In scope 和 Out of scope，最好直接给 markdown 段落和清单。",
		docTargets: ["docs/product.md#Scope Boundaries"],
		expectedAnswerShape: "markdown-section",
	},
	{
		id: "prd.success-metrics",
		stage: "PRD",
		prompt: "请给出成功指标，最好直接给 markdown 表格。",
		docTargets: ["docs/product.md#Success Metrics"],
		expectedAnswerShape: "markdown-table",
	},
	{
		id: "prd.assumptions-constraints",
		stage: "PRD",
		prompt:
			"请给出 Assumptions 和 Constraints，最好直接给 markdown 小节和清单。",
		docTargets: ["docs/product.md#Assumptions & Constraints"],
		expectedAnswerShape: "markdown-section",
	},
	{
		id: "prd.proposed-milestones",
		stage: "PRD",
		prompt:
			"请列出 milestone 级结果，使用 markdown 清单，每条是一个可交付结果。",
		docTargets: ["docs/product.md#Proposed Milestones"],
		expectedAnswerShape: "markdown-list",
	},
	{
		id: "prd.open-questions",
		stage: "PRD",
		prompt:
			'如果还有未决问题，请列出来；没有的话可以写"暂无"。最好直接给 markdown 清单。',
		docTargets: ["docs/product.md#Open Questions"],
		expectedAnswerShape: "markdown-list",
	},
];

export const ARCHITECTURE_QUESTIONS: DiscoveryQuestion[] = [
	{
		id: "arch.overview",
		stage: "ARCHITECTURE",
		prompt:
			"请写完整的架构总览，包含主要模块/服务/客户端和关系。可以用段落加 ASCII 图。",
		docTargets: ["docs/architecture.md#Architecture Overview"],
		expectedAnswerShape: "markdown-section",
	},
	{
		id: "arch.system-boundaries",
		stage: "ARCHITECTURE",
		prompt: "请列出外部系统、方向、协议和说明。最好直接给 markdown 表格。",
		docTargets: ["docs/architecture.md#System Boundaries"],
		expectedAnswerShape: "markdown-table",
	},
	{
		id: "arch.interfaces-contracts",
		stage: "ARCHITECTURE",
		prompt:
			"请描述关键接口/API/contract。最好直接给 markdown 小节和示例签名/schema。",
		docTargets: ["docs/architecture.md#Interfaces & Contracts"],
		expectedAnswerShape: "markdown-section",
	},
	{
		id: "arch.cross-cutting",
		stage: "ARCHITECTURE",
		prompt:
			"请描述 logging、error handling、authentication、configuration 等 cross-cutting concerns。最好直接给 markdown 表格。",
		docTargets: ["docs/architecture.md#Cross-Cutting Concerns"],
		expectedAnswerShape: "markdown-table",
	},
	{
		id: "arch.build-distribution-deployment",
		stage: "ARCHITECTURE",
		prompt: "请说明 build/test/deploy 流程。最好直接给 markdown 代码块。",
		docTargets: ["docs/architecture.md#Build / Distribution / Deployment"],
		expectedAnswerShape: "markdown-codeblock",
	},
	{
		id: "arch.execution-constraints",
		stage: "ARCHITECTURE",
		prompt: "请写会影响 milestone 切分或并行的约束，最好直接给 markdown 表格。",
		docTargets: ["docs/architecture.md#Execution Constraints"],
		expectedAnswerShape: "markdown-table",
	},
	{
		id: "arch.technical-risks",
		stage: "ARCHITECTURE",
		prompt: "请列出技术风险、概率、影响和缓解措施，最好直接给 markdown 表格。",
		docTargets: ["docs/architecture.md#Technical Risks"],
		expectedAnswerShape: "markdown-table",
	},
	{
		id: "arch.validation-plan",
		stage: "ARCHITECTURE",
		prompt: "请写架构验证方案。可以是分步清单。",
		docTargets: ["docs/architecture.md#Validation Plan"],
		expectedAnswerShape: "markdown-list",
	},
];

export const PRD_PACKETS = [
	["prd.executive-summary", "prd.problem-statement", "prd.target-audience"],
	["prd.core-capabilities", "prd.scope-boundaries", "prd.success-metrics"],
	[
		"prd.assumptions-constraints",
		"prd.proposed-milestones",
		"prd.open-questions",
	],
];

export const ARCH_PACKETS = [
	["arch.overview", "arch.system-boundaries"],
	["arch.interfaces-contracts", "arch.cross-cutting"],
	["arch.build-distribution-deployment", "arch.execution-constraints"],
	["arch.technical-risks", "arch.validation-plan"],
];

export const REQUIRED_PRD = [
	"prd.executive-summary",
	"prd.problem-statement",
	"prd.target-audience",
	"prd.core-capabilities",
	"prd.scope-boundaries",
	"prd.success-metrics",
	"prd.assumptions-constraints",
	"prd.proposed-milestones",
];

export const REQUIRED_ARCH = [
	"arch.overview",
	"arch.system-boundaries",
	"arch.interfaces-contracts",
	"arch.cross-cutting",
	"arch.build-distribution-deployment",
	"arch.execution-constraints",
	"arch.technical-risks",
	"arch.validation-plan",
];
