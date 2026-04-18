import type { NavItem } from "@readable-ui/core";

/**
 * ADR 0026 §3 — navigation helper. Produces `active: true`-marked copies of the
 * source items for a given href. Replaces the ad-hoc `withActive` helper that
 * previously lived in `apps/example/_shared/admin-nav.ts`.
 */
export interface DefinedNav {
  readonly items: NavItem[];
  /** Return a new array where the item matching `href` has `active: true`. */
  active(href: string): NavItem[];
}

export function defineNav(items: readonly NavItem[]): DefinedNav {
  const frozen = items.map((item) => ({ ...item }));
  return {
    items: frozen,
    active(href: string): NavItem[] {
      return frozen.map((item) =>
        item.href === href ? { ...item, active: true } : { ...item }
      );
    },
  };
}
