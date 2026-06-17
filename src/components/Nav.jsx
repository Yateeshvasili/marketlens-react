import { NavLink, Link } from "react-router-dom";

const LINKS = [
  ["/", "Home"],
  ["/deals", "Find Deals"],
  ["/markets", "Markets"],
  ["/pricing", "Pricing"],
  ["/chat", "Ask AI"],
  ["/about", "About"],
];

export default function Nav() {
  return (
    <header className="nav">
      <Link className="nav-brand" to="/"><span className="logo">◎</span> MarketLens</Link>
      <nav className="nav-links">
        {LINKS.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => (isActive ? "active" : "")}>
            {label}
          </NavLink>
        ))}
      </nav>
      <Link className="nav-cta" to="/about">Book a consult</Link>
    </header>
  );
}
