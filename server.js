/* ------------------------------------------------------------------
 * MarketLens (React) — backend: serves the built app + /api/chat.
 *
 *   npm run build        # produces dist/
 *   export ANTHROPIC_API_KEY=sk-ant-...
 *   npm run serve        # → http://localhost:3000
 *
 * Without the key, /api/chat returns 500 and the frontend falls back
 * to its local assistant automatically.
 * ------------------------------------------------------------------ */
import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const MODEL = "claude-opus-4-8";

const app = express();
app.use(express.json({ limit: "2mb" }));
const client = new Anthropic(); // reads ANTHROPIC_API_KEY

const SYSTEM = `You are the MarketLens assistant — a concise real-estate deal analyst.
Ground every answer ONLY in the CONTEXT data provided (current listings + stats). Don't
invent listings or numbers; if it's not in the data, say so. Lead with the answer, name a
listing's address + price when you cite it, and use plain text. Fields: category =
undervalued/fair/overpriced; vsEstimatePct = list vs AVM; capRatePct = cap rate; strategy =
the suggested play; dealScore (0–100) ranks the deal.`;

app.get("/api/health", (_req, res) => res.json({ ok: true, hasKey: !!process.env.ANTHROPIC_API_KEY }));

app.post("/api/chat", async (req, res) => {
  try {
    const { message, context } = req.body || {};
    if (!message) return res.status(400).json({ error: "message required" });
    const userTurn =
      "CONTEXT:\n```json\n" + JSON.stringify(context ?? {}).slice(0, 120000) +
      "\n```\n\nUser question: " + message;
    const r = await client.messages.create({
      model: MODEL, max_tokens: 1024, system: SYSTEM,
      messages: [{ role: "user", content: userTurn }],
    });
    res.json({ reply: r.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim() });
  } catch (err) {
    console.error("[/api/chat]", err?.message || err);
    res.status(500).json({ error: err?.message || "server error" });
  }
});

app.use(express.static(path.join(__dirname, "dist")));
// SPA fallback (hash router, but keep deep links working)
app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));

app.listen(PORT, () => {
  console.log(`MarketLens (React) at http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) console.log("⚠️  ANTHROPIC_API_KEY not set — assistant uses local fallback.");
});
