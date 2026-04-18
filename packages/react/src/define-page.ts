import { cloneElement, isValidElement, type FC, type ReactElement, type ReactNode } from "react";
import {
  parseEnvelope,
  renderPage,
  type Envelope,
  type EnvelopeTool,
} from "@readable-ui/core";
import {
  Button,
  Form,
  Table,
  Link,
  Page,
  type ButtonProps,
  type FormProps,
  type TableProps,
  type LinkProps,
  type ActionProp,
  type TypedTableProps,
  type PageProps,
} from "./components.js";

/**
 * ADR 0028 — Typed proxy injected as the 2nd argument of `render`.
 *
 * Each catalog component is re-typed so that `action` / `tool` props are
 * narrowed to `Tools[number]["name"]` — the literal union of tool names
 * declared in `envelope.tools`. Runtime behaviour is identical to the global
 * components (passthrough); the narrowing is purely at the type level.
 *
 * Author usage:
 *   render: (params, { Button, Form, Table, Link }) => (…)
 *
 * Global imports of Button/Form/Table/Link remain unaffected (ADR 0007 —
 * catalog closure: no new catalog entries).
 */
export type DefinePageProxy<Tools extends readonly EnvelopeTool[]> = {
  Button: FC<Omit<ButtonProps, "action"> & ActionProp<Tools[number]["name"]>>;
  Form: FC<Omit<FormProps, "action"> & ActionProp<Tools[number]["name"]>>;
  Table: <R extends { id: string | number }>(
    props: TypedTableProps<R, Tools[number]["name"]>
  ) => ReactNode;
  Link: FC<LinkProps>;
};

/**
 * ADR 0026 — DX layer that collapses page-content + .md/route boilerplate.
 *
 * Given an envelope and a render function, returns a Next.js-ready bundle:
 * - `Component` — for `page.tsx` default export (HTML).
 * - `GET` — for `foo.md/route.tsx` (Markdown, content-type text/markdown).
 * - `toMarkdown` — for tests or external consumers.
 *
 * Envelope is the single source of truth for layout/nav/breadcrumb. When the
 * root of the tree is `<Page>`, missing props are filled from envelope via
 * `cloneElement` (no React Context — ADR 0008 walker semantics preserved).
 *
 * ADR 0028 — 2nd generic `Tools` captures envelope.tools literal so that the
 * `proxy` injected as render's 2nd argument narrows action/tool props to the
 * declared tool-name union. Omitting the 2nd argument falls back to the global
 * components (backward compatible).
 */
export interface DefinePageOptions<P = void, Tools extends readonly EnvelopeTool[] = readonly EnvelopeTool[]> {
  envelope: (Envelope & { tools?: Tools }) | ((params: P) => Envelope & { tools?: Tools });
  render: (params: P, proxy: DefinePageProxy<Tools>) => ReactElement;
}

export type DefinedPage<P = void> = P extends void
  ? {
      Component: () => ReactElement;
      GET: () => Response;
      toMarkdown: () => string;
      envelope: Envelope;
    }
  : {
      Component: (props: P) => ReactElement;
      GET: (request: Request, context: { params: P }) => Response;
      toMarkdown: (params: P) => string;
      envelope: (params: P) => Envelope;
    };

/**
 * Runtime proxy: plain passthrough to the original catalog components.
 * ADR 0028 §경계 명시: walker sees the original ReactElement.type — no wrapping.
 */
const runtimeProxy: DefinePageProxy<readonly EnvelopeTool[]> = {
  Button: Button as FC<ButtonProps>,
  Form: Form as FC<FormProps>,
  Table: Table as <R extends { id: string | number }>(props: TableProps<R>) => ReactNode,
  Link: Link as FC<LinkProps>,
};

export function definePage<P = void, const Tools extends readonly EnvelopeTool[] = readonly EnvelopeTool[]>(
  opts: DefinePageOptions<P, Tools>
): DefinedPage<P> {
  const envelopeIsFn = typeof opts.envelope === "function";

  const resolveEnvelope = (params: P): Envelope => {
    const raw = envelopeIsFn
      ? (opts.envelope as (p: P) => Envelope)(params)
      : (opts.envelope as Envelope);
    return parseEnvelope(raw);
  };

  // Eager validation for the static case — module load fails fast on schema
  // drift (Plan agent review §4: preflight envelope parse).
  if (!envelopeIsFn) {
    parseEnvelope(opts.envelope as Envelope);
  }

  const buildTree = (params: P): ReactElement => {
    const root = opts.render(params, runtimeProxy as unknown as DefinePageProxy<Tools>);
    return bindPageEnvelope(root, resolveEnvelope(params));
  };

  const Component = (props: P) => buildTree(props);
  (Component as { displayName?: string }).displayName = "ReadablePage";

  const toMarkdown = (params: P) =>
    renderPage(buildTree(params), resolveEnvelope(params));

  const GET = (
    _request: Request | undefined,
    context?: { params: P }
  ): Response => {
    const params = (context?.params ?? (undefined as unknown)) as P;
    const body = renderPage(buildTree(params), resolveEnvelope(params));
    return new Response(body, {
      headers: { "content-type": "text/markdown; charset=utf-8" },
    });
  };

  return {
    Component,
    GET,
    toMarkdown,
    envelope: opts.envelope,
  } as unknown as DefinedPage<P>;
}

/**
 * Clone the root `<Page>` element to inherit envelope layout/nav/breadcrumb
 * when the prop is absent. Runs only in the HTML render path — the Markdown
 * path already reads envelope via `SerializeContext.envelope` (components.tsx
 * `effectiveLayout` / `resolveNav` / `resolveBreadcrumb`).
 *
 * ADR 0014 §4 mismatch policy: if both envelope and prop declare the same
 * field and values differ, emit a console.warn but do not override the prop
 * (prop wins in HTML; envelope wins in Markdown — existing 0014 semantics).
 */
function bindPageEnvelope(
  root: ReactElement,
  env: Envelope
): ReactElement {
  if (!isValidElement(root) || root.type !== Page) return root;
  const props = root.props as PageProps;
  const patch: Partial<PageProps> = {};

  if (props.layout === undefined && env.layout !== undefined) {
    patch.layout = env.layout;
  } else if (
    props.layout !== undefined &&
    env.layout !== undefined &&
    props.layout !== env.layout
  ) {
    warnMismatch("layout", String(props.layout), String(env.layout));
  }

  const envNavItems = env.nav?.items ?? [];
  if ((!props.nav || props.nav.length === 0) && envNavItems.length > 0) {
    patch.nav = envNavItems;
  } else if (props.nav && props.nav.length > 0 && envNavItems.length > 0) {
    const diverged =
      props.nav.length !== envNavItems.length ||
      props.nav.some((p, i) => p.href !== envNavItems[i]?.href);
    if (diverged) {
      warnMismatch("nav.items", "prop", "envelope");
    }
  }

  const envBc = env.breadcrumb ?? [];
  if ((!props.breadcrumb || props.breadcrumb.length === 0) && envBc.length > 0) {
    patch.breadcrumb = envBc;
  }

  if (Object.keys(patch).length === 0) return root;
  return cloneElement(root, patch);
}

function warnMismatch(field: string, propVal: string, envVal: string): void {
  if (typeof console === "undefined") return;
  console.warn(
    `[readable-ui] Page.${field} prop (${propVal}) disagrees with envelope (${envVal}). Envelope wins in Markdown; prop wins in HTML. See ADR 0014 §4.`
  );
}
