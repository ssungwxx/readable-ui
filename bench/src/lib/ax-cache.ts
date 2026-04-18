// Per-URL cache for Chromium DevTools accessibility snapshots.
// Spec: bench/docs/metrics.md §4.3 — ax-tree and headful-md share a single AX snapshot
// per page visit to guarantee identical input DOM state across runners.

// Playwright 1.51 removed `page.accessibility.snapshot`, so we call the raw
// DevTools Protocol `Accessibility.getFullAXTree` via a CDPSession and keep
// our own node shape instead of importing from playwright.
export interface AxNodeValue {
  type?: string;
  value?: string | number | boolean | null;
}

export interface AxProperty {
  name: string;
  value?: AxNodeValue;
}

export interface AxNode {
  nodeId: string;
  role?: AxNodeValue;
  name?: AxNodeValue;
  value?: AxNodeValue;
  description?: AxNodeValue;
  properties?: AxProperty[];
  parentId?: string;
  childIds?: string[];
  backendDOMNodeId?: number;
  ignored?: boolean;
  // Populated by our tree-builder after flattening the CDP response.
  children?: AxNode[];
}

export interface CachedAxSnapshot {
  root: AxNode | null;
  snapshotMs: number;
}

export class PageAxSnapshotCache {
  private readonly cache = new Map<string, CachedAxSnapshot>();

  get(url: string): CachedAxSnapshot | undefined {
    return this.cache.get(url);
  }

  set(url: string, entry: CachedAxSnapshot): void {
    this.cache.set(url, entry);
  }

  clear(): void {
    this.cache.clear();
  }
}

// CDP returns a flat list of nodes; reconstruct the tree rooted at the node
// that has no parent.
export function buildAxTree(nodes: AxNode[]): AxNode | null {
  if (nodes.length === 0) return null;
  const byId = new Map<string, AxNode>();
  for (const n of nodes) {
    byId.set(n.nodeId, { ...n, children: [] });
  }
  let root: AxNode | null = null;
  for (const n of nodes) {
    const self = byId.get(n.nodeId);
    if (!self) continue;
    if (!n.parentId || !byId.has(n.parentId)) {
      root = self;
      continue;
    }
    byId.get(n.parentId)!.children!.push(self);
  }
  return root ?? byId.values().next().value ?? null;
}

// ---------------------------------------------------------------------------
// ax-tree snapshot normalization
//
// Chromium re-issues `nodeId` / `backendDOMNodeId` / `frameId` every run, so
// raw serialization of the AX tree is not byte-equal across reruns of the same
// page. We replace these volatile CDP identifiers with stable placeholders
// (`<id-N>`, `<backend-N>`, `<frame-N>`) assigned in first-seen walk order.
// Cross-field references (parentId, childIds[]) are mapped through the same
// table so a node referenced by multiple fields ends up with the same
// placeholder everywhere.
//
// This is applied only for the ax-tree runner's serialized output — the cached
// tree shared with headful-md keeps the original identifiers so the markdown
// converter's nodeId-keyed resolvers are unaffected (ADR 0023 amendment 2026-04-18).
// Token/byte/char metrics on the ax-tree runner are computed *after*
// normalization (spec §3 uses the normalized output as the metric input).

interface VolatileIdTables {
  nodeIds: Map<string, string>;
  backendIds: Map<number, string>;
  frameIds: Map<string, string>;
}

function newTables(): VolatileIdTables {
  return {
    nodeIds: new Map(),
    backendIds: new Map(),
    frameIds: new Map(),
  };
}

function assignNodeId(
  raw: string,
  tables: VolatileIdTables,
): string {
  const existing = tables.nodeIds.get(raw);
  if (existing !== undefined) return existing;
  const placeholder = `<id-${tables.nodeIds.size + 1}>`;
  tables.nodeIds.set(raw, placeholder);
  return placeholder;
}

