/* Painel da Revenda - Meu Giro (Vinny Tecnologia).
   No-build React (UMD + Babel no navegador). Fala com o relay em /api/revenda. */
const { useState, useEffect, useCallback } = React;

const API = "https://raizestecnologia-relay.onrender.com/api/revenda";
const ADMIN_API = "https://raizestecnologia-relay.onrender.com/api/admin";
const LS_TOKEN = "mg_rev_token";
const LS_USER = "mg_rev_user";
const PRECO = 30;
const IMPLANTACAO = 50;
// Instalador-base LIMPO (mesmo pra todos). O navegador baixa, injeta o codigo do
// revendedor no RaizesAgente.xml e devolve o zip pronto. Servido pelo relay (proxy do
// release no GitHub) porque o relay ja responde com CORS aberto.
const INSTALADOR_BASE = "https://raizestecnologia-relay.onrender.com/api/revenda/instalador-base";
// Programa Meu Giro Mesas (Windows): garçom/caixa na rede da loja (modo local do agente Link).
const MESAS_DESKTOP = "https://github.com/vinny-rbr/raizestecnologia-agente/releases/download/mesas-desktop/MeuGiroMesas.zip";
const SISTEMAS = [
  { k: "host", label: "Host (TSD / Firebird)", asset: "agente-host.jar" },
  { k: "link", label: "Link (InkDB / Postgres)", asset: "agente-link.jar" },
  { k: "syspdv", label: "SysPDV (Firebird)", asset: "agente-syspdv.jar" },
  { k: "lider", label: "Lider PDV (Postgres)", asset: "agente-lider.jar" },
];

/* ---------- HTTP ---------- */
async function api(path, { method = "GET", body, token, base = API } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = {};
  try { json = await res.json(); } catch (e) {}
  if (!res.ok || json.success === false) {
    const e = new Error(json.message || "Falha na conexão (" + res.status + ")");
    e.status = res.status;
    throw e;
  }
  return json.data;
}

