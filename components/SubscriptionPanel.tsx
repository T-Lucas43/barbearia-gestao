"use client";
import { useEffect, useState } from "react";
import { money } from "@/lib/domain";
type Plan = {
  id: string;
  name: string;
  description: string;
  monthly_price: number;
  max_professionals: number;
};
type Billing = {
  subscription: {
    state: string;
    plan_name: string;
    professional_limit: number;
    period_end: string | null;
    billing_enforced: boolean;
  } | null;
  plans: Plan[];
  requests: { id: string; plan_name: string; status: string }[];
  receipts: {
    id: string;
    amount: number;
    method: string;
    period_end: string;
  }[];
  professionals: number;
  demo: boolean;
  supportEmail: string;
};
const labels: Record<string, string> = {
  active: "Ativa",
  pending: "Aguardando ativação",
  expired: "Vencida",
  suspended: "Suspensa",
  cancelled: "Cancelada",
  legacy: "Ainda sem assinatura comercial",
};
export default function SubscriptionPanel() {
  const [data, setData] = useState<Billing>();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const load = async () => {
    const r = await fetch("/api/subscription", { cache: "no-store" });
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    setData(d);
  };
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  return (
    <section className="panel billing-panel">
      <span className="eyebrow">SEU ESPAÇO NA PLATAFORMA</span>
      <h2>Plano e assinatura</h2>
      <p className="muted">
        Ativação e renovação com conferência manual. Solicitar um plano não
        realiza cobrança automática.
      </p>
      {data && (
        <>
          <div className="billing-overview">
            <strong>
              {data.demo
                ? "Demonstração"
                : labels[data.subscription?.state || "pending"]}
            </strong>
            <span>{data.subscription?.plan_name || "Plano a definir"}</span>
            <span>
              {data.professionals} profissionais ativos
              {data.subscription?.professional_limit
                ? " · limite " + data.subscription.professional_limit
                : ""}
            </span>
            {data.subscription?.period_end && (
              <span>
                Válida até{" "}
                {new Date(data.subscription.period_end).toLocaleDateString(
                  "pt-BR",
                )}
              </span>
            )}
          </div>
          {!data.plans.length && (
            <p className="integration-note">
              Os planos e preços ainda estão sendo definidos pela administração.
            </p>
          )}
          <div className="plan-grid">
            {data.plans.map((p) => (
              <article key={p.id} className="plan-choice">
                <h3>{p.name}</h3>
                <b>
                  {money(p.monthly_price)}
                  <small>/mês</small>
                </b>
                <p>Até {p.max_professionals} profissionais ativos</p>
                <p className="muted">{p.description}</p>
                <button
                  className="primary"
                  disabled={
                    busy ||
                    data.demo ||
                    data.requests.some((r) => r.status === "pending")
                  }
                  onClick={async () => {
                    setBusy(true);
                    setError("");
                    try {
                      const r = await fetch("/api/subscription", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ planId: p.id }),
                      });
                      const d = await r.json();
                      if (!r.ok) throw Error(d.error);
                      setNotice(d.message);
                      await load();
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Solicitar plano
                </button>
              </article>
            ))}
          </div>
          {data.requests.length > 0 && (
            <div className="billing-history">
              <h3>Solicitações</h3>
              {data.requests.map((r) => (
                <p key={r.id}>
                  {r.plan_name} ·{" "}
                  {r.status === "pending"
                    ? "Aguardando conferência"
                    : r.status === "approved"
                      ? "Atendida"
                      : "Encerrada"}
                </p>
              ))}
            </div>
          )}
          {data.receipts.length > 0 && (
            <div className="billing-history">
              <h3>Recebimentos informados pela administração</h3>
              {data.receipts.map((r) => (
                <p key={r.id}>
                  {money(r.amount)} · {r.method} · validade até{" "}
                  {new Date(r.period_end).toLocaleDateString("pt-BR")}
                </p>
              ))}
            </div>
          )}
          {data.supportEmail && (
            <a className="inline-link" href={"mailto:" + data.supportEmail}>
              Falar com o suporte
            </a>
          )}
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="success-note" role="status">
          {notice}
        </p>
      )}
    </section>
  );
}
