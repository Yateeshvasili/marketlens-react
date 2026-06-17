import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ALL } from "../lib/store.js";
import { summarize } from "../lib/analytics.js";
import Reveal, { CountUp } from "../components/Reveal.jsx";
import { useAssistant } from "../components/Assistant.jsx";
import MicButton from "../components/MicButton.jsx";

const CHIPS = ["Undervalued flips under $1M", "Best cap rate in Miami", "3-bed deals in Austin"];

export default function Home() {
  const { ask } = useAssistant();
  const [val, setVal] = useState("");

  const stats = useMemo(() => {
    const s = summarize(ALL);
    const deals = ALL.filter((l) => l.category === "undervalued").length;
    const cities = new Set(ALL.map((l) => l.city)).size;
    const avgCap = ((ALL.reduce((a, l) => a + l.capRate, 0) / ALL.length) * 100).toFixed(1);
    return { total: s.total, deals, cities, avgCap };
  }, []);

  const submit = (e) => { e.preventDefault(); if (val.trim()) { ask(val); setVal(""); } };

  return (
    <section>
      <div className="hero2">
        <div className="hero-copy">
          <span className="eyebrow">Real-estate deal intelligence</span>
          <h1>Find undervalued deals<br />before everyone else.</h1>
          <p className="hero-sub">
            MarketLens scores every listing against its neighborhood, estimates fair value,
            and surfaces the deals worth your money — with the analytics to back every decision.
          </p>

          <form className="ai-box" onSubmit={submit}>
            <div className="ai-row">
              <span className="ai-ico">✦</span>
              <input value={val} onChange={(e) => setVal(e.target.value)} autoComplete="off"
                placeholder="Ask AI — e.g. cash-flow rentals in Austin under $1M" />
              <MicButton onText={setVal} onFinal={(t) => { if (t) { ask(t); setVal(""); } }} />
              <button type="submit" className="ai-send">Ask AI →</button>
            </div>
            <span className="ai-hint">⏎ to send · the more detail, the better the match</span>
          </form>
          <div className="ai-chips">
            {CHIPS.map((c) => (
              <button key={c} type="button" className="ai-chip" onClick={() => ask(c)}>{c}</button>
            ))}
          </div>

          <div className="hero-actions">
            <Link className="btn btn-primary" to="/deals">Find deals →</Link>
            <Link className="btn btn-ghost" to="/about">Book a consultation</Link>
          </div>
          <div className="hero-rating"><span className="stars">★★★★★</span> <b>4.9</b>/5 · loved by 2,000+ investors</div>
          <div className="hero-stats">
            <div><span><CountUp value={stats.total} /></span>listings analyzed</div>
            <div><span><CountUp value={stats.deals} /></span>deals flagged</div>
            <div><span><CountUp value={stats.cities} /></span>markets</div>
            <div><span><CountUp value={stats.avgCap} suffix="%" /></span>avg cap rate</div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="mock-window">
            <div className="mock-bar"><span></span><span></span><span></span><em>MarketLens · Find Deals</em></div>
            <div className="mock-body">
              <img className="mock-mapimg" src="https://images.unsplash.com/photo-1518391846015-55a9cc003b25?w=820&fit=crop&q=75" alt="Aerial neighborhood" />
              <span className="mock-pin good" style={{ left: "30%", top: "36%" }}></span>
              <span className="mock-pin" style={{ left: "62%", top: "30%" }}></span>
              <span className="mock-pin" style={{ left: "50%", top: "54%" }}></span>
              <div className="mock-rating">★ 4.9 · investor-rated</div>
              <div className="mock-card">
                <div className="mock-card-top"><strong>$1,250,000</strong><span className="vs-badge good">▼ 22% vs value</span></div>
                <div className="mock-addr">137 Sanchez St · Mission, SF</div>
                <div className="mock-metrics">
                  <div><label>Equity</label><b>$355K</b></div>
                  <div><label>Cap</label><b>4.6%</b></div>
                  <div><label>Deal</label><b>84</b></div>
                </div>
                <div className="mock-cta">Fix &amp; Flip · Analyze deal →</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Reveal className="trust">
        <span>Deal intelligence across</span>
        <b>Seattle</b><b>San Francisco</b><b>Austin</b><b>New York</b><b>Miami</b>
      </Reveal>

      <div className="page">
        <FRow eyebrow="Find deals" title="Spot the deals on a live map"
          body="Browse listings across five U.S. metros with value flags, a price heatmap, and an investor-activity overlay showing where the smart money is buying."
          cta="Open the deal finder →" img="1477959858617-67f85cf4f1df" />
        <FRow alt eyebrow="Underwrite" title="Analyze any deal in seconds"
          body="The Deal Analyzer runs the numbers live — purchase, rehab, ARV, financing into profit, ROI, cap rate, and cash flow — alongside LiveCMA comparable sales."
          cta="Try the analyzer →" img="1551288049-bebda4e38f71" />
        <FRow eyebrow="Never miss out" title="Save searches & get alerts"
          body="Save your buy-box, see live match counts, and turn on alerts so new deals that fit your criteria find you — not the other way around."
          cta="Set up a search →" img="1582407947304-fd86f028f716" />
      </div>

      <div className="section">
        <Reveal as="h2" className="section-title">Built for every investment strategy</Reveal>
        <div className="feature-grid">
          {[["🔨", "Fix & Flip", "ARV, rehab, and projected profit on undervalued, value-add properties."],
            ["🏦", "Buy & Hold", "Cap rate, cash flow, and cash-on-cash for long-term rentals."],
            ["🔑", "Turnkey rental", "Move-in-ready income properties ranked by yield and condition."],
            ["📈", "Value-add", "Below-market homes with upside once light improvements are made."]].map(([i, h, p]) => (
            <Reveal key={h} className="feature"><div className="feature-ico">{i}</div><h3>{h}</h3><p>{p}</p></Reveal>
          ))}
        </div>
      </div>

      <div className="section">
        <Reveal as="h2" className="section-title">How it works</Reveal>
        <div className="steps">
          {[["1", "Search the market", "Filter by city, strategy, budget, cap rate — or just ask the AI."],
            ["2", "Analyze the deal", "One click opens full underwriting with comps and projected returns."],
            ["3", "Act with confidence", "Save searches, set alerts, and talk to us when you're ready to move."]].map(([n, h, p]) => (
            <Reveal key={n} className="step"><span className="step-n">{n}</span><h3>{h}</h3><p>{p}</p></Reveal>
          ))}
        </div>
      </div>

      <div className="section">
        <Reveal as="h2" className="section-title">Investors move faster with MarketLens</Reveal>
        <div className="feature-grid t-grid">
          {[["RM", "Ravi M.", "Fix & flip investor · Austin", "I found a flip 18% under value in my first afternoon. The analyzer paid for itself."],
            ["JL", "Jordan L.", "Buy & hold · Seattle", "The saved-search alerts mean I see cash-flow rentals before they hit the big sites."],
            ["SP", "Sara P.", "Agent & investor · Miami", "Underwriting that used to take a spreadsheet evening now takes thirty seconds."]].map(([av, who, role, q]) => (
            <Reveal key={who} className="tcard">
              <p>"{q}"</p>
              <div className="twho"><span className="tav">{av}</span><div><b>{who}</b><span>{role}</span></div></div>
            </Reveal>
          ))}
        </div>
      </div>

      <Reveal className="cta-band">
        <h2>Start finding deals today</h2>
        <p>Explore free, or book a consultation and we'll find deals with you.</p>
        <div className="hero-actions">
          <Link className="btn btn-primary" to="/deals">Find deals</Link>
          <Link className="btn btn-ghost" to="/pricing">See pricing</Link>
        </div>
      </Reveal>

      <div className="section faq-wrap">
        <Reveal as="h2" className="section-title">Frequently asked</Reveal>
        <Reveal className="faq">
          <details><summary>Where does the data come from?</summary><p>This demo runs on representative sample data across five U.S. metros. In production it connects to a live listings/MLS feed.</p></details>
          <details><summary>How is "fair value" calculated?</summary><p>An automated valuation (AVM) scores each property against its neighborhood's price-per-sqft, adjusted for condition.</p></details>
          <details><summary>Which strategies are supported?</summary><p>Fix &amp; Flip, Buy &amp; Hold, Turnkey rental, and Value-add — each with the metrics that matter.</p></details>
          <details><summary>Is there an AI assistant?</summary><p>Yes — ask in plain English and it finds and analyzes deals for you.</p></details>
        </Reveal>
      </div>

      <footer className="site-foot">© 2026 MarketLens · Real-estate deal intelligence · Demo data</footer>
    </section>
  );
}

function FRow({ alt, eyebrow, title, body, cta, img }) {
  return (
    <Reveal className={"frow" + (alt ? " alt" : "")}>
      <div className="frow-text">
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{body}</p>
        <Link className="btn btn-ghost" to="/deals">{cta}</Link>
      </div>
      <div className="frow-visual">
        <img className="fimg" src={`https://images.unsplash.com/photo-${img}?w=800&fit=crop&q=75`} alt="" />
      </div>
    </Reveal>
  );
}
