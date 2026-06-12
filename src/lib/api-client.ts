import { z } from "zod";

// Wire shape produced by errorResponse in src/lib/api.ts (SPEC §5.3)
const errorBodySchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

// Fetch helper for TanStack Query hooks; throws ApiError so hooks get
// { code, message, status } in their error state
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => undefined);
    const parsed = errorBodySchema.safeParse(body);
    if (parsed.success) {
      throw new ApiError(
        parsed.data.error.code,
        parsed.data.error.message,
        res.status,
      );
    }
    throw new ApiError("UNKNOWN", "Something went wrong", res.status);
  }
  return res.json() as Promise<T>;
}
