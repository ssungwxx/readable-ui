import type { ReactNode } from "react";
import { defineDualComponent } from "./index.js";
import type { MdNode, SerializeContext } from "@readable-ui/core";

function asText(children: ReactNode): string {
  if (children == null || typeof children === "boolean") return "";
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(asText).join("");
  if (typeof children === "object" && "props" in (children as object)) {
    const el = children as { props?: { children?: ReactNode } };
    return asText(el.props?.children);
  }
  return "";
}

function inlineFromChildren(children: ReactNode, ctx: SerializeContext): MdNode[] {
  const walked = ctx.walk(children);
  if (walked.length > 0) return walked;
  const text = asText(children);
  return text ? [{ type: "text", value: text } as MdNode] : [];
}

export interface PageProps {
  children: ReactNode;
}
export const Page = defineDualComponent<PageProps>({
  name: "page",
  render: ({ children }) => (
    <main className="mx-auto max-w-4xl px-6 py-10 space-y-6">{children}</main>
  ),
  toMarkdown: ({ children }, ctx) => ctx.walk(children),
});

export interface HeadingProps {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: ReactNode;
}
export const Heading = defineDualComponent<HeadingProps>({
  name: "heading",
  render: ({ level, children }) => {
    const cls =
      level === 1
        ? "text-3xl font-bold tracking-tight"
        : level === 2
          ? "text-2xl font-semibold tracking-tight"
          : "text-xl font-semibold";
    const Tag = `h${level}` as "h1";
    return <Tag className={cls}>{children}</Tag>;
  },
  toMarkdown: ({ level, children }, ctx) => ({
    type: "heading",
    depth: level,
    children: inlineFromChildren(children, ctx) as never,
  }),
});

export interface ParagraphProps {
  children: ReactNode;
}
export const Paragraph = defineDualComponent<ParagraphProps>({
  name: "paragraph",
  render: ({ children }) => <p className="leading-7 text-gray-800">{children}</p>,
  toMarkdown: ({ children }, ctx) => ({
    type: "paragraph",
    children: inlineFromChildren(children, ctx) as never,
  }),
});

export interface LinkProps {
  href: string;
  children: ReactNode;
}
export const Link = defineDualComponent<LinkProps>({
  name: "link",
  render: ({ href, children }) => (
    <a href={href} className="text-blue-600 underline hover:no-underline">
      {children}
    </a>
  ),
  toMarkdown: ({ href, children }, ctx) => ({
    type: "link",
    url: href,
    children: inlineFromChildren(children, ctx) as never,
  }),
});

export interface ListProps {
  ordered?: boolean;
  children: ReactNode;
}
export const List = defineDualComponent<ListProps>({
  name: "list",
  render: ({ ordered, children }) => {
    const Tag = ordered ? "ol" : "ul";
    const cls = ordered ? "list-decimal pl-6 space-y-1" : "list-disc pl-6 space-y-1";
    return <Tag className={cls}>{children}</Tag>;
  },
  toMarkdown: ({ ordered, children }, ctx) => {
    const items = ctx.walk(children);
    return {
      type: "list",
      ordered: Boolean(ordered),
      spread: false,
      children: items as never,
    };
  },
});

export interface ListItemProps {
  children: ReactNode;
}
export const ListItem = defineDualComponent<ListItemProps>({
  name: "list-item",
  render: ({ children }) => <li>{children}</li>,
  toMarkdown: ({ children }, ctx) => ({
    type: "listItem",
    spread: false,
    children: [
      {
        type: "paragraph",
        children: inlineFromChildren(children, ctx) as never,
      },
    ] as never,
  }),
});

export interface CardProps {
  title?: string;
  children: ReactNode;
}
export const Card = defineDualComponent<CardProps>({
  name: "card",
  render: ({ title, children }) => (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
      {title ? <h3 className="text-lg font-semibold">{title}</h3> : null}
      {children}
    </section>
  ),
  toMarkdown: ({ title, children }, ctx) => ({
    type: "containerDirective",
    name: "card",
    attributes: title ? { title } : {},
    children: ctx.walk(children) as never,
  }),
});

