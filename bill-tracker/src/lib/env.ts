import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1),

  // Auth (NextAuth.js)
  AUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().url().optional(),

  // Supabase Storage (server-side)
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // AI - Google Gemini (receipt OCR)
  GOOGLE_GEMINI_API_KEY: z.string().optional(),

  // Cron
  CRON_SECRET: z.string().optional(),

  // Logging
  LOG_LEVEL: z
    .enum(["debug", "info", "warn", "error"])
    .optional(),

  // Hosting
  VERCEL_URL: z.string().optional(),

  // Runtime
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Public vars (accessible client-side)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(
      "Invalid environment variables:",
      parsed.error.flatten().fieldErrors,
    );
    if (process.env.NODE_ENV === "development") {
      throw new Error("Invalid environment variables");
    }
  }

  return (parsed as { success: true; data: Env }).data ?? (process.env as unknown as Env);
}

export const env = validateEnv();
