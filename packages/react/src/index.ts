import type { FC, ReactNode } from "react";
import {
  registerDualComponent,
  type DualComponentSpec,
  type MdNode,
  type SerializeContext,
} from "@readable-ui/core";

export interface DefineDualComponentOptions<P> {
  name: string;
  render: (props: P) => ReactNode;
  toMarkdown: (props: P, ctx: SerializeContext) => MdNode | MdNode[] | null;
}

export interface DualComponent<P> extends FC<P> {
  readonly __readable: true;
  readonly spec: DualComponentSpec<P>;
}

export function defineDualComponent<P>(opts: DefineDualComponentOptions<P>): DualComponent<P> {
  const spec: DualComponentSpec<P> = {
    name: opts.name,
    toMarkdown: opts.toMarkdown,
  };
  registerDualComponent(spec);
  const Component = ((props: P) => opts.render(props)) as DualComponent<P>;
  Component.displayName = opts.name;
  (Component as { __readable: true }).__readable = true;
  (Component as { spec: DualComponentSpec<P> }).spec = spec;
  return Component;
}

export {
  renderMarkdown,
  renderPage,
  walkTree,
  serializeTree,
} from "@readable-ui/core";
export type {
  Envelope,
  EnvelopeTool,
  MdNode,
  SerializeContext,
  DualComponentSpec,
} from "@readable-ui/core";
