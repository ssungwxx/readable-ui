import type { ReactNode } from "react";
import { defineDualComponent } from "./index.js";
import type {
  MdNode,
  Nav,
  NavItem as EnvelopeNavItem,
  PageLayout,
  SerializeContext,
} from "@readable-ui/core";

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

function buildActionURI(
  tool: string,
  params: Record<string, string | number | boolean> = {}
): string {
  const entries = Object.entries(params).map(([k, v]) => [k, String(v)] as [string, string]);
  const qs = new URLSearchParams(entries).toString();
  return `mcp://tool/${tool}${qs ? `?${qs}` : ""}`;
}

export type NavItem = EnvelopeNavItem;

export interface PageProps {
  layout?: PageLayout;
  nav?: NavItem[];
  children: ReactNode;
}

function resolveNav(
  propNav: NavItem[] | undefined,
  envNav: Nav | undefined
): { items: NavItem[]; scope: "global" | "section" } | null {
  if (envNav && envNav.items.length > 0) {
    return { items: envNav.items, scope: envNav.scope ?? "global" };
  }
  if (propNav && propNav.length > 0) {
    return { items: propNav, scope: "global" };
  }
  return null;
}

function renderNavMarkdown(nav: NavItem[], scope: "global" | "section"): MdNode[] {
  if (nav.length === 0) return [];
  const headingText = scope === "section" ? "Section navigation" : "Navigation";
  const heading: MdNode = {
    type: "heading",
    depth: 2,
    children: [{ type: "text", value: headingText } as MdNode] as never,
  };
  const list: MdNode = {
    type: "list",
    ordered: false,
    spread: false,
    children: nav.map((item) => {
      const linkChildren: MdNode[] = [
        {
          type: "link",
          url: item.href,
          children: [{ type: "text", value: item.label } as MdNode] as never,
        } as MdNode,
      ];
      if (item.active) {
        linkChildren.push({ type: "text", value: " · current" } as MdNode);
      }
      return {
        type: "listItem",
        spread: false,
        children: [
          {
            type: "paragraph",
            children: linkChildren as never,
          },
        ] as never,
      } as MdNode;
    }) as never,
  };
  return [heading, list];
}

export const Page = defineDualComponent<PageProps>({
  name: "page",
  render: ({ layout = "flow", nav, children }) => {
    if (layout === "sidebar" && nav && nav.length > 0) {
      return (
        <div className="flex min-h-screen">
          <aside className="w-60 shrink-0 border-r border-gray-200 bg-gray-50 px-4 py-6">
            <nav className="flex flex-col gap-1 text-sm">
              {nav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={item.active ? "page" : undefined}
                  className={
                    item.active
                      ? "rounded px-3 py-2 font-medium bg-blue-50 text-blue-700"
                      : "rounded px-3 py-2 text-gray-700 hover:bg-gray-100"
                  }
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </aside>
          <main className="flex-1 px-8 py-10 space-y-6">{children}</main>
        </div>
      );
    }
    if (layout === "topbar" && nav && nav.length > 0) {
      return (
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-gray-200 bg-white">
            <nav className="mx-auto flex max-w-6xl gap-1 px-6 py-3 text-sm">
              {nav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={item.active ? "page" : undefined}
                  className={
                    item.active
                      ? "rounded px-3 py-2 font-medium bg-blue-50 text-blue-700"
                      : "rounded px-3 py-2 text-gray-700 hover:bg-gray-100"
                  }
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </header>
          <main className="mx-auto w-full max-w-6xl px-6 py-10 space-y-6">
            {children}
          </main>
        </div>
      );
    }
    return (
      <main className="mx-auto max-w-4xl px-6 py-10 space-y-6">{children}</main>
    );
  },
  toMarkdown: ({ nav: propNav, children }, ctx) => {
    const body = ctx.walk(children);
    const resolved = resolveNav(propNav, ctx.envelope?.nav);
    if (!resolved) return body;
    return [...renderNavMarkdown(resolved.items, resolved.scope), ...body];
  },
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
    const url = buildActionURI(action);

    const inheritAction = ctx.formAction === action;
    const directive: MdNode = {
      type: "leafDirective",
      name: "button",
      attributes: {
        ...(inheritAction ? {} : { action }),
        ...(variant ? { variant } : {}),
      },
      children: [{ type: "text", value: label } as MdNode] as never,
    };

    const linkOnly: MdNode = {
      type: "paragraph",
      children: [
        {
          type: "link",
          url,
          children: [{ type: "text", value: label }],
        } as MdNode,
      ] as never,
    };

    const linkWithFallbackTitle: MdNode = {
      type: "paragraph",
      children: [
        {
          type: "link",
          url,
          title: "fallback",
          children: [{ type: "text", value: label }],
        } as MdNode,
      ] as never,
    };

    if (ctx.fallback === "off") return directive;
    if (ctx.fallback === "link-only") return linkOnly;
    return [directive, linkWithFallbackTitle];
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
      children: ctx.walk(children, { fallback: "off", formAction: action }) as never,
    };
  },
});

