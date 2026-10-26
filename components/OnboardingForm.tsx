"use client";
import { useEffect, useState } from "react";
import Brand from "./Brand";
import { ThemeControl } from "./ThemeProvider";
import { money } from "@/lib/domain";
type Plan = {
  id: string;
  name: string;
  description: string;
  monthly_price: number;
  max_professionals: number;
};
export default function OnboardingForm() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plan, setPlan] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [version, setVersion] = useState("");
  const [works, setWorks] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  useEffect(() => {
    fetch("/api/plans")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        setPlans(d.plans);
        setPlan(d.plans[0]?.id || "");
        setEnabled(d.signupEnabled);
        setVersion(d.legalVersion);
      })
      .catch((e) => setError(e.message));
  }, []);
  const selected = plans.find((p) => p.id === plan);
  return (
    <main className="access-page">
      <header className="booking-header">
        <a href="/">
          <Brand />
        </a>
        <ThemeControl />
      </header>
      <section className="panel onboarding-card">
        <span className="eyebrow">SUA BARBEARIA, SEU ESPAÇO</span>
        <h1>Organize o próximo capítulo.</h1>
        <p className="muted">
          Uma conta para sua equipe. Cobrança manual, com ativação após
          confirmação da administração.
        </p>
        {(!enabled || !plans.length) && (
          <p className="demo-banner">
            O cadastro comercial está em preparação. Os planos e preços serão
            publicados após definição. Você pode conhecer o sistema pela
            demonstração.
          </p>
        )}
        {!!plans.length && (
          <div className="plan-grid">
            {plans.map((p) => (
              <button
                type="button"
                className={"plan-choice " + (plan === p.id ? "selected" : "")}
                key={p.id}
                onClick={() => setPlan(p.id)}
                aria-pressed={plan === p.id}
              >
                <strong>{p.name}</strong>
                <b>
                  {money(p.monthly_price)}
                  <small>/mês</small>
                </b>
                <span>Até {p.max_professionals} profissionais ativos</span>
                <p>{p.description}</p>
              </button>
            ))}
          </div>
        )}
        {enabled && selected && !success && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              setBusy(true);
              const f = new FormData(e.currentTarget);
              try {
                const r = await fetch("/api/onboarding", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: f.get("name"),
                    email: f.get("email"),
                    password: f.get("password"),
                    shop: f.get("shop"),
                    slug: f.get("slug"),
                    planId: selected.id,
                    quotedPrice: selected.monthly_price,
                    quotedLimit: selected.max_professionals,
                    ownerWorks: works,
                    sharePercent: works ? Number(f.get("share")) : 0,
                    accepted: f.get("accepted") === "on",
                    legalVersion: version,
                    website: f.get("website"),
                  }),
                });
                const d = await r.json();
                if (!r.ok) throw Error(d.error || "Confira os dados.");
                setSuccess(d.message);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="form-grid">
              <label className="field">
                Seu nome
                <input
                  name="name"
                  maxLength={100}
                  autoComplete="name"
                  required
                />
              </label>
              <label className="field">
                Nome da barbearia
                <input
                  name="shop"
                  maxLength={100}
                  autoComplete="organization"
                  required
                />
              </label>
              <label className="field">
                Seu e-mail
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </label>
              <label className="field">
                Senha
                <input
                  name="password"
                  type="password"
                  minLength={10}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                />
              </label>
            </div>
            <label className="field">
              Endereço da página de agendamento
              <input
                name="slug"
                placeholder="minha-barbearia"
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                minLength={3}
                maxLength={60}
                required
              />
              <small>Use letras minúsculas, números e hífens.</small>
            </label>
            <label className="check-field">
              <input
                type="checkbox"
                checked={works}
                onChange={(e) => setWorks(e.target.checked)}
              />
              Também realizo atendimentos
            </label>
            {works && (
              <label className="field">
                Sua participação nos seus cortes (%)
                <input
                  name="share"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  defaultValue="60"
                  required
                />
              </label>
            )}
            <label className="honeypot" aria-hidden="true">
              Website
              <input
                name="website"
                tabIndex={-1}
                autoComplete="off"
                defaultValue=""
              />
            </label>
            <label className="check-field">
              <input name="accepted" type="checkbox" required />
              <span>
                Li os{" "}
                <a href="/termos" target="_blank" rel="noopener noreferrer">
                  termos
                </a>{" "}
                e o{" "}
                <a
                  href="/privacidade"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  aviso de privacidade
                </a>
                . Solicito o plano {selected.name}, com ativação manual.
              </span>
            </label>
            <button className="primary" disabled={busy}>
              {busy ? "Criando seu espaço…" : "Criar minha barbearia"}
            </button>
          </form>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="success-note" role="status">
            {success}
          </p>
        )}
        <a className="inline-link" href="/">
          {success ? "Entrar na minha conta" : "Já tenho uma conta"}
        </a>
      </section>
    </main>
  );
}
