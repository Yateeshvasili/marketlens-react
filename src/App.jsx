import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Nav from "./components/Nav.jsx";
import FollowUs from "./components/FollowUs.jsx";
import { AssistantProvider } from "./components/Assistant.jsx";
import Home from "./pages/Home.jsx";
import Deals from "./pages/Deals.jsx";
import Markets from "./pages/Markets.jsx";
import Pricing from "./pages/Pricing.jsx";
import About from "./pages/About.jsx";
import Chat from "./pages/Chat.jsx";

export default function App() {
  const loc = useLocation();
  return (
    <AssistantProvider>
      <Nav />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/deals" element={<Deals />} />
          <Route path="/markets" element={<Markets />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/about" element={<About />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {loc.pathname === "/" && <FollowUs />}
    </AssistantProvider>
  );
}
