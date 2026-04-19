# readable-ui

> Languages: [한국어](./README.md) · **English**

**A React UI that AI agents can read and operate — no browser, no screenshots, no accessibility tree.**
The same component tree renders as HTML for humans, and as Markdown for agents.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E=20-brightgreen.svg)](./package.json)
[![Status](https://img.shields.io/badge/status-early%20scaffolding-orange.svg)](#status)
[![ADR](https://img.shields.io/badge/ADRs-30%2B-purple.svg)](./docs/adr)

---

## The idea — one tree, two faces

A React component declares its own **HTML render** and **Markdown serializer** side by side. When a request arrives with `Accept: text/markdown`, the same tree is walked and each node emits Markdown (tables, links, form field lists, action manifests) instead of DOM.

```tsx
import { definePage } from "@readable-ui/react";
import { Page, Heading, Card } from "@readable-ui/react/components";

export const dashboard = definePage({
  envelope: {
    title: "Admin dashboard",
    tools: [{ name: "refreshDashboard", title: "Refresh dashboard" }],
  },
  render: (_, { Button }) => (
    <Page>
      <Heading level={1}>Admin dashboard</Heading>
      <Card title="Total users">
        <Heading level={2}>1,284</Heading>
      </Card>
      <Button action="refreshDashboard">Refresh</Button>
    </Page>
  ),
});
```

`GET /dashboard` renders the tree above as HTML — cards, tables, buttons are free to wear Tailwind.
Send `Accept: text/markdown` to the same URL:

```md
---
title: Admin dashboard
tools:
  - name: refreshDashboard
    title: Refresh dashboard
---

# Admin dashboard

:::card{title="Total users"}
## 1,284
:::

::button[Refresh]{action="refreshDashboard"}
```

The agent reads the page like a document and triggers declared tools via URIs like `mcp://tool/refreshDashboard`. No Playwright, no screenshots, no DOM snapshot.

## Why

Compared to the three common choices for agent-facing apps:

| Approach | Token cost | Structured actions | UI ↔ tool drift |
| --- | :---: | :---: | :---: |
| Playwright + screenshots (vision) | Very large | No | — |
| CDP accessibility tree dump | Tens of thousands | Heuristic | — |
| Separate tool API with manual sync | Small | Yes | Drifts |
| **readable-ui** | **Small** | **Yes (declared)** | **None — derived from one tree** |

UI and tools are derived from the same code, so drift is eliminated by construction.

## Benchmarks

Same DOM snapshot, three transports, seven real scenarios from `apps/example` (baseline `2026-04-18`):

| Transport | tokens (median) | tokens (mean) | vs readable-ui | actionable (mean) |
| --- | ---: | ---: | ---: | ---: |
| **`readable-ui`** | **1,247** | **3,118** | **1.00×** | **5.7** (declared) |
| `ax-tree` (CDP AX tree) | 23,883 | 29,701 | **23.9×** | 17.1 (heuristic) |
| `headful-md` (AX → MD heuristic) | 417 | 402 | 0.13× | 1.3 (lossy) |

- `ax-tree` spends **23.9×** more tokens on average and still can't hand structured actions to the model — they are guessed from roles.
- `headful-md` is compact but loses structural information like table payloads and form fields.
- `readable-ui` declares actions explicitly via envelope `tools[]` and body directives.

Fairness rules and full metrics: [`bench/docs/metrics.md`](./bench/docs/metrics.md) · [ADR 0023](./docs/adr/0023-benchmark-environment.md).

## Packages

| Package | Purpose |
| --- | --- |
| [`@readable-ui/core`](./packages/core) | Framework-agnostic serializer (React tree → mdast → Markdown) + component registry |
| [`@readable-ui/react`](./packages/react) | React bindings — `definePage`, `defineDualComponent`, `defineTools`, catalog components |
| [`@readable-ui/next`](./packages/next) | Next.js adapter — Accept-header content negotiation, RSC support |
| [`@readable-ui/mcp`](./packages/mcp) | Expose declared envelope actions as MCP tools |

## Try it

Packages are not published to npm yet. Clone the repo and run the example app.

```bash
git clone https://github.com/ssungwxx/readable-ui.git
cd readable-ui
pnpm install
pnpm -r build
pnpm --filter example dev
# → http://localhost:3000
```

Open the HTML view (`/dashboard`) and the Markdown view (`/dashboard.md`) side by side. Eight sample pages ship out of the box — dashboard, users (CRUD), user detail, reports, audit, jobs, components, settings.

## Scope

| Fit | Not fit |
| --- | --- |
| New agent-facing admin panels and internal tools designed ground-up around readable-ui | Apps built on shadcn/ui, MUI, Ant Design, or any other existing component library |
| Projects where readable-ui owns the full component surface | Drop-in, page-by-page adoption on top of an existing admin app |

- The walker rejects host elements (`<button>`, `<div>`) inside a readable-ui subtree (`packages/core/src/index.ts:147-151`).
- The v1 catalog is a **closed set** of 26 entries; net-new names (e.g. `DateRangePicker`, `Kanban`) require an ADR revision. ([ADR 0007](./docs/adr/0007-layout-and-component-catalog.md))

## Status

Early scaffolding — the following is **not yet** stable:

- Package npm publication (all packages at `0.0.0`, `private` workspace)
- `definePage` / `Envelope` signatures
- v2 catalog extension policy
- Overlay support (Modal / Drawer / Popover)
- Inline HTML policy

Design feedback and ADR drafts are welcome.

## Non-goals

- A fixed UI kit. Bring your own styling and register each component's Markdown counterpart.
- A Markdown editor. This is about rendering UI **as** Markdown, not editing Markdown **as** UI.
- A drop-in replacement for existing component libraries, or incremental adoption on top of an existing admin app.

## Documentation

- [`docs/adr/`](./docs/adr) — 30+ Architecture Decision Records
- [`docs/spec/page-envelope.md`](./docs/spec/page-envelope.md) — envelope format (YAML frontmatter + JSON Schema tools)
- [`docs/spec/component-catalog.md`](./docs/spec/component-catalog.md) — v1 components and directive serialization rules
- [`bench/docs/metrics.md`](./bench/docs/metrics.md) — bench scenarios and fairness rules

## License

MIT © [ssungwxx](https://github.com/ssungwxx)
