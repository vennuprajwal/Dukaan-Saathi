import express from "express";
import cors from "cors";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { config, flags, logStartupFlags } from "./config.js";
import "./db.js"; // initialize schema on boot
import { authRouter } from "./routes/auth.js";
import { dataRouter } from "./routes/data.js";
import { simulateRouter } from "./routes/simulate.js";
import { whatsappRouter } from "./routes/whatsapp.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // Twilio posts form-encoded

app.get("/api/health", (_req, res) =>
  res.json({ ok: true, integrations: flags }),
);

app.use("/api/auth", authRouter);
app.use("/api/dashboard", dataRouter);
app.use("/api/simulate", simulateRouter);
app.use("/webhooks", whatsappRouter);

// In production, this same process serves the built Vite frontend (../dist).
// Static assets first, then an SPA fallback so client-side routes (/app,
// /simulator, /login) resolve to index.html instead of 404. The regex excludes
// /api and /webhooks; Express 5 (path-to-regexp v6) rejects the old "*" string.
const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, "..", "dist");
app.use(express.static(distDir));
app.get(/^\/(?!api\/|webhooks\/).*/, (_req, res) =>
  res.sendFile(join(distDir, "index.html")),
);

app.listen(config.port, () => {
  console.log(`\n🟢 Dukaan Saathi backend on http://localhost:${config.port}`);
  logStartupFlags();
  console.log("");
});
