/* Painel da Revenda — Meu Giro (Vinny Tecnologia).
   No-build React (UMD + Babel no navegador). Fala com o relay em /api/revenda. */
const { useState, useEffect, useCallback } = React;

const API = "https://raizestecnologia-relay.onrender.com/api/revenda";
const LS_TOKEN = "mg_rev_token";
const LS_USER = "mg_rev_user";

/* ---------- HTTP ---------- */
async function api(path, { method = "GET", body, token } = {}) {
  const res = await fetch(API + path, {
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
    throw new Error(json.message || "Falha na conexão (" + res.status + ")");
  }
  return json.data;
}

/* ---------- utils ---------- */
const iniciais = (nome) =>
  (nome || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

const fmtCnpj = (v) => {
  const d = (v || "").replace(/\D/g, "");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
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

/* ---------- ícones ---------- */
const Ic = ({ d, ...p }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" {...p}>{d}</svg>
);
const icUsers = <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>;
const icCheck = <polyline points="20 6 9 17 4 12"/>;
const icClock = <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>;
const icAlert = <><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12" y2="17"/></>;
const icMoney = <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>;
const icLock = <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>;
const icSearch = <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>;
const icRefresh = <><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></>;
const icLogout = <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>;
const icInfo = <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></>;

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
    /cadastr/i.test(location.hash + location.search) ? "cadastro" : "login"); // login | cadastro
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
          <label>E-mail</label>
          <input type="email" value={f.email} onChange={set("email")} placeholder="voce@email.com" required />
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

/* ================= KPIs ================= */
function Kpis({ lojas }) {
  const ativas = lojas.filter((l) => l.status === "ativa").length;
  const aguardando = lojas.filter((l) => l.status === "aguardando").length;
  const aVencer = lojas.filter((l) => l.status === "ativa" && diasAteVenc(l.vencimento) <= 7 && diasAteVenc(l.vencimento) >= 0).length;
  const receita = ativas * 30;
  const cards = [
    { ic: icCheck, cls: "ic-green", l: "Lojas ativas", v: ativas, s: `de ${lojas.length} no total` },
    { ic: icClock, cls: "ic-amber", l: "Aguardando ativação", v: aguardando, s: "R$ 30 cada pra liberar", vcls: { color: "var(--mg)" } },
    { ic: icAlert, cls: "ic-red", l: "A vencer (7 dias)", v: aVencer, s: "mensalidade a receber" },
    { ic: icMoney, cls: "ic-blue", l: "Receita do mês", v: "R$ " + receita, s: `${ativas} lojas × R$ 30` },
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

/* ================= LINHA ================= */
function Linha({ l, onAtivar, busy }) {
  const venc = diasAteVenc(l.vencimento);
  const soon = l.status === "ativa" && venc >= 0 && venc <= 7;
  return (
    <tr>
      <td className="loja">
        <div className="nm">{l.nome || "Loja sem nome"}</div>
        <div className="cnpj">{fmtCnpj(l.cnpj)}</div>
      </td>
      <td>
        <span className={"on-dot " + (l.online ? "on" : "off")}>
          <i></i> {l.online ? "online" : "offline"}
        </span>
      </td>
      <td className="dias">{l.status === "aguardando" ? "—" : l.diasUso}</td>
      <td className={"venc" + (soon ? " soon" : "")}>{l.status === "aguardando" ? "—" : fmtData(l.vencimento)}</td>
      <td>
        {l.status === "aguardando" && (
          <span className="pill pill-wait"><Ic d={icClock} strokeWidth="2.4" /> Aguardando</span>
        )}
        {l.status === "ativa" && (
          <span className="pill pill-ok"><Ic d={icCheck} strokeWidth="3" /> Ativa</span>
        )}
        {l.status === "bloqueada" && (
          <span className="pill pill-block"><Ic d={icLock} strokeWidth="2.4" /> Bloqueada</span>
        )}
      </td>
      <td>
        <div className="row-actions">
          {l.status === "aguardando" && (
            <button className="btn btn-mg btn-sm" disabled={busy} onClick={() => onAtivar(l)}>
              Ativar · R$ 30
            </button>
          )}
          {l.status === "bloqueada" && (
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onAtivar(l)}>
              Liberar
            </button>
          )}
          {l.status === "ativa" && <span style={{ color: "var(--muted-2)", fontSize: 13 }}>—</span>}
        </div>
      </td>
    </tr>
  );
}

/* ================= PAINEL ================= */
function Painel({ sess, onLogout }) {
  const [lojas, setLojas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [tab, setTab] = useState("todas");
  const [q, setQ] = useState("");
  const [ativando, setAtivando] = useState("");
  const [toast, setToast] = useState(null);

  const carregar = useCallback(async () => {
    setErro("");
    try {
      const data = await api("/lojas", { token: sess.token });
      setLojas(data || []);
    } catch (err) {
      if (/401|autoriz/i.test(err.message)) { onLogout(); return; }
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }, [sess.token, onLogout]);

  useEffect(() => { carregar(); }, [carregar]);

  const mostrarToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3200);
  };

  async function ativar(l) {
    const acao = l.status === "bloqueada" ? "liberar" : "ativar";
    const msg = acao === "liberar"
      ? `Liberar novamente "${l.nome}"?`
      : `Ativar "${l.nome}" por R$ 30?\n\nA loja vai aparecer como Ativa e o lojista passa a ter acesso.`;
    if (!window.confirm(msg)) return;
    setAtivando(l.cnpj);
    try {
      await api(`/lojas/${l.cnpj}/ativar`, { method: "POST", token: sess.token });
      await carregar();
      mostrarToast(acao === "liberar" ? "Loja liberada." : "Loja ativada!");
    } catch (err) {
      mostrarToast(err.message, false);
    } finally {
      setAtivando("");
    }
  }

  const cont = {
    todas: lojas.length,
    ativas: lojas.filter((l) => l.status === "ativa").length,
    aguardando: lojas.filter((l) => l.status === "aguardando").length,
    vencer: lojas.filter((l) => l.status === "ativa" && diasAteVenc(l.vencimento) <= 7 && diasAteVenc(l.vencimento) >= 0).length,
    bloqueadas: lojas.filter((l) => l.status === "bloqueada").length,
  };

  const filtradas = lojas.filter((l) => {
    if (tab === "ativas" && l.status !== "ativa") return false;
    if (tab === "aguardando" && l.status !== "aguardando") return false;
    if (tab === "bloqueadas" && l.status !== "bloqueada") return false;
    if (tab === "vencer" && !(l.status === "ativa" && diasAteVenc(l.vencimento) <= 7 && diasAteVenc(l.vencimento) >= 0)) return false;
    if (q.trim()) {
      const t = q.toLowerCase();
      if (!((l.nome || "").toLowerCase().includes(t) || (l.cnpj || "").includes(q.replace(/\D/g, "")))) return false;
    }
    return true;
  });

  const tabs = [
    ["todas", "Todas", cont.todas],
    ["ativas", "Ativas", cont.ativas],
    ["aguardando", "Aguardando", cont.aguardando],
    ["vencer", "A vencer", cont.vencer],
    ["bloqueadas", "Bloqueadas", cont.bloqueadas],
  ];

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          {Logo("logo")}
          <div><div className="n">Meu Giro</div><div className="s">Painel da revenda</div></div>
        </div>
        <nav className="nav">
          <button className="on"><Ic d={icUsers} /> Lojas</button>
          <button onClick={carregar}><Ic d={icRefresh} /> Atualizar</button>
        </nav>
        <div className="side-user">
          <div className="av">{iniciais(sess.nome)}</div>
          <div style={{ flex: 1 }}>
            <div className="nm">{sess.nome}</div>
            <div className="rl">Revenda · {sess.codigo}</div>
          </div>
          <button className="logout" title="Sair" onClick={onLogout}><Ic d={icLogout} /></button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <span className="crumb">// painel / lojas</span>
          <div className="sp">
            <div className="who">
              <div style={{ textAlign: "right" }}>
                <div className="nm">{sess.nome}</div>
                <div className="rl">Revenda</div>
              </div>
              <div className="av">{iniciais(sess.nome)}</div>
            </div>
          </div>
        </div>

        <div className="head-row">
          <div>
            <h1>Lojas</h1>
            <p className="sub">As lojas onde você instalou o Meu Giro. Ative, libere e acompanhe.</p>
          </div>
          <div className="actions">
            <button className="btn btn-ghost" onClick={carregar}><Ic d={icRefresh} /> Atualizar</button>
          </div>
        </div>

        <Kpis lojas={lojas} />

        {cont.aguardando > 0 && (
          <div className="alert">
            <span className="a-ic"><Ic d={icInfo} /></span>
            <div style={{ flex: 1 }}>
              <div className="a-t"><b>{cont.aguardando} {cont.aguardando === 1 ? "loja aguardando" : "lojas aguardando"} ativação.</b></div>
              <div className="a-s">Você instalou o agente e {cont.aguardando === 1 ? "ela apareceu" : "elas apareceram"} aqui. Pague R$ 30 em cada pra liberar o acesso do lojista.</div>
            </div>
            <button className="btn btn-mg btn-sm" onClick={() => setTab("aguardando")}>Ver pendentes</button>
          </div>
        )}

        <div className="panel">
          <div className="p-tools">
            <div className="tabs">
              {tabs.map(([k, label, c]) => (
                <button key={k} className={"tab" + (tab === k ? " on" : "")} onClick={() => setTab(k)}>
                  {label} <span className="c">{c}</span>
                </button>
              ))}
            </div>
            <div className="search">
              <Ic d={icSearch} />
              <input placeholder="Buscar por nome ou CNPJ…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
            </div>
          </div>

          {carregando ? (
            <div className="state"><div className="spinner"></div>Carregando suas lojas…</div>
          ) : erro ? (
            <div className="state">
              <div className="big">Não foi possível carregar</div>
              {erro}
              <div style={{ marginTop: 16 }}>
                <button className="btn btn-ghost btn-sm" onClick={carregar}><Ic d={icRefresh} /> Tentar de novo</button>
              </div>
            </div>
          ) : filtradas.length === 0 ? (
            <div className="state">
              <div className="big">{lojas.length === 0 ? "Nenhuma loja ainda" : "Nada nesse filtro"}</div>
              {lojas.length === 0
                ? "Instale o agente com o seu código de revenda numa loja e ela aparece aqui automaticamente."
                : "Tente outro filtro ou limpe a busca."}
            </div>
          ) : (
            <>
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Loja</th><th>Conexão</th><th>Dias de uso</th><th>Vencimento</th><th>Status</th>
                      <th style={{ textAlign: "right" }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtradas.map((l) => (
                      <Linha key={l.cnpj} l={l} busy={ativando === l.cnpj} onAtivar={ativar} />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="foot">
                <span>Mostrando <b style={{ color: "var(--text)" }}>{filtradas.length}</b> de <b style={{ color: "var(--text)" }}>{lojas.length}</b> lojas</span>
                <span className="mono">Meu Giro · Vinny Tecnologia</span>
              </div>
            </>
          )}
        </div>
      </main>

      {toast && (
        <div className={"toast " + (toast.ok ? "ok" : "bad")}>
          <Ic d={toast.ok ? icCheck : icAlert} /> {toast.msg}
        </div>
      )}
    </div>
  );
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
      localStorage.setItem(LS_USER, JSON.stringify({ id: s.id, nome: s.nome, email: s.email, codigo: s.codigo }));
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