export interface InputProps {
  name: string;
  type?: "text" | "email" | "password" | "number" | "url" | "date" | "datetime-local" | "tel" | "search";
  label?: string;
  required?: boolean;
  placeholder?: string;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  format?: string;
}
export const Input = defineDualComponent<InputProps>({
  name: "input",
  render: ({ name, type = "text", label, required, placeholder, pattern, minLength, maxLength, min, max, step }) => (
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
        pattern={pattern}
        minLength={minLength}
        maxLength={maxLength}
        min={min}
        max={max}
        step={step}
        className="rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
      />
    </label>
  ),
  toMarkdown: ({ name, type, label, required, placeholder, pattern, minLength, maxLength, min, max, step, format }) => {
    const attrs: Record<string, string> = { name };
    if (type && type !== "text") attrs.type = type;
    if (label) attrs.label = label;
    if (placeholder) attrs.placeholder = placeholder;
    if (pattern) attrs.pattern = pattern;
    if (minLength != null) attrs.minlength = String(minLength);
    if (maxLength != null) attrs.maxlength = String(maxLength);
    if (min != null) attrs.min = String(min);
    if (max != null) attrs.max = String(max);
    if (step != null) attrs.step = String(step);
    if (format) attrs.format = format;
    if (required) attrs.required = "";
    return {
      type: "leafDirective",
      name: "input",
      attributes: attrs,
      children: [] as never,
    };
  },
});

