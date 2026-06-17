import { useState } from "react";
import { ALL, NEIGHBORHOOD_INFO } from "../lib/store.js";
import { findComps, pricePercentile } from "../lib/analytics.js";
import { fmtMoney, fmtMoneyShort, CAT_KEY } from "../lib/format.js";

function Modal({ onClose, wide, children }) {
  return (
    <div className="modal" style={{ display: "flex" }} onClick={(e) => { if (e.target.classList.contains("modal-backdrop")) onClose(); }}>
      <div className="modal-backdrop" />
      <div className={"modal-card" + (wide ? " market-card" : "")}>
        <button className="modal-close" onClick={onClose}>×</button>
        {children}
      </div>
    </div>
  );
}

export function DetailModal({ listing: l, onClose, onAnalyze, computeMatch, isFav, onFav }) {
  const info = NEIGHBORHOOD_INFO[l.neighborhood] || {};
  const comps = findComps(l, ALL, 4);
  const pct = pricePercentile(l, ALL);
  const c = CAT_KEY[l.category];
  const flip = l.strategy === "Fix & Flip" || l.strategy === "Value-add";
  const sign = (n) => (n >= 0 ? "+" : "") + n.toFixed(1) + "%";
  const match = computeMatch(l);
  const bar = (label, val, max) => (
    <div className="nf-row"><span>{label}</span>
      <span className="nf-bar"><i style={{ width: Math.round((val / max) * 100) + "%" }} /></span>
      <b>{val}{max === 10 ? "/10" : ""}</b></div>
  );

  return (
    <Modal onClose={onClose}>
      <img className="detail-photo" src={l.photo} alt={l.address} />
      <div className="detail-head">
        <div>
          <div className="price" style={{ fontSize: 22 }}>{fmtMoney(l.price)}</div>
          <div className="addr">{l.address}, {l.neighborhood}, {l.city}</div>
        </div>
        <span className={"tag " + c}>{l.category === "undervalued" ? `${Math.abs(l.deltaPct).toFixed(0)}% below market`
          : l.category === "overpriced" ? `${l.deltaPct.toFixed(0)}% above market` : "At market"}</span>
      </div>

      <div className="detail-stats">
        <div><span>{l.beds}</span>beds</div>
        <div><span>{l.baths}</span>baths</div>
        <div><span>{l.sqft.toLocaleString()}</span>sqft</div>
        <div><span>{fmtMoney(l.psf)}</span>$/sqft</div>
        <div><span>{l.yearBuilt}</span>built</div>
        <div><span>{l.type}</span>type</div>
      </div>

      <div className="positioning">
        <label>Market positioning in {l.neighborhood}</label>
        <div className="pos-track"><i style={{ left: pct + "%" }} /></div>
        <div className="pos-scale"><span>Lower</span><span><b>{pct}th percentile</b></span><span>Higher</span></div>
      </div>

      <h3>Why this matches you</h3>
      <div className="match-big"><span className="match-bar lg"><i style={{ width: match + "%" }} /></span><b>{match}% match</b></div>

      <h3>Investment analysis</h3>
      <div className="facts-grid invest-grid">
        <div><label>Est. value (AVM)</label><span>{fmtMoneyShort(l.estValue)}</span></div>
        <div><label>List vs AVM</label><span style={{ color: l.vsEstimatePct < 0 ? "var(--green)" : "var(--muted)" }}>{sign(l.vsEstimatePct)}</span></div>
        <div><label>Confidence</label><span>{l.valConfidence}%</span></div>
        <div><label>12-mo forecast</label><span style={{ color: "var(--green)" }}>+{info.appreciation ?? 3}%</span></div>
        <div><label>Est. rent / mo</label><span>{fmtMoney(l.rentEstimate)}</span></div>
        <div><label>Cap rate</label><span>{(l.capRate * 100).toFixed(1)}%</span></div>
        <div><label>Gross yield</label><span>{(l.grossYield * 100).toFixed(1)}%</span></div>
        <div><label>Cash flow / mo</label><span style={{ color: l.cashFlow >= 0 ? "var(--green)" : "var(--red)" }}>{fmtMoney(l.cashFlow)}</span></div>
      </div>
      <div className="strat-row">
        <span className="strat">{l.strategy}</span>
        <span className="muted-inline">Deal score</span>
        <span className="match-bar" style={{ flex: 1 }}><i style={{ width: l.dealScore + "%" }} /></span>
        <b>{l.dealScore}</b>
      </div>
      {flip && (
        <div className="flip-box">
          <div><label>Est. ARV</label><span>{fmtMoneyShort(l.arv)}</span></div>
          <div><label>Est. rehab</label><span>{fmtMoney(l.rehab)}</span></div>
          <div><label>Est. profit</label><span style={{ color: l.estProfit > 0 ? "var(--green)" : "var(--red)" }}>{fmtMoney(l.estProfit)}</span></div>
        </div>
      )}

      <h3>The facts <span className="muted-inline">— not just photos</span></h3>
      <div className="facts-grid">
        <div><label>Condition</label><span>{l.condition}</span></div>
        <div><label>Parking</label><span>{l.parking ? "Yes" : "None"}</span></div>
        <div><label>Outdoor</label><span>{l.outdoor}</span></div>
        <div><label>HOA / mo</label><span>{l.hoa ? fmtMoney(l.hoa) : "—"}</span></div>
      </div>
      <ul className="issues">
        {l.issues.length ? l.issues.map((i) => <li key={i}>⚠️ {i}</li>) : <li>✅ No major issues flagged</li>}
      </ul>

      <h3>Neighborhood fit — {l.neighborhood}</h3>
      <div className="nf">
        {bar("Walkability", info.walk ?? 60, 100)}
        {bar("Transit", info.transit ?? 60, 100)}
        {bar("Schools", info.school ?? 6, 10)}
        {bar("Safety", info.safety ?? 60, 100)}
        {bar("Quiet", 100 - (info.noise ?? 40), 100)}
      </div>
      <div className="amens">{(info.amenities || []).map((a) => <span className="amen" key={a}>{a}</span>)}</div>

      <h3>Comparable listings</h3>
      <div className="comps">
        {comps.map((cp) => (
          <div className="comp" key={cp.id}>
            <img src={cp.photo} alt="" />
            <div className="comp-body"><div>{cp.address}</div><div className="muted-inline">{cp.beds} bd · {cp.sqft.toLocaleString()} sqft · {fmtMoney(cp.psf)}/sqft</div></div>
            <div className="comp-price">{fmtMoneyShort(cp.price)}</div>
          </div>
        ))}
      </div>

      <div className="detail-actions">
        <button className="reset" onClick={() => onAnalyze(l.id)}>Analyze deal</button>
        <button className={"reset" + (isFav ? " fav-active" : "")} onClick={() => onFav(l.id)}>{isFav ? "★ Saved" : "☆ Save listing"}</button>
      </div>
    </Modal>
  );
}

