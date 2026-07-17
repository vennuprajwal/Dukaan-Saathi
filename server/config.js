import "dotenv/config";

/* Central config + feature flags. Every integration is optional; the flags let
   the rest of the app degrade gracefully when a key is missing. */
export const config = {
  port: Number(process.env.PORT) || 3001,
  jwtSecret: process.env.JWT_SECRET || "dev-insecure-secret-change-me",

  nvidia: {
    apiKey: process.env.NVIDIA_API_KEY || "",
    baseUrl: process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
    model: process.env.NVIDIA_MODEL || "nvidia/nemotron-3-ultra-550b-a55b",
    temperature: Number(process.env.NVIDIA_TEMPERATURE) || 1,
    topP: Number(process.env.NVIDIA_TOP_P) || 0.95,
    maxTokens: Number(process.env.NVIDIA_MAX_TOKENS) || 16384,
    extraBody: {
      chat_template_kwargs: { enable_thinking: true },
      reasoning_budget: Number(process.env.NVIDIA_REASONING_BUDGET) || 16384,
    },
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

/* A usable NVIDIA NIM key starts with "nvapi-". */
function usableNvidiaKey(key) {
  return (key || "").startsWith("nvapi-");
}

export const flags = {
  hasNvidia: usableNvidiaKey(config.nvidia.apiKey),
  hasSarvam: Boolean(config.sarvam.apiKey),
};

/* Human-readable reason the AI is in demo mode, for developer logs only —
   never surfaced to end users (which would leak configuration details). */
export function aiConfigDiagnostic() {
  const key = config.nvidia.apiKey;
  if (!key) return "NVIDIA_API_KEY not set";
  if (!usableNvidiaKey(key)) return "NVIDIA_API_KEY is not a usable nvapi key";
  return null;
}

export function logStartupFlags() {
  console.log("  Dukaan Saathi backend — integration status:");
  console.log(
    `   • Dukaan Saathi AI : ${flags.hasNvidia ? "LIVE (" + config.nvidia.model + ")" : "DEMO MODE → rule-based parser"}`,
  );
  if (!flags.hasNvidia) {
    const why = aiConfigDiagnostic();
    if (why) console.log(`       ↳ reason: ${why}. Set a valid NVIDIA_API_KEY to enable live AI.`);
  }
  console.log(
    `   • Sarvam voice     : ${flags.hasSarvam ? "ON" : "OFF → browser speech only"}`,
  );
}
