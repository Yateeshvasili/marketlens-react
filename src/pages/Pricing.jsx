import { Link } from "react-router-dom";
import Reveal from "../components/Reveal.jsx";

const PLANS = [
  { name: "Starter", price: "$0", per: "/mo", note: "Explore the market", cta: "Start free", to: "/deals",
    feats: ["Map deal finder", "Value flags & AVM estimate", "3 saved searches", "AI assistant (basic)"] },
  { name: "Investor", price: "$99", per: "/mo", note: "Underwrite & act", cta: "Get Investor", to: "/about", popular: true,
    feats: ["Everything in Starter", "Deal Analyzer + LiveCMA comps", "Investor-activity heatmap", "Unlimited saved searches + alerts", "Compare tray"] },
  { name: "Pro", price: "$199", per: "/mo", note: "For teams & pros", cta: "Talk to sales", to: "/about",
    feats: ["Everything in Investor", "Custom market reports", "Priority consultation", "API & data export"] },
];

export default function Pricing() {
  return (
    <section className="page">
      <h1 className="page-title">Plans that pay for themselves</h1>
      <p className="page-sub">One good deal covers years of MarketLens. Start free, upgrade when you're ready.</p>
      <div className="pricing-grid">
        {PLANS.map((p) => (
          <Reveal key={p.name} className={"plan" + (p.popular ? " popular" : "")}>
            {p.popular && <span className="plan-tag">Most popular</span>}
            <h3>{p.name}</h3>
            <div className="plan-price">{p.price}<span>{p.per}</span></div>
            <p className="muted-inline">{p.note}</p>
            <ul>{p.feats.map((f) => <li key={f}>✓ {f}</li>)}</ul>
            <Link className={"btn " + (p.popular ? "btn-primary" : "btn-ghost")} to={p.to}>{p.cta}</Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