/* ---------- utils ---------- */
const iniciais = (nome) =>
  (nome || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

const fmtCnpj = (v) => {
  const d = (v || "").replace(/\D/g, "");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  // mesmo CNPJ em outra instalacao: chave = CNPJ + 2 digitos
  if (d.length === 16) return fmtCnpj(d.slice(0, 14)) + " · loja " + Number(d.slice(14));
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  return v;
};
const fmtData = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};
const diasAteVenc = (iso) => {
  if (!iso) return 999;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(iso.slice(0, 10) + "T00:00:00");
  return Math.round((alvo - hoje) / 86400000);
};
const vencendoEmBreve = (l) => l.status === "ativa" && diasAteVenc(l.vencimento) <= 7 && diasAteVenc(l.vencimento) >= 0;
// Próxima data do dia da mensalidade (ex.: dia 5 -> 05/09). Igual ao "vencimento" do celular.
const proxVencDia = (dia) => {
  const d = Math.min(28, Math.max(1, Number(dia) || 5));
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  let dt = new Date(hoje.getFullYear(), hoje.getMonth(), d);
  if (dt < hoje) dt = new Date(hoje.getFullYear(), hoje.getMonth() + 1, d);
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${dt.getFullYear()}-${mm}-${String(d).padStart(2, "0")}`;
};

/* ---------- ícones ---------- */
const Ic = ({ d, ...p }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" {...p}>{d}</svg>
);
const icHome = <><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></>;
const icUsers = <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>;
const icPlus = <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>;
const icCard = <><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></>;
const icFile = <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>;
const icImage = <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></>;
const icDownload = <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>;
const icGear = <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>;
const icCheck = <polyline points="20 6 9 17 4 12"/>;
const icClock = <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>;
const icAlert = <><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12" y2="17"/></>;
const icMoney = <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>;
const icLock = <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>;
const icSearch = <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>;
const icRefresh = <><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></>;
const icLogout = <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>;
const icInfo = <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></>;
const icCopy = <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>;
const icArrow = <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>;
const icEdit = <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></>;
const icCalendar = <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>;
const icUnlock = <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></>;
const icFolder = <><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></>;
const icPhone = <><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></>;
const icKey = <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>;
const icTrash = <><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></>;

const Logo = (cls) => (
  <svg className={cls} viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <rect width="40" height="40" rx="10" fill="#0d1424"/>
    <path d="M20 8.5a11.5 11.5 0 1 0 11.5 11.5" stroke="#F5A623" strokeWidth="3.6" strokeLinecap="round"/>
    <path d="M20 20V12.5l6.2 3.6" stroke="#3B82F6" strokeWidth="3.1" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="20" cy="20" r="2.6" fill="#F5A623"/>
  </svg>
);

/* ================= AUTH ================= */
function Auth({ onAuth }) {
  const [modo, setModo] = useState(() =>
    /cadastr/i.test(location.hash + location.search) ? "cadastro" : "login");
  const [f, setF] = useState({ nome: "", cpfCnpj: "", email: "", telefone: "", cidade: "", uf: "", senha: "" });
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setErro(""); setBusy(true);
    try {
      const path = modo === "login" ? "/login" : "/cadastro";
      const body = modo === "login"
        ? { email: f.email.trim(), senha: f.senha }
        : { ...f, email: f.email.trim(), uf: f.uf.trim().toUpperCase() };
      const sess = await api(path, { method: "POST", body });
      onAuth(sess);
    } catch (err) {
      setErro(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-brand">
          {Logo("logo")}
          <div><div className="n">Meu Giro</div><div className="s">Painel da revenda</div></div>
        </div>
        <h1>{modo === "login" ? "Entrar" : "Seja revendedor"}</h1>
        <p className="lead">
          {modo === "login"
            ? "Acesse o painel das lojas que você instalou."
            : "Cadastre-se para revender o Meu Giro. R$ 30 por loja ativada."}
        </p>

        {erro && <div className="err">{erro}</div>}

        {modo === "cadastro" && (
          <>
            <div className="field">
              <label>Nome completo</label>
              <input value={f.nome} onChange={set("nome")} placeholder="Seu nome" required />
            </div>
            <div className="field">
              <label>CPF ou CNPJ</label>
              <input value={f.cpfCnpj} onChange={set("cpfCnpj")} placeholder="Só números" required />
            </div>
            <div className="field">
              <label>Telefone / WhatsApp</label>
              <input value={f.telefone} onChange={set("telefone")} placeholder="(00) 00000-0000" />
            </div>
            <div className="row2">
              <div className="field">
                <label>Cidade</label>
                <input value={f.cidade} onChange={set("cidade")} placeholder="Cidade" />
              </div>
              <div className="field">
                <label>UF</label>
                <input value={f.uf} onChange={set("uf")} placeholder="AP" maxLength={2} />
              </div>
            </div>
          </>
        )}

        <div className="field">
          <label>{modo === "login" ? "E-mail, CPF ou CNPJ" : "E-mail"}</label>
          <input type={modo === "login" ? "text" : "email"} value={f.email} onChange={set("email")} placeholder={modo === "login" ? "voce@email.com ou só números" : "voce@email.com"} autoComplete="username" required />
        </div>
        <div className="field">
          <label>Senha</label>
          <input type="password" value={f.senha} onChange={set("senha")} placeholder="••••••••" required />
        </div>

        <button className="btn btn-mg btn-block" disabled={busy}>
          {busy ? "Aguarde…" : modo === "login" ? "Entrar" : "Criar conta"}
        </button>

        <div className="auth-switch">
          {modo === "login" ? "Ainda não é revendedor? " : "Já tem conta? "}
          <button type="button" onClick={() => { setErro(""); setModo(modo === "login" ? "cadastro" : "login"); }}>
            {modo === "login" ? "Cadastre-se" : "Entrar"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ================= peças ================= */
// loja de revenda que a revenda ainda não ativou: não gera mensalidade (no master ela aparece como "ativa")
const naoAtivadaRevenda = (l) => !!(l.situacaoRevenda && l.situacaoRevenda.tipo === "aguardando");
function Kpis({ lojas, isMaster }) {
  const ativas = lojas.filter((l) => l.status === "ativa").length;
  // pagantes: ativas que geram mensalidade (fora as do próprio CNPJ da revenda e as que a revenda ainda não ativou)
  // receita/mês: todas as lojas com mensalidade, menos as sem cobrança e as bloqueadas por falta
  // de pagamento (bloqueio feito pela própria revenda continua pagando ao master)
  const pagantes = lojas.filter((l) => !l.cortesia && l.status !== "aguardando" && !naoAtivadaRevenda(l)
    && (!l.bloqueada || /^Bloqueado pela revenda/i.test(l.motivo || "")));
  const aguardando = lojas.filter((l) => l.status === "aguardando").length;
  const bloqueadas = lojas.filter((l) => l.status === "bloqueada").length;
  const aVencer = lojas.filter(vencendoEmBreve).length;
  const receitaMaster = pagantes.reduce((s, l) => s + (Number(l.mensalidade) || 0), 0);
  const cards = isMaster ? [
    { ic: icUsers, cls: "ic-blue", l: "Lojas", v: lojas.length, s: `${ativas} ativas` },
    { ic: icCheck, cls: "ic-green", l: "Ativas", v: ativas, s: "com acesso liberado" },
    { ic: icLock, cls: "ic-red", l: "Bloqueadas", v: bloqueadas, s: "sem acesso", vcls: bloqueadas ? { color: "var(--neg)" } : undefined },
    { ic: icMoney, cls: "ic-amber", l: "Receita/mês", v: "R$ " + receitaMaster.toFixed(0), s: `${pagantes.length} mensalidades` },
  ] : [
    { ic: icCheck, cls: "ic-green", l: "Lojas ativas", v: ativas, s: `de ${lojas.length} no total` },
    { ic: icClock, cls: "ic-amber", l: "Aguardando ativação", v: aguardando, s: "R$ 30 cada pra liberar", vcls: { color: "var(--mg)" } },
    { ic: icAlert, cls: "ic-red", l: "A vencer (7 dias)", v: aVencer, s: "mensalidade a receber" },
    { ic: icMoney, cls: "ic-blue", l: "Receita do mês", v: "R$ " + pagantes.length * PRECO, s: `${pagantes.length} lojas × R$ 30` },
  ];
  const [verPag, setVerPag] = useState(false);
  return (
    <>
      <div className="kpis">
        {cards.map((c, i) => {
          const clica = isMaster && i === 3; // Receita/mês: abre a lista de quem entra na conta
          return (
            <div className={"kpi" + (clica ? " kpi-click" : "")} key={i} onClick={clica ? () => setVerPag(!verPag) : undefined}
              style={clica ? { cursor: "pointer" } : undefined} title={clica ? "Ver quem entra nessa conta" : undefined}>
              <div className={"k-ic " + c.cls}><Ic d={c.ic} /></div>
              <div className="k-l">{c.l}</div>
              <div className="k-v tnum" style={c.vcls}>{c.v}</div>
              <div className="k-s">{c.s}{clica ? (verPag ? " · fechar" : " · ver lista") : ""}</div>
            </div>
          );
        })}
      </div>
      {isMaster && verPag && <ListaPagantes pagantes={pagantes} />}
    </>
  );
}

/* Quem entra na Receita/mês do master: venda direta e lojas de revenda, com a situação de cada uma
   (pago / em teste / a pagar), pra conferir se o número bate com quem paga de verdade. */
const SIT_REV = { pago: ["Pago", "pill-ok"], teste: ["Em teste", "pill-wait"], apagar: ["A pagar", "pill-wait"],
  bloqueada: ["Bloqueada", "pill-block"], aguardando: ["Aguardando", "pill-wait"], cortesia: ["Cortesia", "pill-ok"] };
function ListaPagantes({ pagantes }) {
  const fmtD = (s) => (s ? s.slice(0, 10).split("-").reverse().join("/") : "");
  const linhas = pagantes.map((l) => {
    const rev = !!l.revendaCodigo;
    const sr = l.situacaoRevenda || {};
    let sit, cls, info;
    if (rev) {
      [sit, cls] = SIT_REV[sr.tipo] || [sr.tipo || "?", ""];
      info = sr.tipo === "pago" ? "até " + fmtD(sr.pagaAte) : sr.tipo === "teste" ? "teste até " + fmtD(sr.testeAte)
        : sr.vencimento ? "venceu " + fmtD(sr.vencimento) : "";
    } else {
      sit = l.fase === "implantacao" ? "Implantação" : "Mensalidade";
      cls = l.bloqueada ? "pill-block" : "pill-ok";
      info = l.vencimentoAtual ? "vence " + fmtD(l.vencimentoAtual) : "";
    }
    return { l, rev, sit, cls, info, ult: rev ? sr.ultimoPagamentoEm : null, valor: Number(l.mensalidade) || 0 };
  }).sort((a, b) => (a.rev - b.rev) || (a.l.revendaNome || "").localeCompare(b.l.revendaNome || "") || (a.l.nome || "").localeCompare(b.l.nome || ""));
  const total = linhas.reduce((s, x) => s + x.valor, 0);
  const pagos = linhas.filter((x) => x.rev ? x.sit === "Pago" : !x.l.bloqueada);
  return (
    <div className="panel" style={{ marginTop: 16 }}>
      <div className="p-head"><span className="p-title"><Ic d={icMoney} /> Quem entra na Receita/mês</span>
        <span className="sub">{linhas.length} lojas · R$ {total.toFixed(2).replace(".", ",")} · em dia: {pagos.length}</span></div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Loja</th><th>Origem</th><th>Situação</th><th>Último pagamento</th><th style={{ textAlign: "right" }}>Mensalidade</th></tr></thead>
          <tbody>
            {linhas.map(({ l, rev, sit, cls, info, ult, valor }) => (
              <tr key={l.cnpj}>
                <td><b>{l.nome || l.cnpj}</b><div className="mono sub">{l.cnpj}</div></td>
                <td>{rev ? (l.revendaNome || l.revendaCodigo) : "Venda direta"}</td>
                <td><span className={"pill " + cls}>{sit}</span> <span className="sub">{info}</span></td>
                <td className="mono">{ult ? fmtD(ult) : "-"}</td>
                <td className="mono" style={{ textAlign: "right", fontWeight: 600 }}>R$ {valor.toFixed(2).replace(".", ",")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Pendentes({ lojas, onAtivar, ativando }) {
  const pend = lojas.filter((l) => l.status === "aguardando");
  if (pend.length === 0) return null;
  return (
    <div className="alert">
      <span className="a-ic"><Ic d={icInfo} /></span>
      <div style={{ flex: 1 }}>
        <div className="a-t"><b>{pend.length} {pend.length === 1 ? "loja aguardando" : "lojas aguardando"} ativação.</b></div>
        <div className="a-s">Você instalou o agente e {pend.length === 1 ? "ela apareceu" : "elas apareceram"} aqui. Pague R$ 30 em cada pra liberar o acesso do lojista.</div>
      </div>
    </div>
  );
}

function StatusPill({ l }) {
  if (l.status === "aguardando") return <span className="pill pill-wait"><Ic d={icClock} strokeWidth="2.4" /> Aguardando</span>;
  if (l.status === "bloqueada") return <span className="pill pill-block"><Ic d={icLock} strokeWidth="2.4" /> Bloqueada</span>;
  return <span className="pill pill-ok"><Ic d={icCheck} strokeWidth="3" /> Ativa</span>;
}

// Recursos extras por sistema: Link = restaurante (Salão, Painel TV); Host = Força de vendas.
const RECURSOS = [
  { id: "salao", nome: "Salão", sis: "Link" },
  { id: "painel_tv", nome: "Painel TV", sis: "Link" },
  { id: "forca_vendas", nome: "Força de vendas", sis: "Host" },
  { id: "etiquetas", nome: "Etiquetas", sis: "Host" },
  { id: "etiquetas", nome: "Etiquetas", sis: "Link" },
  { id: "saude", nome: "Saúde +R$10", sis: "Host" },
  { id: "saude", nome: "Saúde +R$10", sis: "Link" },
];

function RecursosChips({ l, busy, onRecurso }) {
  const lista = RECURSOS.filter((r, i, todos) => (!l.sistema || l.sistema === r.sis)
    && todos.findIndex((x) => x.id === r.id && (!l.sistema || l.sistema === x.sis)) === i); // sem chip repetido
  if (!lista.length || !onRecurso) return null;
  const ativos = new Set(l.recursos || []);
  return (
    <div className="rec-line">
      {lista.map((r) => {
        const on = ativos.has(r.id);
        return (
          <button key={r.id} className={"rec-chip" + (on ? " on" : "")} disabled={busy}
            title={on ? `${r.nome} ativado no app. Clique para desativar.` : `Clique para ativar ${r.nome} no app desta loja.`}
            onClick={() => onRecurso(l, r, !on)}>
            {on ? <Ic d={icCheck} strokeWidth="3" /> : <span className="rec-off"></span>} {r.nome}
          </button>
        );
      })}
    </div>
  );
}

/* Versão do agente da loja (só master): verde = última, laranja = desatualizada, cinza = ainda não sabemos. */
/* Versao do agente pra mostrar: a partir da 100 vira 1.x (103 = "1.3"); por dentro continua o numero. */
const fmtVerAg = (n) => (n >= 100 ? "1." + (n - 100) : String(n));
const agenteDesatualizado = (l) => !!(l.versaoAtual && l.versaoAgente && l.versaoAgente < l.versaoAtual);
function VerChip({ l }) {
  const v = l.versaoAgente, ult = l.versaoAtual;
  const cor = !v ? ["#7d8a96", "rgba(125,138,150,.15)"] : agenteDesatualizado(l) ? ["#f5a524", "rgba(245,165,36,.15)"] : ["#22c55e", "rgba(34,197,94,.15)"];
  const txt = !v ? "versão ?" : agenteDesatualizado(l) ? "v" + fmtVerAg(v) + " · atualizar (v" + fmtVerAg(ult) + ")" : "v" + fmtVerAg(v);
  const dica = !v ? "Ainda não sabemos a versão: aparece quando o agente conectar." : agenteDesatualizado(l)
    ? "Agente na v" + fmtVerAg(v) + "; a última é a v" + fmtVerAg(ult) + ". Ele atualiza sozinho, ou reinicie o serviço Meu Giro na loja." : "Agente na última versão.";
  return <span title={dica} style={{ marginLeft: 6, padding: "1px 7px", borderRadius: 999, fontSize: 11, fontWeight: 700, color: cor[0], background: cor[1], whiteSpace: "nowrap" }}>{txt}</span>;
}

function Linha({ l, onAtivar, busy, m, onGrupo, onLogo, rev, onHist, sel, onSel, onRecurso }) {
  const soon = vencendoEmBreve(l);
  const nomeCell = (
    <td className="loja">
      <div className="nm">{l.nome || "Loja sem nome"}</div>
      <div className="cnpj">{fmtCnpj(l.cnpj)}{l.sistema && <span className="sis-chip" title="Sistema do PDV">{l.sistema}</span>}{m && <VerChip l={l} />}{l.grupo && <span className="grp-chip"><Ic d={icFolder} /> {l.grupo}</span>}</div>
      {m && (
        <div className="dev-line">
          <Ic d={icUsers} /> {l.revendaCodigo ? (l.revendaNome || l.revendaCodigo) : "Venda direta"}
          {l.revendaPendente && <span className="ver-chip" style={{ color: "var(--mg)" }}>transferência pendente</span>}
        </div>
      )}
      <RecursosChips l={l} busy={busy} onRecurso={onRecurso} />
      {l.dispositivos != null && (
        <div className="dev-line">
          <Ic d={icPhone} /> {l.dispositivos} {l.dispositivos === 1 ? "aparelho" : "aparelhos"}
          {l.appVersion && <span className="ver-chip">v{l.appVersion}</span>}
        </div>
      )}
    </td>
  );
  if (m) {
    // modo master: mensalidade, vencimento e acoes de liberar/bloquear/editar
    return (
      <tr>
        {nomeCell}
        <td><span className={"on-dot " + (l.online ? "on" : "off")}><i></i> {l.online ? "online" : "offline"}</span></td>
        <td className="mono" style={{ fontWeight: 600 }}>R$ {(Number(l.mensalidade) || 0).toFixed(0)}</td>
        <td className={"venc" + (soon ? " soon" : "")}>{l.vencimento ? fmtData(l.vencimento) : "—"}</td>
        <td><StatusPill l={l} />{l.situacaoRevenda && <SituacaoRevenda s={l.situacaoRevenda} />}
          {l.cortesia && <span className="pill pill-ok" style={{ marginLeft: 6 }} title="Não entra na receita nem é cobrada">sem cobrança</span>}</td>
        <td>
          <div className="row-actions">
            {!l.revendaCodigo && !l.cortesia && (
              <input type="checkbox" className="chk" title={l.pagavel === false ? "Abre 10 dias antes do vencimento" : "Selecionar pra gerar boleto/Pix junto"}
                disabled={l.pagavel === false} checked={!!(sel && sel.has(l.cnpj))} onChange={() => onSel && onSel(l.cnpj)} />
            )}
            {!l.revendaCodigo && <button className="btn btn-mg btn-sm" title={l.fase !== "implantacao" && l.pagavel === false ? "Abre 10 dias antes do vencimento" : "Registrar pagamento em dinheiro/Pix"} disabled={busy || (l.fase !== "implantacao" && l.pagavel === false)} onClick={() => m.marcarPago(l)}><Ic d={icCheck} strokeWidth="3" /> Pago</button>}
            {l.bloqueada
              ? <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => m.toggleBloqueio(l)}><Ic d={icUnlock} /> Liberar</button>
              : <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => m.toggleBloqueio(l)}><Ic d={icLock} /> Bloquear</button>}
            <button className="iconbtn" title="Mensalidade" disabled={busy} onClick={() => m.editarMensalidade(l)}><Ic d={icMoney} /></button>
            <button className="iconbtn" title="Dia de vencimento" disabled={busy} onClick={() => m.editarVencimento(l)}><Ic d={icCalendar} /></button>
            <button className="iconbtn" title="Data de início (base da cobrança)" disabled={busy} onClick={() => m.definirAtivacao(l)}><Ic d={icEdit} /></button>
            {!l.implantacaoPaga && !l.revendaCodigo && <button className="iconbtn" title="Vencimento da implantação" disabled={busy} onClick={() => m.definirImplantacaoVence(l)}><Ic d={icClock} /></button>}
            <button className="iconbtn" title="Grupo" disabled={busy} onClick={() => onGrupo(l)}><Ic d={icFolder} /></button>
            <button className="iconbtn" title="Logo da loja (vai nos PDFs do app)" disabled={busy} onClick={() => onLogo(l)}><Ic d={icImage} /></button>
            <button className="iconbtn" title="Mover para outra revenda" disabled={busy} onClick={() => m.moverRevenda(l)}><Ic d={icUsers} /></button>
            {l.revendaCodigo && <button className="iconbtn" title="Remover da revenda (pra reinstalar)" disabled={busy} onClick={() => m.removerRevenda(l)}><Ic d={icLogout} /></button>}
            <button className="iconbtn" title="Parcelas pagas" disabled={busy} onClick={() => onHist(l)}><Ic d={icFile} /></button>
            <button className={"btn btn-ghost btn-sm"} title={l.cortesia ? "Voltar a cobrar esta loja" : "Loja de teste/da casa: tirar da cobrança e da receita"} disabled={busy} onClick={() => m.toggleCortesia(l)}>{l.cortesia ? "Cobrar" : "Sem cobrança"}</button>
            <button className="iconbtn iconbtn-danger" title="Excluir loja" disabled={busy} onClick={() => m.excluir(l)}><Ic d={icTrash} /></button>
          </div>
        </td>
      </tr>
    );
  }
  return (
    <tr>
      {nomeCell}
      <td><span className={"on-dot " + (l.online ? "on" : "off")}><i></i> {l.online ? "online" : "offline"}</span></td>
      <td className={"venc" + (soon ? " soon" : "")}>{l.status === "aguardando" ? "—" : fmtData(l.vencimento)}</td>
      <td>
        <StatusPill l={l} />
        {l.status !== "aguardando" && l.pago === false && <span className="pill pill-wait" style={{ marginLeft: 6 }}>R$ {Number(l.valorAPagar) || 30} a pagar</span>}
        {l.cortesia && <span className="pill pill-ok" style={{ marginLeft: 6 }} title="Mesmo CNPJ da sua revenda: não é cobrada">Sua · sem cobrança</span>}
        {l.liberadaAte && !l.bloqueada && <span className="pill pill-wait" style={{ marginLeft: 6 }} title="Depois disso a loja bloqueia até o pagamento">liberada até {new Date(l.liberadaAte).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>}
      </td>
      <td>
        <div className="row-actions">
          {l.status !== "aguardando" && !l.cortesia && (
            <input type="checkbox" className="chk" title="Selecionar pra pagar junto" checked={sel && sel.has(l.cnpj)} onChange={() => onSel && onSel(l.cnpj)} />
          )}
          {l.status === "aguardando" ? (
            <button className="btn btn-mg btn-sm" disabled={busy} onClick={() => onAtivar(l)}>Ativar · R$ 30</button>
          ) : (
            <>
              {l.bloqueada
                ? <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => rev.toggleBloqueio(l)}><Ic d={icUnlock} /> Liberar</button>
                : <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => rev.toggleBloqueio(l)}><Ic d={icLock} /> Bloquear</button>}
            </>
          )}
          <button className="iconbtn" title="Grupo" disabled={busy} onClick={() => onGrupo(l)}><Ic d={icFolder} /></button>
            <button className="iconbtn" title="Logo da loja (vai nos PDFs do app)" disabled={busy} onClick={() => onLogo(l)}><Ic d={icImage} /></button>
          <button className="iconbtn" title="Parcelas pagas" disabled={busy} onClick={() => onHist(l)}><Ic d={icFile} /></button>
        </div>
      </td>
    </tr>
  );
}

function TabelaLojas({ lojas, onAtivar, ativando, vazio, m, onGrupo, onLogo, rev, onHist, sel, onSel, onRecurso }) {
  if (lojas.length === 0) {
    return <div className="state"><div className="big">{vazio.t}</div>{vazio.s}</div>;
  }
  return (
    <div className="tbl-wrap">
      <table>
        <thead>
          <tr>
            {m
              ? <><th>Loja</th><th>Conexão</th><th>Mensalidade</th><th>Vencimento</th><th>Status</th><th style={{ textAlign: "right" }}>Ações</th></>
              : <><th>Loja</th><th>Conexão</th><th>Vencimento (R$ 30)</th><th>Status</th><th style={{ textAlign: "right" }}>Ações</th></>}
          </tr>
        </thead>
        <tbody>
          {lojas.map((l) => <Linha key={l.cnpj} l={l} busy={ativando === l.cnpj} onAtivar={onAtivar} m={m} rev={rev} onGrupo={onGrupo} onLogo={onLogo} onHist={onHist} sel={sel} onSel={onSel} onRecurso={onRecurso} />)}
        </tbody>
      </table>
    </div>
  );
}

/* ================= VIEWS ================= */
function ViewInicio({ lojas, sess, onAtivar, ativando, goto, isMaster }) {
  const pend = lojas.filter((l) => l.status === "aguardando");
  const bloqueadas = lojas.filter((l) => l.status === "bloqueada");
  const vencendo = lojas.filter(vencendoEmBreve);
  return (
    <>
      <div className="head-row">
        <div>
          <h1>Início</h1>
          <p className="sub">Olá, {sess.nome.split(" ")[0]}. {isMaster ? "Um resumo do Meu Giro." : "Um resumo da sua revenda."}</p>
        </div>
      </div>
      <Kpis lojas={lojas} isMaster={isMaster} />
      {!isMaster && <Pendentes lojas={lojas} />}
      <div className="two-col">
        <div className="panel">
          {isMaster ? (
            <>
              <div className="p-head"><span className="p-title"><Ic d={icLock} /> Bloqueadas</span>
                <button className="link" onClick={() => goto("lojas")}>Ver todas</button></div>
              {bloqueadas.length === 0
                ? <div className="mini-empty">Nenhuma loja bloqueada. 🎉</div>
                : bloqueadas.slice(0, 5).map((l) => (
                  <div className="mini-row" key={l.cnpj}>
                    <div><div className="mini-nm">{l.nome}</div><div className="mini-sub mono">{fmtCnpj(l.cnpj)}</div></div>
                    <span className="pill pill-block">bloqueada</span>
                  </div>
                ))}
            </>
          ) : (
            <>
              <div className="p-head"><span className="p-title"><Ic d={icClock} /> Aguardando ativação</span>
                <button className="link" onClick={() => goto("lojas")}>Ver todas</button></div>
              {pend.length === 0
                ? <div className="mini-empty">Nenhuma loja pendente. 🎉</div>
                : pend.slice(0, 5).map((l) => (
                  <div className="mini-row" key={l.cnpj}>
                    <div><div className="mini-nm">{l.nome}</div><div className="mini-sub mono">{fmtCnpj(l.cnpj)}</div></div>
                    <button className="btn btn-mg btn-sm" disabled={ativando === l.cnpj} onClick={() => onAtivar(l)}>Ativar · R$ 30</button>
                  </div>
                ))}
            </>
          )}
        </div>
        <div className="panel">
          <div className="p-head"><span className="p-title"><Ic d={icAlert} /> Vencendo em 7 dias</span></div>
          {vencendo.length === 0
            ? <div className="mini-empty">Nada vencendo por enquanto.</div>
            : vencendo.slice(0, 5).map((l) => (
              <div className="mini-row" key={l.cnpj}>
                <div><div className="mini-nm">{l.nome}</div><div className="mini-sub mono">{fmtCnpj(l.cnpj)}</div></div>
                <span className="venc soon mono">{fmtData(l.vencimento)}</span>
              </div>
            ))}
        </div>
      </div>
    </>
  );
}

function ViewLojas({ lojas, onAtivar, ativando, isMaster, master, rev, onGrupo, onLogo, onHist, onRecurso }) {
  const [tab, setTab] = useState("todas");
  const [q, setQ] = useState("");
  const [grupo, setGrupo] = useState("__todos");
  const [revenda, setRevenda] = useState("__todas"); // master: filtra pela revenda dona
  const [sel, setSel] = useState(() => new Set());
  const toggleSel = (cnpj) => setSel((s) => { const n = new Set(s); n.has(cnpj) ? n.delete(cnpj) : n.add(cnpj); return n; });
  const grupos = [...new Set(lojas.map((l) => l.grupo).filter(Boolean))].sort();
  const revendasLista = [...new Map(lojas.filter((l) => l.revendaCodigo)
    .map((l) => [l.revendaCodigo, l.revendaNome || l.revendaCodigo])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  // base = lojas da revenda/grupo escolhidos: cards e contagem das abas seguem o filtro
  const base = lojas.filter((l) => {
    if (revenda === "__direta" && l.revendaCodigo) return false;
    if (revenda !== "__todas" && revenda !== "__direta" && l.revendaCodigo !== revenda) return false;
    if (grupo === "__sem" && l.grupo) return false;
    if (grupo !== "__todos" && grupo !== "__sem" && l.grupo !== grupo) return false;
    return true;
  });
  const cont = {
    todas: base.length,
    ativas: base.filter((l) => l.status === "ativa").length,
    aguardando: base.filter((l) => l.status === "aguardando").length,
    vencer: base.filter(vencendoEmBreve).length,
    bloqueadas: base.filter((l) => l.status === "bloqueada").length,
    antigas: base.filter(agenteDesatualizado).length,
  };
  const filtradas = base.filter((l) => {
    if (tab === "ativas" && l.status !== "ativa") return false;
    if (tab === "aguardando" && l.status !== "aguardando") return false;
    if (tab === "bloqueadas" && l.status !== "bloqueada") return false;
    if (tab === "vencer" && !vencendoEmBreve(l)) return false;
    if (tab === "antigas" && !agenteDesatualizado(l)) return false;
    if (q.trim()) {
      const t = q.trim().toLowerCase(), dig = q.replace(/\D/g, "");
      if (!((l.nome || "").toLowerCase().includes(t) || (dig && (l.cnpj || "").includes(dig)))) return false;
    }
    return true;
  });
  const tabs = isMaster
    ? [["todas", "Todas", cont.todas], ["ativas", "Ativas", cont.ativas], ["vencer", "A vencer", cont.vencer], ["bloqueadas", "Bloqueadas", cont.bloqueadas], ["antigas", "Agente desatualizado", cont.antigas]]
    : [["todas", "Todas", cont.todas], ["ativas", "Ativas", cont.ativas], ["aguardando", "Aguardando", cont.aguardando], ["vencer", "A vencer", cont.vencer], ["bloqueadas", "Bloqueadas", cont.bloqueadas]];
  return (
    <>
      <div className="head-row">
        <div><h1>Lojas</h1><p className="sub">{isMaster ? "Todas as lojas do Meu Giro. Libere/bloqueie, defina mensalidade e vencimento." : "As lojas onde você instalou o Meu Giro. Ative, libere e acompanhe."}</p></div>
      </div>
      <Kpis lojas={base} isMaster={isMaster} />
      {!isMaster && <Pendentes lojas={lojas} />}
      <div className="panel">
        <div className="p-tools">
          <div className="tabs">
            {tabs.map(([k, label, c]) => (
              <button key={k} className={"tab" + (tab === k ? " on" : "")} onClick={() => setTab(k)}>{label} <span className="c">{c}</span></button>
            ))}
          </div>
          {isMaster && revendasLista.length > 0 && (
            <select className="sel sel-grp" aria-label="Filtrar por revenda" value={revenda} onChange={(e) => setRevenda(e.target.value)}>
              <option value="__todas">Todas as revendas</option>
              {revendasLista.map(([cod, nome]) => <option key={cod} value={cod}>{nome} ({lojas.filter((l) => l.revendaCodigo === cod).length})</option>)}
              <option value="__direta">Venda direta ({lojas.filter((l) => !l.revendaCodigo).length})</option>
            </select>
          )}
          {grupos.length > 0 && (
            <select className="sel sel-grp" aria-label="Filtrar por grupo" value={grupo} onChange={(e) => setGrupo(e.target.value)}>
              <option value="__todos">Todos os grupos</option>
              {grupos.map((g) => <option key={g} value={g}>{g}</option>)}
              <option value="__sem">Sem grupo</option>
            </select>
          )}
          <div className="search">
            <Ic d={icSearch} />
            <input placeholder="Buscar por nome ou CNPJ…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
          </div>
        </div>
        {sel.size > 0 && (
          <div className="sel-bar">
            <span><b>{sel.size}</b> selecionada(s) · <b>R$ {lojas.filter((x) => sel.has(x.cnpj)).reduce((t, x) => t + (isMaster ? (Number(x.valorAtual) || Number(x.mensalidade) || 0) : (Number(x.valorAPagar) || PRECO)), 0).toFixed(2).replace(".", ",")}</b></span>
            <button className="link" onClick={() => setSel(new Set())}>limpar</button>
            <button className="btn btn-mg btn-sm" onClick={() => (isMaster ? master : rev).pagarLote([...sel], () => setSel(new Set()))}><Ic d={icCard} /> Gerar boleto / Pix</button>
          </div>
        )}
        <TabelaLojas lojas={filtradas} onAtivar={onAtivar} ativando={ativando} m={isMaster ? master : null} rev={rev} onGrupo={onGrupo} onLogo={onLogo}
          onHist={onHist} sel={sel} onSel={toggleSel} onRecurso={onRecurso}
          vazio={{ t: lojas.length === 0 ? "Nenhuma loja ainda" : "Nada nesse filtro", s: lojas.length === 0 ? (isMaster ? "Nenhuma loja conectou ainda." : "Instale o agente com o seu código de revenda numa loja e ela aparece aqui.") : "Tente outro filtro ou limpe a busca." }} />
        <div className="foot">
          <span>Mostrando <b style={{ color: "var(--text)" }}>{filtradas.length}</b> de <b style={{ color: "var(--text)" }}>{lojas.length}</b> lojas</span>
          <span className="mono">Meu Giro · Vinny Tecnologia</span>
        </div>
      </div>
    </>
  );
}

function CodigoBox({ codigo }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    try { await navigator.clipboard.writeText(codigo); setCopiado(true); setTimeout(() => setCopiado(false), 1800); } catch (e) {}
  };
  if (!codigo) {
    return (
      <div className="code-box">
        <div><div className="code-l">Instalador</div><div className="code-v mono" style={{ fontSize: 20 }}>Venda direta</div></div>
        <span className="mini-sub" style={{ marginLeft: "auto" }}>sem código de revendedor</span>
      </div>
    );
  }
  return (
    <div className="code-box">
      <div><div className="code-l">Seu código de revenda</div><div className="code-v mono">{codigo}</div></div>
      <button className="btn btn-ghost btn-sm" onClick={copiar}><Ic d={icCopy} /> {copiado ? "Copiado!" : "Copiar"}</button>
    </div>
  );
}

function ViewNova({ sess, goto, isMaster }) {
  const passos = isMaster ? [
    "Baixe o instalador do sistema da loja na aba Instaladores (venda direta, sem código).",
    "Instale o agente do Meu Giro no PC da loja e rode o INSTALAR.bat como administrador.",
    "Quando o agente conectar, a loja aparece aqui na lista.",
    "Defina a mensalidade e o vencimento, e libere o acesso do lojista.",
  ] : [
    "Cada revendedor tem um código único (o seu está aqui embaixo). Ele já vem embutido no seu instalador.",
    "Instale o agente do Meu Giro no PC da loja (o instalador detecta o sistema - Host, Link, SysPDV ou Lider).",
    "Assim que o agente conectar, a loja aparece sozinha aqui no seu painel como \"Aguardando ativação\".",
    "Você paga R$ 30 pra liberar e o lojista passa a acessar o app.",
  ];
  return (
    <>
      <div className="head-row"><div><h1>Nova loja</h1><p className="sub">Como levar o Meu Giro pra mais uma loja.</p></div></div>
      <CodigoBox codigo={sess.codigo} />
      <div className="panel" style={{ marginTop: 18, padding: "6px 4px" }}>
        <ol className="steps">
          {passos.map((p, i) => (<li key={i}><span className="step-n">{i + 1}</span><span>{p}</span></li>))}
        </ol>
      </div>
      <div style={{ marginTop: 18 }}>
        <button className="btn btn-mg" onClick={() => goto("instaladores")}><Ic d={icDownload} /> Ir para Instaladores</button>
      </div>
    </>
  );
}

function ViewCobrancas({ lojas, onAtivar, ativando, isMaster, master }) {
  const ativas = lojas.filter((l) => l.status === "ativa" && !l.cortesia && !naoAtivadaRevenda(l));
  const pend = lojas.filter((l) => l.status === "aguardando");
  if (isMaster) {
    const bloqueadas = lojas.filter((l) => l.status === "bloqueada");
    const receita = ativas.reduce((s, l) => s + (Number(l.mensalidade) || 0), 0);
    return (
      <>
        <div className="head-row"><div><h1>Cobranças</h1><p className="sub">Mensalidades das lojas. Ajuste o valor na aba Lojas.</p></div></div>
        <div className="kpis kpis-3">
          <div className="kpi"><div className="k-ic ic-amber"><Ic d={icMoney} /></div><div className="k-l">Receita/mês</div><div className="k-v tnum">R$ {receita.toFixed(0)}</div><div className="k-s">{ativas.length} mensalidades ativas</div></div>
          <div className="kpi"><div className="k-ic ic-green"><Ic d={icCheck} /></div><div className="k-l">Ativas</div><div className="k-v tnum">{ativas.length}</div><div className="k-s">de {lojas.length} lojas</div></div>
          <div className="kpi"><div className="k-ic ic-red"><Ic d={icLock} /></div><div className="k-l">Bloqueadas</div><div className="k-v tnum" style={{ color: bloqueadas.length ? "var(--neg)" : undefined }}>{bloqueadas.length}</div><div className="k-s">pagamento pendente</div></div>
        </div>
        <div className="panel">
          <div className="p-head"><span className="p-title"><Ic d={icCard} /> Mensalidades</span></div>
          {lojas.length === 0 ? <div className="mini-empty">Nenhuma loja ainda.</div> : (
            <div className="tbl-wrap"><table>
              <thead><tr><th>Loja</th><th>Mensalidade</th><th>Fase</th><th>Vencimento</th><th>Status</th><th style={{ textAlign: "right" }}>Pagamento</th></tr></thead>
              <tbody>{lojas.map((l) => (
                <tr key={l.cnpj}>
                  <td className="loja"><div className="nm">{l.nome}</div><div className="cnpj">{fmtCnpj(l.cnpj)}</div></td>
                  <td className="mono" style={{ fontWeight: 600 }}>R$ {(Number(l.mensalidade) || 0).toFixed(0)}</td>
                  <td style={{ color: "var(--muted)", fontSize: 13 }}>{l.fase === "implantacao" ? "Implantação (R$ " + IMPLANTACAO + ")" : (l.fase || "—")}</td>
                  <td className="venc mono">{l.vencimentoAtual ? fmtData(l.vencimentoAtual) : (l.vencimento ? fmtData(l.vencimento) : "—")}</td>
                  <td><StatusPill l={l} /></td>
                  <td><div className="row-actions">
                    {l.fase === "implantacao" && <button className="iconbtn" title="Vencimento da implantação" disabled={ativando === l.cnpj} onClick={() => master.definirImplantacaoVence(l)}><Ic d={icClock} /></button>}
                    <button className="btn btn-mg btn-sm" title={l.fase !== "implantacao" && l.pagavel === false ? "Abre 10 dias antes do vencimento" : ""} disabled={ativando === l.cnpj || (l.fase !== "implantacao" && l.pagavel === false)} onClick={() => master.marcarPago(l)}><Ic d={icCheck} strokeWidth="3" /> Registrar pago</button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      </>
    );
  }
  return (
    <>
      <div className="head-row"><div><h1>Cobranças</h1><p className="sub">R$ 30 por loja ativada. Aqui estão as pagas e as pendentes.</p></div></div>
      <div className="kpis kpis-3">
        <div className="kpi"><div className="k-ic ic-green"><Ic d={icCheck} /></div><div className="k-l">Pagas (ativas)</div><div className="k-v tnum">{ativas.length}</div><div className="k-s">R$ {ativas.length * PRECO} liberados</div></div>
        <div className="kpi"><div className="k-ic ic-amber"><Ic d={icClock} /></div><div className="k-l">Pendentes</div><div className="k-v tnum" style={{ color: "var(--mg)" }}>{pend.length}</div><div className="k-s">R$ {pend.length * PRECO} a pagar</div></div>
        <div className="kpi"><div className="k-ic ic-blue"><Ic d={icMoney} /></div><div className="k-l">Recorrente/mês</div><div className="k-v tnum">R$ {ativas.length * PRECO}</div><div className="k-s">{ativas.length} lojas ativas</div></div>
      </div>
      <div className="panel">
        <div className="p-head"><span className="p-title">A pagar</span></div>
        {pend.length === 0 ? <div className="mini-empty">Nenhuma cobrança pendente.</div> : (
          <div className="tbl-wrap"><table><thead><tr><th>Loja</th><th>Valor</th><th style={{ textAlign: "right" }}>Ação</th></tr></thead>
            <tbody>{pend.map((l) => (
              <tr key={l.cnpj}><td className="loja"><div className="nm">{l.nome}</div><div className="cnpj">{fmtCnpj(l.cnpj)}</div></td>
                <td className="mono" style={{ color: "var(--mg)" }}>R$ 30,00</td>
                <td><div className="row-actions"><button className="btn btn-mg btn-sm" disabled={ativando === l.cnpj} onClick={() => onAtivar(l)}>Pagar · Ativar</button></div></td></tr>
            ))}</tbody></table></div>
        )}
      </div>
      <p className="note-inline"><Ic d={icInfo} /> A cobrança automática pelo Asaas está a caminho. Por enquanto o botão libera a loja direto.</p>
    </>
  );
}

function ViewRelatorios({ lojas, isMaster }) {
  const ativas = lojas.filter((l) => l.status === "ativa" && !l.cortesia && !naoAtivadaRevenda(l)).length;
  const aguardando = lojas.filter((l) => l.status === "aguardando").length;
  const bloqueadas = lojas.filter((l) => l.status === "bloqueada").length;
  const online = lojas.filter((l) => l.online).length;
  const receitaMaster = lojas.filter((l) => l.status === "ativa").reduce((s, l) => s + (Number(l.mensalidade) || 0), 0);
  const linhas = isMaster ? [
    ["Total de lojas", lojas.length],
    ["Ativas", ativas],
    ["Bloqueadas", bloqueadas],
    ["Online agora", online],
    ["Receita recorrente/mês", "R$ " + receitaMaster.toFixed(0)],
    ["Ticket médio (ativas)", "R$ " + (ativas ? (receitaMaster / ativas).toFixed(0) : 0)],
  ] : [
    ["Total de lojas", lojas.length],
    ["Ativas", ativas],
    ["Aguardando ativação", aguardando],
    ["Bloqueadas", bloqueadas],
    ["Online agora", online],
    ["Receita recorrente/mês", "R$ " + ativas * PRECO],
    ["Potencial (todas ativas)", "R$ " + lojas.length * PRECO],
  ];
  return (
    <>
      <div className="head-row"><div><h1>Relatórios</h1><p className="sub">{isMaster ? "Resumo do Meu Giro." : "Resumo da sua carteira de lojas."}</p></div></div>
      <div className="panel"><div className="tbl-wrap"><table>
        <tbody>{linhas.map(([k, v], i) => (
          <tr key={i}><td style={{ color: "var(--muted)" }}>{k}</td><td className="mono" style={{ textAlign: "right", fontWeight: 600 }}>{v}</td></tr>
        ))}</tbody>
      </table></div></div>
    </>
  );
}

function ViewInstaladores({ sess, mostrarToast }) {
  const [sistema, setSistema] = useState("host");
  const [baixando, setBaixando] = useState(false);

  async function baixar() {
    if (typeof JSZip === "undefined") { mostrarToast("Recurso ainda carregando, tente de novo.", false); return; }
    const sis = SISTEMAS.find((s) => s.k === sistema);
    setBaixando(true);
    try {
      const resp = await fetch(INSTALADOR_BASE + "?t=" + Date.now(), { cache: "no-store" });
      if (!resp.ok) throw new Error("base " + resp.status);
      const buf = await resp.arrayBuffer();
      const zip = await JSZip.loadAsync(buf);
      const nomeXml = Object.keys(zip.files).find((n) => /MeuGiroAgente\.xml$/i.test(n));
      if (!nomeXml) throw new Error("xml não encontrado no base");
      let xml = await zip.file(nomeXml).async("string");
      // define o jar do sistema escolhido
      xml = xml.replace(/(<env name="RAIZES_UPDATE_ASSET" value=")[^"]*(")/, "$1" + sis.asset + "$2");
      // injeta o codigo do revendedor. master = venda direta (sem codigo): nao injeta.
      if (sess.codigo) {
        if (/<env name="REVENDA_CODE"/.test(xml)) {
          xml = xml.replace(/\s*<env name="REVENDA_CODE"[^>]*\/>/, '\r\n  <env name="REVENDA_CODE" value="' + sess.codigo + '"/>');
        } else {
          xml = xml.replace(/(<env name="RAIZES_UPDATE_ASSET"[^>]*\/>)/, '$1\r\n  <env name="REVENDA_CODE" value="' + sess.codigo + '"/>');
        }
      } else {
        xml = xml.replace(/\s*<env name="REVENDA_CODE"[^>]*\/>/, '');
      }
      zip.file(nomeXml, xml);
      const out = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
      const url = URL.createObjectURL(out);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MeuGiro-${sis.k}-${sess.codigo || "direto"}.zip`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      mostrarToast("Instalador gerado! Confira os downloads.");
    } catch (err) {
      mostrarToast("Instalador ainda não disponível para download.", false);
    } finally {
      setBaixando(false);
    }
  }

  return (
    <>
      <div className="head-row"><div><h1>Instaladores</h1><p className="sub">{sess.codigo ? "Baixe o instalador já com o seu código embutido." : "Baixe o instalador do Meu Giro (venda direta, sem código)."}</p></div></div>
      <CodigoBox codigo={sess.codigo} />

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="p-head"><span className="p-title"><Ic d={icDownload} /> Gerar instalador</span></div>
        <div className="inst-body">
          <div className="field" style={{ marginBottom: 0, maxWidth: 340 }}>
            <label>Sistema da loja</label>
            <select className="sel" aria-label="Sistema da loja" value={sistema} onChange={(e) => setSistema(e.target.value)}>
              {SISTEMAS.map((s) => <option key={s.k} value={s.k}>{s.label}</option>)}
            </select>
          </div>
          <button className="btn btn-mg" disabled={baixando} onClick={baixar}>
            <Ic d={icDownload} /> {baixando ? "Gerando…" : "Baixar instalador"}
          </button>
        </div>
        {sistema === "link" && (
          <p className="sub" style={{ fontSize: 12.5, padding: "0 4px 10px" }}>
            No Link, ao rodar o <b className="mono">INSTALAR.bat</b> na loja ele pergunta a <b>porta</b> do banco (padrão 5432).
          </p>
        )}
      </div>

      <div className="panel" style={{ marginTop: 18, padding: "6px 4px" }}>
        <ol className="steps">
          <li><span className="step-n">1</span><span>Escolha o sistema da loja acima e clique em <b>Baixar instalador</b>{sess.codigo ? <> - o seu código <b className="mono">{sess.codigo}</b> já vai embutido.</> : "."}</span></li>
          <li><span className="step-n">2</span><span>Descompacte no PC da loja, abra a pasta <b className="mono">MeuGiro-Agente</b> e rode <b className="mono">INSTALAR.bat</b> como administrador. Ele se instala sozinho em <b className="mono">C:\MeuGiroAgente-Link</b> (ou -Host, -Lider, -SysPDV). No Link ele pergunta a porta e, se tiver mais de um banco, em qual conectar.</span></li>
          <li><span className="step-n">3</span><span>O agente sobe sozinho, descobre o CNPJ e a loja aparece aqui na lista.</span></li>
        </ol>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="p-head"><span className="p-title"><Ic d={icDownload} /> Meu Giro Mesas (computadores do salão e do caixa)</span></div>
        <div className="inst-body">
          <p className="sub" style={{ margin: 0, maxWidth: 560 }}>
            Programa do garçom e do caixa do restaurante (Link). Fala direto com o agente pela rede da loja e
            <b> funciona sem internet</b>. Vai nos outros computadores, não no servidor.
          </p>
          <a className="btn btn-mg" href={MESAS_DESKTOP} download>
            <Ic d={icDownload} /> Baixar Meu Giro Mesas
          </a>
        </div>
        <ol className="steps" style={{ marginTop: 4 }}>
          <li><span className="step-n">1</span><span>Descompacte e abra a pasta <b className="mono">MeuGiroMesas</b>.</span></li>
          <li><span className="step-n">2</span><span>Rode <b className="mono">1 - Configurar</b>: ele procura o servidor da loja na rede (ou digite o <b>nome do computador</b> do servidor ou o IP), testa e salva.</span></li>
          <li><span className="step-n">3</span><span>Rode <b className="mono">2 - Instalar</b>: cria o atalho <b>Meu Giro Mesas</b> na Área de Trabalho e abre. Na 1ª vez entre com o usuário do app com internet; depois funciona sem.</span></li>
        </ol>
      </div>
    </>
  );
}

