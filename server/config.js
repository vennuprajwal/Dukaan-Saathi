import "dotenv/config";

/* Central config + feature flags. Every integration is optional; the flags let
   the rest of the app degrade gracefully when a key is missing. */
export const config = {
  port: Number(process.env.PORT) || 3001,
  jwtSecret: process.env.JWT_SECRET || "dev-insecure-secret-change-me",

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || "",
    // Model is configuration, never hard-coded logic. Override with CLAUDE_MODEL
    // to move to a newer model without a code change. The default is a real,
    // currently-supported Anthropic model id.
    model: process.env.CLAUDE_MODEL || "claude-sonnet-4-6",
  },

  // Turso / libSQL. When the URL is unset we fall back to a local SQLite file
  // (see db.js) so local dev needs no cloud account.
  turso: {
    url: process.env.TURSO_DATABASE_URL || "",
    authToken: process.env.TURSO_AUTH_TOKEN || "",
  },

  sarvam: {
    apiKey: process.env.SARVAM_API_KEY || "",
    model: process.env.SARVAM_STT_MODEL || "saarika:v2.5",
    url: process.env.SARVAM_STT_URL || "https://api.sarvam.ai/speech-to-text",
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  },
};

/* A usable Anthropic key is a real API key ("sk-ant-api…"). OAuth / gateway
   tokens — e.g. the Claude Code client's "sk-ant-oat…" or "fe_oa_…" — are
   rejected by the Messages API with 403, so treat them as "no key" and fall
   back to the rule-based parser ("Demo AI Mode") instead of failing a call on
   every message. (If you proxy through a custom gateway, set ANTHROPIC_API_KEY
   to a real sk-ant-api key or relax this check.) */
function usableAnthropicKey(key) {
  return (key || "").startsWith("sk-ant-api");
}

export const flags = {
  hasClaude: usableAnthropicKey(config.anthropic.apiKey),
  hasSarvam: Boolean(config.sarvam.apiKey),
};

/* Human-readable reason the AI is in demo mode, for developer logs only —
   never surfaced to end users (which would leak configuration details). */
export function aiConfigDiagnostic() {
  const key = config.anthropic.apiKey;
  if (!key) return "ANTHROPIC_API_KEY not set";
  if (!usableAnthropicKey(key)) return "ANTHROPIC_API_KEY is not a usable sk-ant-api key (OAuth/gateway tokens are rejected)";
  return null;
}

export function logStartupFlags() {
  console.log("  Dukaan Saathi backend — integration status:");
  console.log(
    `   • Dukaan Saathi AI : ${flags.hasClaude ? "LIVE (" + config.anthropic.model + ")" : "DEMO MODE → rule-based parser"}`,
  );
  if (!flags.hasClaude) {
    const why = aiConfigDiagnostic();
    if (why) console.log(`       ↳ reason: ${why}. Set a valid ANTHROPIC_API_KEY to enable live AI.`);
  }
  console.log(
    `   • Sarvam voice     : ${flags.hasSarvam ? "ON" : "OFF → browser speech only"}`,
  );
}
