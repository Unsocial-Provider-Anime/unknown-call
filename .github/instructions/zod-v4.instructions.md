---
description: "Use when defining Zod schemas, validating API responses or other untrusted frontend data, or inferring TypeScript types from schemas. Covers Zod 4 patterns."
applyTo: "frontend/src/**/*.{ts,tsx}"
---
# Zod 4 Guidelines

- Use Zod 4 from the `zod` package to validate frontend form input and data at trust boundaries, including JSON received from APIs. Do not treat a TypeScript cast as runtime validation.
- Define schemas close to the feature that owns the data shape. Compose object, array, and primitive schemas rather than duplicating validation logic.
- Infer TypeScript types from schemas with `z.infer<typeof schema>` when the validated output is the type needed by the application. Avoid maintaining a separate interface for the same shape.
- Use `.parse()` when invalid data should fail the current operation. Use `.safeParse()` when validation failure is an expected result that the caller needs to handle explicitly.
- Keep schema transformations and refinements focused on actual data requirements. Prefer Zod 4 APIs; do not introduce deprecated Zod 3 patterns.
- When Zod's behavior or API details are unclear, refer to the [Zod basics](https://zod.dev/basics) and [Zod API](https://zod.dev/api) documentation.