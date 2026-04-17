import type { ReactElement, ReactNode } from "react";
import type { Root, RootContent } from "mdast";
import type {
  ContainerDirective,
  LeafDirective,
  TextDirective,
} from "mdast-util-directive";
import { toMarkdown } from "mdast-util-to-markdown";
import { gfmToMarkdown } from "mdast-util-gfm";
import { directiveToMarkdown } from "mdast-util-directive";
import { stringify as stringifyYaml } from "yaml";

type DirectiveNode = ContainerDirective | LeafDirective | TextDirective;
export type MdNode = RootContent | DirectiveNode;

export interface Envelope {
  title: string;
  purpose?: string;
  role?: string | string[];
  layout?: string;
  tools?: EnvelopeTool[];
}

export interface EnvelopeTool {
  name: string;
  description?: string;
  input?: Record<string, unknown>;
  role?: string | string[];
}

export interface SerializeContext {
  depth: number;
  walk: (node: unknown) => MdNode[];
  envelope: Envelope | undefined;
  registerAction: (name: string) => void;
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
}

export function walkTree(root: unknown, options: WalkOptions = {}): MdNode[] {
  const usedActions = new Set<string>();
  const ctx: SerializeContext = {
    depth: 0,
    envelope: options.envelope,
    walk: (node) => walkNode(node, ctx),
    registerAction: (name) => {
      usedActions.add(name);
      options.onAction?.(name);
    },
  };
  return walkNode(root, ctx);
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

export function serializeTree(nodes: MdNode[]): string {
  const root: Root = { type: "root", children: nodes };
  return toMarkdown(root, {
    extensions: [gfmToMarkdown(), directiveToMarkdown()],
    bullet: "-",
    fences: true,
  });
}

export function renderMarkdown(root: ReactNode | ReactElement): string {
  const nodes = walkTree(root);
  return serializeTree(nodes);
}

export function renderPage(root: ReactNode | ReactElement, envelope: Envelope): string {
  const nodes = walkTree(root, { envelope });
  const body = serializeTree(nodes);
  const yaml = stringifyYaml(stripUndefined(envelope as unknown as Record<string, unknown>));
  return `---\n${yaml}---\n\n${body}`;
}

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}
