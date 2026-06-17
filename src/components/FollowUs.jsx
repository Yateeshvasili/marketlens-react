import { useEffect, useRef, useState } from "react";

export default function FollowUs() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);
  return (
    <div className={"follow" + (open ? " open" : "")} ref={ref}>
      <div className="follow-bubbles">
        <a className="bubble li" href="https://www.linkedin.com" target="_blank" rel="noopener" aria-label="LinkedIn">in</a>
        <a className="bubble ig" href="https://www.instagram.com" target="_blank" rel="noopener" aria-label="Instagram">◎</a>
        <a className="bubble fb" href="https://www.facebook.com" target="_blank" rel="noopener" aria-label="Facebook">f</a>
      </div>
      <button className="follow-fab" onClick={() => setOpen((o) => !o)} aria-label="Follow us">
        <span className="follow-ico">♥</span> Follow us
      </button>
    </div>
  );
}
