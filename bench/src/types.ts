// Shared types for the bench harness.
// Spec: bench/docs/metrics.md §7 — runner interface contract.

export interface BenchScenario {
  id: string;
  url: string;
  title: string;
  taskDescription: string;
}

export type RunnerId = "readable-ui" | "ax-tree" | "headful-md";

export interface RunnerResult {
  runnerId: RunnerId;
  scenarioId: string;
  output: string | null;
  bytes: number;
  chars: number;
  tokens: number;
  renderTimeMs: number;
  actionableElementCount: number;
}

export interface Runner {
  id: RunnerId;
  run(scenario: BenchScenario): Promise<RunnerResult>;
  start?(): Promise<void>;
  stop?(): Promise<void>;
}
