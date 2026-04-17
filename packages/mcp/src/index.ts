export interface ActionURI {
  scheme: "mcp" | "action";
  tool: string;
  params: Record<string, string>;
}

export function parseActionURI(uri: string): ActionURI | null {
  try {
    const url = new URL(uri);
    const scheme = url.protocol.replace(":", "");
    if (scheme !== "mcp" && scheme !== "action") return null;
    const tool = `${url.host}${url.pathname}`.replace(/^\/+|\/+$/g, "");
    const params: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return { scheme, tool, params };
  } catch {
    return null;
  }
}

export function buildActionURI(tool: string, params: Record<string, string> = {}): string {
  const qs = new URLSearchParams(params).toString();
  return `mcp://tool/${tool}${qs ? `?${qs}` : ""}`;
}
