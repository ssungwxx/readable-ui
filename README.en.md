# readable-ui

> Languages: [한국어](./README.md) · **English**

React UI components that serialize themselves to Markdown so AI agents can read and operate them without a browser or screenshots.

> Status: early scaffolding. APIs are not stable.

## Idea

A React component declares two faces of itself:

1. **HTML render** — what humans see.
2. **Markdown serializer** — what agents read.

When a request arrives with `Accept: text/markdown`, the same component tree is walked and each node emits Markdown (tables, links, form field lists, action manifests) instead of DOM.

Agents can read the page like a document and trigger actions via declared URIs (e.g. `mcp://tool/...`) — no Playwright, no screenshots.

## Packages

| Package | Purpose |
| --- | --- |
| `@readable-ui/core` | Framework-agnostic serializer (React tree → mdast → Markdown) + component registry |
| `@readable-ui/react` | React bindings — `defineDualComponent`, hooks, provider |
| `@readable-ui/next` | Next.js adapter — Accept-header content negotiation, RSC support |
| `@readable-ui/mcp` | Expose declared actions as MCP tools |

## Scope

**Fit.** New agent-facing admin panels and internal tools designed from the ground up against the readable-ui catalog — i.e. projects where readable-ui owns the full component surface of the app.

**Not fit.** Apps already built on shadcn/ui, MUI, Ant Design, or any other existing component library. readable-ui is not a drop-in additive layer:

- The walker rejects host elements inside a readable-ui subtree. Any `<button>` or `<div>` reached during Markdown serialization throws (`packages/core/src/index.ts:147-151`), so existing components that expand to native DOM cannot be mixed into the tree.
- The v1 component catalog is a **closed set** of 26 entries (see [ADR 0007](./docs/adr/0007-layout-and-component-catalog.md)). `defineDualComponent` overrides bind only to existing catalog names; net-new names (e.g. `DateRangePicker`, `MultiSelect`, `Kanban`) require an ADR revision.

Incremental adoption page-by-page over an existing admin app is therefore out of scope. Plan for a full rewrite of the screens placed under readable-ui, or pick a different library.

## Non-goals

- A fixed UI kit. This library does not dictate visual design — you bring your own components and register their Markdown counterparts.
- A Markdown editor. This is about rendering UI **as** Markdown, not editing Markdown **as** UI.
- A drop-in replacement for existing component libraries (shadcn/ui, MUI, Ant Design). See [Scope](#scope).
- Incremental adoption over an existing admin app — the walker throws on host elements (`<button>`, `<div>`) anywhere in the readable-ui subtree, so every rendered node must be a registered dual component. See [ADR 0007](./docs/adr/0007-layout-and-component-catalog.md).

## License

MIT
