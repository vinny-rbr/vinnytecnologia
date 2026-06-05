// sections-a.jsx — Nav, Marquee, Serviços, Processo, Stack
const { useState: useS_A, useEffect: useE_A } = React;

/* ── Navbar ───────────────────────────────────── */
function Nav({ t, lang, setLang }) {
  const [scrolled, setScrolled] = useS_A(false);
  const [open, setOpen] = useS_A(false);
  useE_A(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const links = [
    ["#servicos", t.nav.services], ["#processo", t.nav.process], ["#stack", t.nav.stack],
    ["#projetos", t.nav.work], ["#sobre", t.nav.about],
  ];
  const go = (e, href) => { setOpen(false); };
  return (
    <nav className={`nav ${scrolled ? "scrolled" : ""}`}>
      <div className="wrap nav-in">
        <a href="#topo" className="nav-logo"><Logo markSize={22} /></a>
        <div className="nav-links">
          {links.map(([h, l]) => <a key={h} href={h}>{l}</a>)}
        </div>
        <div className="nav-right">
          <div className="lang">
            <button className={lang === "pt" ? "on" : ""} onClick={() => setLang("pt")}>PT</button>
            <span>/</span>
            <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>EN</button>
          </div>
          <Btn href="#contato" variant="primary" className="nav-cta">{t.nav.cta}</Btn>
          <button className={`burger ${open ? "x" : ""}`} onClick={() => setOpen(!open)} aria-label="Menu">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
      <div className={`nav-mobile ${open ? "show" : ""}`}>
        {links.map(([h, l]) => <a key={h} href={h} onClick={(e) => go(e, h)}>{l}</a>)}
        <a href="#contato" className="nm-cta" onClick={(e) => go(e, "#contato")}>{t.nav.cta}</a>
      </div>
    </nav>
  );
}

/* ── Marquee de tecnologias ───────────────────── */
function Marquee({ items }) {
  const row = [...items, ...items];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {row.map((m, i) => <span key={i} className="mq-item"><span className="mq-dot"></span>{m}</span>)}
      </div>
    </div>
  );
}

/* ── Serviços ─────────────────────────────────── */
function Services({ t }) {
  return (
    <section id="servicos" className="sec">
      <div className="wrap">
        <SectionHead eyebrow={t.services.eyebrow} title={t.services.title} sub={t.services.sub} />
        <div className="svc-grid">
          {t.services.items.map((s, i) => (
            <Reveal key={s.name} delay={(i % 3) * 70} className={`svc-card ${s.featured ? "feat" : ""}`}>
              {s.featured && <span className="svc-flag">★ {t.lang === "pt" ? "mais procurado" : "most wanted"}</span>}
              <span className="svc-tag">{s.tag}</span>
              <h3 className="svc-name">{s.name}</h3>
              <p className="svc-desc">{s.desc}</p>
              <ul className="svc-points">
                {s.points.map((p) => <li key={p}><span className="svc-ck"><Icon.check /></span>{p}</li>)}
              </ul>
              <div className="svc-price">{s.price}</div>
            </Reveal>
          ))}
        </div>
        <Reveal className="svc-cta-row">
          <a href="#contato" className="svc-cta-link">
            {t.services.cta} <Icon.arrow />
          </a>
        </Reveal>
      </div>
    </section>
  );
}

/* ── Processo ─────────────────────────────────── */
function Process({ t }) {
  return (
    <section id="processo" className="sec sec-alt">
      <div className="wrap">
        <SectionHead eyebrow={t.process.eyebrow} title={t.process.title} sub={t.process.sub} />
        <div className="proc-list">
          {t.process.steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 60} className="proc-row">
              <div className="proc-n">{s.n}</div>
              <div className="proc-body">
                <h3 className="proc-k">{s.k}</h3>
                <p className="proc-v">{s.v}</p>
              </div>
              <div className="proc-line"></div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Stack ────────────────────────────────────── */
function Stack({ t }) {
  return (
    <section id="stack" className="sec">
      <div className="wrap">
        <SectionHead eyebrow={t.stack.eyebrow} title={t.stack.title} sub={t.stack.sub} />
        <div className="stack-grid">
          {t.stack.groups.map((g, i) => (
            <Reveal key={g.k} delay={i * 80} className="stack-card">
              <div className="stack-k"><span className="mono-prefix">{String(i + 1).padStart(2, "0")}</span> {g.k}</div>
              <div className="stack-chips">
                {g.items.map((it) => <span key={it} className="chip">{it}</span>)}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { Nav, Marquee, Services, Process, Stack });