function ViewConfig({ sess, onLogout, isMaster }) {
  const campos = isMaster
    ? [["Nome", sess.nome], ["E-mail", sess.email], ["Perfil", "Master (dono)"]]
    : [["Nome", sess.nome], ["E-mail", sess.email], ["Código de revenda", sess.codigo]];
  return (
    <>
      <div className="head-row"><div><h1>Configurações</h1><p className="sub">{isMaster ? "Seus dados de master." : "Seus dados de revendedor."}</p></div></div>
      <div className="panel" style={{ padding: 4 }}>
        {campos.map(([k, v], i) => (
          <div className="cfg-row" key={i}><span className="cfg-k">{k}</span><span className="cfg-v mono">{v}</span></div>
        ))}
      </div>
      <div style={{ marginTop: 18 }}>
        <button className="btn btn-ghost" onClick={onLogout}><Ic d={icLogout} /> Sair da conta</button>
      </div>
    </>
  );
}

/* ================= USUÁRIOS (revenda) ================= */
// Telas/permissões (as mesmas chaves do app). Vazio = vê tudo.
const MODULOS = [
  ["dashboard", "Início / painel"], ["vendas", "Vendas"], ["produtos", "Produtos"],
  ["contagem", "Contagem de estoque"], ["pessoas", "Pessoas"], ["contas_pagar", "Contas a pagar"],
  ["contas_receber", "Contas a receber"], ["fechamento", "Fechamento de caixa"],
  ["estatisticas", "Estatísticas / relatórios"], ["cancelamentos", "Cancelamentos"],
  ["fluxo_caixa", "Fluxo de caixa"], ["comparativo", "Comparativo"], ["compra_junto", "Compra junto"],
];
const ESTOQUE = ["produtos", "contagem"];
const ehSoEstoque = (p) => p && p.length === ESTOQUE.length && ESTOQUE.every((k) => p.includes(k));
const resumoPerms = (p) => !p || p.length === 0 ? "Vê tudo" : ehSoEstoque(p) ? "Só estoque" : p.length + (p.length === 1 ? " tela" : " telas");

