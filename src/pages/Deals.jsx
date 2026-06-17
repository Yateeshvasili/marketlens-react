import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ALL, hoodStats, CITIES, NEIGHBORHOOD_INFO } from "../lib/store.js";
import { matchScore, summarize, distanceMeters } from "../lib/analytics.js";
import { fmtMoney, fmtMoneyShort, CAT_KEY } from "../lib/format.js";
import DealMap from "../components/DealMap.jsx";
import { DetailModal, AnalyzerModal, CompareModal } from "../components/DealModals.jsx";

const SS_KEY = "marketlens.searches";
const FAV_KEY = "marketlens.favorites";
const loadJSON = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };

export default function Deals() {
  const [sp] = useSearchParams();
  const [f, setF] = useState(() => ({
    city: sp.get("city") || "", hood: "", cat: sp.get("cat") || "", beds: +(sp.get("beds") || 0),
    maxPrice: +(sp.get("maxPrice") || 4000000), favOnly: false,
    strategy: sp.get("strategy") || "", minCap: 0, sort: sp.get("sort") || "match",
    parking: false, outdoor: false, minWalk: 0, minSchool: 0,
  }));
  const [favs, setFavs] = useState(() => new Set(loadJSON(FAV_KEY, [])));
  const [compareIds, setCompareIds] = useState([]);
  const [heatOn, setHeatOn] = useState(false);
  const [heatMode, setHeatMode] = useState("price");
  const [basemap, setBasemap] = useState("light"); // "light" | "satellite"
  const [area, setArea] = useState(null);          // { lat, lng, radius }
  const [areaDraw, setAreaDraw] = useState(false);
  const [radius, setRadius] = useState(1500);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [detailId, setDetailId] = useState(sp.get("focus") ? +sp.get("focus") : null);
  const [analyzerId, setAnalyzerId] = useState(null);
  const [showCompare, setShowCompare] = useState(false);
  const [searches, setSearches] = useState(() => loadJSON(SS_KEY, []));
  const [myLoc, setMyLoc] = useState(null);          // { lat, lng, hood, city, hLat, hLng, distKm }
  const [geoStatus, setGeoStatus] = useState("idle"); // idle | locating | ready | error
  const [geoError, setGeoError] = useState("");

  useEffect(() => { localStorage.setItem(FAV_KEY, JSON.stringify([...favs])); }, [favs]);
  useEffect(() => { localStorage.setItem(SS_KEY, JSON.stringify(searches)); }, [searches]);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const prefs = {
    budget: f.maxPrice < 4000000 ? f.maxPrice : null, minBeds: f.beds,
    parking: f.parking, outdoor: f.outdoor, minWalk: f.minWalk, minSchool: f.minSchool,
  };
  const computeMatch = (l) => matchScore(l, prefs, NEIGHBORHOOD_INFO[l.neighborhood]);

  const filtered = useMemo(() => {
    let rows = ALL.filter((l) =>
      (!f.city || l.city === f.city) && (!f.hood || l.neighborhood === f.hood) &&
      (!f.cat || l.category === f.cat) && l.beds >= f.beds && l.price <= f.maxPrice &&
      (!f.favOnly || favs.has(l.id)) && (!f.strategy || l.strategy === f.strategy) &&
      l.capRate * 100 >= f.minCap &&
      (!area || distanceMeters(area.lat, area.lng, l.lat, l.lng) <= area.radius));
    const cmp = {
      match: (a, b) => computeMatch(b) - computeMatch(a),
      deal: (a, b) => b.dealScore - a.dealScore,
      cap: (a, b) => b.capRate - a.capRate,
      opportunity: (a, b) => b.opportunityScore - a.opportunityScore,
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      psf: (a, b) => a.psf - b.psf,
    }[f.sort];
    return [...rows].sort(cmp);
  }, [f, favs, area]);

  // Geolocate the user, snap to the nearest covered neighborhood, then
  // focus the results there and queue up the top deals for comparison.
  const findNearbyDeals = () => {
    if (!("geolocation" in navigator)) {
      setGeoStatus("error"); setGeoError("Geolocation isn't supported by this browser.");
      return;
    }
    setGeoStatus("locating"); setGeoError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        let best = null;
        for (const c of CITIES) for (const n of c.neighborhoods) {
          const d = distanceMeters(lat, lng, n.lat, n.lng);
          if (!best || d < best.d) best = { d, hood: n.name, city: c.name, lat: n.lat, lng: n.lng };
        }
        if (!best) { setGeoStatus("error"); setGeoError("No markets available."); return; }
        setMyLoc({ lat, lng, hood: best.hood, city: best.city, hLat: best.lat, hLng: best.lng, distKm: best.d / 1000 });
        setF((s) => ({ ...s, city: best.city, hood: best.hood, cat: "", favOnly: false, sort: "deal" }));
        setArea(null); setAreaDraw(false);
        const top = ALL.filter((l) => l.neighborhood === best.hood)
          .sort((a, b) => b.dealScore - a.dealScore).slice(0, 4).map((l) => l.id);
        setCompareIds(top);
        setGeoStatus("ready");
        if (top.length >= 2) setShowCompare(true);
      },
      (err) => {
        setGeoStatus("error");
        setGeoError(err.code === 1 ? "Location permission denied — allow it in your browser to use this." : "Couldn't get your location. Try again.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };
  const clearNearby = () => { setMyLoc(null); setGeoStatus("idle"); setGeoError(""); setF((s) => ({ ...s, hood: "" })); };

  const handleMapClick = (lat, lng) => {
    if (!areaDraw) return;
    setArea({ lat, lng, radius });
    setAreaDraw(false);
  };
  const clearArea = () => { setArea(null); setAreaDraw(false); };

  const cityObj = CITIES.find((c) => c.name === f.city);
  // While the located neighborhood is still the active filter, center on it.
  const useMyCenter = myLoc && myLoc.hood === f.hood && myLoc.city === f.city;
  const mapCenter = useMyCenter ? [myLoc.hLat, myLoc.hLng] : (cityObj ? cityObj.center : null);
  const mapZoom = useMyCenter ? 14 : (cityObj ? cityObj.zoom : 12);
  const hoodNames = (cityObj ? cityObj.neighborhoods.map((n) => n.name) : Object.keys(hoodStats)).sort();
  const s = summarize(filtered);

  const toggleFav = (id) => setFavs((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleCompare = (id) => setCompareIds((p) => p.includes(id) ? p.filter((x) => x !== id) : p.length < 4 ? [...p, id] : p);
  const compareItems = compareIds.map((id) => ALL.find((l) => l.id === id)).filter(Boolean);

  const detail = detailId && ALL.find((l) => l.id === detailId);
  const analyzer = analyzerId && ALL.find((l) => l.id === analyzerId);

  const reset = () => { setF({ city: "", hood: "", cat: "", beds: 0, maxPrice: 4000000, favOnly: false, strategy: "", minCap: 0, sort: "match", parking: false, outdoor: false, minWalk: 0, minSchool: 0 }); setMyLoc(null); setGeoStatus("idle"); setGeoError(""); };

  const saveSearch = () => {
    const name = prompt("Name this saved search:");
    if (!name) return;
    setSearches((p) => [...p, { name, f: { ...f }, alert: true }]);
  };
  const matchCount = (sf) => ALL.filter((l) =>
    (!sf.city || l.city === sf.city) && (!sf.cat || l.category === sf.cat) &&
    l.beds >= (sf.beds || 0) && l.price <= (sf.maxPrice || Infinity) &&
    (!sf.strategy || l.strategy === sf.strategy) && l.capRate * 100 >= (sf.minCap || 0)).length;

  return (
    <div className="deals-view">
      <div className="deals-header">
        <div><h2>Find Deals</h2><p className="muted-inline">Map-based deal finder with live valuation &amp; analytics</p></div>
        <div className="kpis">
          <div className="kpi"><div className="v">{s.total}</div><div className="k">Listings</div></div>
          <div className="kpi"><div className="v" style={{ color: "var(--green)" }}>{s.counts.undervalued}</div><div className="k">Deals</div></div>
          <div className="kpi"><div className="v">{fmtMoneyShort(s.medianPrice || 0)}</div><div className="k">Median</div></div>
        </div>
      </div>

      <div className={"layout" + (leftCollapsed ? " left-collapsed" : "") + (rightCollapsed ? " right-collapsed" : "")}>
        {/* filters */}
        <aside className="panel left">
          <section className="card nearme-card">
            <h2>📍 Near me</h2>
            {!myLoc && geoStatus !== "error" && (
              <p className="muted-inline">Find the closest deals to where you are right now.</p>
            )}
            {geoStatus === "error" && (
              <p className="muted-inline" style={{ color: "var(--red)" }}>{geoError}</p>
            )}
            {myLoc && (
              <div className="nearme-info">
                <div>Nearest market: <b>{myLoc.hood}, {myLoc.city}</b></div>
                <div className="muted-inline">
                  {myLoc.distKm < 1 ? "Under 1 km" : `${Math.round(myLoc.distKm).toLocaleString()} km`} away · {filtered.length} listings nearby
                </div>
              </div>
            )}
            <button className="reset" onClick={findNearbyDeals} disabled={geoStatus === "locating"}>
              {geoStatus === "locating" ? "Locating…" : myLoc ? "↻ Refresh location" : "📍 Use my location"}
            </button>
            {myLoc && (
              <>
                <button className="contact-btn" style={{ width: "100%", marginTop: 8 }}
                  disabled={compareItems.length < 2} onClick={() => setShowCompare(true)}>
                  Compare top {compareItems.length} nearby
                </button>
                <button className="reset" onClick={clearNearby}>Clear</button>
              </>
            )}
          </section>

          <section className="card">
            <h2>Saved searches</h2>
            <div className="saved-list">
              {searches.length === 0 && <div className="muted-inline">No saved searches yet.</div>}
              {searches.map((ss, i) => (
                <div className="saved-item" key={i}>
                  <button className="saved-apply" onClick={() => setF((cur) => ({ ...cur, ...ss.f }))}>
                    <span className="saved-name">{ss.name}</span>
                    <span className="muted-inline">{matchCount(ss.f)} matches</span>
                  </button>
                  <button className={"saved-alert" + (ss.alert ? " on" : "")} onClick={() => setSearches((p) => p.map((x, j) => j === i ? { ...x, alert: !x.alert } : x))}>🔔</button>
                  <button className="saved-del" onClick={() => setSearches((p) => p.filter((_, j) => j !== i))}>×</button>
                </div>
              ))}
            </div>
            <button className="reset" onClick={saveSearch}>＋ Save current search</button>
          </section>

          <section className="card">
            <h2>Filters</h2>
            <label>City
              <select value={f.city} onChange={(e) => setF((s) => ({ ...s, city: e.target.value, hood: "" }))}>
                <option value="">All cities</option>
                {CITIES.map((c) => <option key={c.name}>{c.name}</option>)}
              </select>
            </label>
            <label>Neighborhood
              <select value={f.hood} onChange={(e) => set("hood", e.target.value)}>
                <option value="">All</option>
                {hoodNames.map((n) => <option key={n}>{n}</option>)}
              </select>
            </label>
            <label>Value
              <select value={f.cat} onChange={(e) => set("cat", e.target.value)}>
                <option value="">All</option><option value="undervalued">Undervalued (deals)</option>
                <option value="fair">Fairly priced</option><option value="overpriced">Overpriced</option>
              </select>
            </label>
            <label>Min beds
              <select value={f.beds} onChange={(e) => set("beds", +e.target.value)}>
                <option value="0">Any</option><option value="1">1+</option><option value="2">2+</option><option value="3">3+</option><option value="4">4+</option>
              </select>
            </label>
            <label>Max price: {f.maxPrice < 4000000 ? fmtMoneyShort(f.maxPrice) : "Any"}
              <input type="range" min="500000" max="4000000" step="50000" value={f.maxPrice} onChange={(e) => set("maxPrice", +e.target.value)} />
            </label>
            <label className="check"><input type="checkbox" checked={f.favOnly} onChange={(e) => set("favOnly", e.target.checked)} /> ★ Favorites only {favs.size ? `(${favs.size})` : ""}</label>
            <button className="reset" onClick={reset}>Reset filters</button>
          </section>

          <section className="card">
            <h2>Find your match</h2>
            <label className="check"><input type="checkbox" checked={f.parking} onChange={(e) => set("parking", e.target.checked)} /> Must have parking</label>
            <label className="check"><input type="checkbox" checked={f.outdoor} onChange={(e) => set("outdoor", e.target.checked)} /> Outdoor space</label>
            <label>Min walk score: {f.minWalk || "Any"}<input type="range" min="0" max="100" step="5" value={f.minWalk} onChange={(e) => set("minWalk", +e.target.value)} /></label>
            <label>Min school rating: {f.minSchool ? f.minSchool + "/10" : "Any"}<input type="range" min="0" max="10" step="1" value={f.minSchool} onChange={(e) => set("minSchool", +e.target.value)} /></label>
          </section>

          <section className="card">
            <h2>Investor filters</h2>
            <label>Strategy
              <select value={f.strategy} onChange={(e) => set("strategy", e.target.value)}>
                <option value="">Any</option><option>Buy &amp; Hold</option><option>Turnkey rental</option>
                <option>Value-add</option><option>Fix &amp; Flip</option><option>Speculative</option>
              </select>
            </label>
            <label>Min cap rate: {f.minCap ? f.minCap + "%+" : "Any"}<input type="range" min="0" max="8" step="0.5" value={f.minCap} onChange={(e) => set("minCap", +e.target.value)} /></label>
          </section>

          {area && (
            <section className="card">
              <h2>Area search</h2>
              <p className="muted-inline">Showing listings within the drawn radius.</p>
              <label>Radius: {(radius / 1000).toFixed(1)} km
                <input type="range" min="300" max="5000" step="100" value={radius}
                  onChange={(e) => { const r = +e.target.value; setRadius(r); setArea((a) => a && { ...a, radius: r }); }} /></label>
              <button className="reset" onClick={clearArea}>Clear area</button>
            </section>
          )}
        </aside>

        {/* map */}
        <div className="map-cell">
          <DealMap listings={filtered} heatOn={heatOn} heatMode={heatMode} basemap={basemap} onSelect={setDetailId}
            center={mapCenter} zoom={mapZoom}
            areaDrawMode={areaDraw} area={area} onMapClick={handleMapClick} />
          <button className="edge-toggle edge-left" title="Hide/show filters" onClick={() => setLeftCollapsed((v) => !v)}>{leftCollapsed ? "▶" : "◀"}</button>
          <button className="edge-toggle edge-right" title="Hide/show deals" onClick={() => setRightCollapsed((v) => !v)}>{rightCollapsed ? "◀" : "▶"}</button>
          <div className="map-controls">
            <button className={"map-btn" + (basemap === "light" ? " active" : "")} onClick={() => setBasemap("light")}>🗺 Map</button>
            <button className={"map-btn" + (basemap === "satellite" ? " active" : "")} onClick={() => setBasemap("satellite")}>🛰 Satellite</button>
            <button className={"map-btn" + (heatOn && heatMode === "price" ? " active" : "")} onClick={() => { setHeatMode("price"); setHeatOn(heatOn && heatMode === "price" ? false : true); }}>🔥 Price</button>
            <button className={"map-btn" + (heatOn && heatMode === "activity" ? " active" : "")} onClick={() => { setHeatMode("activity"); setHeatOn(heatOn && heatMode === "activity" ? false : true); }}>📈 Activity</button>
            <button className={"map-btn" + (areaDraw || area ? " active" : "")} onClick={() => { if (area) clearArea(); else setAreaDraw((v) => !v); }}>📍 Area</button>
          </div>
          {areaDraw && <div className="map-hint">Click the map to drop your search area</div>}
          <div className="map-legend2">
            <div className="ml-row"><span className="ml-dot" style={{ background: "var(--green)" }} />Undervalued</div>
            <div className="ml-row"><span className="ml-dot" style={{ background: "var(--muted)" }} />Fair</div>
            <div className="ml-row"><span className="ml-dot" style={{ background: "var(--red)" }} />Overpriced</div>
            <div className="ml-row ml-size"><span className="ml-dot sm" /><span className="ml-dot lg" />Bubble = deal score</div>
          </div>
        </div>

        {/* results */}
        <aside className="panel right">
          <div className="results-head">
            <h2>Deals</h2>
            <select value={f.sort} onChange={(e) => set("sort", e.target.value)}>
              <option value="match">Best match</option><option value="deal">Best deal score</option>
              <option value="cap">Highest cap rate</option><option value="opportunity">Best opportunity</option>
              <option value="price-asc">Price: low → high</option><option value="price-desc">Price: high → low</option><option value="psf">$ / sqft</option>
            </select>
          </div>
          <div className="results">
            {filtered.length === 0 && <div className="empty">No listings match these filters.</div>}
            {filtered.map((l) => <DealCard key={l.id} l={l} faved={favs.has(l.id)} inCompare={compareIds.includes(l.id)}
              onOpen={() => setDetailId(l.id)} onFav={() => toggleFav(l.id)} onCompare={() => toggleCompare(l.id)} onAnalyze={() => setAnalyzerId(l.id)} />)}
          </div>
        </aside>
      </div>

      {compareItems.length > 0 && (
        <div className="compare-bar" style={{ display: "flex" }}>
          <div className="compare-items">
            {compareItems.map((l) => (
              <div className="cmp-chip" key={l.id}><img src={l.photo} alt="" /><span>{fmtMoneyShort(l.price)}</span>
                <button onClick={() => toggleCompare(l.id)}>×</button></div>
            ))}
          </div>
          <div className="compare-actions">
            <button className="reset" onClick={() => setCompareIds([])}>Clear</button>
            <button className="contact-btn" disabled={compareItems.length < 2} onClick={() => setShowCompare(true)}>Compare</button>
          </div>
        </div>
      )}

      {detail && <DetailModal listing={detail} onClose={() => setDetailId(null)} onAnalyze={(id) => { setDetailId(null); setAnalyzerId(id); }}
        computeMatch={computeMatch} isFav={favs.has(detail.id)} onFav={toggleFav} />}
      {analyzer && <AnalyzerModal listing={analyzer} onClose={() => setAnalyzerId(null)}
        onBack={() => { const id = analyzer.id; setAnalyzerId(null); setDetailId(id); }} />}
      {showCompare && compareItems.length >= 2 && <CompareModal items={compareItems} onClose={() => setShowCompare(false)} onRemove={toggleCompare} />}
    </div>
  );
}

function DealCard({ l, faved, inCompare, onOpen, onFav, onCompare, onAnalyze }) {
  const c = CAT_KEY[l.category];
  const flip = l.strategy === "Fix & Flip" || l.strategy === "Value-add";
  const label = l.category === "undervalued" ? `${Math.abs(l.deltaPct).toFixed(0)}% below market`
    : l.category === "overpriced" ? `${l.deltaPct.toFixed(0)}% above market` : "At market";
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };
  return (
    <div className={"listing " + c} onClick={onOpen}>
      <div className="thumb-wrap">
        <img className="thumb" src={l.photo} alt={l.address} loading="lazy" />
        <span className={"thumb-tag " + c}>{label}</span>
        {flip && l.category === "undervalued" && <span className="thumb-gem">💎 Hidden gem</span>}
        <button className={"fav-btn" + (faved ? " on" : "")} onClick={stop(onFav)} title="Save">★</button>
        <button className={"cmp-btn" + (inCompare ? " on" : "")} onClick={stop(onCompare)} title="Compare">⇄</button>
      </div>
      <div className="body">
        <div className="deal-top">
          <div className="price">{fmtMoney(l.price)}</div>
          <span className={"vs-badge " + (l.vsEstimatePct < 0 ? "good" : "bad")}>{l.vsEstimatePct < 0 ? "▼" : "▲"}{Math.abs(l.vsEstimatePct).toFixed(0)}% vs value</span>
        </div>
        <div className="addr">{l.address}</div>
        <div className="meta">{l.neighborhood}, {l.city} · {l.beds} bd · {l.baths} ba · {l.sqft.toLocaleString()} sqft</div>
        <div className="deal-metrics">
          <div><label>Equity</label><b>{fmtMoneyShort(l.equity)}</b></div>
          <div><label>{flip ? "Profit" : "Cash flow"}</label><b>{flip ? fmtMoneyShort(l.estProfit) : fmtMoney(l.cashFlow) + "/mo"}</b></div>
          <div><label>{flip ? "ARV" : "Cap"}</label><b>{flip ? fmtMoneyShort(l.arv) : (l.capRate * 100).toFixed(1) + "%"}</b></div>
          <div><label>Deal</label><b>{l.dealScore}</b></div>
        </div>
        <div className="deal-actions">
          <span className="strat">{l.strategy}</span>
          <button className="analyze-btn" onClick={stop(onAnalyze)}>Analyze deal</button>
        </div>
      </div>
    </div>
  );
}
