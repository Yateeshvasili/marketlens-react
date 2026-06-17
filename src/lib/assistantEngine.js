/* Local, data-grounded assistant engine (ported from the vanilla app).
 * Parses a query into filter params and produces a grounded reply. */
import { ALL, CITIES } from "./store.js";
import { summarize } from "./analytics.js";
import { fmtMoney, fmtMoneyShort } from "./format.js";

function parsePrice(t) {
  let m = t.match(/\$?\s*([\d][\d,.]*)\s*(m|million|k|thousand)/);
  if (m) { const n = parseFloat(m[1].replace(/,/g, "")); return /m/i.test(m[2]) ? n * 1e6 : n * 1e3; }
  m = t.match(/\$\s*([\d][\d,.]*)/);
  if (m) return parseFloat(m[1].replace(/,/g, ""));
  m = t.match(/(?:under|below|less than|max|budget|up to)\s*([\d][\d,.]*)/);
  if (m) { const n = parseFloat(m[1].replace(/,/g, "")); if (n >= 10000) return n; }
  return null;
}

export function parse(t) {
  t = t.toLowerCase();
  const city = CITIES.find((c) => t.includes(c.name.toLowerCase()));
  const bedsM = t.match(/(\d+)\s*-?\s*(?:\+|or more)?\s*(?:bed|br|bd|bedroom)/);
  const beds = bedsM ? +bedsM[1] : null;
  const maxPrice = parsePrice(t);
  let cat = null;
  if (/\b(deal|deals|undervalued|bargain|opportunit|underpriced)\b/.test(t)) cat = "undervalued";
  else if (/\b(overpriced|overvalued)\b/.test(t)) cat = "overpriced";
  let strategy = null;
  if (/flip/.test(t)) strategy = "Fix & Flip";
  else if (/cash[- ]?flow|rental|buy[- ]?and[- ]?hold|buy & hold/.test(t)) strategy = "Buy & Hold";
  else if (/turnkey/.test(t)) strategy = "Turnkey rental";
  else if (/value[- ]?add/.test(t)) strategy = "Value-add";
  let sort = null;
  if (/\b(cheap|cheapest|lowest)\b/.test(t)) sort = "price-asc";
  else if (/best cap|highest cap|cash[- ]?flow/.test(t)) sort = "cap";
  else if (/best deal|hidden gem/.test(t)) sort = "deal";
  return { city: city?.name || null, beds, maxPrice, cat, strategy, sort };
}

export function toParams(p) {
  const q = new URLSearchParams();
  if (p.city) q.set("city", p.city);
  if (p.beds) q.set("beds", String(p.beds));
  if (p.maxPrice) q.set("maxPrice", String(Math.max(500000, Math.min(4000000, p.maxPrice))));
  if (p.cat) q.set("cat", p.cat);
  if (p.strategy) q.set("strategy", p.strategy);
  if (p.sort) q.set("sort", p.sort);
  return q.toString();
}

export function reply(text) {
  const t = text.toLowerCase().trim();
  if (/^(hi|hey|hello|help|what can you)/.test(t)) {
    return {
      text:
        "I'm your deal assistant. Try: <i>“deals in Austin under $1M”</i>, " +
        "<i>“cheapest 2-bed in Miami”</i>, or <i>“best cap rate in Seattle”</i>.",
      chips: [], params: "",
    };
  }
  const p = parse(t);
  const params = toParams(p);
  let rows = ALL.filter(
    (l) =>
      (!p.city || l.city === p.city) &&
      (!p.cat || l.category === p.cat) &&
      (!p.strategy || l.strategy === p.strategy) &&
      l.beds >= (p.beds || 0) &&
      l.price <= (p.maxPrice || Infinity)
  );
  if (p.sort === "price-asc") rows = rows.sort((a, b) => a.price - b.price);
  else if (p.sort === "cap") rows = rows.sort((a, b) => b.capRate - a.capRate);
  else rows = rows.sort((a, b) => b.dealScore - a.dealScore);

  if (/\b(median|average|stats|how much|market)\b/.test(t)) {
    const s = summarize(rows.length ? rows : ALL);
    return {
      text:
        `Across ${s.total} listings${p.city ? " in " + p.city : ""}:<br>` +
        `• Median price <b>${fmtMoneyShort(s.medianPrice)}</b><br>` +
        `• Median $/sqft <b>${fmtMoney(s.medianPsf)}</b><br>` +
        `• Deals <b>${s.counts.undervalued}</b>`,
      chips: [], params,
    };
  }

  if (!rows.length) return { text: "No listings match that — try relaxing the price or beds.", chips: [], params };

  const bits = [];
  if (p.strategy) bits.push(p.strategy);
  else if (p.cat === "undervalued") bits.push("deals");
  else bits.push("listings");
  if (p.beds) bits.push(`${p.beds}+ bed`);
  if (p.city) bits.push(`in ${p.city}`);
  if (p.maxPrice) bits.push(`under ${fmtMoneyShort(p.maxPrice)}`);

  const chips = rows.slice(0, 3).map((l) => ({
    id: l.id,
    label: `${fmtMoney(l.price)} · ${l.address}, ${l.neighborhood}`,
  }));
  return { text: `Found <b>${rows.length}</b> ${bits.join(" ")}. Top picks:`, chips, params };
}
