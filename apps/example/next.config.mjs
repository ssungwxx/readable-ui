/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@readable-ui/core", "@readable-ui/react", "@readable-ui/next"],
  // Next.js App Router does not natively support a literal `.md` suffix on a
  // dynamic segment when a sibling page.tsx exists at the same level
  // (`[id]/page.tsx` shadows `[id].md/route.tsx`). Rewrite makes the
  // user-facing URL `/users/<id>.md` resolve to the markdown route.
  async rewrites() {
    return [
      {
        source: "/users/:id.md",
        destination: "/users/:id/md",
      },
    ];
  },
};

export default nextConfig;
