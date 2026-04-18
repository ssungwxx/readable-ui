// readable-ui runner: HTTP-fetches the `.md` route exposed by apps/example.
// Spec: bench/docs/metrics.md §4.2 — HTTP .md endpoint is the approved path.

import type { BenchScenario, Runner, RunnerResult } from "../types.js";
import { countReadableUiActions, sizeMetrics } from "../lib/metrics.js";

export interface ReadableUiRunnerOptions {
  baseUrl: string;
}

export default class ReadableUiRunner implements Runner {
  readonly id = "readable-ui" as const;
  private readonly baseUrl: string;

  constructor(opts: ReadableUiRunnerOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
  }

  async run(scenario: BenchScenario): Promise<RunnerResult> {
    const mdUrl = this.resolveMdUrl(scenario.url);

    const t0 = performance.now();
    const res = await fetch(mdUrl);
    const body = await res.text();
    const t1 = performance.now();

    if (!res.ok) {
      // Spec §4.2: home has no envelope; treat non-200 as "runner does not apply".
      return {
        runnerId: this.id,
        scenarioId: scenario.id,
        output: null,
        bytes: 0,
        chars: 0,
        tokens: 0,
        renderTimeMs: 0,
        actionableElementCount: 0,
      };
    }

    const size = sizeMetrics(body);
    return {
      runnerId: this.id,
      scenarioId: scenario.id,
      output: body,
      bytes: size.bytes,
      chars: size.chars,
      tokens: size.tokens,
      renderTimeMs: t1 - t0,
      actionableElementCount: countReadableUiActions(body),
    };
  }

  private resolveMdUrl(routeUrl: string): string {
    if (routeUrl === "/") return `${this.baseUrl}/.md`;
    const normalized = routeUrl.startsWith("/") ? routeUrl : `/${routeUrl}`;
    return `${this.baseUrl}${normalized}.md`;
  }
}
