// Prisma configuration file
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load from .env.local first, then .env
config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use DIRECT_URL for migrations/schema push (port 5432)
    // Fall back to DATABASE_URL if DIRECT_URL is not set
    url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"],
  },
});