export interface ButtonProps {
  action: string;
  variant?: "primary" | "secondary" | "danger";
  children: ReactNode;
}
export const Button = defineDualComponent<ButtonProps>({
  name: "button",
  render: ({ action, variant = "primary", children }) => {
    const base = "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium";
    const color =
      variant === "primary"
        ? "bg-blue-600 text-white hover:bg-blue-700"
        : variant === "danger"
          ? "bg-red-600 text-white hover:bg-red-700"
          : "bg-gray-200 text-gray-900 hover:bg-gray-300";
    return (
      <button type="submit" data-action={action} className={`${base} ${color}`}>
        {children}
      </button>
    );
  },
  toMarkdown: ({ action, variant, children }, ctx) => {
    ctx.registerAction(action);
    const label = asText(children) || action;
    return {
      type: "leafDirective",
      name: "button",
      attributes: { action, ...(variant ? { variant } : {}) },
      children: [{ type: "text", value: label } as MdNode] as never,
    };
  },
});

export interface FormProps {
  action: string;
  children: ReactNode;
}
export const Form = defineDualComponent<FormProps>({
  name: "form",
  render: ({ action, children }) => (
    <form
      action={`/api/tool/${action}`}
      method="post"
      className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3"
    >
      {children}
    </form>
  ),
  toMarkdown: ({ action, children }, ctx) => {
    ctx.registerAction(action);
    return {
      type: "containerDirective",
      name: "form",
      attributes: { action },
      children: ctx.walk(children) as never,
    };
  },
});

export interface InputProps {
  name: string;
  type?: "text" | "email" | "password" | "number" | "url" | "date" | "datetime-local";
  label?: string;
  required?: boolean;
  placeholder?: string;
}
export const Input = defineDualComponent<InputProps>({
  name: "input",
  render: ({ name, type = "text", label, required, placeholder }) => (
    <label className="flex flex-col gap-1 text-sm">
      {label ? (
        <span className="text-gray-700">
          {label}
          {required ? <span className="text-red-600"> *</span> : null}
        </span>
      ) : null}
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
      />
    </label>
  ),
  toMarkdown: ({ name, type, label, required, placeholder }) => {
    const attrs: Record<string, string> = { name };
    if (type && type !== "text") attrs.type = type;
    if (label) attrs.label = label;
    if (placeholder) attrs.placeholder = placeholder;
    if (required) attrs.required = "true";
    return {
      type: "leafDirective",
      name: "input",
      attributes: attrs,
      children: [] as never,
    };
  },
});

export interface AlertProps {
  kind: "note" | "tip" | "important" | "warning" | "caution";
  children: ReactNode;
}
export const Alert = defineDualComponent<AlertProps>({
  name: "alert",
  render: ({ kind, children }) => {
    const palette: Record<AlertProps["kind"], string> = {
      note: "bg-blue-50 border-blue-200 text-blue-900",
      tip: "bg-green-50 border-green-200 text-green-900",
      important: "bg-purple-50 border-purple-200 text-purple-900",
      warning: "bg-yellow-50 border-yellow-200 text-yellow-900",
      caution: "bg-red-50 border-red-200 text-red-900",
    };
    return (
      <aside className={`rounded-md border px-4 py-3 ${palette[kind]}`}>
        <div className="text-xs font-semibold uppercase tracking-wide">{kind}</div>
        <div className="mt-1 text-sm">{children}</div>
      </aside>
    );
  },
  toMarkdown: ({ kind, children }, ctx) => ({
    type: "blockquote",
    children: [
      {
        type: "paragraph",
        children: [{ type: "text", value: `[!${kind.toUpperCase()}]` } as MdNode] as never,
      },
      ...ctx.walk(children),
    ] as never,
  }),
});
