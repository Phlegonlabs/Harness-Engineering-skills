# HTML Prototype Guide

## Two Prototype Types

1. **`docs/design/product-prototype.html`** — Full product overview, generated once after PRD_ARCH phase. Covers ALL screens from the PRD.
2. **`docs/design/[MILESTONE]-prototype.html`** — Milestone-specific, generated before each UI milestone's tasks begin. Contains only that milestone's screens.

## Structure

Every prototype is a **single self-contained HTML file** with inline CSS and JS. Zero external dependencies.

### Required Features

- **Sidebar navigation** listing all pages/screens
- Each page as `<section id="page-[name]" class="proto-page">`
- **State toggles** per component: default / loading / empty / error
- **Viewport toggles**: mobile (375px) / tablet (768px) / desktop (1280px)
- **Dark/light mode toggle**
- Design system tokens as `:root` CSS custom properties

### HTML Skeleton

```html
<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>[PROJECT_NAME] — Prototype</title>
  <style>
    /* Design system tokens */
    :root { /* light theme tokens */ }
    [data-theme="dark"] { /* dark theme tokens */ }

    /* Layout */
    /* Component styles */
    /* State styles */
    /* Viewport simulation */
  </style>
</head>
<body>
  <nav class="proto-sidebar">
    <!-- Page list -->
  </nav>
  <main class="proto-main">
    <div class="proto-toolbar">
      <!-- Viewport toggles, theme toggle, state toggles -->
    </div>
    <div class="proto-viewport">
      <section id="page-home" class="proto-page active">
        <!-- Page content -->
      </section>
      <!-- More pages -->
    </div>
  </main>
  <script>
    /* Page navigation, state toggling, viewport simulation, theme toggle */
  </script>
</body>
</html>
```

## CSS Rules

- All color, font, spacing, and radius values come from `:root` CSS custom properties derived from `DESIGN_SYSTEM.md`
- Use a **4px spacing grid** (4 / 8 / 12 / 16 / 24 / 32 / 48 / 64)
- **Responsive breakpoints**: mobile (< 768px), tablet (768–1024px), desktop (> 1024px)
- Include **skeleton loading animations** using CSS `@keyframes`
- Dark and light variants must both be fully styled

## JS Rules

- **Vanilla JS only** — no frameworks, no build step
- Page navigation: show/hide `proto-page` sections based on sidebar clicks
- State toggling: swap component content between default / loading / empty / error
- Viewport simulation: resize the `.proto-viewport` container to match selected width
- Theme toggle: swap `data-theme` attribute on `<html>`

## Quality Bar

Prototypes must look like the **final product** — same colors, fonts, spacing, and component shapes. They are NOT wireframes or low-fidelity mockups.

- Use real (or realistic placeholder) content — no "Lorem ipsum"
- Icons can be inline SVG or Unicode symbols
- Images can use colored placeholder divs with aspect ratios
- Interactive elements should show hover/focus states via CSS

## Naming Convention

| Type | Path |
|------|------|
| Full product prototype | `docs/design/product-prototype.html` |
| Milestone prototype | `docs/design/[MILESTONE]-prototype.html` |

Examples:
- `docs/design/product-prototype.html`
- `docs/design/m1-prototype.html`
- `docs/design/m2-prototype.html`
