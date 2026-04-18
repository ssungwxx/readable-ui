// Heuristic AX tree → Markdown converter.
// Spec: bench/docs/metrics.md §5.
//
// Deliberately minimal: roles that aren't in the switch fall through and emit
// their children inline. The goal is not a full accessibility serializer but
// an honest "what does an agent get if you dump the AX tree as markdown"
// baseline.

import type { AxNode, AxNodeValue } from "./ax-cache.js";

export interface AxToMdOptions {
  hrefResolver?: (nodeId: string) => string | undefined;
}

interface Ctx {
  out: string[];
  hrefResolver: (id: string) => string | undefined;
}

const LANDMARK_ROLES = new Set<string>([
  "navigation",
  "region",
  "banner",
  "main",
  "contentinfo",
  "complementary",
]);

export function axToMarkdown(root: AxNode | null, opts: AxToMdOptions = {}): string {
  if (!root) return "";
  const ctx: Ctx = {
    out: [],
    hrefResolver: opts.hrefResolver ?? (() => undefined),
  };
  walkBlock(root, ctx, 0);
  return ctx.out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

function valueOf(v: AxNodeValue | undefined): string | undefined {
  if (!v) return undefined;
  const raw = v.value;
  if (raw === undefined || raw === null) return undefined;
  const s = String(raw).trim();
  return s.length > 0 ? s : undefined;
}

function prop(node: AxNode, name: string): AxNodeValue | undefined {
  return node.properties?.find((p) => p.name === name)?.value;
}

function isDisabled(node: AxNode): boolean {
  return prop(node, "disabled")?.value === true;
}

function roleOf(node: AxNode): string | undefined {
  return valueOf(node.role);
}

function nameOf(node: AxNode): string | undefined {
  return valueOf(node.name);
}

function inlineChildren(node: AxNode, ctx: Ctx): string {
  const parts: string[] = [];
  for (const child of node.children ?? []) {
    parts.push(walkInline(child, ctx));
  }
  return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function walkInline(node: AxNode, ctx: Ctx): string {
  const role = roleOf(node);
  const name = nameOf(node);

  switch (role) {
    case "text":
    case "StaticText":
    case "paragraph":
    case "generic":
    case "none":
    case "presentation":
      return name ?? inlineChildren(node, ctx);
    case "link": {
      const label = name ?? (inlineChildren(node, ctx) || "link");
      const href = ctx.hrefResolver(node.nodeId);
      return href ? `[${label}](${href})` : label;
    }
    case "button": {
      const label = name ?? (inlineChildren(node, ctx) || "button");
      return isDisabled(node) ? `~~[${label}]~~` : `[${label}]`;
    }
    case "img": {
      const alt = name ?? "";
      const href = ctx.hrefResolver(node.nodeId) ?? "";
      return `![${alt}](${href})`;
    }
    default:
      return name ?? inlineChildren(node, ctx);
  }
}

function emitBlock(ctx: Ctx, line: string): void {
  if (line.length === 0) return;
  if (ctx.out.length > 0 && ctx.out[ctx.out.length - 1] !== "") {
    ctx.out.push("");
  }
  ctx.out.push(line);
}

function walkBlock(node: AxNode, ctx: Ctx, depth: number): void {
  const role = roleOf(node);
  const name = nameOf(node);

  if (role === "WebArea") {
    for (const child of node.children ?? []) walkBlock(child, ctx, depth);
    return;
  }

  if (role === "heading") {
    const levelRaw = prop(node, "level")?.value;
    const level = typeof levelRaw === "number" ? Math.max(1, Math.min(6, levelRaw)) : 2;
    const label = name ?? inlineChildren(node, ctx);
    if (label) emitBlock(ctx, `${"#".repeat(level)} ${label}`);
    return;
  }

  if (role && LANDMARK_ROLES.has(role)) {
    const label = name ?? role;
    emitBlock(ctx, `## ${label}`);
    for (const child of node.children ?? []) walkBlock(child, ctx, depth + 1);
    return;
  }

  if (role === "list" || role === "menu") {
    const items: string[] = [];
    for (const child of node.children ?? []) {
      const childRole = roleOf(child);
      if (childRole === "listitem" || childRole === "menuitem") {
        const inline = nameOf(child) ?? inlineChildren(child, ctx);
        if (inline) items.push(`- ${inline}`);
      } else {
        const inline = walkInline(child, ctx);
        if (inline) items.push(`- ${inline}`);
      }
    }
    if (items.length > 0) emitBlock(ctx, items.join("\n"));
    return;
  }

  if (role === "table") {
    const rows: AxNode[] = [];
    collect(node, "row", rows);
    if (rows.length > 0) {
      const table = renderTable(rows, ctx);
      if (table) emitBlock(ctx, table);
    }
    return;
  }

  if (role === "button") {
    const label = name ?? (inlineChildren(node, ctx) || "button");
    emitBlock(ctx, isDisabled(node) ? `~~[${label}]~~` : `[${label}]`);
    return;
  }

  if (role === "link") {
    const label = name ?? (inlineChildren(node, ctx) || "link");
    const href = ctx.hrefResolver(node.nodeId);
    emitBlock(ctx, href ? `[${label}](${href})` : label);
    return;
  }

  if (role === "textbox" || role === "combobox" || role === "searchbox") {
    const label = name ?? "input";
    const v = valueOf(node.value);
    emitBlock(ctx, v ? `- ${label}: ___${v}___` : `- ${label}: ___`);
    return;
  }

  if (role === "checkbox") {
    const checked = prop(node, "checked")?.value === true;
    emitBlock(ctx, `- [${checked ? "x" : " "}] ${name ?? ""}`.trimEnd());
    return;
  }

  if (role === "radio") {
    const checked = prop(node, "checked")?.value === true;
    emitBlock(ctx, `- (${checked ? "x" : " "}) ${name ?? ""}`.trimEnd());
    return;
  }

  if (role === "img") {
    const alt = name ?? "";
    const href = ctx.hrefResolver(node.nodeId) ?? "";
    emitBlock(ctx, `![${alt}](${href})`);
    return;
  }

  if (role === "separator") {
    emitBlock(ctx, "---");
    return;
  }

  if (role === "paragraph" || role === "StaticText" || role === "text") {
    const label = name ?? inlineChildren(node, ctx);
    if (label) emitBlock(ctx, label);
    return;
  }

  // Unknown role — just recurse.
  for (const child of node.children ?? []) walkBlock(child, ctx, depth);
}

function collect(node: AxNode, role: string, into: AxNode[]): void {
  if (roleOf(node) === role) into.push(node);
  for (const child of node.children ?? []) collect(child, role, into);
}

function renderTable(rows: AxNode[], ctx: Ctx): string {
  // First row with columnheader cells becomes the header.
  const headerIdx = rows.findIndex((r) =>
    (r.children ?? []).some((c) => roleOf(c) === "columnheader"),
  );
  const headerRow = headerIdx >= 0 ? rows[headerIdx] : undefined;
  const bodyRows = rows.filter((r, i) => i !== headerIdx);

  const headerCells = headerRow
    ? (headerRow.children ?? []).filter(
        (c) => roleOf(c) === "columnheader" || roleOf(c) === "cell",
      )
    : [];

  const lines: string[] = [];
  if (headerCells.length > 0) {
    const hdr = headerCells.map((c) => nameOf(c) ?? inlineChildren(c, ctx) ?? "");
    lines.push(`| ${hdr.join(" | ")} |`);
    lines.push(`| ${hdr.map(() => "---").join(" | ")} |`);
  }
  for (const row of bodyRows) {
    const cells = (row.children ?? []).filter(
      (c) => roleOf(c) === "cell" || roleOf(c) === "rowheader",
    );
    if (cells.length === 0) continue;
    const text = cells.map((c) => nameOf(c) ?? inlineChildren(c, ctx) ?? "");
    lines.push(`| ${text.join(" | ")} |`);
  }
  return lines.join("\n");
}
