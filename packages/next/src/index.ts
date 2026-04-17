export type AcceptTarget = "html" | "markdown";

export function negotiate(acceptHeader: string | null | undefined): AcceptTarget {
  if (!acceptHeader) return "html";
  const normalized = acceptHeader.toLowerCase();
  if (normalized.includes("text/markdown")) return "markdown";
  return "html";
}

export function negotiateFromRequest(request: Request): AcceptTarget {
  return negotiate(request.headers.get("accept"));
}