/* Lojas do usuário: busca por nome ou CNPJ/CPF e marca várias. */
function LojasPicker({ lojas, sel, onChange }) {
  const [q, setQ] = useState("");
  const marcadas = sel || new Set();
  const t = q.trim().toLowerCase(), dig = q.replace(/\D/g, "");
  const lista = lojas.filter((l) => !t || (l.nome || "").toLowerCase().includes(t) || (dig && (l.cnpj || "").includes(dig)));
  const toggle = (c) => { const n = new Set(marcadas); n.has(c) ? n.delete(c) : n.add(c); onChange(n); };
  return (
    <div className="field">
      <label>Lojas {marcadas.size > 0 && <span style={{ color: "var(--mg)" }}>· {marcadas.size} marcada(s)</span>}</label>
      <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, CNPJ ou CPF" />
      <div style={{ maxHeight: 190, overflowY: "auto", marginTop: 6, border: "1px solid var(--line)", borderRadius: 10, padding: "4px 0" }}>
        {lista.length === 0 && <div style={{ padding: "8px 12px", color: "var(--muted)", fontSize: 13 }}>Nenhuma loja encontrada.</div>}
        {lista.map((l) => (
          <label key={l.cnpj} className="chk-row" style={{ padding: "6px 12px", margin: 0, cursor: "pointer", alignItems: "center" }}>
            <input type="checkbox" checked={marcadas.has(l.cnpj)} onChange={() => toggle(l.cnpj)} />
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
              <span>{l.nome || fmtCnpj(l.cnpj)}</span>
              <span style={{ fontSize: 11.5, color: "var(--muted)", fontFamily: "var(--mono, monospace)" }}>{fmtCnpj(l.cnpj)}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

/* Usuário do sistema da loja (ex.: LinkPro) ligado ao usuário do app, por loja. O que a pessoa
   grava pelo app fica no nome desse usuário no sistema. A lista vem do agente da loja. */
function UsuarioSistemaPicker({ sess, cnpjs, nomeLoja, valor, onChange }) {
  const [listas, setListas] = useState({}); // cnpj -> { carregando } | { itens } | { erro }
  const chave = cnpjs.join(",");
  useEffect(() => {
    cnpjs.forEach((c) => {
      if (listas[c] && !listas[c].erro) return;
      setListas((l) => ({ ...l, [c]: { carregando: true } }));
      api("/lojas/" + c + "/usuarios-sistema", { token: sess.token })
        .then((itens) => setListas((l) => ({ ...l, [c]: { itens: itens || [] } })))
        .catch((e) => setListas((l) => ({ ...l, [c]: { erro: e.status === 503 ? "Loja offline agora: tente de novo com o agente ligado." : e.message } })));
    });
  }, [chave, sess.token]);
  if (cnpjs.length === 0) return null;
  const nomeUs = (it) => (it.nome || it.login) + (it.login && it.nome && it.login.toLowerCase() !== it.nome.toLowerCase() ? " (" + it.login + ")" : "");
  return (
    <div className="field">
      <label>Usuário no sistema da loja</label>
      <div className="hint" style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>O que essa pessoa gravar pelo app (nota, estoque, produto) fica no nome desse usuário no sistema da loja.</div>
      {cnpjs.map((c) => {
        const st = listas[c] || { carregando: true };
        const atual = valor[c];
        return (
          <div key={c} style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
            {cnpjs.length > 1 && <span style={{ minWidth: 130, fontSize: 13 }}>{nomeLoja(c)}</span>}
            {st.carregando ? (
              <span style={{ fontSize: 13, color: "var(--muted)" }}>Carregando usuários da loja…</span>
            ) : st.erro ? (
              <span style={{ fontSize: 13, color: "var(--muted)" }}>{atual ? "Ligado a " + atual.nome + ". " : ""}{st.erro}</span>
            ) : (
              <select className="sel" style={{ flex: 1, minWidth: 180 }} aria-label={"Usuário no sistema: " + nomeLoja(c)}
                value={atual ? String(atual.id) : ""}
                onChange={(e) => {
                  const it = st.itens.find((x) => String(x.id) === e.target.value);
                  onChange({ ...valor, [c]: it ? { id: it.id, nome: it.nome || it.login } : null });
                }}>
                <option value="">Não ligar (grava como Meu Giro)</option>
                {st.itens.map((it) => <option key={it.id} value={String(it.id)}>{nomeUs(it)}</option>)}
              </select>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ViewUsuarios({ sess, lojas, mostrarToast }) {
  const [users, setUsers] = useState(null);
  const [erro, setErro] = useState("");
  const [form, setForm] = useState(null);
  const [busca, setBusca] = useState("");
  const [busy, setBusy] = useState(false);

  const carregar = useCallback(async () => {
    try { setUsers(await api("/usuarios", { token: sess.token }) || []); setErro(""); }
    catch (e) { setErro(e.message); setUsers([]); }
  }, [sess.token]);
  useEffect(() => { carregar(); }, [carregar]);

  const nomeLoja = (c) => { const l = lojas.find((x) => x.cnpj === c); return l ? l.nome : fmtCnpj(c); };

  function novo() {
    if (lojas.length === 0) { mostrarToast("Você precisa ter ao menos uma loja para criar usuários.", false); return; }
    setForm({ modo: "novo", nome: "", email: "", login: "", senha: "", cnpjs: new Set(lojas.length === 1 ? [lojas[0].cnpj] : []), sessaoUnica: false, deviceLock: false, consultaPreco: false, preset: "tudo", perms: new Set(), usSis: {} });
  }
  function editar(u) {
    const perms = new Set(u.permissoes || []);
    const preset = (u.permissoes || []).length === 0 ? "tudo" : ehSoEstoque(u.permissoes) ? "estoque" : "custom";
    const usSis = {};
    (u.empresas || []).forEach((e) => { if (e.usuarioSistemaId) usSis[e.cnpj] = { id: e.usuarioSistemaId, nome: e.usuarioSistemaNome || "" }; });
    setForm({ modo: "editar", id: u.id, nome: u.nome || "", email: u.email, login: u.login || "", cnpjs: new Set((u.empresas || []).map((e) => e.cnpj)), ativo: u.ativo !== false, sessaoUnica: u.sessaoUnica === true, deviceLock: u.deviceLock === true, consultaPreco: u.consultaPreco === true, preset, perms, usSis });
  }
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const togglePerm = (k) => setForm((f) => { const p = new Set(f.perms); p.has(k) ? p.delete(k) : p.add(k); return { ...f, perms: p, preset: "custom" }; });
  const permsFinais = (f) => f.preset === "tudo" ? [] : f.preset === "estoque" ? ESTOQUE : [...f.perms];
  // só as lojas marcadas; null = sem vínculo
  const usuariosSistema = (f) => Object.fromEntries([...f.cnpjs].map((c) => [c, (f.usSis || {})[c] || null]));

  async function liberarAparelho(u) {
    try { await api("/usuarios/" + u.id + "/liberar-aparelho", { method: "POST", token: sess.token }); mostrarToast("Aparelho liberado."); await carregar(); }
    catch (e) { mostrarToast(e.message, false); }
  }
  async function resetarAparelho(u) {
    try { await api("/usuarios/" + u.id + "/resetar-aparelho", { method: "POST", token: sess.token }); mostrarToast("Aparelho resetado."); await carregar(); }
    catch (e) { mostrarToast(e.message, false); }
  }

  async function salvar() {
    const f = form; setBusy(true);
    try {
      if (f.modo === "novo") {
        if ((!f.email.trim() && !f.login.trim()) || !f.senha.trim()) { mostrarToast("Preencha o e-mail ou o usuário, e a senha.", false); setBusy(false); return; }
        if (!f.cnpjs || f.cnpjs.size === 0) { mostrarToast("Marque ao menos uma loja.", false); setBusy(false); return; }
        await api("/usuarios", { method: "POST", token: sess.token, body: { nome: f.nome, email: f.email, login: f.login, senha: f.senha, cnpjs: [...f.cnpjs], sessaoUnica: !!f.sessaoUnica, deviceLock: !!f.deviceLock, consultaPreco: !!f.consultaPreco, permissoes: permsFinais(f), usuariosSistema: usuariosSistema(f) } });
        mostrarToast("Usuário criado.");
      } else if (f.modo === "editar") {
        if (!f.cnpjs || f.cnpjs.size === 0) { mostrarToast("Marque ao menos uma loja.", false); setBusy(false); return; }
        await api("/usuarios/" + f.id, { method: "POST", token: sess.token, body: { nome: f.nome, login: f.login, ativo: f.ativo, cnpjs: [...f.cnpjs], sessaoUnica: !!f.sessaoUnica, deviceLock: !!f.deviceLock, consultaPreco: !!f.consultaPreco, permissoes: permsFinais(f), usuariosSistema: usuariosSistema(f) } });
        mostrarToast("Usuário atualizado.");
      } else if (f.modo === "senha") {
        if (!f.senha.trim()) { mostrarToast("Digite a nova senha.", false); setBusy(false); return; }
        await api("/usuarios/" + f.id + "/senha", { method: "POST", token: sess.token, body: { senha: f.senha } });
        mostrarToast("Senha redefinida.");
      } else if (f.modo === "excluir") {
        await api("/usuarios/" + f.id, { method: "DELETE", token: sess.token });
        mostrarToast("Usuário excluído.");
      }
      setForm(null); await carregar();
    } catch (e) { mostrarToast(e.message, false); }
    setBusy(false);
  }

  return (
    <>
      <div className="head-row">
        <div><h1>Usuários</h1><p className="sub">Crie e gerencie os acessos das suas lojas. Defina se a pessoa vê tudo ou só o estoque.</p></div>
        <button className="btn btn-mg" onClick={novo}><Ic d={icPlus} /> Novo usuário</button>
      </div>

      {erro && <div className="erro-inline"><Ic d={icAlert} /> {erro}</div>}

      <div className="panel">
        <div className="p-head" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span className="p-title"><Ic d={icUsers} /> Usuários das suas lojas</span>
          {users && users.length > 0 && (
            <div className="search" style={{ marginLeft: "auto", minWidth: 260 }}>
              <Ic d={icSearch} />
              <input placeholder="Buscar por nome, e-mail, usuário ou loja…" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar usuário" />
            </div>
          )}
        </div>
        {users === null ? (
          <div className="mini-empty">Carregando…</div>
        ) : users.length === 0 ? (
          <div className="mini-empty">Nenhum usuário ainda. Clique em <b>Novo usuário</b> para criar o acesso de um cliente.</div>
        ) : (
          <div className="ulist">
            {(() => {
              const t = busca.trim().toLowerCase(), dig = busca.replace(/\D/g, "");
              const vis = users.filter((u) => !t
                || [u.nome, u.email, u.login].some((x) => (x || "").toLowerCase().includes(t))
                || (u.empresas || []).some((e) => (e.nome || nomeLoja(e.cnpj) || "").toLowerCase().includes(t) || (dig.length >= 3 && (e.cnpj || "").includes(dig))));
              return vis.length === 0 ? <div className="mini-empty">Nenhum usuário com “{busca}”.</div> : null;
            })()}
            {users.filter((u) => {
              const t = busca.trim().toLowerCase(), dig = busca.replace(/\D/g, "");
              return !t || [u.nome, u.email, u.login].some((x) => (x || "").toLowerCase().includes(t))
                || (u.empresas || []).some((e) => (e.nome || nomeLoja(e.cnpj) || "").toLowerCase().includes(t) || (dig.length >= 3 && (e.cnpj || "").includes(dig)));
            }).map((u) => (
              <div className="urow" key={u.id}>
                <div className="uav">{iniciais(u.nome || u.email)}</div>
                <div className="uinfo">
                  <div className="un">{u.nome || "(sem nome)"} {u.ativo === false && <span className="pill pill-block" style={{ marginLeft: 6 }}>Inativo</span>}</div>
                  <div className="ue">{[u.login && "usuário: " + u.login, u.email].filter(Boolean).join(" · ")}</div>
                  <div className="umeta">
                    <span className="grp-chip"><Ic d={icUsers} /> {(u.empresas || []).map((e) => e.nome || nomeLoja(e.cnpj)).join(", ") || "—"}</span>
                    <span className="grp-chip"><Ic d={icLock} /> {resumoPerms(u.permissoes)}</span>
                    {(u.empresas || []).some((e) => e.usuarioSistemaNome) && (
                      <span className="grp-chip" title="Usuário no sistema da loja"><Ic d={icKey} /> no sistema: {(u.empresas || []).filter((e) => e.usuarioSistemaNome).map((e) => e.usuarioSistemaNome).join(", ")}</span>
                    )}
                    {u.sessaoUnica && <span className="grp-chip"><Ic d={icPhone} /> sessão única</span>}
                    {u.deviceLock && <span className="grp-chip"><Ic d={icPhone} /> {u.deviceAtualNome ? u.deviceAtualNome : "sem aparelho"}</span>}
                  </div>
                  {u.devicePendente && (
                    <div className="dev-pend">
                      <Ic d={icPhone} />
                      <span style={{ flex: 1 }}>Novo aparelho pedindo acesso: <b>{u.devicePendenteNome || "aparelho"}</b></span>
                      <button className="btn btn-mg btn-sm" onClick={() => liberarAparelho(u)}>Liberar</button>
                    </div>
                  )}
                  {u.deviceLock && u.deviceAtualNome && !u.devicePendente && (
                    <button type="button" className="dev-reset" onClick={() => resetarAparelho(u)}>Resetar aparelho</button>
                  )}
                </div>
                <div className="uactions">
                  <button className="iconbtn" title="Editar" onClick={() => editar(u)}><Ic d={icEdit} /></button>
                  <button className="iconbtn" title="Redefinir senha" onClick={() => setForm({ modo: "senha", id: u.id, email: u.email || u.login, senha: "" })}><Ic d={icKey} /></button>
                  <button className="iconbtn" title="Excluir" onClick={() => setForm({ modo: "excluir", id: u.id, email: u.email || u.login })}><Ic d={icTrash} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {form && (
        <div className="modal-back" onClick={() => !busy && setForm(null)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-h">
              <span className={"modal-ic " + (form.modo === "excluir" ? "ic-red" : "ic-blue")}><Ic d={form.modo === "excluir" ? icTrash : form.modo === "senha" ? icKey : icUsers} /></span>
              <h3>{form.modo === "novo" ? "Novo usuário" : form.modo === "senha" ? "Redefinir senha" : form.modo === "excluir" ? "Excluir usuário" : "Editar usuário"}</h3>
            </div>

            {form.modo === "excluir" ? (
              <p className="modal-desc">Excluir <b>{form.email}</b>? Ele perde o acesso ao app. Essa ação não volta atrás.</p>
            ) : form.modo === "senha" ? (
              <>
                <p className="modal-desc">Nova senha para <b>{form.email}</b>. Ele troca por uma própria no 1º acesso.</p>
                <div className="field"><label>Nova senha</label>
                  <input type="text" value={form.senha} onChange={(e) => set({ senha: e.target.value })} placeholder="mín. 4 caracteres" autoFocus /></div>
              </>
            ) : (
              <>
                <div className="field"><label>Nome</label>
                  <input type="text" value={form.nome} onChange={(e) => set({ nome: e.target.value })} placeholder="Nome do usuário" autoFocus /></div>
                {form.modo === "novo" ? (
                  <>
                    <div className="field"><label>E-mail (opcional se tiver usuário)</label>
                      <input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} placeholder="email@exemplo.com" /></div>
                    <div className="field"><label>Usuário (pra entrar no app)</label>
                      <input type="text" value={form.login} onChange={(e) => set({ login: e.target.value.toLowerCase() })} placeholder="ex.: preco bentevi" />
                      <div className="hint" style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>A pessoa entra com o e-mail ou com esse usuário. Não pode repetir.</div></div>
                    <div className="field"><label>Senha</label>
                      <input type="text" value={form.senha} onChange={(e) => set({ senha: e.target.value })} placeholder="mín. 4 caracteres" /></div>
                    <LojasPicker lojas={lojas} sel={form.cnpjs} onChange={(cnpjs) => set({ cnpjs })} />
                    <UsuarioSistemaPicker sess={sess} cnpjs={[...form.cnpjs]} nomeLoja={nomeLoja} valor={form.usSis || {}} onChange={(usSis) => set({ usSis })} />
                  </>
                ) : (
                  <>
                    <div className="field"><label>E-mail</label>
                      <input type="email" value={form.email || "(sem e-mail)"} disabled /></div>
                    <div className="field"><label>Usuário (pra entrar no app)</label>
                      <input type="text" value={form.login} onChange={(e) => set({ login: e.target.value.toLowerCase() })} placeholder="ex.: preco bentevi" />
                      <div className="hint" style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>A pessoa entra com o e-mail ou com esse usuário. Não pode repetir.</div></div>
                    <LojasPicker lojas={lojas} sel={form.cnpjs} onChange={(cnpjs) => set({ cnpjs })} />
                    <UsuarioSistemaPicker sess={sess} cnpjs={[...form.cnpjs]} nomeLoja={nomeLoja} valor={form.usSis || {}} onChange={(usSis) => set({ usSis })} />
                    <label className="chk-row" style={{ marginBottom: 10 }}>
                      <input type="checkbox" checked={form.ativo} onChange={(e) => set({ ativo: e.target.checked })} /> <span>Usuário ativo (pode entrar no app)</span>
                    </label>
                  </>
                )}
                <label className="chk-row" style={{ marginBottom: 10 }}>
                  <input type="checkbox" checked={!!form.sessaoUnica} onChange={(e) => set({ sessaoUnica: e.target.checked })} /> <span>Sessão única (ao entrar em outro celular, desconecta o anterior)</span>
                </label>
                <label className="chk-row" style={{ marginBottom: 12 }}>
                  <input type="checkbox" checked={!!form.deviceLock} onChange={(e) => set({ deviceLock: e.target.checked })} /> <span>Travar por aparelho (fica preso a 1 celular; outro aparelho só entra se você liberar)</span>
                </label>
                <label className="chk-row" style={{ marginBottom: 12 }}>
                  <input type="checkbox" checked={!!form.consultaPreco} onChange={(e) => set({ consultaPreco: e.target.checked })} /> <span>Só consulta de preço (ao entrar, abre direto na câmera pra ler o código do produto)</span>
                </label>
                {!form.consultaPreco && (<>
                <div className="field">
                  <label>Acesso</label>
                  <div className="preset-row">
                    {[["tudo", "Vê tudo"], ["estoque", "Só estoque"], ["custom", "Personalizado"]].map(([k, t]) => (
                      <button type="button" key={k} className={"preset " + (form.preset === k ? "on" : "")} onClick={() => set({ preset: k })}>{t}</button>
                    ))}
                  </div>
                </div>
                {form.preset === "custom" && (
                  <div className="perms-grid">
                    {MODULOS.map(([k, t]) => (
                      <label className="chk-row" key={k}>
                        <input type="checkbox" checked={form.perms.has(k)} onChange={() => togglePerm(k)} /> <span>{t}</span>
                      </label>
                    ))}
                  </div>
                )}
                </>)}
              </>
            )}

            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setForm(null)} disabled={busy}>Cancelar</button>
              <button type="button" className={"btn " + (form.modo === "excluir" ? "btn-danger" : "btn-mg")} onClick={salvar} disabled={busy}>
                {busy ? "Aguarde…" : form.modo === "novo" ? "Criar usuário" : form.modo === "senha" ? "Salvar senha" : form.modo === "excluir" ? "Excluir" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* Usuários master da revenda: logins extras do painel que veem SÓ os clientes
   desta revenda. (Quem vê todas as revendas é apenas o dono/master do sistema.) */
/* Solicitações: pedidos de troca de senha feitos no "Esqueci a senha" do app.
   A pessoa já escolheu a senha nova; aqui o revendedor (ou o master) aprova ou recusa. */
function ViewSolicitacoes({ sess, mostrarToast, isMaster, onSolicitacoes }) {
  const [itens, setItens] = useState(null);
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState("");
  const base = isMaster ? ADMIN_API : API;

  const carregar = useCallback(async () => {
    try {
      const l = await api("/solicitacoes", { base, token: sess.token }) || [];
      setItens(l); setErro("");
      if (onSolicitacoes) onSolicitacoes(l.length);
    } catch (e) { setErro(e.message); setItens([]); }
  }, [sess.token, base]);
  useEffect(() => { carregar(); }, [carregar]);

  async function decidir(s, acao) {
    setBusy(s.id + acao);
    try {
      await api("/solicitacoes/" + s.id + "/" + acao, { method: "POST", base, token: sess.token });
      mostrarToast(acao === "aprovar" ? "Senha nova liberada para " + s.email + "." : "Pedido recusado.");
      await carregar();
    } catch (e) { mostrarToast(e.message, false); }
    setBusy("");
  }

  const quando = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR") + " às " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      <div className="head-row">
        <div><h1>Solicitações</h1><p className="sub">Pedidos de troca de senha feitos no app. Ao aprovar, a senha que a pessoa escolheu passa a valer.</p></div>
      </div>

      {erro && <div className="erro-inline"><Ic d={icAlert} /> {erro}</div>}

      <div className="panel">
        <div className="p-head"><span className="p-title"><Ic d={icKey} /> Troca de senha</span></div>
        {itens === null ? (
          <div className="mini-empty">Carregando…</div>
        ) : itens.length === 0 ? (
          <div className="mini-empty">Nenhuma solicitação pendente.</div>
        ) : (
          <div className="ulist">
            {itens.map((s) => (
              <div className="urow" key={s.id}>
                <div className="uav">{iniciais(s.nome || s.email)}</div>
                <div className="uinfo">
                  <div className="un">{s.nome || "(sem nome)"}</div>
                  <div className="ue">{s.email}</div>
                  <div className="umeta">
                    {(s.lojas || []).length > 0 && <span className="grp-chip"><Ic d={icUsers} /> {s.lojas.join(", ")}</span>}
                    <span className="grp-chip"><Ic d={icClock} /> pediu em {quando(s.pedidoEm)}</span>
                  </div>
                </div>
                <div className="uactions">
                  <button className="btn btn-mg btn-sm" disabled={!!busy} onClick={() => decidir(s, "aprovar")}><Ic d={icCheck} /> Aprovar</button>
                  <button className="btn btn-ghost btn-sm" disabled={!!busy} onClick={() => decidir(s, "recusar")}>Recusar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// Master: outra revenda instalou numa loja que ja tem revenda -> autorizar ou recusar.
function ViewTransferencias({ sess, mostrarToast, recarregar }) {
  const [itens, setItens] = useState(null);
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState("");

  const carregar = useCallback(async () => {
    try { setItens(await api("/transferencias", { base: ADMIN_API, token: sess.token }) || []); setErro(""); }
    catch (e) { setErro(e.message); setItens([]); }
  }, [sess.token]);
  useEffect(() => { carregar(); }, [carregar]);

  async function decidir(t, acao) {
    setBusy(t.cnpj + acao);
    try {
      await api("/transferencias/" + t.cnpj + "/" + acao, { method: "POST", base: ADMIN_API, token: sess.token });
      mostrarToast(acao === "aprovar" ? "Loja transferida para " + (t.nova.nome || t.nova.codigo) + ". Ela ativa no painel dela." : "Transferência recusada.");
      await carregar(); if (recarregar) await recarregar();
    } catch (e) { mostrarToast(e.message, false); }
    setBusy("");
  }

  const quando = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR") + " às " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };
  const doc = (v) => { const d = (v || "").replace(/\D/g, ""); return d.length === 14 ? fmtCnpj(d) : d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : (v || "—"); };

  const Card = ({ titulo, r, destaque }) => (
    <div style={{ flex: "1 1 240px", minWidth: 0, border: "1px solid " + (destaque ? "var(--mg)" : "var(--line, rgba(255,255,255,.12))"), borderRadius: 10, padding: 12 }}>
      <div className="ue" style={{ textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 4 }}>{titulo}</div>
      {r && r.encontrada ? (
        <>
          <div className="un">{r.nome}</div>
          <div className="ue">{doc(r.cpfCnpj)} · <span className="mono">{r.codigo}</span>{r.ativo === false ? " · inativa" : ""}</div>
          {r.email && <div className="ue">{r.email}</div>}
          {r.telefone && <div className="ue">{r.telefone}</div>}
          {(r.cidade || r.uf) && <div className="ue">{[r.cidade, r.uf].filter(Boolean).join(" / ")}</div>}
        </>
      ) : (
        <div className="ue">Código <span className="mono">{(r && r.codigo) || "—"}</span> (revenda não encontrada)</div>
      )}
    </div>
  );

  return (
    <>
      <div className="head-row">
        <div><h1>Transferências</h1><p className="sub">Uma revenda instalou o agente numa loja que já é de outra revenda. A loja só muda de dono se você autorizar.</p></div>
      </div>

      {erro && <div className="erro-inline"><Ic d={icAlert} /> {erro}</div>}

      <div className="panel">
        <div className="p-head"><span className="p-title"><Ic d={icUsers} /> Pedidos pendentes</span></div>
        {itens === null ? (
          <div className="mini-empty">Carregando…</div>
        ) : itens.length === 0 ? (
          <div className="mini-empty">Nenhum pedido pendente.</div>
        ) : (
          <div className="ulist">
            {itens.map((t) => (
              <div className="urow" key={t.cnpj} style={{ flexWrap: "wrap", alignItems: "flex-start" }}>
                <div className="uinfo" style={{ flex: "1 1 100%" }}>
                  <div className="ue" style={{ textTransform: "uppercase", letterSpacing: ".04em" }}>Cliente</div>
                  <div className="un">{t.nome || "Loja sem nome"}</div>
                  <div className="ue">{fmtCnpj(t.cnpj)}</div>
                  <div style={{ margin: "8px 0 2px" }}>
                    <b style={{ color: "var(--mg)" }}>{t.nova.nome || t.nova.codigo}</b> quer pegar o cliente <b>{t.nome || fmtCnpj(t.cnpj)}</b>, que hoje é da revenda <b>{t.atual.nome || t.atual.codigo}</b>.
                  </div>
                  <div className="umeta">
                    <span className={"on-dot " + (t.online ? "on" : "off")}><i></i> {t.online ? "online" : "offline"}</span>
                    <span className="grp-chip"><Ic d={icClock} /> pediu em {quando(t.pedidoEm)}</span>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                    <Card titulo="Revenda atual" r={t.atual} />
                    <Card titulo="Quer pegar a loja" r={t.nova} destaque />
                  </div>
                </div>
                <div className="uactions" style={{ marginTop: 10 }}>
                  <button className="btn btn-mg btn-sm" disabled={!!busy} onClick={() => decidir(t, "aprovar")}><Ic d={icCheck} /> Autorizar</button>
                  <button className="btn btn-ghost btn-sm" disabled={!!busy} onClick={() => decidir(t, "recusar")}>Recusar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function ViewMasters({ sess, mostrarToast }) {
  const [users, setUsers] = useState(null);
  const [erro, setErro] = useState("");
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  const carregar = useCallback(async () => {
    try { setUsers(await api("/masters", { token: sess.token }) || []); setErro(""); }
    catch (e) { setErro(e.message); setUsers([]); }
  }, [sess.token]);
  useEffect(() => { carregar(); }, [carregar]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  async function salvar() {
    const f = form; setBusy(true);
    try {
      if (f.modo === "novo") {
        if (!f.email.trim() || !f.senha.trim()) { mostrarToast("Preencha e-mail e senha.", false); setBusy(false); return; }
        await api("/masters", { method: "POST", token: sess.token, body: { nome: f.nome, email: f.email, senha: f.senha } });
        mostrarToast("Usuário master criado.");
      } else if (f.modo === "editar") {
        await api("/masters/" + f.id, { method: "POST", token: sess.token, body: { nome: f.nome, ativo: f.ativo } });
        mostrarToast("Usuário atualizado.");
      } else if (f.modo === "senha") {
        if (!f.senha.trim()) { mostrarToast("Digite a nova senha.", false); setBusy(false); return; }
        await api("/masters/" + f.id + "/senha", { method: "POST", token: sess.token, body: { senha: f.senha } });
        mostrarToast("Senha redefinida.");
      } else if (f.modo === "excluir") {
        await api("/masters/" + f.id, { method: "DELETE", token: sess.token });
        mostrarToast("Usuário excluído.");
      }
      setForm(null); await carregar();
    } catch (e) { mostrarToast(e.message, false); }
    setBusy(false);
  }

  return (
    <>
      <div className="head-row">
        <div><h1>Usuários master</h1><p className="sub">Logins extras do seu painel. Eles enxergam só os clientes da sua revenda, igual você.</p></div>
        <button className="btn btn-mg" onClick={() => setForm({ modo: "novo", nome: "", email: "", senha: "" })}><Ic d={icPlus} /> Novo master</button>
      </div>

      {erro && <div className="erro-inline"><Ic d={icAlert} /> {erro}</div>}

      <div className="panel">
        <div className="p-head"><span className="p-title"><Ic d={icUsers} /> Usuários master da revenda</span></div>
        {users === null ? (
          <div className="mini-empty">Carregando…</div>
        ) : users.length === 0 ? (
          <div className="mini-empty">Nenhum usuário master ainda. Clique em <b>Novo master</b> para dar acesso ao painel a outra pessoa da sua equipe.</div>
        ) : (
          <div className="ulist">
            {users.map((u) => (
              <div className="urow" key={u.id}>
                <div className="uav">{iniciais(u.nome || u.email)}</div>
                <div className="uinfo">
                  <div className="un">{u.nome || "(sem nome)"} {u.ativo === false && <span className="pill pill-block" style={{ marginLeft: 6 }}>Inativo</span>}</div>
                  <div className="ue">{u.email}</div>
                </div>
                <div className="uactions">
                  <button className="iconbtn" title="Editar" onClick={() => setForm({ modo: "editar", id: u.id, nome: u.nome || "", email: u.email, ativo: u.ativo !== false })}><Ic d={icEdit} /></button>
                  <button className="iconbtn" title="Redefinir senha" onClick={() => setForm({ modo: "senha", id: u.id, email: u.email, senha: "" })}><Ic d={icKey} /></button>
                  <button className="iconbtn" title="Excluir" onClick={() => setForm({ modo: "excluir", id: u.id, email: u.email })}><Ic d={icTrash} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {form && (
        <div className="modal-back" onClick={() => !busy && setForm(null)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-h">
              <span className={"modal-ic " + (form.modo === "excluir" ? "ic-red" : "ic-blue")}><Ic d={form.modo === "excluir" ? icTrash : form.modo === "senha" ? icKey : icUsers} /></span>
              <h3>{form.modo === "novo" ? "Novo usuário master" : form.modo === "senha" ? "Redefinir senha" : form.modo === "excluir" ? "Excluir usuário" : "Editar usuário master"}</h3>
            </div>

            {form.modo === "excluir" ? (
              <p className="modal-desc">Excluir <b>{form.email}</b>? Ele perde o acesso ao painel. Essa ação não volta atrás.</p>
            ) : form.modo === "senha" ? (
              <>
                <p className="modal-desc">Nova senha para <b>{form.email}</b>.</p>
                <div className="field"><label>Nova senha</label>
                  <input type="text" value={form.senha} onChange={(e) => set({ senha: e.target.value })} placeholder="mín. 4 caracteres" autoFocus /></div>
              </>
            ) : (
              <>
                <div className="field"><label>Nome</label>
                  <input type="text" value={form.nome} onChange={(e) => set({ nome: e.target.value })} placeholder="Nome da pessoa" autoFocus /></div>
                {form.modo === "novo" ? (
                  <>
                    <div className="field"><label>E-mail (login)</label>
                      <input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} placeholder="email@exemplo.com" /></div>
                    <div className="field"><label>Senha</label>
                      <input type="text" value={form.senha} onChange={(e) => set({ senha: e.target.value })} placeholder="mín. 4 caracteres" /></div>
                  </>
                ) : (
                  <>
                    <div className="field"><label>E-mail (login)</label>
                      <input type="email" value={form.email} disabled /></div>
                    <label className="chk-row" style={{ marginBottom: 10 }}>
                      <input type="checkbox" checked={form.ativo} onChange={(e) => set({ ativo: e.target.checked })} /> <span>Usuário ativo (pode entrar no painel)</span>
                    </label>
                  </>
                )}
              </>
            )}

            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setForm(null)} disabled={busy}>Cancelar</button>
              <button type="button" className={"btn " + (form.modo === "excluir" ? "btn-danger" : "btn-mg")} onClick={salvar} disabled={busy}>
                {busy ? "Aguarde…" : form.modo === "novo" ? "Criar master" : form.modo === "senha" ? "Salvar senha" : form.modo === "excluir" ? "Excluir" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* Revendas (só DONO): lista todas as revendas e cria/gere os usuários-master de cada uma.
   Master de revenda = login que enxerga SÓ os clientes daquela revenda. */
function ViewRevendas({ sess, mostrarToast }) {
  const [revendas, setRevendas] = useState(null);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState(null);
  const [users, setUsers] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  const carregarRevendas = useCallback(async () => {
    try { setRevendas(await api("/revendas", { base: ADMIN_API, token: sess.token }) || []); setErro(""); }
    catch (e) { setErro(e.message); setRevendas([]); }
  }, [sess.token]);
  useEffect(() => { carregarRevendas(); }, [carregarRevendas]);

  const carregarMasters = useCallback(async (rev) => {
    try { setUsers(await api("/revendas/" + rev.id + "/masters", { base: ADMIN_API, token: sess.token }) || []); }
    catch (e) { mostrarToast(e.message, false); setUsers([]); }
  }, [sess.token, mostrarToast]);

  function abrir(rev) { setSel(rev); setUsers(null); carregarMasters(rev); }
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  async function salvar(vincular = false) {
    const f = form; setBusy(true);
    const bp = "/revendas/" + sel.id + "/masters";
    try {
      if (f.modo === "novo") {
        if (!f.email.trim()) { mostrarToast("Preencha o e-mail.", false); setBusy(false); return; }
        if (!vincular && !f.senha.trim()) { mostrarToast("Preencha a senha.", false); setBusy(false); return; }
        await api(bp, { method: "POST", base: ADMIN_API, token: sess.token, body: { nome: f.nome, email: f.email, senha: f.senha, vincular } });
        mostrarToast(vincular ? "E-mail transformado em master." : "Master criado.");
      } else if (f.modo === "editar") {
        await api(bp + "/" + f.id, { method: "POST", base: ADMIN_API, token: sess.token, body: { nome: f.nome, ativo: f.ativo } });
        mostrarToast("Master atualizado.");
      } else if (f.modo === "senha") {
        if (!f.senha.trim()) { mostrarToast("Digite a nova senha.", false); setBusy(false); return; }
        await api(bp + "/" + f.id + "/senha", { method: "POST", base: ADMIN_API, token: sess.token, body: { senha: f.senha } });
        mostrarToast("Senha redefinida.");
      } else if (f.modo === "excluir") {
        await api(bp + "/" + f.id, { method: "DELETE", base: ADMIN_API, token: sess.token });
        mostrarToast("Master excluído.");
      }
      setForm(null); await carregarMasters(sel); await carregarRevendas();
    } catch (e) {
      if (f.modo === "novo" && !vincular && e.status === 409) { set({ jaExiste: true }); }
      else { mostrarToast(e.message, false); }
    }
    setBusy(false);
  }

  const filtradas = (revendas || []).filter((r) => {
    const q = busca.trim().toLowerCase();
    if (!q) return true;
    return (r.nome || "").toLowerCase().includes(q) || (r.cpfCnpj || "").toLowerCase().includes(q) || (r.codigo || "").toLowerCase().includes(q);
  });

  const modal = form && (
    <div className="modal-back" onClick={() => !busy && setForm(null)}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal-h">
          <span className={"modal-ic " + (form.modo === "excluir" ? "ic-red" : "ic-blue")}><Ic d={form.modo === "excluir" ? icTrash : form.modo === "senha" ? icKey : icUsers} /></span>
          <h3>{form.modo === "novo" ? (form.jaExiste ? "Transformar em master" : "Novo master da revenda") : form.modo === "senha" ? "Redefinir senha" : form.modo === "excluir" ? "Excluir master" : "Editar master"}</h3>
        </div>
        {form.modo === "excluir" ? (
          <p className="modal-desc">Excluir <b>{form.email}</b>? Ele perde o acesso ao painel. Essa ação não volta atrás.</p>
        ) : form.modo === "senha" ? (
          <>
            <p className="modal-desc">Nova senha para <b>{form.email}</b>.</p>
            <div className="field"><label>Nova senha</label>
              <input type="text" value={form.senha} onChange={(e) => set({ senha: e.target.value })} placeholder="mín. 4 caracteres" autoFocus /></div>
          </>
        ) : (
          <>
            <div className="field"><label>Nome</label>
              <input type="text" value={form.nome} onChange={(e) => set({ nome: e.target.value })} placeholder="Nome da pessoa" autoFocus /></div>
            {form.modo === "novo" ? (
              <>
                <div className="field"><label>E-mail (login)</label>
                  <input type="email" value={form.email} onChange={(e) => set({ email: e.target.value, jaExiste: false })} placeholder="email@exemplo.com" /></div>
                <div className="field"><label>Senha</label>
                  <input type="text" value={form.senha} onChange={(e) => set({ senha: e.target.value })} placeholder={form.jaExiste ? "deixe em branco pra manter a atual" : "mín. 4 caracteres"} /></div>
                {form.jaExiste && <p className="modal-desc" style={{ color: "#f5a623" }}>Esse e-mail já existe no sistema. Clique em <b>Transformar em master</b> pra dar a ele o acesso de master desta revenda (vê só os clientes dela).</p>}
              </>
            ) : (
              <>
                <div className="field"><label>E-mail (login)</label>
                  <input type="email" value={form.email} disabled /></div>
                <label className="chk-row" style={{ marginBottom: 10 }}>
                  <input type="checkbox" checked={form.ativo} onChange={(e) => set({ ativo: e.target.checked })} /> <span>Usuário ativo (pode entrar no painel)</span>
                </label>
              </>
            )}
          </>
        )}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={() => setForm(null)} disabled={busy}>Cancelar</button>
          <button type="button" className={"btn " + (form.modo === "excluir" ? "btn-danger" : "btn-mg")} onClick={() => salvar(form.modo === "novo" && form.jaExiste === true)} disabled={busy}>
            {busy ? "Aguarde…" : form.modo === "novo" ? (form.jaExiste ? "Transformar em master" : "Criar master") : form.modo === "senha" ? "Salvar senha" : form.modo === "excluir" ? "Excluir" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );

  // --- tela da revenda selecionada: os masters dela ---
  if (sel) {
    return (
      <>
        <div className="head-row">
          <div>
            <button className="btn btn-ghost btn-sm" onClick={() => { setSel(null); setUsers(null); }} style={{ marginBottom: 8 }}>← Revendas</button>
            <h1>{sel.nome}</h1>
            <p className="sub">Masters desta revenda. Eles enxergam só os clientes dela.{sel.codigo ? " Código: " + sel.codigo + "." : ""}</p>
          </div>
          <button className="btn btn-mg" onClick={() => setForm({ modo: "novo", nome: "", email: "", senha: "" })}><Ic d={icPlus} /> Novo master</button>
        </div>
        <div className="panel">
          <div className="p-head"><span className="p-title"><Ic d={icUsers} /> Usuários master</span></div>
          {users === null ? (
            <div className="mini-empty">Carregando…</div>
          ) : users.length === 0 ? (
            <div className="mini-empty">Nenhum master ainda. Clique em <b>Novo master</b> para criar um login pra essa revenda.</div>
          ) : (
            <div className="ulist">
              {users.map((u) => (
                <div className="urow" key={u.id}>
                  <div className="uav">{iniciais(u.nome || u.email)}</div>
                  <div className="uinfo">
                    <div className="un">{u.nome || "(sem nome)"} {u.ativo === false && <span className="pill pill-block" style={{ marginLeft: 6 }}>Inativo</span>}</div>
                    <div className="ue">{u.email}</div>
                  </div>
                  <div className="uactions">
                    <button className="iconbtn" title="Editar" onClick={() => setForm({ modo: "editar", id: u.id, nome: u.nome || "", email: u.email, ativo: u.ativo !== false })}><Ic d={icEdit} /></button>
                    <button className="iconbtn" title="Redefinir senha" onClick={() => setForm({ modo: "senha", id: u.id, email: u.email, senha: "" })}><Ic d={icKey} /></button>
                    <button className="iconbtn" title="Excluir" onClick={() => setForm({ modo: "excluir", id: u.id, email: u.email })}><Ic d={icTrash} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {modal}
      </>
    );
  }

  // --- lista de revendas ---
  return (
    <>
      <div className="head-row">
        <div><h1>Revendas</h1><p className="sub">Todas as revendas. Entre numa pra criar os logins-master dela (veem só os clientes daquela revenda).</p></div>
      </div>
      {erro && <div className="erro-inline"><Ic d={icAlert} /> {erro}</div>}
      <div className="panel">
        <div className="p-head">
          <span className="p-title"><Ic d={icUsers} /> Revendas</span>
          <div className="search">
            <Ic d={icSearch} />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, CNPJ ou código…" aria-label="Buscar" />
          </div>
        </div>
        {revendas === null ? (
          <div className="mini-empty">Carregando…</div>
        ) : filtradas.length === 0 ? (
          <div className="mini-empty">{(revendas || []).length === 0 ? "Nenhuma revenda cadastrada ainda." : "Nada nesse filtro."}</div>
        ) : (
          <div className="ulist">
            {filtradas.map((r) => (
              <div className="urow" key={r.id}>
                <div className="uav">{iniciais(r.nome)}</div>
                <div className="uinfo">
                  <div className="un">{r.nome} {r.ativo === false && <span className="pill pill-block" style={{ marginLeft: 6 }}>Inativa</span>}</div>
                  <div className="ue">{r.cpfCnpj || "sem CNPJ"}{r.codigo ? " · cód " + r.codigo : ""} · {r.qtdMasters || 0} master{(r.qtdMasters || 0) === 1 ? "" : "s"}</div>
                  <div className="umeta">
                    <span className="grp-chip" style={{ fontWeight: 700 }}><Ic d={icUsers} /> {r.qtdClientes || 0} cliente{(r.qtdClientes || 0) === 1 ? "" : "s"}</span>
                    {(r.clientes || []).map((c) => (
                      <span className="grp-chip" key={c.cnpj} title={fmtCnpj(c.cnpj)}>
                        <span className={"on-dot " + (c.online ? "on" : "off")}><i></i></span>{c.nome || fmtCnpj(c.cnpj)}{c.bloqueada ? " (bloqueada)" : ""}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="uactions">
                  <button className="btn btn-mg btn-sm" onClick={() => abrir(r)}><Ic d={icUsers} /> Masters</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* Saúde das lojas (só master): o que os agentes viram na rede de cada cliente (IP do PC mudou, impressora
   mudou de IP / desligou / voltou, conflito de IP, terminal do LinkPro com IP novo ou repetido). Também chega
   como aviso no celular do master. Atualiza sozinho a cada 30s. */
const SAUDE_TIPO = { ip_pc: "IP do PC", impressora_ip: "Impressora", impressora_fora: "Impressora", impressora_voltou: "Impressora",
  conflito_ip: "Conflito de IP", terminal_ip: "Terminal LinkPro", terminal_conflito: "Conflito de IP", agente_off: "Computador", agente_on: "Computador",
  etiquetadora_fora: "Impressora de etiqueta", etiquetadora_voltou: "Impressora de etiqueta", etiquetadora_porta: "Impressora de etiqueta" };
const SAUDE_COR = { grave: "#f05252", aviso: "#f5a524", ok: "#22c55e" };
function ViewSaude({ sess }) {
  const [ev, setEv] = useState(null);
  const [loja, setLoja] = useState("");
  const [nivel, setNivel] = useState("");
  const [erro, setErro] = useState("");
  const carregar = useCallback(async () => {
    try { setEv(await api("/saude?limite=300", { base: ADMIN_API, token: sess.token }) || []); setErro(""); }
    catch (e) { setErro(e.message); if (ev == null) setEv([]); }
  }, [sess.token]);
  useEffect(() => { carregar(); const t = setInterval(carregar, 30000); return () => clearInterval(t); }, [carregar]);
  const [marcando, setMarcando] = useState(null);
  async function marcar(e, sim) {
    setMarcando(e.id);
    try { await api("/saude/" + e.id + "/resolvendo", { method: "POST", body: { resolvendo: sim }, base: ADMIN_API, token: sess.token }); await carregar(); }
    catch (er) { setErro(er.message); }
    setMarcando(null);
  }

  const lojas = {};
  (ev || []).forEach((e) => { lojas[e.loja] = e.lojaNome || e.loja; });
  const lista = (ev || []).filter((e) => (!loja || e.loja === loja) && (!nivel || e.nivel === nivel));
  const graves24 = (ev || []).filter((e) => e.nivel === "grave" && Date.now() - new Date(e.criadoEm).getTime() < 864e5).length;
  const quando = (iso) => {
    const d = new Date(iso), h = new Date();
    const p = (n) => String(n).padStart(2, "0");
    const dia = d.toDateString() === h.toDateString() ? "hoje" : p(d.getDate()) + "/" + p(d.getMonth() + 1);
    return dia + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  };
  return (
    <>
      <div className="head-row">
        <div><h1>Saúde das lojas</h1><p className="sub">O que os agentes viram na rede de cada cliente. Os mesmos avisos chegam no seu celular.{graves24 ? " " + graves24 + " problema(s) grave(s) nas últimas 24h." : ""}</p></div>
      </div>

      <div className="panel" style={{ padding: 14, marginBottom: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div className="field" style={{ marginBottom: 0, minWidth: 220 }}>
          <select value={loja} onChange={(e) => setLoja(e.target.value)}>
            <option value="">Todas as lojas</option>
            {Object.entries(lojas).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0, minWidth: 160 }}>
          <select value={nivel} onChange={(e) => setNivel(e.target.value)}>
            <option value="">Todos</option>
            <option value="grave">Grave</option>
            <option value="aviso">Aviso</option>
            <option value="ok">Resolvido</option>
          </select>
        </div>
        <button className="btn btn-ghost" onClick={carregar}>Atualizar</button>
      </div>

      {erro && <div className="erro-inline"><Ic d={icAlert} /> {erro}</div>}

      <div className="panel">
        <div className="p-head"><span className="p-title"><Ic d={icAlert} /> Eventos</span></div>
        {ev === null ? <div className="mini-empty">Carregando…</div> : !lista.length ? (
          <div className="mini-empty">Tudo tranquilo. Quando o IP, a impressora ou a rede de um cliente der problema, aparece aqui.</div>
        ) : (
          <div className="tbl-wrap"><table>
            <thead><tr><th>Quando</th><th>Loja</th><th>Tipo</th><th>O que aconteceu</th><th>Situação</th></tr></thead>
            <tbody>
              {lista.map((e) => (
                <tr key={e.id}>
                  <td style={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{quando(e.criadoEm)}</td>
                  <td>{e.lojaNome || e.loja}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: SAUDE_COR[e.nivel] || "#999" }} />
                      {SAUDE_TIPO[e.tipo] || e.tipo}
                    </span>
                  </td>
                  <td><b>{e.titulo}</b>{e.detalhe ? <div style={{ opacity: .75, fontSize: 13 }}>{e.detalhe}</div> : null}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {e.nivel === "ok" ? <span style={{ color: "#22c55e", fontWeight: 700, fontSize: 12 }}>Normalizou</span>
                      : e.resolvido ? <span style={{ color: "#22c55e", fontWeight: 700, fontSize: 12 }}>Resolvido</span>
                      : e.resolvendo ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                          <span title={"Avisos pausados" + (e.resolvendoEm ? " desde " + quando(e.resolvendoEm) : "")} style={{ color: "#3b9be8", fontWeight: 700, fontSize: 12 }}>Resolvendo{e.resolvendoPor ? " · " + e.resolvendoPor : ""}</span>
                          <button className="btn btn-ghost btn-sm" disabled={marcando === e.id} onClick={() => marcar(e, false)}>Desmarcar</button>
                        </span>)
                      : <button className="btn btn-mg btn-sm" disabled={marcando === e.id} title="Para de repetir o aviso desse problema até ele se resolver" onClick={() => marcar(e, true)}>{marcando === e.id ? "…" : "Estou resolvendo"}</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
    </>
  );
}

/* Catálogo de produtos por código de barras (só master). Pesquisa por nome ou EAN;
   alimenta o "Buscar" no cadastro de produto do app. */
function ViewCatalogo({ sess }) {
  const [q, setQ] = useState("");
  const [itens, setItens] = useState(null);
  const [total, setTotal] = useState(null);
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);

  const buscar = useCallback(async (term) => {
    setBusy(true); setErro("");
    try {
      const data = await api("/catalogo?q=" + encodeURIComponent(term || ""), { base: ADMIN_API, token: sess.token });
      setTotal(data.total);
      setItens(data.itens || []);
    } catch (e) { setErro(e.message); setItens([]); }
    setBusy(false);
  }, [sess.token]);

  useEffect(() => { buscar(""); }, [buscar]); // pega o total

  function onSubmit(e) { e.preventDefault(); buscar(q); }

  return (
    <>
      <div className="head-row">
        <div><h1>Catálogo</h1><p className="sub">Base de produtos por código de barras.{total != null ? " " + total.toLocaleString("pt-BR") + " itens." : ""} Alimenta o "Buscar" no cadastro de produto do app.</p></div>
      </div>

      <div className="panel" style={{ padding: 14, marginBottom: 14 }}>
        <form onSubmit={onSubmit} style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou código de barras..." autoFocus />
          </div>
          <button className="btn btn-mg" type="submit" disabled={busy}>{busy ? "Buscando…" : "Buscar"}</button>
        </form>
      </div>

      {erro && <div className="erro-inline"><Ic d={icAlert} /> {erro}</div>}

      <div className="panel">
        <div className="p-head"><span className="p-title"><Ic d={icFile} /> Resultados</span></div>
        {itens === null ? (
          <div className="mini-empty">Carregando…</div>
        ) : itens.length === 0 ? (
          <div className="mini-empty">Digite um nome ou código de barras e clique em <b>Buscar</b>.</div>
        ) : (
          <div className="tbl-wrap"><table>
            <thead><tr><th>Código de barras</th><th>Nome</th><th>NCM</th><th>CEST</th><th>Un.</th></tr></thead>
            <tbody>
              {itens.map((p) => (
                <tr key={p.barras}>
                  <td style={{ fontVariantNumeric: "tabular-nums" }}>{p.barras}</td>
                  <td>{p.nome}</td>
                  <td>{p.ncm || "—"}</td>
                  <td>{p.cest || "—"}</td>
                  <td>{p.unidade || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
    </>
  );
}

/* ================= ESTÚDIO DE ETIQUETAS =================
   Etiquetas de gôndola das lojas Host: ativa o recurso na loja, monta o layout (estilo, faixa,
   tamanhos, posição) com prévia ao vivo e imprime na impressora de etiqueta da loja. O mesmo layout
   vira o modelo do próprio Host (quando "o Host imprime com este layout" está ligado). */
const icTag = <><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>;
const ETQ_AMARELO = "#ffe14d";

const ETQ_MODELOS = [
  ["gondola", "Gôndola", "Faixa com o preço e código ao lado"],
  ["oferta", "Oferta", "De / Por, com faixa OFERTA"],
  ["atacado", "Atacado", "Unidade e a partir de N un."],
  ["medida", "Por medida", "Preço e R$ por litro ou kg"],
  ["clube", "Clube", "Preço normal e do clube"],
  ["mini", "Mini", "Gôndola estreita"],
  ["classico", "Clássico", "Duas colunas, preço grande"],
  ["blackfriday", "Black Friday", "Tarja, De riscado e preço"],
  ["menorpreco", "Menor preço", "Tarja MENOR PREÇO DA REGIÃO"],
  ["dodia", "Oferta do dia", "SÓ HOJE com a data"],
  ["queima", "Queima de estoque", "Moldura e últimas unidades"],
  ["validade", "Validade próxima", "De, Por e % de desconto"],
  ["limite", "Limite por cliente", "Faixa preta e limite"],
  ["segunda", "2ª unidade", "% de desconto na 2ª"],
  ["leve", "Leve e pague", "Leve 3, pague 2"],
  ["fardo", "Fardo × unidade", "Unidade e fardo fechado"],
  ["progressiva", "Tabela progressiva", "Preço por faixa de quantidade"],
  ["pix", "Desconto no Pix", "Cartão e no Pix"],
  ["parcelado", "Parcelado", "À vista e em N vezes"],
  ["cashback", "Cashback", "Valor que volta no app"],
  ["acougue", "Açougue", "Preço o kg em caixa"],
  ["hortifruti", "Hortifruti", "Preço o kg e produto fresco"],
  ["frios", "Frios por 100g", "Preço de 100 g e do kg"],
  ["padaria", "Padaria", "Feito aqui hoje, /kg"],
  ["organico", "Orgânico", "Selo orgânico"],
  ["importado", "Importado", "Origem e detalhe"],
  ["gelada", "Bebida gelada", "Tarja BEM GELADA"],
  ["pet", "Pet shop", "Preço em destaque e por kg"],
  ["farmacia", "Farmácia", "Faixa da categoria, De / por"],
  ["categoria", "Faixa de categoria", "Barra lateral e categoria"],
  ["novidade", "Novidade", "Faixa NOVIDADE NA LOJA"],
  ["cartaz", "Cartaz de ponta", "Faixa OFERTA e preço grande"],
  ["minimalista", "Minimalista", "Só o número, sem R$"],
  ["invertido", "Invertido", "Etiqueta preta (gasta mais fita)"],
  ["redondo", "Adesivo redondo", "Círculo SÓ R$"],
  ["peq", "Pequena: preço e barras", "Para 33x22: nome, preço e barras"],
  ["peqpreco", "Pequena: só preço", "Para 33x22: nome e preço grande"],
  ["peqbarras", "Pequena: código de barras", "Para 33x22: barras com os números"],
];
/* Modelos que cabem em etiqueta pequena (menos de 50 mm de largura). */
const ETQ_PEQUENOS = new Set(["peq", "peqpreco", "peqbarras", "mini", "minimalista"]);
const etqModelosDoPapel = (largura) => ETQ_MODELOS.filter(([v]) => (Number(largura) < 50) === ETQ_PEQUENOS.has(v) || (Number(largura) < 50 ? false : v === "mini" || v === "minimalista"));

/* Textos e números de cada modelo (o que não vem do cadastro): [chave, rótulo, padrão]. */
const ETQ_PARAMS = {
  blackfriday: [["tag", "Texto da tarja", "BLACK FRIDAY"]],
  menorpreco: [["tag", "Texto da tarja", "MENOR PREÇO DA REGIÃO"]],
  dodia: [["sub", "Rodapé", "válido até o fechamento"]],
  queima: [["tag", "Texto da tarja", "QUEIMA DE ESTOQUE"], ["sub", "Subtítulo", "Últimas unidades"]],
  validade: [["tag", "Texto da tarja", "VALIDADE PRÓXIMA"], ["sub", "Subtítulo", "Consumir logo"]],
  limite: [["qtd", "Limite por cliente (unidades)", "3"]],
  segunda: [["pct", "Desconto na 2ª unidade (%)", "50"]],
  leve: [["leve", "Leve", "3"], ["pague", "Pague", "2"]],
  fardo: [["qtd", "Unidades no fardo", "6"], ["pct", "Desconto no fardo (%)", "13.6"]],
  progressiva: [["qtd2", "2ª faixa: a partir de (un.)", "6"], ["pct2", "2ª faixa: desconto (%)", "10"],
    ["qtd3", "3ª faixa: a partir de (un.)", "12"], ["pct3", "3ª faixa: desconto (%)", "17.5"], ["sub", "Rodapé", "Preço por unidade em cada faixa"]],
  pix: [["pct", "Desconto no Pix (%)", "10"]],
  parcelado: [["parcelas", "Parcelas", "10"], ["sub", "Embaixo", "sem juros"]],
  cashback: [["valor", "Cashback (R$)", "3"], ["sub", "Embaixo", "de cashback no app"]],
  acougue: [["tag", "Categoria", "BOVINO · RESFRIADO"], ["sub", "Detalhe", "Peça embalada a vácuo"], ["suf", "Unidade", "o kg"]],
  hortifruti: [["tag", "Selo", "PRODUTO FRESCO"], ["sub", "Origem", "Origem: Brasil"], ["suf", "Unidade", "o kg"]],
  frios: [["tag", "Texto do topo", "FATIADO NA HORA"], ["suf", "Porção", "100g"]],
  padaria: [["tag", "Texto da tarja", "FEITO AQUI HOJE"], ["sub", "Subtítulo", ""], ["suf", "Unidade", "/kg"]],
  organico: [["tag", "Selo", "ORGÂNICO CERTIFICADO"], ["sub", "Produtor / origem", "Produtor local"], ["suf", "Unidade", "o maço"]],
  importado: [["tag", "Origem", "IMPORTADO"], ["sub", "Detalhe", "Safra · 750ml"]],
  gelada: [["tag", "Texto da tarja", "BEM GELADA"]],
  pet: [["tag", "Categoria", "PET"]],
  farmacia: [["tag", "Categoria", "CUIDADOS PESSOAIS"]],
  categoria: [["tag", "Categoria", "LIMPEZA"]],
  novidade: [["tag", "Texto da faixa", "NOVIDADE NA LOJA"]],
  cartaz: [["tag", "Texto da faixa", "OFERTA"]],
  redondo: [["tag", "Texto de cima", "SÓ"]],
};
/* Modelos que mostram o "De R$" digitado na lista de impressão. */
const ETQ_COM_DE = new Set(["oferta", "blackfriday", "validade", "farmacia"]);

function EtqSeg({ value, onChange, opts }) {
  return (
    <div className="tabs" style={{ display: "inline-flex" }}>
      {opts.map(([v, t]) => <button key={v} type="button" className={"tab" + (value === v ? " on" : "")} onClick={() => onChange(v)}>{t}</button>)}
    </div>
  );
}

function EtqNum({ label, value, onChange, step = 0.5, min = 0, max = 200 }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5, color: "var(--muted)" }}>
      {label}
      <input type="number" step={step} min={min} max={max} value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? min : Number(e.target.value))}
        style={{ width: "100%", padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--ink-2)", color: "var(--text)", fontFamily: "var(--mono)" }} />
    </label>
  );
}

function EtqFaixa({ label, value, onChange, min, max, step = 0.5, suf = " pt" }) {
  return (
    <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}><span>{label}</span><b style={{ color: "var(--text)", fontFamily: "var(--mono)" }}>{Number(value).toFixed(step < 1 ? 1 : 0)}{suf}</b></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--mg)" }} />
    </label>
  );
}

/* Cupom da cozinha (loja Link): o pedido que sai na impressora da cozinha. Antes só dava pra editar na
   página do PC da loja; aqui vai pela central. Mesmos campos do cupom.json do agente. */
function CupomCozinha({ cnpj, base, sess, mostrarToast }) {
  const rota = (a) => `/etiquetas/${cnpj}/cupom-${a}`;
  const [cfg, setCfg] = useState(null);
  const [salvo, setSalvo] = useState(null);
  const [pontos, setPontos] = useState([]);
  const [previa, setPrevia] = useState(null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [testePonto, setTestePonto] = useState("");
  const [testando, setTestando] = useState(false);

  useEffect(() => {
    let vivo = true;
    setCfg(null); setErro(""); setPrevia(null);
    Promise.all([api(rota("config"), { base, token: sess.token }), api(rota("pontos"), { base, token: sess.token }).catch(() => [])])
      .then(([c, p]) => { if (!vivo) return; setCfg(c); setSalvo(JSON.stringify(c)); setPontos(p || []); if ((p || []).length) setTestePonto(String(p[0].id)); })
      .catch((e) => vivo && setErro(e.message));
    return () => { vivo = false; };
  }, [cnpj]);

  useEffect(() => {
    if (!cfg) return;
    const t = setTimeout(async () => {
      try { const r = await api(rota("previa"), { method: "POST", base, token: sess.token, body: cfg }); setPrevia("data:image/png;base64," + r.png); }
      catch (e) { setErro(e.message); }
    }, 450);
    return () => clearTimeout(t);
  }, [cfg]);

  const set = (k) => (v) => setCfg((c) => ({ ...c, [k]: v }));
  const mudou = cfg && JSON.stringify(cfg) !== salvo;

  async function salvar() {
    setSalvando(true);
    try { const c = await api(rota("config"), { method: "POST", base, token: sess.token, body: cfg }); setCfg(c); setSalvo(JSON.stringify(c)); mostrarToast("Cupom da cozinha salvo."); }
    catch (e) { mostrarToast(e.message, false); }
    setSalvando(false);
  }
  async function padrao() {
    try { setCfg(await api(rota("padrao"), { base, token: sess.token })); mostrarToast("Voltou pro padrão. Salve pra valer."); }
    catch (e) { mostrarToast(e.message, false); }
  }
  async function teste() {
    if (mudou) { mostrarToast("Salve antes de imprimir o teste.", false); return; }
    setTestando(true);
    try { await api(rota("teste"), { method: "POST", base, token: sess.token, body: { idPonto: Number(testePonto) } }); mostrarToast("Teste enviado pra impressora da cozinha."); }
    catch (e) { mostrarToast(e.message, false); }
    setTestando(false);
  }

  if (erro && !cfg) return <div className="erro-inline"><Ic d={icAlert} /> {erro}</div>;
  if (!cfg) return <div className="panel"><div className="mini-empty">Carregando o cupom da loja…</div></div>;

  const caixa = { padding: 16 };
  const titulo = (t) => <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)", margin: "14px 0 10px" }}>{t}</div>;
  const chk = (k, t) => <label key={k} className="chk-row" style={{ marginBottom: 8 }}><input type="checkbox" checked={!!cfg[k]} onChange={(e) => set(k)(e.target.checked)} /> {t}</label>;
  const texto = (k, t, ph) => (
    <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>{t}
      <input value={cfg[k] || ""} onChange={(e) => set(k)(e.target.value)} placeholder={ph}
        style={{ width: "100%", marginTop: 4, padding: "9px 11px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--ink-2)", color: "var(--text)" }} />
    </label>
  );
  const sempre = cfg.modo === "sempre";
  const marcado = new Set((cfg.pontosAgente || []).map(Number));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 380px) 1fr", gap: 14, alignItems: "start" }} className="etq-grid">
      <div className="panel" style={caixa}>
        {titulo("Quem imprime os pedidos")}
        <EtqSeg value={sempre ? "sempre" : "reserva"} onChange={set("modo")} opts={[["reserva", "LinkPro (agente de reserva)"], ["sempre", "Sempre o agente"]]} />
        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>{sempre
          ? "O agente imprime os pontos marcados com este layout; a impressão deles fica desligada no LinkPro."
          : "O LinkPro imprime como sempre; o agente só imprime se o LinkPro parar (fila parada)."}</p>
        {sempre && (pontos.length
          ? pontos.map((p) => (
            <label key={p.id} className="chk-row" style={{ marginBottom: 6 }}>
              <input type="checkbox" checked={marcado.has(Number(p.id))} onChange={(e) => {
                const s = new Set(marcado); e.target.checked ? s.add(Number(p.id)) : s.delete(Number(p.id));
                set("pontosAgente")([...s]);
              }} /> {p.nome} <span style={{ color: "var(--muted)", fontSize: 12 }}>({p.impressora})</span>
            </label>))
          : <p style={{ fontSize: 12, color: "var(--muted)" }}>Nenhum ponto de impressão do LinkPro com impressora do Windows.</p>)}

        {titulo("Papel")}
        <EtqSeg value={String(cfg.papelMm)} onChange={(v) => set("papelMm")(Number(v))} opts={[["80", "80 mm"], ["58", "58 mm"]]} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
          <EtqNum label="Cópias" value={cfg.copias} onChange={set("copias")} step={1} min={1} max={5} />
          <EtqNum label="Sobra no fim (mm)" value={cfg.sobraFinal} onChange={set("sobraFinal")} step={1} max={60} />
          <EtqNum label="Margem esquerda (mm)" value={cfg.margemEsq} onChange={set("margemEsq")} max={20} />
          <EtqNum label="Margem direita (mm)" value={cfg.margemDir} onChange={set("margemDir")} max={20} />
          <EtqNum label="Deslocar tudo (mm, − esquerda)" value={cfg.deslocamento} onChange={set("deslocamento")} min={-20} max={20} />
        </div>

        {titulo("Topo")}
        {texto("textoTopo", "Texto no topo", "Ex.: nome da loja")}
        {chk("mostrarSetor", "Mostrar o setor")}
        {chk("setorEspacado", "Setor com letras espaçadas")}
        {chk("faixaPreta", "Mesa em branco numa faixa preta")}
        {chk("mostrarAtendimento", "Número do atendimento")}
        {chk("mostrarHora", "Hora do pedido")}
        <EtqFaixa label="Setor" value={cfg.tamSetor} onChange={set("tamSetor")} min={6} max={20} />
        <EtqFaixa label="Mesa" value={cfg.tamMesa} onChange={set("tamMesa")} min={10} max={40} />
        <EtqFaixa label="Informações" value={cfg.tamInfo} onChange={set("tamInfo")} min={6} max={16} />

        {titulo("Itens")}
        {chk("itemNegrito", "Itens em negrito")}
        {chk("itemCaixaAlta", "Itens em maiúsculas")}
        {chk("linhaEntreItens", "Linha entre os itens")}
        {chk("mostrarObs", "Observações")}
        <EtqFaixa label="Quantidade" value={cfg.tamQtd} onChange={set("tamQtd")} min={8} max={28} />
        <EtqFaixa label="Item" value={cfg.tamItem} onChange={set("tamItem")} min={8} max={24} />
        <EtqFaixa label="Observação" value={cfg.tamObs} onChange={set("tamObs")} min={6} max={18} />

        {titulo("Rodapé")}
        {chk("mostrarGarcom", "Garçom")}
        {chk("mostrarQtdItens", "Quantidade de itens")}
        {chk("mostrarTotal", "Total")}
        {chk("mostrarDataHora", "Data e hora")}
        {texto("textoRodape", "Texto do rodapé", "Ex.: NÃO É DOCUMENTO FISCAL")}
        <EtqFaixa label="Rodapé" value={cfg.tamRodape} onChange={set("tamRodape")} min={6} max={12} />

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button className="btn btn-ghost" onClick={padrao}>Padrão</button>
          <button className="btn btn-mg" style={{ flex: 1 }} disabled={!mudou || salvando} onClick={salvar}>{salvando ? "Salvando…" : mudou ? "Salvar cupom" : "Cupom salvo"}</button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="panel" style={caixa}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 10 }}>Prévia</div>
          <div style={{ background: "#2a2f3a", borderRadius: 12, padding: 18, display: "flex", justifyContent: "center" }}>
            {previa
              ? <img src={previa} alt="Prévia do cupom" style={{ width: cfg.papelMm === 58 ? 250 : 330, maxWidth: "100%", background: "#fff", boxShadow: "0 8px 28px rgba(0,0,0,.45)", borderRadius: 4 }} />
              : <div className="mini-empty">Montando a prévia…</div>}
          </div>
          {erro && <div className="erro-inline" style={{ marginTop: 10 }}><Ic d={icAlert} /> {erro}</div>}
        </div>
        <div className="panel" style={caixa}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 10 }}>Imprimir teste</div>
          {pontos.length ? (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div className="field" style={{ marginBottom: 0, minWidth: 220, flex: 1 }}>
                <select value={testePonto} onChange={(e) => setTestePonto(e.target.value)}>
                  {pontos.map((p) => <option key={p.id} value={p.id}>{p.nome} · {p.impressora}</option>)}
                </select>
              </div>
              <button className="btn btn-mg" disabled={testando} onClick={teste}>{testando ? "Enviando…" : "Imprimir teste"}</button>
            </div>
          ) : <div className="mini-empty">Nenhum ponto de impressão com impressora do Windows nesta loja.</div>}
        </div>
      </div>
    </div>
  );
}

function ViewEtiquetas({ sess, lojas, isMaster, onRecurso, mostrarToast }) {
  const hosts = lojas.filter((l) => !l.sistema || l.sistema === "Host" || l.sistema === "Link");
  const [cnpj, setCnpj] = useState(() => (hosts.find((l) => (l.recursos || []).includes("etiquetas")) || hosts[0] || {}).cnpj || "");
  const loja = hosts.find((l) => l.cnpj === cnpj);
  const ativo = !!loja && (loja.recursos || []).includes("etiquetas");
  const base = isMaster ? ADMIN_API : API;
  const rota = (acao) => `/etiquetas/${cnpj}/${acao}`;

  const [info, setInfo] = useState(null);     // {impressoras, modelosHost}
  const [cfg, setCfg] = useState(null);
  const [salvo, setSalvo] = useState(null);   // pra saber se mudou
  const [erro, setErro] = useState("");
  const [previa, setPrevia] = useState(null);
  const [carregandoPrevia, setCarregandoPrevia] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [ativando, setAtivando] = useState(false);
  const [busca, setBusca] = useState("");
  const [achados, setAchados] = useState([]);
  const [fila, setFila] = useState([]);       // [{p, qtd}]
  const [imprimindo, setImprimindo] = useState(false);
  const [aba, setAba] = useState("etiquetas"); // etiquetas | cupom (cupom da cozinha: so Link)
  const temCupom = !!loja && loja.sistema === "Link";
  const abaAtual = temCupom ? aba : "etiquetas";

  // carrega o layout da loja
  useEffect(() => {
    setCfg(null); setSalvo(null); setInfo(null); setPrevia(null); setErro(""); setFila([]); setAchados([]);
    if (!cnpj || !ativo) return;
    let vivo = true;
    api(rota("config"), { base, token: sess.token })
      .then((r) => { if (!vivo) return; setCfg(r.config); setSalvo(JSON.stringify(r.config)); setInfo({ impressoras: r.impressoras || [], modelosHost: r.modelosHost || [], tabelas: r.tabelas || [] }); })
      .catch((e) => vivo && setErro(e.message));
    return () => { vivo = false; };
  }, [cnpj, ativo]);

  // prévia ao vivo (espera parar de mexer)
  const idPrevia = fila.length ? Number(fila[fila.length - 1].p.id) : null;
  useEffect(() => {
    if (!cfg) return;
    const t = setTimeout(async () => {
      setCarregandoPrevia(true);
      try {
        const ult = fila.length ? fila[fila.length - 1] : null;
        const r = await api(rota("previa"), { method: "POST", base, token: sess.token, body: { config: cfg, ...(idPrevia ? { produto: idPrevia } : {}),
          ...(ult && Number(ult.de) > 0 ? { precoDe: Number(ult.de) } : {}), ...(ult && Number(ult.clube) > 0 ? { precoClube: Number(ult.clube) } : {}) } });
        setPrevia("data:image/png;base64," + r.png); setErro("");
      } catch (e) { setErro(e.message); }
      setCarregandoPrevia(false);
    }, 450);
    return () => clearTimeout(t);
  }, [cfg, idPrevia, fila.length ? fila[fila.length - 1].de + "|" + fila[fila.length - 1].clube : ""]);

  // busca de produtos
  useEffect(() => {
    const t0 = busca.trim();
    if (t0.length < 2 && !/^\d+$/.test(t0)) { setAchados([]); return; } // codigo ("2") busca na hora
    const t = setTimeout(async () => {
      try { setAchados(((await api(rota("produtos") + "?q=" + encodeURIComponent(busca.trim()), { base, token: sess.token })) || []).slice(0, 12)); }
      catch (e) { setAchados([]); }
    }, 400);
    return () => clearTimeout(t);
  }, [busca]);

  const set = (k) => (v) => setCfg((c) => ({ ...c, [k]: v }));
  const mudou = cfg && JSON.stringify(cfg) !== salvo;

  async function ativar() {
    setAtivando(true);
    await onRecurso(loja, { id: "etiquetas", nome: "Estúdio de Etiquetas" }, true);
    setAtivando(false);
  }

  async function salvar() {
    setSalvando(true);
    try {
      const r = await api(rota("config"), { method: "POST", base, token: sess.token, body: cfg });
      setSalvo(JSON.stringify(cfg));
      mostrarToast(r && r.mensagem ? "Layout salvo. " + r.mensagem : "Layout salvo.");
    } catch (e) { mostrarToast(e.message, false); }
    setSalvando(false);
  }

  function adicionar(p) {
    setFila((f) => f.some((i) => i.p.id === p.id) ? f.map((i) => i.p.id === p.id ? { ...i, qtd: i.qtd + 1 } : i) : [...f, { p, qtd: 1 }]);
    setBusca(""); setAchados([]);
  }
  const total = fila.reduce((s, i) => s + i.qtd, 0);

  // régua de alinhamento / avançar uma etiqueta (usam o layout salvo na loja)
  const [ferr, setFerr] = useState("");
  async function ferramenta(qual) {
    if (mudou) { mostrarToast("Salve o layout antes.", false); return; }
    setFerr(qual);
    try {
      await api(rota(qual), { method: "POST", base, token: sess.token, body: {} });
      mostrarToast(qual === "regua" ? "Régua enviada: tire uma foto da etiqueta pra ajustar a posição."
        : qual === "calibrar" ? "Calibração enviada: a impressora acertou o papel e puxou 2 etiquetas." : "A impressora puxou uma etiqueta.");
    } catch (e) { mostrarToast(e.message, false); }
    setFerr("");
  }

  async function imprimir() {
    if (mudou) { mostrarToast("Salve o layout antes de imprimir.", false); return; }
    setImprimindo(true);
    try {
      const r = await api(rota("imprimir"), { method: "POST", base, token: sess.token, body: { itens: fila.map((i) => ({ id: Number(i.p.id), qtd: i.qtd,
        ...(Number(i.de) > 0 ? { precoDe: Number(i.de) } : {}), ...(Number(i.clube) > 0 ? { precoClube: Number(i.clube) } : {}) })) } });
      mostrarToast((r.etiquetas === 1 ? "1 etiqueta enviada" : r.etiquetas + " etiquetas enviadas") + " pra impressora da loja.");
      setFila([]);
    } catch (e) { mostrarToast(e.message, false); }
    setImprimindo(false);
  }

  const caixa = { padding: 16 };
  const titulo = (t) => <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)", margin: "4px 0 10px" }}>{t}</div>;

  return (
    <>
      <div className="head-row">
        <div><h1>Estúdio de Impressão</h1><p className="sub">Etiquetas de gôndola e cupom da cozinha de cada loja: monte o layout, veja a prévia e imprima na loja. O Host e o LinkPro também podem usar estes layouts.</p></div>
      </div>

      <div className="panel" style={{ padding: 14, marginBottom: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div className="field" style={{ marginBottom: 0, minWidth: 280 }}>
          <select value={cnpj} onChange={(e) => setCnpj(e.target.value)}>
            {!hosts.length && <option value="">Nenhuma loja Host ou Link</option>}
            {hosts.map((l) => <option key={l.cnpj} value={l.cnpj}>{(l.nome || l.cnpj) + (l.sistema ? " · " + l.sistema : "") + ((l.recursos || []).includes("etiquetas") ? "" : "  (desativado)")}</option>)}
          </select>
        </div>
        {loja && !ativo && <button className="btn btn-mg" disabled={ativando} onClick={ativar}><Ic d={icTag} /> {ativando ? "Ativando…" : "Ativar nesta loja"}</button>}
        {mudou && abaAtual === "etiquetas" && <button className="btn btn-mg" disabled={salvando} onClick={salvar}>{salvando ? "Salvando…" : "Salvar layout"}</button>}
        {temCupom && ativo && <div style={{ marginLeft: "auto" }}><EtqSeg value={abaAtual} onChange={setAba} opts={[["etiquetas", "Etiquetas"], ["cupom", "Cupom da cozinha"]]} /></div>}
      </div>

      {erro && abaAtual === "etiquetas" && <div className="erro-inline"><Ic d={icAlert} /> {erro}</div>}

      {loja && !ativo && (
        <div className="panel"><div className="mini-empty">O Estúdio de Impressão ainda não está ativo em <b>{loja.nome}</b>. Clique em <b>Ativar nesta loja</b>.</div></div>
      )}

      {ativo && abaAtual === "cupom" && <CupomCozinha cnpj={cnpj} base={base} sess={sess} mostrarToast={mostrarToast} />}

      {ativo && abaAtual === "etiquetas" && !cfg && !erro && <div className="panel"><div className="mini-empty">Carregando o layout da loja…</div></div>}

      {ativo && abaAtual === "etiquetas" && cfg && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 380px) 1fr", gap: 14, alignItems: "start" }} className="etq-grid">
          {/* ---------------- ajustes ---------------- */}
          <div className="panel" style={caixa}>
            {titulo("Modelo")}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, maxHeight: 330, overflowY: "auto", paddingRight: 4 }}>
              {etqModelosDoPapel(cfg.papelLargura).map(([v, nome, dica]) => {
                const on = (cfg.estilo === "destaque" ? "classico" : cfg.estilo) === v;
                return (
                  <button key={v} type="button" title={dica} onClick={() => set("estilo")(v)}
                    style={{ textAlign: "left", padding: "8px 10px", borderRadius: 9, cursor: "pointer", border: "1px solid " + (on ? "var(--mg)" : "var(--line)"),
                      background: on ? "color-mix(in srgb, var(--mg) 16%, transparent)" : "var(--ink-2)", color: "var(--text)" }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{nome}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{dica}</div>
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 10 }}>
              {cfg.estilo === "gondola" && <EtqSeg value={cfg.faixa} onChange={set("faixa")} opts={[["preta", "Faixa preta"], ["contorno", "Contorno"]]} />}
              {(cfg.estilo === "classico" || cfg.estilo === "destaque") && <EtqSeg value={cfg.estilo} onChange={set("estilo")} opts={[["classico", "Preço simples"], ["destaque", "Tarja preta"]]} />}
              {(cfg.estilo === "atacado" || cfg.estilo === "clube") && (loja.sistema === "Link" ? (
                <div style={{ display: "grid", gap: 8 }}>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <select value={(cfg.estilo === "clube" ? cfg.tabelaClube : cfg.tabelaAtacado) ?? ""}
                      onChange={(e) => set(cfg.estilo === "clube" ? "tabelaClube" : "tabelaAtacado")(e.target.value ? Number(e.target.value) : null)}>
                      <option value="">{cfg.estilo === "clube" ? "Tabela de preço do clube…" : "Tabela de preço do atacado…"}</option>
                      {(info.tabelas || []).map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                    </select>
                  </div>
                  {cfg.estilo === "clube" && cfg.tabelaClube == null && (
                    <p style={{ fontSize: 12, color: "#f5a524", margin: 0 }}>Escolha a tabela de preço do clube: sem ela a caixa do clube sai vazia.</p>
                  )}
                  {cfg.estilo === "atacado" && (
                    <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>Sem tabela, o atacado vem do <b>Desconto Condicional</b> do LinkPro (produto com quantidade mínima). Produto sem desconto sai com a caixa vazia.</p>
                  )}
                  {cfg.estilo === "atacado" && <EtqNum label="A partir de quantas unidades" value={cfg.qtdAtacado} onChange={set("qtdAtacado")} step={1} min={2} max={999} />}
                </div>
              ) : (
                <p style={{ fontSize: 12, color: "var(--muted)" }}>{cfg.estilo === "atacado"
                  ? "No Host, o preço de atacado é a promoção por quantidade do cadastro do produto (valor promocional a partir de N unidades)."
                  : "O Host não tem preço de clube: digite o preço do clube de cada produto na lista de impressão, ao lado."}</p>
              ))}
              {cfg.estilo === "oferta" && <p style={{ fontSize: 12, color: "var(--muted)" }}>O "De" você digita na lista de impressão.{loja.sistema === "Host" ? " No Host, produto com preço promocional já sai De (normal) / Por (promocional)." : " No Link, produto com Desconto Condicional (quantidade mínima 1) já sai De (normal) / Por (com desconto)."}</p>}
              {cfg.estilo === "medida" && <p style={{ fontSize: 12, color: "var(--muted)" }}>O preço por litro ou kg sai pela medida do nome ("2L", "500ML", "1KG") ou pelo peso do cadastro.</p>}
              {(ETQ_PARAMS[cfg.estilo] || []).length > 0 && (
                <div style={{ display: "grid", gap: 8 }}>
                  {ETQ_PARAMS[cfg.estilo].map(([k, rot, pad]) => (
                    <label key={k} style={{ fontSize: 12.5, color: "var(--muted)" }}>{rot}
                      <input value={((cfg.modeloTextos || {})[cfg.estilo] || {})[k] ?? ""} placeholder={pad}
                        onChange={(e) => { const v = e.target.value; setCfg((c) => ({ ...c, modeloTextos: { ...(c.modeloTextos || {}), [c.estilo]: { ...((c.modeloTextos || {})[c.estilo] || {}), [k]: v } } })); }}
                        style={{ width: "100%", marginTop: 4, padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--ink-2)", color: "var(--text)" }} />
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: 18 }}>{titulo("O que aparece")}</div>
            <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>Nome da loja (rodapé)
              <input value={cfg.textoTopo || ""} onChange={(e) => set("textoTopo")(e.target.value)} placeholder="Ex.: MERCADO BOM DIA"
                style={{ width: "100%", marginTop: 4, padding: "9px 11px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--ink-2)", color: "var(--text)" }} />
            </label>
            {[["mostrarBarras", "Código de barras"], ["mostrarCodigo", "Código interno (Cód.)"], ["mostrarUnidade", "Unidade (KG, LT…)"], ["nomeCaixaAlta", "Nome em maiúsculas"], ["moldura", "Moldura em volta"]].map(([k, t]) => (
              <label key={k} className="chk-row" style={{ marginBottom: 8 }}><input type="checkbox" checked={!!cfg[k]} onChange={(e) => set(k)(e.target.checked)} /> {t}</label>
            ))}

            <div style={{ marginTop: 18 }}>{titulo("Tamanho das letras")}</div>
            <EtqFaixa label="Nome do produto" value={cfg.tamNome} onChange={set("tamNome")} min={6} max={16} />
            <EtqFaixa label="Preço" value={cfg.tamPreco} onChange={set("tamPreco")} min={14} max={60} step={1} />

            <details style={{ marginTop: 14 }}>
              <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 13.5 }}>Tamanho e posição (mm)</summary>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
                <EtqNum label="Papel: largura" value={cfg.papelLargura} onChange={set("papelLargura")} />
                <EtqNum label="Papel: altura (furo a furo)" value={cfg.papelAltura} onChange={set("papelAltura")} />
                <EtqNum label="Conteúdo: da esquerda" value={cfg.areaX} onChange={set("areaX")} />
                <EtqNum label="Conteúdo: do topo" value={cfg.areaY} onChange={set("areaY")} />
                <EtqNum label="Conteúdo: largura" value={cfg.areaLargura} onChange={set("areaLargura")} />
                <EtqNum label="Conteúdo: altura" value={cfg.areaAltura} onChange={set("areaAltura")} />
                <EtqNum label="Colunas no rolo" value={cfg.colunas || 1} onChange={(v) => set("colunas")(Math.max(1, Math.min(6, Math.round(Number(v) || 1))))} />
                <EtqNum label="Espaço entre colunas" value={cfg.espacoColunas ?? 2.5} onChange={set("espacoColunas")} />
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setCfg((c) => ({ ...c, papelLargura: 33, papelAltura: 22, areaX: 1.5, areaY: 1.5, areaLargura: 30, areaAltura: 19, colunas: 3, espacoColunas: 2.5, sensorPapel: "espaco", estilo: "peq" }))}>
                  Rolo 33 x 22 (3 colunas)</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setCfg((c) => ({ ...c, papelLargura: 104, papelAltura: 30, areaX: 3, areaY: 6.5, areaLargura: 98, areaAltura: 19.5, colunas: 1, sensorPapel: "continuo", estilo: ETQ_PEQUENOS.has(c.estilo) ? "gondola" : c.estilo }))}>
                  Gôndola amarela 110 x 30</button>
              </div>
              {(cfg.colunas || 1) > 1 && <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>Papel = uma etiqueta. A impressora puxa {cfg.colunas} lado a lado (linha de {((cfg.colunas) * cfg.papelLargura + (cfg.colunas - 1) * (cfg.espacoColunas ?? 2.5)).toFixed(1).replace(".", ",")} mm).</p>}
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>A área tracejada na prévia é onde o conteúdo cabe. Mexa de 0,5 em 0,5 mm se sair deslocado.</p>
              <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                <label style={{ fontSize: 12.5, color: "var(--muted)" }}>Papel na impressora
                  <div style={{ marginTop: 4 }}><EtqSeg value={cfg.sensorPapel || "continuo"} onChange={set("sensorPapel")} opts={[["continuo", "Contínuo"], ["espaco", "Com espaço/furo"]]} /></div>
                </label>
                <label style={{ fontSize: 12.5, color: "var(--muted)" }}>Língua da impressora
                  <div style={{ marginTop: 4 }}><EtqSeg value={cfg.linguagem || "ppla"} onChange={set("linguagem")} opts={[["ppla", "PPLA (Argox)"], ["outra", "Outra"]]} /></div>
                </label>
                <p style={{ fontSize: 12, color: "var(--muted)" }}>"Contínuo" funcionou melhor na etiqueta amarela com furos: a impressora anda exatamente a altura da etiqueta. Depois de mudar, salve e clique em Calibrar papel.</p>
              </div>
            </details>

            <div style={{ marginTop: 18 }}>{titulo("Impressão")}</div>
            <div className="field" style={{ marginBottom: 10 }}>
              <select value={cfg.impressora} onChange={(e) => set("impressora")(e.target.value)}>
                {!(info.impressoras || []).includes(cfg.impressora) && <option value={cfg.impressora}>{cfg.impressora} (não encontrada)</option>}
                {(info.impressoras || []).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <label className="chk-row" style={{ marginBottom: 8 }}>
              <input type="checkbox" checked={!!cfg.girar180} onChange={(e) => set("girar180")(e.target.checked)} />
              Girar 180° (se sair de cabeça pra baixo)
            </label>
            <label className="chk-row" style={{ marginBottom: 8 }}>
              <input type="checkbox" checked={cfg.modo === "meugiro"} onChange={(e) => set("modo")(e.target.checked ? "meugiro" : "sistema")} />
              {loja.sistema === "Link" ? "Criar o modelo “Meu Giro” no LinkPro" : "O Host imprime com este layout"}
            </label>
            {cfg.modo === "meugiro" && loja.sistema !== "Link" && (info.modelosHost || []).length > 0 && (
              <div className="field" style={{ marginBottom: 6 }}>
                <select value={cfg.modeloHost} onChange={(e) => set("modeloHost")(e.target.value)}>
                  {(info.modelosHost || []).map((n) => <option key={n} value={n}>{n.replace(/\.fr3$/i, "")}</option>)}
                </select>
              </div>
            )}
            <p style={{ fontSize: 12, color: "var(--muted)" }}>{loja.sistema === "Link"
              ? (cfg.modo === "meugiro"
                ? "Ao salvar, o LinkPro ganha o modelo “Meu Giro (gôndola)”, com o estilo escolhido aqui. No LinkPro, imprima na impressora “Meu Giro Etiquetas”: o layout completo sai na impressora de etiqueta."
                : "O LinkPro continua com os modelos dele. Este layout vale para as impressões feitas por aqui.")
              : (cfg.modo === "meugiro"
                ? "Ao salvar, o modelo escolhido do Host vira este layout (o original fica guardado e volta se desligar)."
                : "O Host continua com o modelo dele. Este layout vale para as impressões feitas por aqui.")}</p>
            {cfg.modo === "meugiro" && loja.sistema === "Link" && (() => {
              const marcados = cfg.modelosLinkPro || [];
              const troca = (v, on) => set("modelosLinkPro")(on ? [...marcados.filter((x) => x !== v), v] : marcados.filter((x) => x !== v));
              return (
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, color: "var(--muted)", marginBottom: 6 }}>
                    <span>Estilos que aparecem no LinkPro ({marcados.length})</span>
                    <span style={{ display: "flex", gap: 10 }}>
                      <a href="#" onClick={(e) => { e.preventDefault(); set("modelosLinkPro")(etqModelosDoPapel(cfg.papelLargura).map(([v]) => v)); }}>todos</a>
                      <a href="#" onClick={(e) => { e.preventDefault(); set("modelosLinkPro")([]); }}>nenhum</a>
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 10px", maxHeight: 220, overflowY: "auto", paddingRight: 4 }}>
                    {etqModelosDoPapel(cfg.papelLargura).map(([v, nome]) => (
                      <label key={v} className="chk-row" style={{ fontSize: 13 }}>
                        <input type="checkbox" checked={marcados.includes(v)} onChange={(e) => troca(v, e.target.checked)} />
                        {nome}
                      </label>
                    ))}
                  </div>
                  <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>Cada um vira “Meu Giro - Nome” na lista de etiquetas do LinkPro. Os desmarcados saem de lá ao salvar.</p>
                </div>
              );
            })()}

            <button className="btn btn-mg" style={{ width: "100%", marginTop: 12 }} disabled={!mudou || salvando} onClick={salvar}>
              {salvando ? "Salvando…" : mudou ? "Salvar layout" : "Layout salvo"}
            </button>
          </div>

          {/* ---------------- prévia + impressão ---------------- */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="panel" style={caixa}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {titulo("Prévia")}
                {carregandoPrevia && <span style={{ fontSize: 12, color: "var(--muted)" }}>atualizando…</span>}
              </div>
              <div style={{ background: ETQ_AMARELO, borderRadius: 10, padding: 6, boxShadow: "0 6px 24px rgba(0,0,0,.35)" }}>
                {previa
                  ? <img src={previa} alt="Prévia da etiqueta" style={{ width: "100%", display: "block", mixBlendMode: "multiply" }} />
                  : <div style={{ aspectRatio: `${cfg.papelLargura} / ${cfg.papelAltura}`, display: "grid", placeItems: "center", color: "#6b5a00" }}>Montando a prévia…</div>}
              </div>
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>{fila.length ? "Prévia do último produto da lista." : "Exemplo com um produto da loja. Adicione produtos abaixo pra ver com eles."}</p>
            </div>

            <div className="panel" style={caixa}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {titulo("Imprimir na loja")}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  <button className="btn btn-ghost btn-sm" disabled={!!ferr} onClick={() => ferramenta("regua")}
                    title="Imprime uma régua em mm: pela foto dá pra ver se o conteúdo está no lugar e ajustar a posição em Tamanho e posição">
                    {ferr === "regua" ? "Enviando…" : "Régua de teste"}</button>
                  <button className="btn btn-ghost btn-sm" disabled={!!ferr} onClick={() => ferramenta("avancar")}
                    title="Puxa uma etiqueta (pra acertar o começo do rolo)">
                    {ferr === "avancar" ? "Enviando…" : "Avançar 1 etiqueta"}</button>
                  {cfg.linguagem !== "outra" && (
                    <button className="btn btn-ghost btn-sm" disabled={!!ferr} onClick={() => ferramenta("calibrar")}
                      title={"Manda pra impressora o tipo de papel (" + (cfg.sensorPapel === "espaco" ? "com espaço/furo" : "contínuo de " + cfg.papelAltura + " mm") + ") e puxa 2 etiquetas pra ela se acertar"}>
                      {ferr === "calibrar" ? "Enviando…" : "Calibrar papel"}</button>
                  )}
                </div>
              </div>
              <div className="search" style={{ marginBottom: 8 }}>
                <Ic d={icSearch} />
                <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto por nome, código ou código de barras" aria-label="Buscar produto" />
              </div>
              {achados.length > 0 && (
                <div style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
                  {achados.map((p) => (
                    <button key={p.id} type="button" onClick={() => adicionar(p)}
                      style={{ display: "flex", width: "100%", gap: 10, alignItems: "center", padding: "9px 12px", background: "transparent", border: "none", borderBottom: "1px solid var(--line)", color: "var(--text)", cursor: "pointer", textAlign: "left" }}>
                      <span style={{ flex: 1 }}><b style={{ fontWeight: 600 }}>{p.name}</b><div style={{ fontSize: 12, color: "var(--muted)" }}>{"Cód. " + (p.code || p.id) + (p.barras ? " · " + p.barras : "")}</div></span>
                      <span style={{ fontFamily: "var(--mono)" }}>{p.price}</span>
                      <span style={{ color: "var(--mg)", fontWeight: 700 }}>+</span>
                    </button>
                  ))}
                </div>
              )}
              {!fila.length ? <div className="mini-empty">Busque os produtos que vão ganhar etiqueta.</div> : (
                <div className="tbl-wrap"><table>
                  <thead><tr><th>Produto</th><th>Preço</th>{ETQ_COM_DE.has(cfg.estilo) && <th>De R$</th>}{cfg.estilo === "clube" && <th>Clube R$</th>}<th style={{ width: 150 }}>Etiquetas</th></tr></thead>
                  <tbody>
                    {fila.map((i) => (
                      <tr key={i.p.id}>
                        <td>{i.p.name}</td>
                        <td style={{ fontFamily: "var(--mono)" }}>{i.p.price}</td>
                        {(ETQ_COM_DE.has(cfg.estilo) || cfg.estilo === "clube") && (
                          <td>
                            <input type="number" step="0.01" min="0" placeholder={cfg.estilo !== "clube" ? "opcional" : (loja.sistema === "Link" ? "da tabela" : "0,00")}
                              value={(cfg.estilo !== "clube" ? i.de : i.clube) || ""}
                              onChange={(e) => { const v = e.target.value; setFila((f) => f.map((x) => x === i ? { ...x, [cfg.estilo !== "clube" ? "de" : "clube"]: v } : x)); }}
                              style={{ width: 90, padding: "6px 8px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--ink-2)", color: "var(--text)", fontFamily: "var(--mono)" }} />
                          </td>
                        )}
                        <td>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => setFila((f) => i.qtd > 1 ? f.map((x) => x === i ? { ...x, qtd: x.qtd - 1 } : x) : f.filter((x) => x !== i))}>−</button>
                            <b style={{ minWidth: 26, textAlign: "center", fontFamily: "var(--mono)" }}>{i.qtd}</b>
                            <button className="btn btn-ghost btn-sm" onClick={() => setFila((f) => f.map((x) => x === i ? { ...x, qtd: Math.min(200, x.qtd + 1) } : x))}>+</button>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              )}
              <button className="btn btn-mg" style={{ width: "100%", marginTop: 12 }} disabled={!fila.length || imprimindo} onClick={imprimir}>
                {imprimindo ? "Enviando…" : !fila.length ? "Imprimir" : total === 1 ? "Imprimir 1 etiqueta" : `Imprimir ${total} etiquetas`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ================= SUPORTE (WhatsApp) =================
   Chamados abertos pelos grupos "SUP" do WhatsApp do Lucas (conector no PC dele). Abas: chamados em aberto
   (atender/finalizar), relatório (todos os chamados, quem atendeu, ranking), equipe (números que não abrem
   chamado) e conector/TV (chave do conector e link da TV). */
const icChat = <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>;
const supMin = (m) => (m == null ? "-" : m < 60 ? m + " min" : Math.floor(m / 60) + "h" + String(m % 60).padStart(2, "0"));
const supDesde = (iso) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000)) : null);
const supQuando = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso), p = (n) => String(n).padStart(2, "0");
  return p(d.getDate()) + "/" + p(d.getMonth() + 1) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
};
const supGrupo = (g) => String(g || "").replace(/^\s*sup(orte)?\.?\s*/i, "") || g;

function ViewSuporte({ sess, mostrarToast }) {
  const [aba, setAba] = useState("chamados");
  const [ativos, setAtivos] = useState(null);
  const [rel, setRel] = useState(null);
  const [eqp, setEqp] = useState(null);
  const [cfg, setCfg] = useState(null);
  const hoje = new Date().toISOString().slice(0, 10);
  const [de, setDe] = useState(new Date(Date.now() - 29 * 864e5).toISOString().slice(0, 10));
  const [ate, setAte] = useState(hoje);
  const [busca, setBusca] = useState("");
  const [novo, setNovo] = useState({ nome: "", numero: "", funcao: "TECNICO" });
  const [autores, setAutores] = useState(null);
  const [busy, setBusy] = useState(null);
  const req = (p, o = {}) => api("/suporte" + p, { base: ADMIN_API, token: sess.token, ...o });

  const carregar = useCallback(async () => {
    try {
      const [a, c] = await Promise.all([req("/chamados"), req("/config")]);
      setAtivos(a || []); setCfg(c || {});
    } catch (e) { mostrarToast(e.message, false); if (ativos == null) setAtivos([]); }
  }, [sess.token]);
  const carregarRel = useCallback(async () => {
    try { setRel(await req(`/relatorio?de=${de}&ate=${ate}`)); } catch (e) { mostrarToast(e.message, false); }
  }, [sess.token, de, ate]);
  const carregarEqp = useCallback(async () => {
    try {
      const [e, a] = await Promise.all([req("/equipe"), req("/autores")]);
      setEqp(e || []); setAutores(a || []);
    } catch (e) { mostrarToast(e.message, false); }
  }, [sess.token]);
  useEffect(() => { carregar(); const t = setInterval(carregar, 15000); return () => clearInterval(t); }, [carregar]);
  useEffect(() => { if (aba === "relatorio") carregarRel(); if (aba === "equipe") carregarEqp(); }, [aba, carregarRel, carregarEqp]);

  async function acao(c, qual) {
    setBusy(c.id);
    try { await req(`/chamados/${c.id}/${qual}`, { method: "POST", body: {} }); await carregar(); mostrarToast(qual === "atender" ? "Chamado com você." : "Chamado finalizado."); }
    catch (e) { mostrarToast(e.message, false); }
    setBusy(null);
  }
  async function salvarEqp() {
    try {
      await req("/equipe", { method: "POST", body: novo });
      setNovo({ nome: "", numero: "", funcao: "TECNICO" }); await carregarEqp(); mostrarToast("Adicionado à equipe.");
    } catch (e) { mostrarToast(e.message, false); }
  }
  // quem escreveu nos grupos -> equipe (o nome pode ser trocado: "Danone" vira "Ingrid")
  async function marcarAutor(a, funcao) {
    const nome = window.prompt(`Nome de quem é ${funcao === "COMERCIAL" ? "comercial" : "técnico"}:`, a.nome || "");
    if (!nome || !nome.trim()) return;
    try {
      await req("/equipe", { method: "POST", body: { numero: a.numero, nome: nome.trim(), funcao } });
      await carregarEqp(); mostrarToast(`${nome.trim()} marcado como ${funcao === "COMERCIAL" ? "comercial" : "técnico"}.`);
    } catch (e) { mostrarToast(e.message, false); }
  }
  async function removerEqp(x) {
    try { await req("/equipe/" + x.numero, { method: "DELETE" }); await carregarEqp(); } catch (e) { mostrarToast(e.message, false); }
  }
  async function salvarNome(nome) {
    try { setCfg(await req("/config", { method: "POST", body: { nomeDono: nome } })); mostrarToast("Nome salvo."); } catch (e) { mostrarToast(e.message, false); }
  }
  const copiar = (t, msg) => { try { navigator.clipboard.writeText(t); mostrarToast(msg); } catch { mostrarToast(t); } };
  const linkTv = cfg && cfg.chaveTv ? `${location.origin}/tv-suporte.html?k=${cfg.chaveTv}` : "";

  const abas = [["chamados", "Chamados"], ["relatorio", "Relatórios"], ["equipe", "Equipe"], ["conector", "Conector e TV"]];
  const esp = (ativos || []).filter((c) => c.status === "ABERTO");
  const atd = (ativos || []).filter((c) => c.status === "ATENDIMENTO");

  const tabelaChamados = (lista, comAcoes) => (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead><tr><th>Grupo</th><th>Cliente</th><th>Mensagem</th><th>Aberto</th><th>{comAcoes ? "Esperando" : "Resposta"}</th><th>Atendido por</th><th>{comAcoes ? "" : "Situação"}</th></tr></thead>
        <tbody>
          {lista.map((c) => {
            const espera = supDesde(c.status === "ABERTO" ? c.abertoEm : c.atendidoEm);
            return (
              <tr key={c.id}>
                <td><b>{supGrupo(c.grupo)}</b></td>
                <td>{c.cliente || c.clienteNumero || "-"}</td>
                <td style={{ maxWidth: 320, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={c.primeiraMensagem}>{c.ultimaMensagem || c.primeiraMensagem}</td>
                <td className="mono">{supQuando(c.abertoEm)}</td>
                <td className="mono" style={comAcoes && c.status === "ABERTO" && espera >= 30 ? { color: "var(--neg)", fontWeight: 700 } : undefined}>{comAcoes ? supMin(espera) : supMin(c.minutosResposta)}</td>
                <td>{c.atendidoPor || "-"}</td>
                <td>
                  {comAcoes ? (
                    <div className="row-actions">
                      {c.status === "ABERTO" && <button className="btn btn-ghost btn-sm" disabled={busy === c.id} onClick={() => acao(c, "atender")}>Atender</button>}
                      <button className="btn btn-mg btn-sm" disabled={busy === c.id} onClick={() => acao(c, "finalizar")}><Ic d={icCheck} strokeWidth="3" /> Finalizar</button>
                    </div>
                  ) : (
                    <span className={"pill " + (c.status === "FINALIZADO" ? "pill-ok" : "pill-wait")}>{c.status === "FINALIZADO" ? "finalizado" + (c.minutosSolucao != null ? " em " + supMin(c.minutosSolucao) : "") : c.status === "ATENDIMENTO" ? "em atendimento" : "aguardando"}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <div className="head-row">
        <div><h1>Suporte</h1><p className="sub">Chamados dos grupos "SUP" do WhatsApp. A primeira resposta da equipe no grupo já marca quem atendeu; #finalizado no grupo ou o botão finaliza.</p></div>
        {linkTv && <a className="btn btn-ghost" href={linkTv} target="_blank" rel="noopener">Abrir na TV</a>}
      </div>
      {cfg && !cfg.conectorOnline && (
        <div className="panel" style={{ padding: 14, marginBottom: 14, borderColor: "var(--neg)" }}>
          <b style={{ color: "var(--neg)" }}>Conector do WhatsApp desligado.</b> <span className="sub">Abra o atalho "Suporte WhatsApp" na Área de Trabalho do seu PC. Enquanto ele estiver desligado, mensagem de cliente não vira chamado.{cfg.ultimoSinal ? " Último sinal: " + supQuando(cfg.ultimoSinal) + "." : ""}</span>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {abas.map(([k, t]) => <button key={k} className={"btn btn-sm " + (aba === k ? "btn-mg" : "btn-ghost")} onClick={() => setAba(k)}>{t}{k === "chamados" && ativos ? " (" + ativos.length + ")" : ""}</button>)}
      </div>

      {aba === "chamados" && (
        <>
          <div className="panel" style={{ marginBottom: 14 }}>
            <div className="p-head"><span className="p-title"><Ic d={icClock} /> Aguardando ({esp.length})</span></div>
            {esp.length ? tabelaChamados(esp, true) : <div className="mini-empty" style={{ padding: 18 }}>Nenhum cliente esperando.</div>}
          </div>
          <div className="panel">
            <div className="p-head"><span className="p-title"><Ic d={icChat} /> Em atendimento ({atd.length})</span></div>
            {atd.length ? tabelaChamados(atd, true) : <div className="mini-empty" style={{ padding: 18 }}>Nenhum chamado em atendimento.</div>}
          </div>
        </>
      )}

      {aba === "relatorio" && (
        <>
          <div className="panel" style={{ padding: 14, marginBottom: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
            <div className="field" style={{ marginBottom: 0 }}><label>De</label><input type="date" value={de} max={ate} onChange={(e) => setDe(e.target.value)} /></div>
            <div className="field" style={{ marginBottom: 0 }}><label>Até</label><input type="date" value={ate} min={de} max={hoje} onChange={(e) => setAte(e.target.value)} /></div>
            <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}><label>Buscar</label><input placeholder="grupo, cliente ou atendente" value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
          </div>
          {!rel ? <div className="mini-empty">Carregando...</div> : (
            <>
              <div className="kpis" style={{ marginBottom: 14 }}>
                <div className="kpi"><div className="k-ic ic-blue"><Ic d={icChat} /></div><div className="k-l">Chamados</div><div className="k-v tnum">{rel.total}</div><div className="k-s">{rel.finalizados} finalizados · {rel.emAberto} em aberto</div></div>
                <div className="kpi"><div className="k-ic ic-amber"><Ic d={icClock} /></div><div className="k-l">Resposta média</div><div className="k-v tnum">{supMin(rel.mediaRespostaMin)}</div><div className="k-s">do cliente escrever até a 1ª resposta</div></div>
                <div className="kpi"><div className="k-ic ic-green"><Ic d={icCheck} /></div><div className="k-l">Solução média</div><div className="k-v tnum">{supMin(rel.mediaSolucaoMin)}</div><div className="k-s">até finalizar</div></div>
                <div className="kpi"><div className="k-ic ic-blue"><Ic d={icUsers} /></div><div className="k-l">Quem mais atendeu</div><div className="k-v" style={{ fontSize: 22 }}>{rel.ranking && rel.ranking[0] ? rel.ranking[0].nome : "-"}</div><div className="k-s">{rel.ranking && rel.ranking[0] ? rel.ranking[0].atendidos + " chamados" : ""}</div></div>
              </div>
              <div className="two-col" style={{ marginBottom: 14 }}>
                <div className="panel">
                  <div className="p-head"><span className="p-title"><Ic d={icUsers} /> Ranking da equipe</span></div>
                  <div className="tbl-wrap"><table className="tbl">
                    <thead><tr><th>#</th><th>Atendente</th><th>Atendidos</th><th>Finalizados</th><th>Resposta média</th></tr></thead>
                    <tbody>{(rel.ranking || []).map((r, i) => <tr key={r.nome}><td>{i + 1}º</td><td><b>{r.nome}</b></td><td className="mono">{r.atendidos}</td><td className="mono">{r.finalizados}</td><td className="mono">{supMin(r.mediaRespostaMin)}</td></tr>)}</tbody>
                  </table></div>
                </div>
                <div className="panel">
                  <div className="p-head"><span className="p-title"><Ic d={icChat} /> Clientes que mais chamaram</span></div>
                  <div className="tbl-wrap"><table className="tbl">
                    <thead><tr><th>Grupo</th><th>Chamados</th></tr></thead>
                    <tbody>{(rel.porGrupo || []).map((g) => <tr key={g.grupo}><td>{supGrupo(g.grupo)}</td><td className="mono">{g.chamados}</td></tr>)}</tbody>
                  </table></div>
                </div>
              </div>
              <div className="panel">
                <div className="p-head"><span className="p-title"><Ic d={icFile} /> Todos os chamados do período</span></div>
                {(() => {
                  const q = busca.trim().toLowerCase();
                  const l = (rel.chamados || []).filter((c) => !q || [c.grupo, c.cliente, c.atendidoPor, c.finalizadoPor].some((x) => (x || "").toLowerCase().includes(q)));
                  return l.length ? tabelaChamados(l, false) : <div className="mini-empty" style={{ padding: 18 }}>Nenhum chamado no período.</div>;
                })()}
              </div>
            </>
          )}
        </>
      )}

      {aba === "equipe" && (
        <div className="panel" style={{ padding: 16 }}>
          <p className="sub" style={{ marginBottom: 12 }}>Mensagem da equipe não abre chamado. <b>Técnico</b>: quando escreve no grupo assume o chamado (o último técnico que escreveu fica como atendente). <b>Comercial</b>: pode abrir chamado (como cliente), mas nunca fica como atendente. As suas mensagens (o número conectado) contam como técnico "{cfg && cfg.nomeDono || "Lucas"}".</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end", marginBottom: 14 }}>
            <div className="field" style={{ marginBottom: 0 }}><label>Nome</label><input value={novo.nome} placeholder="Wilton" onChange={(e) => setNovo({ ...novo, nome: e.target.value })} /></div>
            <div className="field" style={{ marginBottom: 0 }}><label>WhatsApp com DDD</label><input value={novo.numero} placeholder="96 99123-4567" onChange={(e) => setNovo({ ...novo, numero: e.target.value })} /></div>
            <div className="field" style={{ marginBottom: 0 }}><label>Função</label><select value={novo.funcao} onChange={(e) => setNovo({ ...novo, funcao: e.target.value })}><option value="TECNICO">Técnico</option><option value="COMERCIAL">Comercial</option></select></div>
            <button className="btn btn-mg" onClick={salvarEqp}><Ic d={icPlus} /> Adicionar</button>
          </div>
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Nome</th><th>Função</th><th>Número</th><th></th></tr></thead>
            <tbody>{(eqp || []).map((x) => <tr key={x.numero}><td><b>{x.nome}</b></td><td><span className={"pill " + (x.funcao === "COMERCIAL" ? "pill-wait" : "pill-ok")}>{x.funcao === "COMERCIAL" ? "comercial" : "técnico"}</span></td><td className="mono">{x.numero}</td><td><button className="iconbtn iconbtn-danger" title="Remover" onClick={() => removerEqp(x)}><Ic d={icTrash} /></button></td></tr>)}</tbody>
          </table></div>
          {eqp && !eqp.length && <div className="mini-empty" style={{ padding: 12 }}>Ninguém cadastrado ainda.</div>}
          <h3 style={{ margin: "22px 0 6px" }}>Quem escreveu nos grupos</h3>
          <p className="sub" style={{ marginBottom: 10 }}>Todo mundo que mandou mensagem nos grupos SUP desde que o conector foi ligado (clientes e equipe). Marque quem é da equipe; o resto é cliente.</p>
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Nome no WhatsApp</th><th>Último grupo</th><th>Quando</th><th>Msgs</th><th></th></tr></thead>
            <tbody>{(autores || []).map((a) => (
              <tr key={a.numero}>
                <td><b>{a.nome || "-"}</b><div className="mono sub">{a.numero}</div></td>
                <td>{supGrupo(a.grupo)}</td>
                <td className="mono">{supQuando(a.ultimaVez)}</td>
                <td className="mono">{a.mensagens}</td>
                <td><div className="row-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => marcarAutor(a, "TECNICO")}>É técnico</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => marcarAutor(a, "COMERCIAL")}>É comercial</button>
                </div></td>
              </tr>
            ))}</tbody>
          </table></div>
          {autores && !autores.length && <div className="mini-empty" style={{ padding: 12 }}>Ninguém escreveu ainda. Assim que a equipe responder num grupo SUP, o nome aparece aqui.</div>}
        </div>
      )}

      {aba === "conector" && cfg && (
        <div className="panel" style={{ padding: 16, display: "grid", gap: 16 }}>
          <div><b>Conector do WhatsApp:</b> {cfg.conectorOnline ? <span className="pill pill-ok">ligado</span> : <span className="pill pill-block">desligado</span>} <span className="sub">{cfg.ultimoSinal ? "último sinal " + supQuando(cfg.ultimoSinal) : "ainda não conectou"}</span></div>
          <div>
            <b>Seu nome nos chamados</b> <span className="sub">(quando você responde pelo número conectado)</span>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <input defaultValue={cfg.nomeDono || ""} id="supNomeDono" style={{ maxWidth: 240 }} />
              <button className="btn btn-ghost btn-sm" onClick={() => salvarNome(document.getElementById("supNomeDono").value)}>Salvar</button>
            </div>
          </div>
          <div>
            <b>Link da TV</b> <span className="sub">(abra no navegador da televisão; atualiza sozinho)</span>
            <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
              <code className="mono" style={{ padding: "6px 10px", background: "var(--card2, rgba(255,255,255,.05))", borderRadius: 8 }}>{linkTv}</code>
              <button className="btn btn-ghost btn-sm" onClick={() => copiar(linkTv, "Link da TV copiado.")}><Ic d={icCopy} /> Copiar</button>
              <a className="btn btn-ghost btn-sm" href={linkTv} target="_blank" rel="noopener">Abrir</a>
            </div>
          </div>
          <div>
            <b>Chave do conector</b> <span className="sub">(já vai configurada no conector do seu PC; só use se precisar reinstalar)</span>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => copiar(cfg.tokenConector || "", "Chave copiada.")}><Ic d={icCopy} /> Copiar chave</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ================= SHELL ================= */
const NAV = [
  { k: "inicio", label: "Início", icon: icHome },
  { k: "lojas", label: "Lojas", icon: icUsers },
  { k: "saude", label: "Saúde das lojas", icon: icAlert, masterOnly: true },
  { k: "nova", label: "Nova loja", icon: icPlus },
  { k: "usuarios", label: "Usuários", icon: icKey },
  { k: "masters", label: "Usuários master", icon: icUsers, revOnly: true },
  { k: "solicitacoes", label: "Solicitações", icon: icKey },
  { k: "revendas", label: "Revendas", icon: icUsers, masterOnly: true },
  { k: "transferencias", label: "Transferências", icon: icUsers, masterOnly: true },
  { k: "suporte", label: "Suporte", icon: icChat, masterOnly: true },
  { grp: "Financeiro" },
  { k: "cobrancas", label: "Cobranças", icon: icCard },
  { k: "relatorios", label: "Relatórios", icon: icFile },
  { grp: "Recursos" },
  { k: "etiquetas", label: "Estúdio de Impressão", icon: icTag },
  { k: "catalogo", label: "Catálogo", icon: icFile, masterOnly: true },
  { k: "instaladores", label: "Instaladores", icon: icDownload },
  { k: "config", label: "Configurações", icon: icGear },
];
const CRUMB = { inicio: "início", lojas: "início / lojas", saude: "início / saúde das lojas", suporte: "início / suporte", nova: "início / nova loja", usuarios: "início / usuários", masters: "início / usuários master", solicitacoes: "início / solicitações", revendas: "início / revendas", transferencias: "início / transferências", catalogo: "recursos / catálogo", etiquetas: "recursos / estúdio de impressão", cobrancas: "financeiro / cobranças", relatorios: "financeiro / relatórios", instaladores: "recursos / instaladores", config: "recursos / configurações" };

function Modal({ modal, onClose }) {
  const [vals, setVals] = useState(() => Object.fromEntries((modal.fields || []).map((f) => [f.key, f.value != null ? f.value : ""])));
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setVals((s) => ({ ...s, [k]: e.target.value }));
  async function confirmar() {
    setBusy(true);
    try { await modal.onConfirm(vals); onClose(); }
    catch (e) { setBusy(false); }
  }
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal-h">
          {modal.icon && <span className={"modal-ic " + modal.icon.cls}><Ic d={modal.icon.d} /></span>}
          <h3>{modal.title}</h3>
        </div>
        {modal.desc && <p className="modal-desc">{modal.desc}</p>}
        {modal.link !== undefined && (
          <div className="pay-box">
            {modal.link ? (
              <>
                <a className="btn btn-mg btn-block" href={modal.link} target="_blank" rel="noopener noreferrer"><Ic d={icCard} /> Abrir boleto / Pix</a>
                <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={() => { try { navigator.clipboard.writeText(modal.link); } catch (e) {} }}><Ic d={icCopy} /> Copiar link</button>
              </>
            ) : <p className="mini-empty">Pagamento gerado, mas o link não veio. Confira no Asaas.</p>}
          </div>
        )}
        {modal.list !== undefined && (
          <div className="hist">
            {(!modal.list || modal.list.length === 0)
              ? <div className="mini-empty">Nenhuma parcela paga ainda.</div>
              : modal.list.map((p, i) => (
                <div className="hist-row" key={i}>
                  <div><div className="hist-item">{p.item}{p.competencia ? " · " + fmtData(p.competencia) : ""}</div>
                    <div className="mini-sub">{p.pagoEm ? "pago em " + fmtData(p.pagoEm) : ""} {p.forma ? "· " + p.forma : ""}</div></div>
                  <div className="mono" style={{ fontWeight: 600 }}>R$ {(Number(p.valor) || 0).toFixed(0)}</div>
                </div>
              ))}
          </div>
        )}
        {(modal.fields || []).map((f, i) => (
          <div className="field" key={f.key}>
            {f.label && <label>{f.label}</label>}
            {f.type === "select" ? (
              <select className="sel" aria-label={f.label || modal.title} value={vals[f.key]} onChange={set(f.key)} autoFocus={i === 0}>
                {f.options.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}
              </select>
            ) : (
              <>
                <input type={f.type || "text"} value={vals[f.key]} onChange={set(f.key)}
                  min={f.min} max={f.max} step={f.step} placeholder={f.placeholder}
                  list={f.datalist ? f.key + "-dl" : undefined} autoFocus={i === 0}
                  onKeyDown={(e) => { if (e.key === "Enter" && f.type !== "date") confirmar(); }} />
                {f.datalist && f.datalist.length > 0 && (
                  <datalist id={f.key + "-dl"}>{f.datalist.map((d) => <option key={d} value={d} />)}</datalist>
                )}
              </>
            )}
          </div>
        ))}
        <div className="modal-actions">
          {(modal.list !== undefined || modal.link !== undefined) ? (
            <button type="button" className="btn btn-ghost" onClick={onClose}>Fechar</button>
          ) : (
            <>
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancelar</button>
              <button type="button" className={"btn " + (modal.danger ? "btn-danger" : "btn-mg")} onClick={confirmar} disabled={busy}>
                {busy ? "Aguarde…" : (modal.confirmLabel || "Confirmar")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Painel({ sess, onLogout }) {
  const isMaster = sess.tipo === "master";
  const [lojas, setLojas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [view, setView] = useState("inicio");
  const [ativando, setAtivando] = useState("");
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [nSolic, setNSolic] = useState(0);

  const carregarSolic = useCallback(async () => {
    try { const l = await api("/solicitacoes", { base: isMaster ? ADMIN_API : API, token: sess.token }) || []; setNSolic(l.length); }
    catch (e) { /* aba mostra o erro */ }
  }, [sess.token, isMaster]);
  useEffect(() => { carregarSolic(); const t = setInterval(carregarSolic, 60000); return () => clearInterval(t); }, [carregarSolic]);

  const carregar = useCallback(async () => {
    setErro("");
    try {
      if (isMaster) {
        const data = await api("/empresas", { base: ADMIN_API, token: sess.token });
        setLojas((data || []).map((e) => ({
          cnpj: e.cnpj, nome: e.nome, online: e.online, bloqueada: e.bloqueada,
          status: e.bloqueada ? "bloqueada" : "ativa",
          diasUso: e.diasUso, diaVencimento: e.diaVencimento, ativadaEm: e.ativadaEm,
          vencimento: proxVencDia(e.diaVencimento), grupo: e.grupo || null,
          vencimentoAtual: e.vencimentoAtual || null, implantacaoVence: e.implantacaoVence || null,
          mensalidade: e.mensalidade, implantacao: e.implantacao,
          implantacaoPaga: e.implantacaoPaga, fase: e.fase, valorAtual: e.valorAtual,
          pagavel: e.pagavel !== false,
          dispositivos: e.dispositivos, appVersion: e.appVersion || null,
          revendaCodigo: e.revendaCodigo || null, revendaNome: e.revendaNome || null, revendaPendente: e.revendaPendente || null,
          sistema: e.sistema || null, cortesia: !!e.cortesia, situacaoRevenda: e.situacaoRevenda || null, recursos: e.recursos || [],
          motivo: e.motivo || null,
        })));
      } else {
        const data = await api("/lojas", { token: sess.token });
        setLojas(data || []);
      }
    } catch (err) {
      if (err.status === 401 || /autentic|autoriz|expir|401/i.test(err.message)) { onLogout(); return; }
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }, [sess.token, onLogout, isMaster]);

  useEffect(() => { carregar(); }, [carregar]);

  const mostrarToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3200); };

  // Executa a acao, recarrega e avisa. Lanca no erro (mantem o modal aberto).
  async function runAction(fn, okMsg) {
    try { await fn(); await carregar(); mostrarToast(okMsg); }
    catch (err) {
      if (err.status === 401) { onLogout(); return; }
      mostrarToast(err.message, false); throw err;
    }
  }
  const adminReq = (l, path, body) => () => api(`/lojas/${l.cnpj}/${path}`, { method: "POST", base: ADMIN_API, token: sess.token, body });
  const hoje = () => new Date().toISOString().slice(0, 10);

  async function ativar(l) {
    const liberar = l.status === "bloqueada";
    setModal({
      title: liberar ? "Liberar loja" : "Ativar loja",
      icon: { d: liberar ? icUnlock : icCheck, cls: "ic-green" },
      desc: liberar ? `Liberar novamente “${l.nome}”? O lojista volta a ter acesso.`
        : `Ativar “${l.nome}” por R$ 30? A loja fica Ativa e o lojista passa a ter acesso ao app. A loja funciona por 24 horas sem pagamento; depois bloqueia até você pagar o boleto/Pix. Se ativar do dia 1 ao 4, os R$ 30 já cobrem o dia 5 deste mês; do dia 20 em diante, no próximo dia 5 você paga só R$ 20.`,
      confirmLabel: liberar ? "Liberar" : "Ativar · R$ 30",
      onConfirm: () => runAction(() => api(`/lojas/${l.cnpj}/ativar`, { method: "POST", token: sess.token }), liberar ? "Loja liberada." : "Loja ativada!"),
    });
  }

  // ---- acoes de master (usam os endpoints /api/admin ja existentes) ----
  const master = {
    async pagarLote(cnpjs, limpar) {
      if (!cnpjs || cnpjs.length === 0) { mostrarToast("Selecione ao menos uma loja.", false); return; }
      try {
        const r = await api("/pagar-lote", { method: "POST", base: ADMIN_API, token: sess.token, body: { cnpjs } });
        limpar && limpar();
        setModal({
          title: "Boleto / Pix gerado", icon: { d: icCard, cls: "ic-green" },
          desc: `${r.lojas} loja(s) · R$ ${Number(r.valor).toFixed(2)} · vence ${fmtData(r.vencimento)}. Mande o link pro cliente; quando ele pagar, as lojas são liberadas sozinhas.`,
          link: r.linkPagamento || "",
        });
      } catch (err) { mostrarToast(err.message, false); }
    },
    toggleBloqueio(l) {
      const bloquear = !l.bloqueada;
      setModal({
        title: bloquear ? "Bloquear loja" : "Liberar loja",
        icon: { d: bloquear ? icLock : icUnlock, cls: bloquear ? "ic-red" : "ic-green" },
        desc: bloquear ? `Bloquear “${l.nome}”? O lojista perde o acesso ao app até ser liberado.` : `Liberar “${l.nome}” e devolver o acesso ao lojista?`,
        confirmLabel: bloquear ? "Bloquear" : "Liberar",
        danger: bloquear,
        onConfirm: () => runAction(adminReq(l, bloquear ? "bloquear" : "desbloquear", bloquear ? { motivo: "Pagamento pendente" } : undefined), bloquear ? "Loja bloqueada." : "Loja liberada."),
      });
    },
    editarMensalidade(l) {
      setModal({
        title: "Mensalidade", icon: { d: icMoney, cls: "ic-amber" },
        desc: `Valor mensal cobrado de “${l.nome}”.`,
        fields: [{ key: "valor", label: "Mensalidade (R$)", type: "number", value: l.mensalidade != null ? String(l.mensalidade) : "30", min: "0", step: "0.01" }],
        confirmLabel: "Salvar",
        onConfirm: (v) => runAction(adminReq(l, "mensalidade", { valor: v.valor }), "Mensalidade atualizada."),
      });
    },
    editarVencimento(l) {
      setModal({
        title: "Dia de vencimento", icon: { d: icCalendar, cls: "ic-blue" },
        desc: `Dia do mês em que a mensalidade de “${l.nome}” vence.`,
        fields: [{ key: "dia", label: "Dia do mês", type: "select", value: String(l.diaVencimento || 5), options: Array.from({ length: 28 }, (_, i) => ({ v: String(i + 1), t: "Dia " + (i + 1) })) }],
        confirmLabel: "Salvar",
        onConfirm: (v) => runAction(adminReq(l, "dia-vencimento", { dia: v.dia }), "Vencimento atualizado."),
      });
    },
    definirAtivacao(l) {
      setModal({
        title: "Data de início", icon: { d: icEdit, cls: "ic-blue" },
        desc: `Quando “${l.nome}” começou a usar (base da 1ª cobrança proporcional).`,
        fields: [{ key: "data", label: "Data de início", type: "date", value: l.ativadaEm ? l.ativadaEm.slice(0, 10) : hoje() }],
        confirmLabel: "Salvar",
        onConfirm: (v) => runAction(adminReq(l, "ativacao", { data: v.data }), "Data de início definida."),
      });
    },
    definirImplantacaoVence(l) {
      setModal({
        title: "Vencimento da implantação", icon: { d: icClock, cls: "ic-amber" },
        desc: `Data de vencimento da implantação (R$ ${IMPLANTACAO}) de “${l.nome}”. Deixe vazio para o padrão (3 dias).`,
        fields: [{ key: "data", label: "Vencimento", type: "date", value: l.implantacaoVence || "" }],
        confirmLabel: "Salvar",
        onConfirm: (v) => runAction(adminReq(l, "implantacao-vencimento", { data: v.data }), v.data ? "Vencimento da implantação definido." : "Vencimento da implantação: padrão."),
      });
    },
    marcarPago(l) {
      const impl = l.fase === "implantacao" || l.implantacaoPaga === false;
      if (!impl && l.pagavel === false) {
        mostrarToast(`Ainda não abriu - a mensalidade libera 10 dias antes do vencimento${l.vencimentoAtual ? " (" + fmtData(l.vencimentoAtual) + ")" : ""}.`, false);
        return;
      }
      const valor = impl ? IMPLANTACAO : (Number(l.mensalidade) || 0);
      const item = impl ? "implantação" : "mensalidade";
      setModal({
        title: "Registrar pagamento", icon: { d: icCheck, cls: "ic-green" },
        desc: `Confirmar recebimento da ${item} (R$ ${valor}) de “${l.nome}” em dinheiro/Pix? A loja é liberada na hora.`,
        confirmLabel: "Registrar pago",
        onConfirm: () => runAction(adminReq(l, impl ? "implantacao/paga" : "mensalidade/paga", undefined), "Pagamento registrado. Loja liberada."),
      });
    },
    async moverRevenda(l) {
      let revs;
      try { revs = await api("/revendas", { base: ADMIN_API, token: sess.token }) || []; }
      catch (err) { mostrarToast(err.message, false); return; }
      setModal({
        title: "Mover de revenda", icon: { d: icUsers, cls: "ic-blue" },
        desc: `Para qual revenda vai “${l.nome}”? Hoje: ${l.revendaCodigo ? (l.revendaNome || l.revendaCodigo) : "venda direta"}.`,
        fields: [{
          key: "codigo", label: "Revenda", type: "select", value: l.revendaCodigo || "",
          options: [{ v: "", t: "Venda direta (sem revenda)" }, ...revs.map((r) => ({ v: r.codigo, t: `${r.nome} · ${r.codigo}` }))],
        }],
        confirmLabel: "Mover",
        onConfirm: (v) => runAction(adminReq(l, "revenda", { codigo: v.codigo }), v.codigo ? "Loja movida. A revenda precisa ativar no painel dela." : "Loja virou venda direta."),
      });
    },
    removerRevenda(l) {
      setModal({
        title: "Remover da revenda", icon: { d: icTrash, cls: "ic-red" },
        desc: `Tirar “${l.nome}” da revenda ${l.revendaNome || l.revendaCodigo}? A loja fica sem dono e, na próxima instalação, entra na revenda de quem instalar.`,
        confirmLabel: "Remover", danger: true,
        onConfirm: () => runAction(adminReq(l, "revenda", { codigo: "" }), "Loja removida da revenda."),
      });
    },
    toggleCortesia(l) {
      const marcar = !l.cortesia;
      setModal({
        title: marcar ? "Sem cobrança" : "Voltar a cobrar", icon: { d: icMoney, cls: marcar ? "ic-blue" : "ic-amber" },
        desc: marcar
          ? `“${l.nome}” é loja de teste ou da casa? Ela sai da Receita/mês, não gera cobrança e não é bloqueada por atraso.`
          : `Voltar a cobrar “${l.nome}”? Ela volta para a Receita/mês e para as cobranças.`,
        confirmLabel: marcar ? "Tirar da cobrança" : "Voltar a cobrar",
        onConfirm: () => runAction(adminReq(l, "cortesia", { cortesia: marcar }), marcar ? "Loja sem cobrança." : "Loja volta a ser cobrada."),
      });
    },
    excluir(l) {
      setModal({
        title: "Excluir loja", icon: { d: icTrash, cls: "ic-red" },
        desc: `Excluir “${l.nome}” (${fmtCnpj(l.cnpj)}) do painel? Some da lista e da cobrança.` + (l.online ? " Atenção: o agente está online e a loja volta a aparecer quando ele reconectar. Desinstale o agente antes." : ""),
        confirmLabel: "Excluir", danger: true,
        onConfirm: () => runAction(() => api(`/lojas/${l.cnpj}`, { method: "DELETE", base: ADMIN_API, token: sess.token }), "Loja excluída."),
      });
    },
  };

  // recursos extras do app (Salão / Painel TV / Força de vendas): liga e desliga na hora.
  async function alternarRecurso(l, r, ativo) {
    // Saúde da loja: avisos no celular quando o agente/impressora cai; soma R$10 na mensalidade desta loja
    if (r.id === "saude" && ativo && !window.confirm(`Ativar a Saúde da loja em ${l.nome || "loja"}?

Você passa a receber no app os avisos quando o computador ou a impressora da loja cair, e a mensalidade desta loja fica R$ 10,00 mais cara a partir da próxima cobrança.`)) return;
    try {
      await api(`/lojas/${l.cnpj}/recursos`, { method: "POST", base: isMaster ? ADMIN_API : API, token: sess.token, body: { recurso: r.id, ativo } });
      await carregar();
      mostrarToast(`${r.nome} ${ativo ? "ativado" : "desativado"} em ${l.nome || "loja"}.`);
    } catch (err) {
      if (err.status === 401) { onLogout(); return; }
      mostrarToast(err.message, false);
    }
  }

  // logo da loja (vai nos PDFs do app): escolhe a imagem, reduz pra no maximo 512 px e envia. Master e revendedor.
  function subirLogo(l) {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "image/png,image/jpeg,image/webp";
    inp.onchange = () => {
      const f = inp.files && inp.files[0];
      if (!f) return;
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 512 / Math.max(img.width, img.height));
        const cv = document.createElement("canvas");
        cv.width = Math.max(1, Math.round(img.width * k));
        cv.height = Math.max(1, Math.round(img.height * k));
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        let dados = cv.toDataURL("image/png");
        if (dados.length > 700000) dados = cv.toDataURL("image/jpeg", 0.85);
        URL.revokeObjectURL(img.src);
        runAction(() => api(`/lojas/${l.cnpj}/logo`, { method: "POST", base: isMaster ? ADMIN_API : API, token: sess.token, body: { logo: dados } }),
          `Logo de “${l.nome}” salvo: vai sair nos PDFs do app.`).catch(() => {});
      };
      img.onerror = () => mostrarToast("Não consegui abrir essa imagem.", false);
      img.src = URL.createObjectURL(f);
    };
    inp.click();
  }

  // grupos: organiza lojas (ex.: um cliente com varias lojas). Master e revendedor.
  function definirGrupo(l) {
    const grupos = [...new Set(lojas.map((x) => x.grupo).filter(Boolean))];
    setModal({
      title: "Grupo da loja", icon: { d: icFolder, cls: "ic-amber" },
      desc: `Organize “${l.nome}” num grupo (ex.: um cliente com várias lojas). Deixe vazio para tirar do grupo.`,
      fields: [{ key: "grupo", label: "Grupo", type: "text", value: l.grupo || "", placeholder: "Nome do grupo", datalist: grupos }],
      confirmLabel: "Salvar",
      onConfirm: (v) => runAction(() => api(`/lojas/${l.cnpj}/grupo`, { method: "POST", base: isMaster ? ADMIN_API : API, token: sess.token, body: { grupo: v.grupo } }), (v.grupo || "").trim() ? "Grupo atualizado." : "Loja tirada do grupo."),
    });
  }

  async function verHistorico(l) {
    try {
      const data = await api(`/lojas/${l.cnpj}/pagamentos`, { base: isMaster ? ADMIN_API : API, token: sess.token });
      setModal({ title: `Parcelas pagas`, desc: l.nome, icon: { d: icFile, cls: "ic-blue" }, list: data || [] });
    } catch (err) { mostrarToast(err.message, false); }
  }

  // ---- acoes do REVENDEDOR sobre as lojas dele (cliente final) ----
  const revenda = {
    async pagarLote(cnpjs) {
      if (!cnpjs || cnpjs.length === 0) { mostrarToast("Selecione ao menos uma loja.", false); return; }
      try {
        const r = await api("/pagar-lote", { method: "POST", token: sess.token, body: { cnpjs } });
        setModal({
          title: "Boleto / Pix gerado", icon: { d: icCard, cls: "ic-green" },
          desc: `${r.lojas} loja(s) · R$ ${Number(r.valor).toFixed(2)} · vence ${fmtData(r.vencimento)}. Depois de pago, as lojas são liberadas.`,
          link: r.linkPagamento || "",
        });
      } catch (err) { mostrarToast(err.message, false); }
    },
    marcarPago(l) {
      setModal({
        title: "Pagamento ao Meu Giro", icon: { d: icCheck, cls: "ic-green" },
        desc: `Confirmar que você pagou os R$ 30 desta loja (“${l.nome}”) ao Meu Giro? Ela fica em dia e liberada.`,
        confirmLabel: "Paguei · R$ 30",
        onConfirm: () => runAction(() => api(`/lojas/${l.cnpj}/pago`, { method: "POST", token: sess.token }), "Pagamento registrado."),
      });
    },
    toggleBloqueio(l) {
      const bloquear = !l.bloqueada;
      setModal({
        title: bloquear ? "Bloquear cliente" : "Liberar cliente",
        icon: { d: bloquear ? icLock : icUnlock, cls: bloquear ? "ic-red" : "ic-green" },
        desc: bloquear ? `Bloquear “${l.nome}”? Use quando o cliente não te pagou - ele perde o acesso.` : `Liberar “${l.nome}” e devolver o acesso?`,
        confirmLabel: bloquear ? "Bloquear" : "Liberar",
        danger: bloquear,
        onConfirm: () => runAction(() => api(`/lojas/${l.cnpj}/${bloquear ? "bloquear" : "desbloquear"}`, { method: "POST", token: sess.token }), bloquear ? "Cliente bloqueado." : "Cliente liberado."),
      });
    },
  };

  const props = { recarregar: carregar, onSolicitacoes: setNSolic, lojas, sess, onAtivar: ativar, ativando, goto: setView, onLogout, mostrarToast, isMaster, master, rev: revenda, onGrupo: definirGrupo, onLogo: subirLogo, onHist: verHistorico, onRecurso: alternarRecurso };
  const conteudo = () => {
    switch (view) {
      case "lojas": return <ViewLojas {...props} />;
      case "nova": return <ViewNova {...props} />;
      case "usuarios": return <ViewUsuarios {...props} />;
      case "masters": return <ViewMasters {...props} />;
      case "solicitacoes": return <ViewSolicitacoes {...props} />;
      case "revendas": return <ViewRevendas {...props} />;
      case "transferencias": return <ViewTransferencias {...props} />;
      case "catalogo": return <ViewCatalogo {...props} />;
      case "etiquetas": return <ViewEtiquetas {...props} />;
      case "saude": return <ViewSaude {...props} />;
      case "suporte": return <ViewSuporte {...props} />;
      case "cobrancas": return <ViewCobrancas {...props} />;
      case "relatorios": return <ViewRelatorios {...props} />;
      case "instaladores": return <ViewInstaladores {...props} />;
      case "config": return <ViewConfig {...props} />;
      default: return <ViewInicio {...props} />;
    }
  };
  const pend = lojas.filter((l) => l.status === "aguardando").length;
  const nTransf = lojas.filter((l) => l.revendaPendente).length;

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          {Logo("logo")}
          <div><div className="n">Meu Giro</div><div className="s">{isMaster ? "Painel master" : "Painel da revenda"}</div></div>
        </div>
        <nav className="nav">
          {NAV.filter((it) => !(it.revOnly && isMaster) && !(it.masterOnly && !isMaster)).map((it, i) => it.grp
            ? <div className="grp" key={i}>{it.grp}</div>
            : <button key={i} className={view === it.k ? "on" : ""} onClick={() => setView(it.k)}>
                <Ic d={it.icon} /> {it.label}
                {it.k === "cobrancas" && pend > 0 && <span className="nav-badge">{pend}</span>}
                {it.k === "solicitacoes" && nSolic > 0 && <span className="nav-badge">{nSolic}</span>}
                {it.k === "transferencias" && nTransf > 0 && <span className="nav-badge">{nTransf}</span>}
              </button>
          )}
        </nav>
        <div className="side-user">
          <div className="av">{iniciais(sess.nome)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="nm">{sess.nome}</div>
            <div className="rl">{isMaster ? "Master" : "Revenda · " + sess.codigo}</div>
          </div>
          <button className="logout" title="Sair" onClick={onLogout}><Ic d={icLogout} /></button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <span className="crumb">// {CRUMB[view]}</span>
          <div className="sp">
            <button className="btn btn-ghost btn-sm" onClick={carregar}><Ic d={icRefresh} /> Atualizar</button>
            <div className="who">
              <div style={{ textAlign: "right" }}><div className="nm">{sess.nome}</div><div className="rl">{isMaster ? "Master" : "Revenda"}</div></div>
              <div className="av">{iniciais(sess.nome)}</div>
            </div>
          </div>
        </div>

        {carregando ? (
          <div className="state"><div className="spinner"></div>Carregando…</div>
        ) : erro ? (
          <div className="state">
            <div className="big">Não foi possível carregar</div>{erro}
            <div style={{ marginTop: 16 }}><button className="btn btn-ghost btn-sm" onClick={carregar}><Ic d={icRefresh} /> Tentar de novo</button></div>
          </div>
        ) : conteudo()}
      </main>

      {toast && (<div className={"toast " + (toast.ok ? "ok" : "bad")}><Ic d={toast.ok ? icCheck : icAlert} /> {toast.msg}</div>)}
      {modal && <Modal modal={modal} onClose={() => setModal(null)} />}
    </div>
  );
}

/* Situação da cobrança de uma loja de revenda (painel master): pago, teste e quanto falta, a pagar... */
function SituacaoRevenda({ s }) {
  const dt = (iso) => iso ? fmtData(iso.slice(0, 10)) : "";
  let cls = "pill-wait", txt = "", tip = "";
  if (s.tipo === "cortesia") { cls = "pill-ok"; txt = "Sem cobrança"; tip = "Mesmo CNPJ da revenda"; }
  else if (s.tipo === "aguardando") { txt = "Revenda não ativou"; tip = "Instalada, aguardando a revenda clicar em Ativar"; }
  else if (s.tipo === "teste") {
    const ms = new Date(s.testeAte) - new Date();
    const h = Math.max(0, Math.floor(ms / 3600000)), min = Math.max(0, Math.floor((ms % 3600000) / 60000));
    txt = ms > 0 ? `Teste · falta ${h}h${String(min).padStart(2, "0")}` : "Teste acabou";
    tip = "Sem pagamento ainda. Bloqueia em " + new Date(s.testeAte).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } else if (s.tipo === "bloqueada") { cls = "pill-block"; txt = "Bloqueada · não pagou"; }
  else if (s.tipo === "pago") {
    cls = "pill-ok"; txt = "Pago · próx. " + dt(s.proximoVencimento);
    tip = s.ultimoPagamentoEm ? `Último pagamento: ${dt(s.ultimoPagamentoEm)} (R$ ${Number(s.ultimoPagamentoValor || 0).toFixed(2).replace(".", ",")})` : "";
  } else if (s.tipo === "apagar") {
    txt = `R$ ${Number(s.valor || 30).toFixed(0)} a pagar · vence ${dt(s.vencimento)}`;
    tip = "Bloqueia em " + dt(s.bloqueiaEm) + (s.ultimoPagamentoEm ? ` · último pagamento ${dt(s.ultimoPagamentoEm)}` : " · nunca pagou");
  }
  if (!txt) return null;
  return <span className={"pill " + cls} style={{ marginLeft: 6 }} title={tip}>{txt}</span>;
}

/* ================= ROOT ================= */
function App() {
  const [sess, setSess] = useState(() => {
    try {
      const t = localStorage.getItem(LS_TOKEN);
      const u = localStorage.getItem(LS_USER);
      if (t && u) return { ...JSON.parse(u), token: t };
    } catch (e) {}
    return null;
  });
  const onAuth = (s) => {
    try {
      localStorage.setItem(LS_TOKEN, s.token);
      localStorage.setItem(LS_USER, JSON.stringify({ tipo: s.tipo, id: s.id, nome: s.nome, email: s.email, codigo: s.codigo }));
    } catch (e) {}
    setSess(s);
  };
  const onLogout = () => {
    try { localStorage.removeItem(LS_TOKEN); localStorage.removeItem(LS_USER); } catch (e) {}
    setSess(null);
  };
  return sess ? <Painel sess={sess} onLogout={onLogout} /> : <Auth onAuth={onAuth} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
