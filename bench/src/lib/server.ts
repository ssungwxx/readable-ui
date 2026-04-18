// Launch (or reuse) the apps/example Next dev server on port 3030.

import { type ChildProcess, spawn } from "node:child_process";

export interface StartedServer {
  /** Whether this call actually started the server (true) or found an existing one (false). */
  started: boolean;
  stop: () => Promise<void>;
}

export async function ensureExampleServer(
  baseUrl: string,
  timeoutMs = 20_000,
): Promise<StartedServer> {
  const reachable = await isReachable(baseUrl);
  if (reachable) {
    return { started: false, stop: async () => {} };
  }

  const child: ChildProcess = spawn(
    "pnpm",
    ["--filter", "example", "run", "dev"],
    {
      stdio: ["ignore", "inherit", "inherit"],
      detached: false,
    },
  );

  const shutdown = async () => {
    if (child.pid && !child.killed) {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        try {
          child.kill("SIGTERM");
        } catch {}
      }
    }
  };
  const onExit = () => {
    void shutdown();
  };
  process.once("SIGINT", onExit);
  process.once("SIGTERM", onExit);
  process.once("exit", onExit);

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isReachable(baseUrl)) {
      return {
        started: true,
        stop: async () => {
          process.off("SIGINT", onExit);
          process.off("SIGTERM", onExit);
          await shutdown();
        },
      };
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  await shutdown();
  throw new Error(
    `Next dev server did not respond on ${baseUrl} within ${timeoutMs}ms`,
  );
}

async function isReachable(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok || (res.status >= 300 && res.status < 500);
  } catch {
    return false;
  }
}
