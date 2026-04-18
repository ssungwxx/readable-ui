// Aggregation + report generation.
// Spec: bench/docs/metrics.md §3.2 — per-scenario table + across-scenario summary
// + readable-ui vs others comparison.

import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { BenchScenario, RunnerId, RunnerResult } from "../types.js";

const ALL_TRANSPORTS: RunnerId[] = ["readable-ui", "ax-tree", "headful-md"];

export interface AggregatedResult extends RunnerResult {
  infoDensity: number | null;
  sizeRatio: number | null;
}

export interface RunMatrix {
  timestamp: string;
  scenarios: BenchScenario[];
  transports: RunnerId[];
  results: AggregatedResult[]; // one per (scenario, transport) cell
}

export function enrichResults(
  scenarios: BenchScenario[],
  transports: RunnerId[],
  raw: RunnerResult[],
): AggregatedResult[] {
  const out: AggregatedResult[] = [];
  for (const scenario of scenarios) {
    const baseline = raw.find(
      (r) => r.scenarioId === scenario.id && r.runnerId === "readable-ui",
    );
    const baselineTokens = baseline && baseline.output !== null ? baseline.tokens : null;

    for (const transport of transports) {
      const result = raw.find(
        (r) => r.scenarioId === scenario.id && r.runnerId === transport,
      );
      if (!result) continue;

      const infoDensity =
        result.output === null || result.actionableElementCount === 0
          ? null
          : result.tokens / result.actionableElementCount;
      const sizeRatio =
        baselineTokens && result.output !== null
          ? result.tokens / baselineTokens
          : null;

      out.push({ ...result, infoDensity, sizeRatio });
    }
  }
  return out;
}

export function writeRunArtifacts(
  rootDir: string,
  matrix: RunMatrix,
): { runDir: string; summaryMdPath: string } {
  const runDir = join(rootDir, matrix.timestamp);
  const outputsDir = join(runDir, "outputs");
  mkdirSync(outputsDir, { recursive: true });

  // Raw results JSON.
  const summaryJsonPath = join(runDir, "summary.json");
  writeFileSync(
    summaryJsonPath,
    JSON.stringify(matrix, (_k, v) => v, 2),
  );

  // Per-cell output files.
  for (const r of matrix.results) {
    const file = join(outputsDir, `${r.scenarioId}.${r.runnerId}.txt`);
    writeFileSync(file, r.output ?? "");
  }

  // Markdown report.
  const summaryMdPath = join(runDir, "summary.md");
  writeFileSync(summaryMdPath, renderSummaryMd(matrix));

  return { runDir, summaryMdPath };
}

function renderSummaryMd(matrix: RunMatrix): string {
  const gitSha = safeExec("git rev-parse --short HEAD");
  const nodeVersion = process.version;
  const lines: string[] = [];
  lines.push(`# readable-ui bench — ${matrix.timestamp}`);
  lines.push("");
  lines.push(`- git: \`${gitSha}\``);
  lines.push(`- node: \`${nodeVersion}\``);
  lines.push(`- transports: ${matrix.transports.join(", ")}`);
  lines.push(`- scenarios: ${matrix.scenarios.length}`);
  lines.push("");

  lines.push("## Per-scenario results");
  lines.push("");
  for (const scenario of matrix.scenarios) {
    lines.push(`### \`${scenario.id}\` — ${scenario.url}`);
    lines.push("");
    lines.push(`> ${scenario.taskDescription}`);
    lines.push("");
    lines.push("| transport | bytes | chars | tokens | renderTimeMs | actionable | infoDensity | sizeRatio |");
    lines.push("|---|---:|---:|---:|---:|---:|---:|---:|");
    for (const transport of matrix.transports) {
      const r = matrix.results.find(
        (x) => x.scenarioId === scenario.id && x.runnerId === transport,
      );
      if (!r) continue;
      if (r.output === null) {
        lines.push(`| ${transport} | — | — | — | — | — | — | — |`);
        continue;
      }
      lines.push(
        `| ${transport} | ${r.bytes} | ${r.chars} | ${r.tokens} | ${r.renderTimeMs.toFixed(1)} | ${r.actionableElementCount} | ${fmt(r.infoDensity)} | ${fmt(r.sizeRatio)} |`,
      );
    }
    lines.push("");
  }

  lines.push("## Across-scenario summary");
  lines.push("");
  lines.push("| transport | metric | median | mean | min | max |");
  lines.push("|---|---|---:|---:|---:|---:|");
  for (const transport of matrix.transports) {
    const cells = matrix.results.filter(
      (r) => r.runnerId === transport && r.output !== null,
    );
    if (cells.length === 0) {
      lines.push(`| ${transport} | (no applicable scenarios) | — | — | — | — |`);
      continue;
    }
    for (const [metric, pick] of [
      ["bytes", (r: AggregatedResult) => r.bytes],
      ["chars", (r: AggregatedResult) => r.chars],
      ["tokens", (r: AggregatedResult) => r.tokens],
      ["renderTimeMs", (r: AggregatedResult) => r.renderTimeMs],
      ["actionable", (r: AggregatedResult) => r.actionableElementCount],
    ] as const) {
      const vals = cells.map(pick);
      lines.push(
        `| ${transport} | ${metric} | ${fmt(median(vals))} | ${fmt(mean(vals))} | ${fmt(Math.min(...vals))} | ${fmt(Math.max(...vals))} |`,
      );
    }
  }
  lines.push("");

  lines.push("## Takeaways");
  lines.push("");
  for (const t of computeTakeaways(matrix)) lines.push(`- ${t}`);
  lines.push("");

  return lines.join("\n");
}

function computeTakeaways(matrix: RunMatrix): string[] {
  const out: string[] = [];
  const baseline = matrix.results.filter(
    (r) => r.runnerId === "readable-ui" && r.output !== null,
  );
  const applicableIds = new Set(baseline.map((b) => b.scenarioId));
  for (const transport of ["ax-tree", "headful-md"] as const) {
    const paired = matrix.results.filter(
      (r) => r.runnerId === transport && applicableIds.has(r.scenarioId),
    );
    if (paired.length === 0) continue;
    const ratios = paired
      .map((r) => r.sizeRatio)
      .filter((x): x is number => typeof x === "number");
    if (ratios.length === 0) continue;
    const avg = mean(ratios);
    const med = median(ratios);
    const pct = ((avg - 1) * 100).toFixed(1);
    const direction = avg > 1 ? "more" : "fewer";
    const absPct = Math.abs(Number(pct)).toFixed(1);
    out.push(
      `${transport} uses ${absPct}% ${direction} tokens than readable-ui across ${ratios.length} scenarios (mean sizeRatio ${avg.toFixed(2)}, median ${med.toFixed(2)}).`,
    );
  }
  const skipped = matrix.results.filter(
    (r) => r.output === null && r.runnerId === "readable-ui",
  );
  if (skipped.length > 0) {
    out.push(
      `readable-ui skipped ${skipped.length} scenario(s): ${skipped.map((s) => s.scenarioId).join(", ")} (no .md envelope route).`,
    );
  }
  return out;
}

function fmt(n: number | null): string {
  if (n === null || Number.isNaN(n)) return "—";
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2);
}

function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

function mean(values: number[]): number {
  if (values.length === 0) return NaN;
  let s = 0;
  for (const v of values) s += v;
  return s / values.length;
}

function safeExec(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

export { ALL_TRANSPORTS };
