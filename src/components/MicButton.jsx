import { useRef, useState } from "react";

const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

// Voice input via the browser's Web Speech API.
// onText  → called with the live transcript (interim + final)
// onFinal → called once when the user stops speaking (use to auto-send)
export default function MicButton({ onText, onFinal }) {
  const recRef = useRef(null);
  const [listening, setListening] = useState(false);
  if (!SR) return null; // browser doesn't support speech recognition → hide

  const start = () => {
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      let t = "";
      for (const r of e.results) t += r[0].transcript;
      onText && onText(t);
      if (e.results[e.results.length - 1].isFinal) onFinal && onFinal(t.trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };
  const stop = () => { recRef.current && recRef.current.stop(); setListening(false); };

  return (
    <button type="button" className={"mic-btn" + (listening ? " on" : "")}
      onClick={() => (listening ? stop() : start())}
      aria-label={listening ? "Stop voice input" : "Speak"} title={listening ? "Listening…" : "Speak"}>
      🎤
    </button>
  );
}
