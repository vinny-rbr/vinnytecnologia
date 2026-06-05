// sections-b.jsx — Projetos, Sobre, Depoimentos, FAQ, Contato, Footer
const { useState: useS_B } = React;

/* ── Projetos ─────────────────────────────────── */
function Work({ t }) {
  const f = t.work.featured;
  return (
    <section id="projetos" className="sec sec-alt">
      <div className="wrap">
        <SectionHead eyebrow={t.work.eyebrow} title={t.work.title} sub={t.work.sub} />
        <Reveal className="case">
          <div className="case-visual">
            <div className="case-browser">
              <div className="cb-bar"><span className="tdot r"></span><span className="tdot y"></span><span className="tdot g"></span>
                <span className="cb-url">conciliaai.app</span></div>
              <div className="cb-screen">
                <div className="cb-mini-top">
                  <span className="cb-logo">conciliaaí</span>
                  <span className="cb-pill">{f.label}</span>
                </div>
                <div className="cb-cards">
                  <div className="cb-c big"><span className="cb-lab">Saldo</span><b>R$ 4.280</b><div className="cb-spark"><i style={{height:"40%"}}></i><i style={{height:"65%"}}></i><i style={{height:"50%"}}></i><i style={{height:"85%"}}></i><i style={{height:"60%"}}></i></div></div>
                  <div className="cb-c"><span className="cb-lab">Receitas</span><b className="pos">+6.1k</b></div>
                  <div className="cb-c"><span className="cb-lab">Despesas</span><b className="neg">−1.8k</b></div>
                </div>
                <div className="cb-rows">
                  {[["Supermercado","−128,90"],["Transporte","−90,00"],["Salário","+6.100"]].map(([r,v],i)=>(
                    <div key={r} className="cb-row"><span className={`cb-dot d${i}`}></span>{r}<span className="cb-amt">{v}</span></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="case-info">
            <div className="case-head">
              <span className="case-flag"><span className="dot"></span>{f.label}</span>
              <h3 className="case-name">{f.name}</h3>
              <p className="case-tagline">{f.tagline}</p>
            </div>
            <p className="case-desc">{f.desc}</p>
            <div className="case-highlights">
              {f.highlights.map(([k, v]) => (
                <div key={k} className="case-hl"><div className="chl-k">{k}</div><div className="chl-v">{v}</div></div>
              ))}
            </div>
            <div className="case-tags">
              {f.tags.map((tg) => <span key={tg} className="chip sm">{tg}</span>)}
            </div>
            <a className="case-link" href={CONTACT.github} target="_blank" rel="noopener"><Icon.github /> {f.link} <Icon.arrow /></a>
          </div>
        </Reveal>

        <Reveal delay={80} className="case-placeholder">
          <div className="cp-mark"><Icon.plus /></div>
          <div className="cp-txt"><h4>{t.work.placeholder.name}</h4><p>{t.work.placeholder.desc}</p></div>
          <Btn href="#contato" variant="ghost" icon={<Icon.arrow />}>{t.work.placeholder.cta}</Btn>
        </Reveal>
      </div>
    </section>
  );
}

/* ── Sobre ────────────────────────────────────── */
function About({ t }) {
  return (
    <section id="sobre" className="sec">
      <div className="wrap about-grid">
        <div className="about-left">
          <Reveal><Eyebrow>{t.about.eyebrow}</Eyebrow></Reveal>
          <Reveal delay={60} as="h2" className="sec-title">{t.about.title}</Reveal>
          {t.about.body.map((p, i) => (
            <Reveal key={i} delay={120 + i * 60} as="p" className="about-p">{p}</Reveal>
          ))}
        </div>
        <Reveal delay={140} className="about-right">
          <div className="about-card">
            <div className="about-mark"><Mark size={40} /></div>
            <div className="about-facts">
              {t.about.facts.map(([k, v]) => (
                <div key={k} className="afact"><span className="afk">{k}</span><span className="afv">{v}</span></div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── Depoimentos ──────────────────────────────── */
function Testimonials({ t }) {
  return (
    <section className="sec sec-alt">
      <div className="wrap">
        <SectionHead eyebrow={t.testimonials.eyebrow} title={t.testimonials.title} />
        <div className="tst-grid">
          {t.testimonials.items.map((it, i) => (
            <Reveal key={i} delay={i * 70} className="tst-card">
              <div className="tst-quote">“</div>
              <p className="tst-q">{it.q}</p>
              <div className="tst-by"><span className="tst-av">{it.n[0]}</span><div><b>{it.n}</b><i>{it.r}</i></div></div>
            </Reveal>
          ))}
        </div>
        {t.testimonials.note && <Reveal as="p" className="tst-note">{t.testimonials.note}</Reveal>}
      </div>
    </section>
  );
}

/* ── FAQ ──────────────────────────────────────── */
function FAQ({ t }) {
  const [open, setOpen] = useS_B(0);
  return (
    <section className="sec">
      <div className="wrap faq-wrap">
        <SectionHead eyebrow={t.faq.eyebrow} title={t.faq.title} center />
        <div className="faq-list">
          {t.faq.items.map(([q, a], i) => (
            <Reveal key={i} delay={i * 40} className={`faq-item ${open === i ? "open" : ""}`}>
              <button className="faq-q" onClick={() => setOpen(open === i ? -1 : i)}>
                <span>{q}</span><span className="faq-ico"><Icon.plus /></span>
              </button>
              <div className="faq-a"><div className="faq-a-in">{a}</div></div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Contato ──────────────────────────────────── */
function Contact({ t }) {
  const [f, setF] = useS_B({ name: "", contact: "", msg: "" });
  const send = (e) => {
    e.preventDefault();
    const txt = `Olá Vinny! Sou ${f.name || "—"} (${f.contact || "—"}). ${f.msg || ""}`.trim();
    window.open(`https://wa.me/${CONTACT.phone}?text=${encodeURIComponent(txt)}`, "_blank");
  };
  return (
    <section id="contato" className="sec sec-contact">
      <div className="contact-glow"></div>
      <div className="wrap contact-grid">
        <div className="contact-left">
          <Reveal><Eyebrow>{t.contact.eyebrow}</Eyebrow></Reveal>
          <Reveal delay={60} as="h2" className="sec-title big">{t.contact.title}</Reveal>
          <Reveal delay={120} as="p" className="sec-sub">{t.contact.sub}</Reveal>
          <Reveal delay={180} className="contact-direct">
            <span className="cd-label">{t.contact.directLabel}</span>
            <a href={`https://wa.me/${CONTACT.phone}`} target="_blank" rel="noopener" className="cd-link"><span className="cd-ic wa"><Icon.whatsapp /></span>{CONTACT.phoneDisplay}</a>
            <a href={`mailto:${CONTACT.email}`} className="cd-link"><span className="cd-ic"><Icon.mail /></span>{CONTACT.email}</a>
            <a href={`https://instagram.com/${CONTACT.instagram}`} target="_blank" rel="noopener" className="cd-link"><span className="cd-ic"><Icon.insta /></span>@{CONTACT.instagram}</a>
          </Reveal>
        </div>
        <Reveal delay={140} as="form" className="contact-form" onSubmit={send}>
          <label className="field"><span>{t.contact.formName}</span>
            <input type="text" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Maria Silva" /></label>
          <label className="field"><span>{t.contact.formContact}</span>
            <input type="text" value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} placeholder="maria@email.com" /></label>
          <label className="field"><span>{t.contact.formMsg}</span>
            <textarea rows="4" value={f.msg} onChange={(e) => setF({ ...f, msg: e.target.value })} placeholder="..."></textarea></label>
          <Btn variant="primary" type="submit" icon={<Icon.whatsapp />}>{t.contact.formSend}</Btn>
        </Reveal>
      </div>
    </section>
  );
}

/* ── Footer ───────────────────────────────────── */
function Footer({ t, lang, setLang }) {
  return (
    <footer className="footer">
      <div className="wrap footer-in">
        <div className="footer-brand">
          <Logo markSize={24} />
          <p className="footer-tag">{t.footer.tagline}</p>
        </div>
        <div className="footer-right">
          <div className="footer-social">
            <a href={`https://wa.me/${CONTACT.phone}`} target="_blank" rel="noopener" aria-label="WhatsApp"><Icon.whatsapp /></a>
            <a href={`mailto:${CONTACT.email}`} aria-label="E-mail"><Icon.mail /></a>
            <a href={`https://instagram.com/${CONTACT.instagram}`} target="_blank" rel="noopener" aria-label="Instagram"><Icon.insta /></a>
            <a href={CONTACT.github} target="_blank" rel="noopener" aria-label="GitHub"><Icon.github /></a>
          </div>
          <div className="lang foot">
            <button className={lang === "pt" ? "on" : ""} onClick={() => setLang("pt")}>PT</button><span>/</span>
            <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>EN</button>
          </div>
        </div>
      </div>
      <div className="wrap footer-bottom">
        <span>© {new Date().getFullYear()} Vinny Tecnologia · {t.footer.rights}</span>
        <span className="footer-made">{t.footer.made}</span>
      </div>
    </footer>
  );
}

Object.assign(window, { Work, About, Testimonials, FAQ, Contact, Footer });
