import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAssistant } from "../components/Assistant.jsx";
import MicButton from "../components/MicButton.jsx";

const SUGGESTIONS = [
  "Deals in Austin under $1M",
  "Best cap rate in Miami",
  "Cheapest 2-bed in Seattle",
  "Hidden gems with parking",
];

export default function Chat() {
  const { msgs, ask, reset } = useAssistant();
  const [val, setVal] = useState("");
  const navigate = useNavigate();
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [msgs]);

  const submit = (e) => { e.preventDefault(); if (val.trim()) { ask(val); setVal(""); } };
  const empty = msgs.length === 0;

  if (empty) {
    return (
      <section className="chatpage empty">
        <div className="chatpage-hero">
          <div className="chat-spark">✦</div>
          <h1>Any deals to explore?</h1>
          <form className="cp-input big" onSubmit={submit}>
            <span className="ai-ico">✦</span>
            <input value={val} onChange={(e) => setVal(e.target.value)} autoFocus autoComplete="off"
              placeholder="Ask MarketLens AI — or tap the mic and talk" />
            <MicButton onText={setVal} onFinal={(t) => { if (t) { ask(t); setVal(""); } }} />
            <button type="submit" aria-label="Send">➤</button>
          </form>
          <div className="ai-chips">
            {SUGGESTIONS.map((c) => <button key={c} type="button" className="ai-chip" onClick={() => ask(c)}>{c}</button>)}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="chatpage">
      <div className="cp-head">
        <div className="chat-title"><span className="chat-dot">✦</span> MarketLens AI</div>
        <button className="reset cp-new" onClick={reset}>＋ New chat</button>
      </div>
      <div className="cp-log" ref={logRef}>
        {msgs.map((m, i) => (
          <div key={i} className={"chat-msg " + m.who}>
            {m.typing
              ? <span className="typing"><i></i><i></i><i></i></span>
              : <span dangerouslySetInnerHTML={{ __html: m.html }} />}
            {m.chips?.map((c) => (
              <a key={c.id} className="chat-listing" onClick={() => navigate("/deals?focus=" + c.id)}>{c.label}</a>
            ))}
          </div>
        ))}
      </div>
      <form className="cp-input bottom" onSubmit={submit}>
        <span className="ai-ico">✦</span>
        <input value={val} onChange={(e) => setVal(e.target.value)} autoFocus autoComplete="off" placeholder="Ask a follow-up… or tap the mic" />
        <MicButton onText={setVal} onFinal={(t) => { if (t) { ask(t); setVal(""); } }} />
        <button type="submit" aria-label="Send">➤</button>
      </form>
    </section>
  );
}
