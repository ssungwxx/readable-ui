import {
  Page,
  Heading,
  Paragraph,
  Link,
  List,
  ListItem,
  Table,
  CodeSpan,
} from "@readable-ui/react/components";
import { definePage } from "@readable-ui/react";
import { sampleRoutes, type SampleRoute } from "./_shared/sample-routes";

// Row shape consumed by `<Table>`. The `id` column carries the slug (e.g.
// "users", "dashboard") so AI consumers can address each sample page by a
// stable key. `html` / `markdown` hold the URL paths as plain text cells —
// the Table cell API is primitive-only (see packages/react/src/components.tsx
// TableImpl), so the human-clickable links are exposed below in a `<List>`.
interface SampleRouteRow extends Record<string, unknown> {
  id: string;
  title: string;
  layout: string;
  html: string;
  markdown: string;
}

const tableRows: SampleRouteRow[] = sampleRoutes.map((r: SampleRoute) => ({
  id: r.id,
  title: r.title,
  layout: r.layout,
  html: r.href,
  markdown: r.mdHref,
}));

export const homePage = definePage({
  envelope: {
    title: "readable-ui example",
    purpose:
      "Index of sample pages. Each row points to both the HTML view and the Markdown envelope view of the same React tree.",
    layout: "flow",
    paths: {
      view: "/",
      markdown: "/page.md",
    },
    // Read-only landing — no tools. The envelope schema (EnvelopeZ in
    // packages/core/src/envelope.ts) marks `tools` as optional, so an empty
    // array is permitted; omitting the key entirely is equivalent. We declare
    // an empty array to make the "no actions" contract explicit.
    tools: [],
  },
  render: () => (
    <Page>
      <Heading level={1}>readable-ui example</Heading>
      <Paragraph>
        Every sample page is rendered twice from the same React tree: a
        human-facing HTML view and an AI-facing Markdown envelope. Append{" "}
        <CodeSpan>.md</CodeSpan> to any path to fetch the Markdown variant.
      </Paragraph>

      <Table<SampleRouteRow>
        caption="Sample pages"
        columns={[
          { key: "title", label: "Title" },
          { key: "layout", label: "Layout" },
          { key: "html", label: "HTML" },
          { key: "markdown", label: "Markdown" },
        ]}
        rows={tableRows}
      />

      <Heading level={2}>Open a page</Heading>
      <Paragraph>
        Direct links to each sample — useful when an agent needs to navigate
        from this index to, for example, the{" "}
        <Link href="/users">Users</Link> management page.
      </Paragraph>
      <List>
        {sampleRoutes.map((r) => (
          <ListItem key={r.id}>
            <Link href={r.href}>{r.title}</Link> —{" "}
            <Link href={r.mdHref}>Markdown</Link>
          </ListItem>
        ))}
      </List>
    </Page>
  ),
});
