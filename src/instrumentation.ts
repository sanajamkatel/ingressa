// Runs once when a new server instance starts (stable since Next 15 — see
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation.md).
// Fails fast with a clear message if a required env var is missing, instead of letting
// the app boot successfully and then crash deep inside whatever function first touches
// the missing value (e.g. a user hitting "Sync Gmail" before anyone notices
// ANTHROPIC_API_KEY was never set).

const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "ANTHROPIC_API_KEY",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
] as const;

export function register() {
  const missing = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        "Set them in .env.local before starting the app."
    );
  }

  if (!process.env.REDIS_URL) {
    console.warn(
      "REDIS_URL is not set — falling back to redis://localhost:6379. " +
        "Set it explicitly if that's not where Redis is running."
    );
  }
}
