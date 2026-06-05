// ui.jsx — primitivos visuais compartilhados
const { useState, useEffect, useRef } = React;

// Símbolo <V/> da marca
function Mark({ size = 32, color = "var(--accent)" }) {
  const h = size, w = size * 2;
  return (
    <svg width={w} height={h} viewBox="0 0 128 64" fill="none" aria-hidden="true" style={{ display: "block" }}>
      <path d="M30 16 L14 32 L30 48" stroke={color} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M44 19 L58 47 L72 19" stroke={color} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M82 49 L94 15" stroke={color} strokeWidth="6.4" strokeLinecap="round" />
      <path d="M100 16 L116 32 L100 48" stroke={color} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Lockup vinny / tecnologia
function Logo({ markSize = 26, showWordmark = true, sub = true }) {
  return (
    <div className="logo">
      <Mark size={markSize} />
      {showWordmark && (
        <div className="wm">
          <span className="n">vinny</span>
          {sub && <span className="t">tecnologia</span>}
        </div>
      )}
    </div>
  );
}

// Texto com *destaque* → <span class="accent">
function RT({ children }) {
  if (typeof children !== "string") return children;
  const parts = children.split(/(\*[^*]+\*)/g).filter(Boolean);
  return parts.map((p, i) =>
    p.startsWith("*") && p.endsWith("*")
      ? <span key={i} className="accent">{p.slice(1, -1)}</span>
      : <React.Fragment key={i}>{p}</React.Fragment>
  );
}

// Eyebrow monospace "// label"
function Eyebrow({ children }) {
  return <div className="eyebrow"><span className="slash">//</span> {children}</div>;
}

// Detecta UMA vez se o relógio de animação está rodando (em alguns
// previews ele congela em currentTime=0, o que travaria qualquer
// transição/animação e deixaria o conteúdo invisível para sempre).
let _clockRuns = null;
const _clockWaiters = [];
(function detectClock() {
  const a = (document.timeline && document.timeline.currentTime) || 0;
  setTimeout(() => {
    const b = (document.timeline && document.timeline.currentTime) || 0;
    _clockRuns = b > a;
    _clockWaiters.splice(0).forEach((f) => f(_clockRuns));
  }, 90);
})();
function onClock(cb) { if (_clockRuns !== null) cb(_clockRuns); else _clockWaiters.push(cb); }

// Revela ao entrar na viewport. Começa VISÍVEL; só esconde+anima se o
// relógio de animação estiver de fato rodando (caso contrário, conteúdo
// estático garantido).
function Reveal({ children, delay = 0, as = "div", className = "", ...rest }) {
  const ref = useRef(null);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cleanup = null;
    onClock((runs) => {
      if (!runs || !ref.current) return; // congelado → fica visível
      const node = ref.current;
      let done = false;
      const reveal = () => {
        if (done || !ref.current) return;
        done = true;
        setHidden(false);
        ref.current.animate(
          [{ opacity: 0, transform: "translateY(18px)" }, { opacity: 1, transform: "none" }],
          { duration: 600, delay, easing: "cubic-bezier(.2,.7,.2,1)", fill: "backwards" }
        );
        window.removeEventListener("scroll", check);
        window.removeEventListener("resize", check);
      };
      const check = () => {
        if (done || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.94 && r.bottom > -60) reveal();
      };
      const r0 = node.getBoundingClientRect();
      if (r0.top < window.innerHeight * 0.94 && r0.bottom > -60) { reveal(); return; }
      setHidden(true); // fora da viewport → esconde até rolar
      window.addEventListener("scroll", check, { passive: true });
      window.addEventListener("resize", check);
      cleanup = () => {
        window.removeEventListener("scroll", check);
        window.removeEventListener("resize", check);
      };
    });
    return () => { if (cleanup) cleanup(); };
  }, []);
  const Tag = as;
  return (
    <Tag ref={ref} className={`reveal ${hidden ? "pre" : ""} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

// Botão
function Btn({ children, variant = "primary", href, onClick, icon, ...rest }) {
  const cls = `btn btn-${variant}`;
  const inner = <>{children}{icon && <span className="btn-ico">{icon}</span>}</>;
  if (href) return <a className={cls} href={href} onClick={onClick} {...rest}>{inner}</a>;
  return <button className={cls} onClick={onClick} {...rest}>{inner}</button>;
}

// Cabeçalho de seção
function SectionHead({ eyebrow, title, sub, center }) {
  return (
    <div className={`sec-head ${center ? "center" : ""}`}>
      <Reveal><Eyebrow>{eyebrow}</Eyebrow></Reveal>
      <Reveal delay={60} as="h2" className="sec-title"><RT>{title}</RT></Reveal>
      {sub && <Reveal delay={120} as="p" className="sec-sub">{sub}</Reveal>}
    </div>
  );
}

// Hook: efeito de digitação ciclando entre frases
function useTyped(words, { type = 70, del = 38, hold = 1400 } = {}) {
  const [txt, setTxt] = useState("");
  const [i, setI] = useState(0);
  const [del_, setDel] = useState(false);
  useEffect(() => {
    const cur = words[i % words.length];
    let to;
    if (!del_ && txt === cur) { to = setTimeout(() => setDel(true), hold); }
    else if (del_ && txt === "") { setDel(false); setI((v) => v + 1); }
    else {
      to = setTimeout(() => {
        setTxt(del_ ? cur.slice(0, txt.length - 1) : cur.slice(0, txt.length + 1));
      }, del_ ? del : type);
    }
    return () => clearTimeout(to);
  }, [txt, del_, i, words]);
  return txt;
}

// Componente isolado de digitação — re-renderiza só ele mesmo, sem
// disparar re-render dos irmãos (que travaria as transições de Reveal).
function Typed({ words, className }) {
  const txt = useTyped(words);
  return <span className={className}>{txt}<span className="caret">▍</span></span>;
}

// Ícones (stroke currentColor)
const Icon = {
  arrow: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" {...p}><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  whatsapp: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.67c2.2 0 4.27.86 5.83 2.42a8.2 8.2 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.37c0-4.54 3.7-8.24 8.24-8.24Zm-2.9 4.43c-.14 0-.36.05-.55.26-.19.21-.72.71-.72 1.72s.74 2 .84 2.14c.1.14 1.44 2.2 3.49 3.08.49.21.87.34 1.17.43.49.16.94.14 1.29.08.39-.06 1.21-.49 1.38-.97.17-.48.17-.89.12-.97-.05-.09-.19-.14-.4-.24-.21-.11-1.21-.6-1.4-.67-.19-.07-.32-.1-.46.11-.14.21-.53.66-.65.8-.12.14-.24.16-.45.05-.21-.1-.88-.32-1.68-1.03-.62-.55-1.04-1.24-1.16-1.45-.12-.21-.01-.32.09-.43.09-.09.21-.24.31-.36.1-.12.14-.21.21-.35.07-.14.03-.26-.02-.36-.05-.11-.46-1.13-.64-1.55-.17-.41-.34-.35-.46-.36l-.39-.01Z" /></svg>,
  mail: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" {...p}><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  insta: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" {...p}><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" /><circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" /></svg>,
  github: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49l-.01-1.7c-2.78.62-3.37-1.22-3.37-1.22-.46-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.74-.1-.26-.45-1.3.1-2.71 0 0 .84-.27 2.75 1.05a9.34 9.34 0 0 1 5 0c1.91-1.32 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.71 1.03 1.62 1.03 2.74 0 3.93-2.35 4.79-4.58 5.05.36.32.68.94.68 1.9l-.01 2.81c0 .27.18.59.69.49A10.26 10.26 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" /></svg>,
  check: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" {...p}><path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  plus: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" {...p}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>,
  chart: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...p}><path d="M4 20V10M10 20V4M16 20v-6M22 20H2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>,
};

Object.assign(window, { Mark, Logo, RT, Eyebrow, Reveal, Btn, SectionHead, useTyped, Typed, Icon });
