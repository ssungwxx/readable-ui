import type { Root, RootContent } from "mdast";
import { toMarkdown } from "mdast-util-to-markdown";
import { gfmToMarkdown } from "mdast-util-gfm";

export type MdNode = RootContent;

export interface SerializeContext {
  depth: number;
  serializeChildren: (children: unknown) => MdNode[];
}

export interface DualComponentSpec<P> {
  name: string;
  toMarkdown: (props: P, ctx: SerializeContext) => MdNode | MdNode[] | null;
}

export interface ReadableNode {
  readonly __readable: true;
  readonly spec: DualComponentSpec<unknown>;
  readonly props: unknown;
}

const registry = new Map<string, DualComponentSpec<unknown>>();

export function registerDualComponent<P>(spec: DualComponentSpec<P>): DualComponentSpec<P> {
  registry.set(spec.name, spec as DualComponentSpec<unknown>);
  return spec;
}

export function getRegisteredComponent(name: string): DualComponentSpec<unknown> | undefined {
  return registry.get(name);
}

export function serializeTree(nodes: MdNode[]): string {
  const root: Root = { type: "root", children: nodes };
  return toMarkdown(root, { extensions: [gfmToMarkdown()] });
}
