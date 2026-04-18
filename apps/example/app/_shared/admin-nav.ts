import { defineNav } from "@readable-ui/react";

// ADR 0026 — promoted `withActive` to library helper `defineNav`.
// Existing imports of `adminNav` / `withActive` continue to work (re-exports below).
export const adminNav = defineNav([
  { label: "Dashboard", href: "/dashboard" },
  { label: "Users", href: "/users" },
  { label: "Roles", href: "/roles" },
  { label: "Audit log", href: "/audit" },
  { label: "Reports", href: "/reports" },
  { label: "Components", href: "/components" },
  { label: "Settings", href: "/settings" },
]);

/** @deprecated use `adminNav.active(href)` directly. Kept for backward compat. */
export function withActive(href: string) {
  return adminNav.active(href);
}
