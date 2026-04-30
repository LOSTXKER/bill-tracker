import type { Instrumentation } from "next";

/**
 * Next.js instrumentation entry point.
 *
 * `register()` runs once per server instance on cold start. Use it for
 * one-time setup (e.g. tracing, metrics). Kept minimal for now.
 */
export async function register() {
  // Intentionally left blank. Add OpenTelemetry / Sentry etc. here if needed.
}

/**
 * `onRequestError` is called for every unhandled error that occurs while
 * rendering a request (Server Components, Server Actions, Route Handlers,
 * middleware). We log the `digest` so it can be cross-referenced with the
 * error page shown to end users (e.g. "Error ID: 2539824723").
 *
 * IMPORTANT: keep this side-effect free besides logging – never throw here,
 * or Next.js will bubble up a secondary error and obscure the real one.
 */
export const onRequestError: Instrumentation.onRequestError = (
  error,
  request,
  context,
) => {
  try {
    const digest =
      error && typeof error === "object" && "digest" in error
        ? String((error as { digest?: unknown }).digest ?? "")
        : "";

    const payload = {
      digest: digest || undefined,
      errorName: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      request: {
        path: request.path,
        method: request.method,
        // Redact cookies / authorization on purpose; only keep useful ones.
        headers: pickSafeHeaders(request.headers),
      },
      context: {
        routerKind: context.routerKind,
        routePath: context.routePath,
        routeType: context.routeType,
        renderSource: context.renderSource,
        revalidateReason: context.revalidateReason,
      },
    };

    // Single JSON line – easiest to find in Vercel Log Explorer by digest.
    console.error(
      `[onRequestError] ${JSON.stringify(payload)}`,
    );
  } catch (logErr) {
    console.error("[onRequestError] failed to log error", logErr);
  }
};

const SAFE_HEADER_KEYS = new Set([
  "host",
  "user-agent",
  "referer",
  "x-forwarded-for",
  "x-vercel-id",
  "x-vercel-deployment-url",
  "x-vercel-ip-country",
]);

function pickSafeHeaders(
  headers: Record<string, string | string[] | undefined> | undefined,
): Record<string, string> {
  if (!headers) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (!SAFE_HEADER_KEYS.has(key.toLowerCase())) continue;
    if (Array.isArray(value)) out[key] = value.join(", ");
    else if (typeof value === "string") out[key] = value;
  }
  return out;
}
