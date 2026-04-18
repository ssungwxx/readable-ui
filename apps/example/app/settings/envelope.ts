import type { Envelope } from "@readable-ui/react";
import { adminNav } from "../_shared/admin-nav";

export const settingsEnvelope: Envelope = {
  title: "Settings — Tabs & Accordion demo",
  purpose:
    "Demonstrates Tabs (client-state tab switcher) and Accordion (collapsible panels) introduced in ADR 0025.",
  role: "admin",
  layout: "sidebar",
  nav: { items: adminNav.active("/settings") },
  paths: {
    view: "/settings",
    markdown: "/settings.md",
  },
  updatedAt: "2026-04-18T00:00:00Z",
  tools: [
    {
      name: "saveProfile",
      title: "Save profile",
      description: "Save user profile settings.",
      role: "admin",
    },
    {
      name: "saveNotifications",
      title: "Save notifications",
      description: "Save notification preferences.",
      role: "admin",
    },
    {
      name: "saveIntegration",
      title: "Save integration settings",
      description: "Save third-party integration configuration.",
      role: "admin",
    },
  ],
};