function computeDeal(inp) {
  const loan = inp.purchase * (1 - inp.downPct / 100);
  const mr = inp.rate / 100 / 12;
  const pmt = mr > 0 ? (loan * mr) / (1 - Math.pow(1 + mr, -inp.term * 12)) : loan / (inp.term * 12);
  const down = inp.purchase * (inp.downPct / 100);
  const closing = inp.purchase * 0.02;
  const holdingCosts = (pmt + (inp.purchase * 0.02) / 12) * inp.holdMonths;
  const sellingCosts = inp.arv * 0.08;
  const flipProfit = inp.arv - (inp.purchase + inp.rehab + holdingCosts + sellingCosts + closing);
  const flipCash = down + inp.rehab + holdingCosts + closing;
  const flipRoi = flipCash > 0 ? (flipProfit / flipCash) * 100 : 0;
  const noiAnnual = inp.rent * 12 * 0.62;
  const capRate = (noiAnnual / inp.purchase) * 100;
  const cashFlowMo = (noiAnnual - pmt * 12) / 12;
  const rentalCash = down + inp.rehab + closing;
  const cashOnCash = rentalCash > 0 ? ((noiAnnual - pmt * 12) / rentalCash) * 100 : 0;
  const equity = inp.arv - inp.purchase - inp.rehab;
  return { pmt, flipProfit, flipRoi, holdingCosts, capRate, cashFlowMo, cashOnCash, equity };
}

