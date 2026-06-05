// heroes.jsx — 3 variações de hero (toggle via Tweaks)
const { useState: useStateH, useEffect: useEffectH } = React;

// pílula "disponível"
function AvailPill({ label }) {
  return <div className="avail"><span className="dot"></span>{label}</div>;
}

function HeroCTAs({ t }) {
  return (
    <div className="hero-ctas">
      <Btn href="#contato" variant="primary" icon={<Icon.arrow />}>{t.hero.ctaPrimary}</Btn>
      <Btn href="#projetos" variant="ghost">{t.hero.ctaSecondary}</Btn>
    </div>
  );
}

/* ── A · Terminal ─────────────────────────────── */
function HeroTerminal({ t }) {
  return (
    <header className="hero hero-terminal">
      <div className="wrap hero-grid">
        <div className="hero-left">
          <Reveal><AvailPill label={t.hero.available} /></Reveal>
          <Reveal delay={70} as="h1" className="hero-title"><RT>{t.hero.title}</RT></Reveal>
          <Reveal delay={140} as="p" className="hero-sub">{t.hero.sub}</Reveal>
          <Reveal delay={210}><HeroCTAs t={t} /></Reveal>
        </div>
        <Reveal delay={160} className="hero-right">
          <div className="term">
            <div className="term-bar">
              <span className="tdot r"></span><span className="tdot y"></span><span className="tdot g"></span>
              <span className="term-name">vinny@tecnologia ~ %</span>
            </div>
            <pre className="term-body">
<span className="c-com">{t.hero.codeComment}</span>{"\n"}
<span className="c-key">const</span> <span className="c-var">vinny</span> = {"{"}{"\n"}
{"  "}<span className="c-prop">role</span>: <span className="c-str">'full-stack dev'</span>,{"\n"}
{"  "}<span className="c-prop">stack</span>: [<span className="c-str">'React'</span>, <span className="c-str">'TypeScript'</span>, <span className="c-str">'Node'</span>],{"\n"}
{"  "}<span className="c-prop">building</span>: <span className="c-str">'</span><Typed words={t.hero.typed} className="c-str" /><span className="c-str">'</span>,{"\n"}
{"  "}<span className="c-prop">ship</span>: () =&gt; <span className="c-str">'{t.hero.codeReturn}'</span>,{"\n"}
{"}"};
            </pre>
          </div>
        </Reveal>
      </div>
    </header>
  );
}

/* ── B · Statement ────────────────────────────── */
function HeroStatement({ t }) {
  return (
    <header className="hero hero-statement">
      <div className="hero-glow"></div>
      <div className="wrap hero-center">
        <Reveal className="hs-mark"><Mark size={56} /></Reveal>
        <Reveal delay={60}><AvailPill label={t.hero.available} /></Reveal>
        <Reveal delay={120} as="h1" className="hero-title big"><RT>{t.hero.title}</RT></Reveal>
        <Reveal delay={180} as="div" className="hs-typed">
          <span className="mono-prefix">$ ./build</span> <Typed words={t.hero.typed} className="hs-typed-word" />
        </Reveal>
        <Reveal delay={240} as="p" className="hero-sub center">{t.hero.sub}</Reveal>
        <Reveal delay={300}><HeroCTAs t={t} /></Reveal>
      </div>
    </header>
  );
}

/* ── C · Showcase (mockup Conciliaaí) ─────────── */
function PhoneMock() {
  return (
    <div className="phone">
      <div className="phone-notch"></div>
      <div className="phone-scr">
        <div className="pm-top">
          <div>
            <div className="pm-hi">Olá, Vinny</div>
            <div className="pm-sub">Maio · saldo do mês</div>
          </div>
          <div className="pm-av">VR</div>
        </div>
        <div className="pm-balance">
          <div className="pm-bal-l">Saldo</div>
          <div className="pm-bal-v">R$ 4.280<span>,50</span></div>
          <div className="pm-bal-row">
            <span className="up">↑ Receitas R$ 6.1k</span>
            <span className="down">↓ Despesas R$ 1.8k</span>
          </div>
        </div>
        <div className="pm-bars">
          {[42, 70, 38, 88, 56, 64, 30].map((h, i) => (
            <span key={i} style={{ height: h + "%" }} className={i === 3 ? "hot" : ""}></span>
          ))}
        </div>
        <div className="pm-list">
          {[["Supermercado", "Compras pequenas", "-128,90"], ["Salário", "Receita fixa", "+6.100"], ["Transporte", "Combustível", "-90,00"]].map((r, i) => (
            <div key={i} className="pm-item">
              <span className={`pm-ic c${i}`}></span>
              <div className="pm-it-txt"><b>{r[0]}</b><i>{r[1]}</i></div>
              <span className={`pm-val ${r[2][0] === "+" ? "pos" : "neg"}`}>{r[2]}</span>
            </div>
          ))}
        </div>
        <div className="pm-nav">
          <span className="on"></span><span></span><span className="pm-fab">+</span><span></span><span></span>
        </div>
      </div>
    </div>
  );
}

function HeroShowcase({ t }) {
  return (
    <header className="hero hero-showcase">
      <div className="hero-glow soft"></div>
      <div className="wrap hero-grid showcase">
        <div className="hero-left">
          <Reveal><AvailPill label={t.hero.available} /></Reveal>
          <Reveal delay={70} as="h1" className="hero-title"><RT>{t.hero.title}</RT></Reveal>
          <Reveal delay={140} as="p" className="hero-sub">{t.hero.sub}</Reveal>
          <Reveal delay={210}><HeroCTAs t={t} /></Reveal>
          <Reveal delay={280} className="hero-chips">
            {t.marquee.slice(0, 5).map((m) => <span key={m} className="hchip">{m}</span>)}
          </Reveal>
        </div>
        <Reveal delay={180} className="hero-right center">
          <div className="phone-wrap">
            <div className="float-chip fc1">99 <small>Lighthouse</small></div>
            <div className="float-chip fc2">PWA <small>instalável</small></div>
            <PhoneMock />
          </div>
        </Reveal>
      </div>
    </header>
  );
}

function Hero({ variant, t }) {
  if (variant === "statement") return <HeroStatement t={t} />;
  if (variant === "showcase") return <HeroShowcase t={t} />;
  return <HeroTerminal t={t} />;
}

Object.assign(window, { Hero });
