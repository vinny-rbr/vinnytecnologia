// meugiro.jsx — seções do produto Meu Giro (marca Vinny Tecnologia mantida)
const { useEffect: mgE, useRef: mgRef } = React;

/* Logo do produto Meu Giro — mark do "giro" (anel verde + seta azul). */
function MgMark({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="var(--surface)" stroke="var(--line)" />
      <path d="M20 8.5a11.5 11.5 0 1 0 11.5 11.5" stroke="var(--pos)" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M20 20V12.5l6.2 3.6" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20" cy="20" r="2.5" fill="var(--pos)" />
    </svg>
  );
}

/* Anel "giro" girando (canvas) — giro de mercadoria/dinheiro. Respeita reduce-motion. */
function GiroRing() {
  const ref = mgRef(null);
  mgE(() => {
    const cv = ref.current; if (!cv || !cv.getContext) return;
    const ctx = cv.getContext("2d");
    const S = 860, C = S / 2;
    const css = getComputedStyle(document.documentElement);
    const amber = (css.getPropertyValue("--mg") || "#F5A623").trim();
    const blue = (css.getPropertyValue("--accent") || "#3B82F6").trim();
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let t = 0, raf;
    const ring = (r, w, col, a, from, to) => {
      ctx.beginPath(); ctx.arc(C, C, r, from, to);
      ctx.strokeStyle = col; ctx.globalAlpha = a; ctx.lineWidth = w; ctx.lineCap = "round"; ctx.stroke();
    };
    const draw = () => {
      ctx.clearRect(0, 0, S, S); ctx.globalAlpha = 1;
      ring(300, 2, "rgba(255,255,255,.09)", 1, 0, Math.PI * 2);
      ring(240, 2, "rgba(255,255,255,.055)", 1, 0, Math.PI * 2);
      ring(300, 7, amber, .9, t, t + Math.PI * 0.9);
      ring(300, 7, amber, .32, t + Math.PI, t + Math.PI * 1.5);
      ring(240, 6, blue, .7, -t * 1.3, -t * 1.3 + Math.PI * 0.6);
      const dx = C + Math.cos(t) * 300, dy = C + Math.sin(t) * 300;
      ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(dx, dy, 9, 0, Math.PI * 2); ctx.fillStyle = amber; ctx.fill();
      ctx.globalAlpha = .22; ctx.beginPath(); ctx.arc(dx, dy, 18, 0, Math.PI * 2); ctx.fillStyle = amber; ctx.fill();
      t += 0.006; raf = requestAnimationFrame(draw);
    };
    if (reduce) { ring(300, 2, "rgba(255,255,255,.09)", 1, 0, Math.PI * 2); ring(300, 7, amber, .9, -0.6, 0.9); ring(240, 6, blue, .7, 2.2, 3.0); }
    else draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className="mg-ring" width="860" height="860" aria-hidden="true" />;
}

function MgPhone() {
  const bars = [38, 52, 44, 61, 49, 72, 58, 80, 66, 90, 74, 100];
  return (
    <div className="mg-device">
      <GiroRing />
      <div className="mg-phone" role="img" aria-label="App Meu Giro com as vendas do dia, ticket médio e caixa">
        <div className="mg-notch" />
        <div className="mg-screen">
          <div className="mg-scr-top">
            <div className="mg-hi">Bom dia,<b>Mercearia Bom Sucesso</b></div>
            <div className="mg-avatar">M</div>
          </div>
          <div className="mg-bigcard">
            <div className="mg-lbl">Vendas de hoje</div>
            <div className="mg-val tnum">R$ 4.820,75</div>
            <div className="mg-sub"><span className="mg-up">▲ 12,4%</span> vs. ontem · 96 vendas</div>
            <div className="mg-spark">{bars.map((v, i) => <span key={i} style={{ height: v + "%" }} />)}</div>
          </div>
          <div className="mg-minirow">
            <div className="mg-mini"><div className="mg-lbl">Caixa</div><div className="mg-v">R$ 1.240</div></div>
            <div className="mg-mini"><div className="mg-lbl">Ticket médio</div><div className="mg-v">R$ 50,21</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MgHero() {
  return (
    <section className="mg-hero" id="produto">
      <div className="wrap mg-hero-in">
        <div className="mg-hero-copy">
          <Reveal>
            <span className="mg-lock">
              <img src="meugiro-logo.png" className="mg-lock-logo" alt="Meu Giro" width="30" height="30" />
              <span className="mg-lock-name">Meu Giro</span>
              <span className="mg-lock-tag">o app da loja</span>
            </span>
          </Reveal>
          <Reveal delay={60}><h1 className="mg-h1">A sua loja <span className="mg-g">gira</span>.<br />Você acompanha do celular.</h1></Reveal>
          <Reveal delay={120}><p className="mg-lead">O <b>Meu Giro</b> conecta no sistema de PDV que a sua loja já usa e mostra <b>vendas, caixa e estoque</b> no seu celular.</p></Reveal>
          <Reveal delay={180}>
            <div className="mg-cta">
              <Btn href="#revenda" variant="primary" icon={<Icon.arrow />}>Começar agora</Btn>
              <Btn href="#recursos" variant="ghost">Ver recursos</Btn>
            </div>
          </Reveal>
          <Reveal delay={240}>
            <p className="mg-note"><Icon.check /> Não muda nada no seu sistema. Conexão só de saída, segura.</p>
          </Reveal>
        </div>
        <Reveal delay={120} className="mg-hero-media"><MgPhone /></Reveal>
      </div>
    </section>
  );
}

function MgSystems() {
  const sys = ["Firebird / TSD", "SysPDV", "Líder PDV", "InkDB", "e mais"];
  return (
    <div className="mg-systems" id="sistemas">
      <div className="wrap mg-systems-in">
        <span className="mg-systems-t">Funciona com o sistema que a loja já tem</span>
        <div className="mg-chips">{sys.map((s) => <span className="mg-chip" key={s}><i /> {s}</span>)}</div>
      </div>
    </div>
  );
}

const STEP_ICONS = [
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="3" /><line x1="12" y1="18" x2="12" y2="18" /></svg>,
];
function MgHow() {
  const steps = [
    ["01", "Instala o agente", "Um instalador único no PC da loja, ligado ao PDV que ela já usa. Atualiza sozinho."],
    ["02", "Conecta com segurança", "O agente só lê o banco da loja e fala pra fora — conexão de saída, nada abre pra internet."],
    ["03", "Acompanha no celular", "Vendas, caixa, estoque e relatórios na palma da mão, de qualquer lugar, sem ligar o PC."],
  ];
  return (
    <section className="mg-sec" id="como">
      <div className="wrap">
        <div className="mg-head">
          <Eyebrow>Como funciona</Eyebrow>
          <h2 className="mg-h2">Instala uma vez. Roda sozinho.</h2>
          <p className="mg-head-p">Um agente leve fica no computador da loja e conversa com o Meu Giro na nuvem. Você só abre o app.</p>
        </div>
        <div className="mg-steps">
          {steps.map(([n, tt, d], i) => (
            <Reveal key={n} delay={i * 80} className="mg-step">
              <span className="mg-step-n">{n}</span>
              <h3 className="mg-step-h">{tt}</h3>
              <p className="mg-step-p">{d}</p>
              <div className="mg-step-ic">{STEP_ICONS[i]}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const FEAT = [
  [<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>, "Vendas em tempo real", "Faturamento do dia, ticket médio, vendas por hora e comparativo — sem esperar o fechamento."],
  [<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>, "Caixa e formas de pagamento", "Dinheiro, cartão, Pix e mais — quanto entrou por cada forma, por operador e por período."],
  [<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0L2 12V2h10z" /><line x1="7" y1="7" x2="7" y2="7" /></svg>, "Estoque e preços", "Ajuste o estoque pela câmera, edite preço e descrição do produto, veja parados e curva ABC."],
  [<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>, "Prevenção de perda", "Cupons cancelados com o valor real e o produto, ranking de quem mais cancela."],
  [<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>, "Relatório por período", "Gere o relatório de um dia ou de um intervalo, com faixa de horas, e compartilhe em PDF."],
  [<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>, "Bipar e conferir", "Leitor de código de barras pela câmera: bipa o produto e cai direto nele pra ajustar ou consultar."],
];
function MgFeatures() {
  return (
    <section className="mg-sec" id="recursos">
      <div className="wrap">
        <div className="mg-head">
          <Eyebrow>Recursos</Eyebrow>
          <h2 className="mg-h2">Tudo que gira na loja, num lugar só.</h2>
          <p className="mg-head-p">Feito para supermercado, material de construção e varejo em geral — os números que importam, rápido e fácil de entender.</p>
        </div>
        <div className="mg-feats">
          {FEAT.map(([ic, tt, d], i) => (
            <Reveal key={tt} delay={(i % 3) * 70} className="mg-feat">
              <div className="mg-feat-ic">{ic}</div>
              <h3 className="mg-feat-h">{tt}</h3>
              <p className="mg-feat-p">{d}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function MgSecurity() {
  const items = [
    ["Conexão só de saída", "Nada fica exposto na internet do cliente."],
    ["Somente leitura", "Ajustes de estoque e preço são controlados e registrados."],
    ["Atualização automática", "O agente se atualiza sozinho, sem ir de loja em loja."],
  ];
  return (
    <section className="mg-sec mg-sec-tight">
      <div className="wrap">
        <Reveal className="mg-band">
          <div>
            <Eyebrow>Segurança &amp; controle</Eyebrow>
            <h2 className="mg-h2" style={{ marginTop: "12px" }}>Seguro por dentro, simples por fora.</h2>
            <p className="mg-head-p" style={{ marginTop: "12px" }}>O Meu Giro só lê o que a loja já tem. Sem abrir portas, sem risco pro banco de dados.</p>
          </div>
          <div className="mg-seclist">
            {items.map(([b, s]) => (
              <div className="mg-secitem" key={b}>
                <span className="mg-ck"><Icon.check /></span>
                <span><b>{b}</b><span>{s}</span></span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function MgReseller() {
  return (
    <section className="mg-sec" id="revenda">
      <div className="wrap">
        <Reveal className="mg-reseller">
          <div className="mg-reseller-in">
            <Eyebrow>Para revendedores</Eyebrow>
            <h2 className="mg-h2" style={{ marginTop: "12px" }}>Revenda o Meu Giro. Ganhe recorrente.</h2>
            <p className="mg-head-p" style={{ marginTop: "14px", maxWidth: "52ch" }}>Seja um revendedor autorizado e ofereça o Meu Giro pras lojas da sua região. Um painel só pra você acompanhar suas lojas, ativações e mensalidades.</p>
            <div className="mg-cta" style={{ marginTop: "28px" }}>
              <Btn href="painel.html" variant="primary" icon={<Icon.arrow />}>Entrar no painel da revenda</Btn>
              <Btn href="painel.html#cadastro" variant="ghost">Quero ser revendedor</Btn>
            </div>
            <p className="mg-revs">// revendedores autorizados em todo o Brasil</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function MeuGiro() {
  return (
    <React.Fragment>
      <MgHero />
      <MgSystems />
      <MgHow />
      <MgFeatures />
      <MgSecurity />
      <MgReseller />
    </React.Fragment>
  );
}
