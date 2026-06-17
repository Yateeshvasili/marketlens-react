import { createContext, useContext, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { reply } from "../lib/assistantEngine.js";
import { ALL } from "../lib/store.js";
import { summarize } from "../lib/analytics.js";

const Ctx = createContext(null);
export const useAssistant = () => useContext(Ctx);

export function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
export const nl2br = (s) => escapeHtml(s).replace(/\n/g, "<br>");

// Try the Claude backend (server.js / vite proxy). Returns text or null.
async function askClaude(text, backendUp) {
  if (backendUp.current === false) return null;
  const s = summarize(ALL);
  const rows = [...ALL].sort((a, b) => b.dealScore - a.dealScore).slice(0, 40).map((l) => ({
    address: l.address, city: l.city, neighborhood: l.neighborhood, price: l.price,
    beds: l.beds, sqft: l.sqft, psf: Math.round(l.psf), category: l.category,
    capRatePct: +(l.capRate * 100).toFixed(1), strategy: l.strategy, dealScore: l.dealScore,
    estValue: l.estValue, vsEstimatePct: Math.round(l.vsEstimatePct),
  }));
  const context = { summary: { total: s.total, counts: s.counts }, listings: rows };
  try {
    const res = await fetch("/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, context }),
    });
    if (!res.ok) throw new Error("bad");
    const data = await res.json();
    backendUp.current = true;
    return data.reply || null;
  } catch {
    backendUp.current = false;
    return null;
  }
}

export function AssistantProvider({ children }) {
  const [msgs, setMsgs] = useState([]);
  const backendUp = useRef(null);
  const navigate = useNavigate();

  // Asking opens the full-page chat view and answers there (Gemini-style).
  const ask = useCallback(async (text) => {
    if (!text || !text.trim()) return;
    navigate("/chat");
    setMsgs((m) => [...m, { who: "user", html: escapeHtml(text) }, { who: "bot", typing: true }]);
    const r = reply(text);
    const claude = await askClaude(text, backendUp);
    setMsgs((m) => {
      const copy = [...m];
      copy[copy.length - 1] = { who: "bot", html: claude ? nl2br(claude) : r.text, chips: r.chips };
      return copy;
    });
  }, [navigate]);

  return <Ctx.Provider value={{ msgs, ask, reset: () => setMsgs([]) }}>{children}</Ctx.Provider>;
}
