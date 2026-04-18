import type { NavItem } from "@readable-ui/react";

export const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Users", href: "/users" },
  { label: "Roles", href: "/roles" },
  { label: "Audit log", href: "/audit" },
  { label: "Reports", href: "/reports" },
  { label: "Components", href: "/components" },
  { label: "Settings", href: "/settings" },
];

export function withActive(href: string): NavItem[] {
  return adminNav.map((item) =>
    item.href === href ? { ...item, active: true } : item
  );
}
