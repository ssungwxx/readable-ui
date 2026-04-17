# readable-ui

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

## Non-goals

- A fixed UI kit. This library does not dictate visual design — you bring your own components and register their Markdown counterparts.
- A Markdown editor. This is about rendering UI **as** Markdown, not editing Markdown **as** UI.

## License

MIT