export function AnalyzerModal({ listing: l, onClose, onBack }) {
  const [inp, setInp] = useState({
    purchase: l.price, rehab: l.rehab, arv: l.arv, rent: l.rentEstimate,
    downPct: 25, rate: 7, term: 30, holdMonths: 6,
  });
  const d = computeDeal(inp);
  const comps = findComps(l, ALL, 4);
  const set = (k) => (e) => setInp({ ...inp, [k]: parseFloat(e.target.value) || 0 });
  const col = (n) => (n >= 0 ? "var(--green)" : "var(--red)");
  const field = (k, label, step) => (
    <label className="az-field">{label}<input type="number" step={step || 1} value={inp[k]} onChange={set(k)} /></label>
  );
  return (
    <Modal onClose={onClose} wide>
      {onBack && <button className="modal-back" onClick={onBack} aria-label="Back to listing" title="Back to listing">←</button>}
      <h2 className="contact-h">Deal Analyzer</h2>
      <div className="az-head">
        <img src={l.photo} alt="" />
        <div>
          <div className="addr" style={{ fontSize: 14 }}>{l.address}, {l.neighborhood}, {l.city}</div>
          <div className="muted-inline">{l.type} · {l.beds} bd · {l.baths} ba · {l.sqft.toLocaleString()} sqft · AVM {fmtMoneyShort(l.estValue)}</div>
        </div>
      </div>
      <div className="az-grid">
        {field("purchase", "Purchase price", 5000)}
        {field("rehab", "Rehab budget", 1000)}
        {field("arv", "After-repair value", 5000)}
        {field("rent", "Monthly rent", 50)}
        {field("downPct", "Down payment %", 1)}
        {field("rate", "Interest rate %", 0.25)}
        {field("term", "Loan term (yrs)", 1)}
        {field("holdMonths", "Flip hold (months)", 1)}
      </div>
      <div className="az-out">
        <div className="az-col">
          <h3>Fix &amp; Flip</h3>
          <div className="az-row"><span>Est. profit</span><b style={{ color: col(d.flipProfit) }}>{fmtMoney(d.flipProfit)}</b></div>
          <div className="az-row"><span>ROI on cash</span><b style={{ color: col(d.flipRoi) }}>{d.flipRoi.toFixed(0)}%</b></div>
          <div className="az-row"><span>Holding costs</span><b>{fmtMoney(d.holdingCosts)}</b></div>
          <div className="az-row"><span>Instant equity</span><b style={{ color: col(d.equity) }}>{fmtMoney(d.equity)}</b></div>
        </div>
        <div className="az-col">
          <h3>Buy &amp; Hold</h3>
          <div className="az-row"><span>Cap rate</span><b>{d.capRate.toFixed(1)}%</b></div>
          <div className="az-row"><span>Cash flow / mo</span><b style={{ color: col(d.cashFlowMo) }}>{fmtMoney(d.cashFlowMo)}</b></div>
          <div className="az-row"><span>Cash-on-cash</span><b style={{ color: col(d.cashOnCash) }}>{d.cashOnCash.toFixed(1)}%</b></div>
          <div className="az-row"><span>Mortgage / mo</span><b>{fmtMoney(d.pmt)}</b></div>
        </div>
      </div>
      <h3>LiveCMA — comparable sales</h3>
      <table className="cmp-table az-comps">
        <thead><tr><th>Address</th><th>Price</th><th>Sqft</th><th>$/sqft</th><th>Beds</th></tr></thead>
        <tbody>
          {comps.map((c) => (
            <tr key={c.id}><td>{c.address}</td><td>{fmtMoneyShort(c.price)}</td><td>{c.sqft.toLocaleString()}</td><td>{fmtMoney(c.psf)}</td><td>{c.beds} bd</td></tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}

export function CompareModal({ items, onClose, onRemove }) {
  const info = (l) => NEIGHBORHOOD_INFO[l.neighborhood] || {};
  const rows = [
    ["Price", (l) => fmtMoney(l.price), (l) => l.price, "min"],
    ["$/sqft", (l) => fmtMoney(l.psf), (l) => l.psf, "min"],
    ["Deal score", (l) => l.dealScore, (l) => l.dealScore, "max"],
    ["Cap rate", (l) => (l.capRate * 100).toFixed(1) + "%", (l) => l.capRate, "max"],
    ["Equity", (l) => fmtMoneyShort(l.equity), (l) => l.equity, "max"],
    ["Beds", (l) => l.beds], ["Baths", (l) => l.baths],
    ["Sqft", (l) => l.sqft.toLocaleString(), (l) => l.sqft, "max"],
    ["Condition", (l) => l.condition, (l) => l.conditionScore, "max"],
    ["Strategy", (l) => l.strategy],
    ["Walk", (l) => info(l).walk, (l) => info(l).walk, "max"],
    ["Schools", (l) => info(l).school + "/10", (l) => info(l).school, "max"],
  ];
  const best = (raw, dir) => {
    if (!dir) return -1;
    let bi = -1, bv = dir === "min" ? Infinity : -Infinity;
    items.forEach((l, i) => { const v = raw(l); if (dir === "min" ? v < bv : v > bv) { bv = v; bi = i; } });
    return bi;
  };
  return (
    <Modal onClose={onClose} wide>
      <h2 className="contact-h">Side-by-side comparison</h2>
      <div className="compare-table-wrap">
        <table className="cmp-table">
          <thead>
            <tr><th></th>{items.map((l) => (
              <th className="cmp-h" key={l.id}>
                <img src={l.photo} alt="" />
                <div>{l.address}<br /><span className="muted-inline">{l.neighborhood}, {l.city}</span></div>
                <button className="cmp-rm" onClick={() => onRemove(l.id)}>×</button>
              </th>
            ))}</tr>
          </thead>
          <tbody>
            {rows.map(([label, disp, raw, dir]) => {
              const bi = best(raw, dir);
              return <tr key={label}><th>{label}</th>{items.map((l, i) => <td key={l.id} className={i === bi ? "best" : ""}>{disp(l)}</td>)}</tr>;
            })}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
