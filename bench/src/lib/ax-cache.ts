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
