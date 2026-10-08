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
function Kpis({ lojas, isMaster }) {
  const ativas = lojas.filter((l) => l.status === "ativa").length;
  // pagantes: ativas que geram mensalidade (fora as do próprio CNPJ da revenda e as que a revenda ainda não ativou)
  // receita/mês: todas as lojas com mensalidade, menos as sem cobrança e as bloqueadas por falta
  // de pagamento (bloqueio feito pela própria revenda continua pagando ao master)
  const pagantes = lojas.filter((l) => !l.cortesia && l.status !== "aguardando"
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
  return (
    <div className="kpis">
      {cards.map((c, i) => (
        <div className="kpi" key={i}>
          <div className={"k-ic " + c.cls}><Ic d={c.ic} /></div>
          <div className="k-l">{c.l}</div>
          <div className="k-v tnum" style={c.vcls}>{c.v}</div>
          <div className="k-s">{c.s}</div>
        </div>
      ))}
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

function Linha({ l, onAtivar, busy, m, onGrupo, rev, onHist, sel, onSel }) {
  const soon = vencendoEmBreve(l);
  const nomeCell = (
    <td className="loja">
      <div className="nm">{l.nome || "Loja sem nome"}</div>
      <div className="cnpj">{fmtCnpj(l.cnpj)}{l.sistema && <span className="sis-chip" title="Sistema do PDV">{l.sistema}</span>}{l.grupo && <span className="grp-chip"><Ic d={icFolder} /> {l.grupo}</span>}</div>
      {m && (
        <div className="dev-line">
          <Ic d={icUsers} /> {l.revendaCodigo ? (l.revendaNome || l.revendaCodigo) : "Venda direta"}
          {l.revendaPendente && <span className="ver-chip" style={{ color: "var(--mg)" }}>transferência pendente</span>}
        </div>
      )}
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
        <td><StatusPill l={l} />{l.situacaoRevenda && <SituacaoRevenda s={l.situacaoRevenda} />}</td>
        <td>
          <div className="row-actions">
            {!l.revendaCodigo && <button className="btn btn-mg btn-sm" title={l.fase !== "implantacao" && l.pagavel === false ? "Abre 10 dias antes do vencimento" : "Registrar pagamento em dinheiro/Pix"} disabled={busy || (l.fase !== "implantacao" && l.pagavel === false)} onClick={() => m.marcarPago(l)}><Ic d={icCheck} strokeWidth="3" /> Pago</button>}
            {l.bloqueada
              ? <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => m.toggleBloqueio(l)}><Ic d={icUnlock} /> Liberar</button>
              : <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => m.toggleBloqueio(l)}><Ic d={icLock} /> Bloquear</button>}
            <button className="iconbtn" title="Mensalidade" disabled={busy} onClick={() => m.editarMensalidade(l)}><Ic d={icMoney} /></button>
            <button className="iconbtn" title="Dia de vencimento" disabled={busy} onClick={() => m.editarVencimento(l)}><Ic d={icCalendar} /></button>
            <button className="iconbtn" title="Data de início (base da cobrança)" disabled={busy} onClick={() => m.definirAtivacao(l)}><Ic d={icEdit} /></button>
            {!l.implantacaoPaga && !l.revendaCodigo && <button className="iconbtn" title="Vencimento da implantação" disabled={busy} onClick={() => m.definirImplantacaoVence(l)}><Ic d={icClock} /></button>}
            <button className="iconbtn" title="Grupo" disabled={busy} onClick={() => onGrupo(l)}><Ic d={icFolder} /></button>
            <button className="iconbtn" title="Mover para outra revenda" disabled={busy} onClick={() => m.moverRevenda(l)}><Ic d={icUsers} /></button>
            {l.revendaCodigo && <button className="iconbtn" title="Remover da revenda (pra reinstalar)" disabled={busy} onClick={() => m.removerRevenda(l)}><Ic d={icLogout} /></button>}
            <button className="iconbtn" title="Parcelas pagas" disabled={busy} onClick={() => onHist(l)}><Ic d={icFile} /></button>
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
          <button className="iconbtn" title="Parcelas pagas" disabled={busy} onClick={() => onHist(l)}><Ic d={icFile} /></button>
        </div>
      </td>
    </tr>
  );
}

function TabelaLojas({ lojas, onAtivar, ativando, vazio, m, onGrupo, rev, onHist, sel, onSel }) {
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
          {lojas.map((l) => <Linha key={l.cnpj} l={l} busy={ativando === l.cnpj} onAtivar={onAtivar} m={m} rev={rev} onGrupo={onGrupo} onHist={onHist} sel={sel} onSel={onSel} />)}
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

function ViewLojas({ lojas, onAtivar, ativando, isMaster, master, rev, onGrupo, onHist }) {
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
  };
  const filtradas = base.filter((l) => {
    if (tab === "ativas" && l.status !== "ativa") return false;
    if (tab === "aguardando" && l.status !== "aguardando") return false;
    if (tab === "bloqueadas" && l.status !== "bloqueada") return false;
    if (tab === "vencer" && !vencendoEmBreve(l)) return false;
    if (q.trim()) {
      const t = q.toLowerCase();
      if (!((l.nome || "").toLowerCase().includes(t) || (l.cnpj || "").includes(q.replace(/\D/g, "")))) return false;
    }
    return true;
  });
  const tabs = isMaster
    ? [["todas", "Todas", cont.todas], ["ativas", "Ativas", cont.ativas], ["vencer", "A vencer", cont.vencer], ["bloqueadas", "Bloqueadas", cont.bloqueadas]]
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
        {!isMaster && sel.size > 0 && (
          <div className="sel-bar">
            <span><b>{sel.size}</b> selecionada(s) · <b>R$ {lojas.filter((x) => sel.has(x.cnpj)).reduce((t, x) => t + (Number(x.valorAPagar) || PRECO), 0)}</b></span>
            <button className="link" onClick={() => setSel(new Set())}>limpar</button>
            <button className="btn btn-mg btn-sm" onClick={() => rev.pagarLote([...sel])}><Ic d={icCard} /> Gerar boleto / Pix</button>
          </div>
        )}
        <TabelaLojas lojas={filtradas} onAtivar={onAtivar} ativando={ativando} m={isMaster ? master : null} rev={rev} onGrupo={onGrupo}
          onHist={onHist} sel={isMaster ? null : sel} onSel={isMaster ? null : toggleSel}
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
  const ativas = lojas.filter((l) => l.status === "ativa" && !l.cortesia);
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
  const ativas = lojas.filter((l) => l.status === "ativa" && !l.cortesia).length;
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
          <li><span className="step-n">2</span><span>Descompacte no PC da loja, abra a pasta <b className="mono">MeuGiro-Agente</b> e rode <b className="mono">INSTALAR.bat</b> como administrador. Ele se instala sozinho em <b className="mono">C:\MeuGiroAgente</b>.</span></li>
          <li><span className="step-n">3</span><span>O agente sobe sozinho, descobre o CNPJ e a loja aparece aqui na lista.</span></li>
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

function ViewUsuarios({ sess, lojas, mostrarToast }) {
  const [users, setUsers] = useState(null);
  const [erro, setErro] = useState("");
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  const carregar = useCallback(async () => {
    try { setUsers(await api("/usuarios", { token: sess.token }) || []); setErro(""); }
    catch (e) { setErro(e.message); setUsers([]); }
  }, [sess.token]);
  useEffect(() => { carregar(); }, [carregar]);

  const nomeLoja = (c) => { const l = lojas.find((x) => x.cnpj === c); return l ? l.nome : fmtCnpj(c); };

  function novo() {
    if (lojas.length === 0) { mostrarToast("Você precisa ter ao menos uma loja para criar usuários.", false); return; }
    setForm({ modo: "novo", nome: "", email: "", login: "", senha: "", cnpjs: new Set(lojas.length === 1 ? [lojas[0].cnpj] : []), sessaoUnica: false, deviceLock: false, consultaPreco: false, preset: "tudo", perms: new Set() });
  }
  function editar(u) {
    const perms = new Set(u.permissoes || []);
    const preset = (u.permissoes || []).length === 0 ? "tudo" : ehSoEstoque(u.permissoes) ? "estoque" : "custom";
    setForm({ modo: "editar", id: u.id, nome: u.nome || "", email: u.email, login: u.login || "", cnpjs: new Set((u.empresas || []).map((e) => e.cnpj)), ativo: u.ativo !== false, sessaoUnica: u.sessaoUnica === true, deviceLock: u.deviceLock === true, consultaPreco: u.consultaPreco === true, preset, perms });
  }
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const togglePerm = (k) => setForm((f) => { const p = new Set(f.perms); p.has(k) ? p.delete(k) : p.add(k); return { ...f, perms: p, preset: "custom" }; });
  const permsFinais = (f) => f.preset === "tudo" ? [] : f.preset === "estoque" ? ESTOQUE : [...f.perms];

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
        await api("/usuarios", { method: "POST", token: sess.token, body: { nome: f.nome, email: f.email, login: f.login, senha: f.senha, cnpjs: [...f.cnpjs], sessaoUnica: !!f.sessaoUnica, deviceLock: !!f.deviceLock, consultaPreco: !!f.consultaPreco, permissoes: permsFinais(f) } });
        mostrarToast("Usuário criado.");
      } else if (f.modo === "editar") {
        if (!f.cnpjs || f.cnpjs.size === 0) { mostrarToast("Marque ao menos uma loja.", false); setBusy(false); return; }
        await api("/usuarios/" + f.id, { method: "POST", token: sess.token, body: { nome: f.nome, login: f.login, ativo: f.ativo, cnpjs: [...f.cnpjs], sessaoUnica: !!f.sessaoUnica, deviceLock: !!f.deviceLock, consultaPreco: !!f.consultaPreco, permissoes: permsFinais(f) } });
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
        <div className="p-head"><span className="p-title"><Ic d={icUsers} /> Usuários das suas lojas</span></div>
        {users === null ? (
          <div className="mini-empty">Carregando…</div>
        ) : users.length === 0 ? (
          <div className="mini-empty">Nenhum usuário ainda. Clique em <b>Novo usuário</b> para criar o acesso de um cliente.</div>
        ) : (
          <div className="ulist">
            {users.map((u) => (
              <div className="urow" key={u.id}>
                <div className="uav">{iniciais(u.nome || u.email)}</div>
                <div className="uinfo">
                  <div className="un">{u.nome || "(sem nome)"} {u.ativo === false && <span className="pill pill-block" style={{ marginLeft: 6 }}>Inativo</span>}</div>
                  <div className="ue">{[u.login && "usuário: " + u.login, u.email].filter(Boolean).join(" · ")}</div>
                  <div className="umeta">
                    <span className="grp-chip"><Ic d={icUsers} /> {(u.empresas || []).map((e) => e.nome || nomeLoja(e.cnpj)).join(", ") || "—"}</span>
                    <span className="grp-chip"><Ic d={icLock} /> {resumoPerms(u.permissoes)}</span>
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
                  </>
                ) : (
                  <>
                    <div className="field"><label>E-mail</label>
                      <input type="email" value={form.email || "(sem e-mail)"} disabled /></div>
                    <div className="field"><label>Usuário (pra entrar no app)</label>
                      <input type="text" value={form.login} onChange={(e) => set({ login: e.target.value.toLowerCase() })} placeholder="ex.: preco bentevi" />
                      <div className="hint" style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>A pessoa entra com o e-mail ou com esse usuário. Não pode repetir.</div></div>
                    <LojasPicker lojas={lojas} sel={form.cnpjs} onChange={(cnpjs) => set({ cnpjs })} />
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

/* ================= SHELL ================= */
const NAV = [
  { k: "inicio", label: "Início", icon: icHome },
  { k: "lojas", label: "Lojas", icon: icUsers },
  { k: "nova", label: "Nova loja", icon: icPlus },
  { k: "usuarios", label: "Usuários", icon: icKey },
  { k: "masters", label: "Usuários master", icon: icUsers, revOnly: true },
  { k: "solicitacoes", label: "Solicitações", icon: icKey },
  { k: "revendas", label: "Revendas", icon: icUsers, masterOnly: true },
  { k: "transferencias", label: "Transferências", icon: icUsers, masterOnly: true },
  { grp: "Financeiro" },
  { k: "cobrancas", label: "Cobranças", icon: icCard },
  { k: "relatorios", label: "Relatórios", icon: icFile },
  { grp: "Recursos" },
  { k: "catalogo", label: "Catálogo", icon: icFile, masterOnly: true },
  { k: "instaladores", label: "Instaladores", icon: icDownload },
  { k: "config", label: "Configurações", icon: icGear },
];
const CRUMB = { inicio: "início", lojas: "início / lojas", nova: "início / nova loja", usuarios: "início / usuários", masters: "início / usuários master", solicitacoes: "início / solicitações", revendas: "início / revendas", transferencias: "início / transferências", catalogo: "recursos / catálogo", cobrancas: "financeiro / cobranças", relatorios: "financeiro / relatórios", instaladores: "recursos / instaladores", config: "recursos / configurações" };

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
          sistema: e.sistema || null, cortesia: !!e.cortesia, situacaoRevenda: e.situacaoRevenda || null,
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
    excluir(l) {
      setModal({
        title: "Excluir loja", icon: { d: icTrash, cls: "ic-red" },
        desc: `Excluir “${l.nome}” (${fmtCnpj(l.cnpj)}) do painel? Some da lista e da cobrança.` + (l.online ? " Atenção: o agente está online e a loja volta a aparecer quando ele reconectar. Desinstale o agente antes." : ""),
        confirmLabel: "Excluir", danger: true,
        onConfirm: () => runAction(() => api(`/lojas/${l.cnpj}`, { method: "DELETE", base: ADMIN_API, token: sess.token }), "Loja excluída."),
      });
    },
  };

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

  const props = { recarregar: carregar, onSolicitacoes: setNSolic, lojas, sess, onAtivar: ativar, ativando, goto: setView, onLogout, mostrarToast, isMaster, master, rev: revenda, onGrupo: definirGrupo, onHist: verHistorico };
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
