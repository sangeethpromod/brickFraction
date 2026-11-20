import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { PostgresDialect } from "kysely";
import { Pool } from "pg";

// Next.js dev mode reloads modules often; keep one pool across reloads.
const globalForPool = globalThis as unknown as { authPool?: Pool };
const pool = (globalForPool.authPool ??= new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
}));

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: {
    dialect: new PostgresDialect({ pool }),
    type: "postgres",
    schemaName: "auth", // all Better Auth tables live in the "auth" schema, apart from goose's "public"
  },
  emailAndPassword: { enabled: true }, // email + password only; no verification or reset by design
  plugins: [jwt()], // adds /api/auth/token and /api/auth/jwks for the Go API
});
