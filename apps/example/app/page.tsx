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
            href="/users"
          >
            /users (HTML)
          </Link>
          <span className="text-gray-500"> — visit with</span>
          <code className="mx-1 rounded bg-gray-100 px-1 py-0.5 text-sm">
            Accept: text/markdown
          </code>
          <span className="text-gray-500">or append</span>
          <code className="mx-1 rounded bg-gray-100 px-1 py-0.5 text-sm">
            .md
          </code>
          <span className="text-gray-500">to see Markdown.</span>
        </li>
        <li>
          <Link
            className="text-blue-600 underline hover:no-underline"
            href="/users.md"
          >
            /users.md (Markdown preview)
          </Link>
        </li>
      </ul>
    </main>
  );
}
