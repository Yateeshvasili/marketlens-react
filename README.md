# MarketLens (React) — primary app

A real-estate **deal-intelligence** web app: a map-based deal finder, automated
valuation (AVM), an interactive Deal Analyzer, investor analytics, a full-page
AI assistant (with voice input), and a marketing landing page.

This (`marketlens-react/`) is the **current / primary** codebase. The original
no-build vanilla version is kept in `../marketlens/`.

---

## Run it

```bash
npm install

# Dev server (hot reload) → http://localhost:5173
npm run dev

# Production build + static preview
npm run build
npm run preview            # → http://localhost:4173
```

> Needs internet at runtime — map tiles, property photos, and charts load from CDNs.

### Optional: real Claude-powered assistant

The AI assistant works out of the box with a local engine. To use **real Claude**:

```bash
npm run build
export ANTHROPIC_API_KEY=sk-ant-...
npm run serve              # Express serves dist/ + /api/chat → http://localhost:3000
```

The frontend auto-detects the backend (`/api/chat`) and falls back to the local
engine if it's absent. In `npm run dev`, Vite proxies `/api` → `localhost:3000`,
so run `npm run serve` alongside `npm run dev` to develop against the live API.
The API key stays **server-side** — never shipped to the browser.

---

## Stack

- **Vite + React 18**, **react-router-dom** (HashRouter)
- **Leaflet** + **leaflet.markercluster** + **leaflet.heat** — map, clustering,
  proportional markers, heatmaps, satellite basemap, area-draw
- **Chart.js** — Markets analytics
- **Web Speech API** — voice input (no dependency/key)
- **Express + @anthropic-ai/sdk** (`server.js`) — optional Claude backend

## Structure

```
src/
  lib/
    data.js           300 sample listings across 5 U.S. metros + neighborhood data
    analytics.js      AVM, anomaly z-score, comps, match score, investment metrics
    store.js          analyze() once → ALL listings + hood stats
    format.js         money formatting, category colors
    assistantEngine.js  local NL parser + grounded reply
  components/
    Nav.jsx           sticky nav + routes
    DealMap.jsx       Leaflet: clusters, bubble markers, heatmaps, satellite, area-draw
    DealModals.jsx    Detail · Deal Analyzer (with Back) · Compare
    Assistant.jsx     assistant context (local + Claude) — drives the chat page
    Chat.jsx          (page) full-page Gemini-style chat
    MicButton.jsx     voice input
    FollowUs.jsx      social bubbles (home only)
    Reveal.jsx        scroll-reveal + count-up helpers
  pages/
    Home · Deals · Markets · Pricing · About · Chat
  App.jsx · main.jsx · index.css
server.js             optional Claude backend + static server
```

## Pages & features

- **Home** — investor landing: hero with product mockup + **Ask-AI box (with mic)**,
  count-up stats, alternating feature rows, deal types, testimonials, FAQ, and the
  **Follow-us** social bubbles (home only). Scroll-reveal + entrance animations.
- **Find Deals** — the app:
  - Filters (city, neighborhood, value, beds, price, favorites), buyer **match**
    preferences, **investor** filters (strategy, min cap rate), sortable results.
  - **Map**: clustered + size-proportional markers (size = deal score), **🗺 Map /
    🛰 Satellite** basemaps, **price** & **investor-activity** heatmaps, **📍 area
    search**, collapsible side panels, a legend.
  - **Deal cards** → detail modal (AVM, percentile positioning, match, facts,
    neighborhood fit, comps), **Deal Analyzer** (live ROI/cap/cash-flow + LiveCMA
    comps, with a **← back** to the listing to save it), **compare tray**, **saved
    searches + alerts**, favorites (localStorage).
- **Markets** — Chart.js: price distribution, $/sqft by city, days-on-market, trend.
- **Pricing** — three tiers. **About** — company + consultation form.
- **Ask AI** (full-page chat) — Gemini-style: empty hero → conversation; **voice
  input** (mic auto-sends on finish); answers in place; "＋ New chat"; uses Claude
  when the backend is running, local engine otherwise.

## Notes

- **Demo data** — 300 generated listings; photos are representative stock images
  (cycled, cached). Swap `src/lib/data.js` for a live listings/MLS feed for production.
- **Voice input** works in Chromium browsers (Chrome/Edge); the mic auto-hides
  where the Web Speech API isn't supported. The browser will prompt for mic access.
- Contact details on the About page are placeholders.
