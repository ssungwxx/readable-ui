import type { ReactNode } from "react";
import { defineDualComponent } from "./index.js";
import {
  serializeJsonlPayload,
  type BreadcrumbItem as EnvelopeBreadcrumbItem,
  type MdNode,
  type Nav,
  type NavItem as EnvelopeNavItem,
  type PageLayout,
  type SerializeContext,
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
  // ADR 0002 §Query value encoding: percent-encode via URLSearchParams (RFC 3986).
  // Matching is on percent-decoded values so senders may use raw or encoded form.
  const entries = Object.entries(params).map(
    ([k, v]) => [k, String(v)] as [string, string]
  );
  const qs = new URLSearchParams(entries).toString();
  return `mcp://tool/${tool}${qs ? `?${qs}` : ""}`;
}

export type NavItem = EnvelopeNavItem;
export type BreadcrumbItem = EnvelopeBreadcrumbItem;

export interface DetailBackLink {
  label: string;
  href: string;
}

export interface PageProps {
  layout?: PageLayout;
  nav?: NavItem[];
  /** ADR 0021 §2: detail layout — back link rendered above the title */
  back?: DetailBackLink;
  /** ADR 0024 §4: hierarchical path. When 2+ items are provided, suppresses `back`. */
  breadcrumb?: BreadcrumbItem[];
  /** ADR 0021 §2: detail layout — right-side meta rail (HTML); flushed after main in Markdown */
  meta?: ReactNode;
  /** ADR 0021 §2: detail layout — bottom action area (HTML); flushed after meta in Markdown */
  footer?: ReactNode;
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

function renderBackLinkMarkdown(back: DetailBackLink): MdNode[] {
  // ADR 0021 §3: single paragraph "← Back to <label>" link, body 맨 앞 (nav 가 있으면 nav 뒤).
  // 텍스트 리터럴 "← " (U+2190 + space) + "Back to " + label 고정. 영어 single-source.
  return [
    {
      type: "paragraph",
      children: [
        {
          type: "link",
          url: back.href,
          children: [
            { type: "text", value: `\u2190 Back to ${back.label}` } as MdNode,
          ] as never,
        } as MdNode,
      ] as never,
    } as MdNode,
  ];
}

function resolveBreadcrumb(
  propBc: BreadcrumbItem[] | undefined,
  envBc: BreadcrumbItem[] | undefined
): BreadcrumbItem[] | null {
  // ADR 0024 §4: envelope 우선. 둘 다 있고 불일치는 warning 대상이나 v1 silent. items < 2 는 출력 생략.
  const items = envBc && envBc.length > 0 ? envBc : propBc;
  if (!items || items.length < 2) return null;
  return items;
}

function renderBreadcrumbMarkdown(items: BreadcrumbItem[]): MdNode[] {
  // ADR 0024 §4: nav 뒤 · back 앞 paragraph 한 줄. chevron `\u203A` + 공백.
  // 각 항목: href 있으면 link, 없으면 plain text (현재 위치).
  const children: MdNode[] = [];
  items.forEach((item, idx) => {
    if (idx > 0) {
      children.push({ type: "text", value: " \u203A " } as MdNode);
    }
    if (item.href) {
      children.push({
        type: "link",
        url: item.href,
        children: [{ type: "text", value: item.label } as MdNode] as never,
      } as MdNode);
    } else {
      children.push({ type: "text", value: item.label } as MdNode);
    }
  });
  return [
    {
      type: "paragraph",
      children: children as never,
    } as MdNode,
  ];
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

function BrandMark() {
  return (
    <div className="flex items-center gap-2 px-2 py-1">
      <span
        aria-hidden="true"
        className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-400 text-white shadow-sm ring-1 ring-black/5"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h10" />
          <path d="M4 12h16" />
          <path d="M4 18h7" />
        </svg>
      </span>
      <span className="text-sm font-semibold tracking-tight text-gray-900">
        readable
        <span className="text-gray-400">/</span>
        ui
      </span>
    </div>
  );
}

function BreadcrumbHeader({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm">
      <ol className="flex flex-wrap items-center gap-1.5 text-slate-500">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          const sep = idx > 0 ? (
            <span key={`sep-${idx}`} aria-hidden="true" className="text-slate-300">
              &rsaquo;
            </span>
          ) : null;
          const content = item.href ? (
            <a
              href={item.href}
              className="rounded px-1 font-medium text-slate-500 transition-colors hover:text-slate-900"
            >
              {item.label}
            </a>
          ) : (
            <span aria-current={isLast ? "page" : undefined} className="px-1 font-medium text-slate-900">
              {item.label}
            </span>
          );
          return (
            <li key={`bc-${idx}`} className="flex items-center gap-1.5">
              {sep}
              {content}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export const Page = defineDualComponent<PageProps>({
  name: "page",
  render: ({ layout = "flow", nav, back, breadcrumb, meta, footer, children }) => {
    // ADR 0024 §4: breadcrumb (>= 2 items) suppresses `back`. envelope override는 toMarkdown 경로에서.
    const showBreadcrumb = breadcrumb && breadcrumb.length >= 2;
    const effectiveBack = showBreadcrumb ? undefined : back;
    if (layout === "detail") {
      // ADR 0021 §2: 3-area shell — header(back+title slot) / body grid (main + meta) / footer.
      // children 의 첫 Heading level=1 은 자동으로 헤더 영역에 시각 분리되지 않음 — children flow 가
      // main column 으로 직진. back/meta/footer 는 Page prop 으로만 들어온다.
      return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
          <div className="mx-auto w-full max-w-5xl px-6 py-8">
            {showBreadcrumb ? <BreadcrumbHeader items={breadcrumb!} /> : null}
            {effectiveBack ? (
              <header className="mb-6">
                <a
                  href={effectiveBack.href}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
                >
                  <span aria-hidden="true">&larr;</span>
                  <span>Back to {effectiveBack.label}</span>
                </a>
              </header>
            ) : null}
            <div className={meta ? "grid gap-8 md:grid-cols-[minmax(0,1fr)_18rem]" : ""}>
              <main className="min-w-0 space-y-6">{children}</main>
              {meta ? (
                <aside className="space-y-4 md:pt-1 md:border-l md:border-slate-200/70 md:pl-8">
                  {meta}
                </aside>
              ) : null}
            </div>
            {footer ? (
              <footer className="mt-10 border-t border-slate-200/70 pt-6 space-y-4">
                {footer}
              </footer>
            ) : null}
          </div>
        </div>
      );
    }
    const wrappedChildren = showBreadcrumb ? (
      <>
        <BreadcrumbHeader items={breadcrumb!} />
        {children}
      </>
    ) : (
      children
    );
    if (layout === "sidebar" && nav && nav.length > 0) {
      return (
        <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
          <aside className="w-64 shrink-0 border-r border-slate-200/70 bg-white/70 backdrop-blur px-4 py-6">
            <div className="mb-4">
              <BrandMark />
            </div>
            <nav className="flex flex-col gap-0.5 text-sm">
              {nav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={item.active ? "page" : undefined}
                  className={
                    item.active
                      ? "group relative rounded-lg px-3 py-2 font-medium text-blue-700 bg-gradient-to-r from-blue-50 to-indigo-50 ring-1 ring-blue-100"
                      : "group rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  }
                >
                  {item.active ? (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-blue-500"
                    />
                  ) : null}
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="mt-8 border-t border-slate-200/70 pt-4 text-[11px] text-slate-400">
              <div className="uppercase tracking-widest">Workspace</div>
              <div className="mt-1 text-slate-500">Acme Admin</div>
            </div>
          </aside>
          <main className="flex-1 px-10 py-10 space-y-6">{wrappedChildren}</main>
        </div>
      );
    }
    if (layout === "topbar" && nav && nav.length > 0) {
      return (
        <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 to-white">
          <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/80 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3">
              <BrandMark />
              <nav className="flex items-center gap-0.5 text-sm">
                {nav.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    aria-current={item.active ? "page" : undefined}
                    className={
                      item.active
                        ? "rounded-md px-3 py-1.5 font-medium text-blue-700 bg-blue-50 ring-1 ring-blue-100"
                        : "rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                    }
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
              <div className="ml-auto text-xs text-slate-400">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  All systems operational
                </span>
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl px-6 py-10 space-y-6">
            {wrappedChildren}
          </main>
        </div>
      );
    }
    return (
      <main className="mx-auto max-w-4xl px-6 py-10 space-y-6">{wrappedChildren}</main>
    );
  },
  toMarkdown: ({ layout: propLayout, nav: propNav, back, breadcrumb: propBc, meta, footer, children }, ctx) => {
    // ADR 0021 §3 (+ ADR 0024 §4): order = nav → breadcrumb → back → main(children) → meta → footer.
    // ADR 0021 §6 / §2: back/meta/footer are detail-layout-only props. Guard the serializer
    // so that authors who pass them under flow/sidebar/topbar do not leak detail-shell
    // markup into unrelated layouts (silent ignore — symmetric with HTML render).
    // ADR 0024 §4: breadcrumb (2+ items) works across all layouts and suppresses `back`.
    const effectiveLayout = ctx.envelope?.layout ?? propLayout ?? "flow";
    const isDetail = effectiveLayout === "detail";
    const main = ctx.walk(children);
    const metaNodes = isDetail && meta != null ? ctx.walk(meta) : [];
    const footerNodes = isDetail && footer != null ? ctx.walk(footer) : [];
    const bcItems = resolveBreadcrumb(propBc, ctx.envelope?.breadcrumb);
    const bcNodes = bcItems ? renderBreadcrumbMarkdown(bcItems) : [];
    const backNodes = isDetail && back && !bcItems ? renderBackLinkMarkdown(back) : [];
    const resolved = resolveNav(propNav, ctx.envelope?.nav);
    const navNodes = resolved
      ? renderNavMarkdown(resolved.items, resolved.scope)
      : [];
    return [...navNodes, ...bcNodes, ...backNodes, ...main, ...metaNodes, ...footerNodes];
  },
});

export interface HeadingProps {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: ReactNode;
}
export const Heading = defineDualComponent<HeadingProps>({
  name: "heading",
  render: ({ level, children }) => {
    if (level === 1) {
      return (
        <h1 className="relative text-3xl font-bold tracking-tight text-slate-900">
          <span
            aria-hidden="true"
            className="absolute -left-4 top-1.5 h-7 w-1 rounded-full bg-gradient-to-b from-indigo-500 via-blue-500 to-cyan-400"
          />
          {children}
        </h1>
      );
    }
    if (level === 2) {
      return (
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          {children}
        </h2>
      );
    }
    const cls = "text-xl font-semibold text-slate-900";
    const Tag = `h${level}` as "h3";
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
  render: ({ children }) => (
    <p className="leading-7 text-slate-700">{children}</p>
  ),
  toMarkdown: ({ children }, ctx) => ({
    type: "paragraph",
    children: inlineFromChildren(children, ctx) as never,
  }),
});

export interface StrongProps { children: ReactNode; }
export const Strong = defineDualComponent<StrongProps>({
  name: "strong",
  render: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
  toMarkdown: ({ children }, ctx) => ({
    type: "strong",
    children: inlineFromChildren(children, ctx) as never,
  }),
});

export interface EmphasisProps { children: ReactNode; }
export const Emphasis = defineDualComponent<EmphasisProps>({
  name: "emphasis",
  render: ({ children }) => <em className="italic text-slate-700">{children}</em>,
  toMarkdown: ({ children }, ctx) => ({
    type: "emphasis",
    children: inlineFromChildren(children, ctx) as never,
  }),
});

export interface CodeSpanProps { children: ReactNode; }
export const CodeSpan = defineDualComponent<CodeSpanProps>({
  name: "code-span",
  render: ({ children }) => (
    <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.85em] text-slate-800">
      {asText(children)}
    </code>
  ),
  toMarkdown: ({ children }) => ({
    type: "inlineCode",
    value: asText(children),
  } as MdNode),
});

export interface LinkProps {
  href: string;
  children: ReactNode;
}
export const Link = defineDualComponent<LinkProps>({
  name: "link",
  render: ({ href, children }) => (
    <a
      href={href}
      className="font-medium text-blue-600 underline decoration-blue-300 decoration-2 underline-offset-4 transition-colors hover:text-blue-800 hover:decoration-blue-500"
    >
      {children}
    </a>
  ),
  toMarkdown: ({ href, children }, ctx) => ({
    type: "link",
    url: href,
    children: inlineFromChildren(children, ctx) as never,
  }),
});

export interface ImageProps { src: string; alt: string; }
export const Image = defineDualComponent<ImageProps>({
  name: "image",
  render: ({ src, alt }) => <img src={src} alt={alt} className="max-w-full rounded-lg" />,
  toMarkdown: ({ src, alt }) => ({
    type: "image",
    url: src,
    alt,
  } as MdNode),
});

export const Divider = defineDualComponent<{}>({
  name: "divider",
  render: () => <hr className="my-6 border-t border-slate-200/70" />,
  toMarkdown: () => ({ type: "thematicBreak" } as MdNode),
});

export interface ListProps {
  ordered?: boolean;
  children: ReactNode;
}
export const List = defineDualComponent<ListProps>({
  name: "list",
  render: ({ ordered, children }) => {
    const Tag = ordered ? "ol" : "ul";
    const cls = ordered
      ? "list-decimal pl-6 space-y-1 text-slate-700 marker:text-slate-400"
      : "list-disc pl-6 space-y-1 text-slate-700 marker:text-blue-400";
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
  render: ({ children }) => <li className="pl-1">{children}</li>,
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
    <section className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.12)] transition-shadow hover:shadow-[0_1px_2px_0_rgba(15,23,42,0.05),0_16px_40px_-20px_rgba(15,23,42,0.18)]">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300/60 to-transparent"
      />
      {title ? (
        <header className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </h3>
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500"
          />
        </header>
      ) : null}
      <div className="space-y-3">{children}</div>
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
    const base =
      "inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:translate-y-px";
    const color =
      variant === "primary"
        ? "bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-sm ring-1 ring-inset ring-blue-700/10 hover:from-blue-500 hover:to-blue-700 focus-visible:ring-blue-500"
        : variant === "danger"
          ? "bg-gradient-to-b from-red-500 to-red-600 text-white shadow-sm ring-1 ring-inset ring-red-700/10 hover:from-red-500 hover:to-red-700 focus-visible:ring-red-500"
          : "bg-white text-slate-800 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 focus-visible:ring-slate-400";
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
      className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-400"
      />
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
  type?: "text" | "email" | "password" | "number" | "url" | "date" | "datetime-local" | "tel" | "search" | "hidden";
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
  defaultValue?: string | number;
}
export const Input = defineDualComponent<InputProps>({
  name: "input",
  render: ({ name, type = "text", label, required, placeholder, pattern, minLength, maxLength, min, max, step, defaultValue }) => {
    // ADR 0020 §1: hidden input — no label wrapper, just a bare <input type="hidden">
    if (type === "hidden") {
      return (
        <input type="hidden" name={name} value={defaultValue != null ? String(defaultValue) : undefined} />
      );
    }
    return (
      <label className="flex flex-col gap-1.5 text-sm">
        {label ? (
          <span className="font-medium text-slate-700">
            {label}
            {required ? (
              <span className="ml-0.5 text-red-500" aria-label="required">*</span>
            ) : null}
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
          defaultValue={defaultValue}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 shadow-sm transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </label>
    );
  },
  toMarkdown: ({ name, type, label, required, placeholder, pattern, minLength, maxLength, min, max, step, format, defaultValue }) => {
    // ADR 0020 §1: hidden input — only name + default are meaningful
    if (type === "hidden") {
      const attrs: Record<string, string> = { name, type: "hidden" };
      if (defaultValue != null && defaultValue !== "") attrs.default = String(defaultValue);
      return {
        type: "leafDirective",
        name: "input",
        attributes: attrs,
        children: [] as never,
      };
    }
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
    if (defaultValue != null && defaultValue !== "") attrs.default = String(defaultValue);
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
  defaultValue?: string | string[];
}
export const Select = defineDualComponent<SelectProps>({
  name: "select",
  render: ({ name, options, label, required, multiple, defaultValue }) => (
    <label className="flex flex-col gap-1.5 text-sm">
      {label ? (
        <span className="font-medium text-slate-700">
          {label}
          {required ? (
            <span className="ml-0.5 text-red-500" aria-label="required">*</span>
          ) : null}
        </span>
      ) : null}
      <select
        name={name}
        required={required}
        multiple={multiple}
        defaultValue={defaultValue}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
  toMarkdown: ({ name, options, label, required, multiple, defaultValue }) => {
    const attrs: Record<string, string> = {
      name,
      options: options.join(","),
    };
    if (label) attrs.label = label;
    if (multiple) attrs.multiple = "";
    if (defaultValue != null) {
      if (Array.isArray(defaultValue)) {
        if (defaultValue.length > 0) attrs.default = defaultValue.join(",");
      } else if (defaultValue !== "") {
        attrs.default = defaultValue;
      }
    }
    if (required) attrs.required = "";
    return {
      type: "leafDirective",
      name: "select",
      attributes: attrs,
      children: [] as never,
    };
  },
});

export interface TextareaProps {
  name: string;
  label?: string;
  required?: boolean;
  placeholder?: string;
  rows?: number;
  minLength?: number;
  maxLength?: number;
  defaultValue?: string;
}
export const Textarea = defineDualComponent<TextareaProps>({
  name: "textarea",
  render: ({ name, label, required, placeholder, rows, minLength, maxLength, defaultValue }) => (
    <label className="flex flex-col gap-1.5 text-sm">
      {label ? (
        <span className="font-medium text-slate-700">
          {label}
          {required ? (
            <span className="ml-0.5 text-red-500" aria-label="required">*</span>
          ) : null}
        </span>
      ) : null}
      <textarea
        name={name}
        required={required}
        placeholder={placeholder}
        rows={rows ?? 4}
        minLength={minLength}
        maxLength={maxLength}
        defaultValue={defaultValue}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 shadow-sm transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-y"
      />
    </label>
  ),
  toMarkdown: ({ name, label, required, placeholder, rows, minLength, maxLength, defaultValue }) => {
    const attrs: Record<string, string> = { name };
    if (label) attrs.label = label;
    if (placeholder) attrs.placeholder = placeholder;
    if (rows != null) attrs.rows = String(rows);
    if (minLength != null) attrs.minlength = String(minLength);
    if (maxLength != null) attrs.maxlength = String(maxLength);
    if (defaultValue != null && defaultValue !== "") attrs.default = defaultValue;
    if (required) attrs.required = "";
    return {
      type: "leafDirective",
      name: "textarea",
      attributes: attrs,
      children: [] as never,
    };
  },
});

export interface CheckboxProps {
  name: string;
  label?: string;
  required?: boolean;
  checked?: boolean;
}
export const Checkbox = defineDualComponent<CheckboxProps>({
  name: "checkbox",
  render: ({ name, label, required, checked }) => (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        name={name}
        defaultChecked={checked}
        required={required}
        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/30"
      />
      {label ? <span className="font-medium text-slate-700">{label}</span> : null}
    </label>
  ),
  toMarkdown: ({ name, label, required, checked }) => {
    const attrs: Record<string, string> = { name };
    if (label) attrs.label = label;
    if (checked) attrs.checked = "";
    if (required) attrs.required = "";
    return {
      type: "leafDirective",
      name: "checkbox",
      attributes: attrs,
      children: [] as never,
    };
  },
});

export interface RadioProps {
  name: string;
  value: string;
  label?: string;
  required?: boolean;
  checked?: boolean;
}
export const Radio = defineDualComponent<RadioProps>({
  name: "radio",
  render: ({ name, value, label, required, checked }) => (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={checked}
        required={required}
        className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/30"
      />
      {label ? <span className="font-medium text-slate-700">{label}</span> : null}
    </label>
  ),
  toMarkdown: ({ name, value, label, required, checked }) => {
    const attrs: Record<string, string> = { name, value };
    if (label) attrs.label = label;
    if (checked) attrs.checked = "";
    if (required) attrs.required = "";
    return {
      type: "leafDirective",
      name: "radio",
      attributes: attrs,
      children: [] as never,
    };
  },
});

function AlertIcon({ kind }: { kind: AlertProps["kind"] }) {
  const common = {
    viewBox: "0 0 24 24",
    width: 18,
    height: 18,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (kind) {
    case "note":
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v.5" />
          <path d="M11 12h1v4h1" />
        </svg>
      );
    case "tip":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M12 3a6 6 0 0 0-4 10.5V16a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.5A6 6 0 0 0 12 3z" />
          <path d="M10 21h4" />
        </svg>
      );
    case "important":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M12 2l3 6 6 .9-4.5 4.3 1 6.3L12 16.9l-5.5 2.6 1-6.3L3 8.9 9 8l3-6z" />
        </svg>
      );
    case "warning":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M10.3 3.9L2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      );
    case "caution":
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6" />
          <path d="M12 17h.01" />
        </svg>
      );
  }
}

export interface AlertProps {
  kind: "note" | "tip" | "important" | "warning" | "caution";
  children: ReactNode;
}
export const Alert = defineDualComponent<AlertProps>({
  name: "alert",
  render: ({ kind, children }) => {
    const palette: Record<AlertProps["kind"], { bg: string; icon: string; label: string }> = {
      note: {
        bg: "from-blue-50 to-blue-50/30 border-blue-200 text-blue-950",
        icon: "text-blue-500 bg-blue-100",
        label: "text-blue-700",
      },
      tip: {
        bg: "from-emerald-50 to-emerald-50/30 border-emerald-200 text-emerald-950",
        icon: "text-emerald-600 bg-emerald-100",
        label: "text-emerald-700",
      },
      important: {
        bg: "from-violet-50 to-violet-50/30 border-violet-200 text-violet-950",
        icon: "text-violet-600 bg-violet-100",
        label: "text-violet-700",
      },
      warning: {
        bg: "from-amber-50 to-amber-50/30 border-amber-200 text-amber-950",
        icon: "text-amber-600 bg-amber-100",
        label: "text-amber-700",
      },
      caution: {
        bg: "from-red-50 to-red-50/30 border-red-200 text-red-950",
        icon: "text-red-600 bg-red-100",
        label: "text-red-700",
      },
    };
    const p = palette[kind];
    return (
      <aside
        className={`flex gap-3 rounded-xl border bg-gradient-to-br px-4 py-3 ${p.bg}`}
        role="note"
      >
        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${p.icon}`}>
          <AlertIcon kind={kind} />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-[11px] font-semibold uppercase tracking-widest ${p.label}`}>
            {kind}
          </div>
          <div className="mt-0.5 text-sm leading-6">{children}</div>
        </div>
      </aside>
    );
  },
  toMarkdown: ({ kind, children }, ctx) => ({
    type: "blockquote",
    data: { gfmAlert: kind },
    children: ctx.walk(children) as never,
  }),
});

export interface CodeBlockProps {
  language?: string;
  meta?: string;
  children: ReactNode;
}
export const CodeBlock = defineDualComponent<CodeBlockProps>({
  name: "code-block",
  render: ({ language, children }) => (
    <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-100">
      <code className={language ? `language-${language}` : undefined}>{asText(children)}</code>
    </pre>
  ),
  toMarkdown: ({ language, meta, children }) => ({
    type: "code",
    lang: language ?? null,
    meta: meta ?? null,
    value: asText(children),
  } as MdNode),
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
  tool?: string;
  page?: number;
  of?: number;
  size?: number;
  total?: number;
  sort?: string;
  /**
   * ADR 0015 §6 ("summary") + ADR 0022 §4 ("payload"). Mutually exclusive single enum.
   * - "summary": visible head N rows + footer "View all N rows" link when rows.length < total.
   * - "payload": visible head `payloadHead` rows + fenced ` ```readable-ui:data ` JSONL of full rows
   *   (or `payload` prop when split-source) inside the `:::table{...}` directive container.
   */
  mode?: "summary" | "payload";
  filter?: Record<string, string | number | boolean>;
  /** ADR 0020 §4: set to "silent" to suppress the auto-injected fallback Alert when rows is empty */
  empty?: "silent";
  /**
   * ADR 0022 §2: explicit full-row source for `mode="payload"` JSONL output.
   * When omitted in payload mode, `rows` itself is used as the payload source
   * (i.e. `rows` is both the visible-head source and the full payload).
   * Keys must match `columns[].key ∪ {"id"}` exactly — drift throws at toMarkdown.
   */
  payload?: R[];
  /**
   * ADR 0022 §4: number of head rows kept in the visible GFM pipe table when `mode="payload"`.
   * Default 5. `0` is allowed (payload-only output, no visible preview rows).
   */
  payloadHead?: number;
}

type AnyRow = { id: string | number; [k: string]: unknown };

function parseSort(sort: string | undefined): { key: string; dir: "asc" | "desc" } | null {
  if (!sort) return null;
  const idx = sort.indexOf(":");
  if (idx < 0) return { key: sort, dir: "asc" };
  const key = sort.slice(0, idx);
  const dir = sort.slice(idx + 1).toLowerCase();
  if (dir !== "asc" && dir !== "desc") return { key, dir: "asc" };
  return { key, dir };
}

function mergeFilterIntoParams(
  base: Record<string, string | number | boolean>,
  filter: Record<string, string | number | boolean> | undefined
): Record<string, string | number | boolean> {
  if (!filter) return base;
  const out = { ...base };
  for (const [k, v] of Object.entries(filter)) {
    out[`_filter_${k}`] = v;
  }
  return out;
}

const DEFAULT_PAYLOAD_HEAD = 5;

const TableImpl = defineDualComponent<TableProps<AnyRow>>({
  name: "table",
  render: ({
    columns,
    rows,
    actions = [],
    showIdColumn = true,
    caption,
    tool,
    page,
    of,
    size,
    total,
    sort,
    mode,
    filter,
    payloadHead,
  }) => {
    // ADR 0022 §5: HTML render is unaffected by payload mode — full rows are still
    // shown as a regular table. The fenced JSONL only appears in .md output.
    // We do honour `payloadHead` for visual head trimming when explicitly opted in.
    const visibleRows =
      mode === "payload"
        ? rows.slice(0, payloadHead ?? DEFAULT_PAYLOAD_HEAD)
        : rows;
    const parsedSort = parseSort(sort);
    const filterEntries = filter ? Object.entries(filter) : [];
    const sortLinkForCol = (colKey: string): string | null => {
      if (!tool) return null;
      const currentDir = parsedSort?.key === colKey ? parsedSort.dir : null;
      const nextDir: "asc" | "desc" = currentDir === "asc" ? "desc" : "asc";
      const params = mergeFilterIntoParams(
        {
          _page: 1,
          ...(size != null ? { _size: size } : {}),
          _sort: `${colKey}:${nextDir}`,
        },
        filter
      );
      return buildActionURI(tool, params);
    };
    const pageLinkFor = (targetPage: number): string | null => {
      if (!tool) return null;
      const params = mergeFilterIntoParams(
        {
          _page: targetPage,
          ...(size != null ? { _size: size } : {}),
          ...(sort ? { _sort: sort } : {}),
        },
        filter
      );
      return buildActionURI(tool, params);
    };
    const showSummaryFooter =
      mode === "summary" && tool && typeof total === "number" && rows.length < total;
    const summaryFooterUrl = showSummaryFooter
      ? buildActionURI(tool, {
          _page: 1,
          _size: total as number,
          ...(sort ? { _sort: sort } : {}),
        })
      : null;

    return (
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.12)]">
        {caption ? (
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500"
            />
            <div className="text-sm font-semibold text-slate-800">{caption}</div>
            {typeof total === "number" ? (
              <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">
                {total.toLocaleString()} total
              </span>
            ) : null}
          </div>
        ) : null}
        {filterEntries.length ? (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 bg-white px-5 py-2.5 text-xs">
            <span className="font-medium text-slate-500">Filter</span>
            {filterEntries.map(([k, v]) => (
              <span
                key={k}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-700"
              >
                <span className="text-slate-400">{k}</span>
                <span className="text-slate-300">·</span>
                <span className="font-medium">{String(v)}</span>
              </span>
            ))}
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-600">
                {showIdColumn ? (
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider">
                    id
                  </th>
                ) : null}
                {columns.map((c) => {
                  const url = sortLinkForCol(c.key);
                  const isActive = parsedSort?.key === c.key;
                  const indicator = isActive ? (parsedSort!.dir === "asc" ? " ▲" : " ▼") : "";
                  const alignCls =
                    c.align === "right"
                      ? "text-right"
                      : c.align === "center"
                        ? "text-center"
                        : "text-left";
                  return (
                    <th
                      key={c.key}
                      className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wider ${alignCls}`}
                    >
                      {url ? (
                        <a
                          href={url}
                          data-sort={c.key}
                          className={`inline-flex items-center gap-1 rounded transition-colors hover:text-slate-900 ${
                            isActive ? "text-blue-700" : ""
                          }`}
                        >
                          {c.label}
                          {indicator}
                        </a>
                      ) : (
                        <>
                          {c.label}
                          {indicator}
                        </>
                      )}
                    </th>
                  );
                })}
                {actions.length ? (
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider">
                    Actions
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleRows.map((r, idx) => (
                <tr
                  key={String(r.id)}
                  data-rui-id={String(r.id)}
                  className={`group transition-colors hover:bg-blue-50/40 ${idx % 2 === 1 ? "bg-slate-50/30" : ""}`}
                >
                  {showIdColumn ? (
                    <td className="px-5 py-3">
                      <span className="font-mono text-[11px] text-slate-400">
                        {String(r.id)}
                      </span>
                    </td>
                  ) : null}
                  {columns.map((c) => {
                    const alignCls =
                      c.align === "right"
                        ? "text-right"
                        : c.align === "center"
                          ? "text-center"
                          : "text-left";
                    return (
                      <td
                        key={c.key}
                        className={`px-5 py-3 text-slate-800 ${alignCls}`}
                      >
                        {String(r[c.key] ?? "")}
                      </td>
                    );
                  })}
                  {actions.length ? (
                    <td className="px-5 py-3 text-right">
                      <span className="inline-flex gap-3 opacity-80 transition-opacity group-hover:opacity-100">
                        {actions.map((a) => {
                          const color =
                            a.variant === "danger"
                              ? "text-red-600 hover:text-red-700"
                              : a.variant === "secondary"
                                ? "text-slate-600 hover:text-slate-800"
                                : "text-blue-600 hover:text-blue-800";
                          const url = buildActionURI(a.tool, a.params(r));
                          return (
                            <a
                              key={a.tool}
                              href={url}
                              data-action={a.tool}
                              className={`text-xs font-medium underline-offset-2 hover:underline ${color}`}
                            >
                              {a.label}
                            </a>
                          );
                        })}
                      </span>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(typeof page === "number" && typeof of === "number" && of > 1) ||
        showSummaryFooter ? (
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/40 px-5 py-3 text-xs text-slate-600">
            <div>
              {typeof page === "number" && typeof of === "number" ? (
                <>
                  Page <span className="font-semibold text-slate-800">{page}</span> of{" "}
                  <span className="font-semibold text-slate-800">{of}</span>
                  {typeof total === "number" ? (
                    <span className="text-slate-400"> · {total.toLocaleString()} rows</span>
                  ) : null}
                </>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              {typeof page === "number" && page > 1 && pageLinkFor(page - 1) ? (
                <a
                  href={pageLinkFor(page - 1) as string}
                  data-page={page - 1}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-blue-600 hover:bg-blue-50"
                >
                  ← Prev
                </a>
              ) : null}
              {typeof page === "number" && typeof of === "number" && page < of && pageLinkFor(page + 1) ? (
                <a
                  href={pageLinkFor(page + 1) as string}
                  data-page={page + 1}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-blue-600 hover:bg-blue-50"
                >
                  Next →
                </a>
              ) : null}
              {summaryFooterUrl ? (
                <a
                  href={summaryFooterUrl}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-blue-600 hover:bg-blue-50"
                >
                  View all {total} rows
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    );
  },
  toMarkdown: (
    {
      columns,
      rows,
      actions = [],
      showIdColumn = true,
      caption,
      tool,
      page,
      of,
      size,
      total,
      sort,
      mode,
      filter,
      empty,
      payload,
      payloadHead,
    },
    ctx
  ) => {
    if (tool) ctx.registerAction(tool);
    for (const a of actions) ctx.registerAction(a.tool);

    // ADR 0022 §4: payload mode trims the visible GFM table to head N rows.
    // The full payload (or `payload` prop when split-source) is emitted as a
    // fenced ```readable-ui:data``` JSONL child of the directive container.
    const visibleRowsForMd =
      mode === "payload"
        ? rows.slice(0, payloadHead ?? DEFAULT_PAYLOAD_HEAD)
        : rows;

    // ADR 0020 §3: collect enum sets for auto CodeSpan wrap
    // Condition (a): _filter_<col>.enum from the tool's input schema
    // Condition (b): output schema enum for the column key
    // Condition (c): tool names in the envelope (for action columns like audit.action)
    const colEnums = new Map<string, Set<string>>();
    const toolNames = new Set<string>(
      (ctx.envelope?.tools ?? []).map((t) => t.name)
    );
    if (tool && ctx.envelope?.tools) {
      const toolDef = ctx.envelope.tools.find((t) => t.name === tool);
      if (toolDef) {
        // Condition (a): _filter_<col>.enum
        if (toolDef.input?.properties) {
          for (const [paramKey, paramSchema] of Object.entries(toolDef.input.properties)) {
            const match = /^_filter_(.+)$/.exec(paramKey);
            if (match && match[1] && Array.isArray((paramSchema as { enum?: unknown[] }).enum)) {
              const colKey: string = match[1];
              const enumVals = new Set<string>(
                ((paramSchema as { enum: unknown[] }).enum).map(String)
              );
              colEnums.set(colKey, enumVals);
            }
          }
        }
        // Condition (b): output schema enum per column
        if (toolDef.output?.properties) {
          for (const [colKey, colSchema] of Object.entries(toolDef.output.properties)) {
            if (Array.isArray((colSchema as { enum?: unknown[] }).enum)) {
              const existing = colEnums.get(colKey) ?? new Set<string>();
              for (const v of (colSchema as { enum: unknown[] }).enum) {
                existing.add(String(v));
              }
              colEnums.set(colKey, existing);
            }
          }
        }
      }
    }

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

    const bodyRows: MdNode[] = visibleRowsForMd.map((r) => {
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
          ...columns.map((c) => {
            const rawVal = String(r[c.key] ?? "");
            // ADR 0020 §3: auto-wrap cell value in inlineCode if it matches an enum
            // from the tool's input filter schema (a), output schema (b), or a tool name (c).
            const colEnum = colEnums.get(String(c.key));
            const shouldWrap =
              rawVal !== "" &&
              ((colEnum && colEnum.has(rawVal)) || toolNames.has(rawVal));
            const cellChild: MdNode = shouldWrap
              ? ({ type: "inlineCode", value: rawVal } as MdNode)
              : ({ type: "text", value: rawVal } as MdNode);
            return {
              type: "tableCell",
              children: [cellChild] as never,
            } as MdNode;
          }),
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

    const innerTable: MdNode = {
      type: "table",
      align,
      children: [headerRow, ...bodyRows] as never,
    };

    const attrs: Record<string, string> = {};
    if (tool) attrs.tool = tool;
    if (page != null) attrs.page = String(page);
    if (of != null) attrs.of = String(of);
    if (size != null) attrs.size = String(size);
    if (total != null) attrs.total = String(total);
    if (sort) attrs.sort = sort;
    if (mode) attrs.mode = mode;
    if (caption) attrs.caption = caption;
    if (filter) {
      for (const [k, v] of Object.entries(filter)) {
        attrs[`filter-${k}`] = String(v);
      }
    }

    const childrenNodes: MdNode[] = [innerTable];

    // ADR 0022 §3: in payload mode, append a fenced `readable-ui:data` JSONL block
    // as a child of the `:::table{...}` directive container. The JSONL source is
    // `payload ?? rows`. Schema drift (missing/extra keys, non-primitive values)
    // throws inside `serializeJsonlPayload`.
    if (mode === "payload") {
      const payloadSource = (payload ?? rows) as Record<string, unknown>[];
      const keys = [
        "id",
        ...columns.map((c) => String(c.key)).filter((k) => k !== "id"),
      ];
      const value = serializeJsonlPayload(payloadSource, keys);
      childrenNodes.push({
        type: "code",
        lang: "readable-ui:data",
        meta: null,
        value,
      } as MdNode);
    }

    if (mode === "summary" && tool && typeof total === "number" && rows.length < total) {
      const summaryUrl = buildActionURI(tool, {
        _page: 1,
        _size: total,
        ...(sort ? { _sort: sort } : {}),
      });
      childrenNodes.push({
        type: "paragraph",
        children: [
          {
            type: "link",
            url: summaryUrl,
            children: [
              { type: "text", value: `View all ${total} rows` } as MdNode,
            ] as never,
          } as MdNode,
        ] as never,
      });
    }

    const tableNode: MdNode = {
      type: "containerDirective",
      name: "table",
      attributes: attrs,
      children: childrenNodes as never,
    };

    // ADR 0020 §4: EmptyState fallback — when rows is empty and no explicit opt-out,
    // emit a sibling Alert(kind=note, "No results") after the table directive.
    // The blockquote uses the same gfmAlert marker as Alert.toMarkdown — gfmAlertHandler
    // will prepend "> [!NOTE]" and render the children as the body.
    if (rows.length === 0 && empty !== "silent") {
      const fallbackAlert: MdNode = {
        type: "blockquote",
        data: { gfmAlert: "note" } as never,
        children: [
          {
            type: "paragraph",
            children: [{ type: "text", value: "No results." } as MdNode] as never,
          } as MdNode,
        ] as never,
      };
      return [tableNode, fallbackAlert];
    }

    return tableNode;
  },
});

export function Table<R extends { id: string | number }>(props: TableProps<R>): ReactNode {
  return TableImpl(props as unknown as TableProps<AnyRow>);
}
Table.spec = TableImpl.spec;
(Table as unknown as { __readable: true }).__readable = true;
Table.displayName = "table";

// ============================================================================
// ADR 0024 — Admin metric·progress·descriptions·breadcrumb components
// ============================================================================

export interface StatProps {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "flat";
  unit?: string;
}
export const Stat = defineDualComponent<StatProps>({
  name: "stat",
  render: ({ label, value, delta, trend, unit }) => {
    const trendColor =
      trend === "up"
        ? "text-emerald-600 bg-emerald-50"
        : trend === "down"
          ? "text-red-600 bg-red-50"
          : trend === "flat"
            ? "text-slate-500 bg-slate-100"
            : "text-slate-500 bg-slate-50";
    const trendGlyph =
      trend === "up" ? "\u25B2" : trend === "down" ? "\u25BC" : trend === "flat" ? "\u2014" : null;
    return (
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.12)]">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300/60 to-transparent"
        />
        <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          {label}
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <div className="text-3xl font-bold tracking-tight text-slate-900">{value}</div>
          {unit ? <div className="text-xs text-slate-400">{unit}</div> : null}
        </div>
        {delta || trendGlyph ? (
          <div className="mt-2 inline-flex items-center gap-1 text-xs">
            {trendGlyph ? (
              <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${trendColor}`}>
                {trendGlyph}
              </span>
            ) : null}
            {delta ? (
              <span className={trend === "up" ? "text-emerald-700" : trend === "down" ? "text-red-700" : "text-slate-600"}>
                {delta}
              </span>
            ) : null}
          </div>
        ) : null}
      </section>
    );
  },
  toMarkdown: ({ label, value, delta, trend, unit }, ctx) => {
    // ADR 0024 §1: leaf directive with value in the body + fallback paragraph.
    const attrs: Record<string, string> = { label };
    if (delta) attrs.delta = delta;
    if (trend) attrs.trend = trend;
    if (unit) attrs.unit = unit;
    const directive: MdNode = {
      type: "leafDirective",
      name: "stat",
      attributes: attrs,
      children: [{ type: "text", value } as MdNode] as never,
    };
    // Fallback paragraph: "**value** · delta (label)" (delta optional; unit replaces parens content when present).
    const parensText = unit ? unit : label;
    const paraChildren: MdNode[] = [
      { type: "strong", children: [{ type: "text", value } as MdNode] as never } as MdNode,
    ];
    if (delta) {
      paraChildren.push({ type: "text", value: ` \u00B7 ${delta}` } as MdNode);
    }
    paraChildren.push({ type: "text", value: ` (${parensText})` } as MdNode);
    const fallbackPara: MdNode = {
      type: "paragraph",
      children: paraChildren as never,
    };
    if (ctx.fallback === "off") return directive;
    if (ctx.fallback === "link-only") return fallbackPara;
    return [directive, fallbackPara];
  },
});

export interface ProgressProps {
  value: number;
  max?: number;
  label?: string;
  variant?: "primary" | "success" | "warning" | "danger";
}
export const Progress = defineDualComponent<ProgressProps>({
  name: "progress",
  render: ({ value, max = 100, label, variant = "primary" }) => {
    const clamped = Math.max(0, Math.min(value, max));
    const pct = max > 0 ? (clamped / max) * 100 : 0;
    const barColor =
      variant === "success"
        ? "from-emerald-400 to-emerald-500"
        : variant === "warning"
          ? "from-amber-400 to-amber-500"
          : variant === "danger"
            ? "from-red-400 to-red-500"
            : "from-blue-400 to-blue-500";
    const labelColor =
      variant === "success"
        ? "text-emerald-700"
        : variant === "warning"
          ? "text-amber-700"
          : variant === "danger"
            ? "text-red-700"
            : "text-slate-700";
    return (
      <div className="space-y-1.5">
        {label ? (
          <div className="flex items-baseline justify-between text-xs">
            <span className={`font-medium ${labelColor}`}>{label}</span>
            <span className="tabular-nums text-slate-500">
              {value} / {max}
            </span>
          </div>
        ) : null}
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        >
          <div
            className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-[width] duration-300`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  },
  toMarkdown: ({ value, max = 100, label, variant }, ctx) => {
    const attrs: Record<string, string> = {
      value: String(value),
      max: String(max),
    };
    if (label) attrs.label = label;
    if (variant && variant !== "primary") attrs.variant = variant;
    const directive: MdNode = {
      type: "leafDirective",
      name: "progress",
      attributes: attrs,
      children: [] as never,
    };
    // Fallback paragraph: "<value> / <max> (<percent>%) — <label>"
    const pct = max > 0 ? Math.round((Math.max(0, Math.min(value, max)) / max) * 100) : 0;
    const base = `${value} / ${max} (${pct}%)`;
    const text = label ? `${base} \u2014 ${label}` : base;
    const fallbackPara: MdNode = {
      type: "paragraph",
      children: [{ type: "text", value: text } as MdNode] as never,
    };
    if (ctx.fallback === "off") return directive;
    if (ctx.fallback === "link-only") return fallbackPara;
    return [directive, fallbackPara];
  },
});

// ADR 0024 §3: Descriptions — JSX convenience wrapper around the ADR 0018 Card+List idiom.
// Not registered as a dual component; renders as Card > List > ListItem > Strong + value
// so Markdown output matches ADR 0018 정규형 verbatim and no new directive name is added.
// HTML render inherits Card styling — the visual 2-column grid variant is v2.
export interface DescriptionsItem {
  term: string;
  value: ReactNode;
}
export interface DescriptionsProps {
  title?: string;
  items: DescriptionsItem[];
}

export function Descriptions({ title, items }: DescriptionsProps): ReactNode {
  return (
    <Card {...(title !== undefined ? { title } : {})}>
      <List>
        {items.map((item, idx) => {
          const empty = item.value == null || item.value === "" || item.value === false;
          return (
            <ListItem key={`${item.term}-${idx}`}>
              <Strong>{item.term}</Strong>
              {": "}
              {empty ? <Emphasis>none</Emphasis> : item.value}
            </ListItem>
          );
        })}
      </List>
    </Card>
  );
}
