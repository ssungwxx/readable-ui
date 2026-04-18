// Bench CLI — orchestrates Next dev server + runners + aggregator.
// Spec: bench/docs/metrics.md.

import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { scenarios } from "../scenarios/index.js";
import type { BenchScenario, Runner, RunnerId, RunnerResult } from "./types.js";
import { ensureExampleServer } from "./lib/server.js";
import { PageAxSnapshotCache } from "./lib/ax-cache.js";
import {
  ALL_TRANSPORTS,
  enrichResults,
  writeRunArtifacts,
} from "./lib/aggregator.js";
import ReadableUiRunner from "./runners/readable-ui.js";
import AxTreeRunner from "./runners/ax-tree.js";
import HeadfulMdRunner from "./runners/headful-md.js";

const DEFAULT_BASE_URL = "http://localhost:3030";
// bench/ is always two levels above this file (bench/src/cli.ts).
const BENCH_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RESULTS_DIR = join(BENCH_ROOT, "results");

interface CliOptions {
  scenarios: string[];
  transports: RunnerId[];
  warmup: boolean;
  baseUrl: string;
  planOnly: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    scenarios: scenarios.map((s) => s.id),
    transports: [...ALL_TRANSPORTS],
    warmup: true,
    baseUrl: DEFAULT_BASE_URL,
    planOnly: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--scenario" || arg === "--scenarios") {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} requires a comma-separated list`);
      opts.scenarios = value.split(",").map((s) => s.trim()).filter(Boolean);
    } else if (arg === "--transport" || arg === "--transports") {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} requires a comma-separated list`);
      const parts = value.split(",").map((s) => s.trim()).filter(Boolean);
      for (const p of parts) {
        if (!ALL_TRANSPORTS.includes(p as RunnerId)) {
          throw new Error(
            `unknown transport "${p}". Valid: ${ALL_TRANSPORTS.join(", ")}`,
          );
        }
      }
      opts.transports = parts as RunnerId[];
    } else if (arg === "--warmup") {
      const value = argv[++i];
      if (value === undefined) throw new Error("--warmup requires true|false");
      opts.warmup = value !== "false" && value !== "0";
    } else if (arg === "--no-warmup") {
      opts.warmup = false;
    } else if (arg === "--base-url") {
      const value = argv[++i];
      if (!value) throw new Error("--base-url requires a URL");
      opts.baseUrl = value;
    } else if (arg === "--plan") {
      opts.planOnly = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else if (arg !== undefined) {
      throw new Error(`unknown flag: ${arg}`);
    }
  }

  return opts;
}

function printHelp(): void {
  console.log(
    [
      "pnpm bench [--scenario <ids>] [--transport <ids>] [--no-warmup] [--base-url <url>] [--plan]",
      "",
      `  --scenario   comma-separated (default: all ${scenarios.length})`,
      `  --transport  comma-separated subset of ${ALL_TRANSPORTS.join("|")}`,
      "  --no-warmup  skip warm-up run (spec §4.5 says 2 runs, discard first)",
      "  --base-url   override example app base URL (default http://localhost:3030)",
      "  --plan       print the planned matrix and exit without running",
    ].join("\n"),
  );
}

function selectScenarios(ids: string[]): BenchScenario[] {
  const selected = scenarios.filter((s) => ids.includes(s.id));
  if (selected.length === 0) {
    throw new Error(
      `no matching scenarios. known: ${scenarios.map((s) => s.id).join(", ")}`,
    );
  }
  return selected;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const planned = selectScenarios(opts.scenarios);

  console.log("bench plan:");
  console.log(`  transports: ${opts.transports.join(", ")}`);
  console.log(`  warmup: ${opts.warmup ? "on" : "off"}`);
  console.log(`  scenarios (${planned.length}):`);
  for (const s of planned) console.log(`    - ${s.id.padEnd(12)} ${s.url}`);

  if (opts.planOnly) return;

  const server = await ensureExampleServer(opts.baseUrl);
  if (server.started) console.log(`started next dev on ${opts.baseUrl}`);
  else console.log(`reusing server at ${opts.baseUrl}`);

  const cache = new PageAxSnapshotCache();
  const runners: Record<RunnerId, Runner> = {
    "readable-ui": new ReadableUiRunner({ baseUrl: opts.baseUrl }),
    "ax-tree": new AxTreeRunner({ baseUrl: opts.baseUrl, cache }),
    "headful-md": new HeadfulMdRunner({ cache }),
  };

  try {
    for (const transport of opts.transports) {
      await runners[transport].start?.();
    }

    const raw: RunnerResult[] = [];
    for (const scenario of planned) {
      cache.clear();

      // ax-tree MUST run before headful-md so the shared AX cache is populated.
      const orderedTransports = [...opts.transports].sort(transportOrder);

      for (const transport of orderedTransports) {
        const runner = runners[transport];
        try {
          if (opts.warmup) {
            await runner.run(scenario); // discard
          }
          const result = await runner.run(scenario);
          raw.push(result);
          console.log(
            `  ${scenario.id.padEnd(12)} ${transport.padEnd(12)} tokens=${String(result.tokens).padStart(6)} actions=${String(result.actionableElementCount).padStart(3)} ms=${result.renderTimeMs.toFixed(1).padStart(7)}${result.output === null ? " (n/a)" : ""}`,
          );
        } catch (err) {
          console.error(
            `  ${scenario.id.padEnd(12)} ${transport.padEnd(12)} FAILED: ${(err as Error).message}`,
          );
          raw.push({
            runnerId: transport,
            scenarioId: scenario.id,
            output: null,
            bytes: 0,
            chars: 0,
            tokens: 0,
            renderTimeMs: 0,
            actionableElementCount: 0,
          });
        }
      }
    }

    const enriched = enrichResults(planned, opts.transports, raw);
    const { runDir, summaryMdPath } = writeRunArtifacts(RESULTS_DIR, {
      timestamp: new Date().toISOString().replace(/[:.]/g, "-"),
      scenarios: planned,
      transports: opts.transports,
      results: enriched,
    });
    console.log(`\nresults written to ${runDir}`);
    console.log(`summary: ${summaryMdPath}`);
  } finally {
    for (const transport of opts.transports) {
      await runners[transport].stop?.().catch(() => {});
    }
    await server.stop();
  }
}

// Ensure ax-tree runs before headful-md for shared AX cache (spec §4).
function transportOrder(a: RunnerId, b: RunnerId): number {
  const order: Record<RunnerId, number> = {
    "readable-ui": 0,
    "ax-tree": 1,
    "headful-md": 2,
  };
  return order[a] - order[b];
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
