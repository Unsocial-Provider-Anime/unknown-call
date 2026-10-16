import { z } from "zod";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function responseError(response: Response): Promise<Error> {
  let detail: unknown;

  try {
    const body: unknown = await response.json();
    if (isRecord(body)) {
      detail = body.detail;
    }
  } catch {
    // Fall through to the HTTP status message.
  }

  if (typeof detail === "string") {
    return new Error(detail);
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const messages = detail.map((item: unknown) =>
      isRecord(item) && "msg" in item ? String(item.msg) : String(item),
    );
    return new Error(messages.join("; "));
  }

  if (
    isRecord(detail) &&
    Array.isArray(detail.missing_columns)
  ) {
    return new Error(
      `Missing required columns: ${detail.missing_columns.map(String).join(", ")}`,
    );
  }

  return new Error(response.statusText || `Request failed (${response.status}).`);
}

export async function fetchJson<T>(
  input: RequestInfo | URL,
  schema: z.ZodType<T>,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(input, { signal });
  if (!response.ok) {
    throw await responseError(response);
  }

  return schema.parse(await response.json());
}