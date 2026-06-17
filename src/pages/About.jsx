import { useState } from "react";

export default function About() {
  const [done, setDone] = useState(false);
  return (
    <section className="page">
      <h1 className="page-title">About MarketLens</h1>
      <p className="about-lead">
        MarketLens helps investors and buyers <b>explore and evaluate location-based listings</b> through
        interactive visualization and data-driven insights — surfacing <b>relative value, market
        positioning, and the best deals</b> without endless manual research.
      </p>
      <div className="about-cols">
        <div>
          <h3 className="about-h3">What we do</h3>
          <ul className="about-list">
            <li>📊 Make complex listing data easy to <b>explore and compare</b></li>
            <li>🗺️ Provide visual tools for <b>geographic discovery</b></li>
            <li>🔥 Highlight <b>pricing anomalies</b> &amp; investor activity</li>
            <li>💎 Surface <b>high-value opportunities</b> and hidden gems</li>
            <li>🧭 Deliver insights through <b>intuitive analytics</b></li>
          </ul>
        </div>
        <div className="contact-card-inline">
          <h3 className="about-h3">Book a consultation</h3>
          <p className="muted-inline">Tell us your goals and we'll find deals with you.</p>
          <form className="consult-form" onSubmit={(e) => { e.preventDefault(); setDone(true); e.target.reset(); }}>
            <input type="text" placeholder="Your name" required />
            <input type="email" placeholder="Email" required />
            <textarea placeholder="What are you looking for? (e.g. cash-flow rentals in Austin under $1M)" rows="3"></textarea>
            <button type="submit" className="btn btn-primary">Request consultation</button>
            {done && <span className="muted-inline">✓ Thanks — we'll be in touch.</span>}
          </form>
          <ul className="contact-list">
            <li><span className="contact-ico">✉️</span><div><label>Email</label><a href="mailto:hello@marketlens.app">hello@marketlens.app</a></div></li>
            <li><span className="contact-ico">📞</span><div><label>Phone</label><a href="tel:+14155550142">+1 (415) 555-0142</a></div></li>
            <li><span className="contact-ico">📍</span><div><label>Office</label><span>535 Mission St, San Francisco, CA 94105</span></div></li>
            <li><span className="contact-ico">🕘</span><div><label>Hours</label><span>Mon–Fri, 9am–6pm PT</span></div></li>
          </ul>
        </div>
      </div>
      <footer className="site-foot">© 2026 MarketLens · Real-estate deal intelligence · Demo data</footer>
    </section>
  );
}
