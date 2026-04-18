// ADR 0025: Tier 3 demo — Section, Steps, Split
// This page demonstrates the three "layout-neutral" Tier 3 components that do not
// require client-side state and are safe to use in any context.
import {
  Page,
  Heading,
  Paragraph,
  Link,
  Card,
  Alert,
  Section,
  Steps,
  Step,
  Split,
  Cell,
  CodeSpan,
} from "@readable-ui/react/components";
import { definePage } from "@readable-ui/react";
import { componentsEnvelope } from "./envelope";

export const componentsPage = definePage({
  envelope: componentsEnvelope,
  render: () => (
    <Page>
      <Heading level={1}>Tier 3 components</Heading>
      <Paragraph>
        Section, Steps, and Split introduced in ADR 0025. Compare with the{" "}
        <Link href="/components.md">Markdown view</Link> to see how each serializes.
      </Paragraph>

      <Alert kind="note">
        Tabs and Accordion are on the{" "}
        <Link href="/settings">Settings page</Link> — they require client-side state.
      </Alert>

      {/* Section */}
      <Section title="Section component" level={2}>
        <Paragraph>
          Section wraps a Heading + children block. In Markdown it serializes as a plain
          heading followed by block children — no directive wrapper. The{" "}
          <CodeSpan>level</CodeSpan> prop is required in v1; automatic inference is v2.
        </Paragraph>

        <Section title="Nested section (level 3)" level={3}>
          <Paragraph>
            Nested sections require the author to increment the level explicitly.
            This section uses <CodeSpan>level=3</CodeSpan>.
          </Paragraph>
        </Section>
      </Section>

      {/* Steps */}
      <Section title="Steps component" level={2}>
        <Paragraph>
          Steps display an ordered progress sequence. Each step has a{" "}
          <CodeSpan>status</CodeSpan> of <CodeSpan>done</CodeSpan>,{" "}
          <CodeSpan>current</CodeSpan>, or <CodeSpan>pending</CodeSpan>.
          The palette aligns with the Alert component (green / blue / grey).
        </Paragraph>

        <Card title="Account onboarding">
          <Steps>
            <Step label="Create account" status="done" />
            <Step label="Verify email address" status="done" />
            <Step label="Complete profile" status="current" />
            <Step label="Invite team members" status="pending" />
            <Step label="Finish setup" status="pending" />
          </Steps>
        </Card>

        <Card title="Deployment pipeline">
          <Steps>
            <Step label="Build" status="done" />
            <Step label="Test" status="current" />
            <Step label="Stage" status="pending" />
            <Step label="Deploy to production" status="pending" />
          </Steps>
        </Card>
      </Section>

      {/* Split */}
      <Section title="Split component" level={2}>
        <Paragraph>
          Split provides a 2-column layout. In Markdown, left and right cells are
          serialized sequentially (top-to-bottom) — the 2-column placement is a
          visual-only effect (ADR 0007 §5).
        </Paragraph>

        <Split cols={2}>
          <Cell>
            <Card title="Left column">
              <Paragraph>
                This content is in the left cell. On narrow viewports it stacks below
                the right cell.
              </Paragraph>
              <Steps>
                <Step label="Step A" status="done" />
                <Step label="Step B" status="current" />
              </Steps>
            </Card>
          </Cell>
          <Cell>
            <Card title="Right column">
              <Paragraph>
                This content is in the right cell. In the Markdown output it follows
                directly after the left cell — same information, different presentation.
              </Paragraph>
              <Alert kind="tip">
                Useful for showing a form on the left and a preview on the right.
              </Alert>
            </Card>
          </Cell>
        </Split>
      </Section>
    </Page>
  ),
});
