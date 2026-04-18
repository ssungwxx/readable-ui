import type { Envelope } from "@readable-ui/react";
import { withActive } from "../_shared/admin-nav";

export const componentsEnvelope: Envelope = {
  title: "Tier 3 components — Section, Steps, Split",
  purpose:
    "Demonstrates Section (heading wrapper), Steps (ordered progress), and Split (2-column layout) components introduced in ADR 0025.",
  role: "admin",
  layout: "sidebar",
  nav: { items: withActive("/components") },
  paths: {
    view: "/components",
    markdown: "/components.md",
  },
  updatedAt: "2026-04-18T00:00:00Z",
  tools: [],
};
