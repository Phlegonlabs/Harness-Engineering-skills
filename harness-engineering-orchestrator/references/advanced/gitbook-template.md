# GitBook Documentation Generation Specification

GitBook documentation is auto-generated **after Phase 3 is completed**, stored in `docs/gitbook/`,
and updated after each Milestone is completed. This document is product documentation intended for **external users/developers**.

---

## Directory Structure

```
docs/gitbook/
├── SUMMARY.md          ← Required by GitBook, defines table of contents
├── README.md           ← Documentation home page (≠ project root README.md)
├── getting-started/
│   ├── installation.md
│   ├── quickstart.md
│   └── configuration.md
├── guides/
│   ├── [Feature A].md     ← One guide per PRD Milestone
│   └── [Feature B].md
├── api-reference/
│   ├── overview.md
│   └── [endpoint].md  ← One page per API route
├── architecture/
│   ├── overview.md
│   └── decisions.md   ← ADR summary (public-friendly version)
└── changelog/
    └── CHANGELOG.md   ← Changes recorded by Milestone
```

---

## SUMMARY.md Format

```markdown
# Table of Contents

## Getting Started
* [Introduction](README.md)
* [Installation](getting-started/installation.md)
* [Quick Start](getting-started/quickstart.md)
* [Configuration](getting-started/configuration.md)

## Guides
* [Feature A](guides/feature-a.md)
* [Feature B](guides/feature-b.md)

## API Reference
* [Overview](api-reference/overview.md)
* [Endpoints](api-reference/endpoints.md)

## Architecture
* [System Overview](architecture/overview.md)
* [Key Decisions](architecture/decisions.md)

## Changelog
* [Changelog](changelog/CHANGELOG.md)
```

---

## Generation Rules for Each File

### `docs/gitbook/README.md` (Documentation Home Page)

```markdown
# [PROJECT_DISPLAY_NAME]

[One-sentence description: what this product is and who it's built for]

## What is [PROJECT_NAME]?

[2-3 paragraphs: what problem it solves, core value, target users]

## Key Features

- **[Feature 1]**: [one-sentence description]
- **[Feature 2]**: [one-sentence description]
- **[Feature 3]**: [one-sentence description]

## Quick Start

\`\`\`bash
[shortest path commands to get users started]
\`\`\`

[→ See Installation Guide](getting-started/installation.md)
```

### `getting-started/installation.md`

```markdown
# Installation

## Prerequisites

- [Prerequisite 1]
- [Prerequisite 2]

## Install

\`\`\`bash
[installation commands]
\`\`\`

## Verify

\`\`\`bash
[commands to verify successful installation]
\`\`\`
```

### `guides/[feature].md` (One Page per PRD Milestone)

````markdown
# [Feature Name]

> [One-sentence description of what this feature does]

## Overview

[Feature description, user-facing, no technical details]

## Usage

```[language]
[usage example code]
```

## Options / Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| ... | ... | ... | ... |

## Examples

### Basic Example

```[language]
[basic use case]
```

### Advanced Example

```[language]
[advanced use case]
```
````

### `changelog/CHANGELOG.md`

```markdown
# Changelog

All notable changes are documented here, organized by Milestone.

## [v1.1.0] — Milestone 2: [Name] — [DATE]

### Added
- [new feature]

### Changed
- [changed behavior]

### Fixed
- [fixed issue]

## [v1.0.0] — Milestone 1: Foundation — [DATE]

### Added
- Initial release
```

---

## Generation Timing

| Timing | Action |
|--------|--------|
| After Phase 3 completed | Generate initial GitBook skeleton (SUMMARY.md + README.md + getting-started/) |
| After each Milestone merge | Update corresponding guide + CHANGELOG + api-reference |
| Phase 6 final validation | Confirm all GitBook documents match actual functionality |

---

## GitBook Connection (Optional)

If the user has a GitBook account, configure sync in `gitbook.yaml`:

```yaml
# gitbook.yaml (placed at repo root)
root: ./docs/gitbook
structure:
  readme: README.md
  summary: SUMMARY.md
```

You can also directly use GitHub Pages to render the `docs/gitbook/` directory.
