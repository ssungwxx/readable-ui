import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 space-y-6">
      <h1 className="text-3xl font-bold">readable-ui example</h1>
      <p className="text-gray-700">
        Dual-rendered pages: the same React tree renders as HTML for humans and as Markdown
        for AI agents.
      </p>
      <ul className="space-y-2">
        <li>
          <Link
            className="text-blue-600 underline hover:no-underline"
            href="/dashboard"
          >
            /dashboard (HTML, topbar layout)
          </Link>
          <span className="text-gray-500"> · </span>
          <Link
            className="text-blue-600 underline hover:no-underline"
            href="/dashboard.md"
          >
            /dashboard.md
          </Link>
        </li>
        <li>
          <Link
            className="text-blue-600 underline hover:no-underline"
            href="/users"
          >
            /users (HTML, sidebar layout)
          </Link>
          <span className="text-gray-500"> · </span>
          <Link
            className="text-blue-600 underline hover:no-underline"
            href="/users.md"
          >
            /users.md
          </Link>
        </li>
        <li className="text-sm text-gray-500">
          Or append{" "}
          <code className="mx-1 rounded bg-gray-100 px-1 py-0.5 text-sm">.md</code>{" "}
          to any route — same React tree, different representation.
        </li>
      </ul>
    </main>
  );
}
