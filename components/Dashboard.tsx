"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Scissors,
  LayoutDashboard,
  CalendarDays,
  Users,
  Wallet,
  Settings,
  ArrowUpRight,
  ArrowRight,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  Link as LinkIcon,
  Check,
  Clock,
  MoreHorizontal,
  LogOut,
  X,
  Menu,
  MessageCircle,
  Receipt,
  ExternalLink,
  Copy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { money, localDay, time } from "@/lib/domain";
import type { Data, Appointment } from "./types";
import Booking from "./Booking";
const tabs: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Visão geral", icon: LayoutDashboard },
  { id: "agenda", label: "Agenda", icon: CalendarDays },
  { id: "team", label: "Profissionais", icon: Users },
  { id: "services", label: "Serviços", icon: Scissors },
  { id: "finance", label: "Financeiro", icon: Wallet },
  { id: "messages", label: "Lembretes", icon: MessageCircle },
];
const labels: Record<string, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  in_progress: "Em atendimento",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
};
export default function Dashboard() {
  const [data, setData] = useState<Data>();
  const [login, setLogin] = useState(false);
  const [tab, setTab] = useState("overview");
  const [day, setDay] = useState(localDay());
  const [pro, setPro] = useState("all");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<"booking" | "expense" | "payout" | null>(
    null,
  );
  const [detail, setDetail] = useState<Appointment | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState("Pix");
  const [menu, setMenu] = useState(false);
  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/data?day=${day}`);
      if (r.status === 401) {
        setLogin(true);
        return;
      }
      if (!r.ok) throw Error("Não foi possível carregar os dados");
      setData(await r.json());
      setLogin(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [day]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(""), 4000);
      return () => clearTimeout(t);
    }
  }, [notice]);
  async function mutate(body: object) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await r.json();
      if (!r.ok) throw Error(result.error);
      await load();
      setNotice("Alteração salva com sucesso");
      setModal(null);
      setDetail(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function enter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      const r = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: f.get("password"),
          profile: f.get("profile"),
        }),
      });
      if (!r.ok) throw Error("Senha incorreta");
      setError("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function shift(n: number) {
    const d = new Date(`${day}T12:00:00`);
    d.setDate(d.getDate() + n);
    setDay(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        `${location.origin}/agendar/studio-da-navalha`,
      );
      setNotice("Link de agendamento copiado");
    } catch {
      setNotice("Abra a página pública e copie o endereço.");
    }
  };
  if (login)
    return (
      <main className="login-page">
        <div className="login-story">
          <div className="brand">
            <span className="brand-icon">
              <Scissors />
            </span>
            navalha.
          </div>
          <span className="eyebrow light">MAIS TEMPO PARA O QUE IMPORTA</span>
          <h1>
            Seu talento
            <br />
            faz o corte.
            <br />
            <em>
              A gente cuida
              <br />
              da gestão.
            </em>
          </h1>
          <p>
            Agenda, equipe e financeiro.
            <br />
            Tudo no ritmo da sua barbearia.
          </p>
          <span className="login-foot">
            FEITO PARA A ROTINA REAL DA BARBEARIA
          </span>
        </div>
        <section className="login-box">
          <span className="eyebrow">BEM-VINDO À NAVALHA</span>
          <h2>Seu dia começa aqui.</h2>
          <p className="muted">Entre no ambiente de demonstração local.</p>
          <form onSubmit={enter}>
            <label className="field">
              Perfil
              <select name="profile">
                <option value="owner">Proprietário · Studio da Navalha</option>
                <option value="rafa">Barbeiro · Rafael Costa</option>
              </select>
            </label>
            <label className="field">
              Senha de demonstração
              <input
                name="password"
                type="password"
                required
                defaultValue="demo-local-2026"
              />
            </label>
            <button className="primary wide" disabled={busy}>
              {busy ? "Entrando…" : "Entrar no painel"}
              <ArrowRight size={18} />
            </button>
          </form>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <p className="demo-note">
            Dados fictícios · acesso local de desenvolvimento
            <br />
            Senha inicial: demo-local-2026
          </p>
          <a className="inline-link" href="/agendar/studio-da-navalha">
            Ver página de agendamento
            <ArrowUpRight size={16} />
          </a>
        </section>
      </main>
    );
  if (!data)
    return (
      <main className="loading">
        <Scissors />
        <p>{error || "Preparando sua barbearia…"}</p>
        {error && <button onClick={load}>Tentar novamente</button>}
      </main>
    );
  const owner = data.role === "owner";
  const appointments = data.appointments.filter(
    (a) =>
      (pro === "all" || a.professional_id === pro) &&
      `${a.customer} ${a.service_name}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const active = data.appointments.filter(
    (a) => !["cancelled", "no_show"].includes(a.status),
  );
  const completed = data.appointments.filter((a) => a.status === "completed");
  const received = completed.reduce((s, a) => s + a.paid, 0);
  const earned = completed.reduce((s, a) => s + a.commission, 0);
  const expensesDay = data.expenses.filter(
    (e) =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
      }).format(new Date(e.paid_at)) === day,
  );
  const expenses = expensesDay.reduce((s, e) => s + e.amount, 0);
  const dateText = new Date(`${day}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return (
    <div className="app-shell">
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <a href="/" className="brand">
          <span className="brand-icon">
            <Scissors size={23} />
          </span>
          navalha<span className="brand-dot">.</span>
        </a>
        <div className="workspace">
          <span className="workspace-icon">SN</span>
          <div>
            <strong>Studio da Navalha</strong>
            <small>Ambiente de demonstração</small>
          </div>
        </div>
        <span className="nav-label">ESPAÇO DE TRABALHO</span>
        <nav>
          {tabs
            .filter((t) => owner || !["messages"].includes(t.id))
            .map((t) => (
              <button
                key={t.id}
                className={tab === t.id ? "active" : ""}
                onClick={() => {
                  setTab(t.id);
                  setMenu(false);
                }}
              >
                <t.icon size={19} />
                {t.label}
                {t.id === "agenda" && (
                  <span className="count">{active.length}</span>
                )}
              </button>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="tiny-label">SUA AGENDA, SEM COMPLICAÇÃO</span>
            <strong>
              Um link.
              <br />
              Novos clientes.
            </strong>
            <button onClick={copy}>
              Copiar meu link
              <ArrowUpRight size={16} />
            </button>
          </div>
          <button
            className="sidebar-logout"
            onClick={async () => {
              await fetch("/api/session", { method: "DELETE" });
              setData(undefined);
              setLogin(true);
            }}
          >
            <LogOut size={17} />
            Sair da conta
          </button>
          <div className="account">
            <span className="avatar small">{owner ? "TL" : "RC"}</span>
            <div>
              <strong>{owner ? "Minha barbearia" : "Rafael Costa"}</strong>
              <small>{owner ? "Proprietário" : "Barbeiro"}</small>
            </div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label="Abrir menu"
              onClick={() => setMenu(!menu)}
            >
              <Menu size={22} />
            </button>
            <span>Meu espaço</span>
            <ChevronRight size={14} />
            <strong>{tabs.find((t) => t.id === tab)?.label}</strong>
          </div>
          <div className="topbar-right">
            <span className="local-badge">
              <span />
              Modo local
            </span>
            <button
              className="icon-button"
              aria-label="Ver lembretes"
              onClick={() => setTab("messages")}
            >
              <Bell size={20} />
            </button>
            <span className="avatar small">{owner ? "TL" : "RC"}</span>
          </div>
        </header>
        <main className="content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">STUDIO DA NAVALHA</span>
              <h1>
                {tab === "overview"
                  ? "Tudo pronto para um bom dia."
                  : tab === "agenda"
                    ? "Sua agenda, organizada."
                    : tab === "team"
                      ? "Talento que faz a diferença."
                      : tab === "services"
                        ? "Cuidado em cada detalhe."
                        : tab === "finance"
                          ? "Cada valor, no seu lugar."
                          : "Seu cliente bem informado."}
              </h1>
              <p>
                {tab === "overview"
                  ? "Acompanhe o movimento e cuide do que faz seu negócio crescer."
                  : tab === "agenda"
                    ? "Um dia bem planejado começa por aqui."
                    : tab === "team"
                      ? "Acompanhe sua equipe e os valores de cada profissional."
                      : tab === "services"
                        ? "Serviços e preços da sua barbearia."
                        : tab === "finance"
                          ? "Recebimentos, comissões e despesas com clareza."
                          : "Confirmações e lembretes dos seus agendamentos."}
              </p>
            </div>
            <button className="primary" onClick={() => setModal("booking")}>
              <Plus size={18} />
              Novo agendamento
            </button>
          </div>
          <div className="toolbar">
            <div className="date-control">
              <button aria-label="Dia anterior" onClick={() => shift(-1)}>
                <ChevronLeft size={17} />
              </button>
              <CalendarDays size={17} />
              <input
                aria-label="Data selecionada"
                type="date"
                value={day}
                onChange={(e) => setDay(e.target.value)}
              />
              <button aria-label="Próximo dia" onClick={() => shift(1)}>
                <ChevronRight size={17} />
              </button>
            </div>
            <span className="date-label">{dateText}</span>
            <button
              className="text-button today"
              onClick={() => setDay(localDay())}
            >
              Hoje
            </button>
            <button className="secondary share" onClick={copy}>
              <LinkIcon size={16} />
              Link de agendamento
            </button>
          </div>
          {(tab === "overview" || tab === "finance") && (
            <div className="stats">
              <Stat
                label={
                  owner ? "Recebimentos do dia" : "Meus serviços concluídos"
                }
                value={money(received)}
                note={`${completed.length} atendimentos concluídos`}
                icon={Wallet}
              />
              <Stat
                label="Agendamentos"
                value={String(active.length).padStart(2, "0")}
                note={`${active.filter((a) => a.status === "confirmed").length} confirmados · ${completed.length} concluídos`}
                icon={CalendarDays}
              />
              <Stat
                label={owner ? "Comissões do dia" : "Minha comissão do dia"}
                value={money(earned)}
                note="Geradas em atendimentos concluídos"
                icon={Scissors}
              />
              <Stat
                label={owner ? "Resultado do dia" : "Ticket médio"}
                value={money(
                  owner
                    ? received - earned - expenses
                    : completed.length
                      ? Math.round(received / completed.length)
                      : 0,
                )}
                note={
                  owner
                    ? "Recebido − comissões − despesas"
                    : "Valor médio por atendimento"
                }
                icon={ArrowUpRight}
                accent
              />
            </div>
          )}
          {(tab === "overview" || tab === "agenda") && (
            <div className={tab === "overview" ? "dashboard-grid" : ""}>
              <section className="panel agenda-panel">
                <div className="panel-heading">
                  <div>
                    <h2>
                      Agenda do dia{" "}
                      <span className="soft-count">{active.length}</span>
                    </h2>
                    <p>Seu próximo atendimento está aqui.</p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => {
                      setTab("agenda");
                      setPro("all");
                    }}
                  >
                    Ver agenda
                    <ArrowUpRight size={16} />
                  </button>
                </div>
                <div className="agenda-filters">
                  <div className="chips">
                    <button
                      className={pro === "all" ? "selected" : ""}
                      onClick={() => setPro("all")}
                    >
                      Todos
                    </button>
                    {data.professionals.map((p) => (
                      <button
                        className={pro === p.id ? "selected" : ""}
                        key={p.id}
                        onClick={() => setPro(p.id)}
                      >
                        <i style={{ background: p.color }} />
                        {p.name.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                  <label className="search">
                    <Search size={16} />
                    <input
                      aria-label="Buscar cliente"
                      placeholder="Buscar cliente"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                </div>
                <div className="appointment-table">
                  <div className="table-head">
                    <span>HORÁRIO / CLIENTE</span>
                    <span>SERVIÇO</span>
                    <span>PROFISSIONAL</span>
                    <span>STATUS</span>
                    <span>VALOR</span>
                  </div>
                  {appointments.map((a) => (
                    <button
                      className="appointment-row"
                      key={a.id}
                      onClick={() => {
                        setDetail(a);
                        setMethod("Pix");
                      }}
                    >
                      <div className="customer-cell">
                        <strong className="time">{time(a.starts_at)}</strong>
                        <div>
                          <strong>{a.customer}</strong>
                          <small>Até {time(a.ends_at)}</small>
                        </div>
                      </div>
                      <span className="service-cell">{a.service_name}</span>
                      <span className="professional-cell">
                        <i style={{ background: a.color }} />
                        {a.professional_name.split(" ")[0]}
                      </span>
                      <span className={`status ${a.status}`}>
                        <i />
                        {labels[a.status]}
                      </span>
                      <strong className="price-cell">{money(a.price)}</strong>
                    </button>
                  ))}
                  {!appointments.length && (
                    <div className="empty">
                      <CalendarDays size={28} />
                      <h3>Espaço para novos encontros.</h3>
                      <p>Nenhum atendimento encontrado neste dia.</p>
                      <button
                        className="secondary"
                        onClick={() => setModal("booking")}
                      >
                        Agendar atendimento
                      </button>
                    </div>
                  )}
                </div>
                <div className="panel-footer">
                  <span>
                    <span className="online-dot" />
                    Agenda sincronizada com o banco local
                  </span>
                  <small>{appointments.length} atendimentos</small>
                </div>
              </section>
              {tab === "overview" && (
                <aside className="right-column">
                  <section className="link-card">
                    <div className="link-card-icon">
                      <LinkIcon size={23} />
                    </div>
                    <span className="eyebrow light">AGENDA SEM FRONTEIRAS</span>
                    <h2>
                      Seu próximo cliente
                      <br />
                      está a um link.
                    </h2>
                    <p>
                      Compartilhe sua página e receba agendamentos de um jeito
                      simples.
                    </p>
                    <div className="link-preview">
                      /agendar/studio-da-navalha
                      <button aria-label="Copiar link" onClick={copy}>
                        <Copy size={15} />
                      </button>
                    </div>
                    <a
                      href="/agendar/studio-da-navalha"
                      target="_blank"
                      className="light-button"
                    >
                      Ver minha página
                      <ArrowUpRight size={17} />
                    </a>
                  </section>
                  <section className="panel team-summary">
                    <div className="panel-heading">
                      <h2>{owner ? "Seu time hoje" : "Meu movimento"}</h2>
                      <Users size={18} />
                    </div>
                    {data.professionals.map((p) => {
                      const rows = completed.filter(
                        (a) => a.professional_id === p.id,
                      );
                      return (
                        <div className="team-summary-row" key={p.id}>
                          <span
                            className="avatar"
                            style={{ background: p.color }}
                          >
                            {p.name
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")}
                          </span>
                          <div>
                            <strong>{p.name.split(" ")[0]}</strong>
                            <small>
                              {rows.length} atendimento
                              {rows.length !== 1 ? "s" : ""} concluído
                              {rows.length !== 1 ? "s" : ""}
                            </small>
                          </div>
                          <b>{money(rows.reduce((s, a) => s + a.paid, 0))}</b>
                        </div>
                      );
                    })}
                    <button
                      className="text-button wide"
                      onClick={() => setTab("team")}
                    >
                      Ver profissionais
                      <ArrowRight size={15} />
                    </button>
                  </section>
                </aside>
              )}
            </div>
          )}
          {tab === "services" && (
            <div className="service-grid">
              {data.services.map((s, i) => (
                <section className="panel service-card" key={s.id}>
                  <span className="service-number">0{i + 1}</span>
                  <Scissors size={30} strokeWidth={1.4} />
                  <h2>{s.name}</h2>
                  <p>{s.description}</p>
                  <div>
                    <span>
                      <Clock size={15} />
                      {s.duration} min
                    </span>
                    <strong>{money(s.price)}</strong>
                  </div>
                  <button
                    className="secondary wide"
                    onClick={() => setModal("booking")}
                  >
                    Agendar serviço
                    <ArrowUpRight size={16} />
                  </button>
                </section>
              ))}
            </div>
          )}
          {(tab === "team" || tab === "finance") && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>{owner ? "Comissões e repasses" : "Meu financeiro"}</h2>
                  <p>
                    Saldo acumulado de todos os períodos · valores recebidos
                    integralmente.
                  </p>
                </div>
                {owner && (
                  <button
                    className="secondary"
                    onClick={() => setModal("payout")}
                  >
                    <Plus size={16} />
                    Registrar repasse
                  </button>
                )}
              </div>
              <div className="professional-grid">
                {data.professionals.map((p) => {
                  const total =
                    data.totals.find((t) => t.professional_id === p.id)
                      ?.earned || 0;
                  const paid = data.payouts
                    .filter((x) => x.professional_id === p.id)
                    .reduce((s, x) => s + x.amount, 0);
                  return (
                    <article className="professional-card" key={p.id}>
                      <div className="professional-top">
                        <span
                          className="avatar big"
                          style={{ background: p.color }}
                        >
                          {p.name
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")}
                        </span>
                        <span className="pill">
                          {(p.commission_bps || 0) / 100}% de comissão
                        </span>
                      </div>
                      <h3>{p.name}</h3>
                      <p className="muted">{p.specialty}</p>
                      <dl>
                        <div>
                          <dt>Comissões geradas</dt>
                          <dd>{money(total)}</dd>
                        </div>
                        <div>
                          <dt>Repasses registrados</dt>
                          <dd>{money(paid)}</dd>
                        </div>
                        <div className="balance">
                          <dt>A receber</dt>
                          <dd>{money(total - paid)}</dd>
                        </div>
                      </dl>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
          {tab === "finance" && (
            <div className="finance-grid">
              {owner && (
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Despesas do dia</h2>
                      <p>{dateText}</p>
                    </div>
                    <button
                      className="secondary"
                      onClick={() => setModal("expense")}
                    >
                      <Plus size={16} />
                      Nova despesa
                    </button>
                  </div>
                  {expensesDay.map((e) => (
                    <div className="ledger-row" key={e.id}>
                      <span className="ledger-icon">
                        <Receipt size={18} />
                      </span>
                      <span>
                        {e.description}
                        <small>Despesa paga</small>
                      </span>
                      <strong className="negative">− {money(e.amount)}</strong>
                    </div>
                  ))}
                  {!expensesDay.length && (
                    <p className="empty">Sem despesas nesta data.</p>
                  )}
                  <div className="formula">
                    Resultado operacional simplificado = recebimentos −
                    comissões − despesas pagas. Repasses liquidam comissões e
                    não são descontados novamente.
                  </div>
                </section>
              )}
              <section className="panel">
                <div className="panel-heading">
                  <h2>Histórico de repasses</h2>
                  <Wallet size={19} />
                </div>
                {data.payouts.map((p) => (
                  <div className="ledger-row" key={p.id}>
                    <span className="ledger-icon">
                      <Check size={18} />
                    </span>
                    <span>
                      {
                        data.professionals.find(
                          (x) => x.id === p.professional_id,
                        )?.name
                      }
                      <small>
                        {new Date(p.created_at).toLocaleDateString("pt-BR")}
                      </small>
                    </span>
                    <strong>{money(p.amount)}</strong>
                  </div>
                ))}
                {!data.payouts.length && (
                  <p className="empty">Nenhum repasse registrado.</p>
                )}
              </section>
            </div>
          )}
          {tab === "messages" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Lembretes de WhatsApp</h2>
                  <p>Modo simulado · nenhuma mensagem real é enviada.</p>
                </div>
                <span className="pill">Integração pendente</span>
              </div>
              {data.notifications.map((n) => (
                <div className="ledger-row" key={n.id}>
                  <span className="ledger-icon">
                    <MessageCircle size={18} />
                  </span>
                  <span>
                    {n.customer}
                    <small>
                      {n.kind === "reminder"
                        ? "Lembrete de 2 horas"
                        : "Confirmação"}{" "}
                      · {new Date(n.due_at).toLocaleString("pt-BR")}
                    </small>
                  </span>
                  <span className="pill">
                    {n.status === "simulated"
                      ? "Simulado"
                      : n.status === "cancelled"
                        ? "Cancelado"
                        : "Na fila"}
                  </span>
                </div>
              ))}
              {!data.notifications.length && (
                <div className="empty">
                  <MessageCircle size={30} />
                  <h3>Seus lembretes aparecem aqui.</h3>
                  <p>
                    Ao agendar, o cliente pode consentir em receber mensagens.
                  </p>
                </div>
              )}
            </section>
          )}
          <footer className="app-footer">
            <span>
              navalha<span className="brand-dot">.</span>{" "}
              <small>Menos gestão. Mais cuidado.</small>
            </span>
            <small>Versão local · dados fictícios · WhatsApp simulado</small>
          </footer>
        </main>
      </div>
      <nav className="bottom-nav">
        {tabs
          .filter((t) =>
            ["overview", "agenda", "team", "finance"].includes(t.id),
          )
          .map((t) => (
            <button
              className={tab === t.id ? "active" : ""}
              key={t.id}
              onClick={() => setTab(t.id)}
            >
              <t.icon size={21} />
              <small>{t.label}</small>
            </button>
          ))}
      </nav>
      {notice && (
        <div role="status" className="toast">
          <Check size={18} />
          {notice}
        </div>
      )}
      {error && (
        <div role="alert" className="error floating-error">
          {error}
          <button
            className="icon-button"
            aria-label="Fechar erro"
            onClick={() => setError("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {(modal || detail) && (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (!busy) {
              setModal(null);
              setDetail(null);
            }
          }}
        >
          <section
            className={`modal ${modal === "booking" ? "booking-modal" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={
              detail
                ? "Detalhes do atendimento"
                : modal === "booking"
                  ? "Novo agendamento"
                  : modal === "expense"
                    ? "Nova despesa"
                    : "Registrar repasse"
            }
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close icon-button"
              aria-label="Fechar"
              disabled={busy}
              onClick={() => {
                setModal(null);
                setDetail(null);
              }}
            >
              <X size={21} />
            </button>
            {modal === "booking" ? (
              <Booking
                internal
                onDone={() => {
                  setModal(null);
                  void load();
                  setNotice("Agendamento criado");
                }}
              />
            ) : detail ? (
              <>
                <span className="eyebrow">DETALHES DO ATENDIMENTO</span>
                <h2>{detail.customer}</h2>
                <span className={`status ${detail.status}`}>
                  {labels[detail.status]}
                </span>
                <dl className="detail-list">
                  <div>
                    <dt>Serviço</dt>
                    <dd>{detail.service_name}</dd>
                  </div>
                  <div>
                    <dt>Profissional</dt>
                    <dd>{detail.professional_name}</dd>
                  </div>
                  <div>
                    <dt>Horário</dt>
                    <dd>
                      {time(detail.starts_at)} às {time(detail.ends_at)}
                    </dd>
                  </div>
                  <div>
                    <dt>Valor</dt>
                    <dd>{money(detail.price)}</dd>
                  </div>
                  <div>
                    <dt>Comissão</dt>
                    <dd>{money(detail.commission)}</dd>
                  </div>
                  <div>
                    <dt>WhatsApp</dt>
                    <dd>{detail.phone}</dd>
                  </div>
                </dl>
                {!["completed", "cancelled", "no_show"].includes(
                  detail.status,
                ) && (
                  <>
                    <label className="field">
                      Receber em
                      <select
                        value={method}
                        onChange={(e) => setMethod(e.target.value)}
                      >
                        <option>Pix</option>
                        <option>Dinheiro</option>
                        <option>Cartão</option>
                      </select>
                    </label>
                    <button
                      className="primary wide"
                      disabled={busy}
                      onClick={() =>
                        mutate({
                          action: "status",
                          id: detail.id,
                          status: "completed",
                          method,
                        })
                      }
                    >
                      <Check size={17} />
                      Concluir e receber {money(detail.price)}
                    </button>
                    <div className="detail-actions">
                      {detail.status === "scheduled" && (
                        <button
                          className="secondary"
                          disabled={busy}
                          onClick={() =>
                            mutate({
                              action: "status",
                              id: detail.id,
                              status: "confirmed",
                            })
                          }
                        >
                          Confirmar
                        </button>
                      )}
                      {detail.status !== "in_progress" && (
                        <button
                          className="secondary"
                          disabled={busy}
                          onClick={() =>
                            mutate({
                              action: "status",
                              id: detail.id,
                              status: "in_progress",
                            })
                          }
                        >
                          Iniciar
                        </button>
                      )}
                      <button
                        className="text-button danger"
                        disabled={busy}
                        onClick={() => {
                          if (confirm("Cancelar este atendimento?"))
                            void mutate({
                              action: "status",
                              id: detail.id,
                              status: "cancelled",
                            });
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <span className="eyebrow">FINANCEIRO</span>
                <h2>
                  {modal === "expense"
                    ? "Registrar despesa"
                    : "Registrar repasse"}
                </h2>
                <p className="muted">Confira os dados antes de salvar.</p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void mutate(
                      modal === "expense"
                        ? {
                            action: "expense",
                            description: f.get("description"),
                            amount: Math.round(Number(f.get("amount")) * 100),
                          }
                        : {
                            action: "payout",
                            professionalId: f.get("professionalId"),
                            amount: Math.round(Number(f.get("amount")) * 100),
                          },
                    );
                  }}
                >
                  {modal === "expense" ? (
                    <label className="field">
                      Descrição
                      <input
                        name="description"
                        required
                        minLength={2}
                        placeholder="Ex.: produtos de limpeza"
                      />
                    </label>
                  ) : (
                    <label className="field">
                      Profissional
                      <select name="professionalId">
                        {data.professionals.map((p) => (
                          <option value={p.id} key={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label className="field">
                    Valor em reais
                    <input
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0,00"
                    />
                  </label>
                  <button disabled={busy} className="primary wide">
                    {busy ? "Salvando…" : "Salvar lançamento"}
                    <Check size={17} />
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
function Stat({
  label,
  value,
  note,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
  accent?: boolean;
}) {
  return (
    <section className={`stat-card ${accent ? "accent" : ""}`}>
      <div>
        <span>{label}</span>
        <Icon size={18} />
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </section>
  );
}
