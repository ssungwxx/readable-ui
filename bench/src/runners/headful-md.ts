// headful-md runner: AX tree → Markdown via heuristic converter.
// Spec: bench/docs/metrics.md §5.
//
// Reuses the AX snapshot produced by the ax-tree runner through PageAxSnapshotCache
// (spec §4), so `renderTimeMs` excludes snapshot time — only the transform is measured.

import type { BenchScenario, Runner, RunnerResult } from "../types.js";
import type { PageAxSnapshotCache, AxNode } from "../lib/ax-cache.js";
import { sizeMetrics } from "../lib/metrics.js";
import { axToMarkdown } from "../lib/ax-to-md.js";

export interface HeadfulMdRunnerOptions {
  cache: PageAxSnapshotCache;
}

export default class HeadfulMdRunner implements Runner {
  readonly id = "headful-md" as const;
  private readonly cache: PageAxSnapshotCache;

  constructor(opts: HeadfulMdRunnerOptions) {
    this.cache = opts.cache;
  }

  async run(scenario: BenchScenario): Promise<RunnerResult> {
    const cached = this.cache.get(scenario.url);
    if (!cached) {
      throw new Error(
        `headful-md requires a cached AX snapshot for ${scenario.url}. ` +
          `Run AxTreeRunner first or invoke runners with a shared PageAxSnapshotCache.`,
      );
    }

    const t0 = performance.now();
    const output = axToMarkdown(cached.root);
    const t1 = performance.now();

    const size = sizeMetrics(output);
    return {
      runnerId: this.id,
      scenarioId: scenario.id,
      output,
      bytes: size.bytes,
      chars: size.chars,
      tokens: size.tokens,
      renderTimeMs: t1 - t0,
      actionableElementCount: countHeadfulMdActions(output),
    };
  }
}

// Count `[text](url)` links + `- label: ___` inputs + `[label]` buttons per spec §3.1.
function countHeadfulMdActions(md: string): number {
  let count = 0;
  count += (md.match(/\[[^\]]+\]\([^)]+\)/g) ?? []).length; // links
  count += (md.match(/^- .+?: ___/gm) ?? []).length; // textbox/combobox rows
  // buttons: `[label]` on its own line, without a following `(...)` (i.e. not a link).
  const btnLines = md.match(/^\[[^\]]+\](?!\()/gm) ?? [];
  count += btnLines.length;
  return count;
}

export type { AxNode };