export interface SelectProps {
  name: string;
  options: string[];
  label?: string;
  required?: boolean;
  multiple?: boolean;
}
export const Select = defineDualComponent<SelectProps>({
  name: "select",
  render: ({ name, options, label, required, multiple }) => (
    <label className="flex flex-col gap-1 text-sm">
      {label ? (
        <span className="text-gray-700">
          {label}
          {required ? <span className="text-red-600"> *</span> : null}
        </span>
      ) : null}
      <select
        name={name}
        required={required}
        multiple={multiple}
        className="rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
      >
        <option value="">Select…</option>
        {options.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    </label>
  ),
  toMarkdown: ({ name, options, label, required, multiple }) => {
    const attrs: Record<string, string> = {
      name,
      options: options.join(","),
    };
    if (label) attrs.label = label;
    if (multiple) attrs.multiple = "";
    if (required) attrs.required = "";
    return {
      type: "leafDirective",
      name: "select",
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
    data: { gfmAlert: kind },
    children: ctx.walk(children) as never,
  }),
});

export interface TableColumn<R> {
  key: keyof R & string;
  label: string;
  align?: "left" | "center" | "right";
}

export interface TableRowAction<R> {
  tool: string;
  label: string;
  variant?: "primary" | "secondary" | "danger";
  params: (row: R) => Record<string, string | number | boolean>;
}

export interface TableProps<R extends { id: string | number }> {
  columns: TableColumn<R>[];
  rows: R[];
  actions?: TableRowAction<R>[];
  showIdColumn?: boolean;
  caption?: string;
}

type AnyRow = { id: string | number; [k: string]: unknown };

const TableImpl = defineDualComponent<TableProps<AnyRow>>({
  name: "table",
  render: ({ columns, rows, actions = [], showIdColumn = true, caption }) => (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      {caption ? (
        <div className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 border-b border-gray-200">
          {caption}
        </div>
      ) : null}
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-700">
          <tr>
            {showIdColumn ? <th className="px-4 py-2 text-left font-medium">id</th> : null}
            {columns.map((c) => (
              <th key={c.key} className={`px-4 py-2 font-medium text-${c.align ?? "left"}`}>
                {c.label}
              </th>
            ))}
            {actions.length ? (
              <th className="px-4 py-2 text-left font-medium">Actions</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={String(r.id)} data-rui-id={String(r.id)} className="border-t border-gray-100">
              {showIdColumn ? (
                <td className="px-4 py-2 text-xs text-gray-500 font-mono">{String(r.id)}</td>
              ) : null}
              {columns.map((c) => (
                <td key={c.key} className={`px-4 py-2 text-${c.align ?? "left"}`}>
                  {String(r[c.key] ?? "")}
                </td>
              ))}
              {actions.length ? (
                <td className="px-4 py-2 space-x-2">
                  {actions.map((a) => {
                    const color =
                      a.variant === "danger"
                        ? "text-red-600"
                        : a.variant === "secondary"
                          ? "text-gray-600"
                          : "text-blue-600";
                    const url = buildActionURI(a.tool, a.params(r));
                    return (
                      <a
                        key={a.tool}
                        href={url}
                        data-action={a.tool}
                        className={`${color} underline hover:no-underline`}
                      >
                        {a.label}
                      </a>
                    );
                  })}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
  toMarkdown: ({ columns, rows, actions = [], showIdColumn = true }, ctx) => {
    for (const a of actions) ctx.registerAction(a.tool);

    const textCell = (value: string): MdNode => ({
      type: "tableCell",
      children: [{ type: "text", value } as MdNode] as never,
    });

    const headerRow: MdNode = {
      type: "tableRow",
      children: [
        ...(showIdColumn ? [textCell("id")] : []),
        ...columns.map((c) => textCell(c.label)),
        ...(actions.length ? [textCell("Actions")] : []),
      ] as never,
    };

    const bodyRows: MdNode[] = rows.map((r) => {
      const actionChildren: MdNode[] = actions.flatMap((a, i) => {
        const url = buildActionURI(a.tool, a.params(r));
        const link: MdNode = {
          type: "link",
          url,
          children: [{ type: "text", value: a.label } as MdNode] as never,
        };
        return i > 0 ? [{ type: "text", value: " · " } as MdNode, link] : [link];
      });

      return {
        type: "tableRow",
        children: [
          ...(showIdColumn
            ? [
                {
                  type: "tableCell",
                  children: [{ type: "text", value: String(r.id) } as MdNode] as never,
                } as MdNode,
              ]
            : []),
          ...columns.map(
            (c) =>
              ({
                type: "tableCell",
                children: [{ type: "text", value: String(r[c.key] ?? "") } as MdNode] as never,
              }) as MdNode
          ),
          ...(actions.length
            ? [
                {
                  type: "tableCell",
                  children: actionChildren as never,
                } as MdNode,
              ]
            : []),
        ] as never,
      };
    });

    const align: ("left" | "center" | "right")[] = [
      ...(showIdColumn ? (["left"] as const) : []),
      ...columns.map((c) => c.align ?? "left"),
      ...(actions.length ? (["left"] as const) : []),
    ];

    return {
      type: "table",
      align,
      children: [headerRow, ...bodyRows] as never,
    };
  },
});

export function Table<R extends { id: string | number }>(props: TableProps<R>): ReactNode {
  return TableImpl(props as unknown as TableProps<AnyRow>);
}
Table.spec = TableImpl.spec;
(Table as unknown as { __readable: true }).__readable = true;
Table.displayName = "table";
