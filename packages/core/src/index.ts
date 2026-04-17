import type { ReactElement, ReactNode } from "react";
import type { Blockquote, Root, RootContent } from "mdast";
import type {
  ContainerDirective,
  LeafDirective,
  TextDirective,
} from "mdast-util-directive";
import { toMarkdown, type Options as ToMdOptions, type Handle } from "mdast-util-to-markdown";
import { gfmToMarkdown } from "mdast-util-gfm";
import { directiveToMarkdown } from "mdast-util-directive";
import { stringify as stringifyYaml } from "yaml";
import { parseEnvelope, type Envelope } from "./envelope.js";

export {
  EnvelopeZ,
  EnvelopeToolZ,
  PaginationZ,
  PathsZ,
  ConstraintZ,
  JsonSchemaSubsetZ,
  EnvelopeError,
  parseEnvelope,
} from "./envelope.js";
export type {
  Envelope,
  EnvelopeTool,
  Constraint,
  Pagination,
  Paths,
} from "./envelope.js";

type DirectiveNode = ContainerDirective | LeafDirective | TextDirective;
export type MdNode = RootContent | DirectiveNode;

export type FallbackMode = "on" | "off" | "link-only";

export interface SerializeContext {
  depth: number;
  walk: (node: unknown, override?: { fallback?: FallbackMode }) => MdNode[];
  envelope: Envelope | undefined;
  registerAction: (name: string) => void;
  fallback: FallbackMode;
}

export interface DualComponentSpec<P> {
  name: string;
  toMarkdown: (props: P, ctx: SerializeContext) => MdNode | MdNode[] | null;
}

const registry = new Map<string, DualComponentSpec<unknown>>();

export function registerDualComponent<P>(spec: DualComponentSpec<P>): DualComponentSpec<P> {
  registry.set(spec.name, spec as DualComponentSpec<unknown>);
  return spec;
}

export function getRegisteredComponent(name: string): DualComponentSpec<unknown> | undefined {
  return registry.get(name);
}

const REACT_ELEMENT = Symbol.for("react.element");
const REACT_FRAGMENT = Symbol.for("react.fragment");

interface ReactLike {
  $$typeof?: symbol;
  type: unknown;
  props: Record<string, unknown> & { children?: unknown };
}

function isReactElement(value: unknown): value is ReactLike {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { $$typeof?: symbol }).$$typeof === REACT_ELEMENT
  );
}

export interface WalkOptions {
  envelope?: Envelope;
  onAction?: (name: string) => void;
  fallback?: FallbackMode;
}

export function walkTree(root: unknown, options: WalkOptions = {}): MdNode[] {
  const base = {
    depth: 0,
    envelope: options.envelope,
    registerAction: (name: string) => options.onAction?.(name),
    fallback: options.fallback ?? "on",
  };
  const makeCtx = (fallback: FallbackMode): SerializeContext => {
    const ctx: SerializeContext = {
      ...base,
      fallback,
      walk: (node, override) => {
        const next = override?.fallback ?? fallback;
        return walkNode(node, next === fallback ? ctx : makeCtx(next));
      },
    };
    return ctx;
  };
  const root_ctx = makeCtx(base.fallback);
  return walkNode(root, root_ctx);
}

function walkNode(node: unknown, ctx: SerializeContext): MdNode[] {
  if (node == null || node === false || node === true) return [];
  if (typeof node === "string" || typeof node === "number") {
    return [{ type: "text", value: String(node) } as MdNode];
  }
  if (Array.isArray(node)) {
    return node.flatMap((n) => walkNode(n, ctx));
  }
  if (!isReactElement(node)) return [];

  const { type, props } = node;

  if (type === REACT_FRAGMENT) {
    return walkNode(props.children, ctx);
  }

  if (typeof type === "symbol" || (typeof type === "object" && type !== null)) {
    return walkNode(props.children, ctx);
  }

  if (typeof type === "string") {
    throw new Error(
      `Host element <${type}> is not allowed in readable-ui trees (v1). Use a registered dual component instead. See docs/adr/0007.`
    );
  }

  if (typeof type === "function") {
    const spec = (type as { spec?: DualComponentSpec<unknown> }).spec;
    if (spec) {
      const result = spec.toMarkdown(props as never, { ...ctx, depth: ctx.depth + 1 });
      if (result == null) return [];
      return Array.isArray(result) ? result : [result];
    }
    const rendered = (type as (p: unknown) => ReactNode)(props);
    return walkNode(rendered, ctx);
  }

  return [];
}

type AlertKind = "note" | "tip" | "important" | "warning" | "caution";

interface GfmAlertBlockquote extends Blockquote {
  data?: { gfmAlert?: AlertKind };
}

const gfmAlertHandler: Handle = (node, _parent, state, info) => {
  const bq = node as GfmAlertBlockquote;
  const kind = bq.data?.gfmAlert;
  if (!kind) {
    const children = state.containerFlow(node as Blockquote, info);
    return state.indentLines(children, (line, _idx, blank) => ">" + (blank ? "" : " ") + line);
  }
  const tracker = state.createTracker(info);
  tracker.move("> ");
  tracker.shift(2);
  const body = state.containerFlow(node as Blockquote, tracker.current());
  const header = `[!${kind.toUpperCase()}]`;
  const combined = body ? `${header}\n${body}` : header;
  return state.indentLines(combined, (line, _idx, blank) =>
    ">" + (blank ? "" : " ") + line
  );
};

export function serializeTree(nodes: MdNode[]): string {
  const root: Root = { type: "root", children: nodes as never };
  return toMarkdown(root, {
    extensions: [gfmToMarkdown(), directiveToMarkdown()],
    handlers: { blockquote: gfmAlertHandler },
    bullet: "-",
    fences: true,
  } satisfies ToMdOptions);
}

export function renderMarkdown(
  root: ReactNode | ReactElement,
  options: WalkOptions = {}
): string {
  const nodes = walkTree(root, options);
  return serializeTree(nodes);
}

export function renderPage(
  root: ReactNode | ReactElement,
  envelope: Envelope,
  options: Omit<WalkOptions, "envelope"> = {}
): string {
  const validated = parseEnvelope(envelope);
  const usedActions = new Set<string>();
  const nodes = walkTree(root, {
    ...options,
    envelope: validated,
    onAction: (name) => {
      usedActions.add(name);
      options.onAction?.(name);
    },
  });
  if (validated.tools) {
    const declared = new Set(validated.tools.map((t) => t.name));
    for (const used of usedActions) {
      if (!declared.has(used)) {
        throw new Error(
          `Action "${used}" is used in the body but not declared in envelope.tools. See docs/spec/page-envelope.md#검증규칙.`
        );
      }
    }
  }
  const body = serializeTree(nodes);
  const yaml = stringifyYaml(stripUndefined(validated as unknown as Record<string, unknown>));
  return `---\n${yaml}---\n\n${body}`;
}

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}
