"use client";
import { useEffect, useRef, useState } from "react";
import OperationsPanel from "./OperationsPanel";
import Brand from "./Brand";
import { ThemeControl } from "./ThemeProvider";
import { money } from "@/lib/domain";
type Plan = {
  id: string;
  name: string;
  description: string;
  monthly_price: number | null;
  max_professionals: number | null;
  published: boolean;
  active: boolean;
  updated_at: string;
};
type Tenant = {
  id: string;
  name: string;
  slug: string;
  plan_id: string | null;
  plan_name: string | null;
  status: string | null;
  period_end: string | null;
  professional_count: string;
  professional_limit: number | null;
};
type Platform = {
  name: string;
  plans: Plan[];
  tenants: Tenant[];
  requests: { id: string; tenant_name: string; plan_name: string }[];
  audit: {
    action: string;
    entity_id: string;
    created_at: string;
    actor_name: string;
  }[];
};
export default function PlatformPanel() {
  const [data, setData] = useState<Platform>();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [tenant, setTenant] = useState("");
  const [plan, setPlan] = useState("");
  const [method, setMethod] = useState("Pix");
  const command = useRef<{ body: string; key: string }>(undefined);
  const load = async () => {
    const r = await fetch("/api/platform", { cache: "no-store" });
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    setData(d);
  };
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  async function send(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (body.action === "receipt") {
        const json = JSON.stringify(body);
        if (command.current?.body !== json)
          command.current = { body: json, key: crypto.randomUUID() };
        body = { ...body, idempotencyKey: command.current.key };
      }
      const r = await fetch("/api/platform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Não foi possível salvar.");
      setNotice("Alteração registrada com auditoria.");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="platform-page">
      <header className="booking-header">
        <a href="/">
          <Brand />
        </a>
        <div className="public-header-actions">
          <ThemeControl />
          <a className="secondary" href="/minha-conta">
            Minha conta
          </a>
          <a className="secondary" href="/">
            Painel da barbearia
          </a>
        </div>
      </header>
      <div className="platform-content">
        <span className="eyebrow">ADMINISTRAÇÃO DO ELARES BARBER</span>
        <h1>Planos, empresas e assinaturas.</h1>
        <p className="muted">
          Esta área é exclusiva do administrador da plataforma. O dono de uma
          barbearia não ganha esse acesso automaticamente.
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {!data && (
          <div className="login-links">
            <a className="primary" href="/?next=administracao">
              Entrar com minha conta
            </a>
            <a className="secondary" href="/minha-conta">
              Configurar segundo fator
            </a>
          </div>
        )}
        {notice && (
          <p className="success-note" role="status">
            {notice}
          </p>
        )}
        {data && (
          <>
            <section className="panel">
              <h2>Planos configuráveis</h2>
              <p className="muted">
                Preços e limites não foram definidos pelo usuário. Os rascunhos
                só aparecem ao público depois de publicados. Alterações valem
                para novas ativações; contratos já registrados mantêm seus
                valores e limites.
              </p>
              <div className="platform-plan-grid">
                {data.plans.map((p) => (
                  <form
                    className="plan-editor"
                    key={p.id + p.updated_at}
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      send({
                        action: "plan",
                        id: p.id,
                        name: f.get("name"),
                        description: f.get("description"),
                        monthlyPrice:
                          f.get("price") === ""
                            ? null
                            : Math.round(Number(f.get("price")) * 100),
                        maxProfessionals:
                          f.get("limit") === "" ? null : Number(f.get("limit")),
                        published: f.get("published") === "on",
                        active: f.get("active") === "on",
                      });
                    }}
                  >
                    <label className="field">
                      Nome
                      <input
                        name="name"
                        defaultValue={p.name}
                        maxLength={80}
                        required
                      />
                    </label>
                    <label className="field">
                      Descrição
                      <textarea
                        name="description"
                        defaultValue={p.description}
                        maxLength={300}
                      />
                    </label>
                    <div className="form-grid">
                      <label className="field">
                        Mensalidade (R$)
                        <input
                          name="price"
                          type="number"
                          step="0.01"
                          min="0"
                          defaultValue={
                            p.monthly_price === null
                              ? ""
                              : p.monthly_price / 100
                          }
                          placeholder="A definir"
                        />
                      </label>
                      <label className="field">
                        Limite de profissionais
                        <input
                          name="limit"
                          type="number"
                          min="1"
                          max="1000"
                          defaultValue={p.max_professionals ?? ""}
                          placeholder="A definir"
                        />
                      </label>
                    </div>
                    <label className="check-field">
                      <input
                        name="active"
                        type="checkbox"
                        defaultChecked={p.active}
                      />
                      Plano ativo
                    </label>
                    <label className="check-field">
                      <input
                        name="published"
                        type="checkbox"
                        defaultChecked={p.published}
                      />
                      Publicar no cadastro
                    </label>
                    <button className="primary" disabled={busy}>
                      Salvar plano
                    </button>
                  </form>
                ))}
              </div>
            </section>
            <section className="panel">
              <h2>Barbearias</h2>
              <div className="platform-businesses">
                {data.tenants.map((t) => (
                  <button
                    className={
                      "business-row " + (tenant === t.id ? "selected" : "")
                    }
                    key={t.id}
                    onClick={() => {
                      setTenant(t.id);
                      setPlan(
                        t.plan_id ||
                          data.plans.find((p) => p.published && p.active)?.id ||
                          "",
                      );
                      setNotice("");
                    }}
                  >
                    <span>
                      <strong>{t.name}</strong>
                      <small>/agendar/{t.slug}</small>
                    </span>
                    <span>
                      {t.plan_name || "Sem plano"} ·{" "}
                      {t.status || "Ambiente existente"}
                    </span>
                    <span>
                      {t.professional_count} profissionais
                      {t.professional_limit ? " / " + t.professional_limit : ""}
                    </span>
                    {t.period_end && (
                      <small>
                        Vencimento:{" "}
                        {new Date(t.period_end).toLocaleDateString("pt-BR")}
                      </small>
                    )}
                  </button>
                ))}
              </div>
            </section>
            {tenant && tenant !== "demo" && (
              <section className="panel">
                <h2>Ativação ou renovação manual</h2>
                <p className="muted">
                  {data.tenants.find((t) => t.id === tenant)?.name}. Este
                  registro não movimenta dinheiro. Confira o recebimento fora do
                  sistema antes de confirmar.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    send({
                      action: "receipt",
                      tenantId: tenant,
                      planId: plan,
                      amount: Math.round(Number(f.get("amount")) * 100),
                      method,
                      reference: f.get("reference"),
                      periodEnd: String(f.get("end")) + "T23:59:59-03:00",
                      confirmed: f.get("confirmed") === "on",
                    });
                  }}
                >
                  <div className="form-grid">
                    <label className="field">
                      Plano
                      <select
                        value={plan}
                        onChange={(e) => setPlan(e.target.value)}
                        required
                      >
                        <option value="">Selecione</option>
                        {data.plans
                          .filter((p) => p.published && p.active)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} · {money(p.monthly_price || 0)}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label className="field">
                      Valor recebido (R$)
                      <input
                        name="amount"
                        type="number"
                        min="0"
                        step="0.01"
                        required
                      />
                    </label>
                    <label className="field">
                      Forma
                      <select
                        value={method}
                        onChange={(e) => setMethod(e.target.value)}
                      >
                        <option>Pix</option>
                        <option>Transferência</option>
                        <option>Dinheiro</option>
                        <option>Cortesia</option>
                      </select>
                    </label>
                    <label className="field">
                      Válida até
                      <input name="end" type="date" required />
                    </label>
                  </div>
                  <label className="field">
                    Referência ou motivo da cortesia
                    <input
                      name="reference"
                      minLength={3}
                      maxLength={160}
                      required
                    />
                  </label>
                  <label className="check-field">
                    <input name="confirmed" type="checkbox" required />
                    Conferi o recebimento ou autorizei a cortesia e confirmei a
                    validade.
                  </label>
                  <button className="primary" disabled={busy}>
                    Registrar e ativar assinatura
                  </button>
                </form>
                <details className="billing-history">
                  <summary>Suspender ou cancelar assinatura</summary>
                  <p className="muted">
                    A equipe continuará podendo consultar e exportar os dados.
                    Novas operações serão bloqueadas.
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      send({
                        action: "status",
                        tenantId: tenant,
                        status: f.get("status"),
                        confirmed: f.get("confirmed") === "on",
                      });
                    }}
                  >
                    <select name="status" aria-label="Situação da assinatura">
                      <option value="suspended">Suspensa</option>
                      <option value="cancelled">Cancelada</option>
                    </select>
                    <label className="check-field">
                      <input name="confirmed" type="checkbox" required />
                      Confirmo a alteração de acesso desta barbearia.
                    </label>
                    <button className="secondary" disabled={busy}>
                      Atualizar situação
                    </button>
                  </form>
                </details>
              </section>
            )}
            <OperationsPanel />
            <section className="panel">
              <h2>Solicitações pendentes</h2>
              {data.requests.length ? (
                data.requests.map((r) => (
                  <p key={r.id}>
                    {r.tenant_name} · {r.plan_name}
                  </p>
                ))
              ) : (
                <p className="muted">Nenhuma solicitação pendente.</p>
              )}
            </section>
            <details className="panel">
              <summary>Auditoria recente</summary>
              {data.audit.map((a, i) => (
                <p key={i} className="audit-row">
                  {new Date(a.created_at).toLocaleString("pt-BR")} ·{" "}
                  {a.actor_name} · {a.action} · {a.entity_id}
                </p>
              ))}
            </details>
          </>
        )}
      </div>
    </main>
  );
}