function assignBackendId(
  raw: number,
  tables: VolatileIdTables,
): string {
  const existing = tables.backendIds.get(raw);
  if (existing !== undefined) return existing;
  const placeholder = `<backend-${tables.backendIds.size + 1}>`;
  tables.backendIds.set(raw, placeholder);
  return placeholder;
}

function assignFrameId(
  raw: string,
  tables: VolatileIdTables,
): string {
  const existing = tables.frameIds.get(raw);
  if (existing !== undefined) return existing;
  const placeholder = `<frame-${tables.frameIds.size + 1}>`;
  tables.frameIds.set(raw, placeholder);
  return placeholder;
}

// Pre-register AX-node nodeIds in DFS order so placeholder numbers track
// tree structure (first root, then its children left-to-right). If we did this
// on demand during the generic deep walk, the order would depend on JSON key
// traversal — which is deterministic but harder to reason about. Doing it
// explicitly keeps `<id-1>` as the root.
function preregisterNodeIds(node: AxNode, tables: VolatileIdTables): void {
  assignNodeId(node.nodeId, tables);
  for (const child of node.children ?? []) {
    preregisterNodeIds(child, tables);
  }
}

// Keys whose string values are node-id references (shared namespace with nodeId).
const NODE_ID_KEYS = new Set<string>(["nodeId", "parentId"]);
// Array-of-strings where each element is a node-id reference.
const NODE_ID_ARRAY_KEYS = new Set<string>(["childIds"]);
// Numeric volatile identifiers keyed on a separate backend namespace.
const BACKEND_ID_KEYS = new Set<string>(["backendDOMNodeId"]);
// Per-page frame identifier.
const FRAME_ID_KEYS = new Set<string>(["frameId"]);

// Recursively deep-clone a JSON-safe value while rewriting any volatile
// identifier field (at any nesting depth) to its placeholder. CDP embeds
// extra `backendDOMNodeId` references inside `name.sources[*].nativeSourceValue.relatedNodes`
// and `properties[*].value.relatedNodes`, so we must walk all descendants
// rather than only the top-level node shape (spec §4.7).
function normalizeValue(
  value: unknown,
  tables: VolatileIdTables,
): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((v) => normalizeValue(v, tables));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (NODE_ID_KEYS.has(k) && typeof v === "string") {
        out[k] = assignNodeId(v, tables);
      } else if (NODE_ID_ARRAY_KEYS.has(k) && Array.isArray(v)) {
        out[k] = v.map((id) =>
          typeof id === "string" ? assignNodeId(id, tables) : id,
        );
      } else if (BACKEND_ID_KEYS.has(k) && typeof v === "number") {
        out[k] = assignBackendId(v, tables);
      } else if (FRAME_ID_KEYS.has(k) && typeof v === "string") {
        out[k] = assignFrameId(v, tables);
      } else {
        out[k] = normalizeValue(v, tables);
      }
    }
    return out;
  }
  return value;
}

// Returns a deep-cloned tree where all volatile CDP identifiers
// (nodeId / parentId / childIds[] / backendDOMNodeId / frameId) are replaced
// by deterministic placeholders in first-seen order. The original tree is not
// mutated.
//
// Pass 1: Pre-register nodeIds in DFS order so `<id-1>` is always the root and
//         placeholders track structural position.
// Pass 2: Deep-walk the entire JSON structure. Any volatile id reached during
//         this walk is rewritten — this includes nested hits inside
//         `name.sources[].nativeSourceValue.relatedNodes` and
//         `properties[].value.relatedNodes` (CDP embeds DOM back-references
//         there for the AX accessible-name algorithm). backendDOMNodeId
//         placeholders are assigned in deep-walk encounter order, which is
//         deterministic for a fixed input.
export function normalizeVolatileIds(root: AxNode | null): AxNode | null {
  if (!root) return null;
  const tables = newTables();
  preregisterNodeIds(root, tables);
  return normalizeValue(root, tables) as AxNode;
}
