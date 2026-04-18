import { z } from "zod";

export const JsonSchemaSubsetZ: z.ZodTypeAny = z.lazy(() =>
  z
    .object({
      type: z
        .enum(["object", "string", "number", "integer", "boolean", "array"])
        .optional(),
      properties: z.record(z.string(), JsonSchemaSubsetZ).optional(),
      required: z.array(z.string()).optional(),
      items: JsonSchemaSubsetZ.optional(),
      enum: z.array(z.unknown()).optional(),
      format: z.string().optional(),
      pattern: z.string().optional(),
      minLength: z.number().int().optional(),
      maxLength: z.number().int().optional(),
      minimum: z.number().optional(),
      maximum: z.number().optional(),
      description: z.string().optional(),
      default: z.unknown().optional(),
    })
    .passthrough()
);

export const ConstraintZ = z.object({
  id: z.string(),
  text: z.string(),
  severity: z.enum(["info", "warn", "danger"]).default("info"),
});

export const PaginationZ = z.object({
  page: z.number().int().min(1),
  perPage: z.number().int().min(1),
  total: z.number().int().min(0),
  nextUrl: z.string().optional(),
  prevUrl: z.string().optional(),
});

export const PathsZ = z.object({
  view: z.string(),
  markdown: z.string().optional(),
  api: z.string().optional(),
  canonical: z.string().optional(),
});

export const EnvelopeToolZ = z.object({
  name: z.string().regex(/^[A-Za-z0-9._-]+$/),
  title: z.string().optional(),
  description: z.string().optional(),
  input: JsonSchemaSubsetZ.optional(),
  output: JsonSchemaSubsetZ.optional(),
  role: z.union([z.string(), z.array(z.string())]).optional(),
  constraints: z.array(ConstraintZ).optional(),
});

export const PageLayoutZ = z.enum(["flow", "sidebar", "topbar", "detail"]);
export type PageLayout = z.infer<typeof PageLayoutZ>;

export const NavItemZ = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
  active: z.boolean().optional(),
});
export type NavItem = z.infer<typeof NavItemZ>;

export const NavScopeZ = z.enum(["global", "section"]);
export type NavScope = z.infer<typeof NavScopeZ>;

export const NavZ = z.object({
  items: z.array(NavItemZ),
  scope: NavScopeZ.optional(),
});
export type Nav = z.infer<typeof NavZ>;

/** ADR 0024 §4: breadcrumb item — `href` omission marks the current position. */
export const BreadcrumbItemZ = z.object({
  label: z.string().min(1),
  href: z.string().min(1).optional(),
});
export type BreadcrumbItem = z.infer<typeof BreadcrumbItemZ>;

export const EnvelopeZ = z
  .object({
    title: z.string().min(1),
    purpose: z.string().optional(),
    role: z.union([z.string(), z.array(z.string())]).optional(),
    /** ADR 0020 §5 (+ research llm-test-0020 Gap B): envelope-level intent marker — placed
     * adjacent to purpose/role so YAML serialization surfaces it in the high-priority header,
     * not buried after `tools:`. */
    intent: z.enum(["destructive-confirm"]).optional(),
    layout: PageLayoutZ.optional(),
    nav: NavZ.optional(),
    /** ADR 0024 §4: hierarchical path. 2+ items render as a breadcrumb paragraph ahead of
     * main body. Coexists with `<Page back>` but breadcrumb wins (back suppressed). */
    breadcrumb: z.array(BreadcrumbItemZ).optional(),
    paths: PathsZ.optional(),
    constraints: z.array(ConstraintZ).optional(),
    pagination: PaginationZ.optional(),
    updatedAt: z.string().optional(),
    tools: z.array(EnvelopeToolZ).optional(),
    extensions: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type Envelope = z.infer<typeof EnvelopeZ>;
export type EnvelopeTool = z.infer<typeof EnvelopeToolZ>;
export type Constraint = z.infer<typeof ConstraintZ>;
export type Pagination = z.infer<typeof PaginationZ>;
export type Paths = z.infer<typeof PathsZ>;

export class EnvelopeError extends Error {
  constructor(
    message: string,
    public issues: z.ZodIssue[]
  ) {
    super(message);
    this.name = "EnvelopeError";
  }
}

export function parseEnvelope(input: unknown): Envelope {
  const result = EnvelopeZ.safeParse(input);
  if (!result.success) {
    const summary = result.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new EnvelopeError(`Invalid envelope:\n${summary}`, result.error.issues);
  }
  return result.data;
}
