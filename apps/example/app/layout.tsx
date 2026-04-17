import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "readable-ui example",
  description: "Dual-rendered (HTML + Markdown) admin example",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
