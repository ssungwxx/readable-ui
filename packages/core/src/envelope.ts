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

export const EnvelopeZ = z
  .object({
    title: z.string().min(1),
    purpose: z.string().optional(),
    role: z.union([z.string(), z.array(z.string())]).optional(),
    layout: z.string().optional(),
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
