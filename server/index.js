import express from "express";
import cors from "cors";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { config, flags, logStartupFlags } from "./config.js";
import { dbReady } from "./db.js"; // schema init (awaited before serving)
import { authRouter } from "./routes/auth.js";
import { dataRouter } from "./routes/data.js";
import { simulateRouter } from "./routes/simulate.js";
import { connectionsRouter } from "./routes/connections.js";
import { creditRouter } from "./routes/credit.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/api/health", (_req, res) =>
  res.json({ ok: true, integrations: flags, aiMode: flags.hasClaude ? "live" : "demo" }),
);

app.use("/api/auth", authRouter);
app.use("/api/dashboard", dataRouter);
app.use("/api/ai", simulateRouter);
app.use("/api/connections", connectionsRouter);
app.use("/api/credit", creditRouter);

// In production, this same process serves the built Vite frontend (../dist).
// Static assets first, then an SPA fallback so client-side routes (/app,
// /assistant, /login) resolve to index.html instead of 404. The regex excludes
// /api; Express 5 (path-to-regexp v6) rejects the old "*" string.
const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, "..", "dist");
app.use(express.static(distDir));
app.get(/^\/(?!api\/).*/, (_req, res) =>
  res.sendFile(join(distDir, "index.html")),
);

// Ensure the schema exists before we start accepting requests.
dbReady
  .then(() => {
    app.listen(config.port, () => {
      console.log(`\n🟢 Dukaan Saathi backend on http://localhost:${config.port}`);
      logStartupFlags();
      console.log("");
    });
  })
  .catch((err) => {
    console.error("❌ Database init failed:", err.message);
    process.exit(1);
  });
