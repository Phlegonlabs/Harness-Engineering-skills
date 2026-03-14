# Harness Engineering Skills

这是一个公开的 Harness Engineering skill 仓库。

当前仓库只发布一个可安装 skill：

- `harness-engineering-orchestrator`：把一个新项目或现有代码库编排进一套从 discovery 到验证闭环的工程工作流

## 什么是 Harness Engineering？

Harness Engineering 是一种面向 AI agent 的工程方法：真正的项目状态不留在聊天记录里，而是沉淀到仓库本身。

也就是说，规划、架构、进度、执行规则和交接信息会写进可版本化的项目文件，例如 `AGENTS.md`、`CLAUDE.md`、`docs/PRD.md`、`docs/ARCHITECTURE.md`、`docs/PROGRESS.md` 和 `.harness/state.json`。这样 Claude Code 和 Codex 都可以直接依赖仓库状态继续推进，而不是反复依赖对话上下文。

## 核心理念

- 聊天是输入，仓库文件才是状态。
- 只要仓库里的文档和状态没更新，规划就不算完成。
- 只有代码、验证结果和任务状态一致，执行才算完成。
- 交接必须能够脱离聊天记录，仅依赖仓库事实继续进行。

## 这个 Skill 做什么

`harness-engineering-orchestrator` 是一个编排型 skill，不只是一个脚手架生成器。

它面向两类常见起点：

- `Greenfield`：从一个想法出发，推进 discovery、市场研究、技术栈确认、PRD、架构、scaffold、执行和验证
- `Existing codebase`：在已有仓库上补齐 Harness runtime、核心文档、里程碑跟踪和验证机制

适合这类请求：

- `Bootstrap a new project with Harness Engineering.`
- `Turn this repo into a Harness-managed workflow.`
- `Create a PRD, architecture, milestone backlog, and execution loop for this app.`
- `Retrofit this existing codebase for Claude Code and Codex collaboration.`

## 工作流阶段

这个 orchestrator 围绕一条受控生命周期工作：

```text
DISCOVERY -> MARKET_RESEARCH -> TECH_STACK -> PRD_ARCH -> SCAFFOLD -> EXECUTING -> VALIDATING -> COMPLETE
```

目标是让产品意图、架构设计、任务状态和验证门禁在整个执行过程中始终保持同步。

## 它会产出什么

根据项目类型和仓库当前状态，这个 skill 会生成或维护：

- `docs/PRD.md`：记录范围、里程碑、需求和验收标准
- `docs/ARCHITECTURE.md`：记录系统结构、依赖方向、数据流和技术约束
- `docs/PROGRESS.md`：记录里程碑和任务进度
- `.harness/state.json` 以及相关 runtime 文件
- `AGENTS.md` 和 `CLAUDE.md`：作为 agent 协作约定
- `docs/adr/` 和 `docs/gitbook/`：作为辅助文档层
- 进入执行阶段所需的 scaffold 文件、CI/CD 基线和验证命令

## 为什么这套方式有用

很多 agent 协作项目最后都会卡在同样的问题上：计划留在聊天里，交接时上下文丢失，任务状态和代码现实逐渐脱节。

Harness Engineering 的价值就在于把这些项目状态显式写入仓库并纳入版本控制。这样无论是人还是 agent，都可以读取同一套事实来源，更稳定地恢复上下文并继续推进。

## 安装

这个仓库通过 `harness-engineering-orchestrator/` 目录发布 skill：

```bash
npx skills add https://github.com/Phlegonlabs/Harness-engineering-skills --skill harness-engineering-orchestrator
```

## 快速使用

安装后，下面这些提示词应该会触发该 skill：

- `Bootstrap a new TypeScript monorepo with Harness Engineering.`
- `Retrofit this existing repo with PRD, architecture, progress tracking, and Harness validation.`
- `Turn this app idea into milestones and a validated execution workflow.`
- `帮我把这个项目接成一套基于仓库状态的 Harness Engineering 工作流。`

## 仓库结构

```text
Harness-engineering-skills/
├── README.md
├── README.en.md
├── README.zh-CN.md
└── harness-engineering-orchestrator/
    ├── SKILL.md
    ├── agents/
    ├── references/
    ├── scripts/
    └── templates/
```

- `README.md`：仓库首页的语言入口页
- `README.en.md`：英文说明
- `README.zh-CN.md`：中文说明
- `harness-engineering-orchestrator/SKILL.md`：skill 的运行契约
- `harness-engineering-orchestrator/agents/`：各角色的操作说明
- `harness-engineering-orchestrator/references/`：模板、规则和参考资料
- `harness-engineering-orchestrator/scripts/`：初始化和配套自动化脚本

## 继续阅读

- [English README](./README.en.md)
- [Skill Contract](./harness-engineering-orchestrator/SKILL.md)
