// ax-tree runner: Chromium DevTools Protocol Accessibility.getFullAXTree.
// Spec: bench/docs/metrics.md §1 and §4.
//
// Note: Playwright 1.51 removed the public `page.accessibility.snapshot` API,
// so we drive the equivalent tree via a CDPSession. The resulting AXNode shape
// is close to the old one and is more than enough for both runners (spec §5).

import {
  chromium,
  type Browser,
  type BrowserContext,
  type CDPSession,
  type Page,
} from "playwright";

import type { BenchScenario, Runner, RunnerResult } from "../types.js";
import {
  buildAxTree,
  type AxNode,
  type PageAxSnapshotCache,
} from "../lib/ax-cache.js";
import { sizeMetrics } from "../lib/metrics.js";

export interface AxTreeRunnerOptions {
  baseUrl: string;
  cache: PageAxSnapshotCache;
}

// Roles that count as "actionable" for the ax-tree runner (spec §3.1).
const INTERACTIVE_ROLES = new Set<string>([
  "button",
  "link",
  "textbox",
  "combobox",
  "checkbox",
  "radio",
  "menuitem",
  "tab",
  "switch",
]);

export default class AxTreeRunner implements Runner {
  readonly id = "ax-tree" as const;
  private readonly baseUrl: string;
  private readonly cache: PageAxSnapshotCache;
  private browser: Browser | undefined;
  private context: BrowserContext | undefined;
  private page: Page | undefined;
  private cdp: CDPSession | undefined;

  constructor(opts: AxTreeRunnerOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.cache = opts.cache;
  }

  async start(): Promise<void> {
    if (this.browser) return;
    this.browser = await chromium.launch({ headless: true });
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();
    this.cdp = await this.context.newCDPSession(this.page);
    await this.cdp.send("Accessibility.enable");
  }

  async stop(): Promise<void> {
    await this.cdp?.detach().catch(() => {});
    await this.page?.close().catch(() => {});
    await this.context?.close().catch(() => {});
    await this.browser?.close().catch(() => {});
    this.cdp = undefined;
    this.page = undefined;
    this.context = undefined;
    this.browser = undefined;
  }

  async run(scenario: BenchScenario): Promise<RunnerResult> {
    const page = this.page;
    const cdp = this.cdp;
    if (!page || !cdp) {
      throw new Error("AxTreeRunner.start() must be called before run()");
    }

    const fullUrl = `${this.baseUrl}${scenario.url}`;
    await page.goto(fullUrl, { waitUntil: "networkidle" });

    const t0 = performance.now();
    const { nodes } = (await cdp.send("Accessibility.getFullAXTree", {})) as {
      nodes: AxNode[];
    };
    const root = buildAxTree(nodes);
    const output = JSON.stringify(root ?? null, null, 0);
    const t1 = performance.now();
    const snapshotMs = t1 - t0;

    this.cache.set(scenario.url, { root, snapshotMs });

    const size = sizeMetrics(output);
    return {
      runnerId: this.id,
      scenarioId: scenario.id,
      output,
      bytes: size.bytes,
      chars: size.chars,
      tokens: size.tokens,
      renderTimeMs: snapshotMs,
      actionableElementCount: countInteractive(root),
    };
  }
}

function countInteractive(node: AxNode | null): number {
  if (!node) return 0;
  let total = 0;
  const role = typeof node.role?.value === "string" ? node.role.value : undefined;
  if (role && INTERACTIVE_ROLES.has(role)) total += 1;
  for (const child of node.children ?? []) {
    total += countInteractive(child);
  }
  return total;
}
