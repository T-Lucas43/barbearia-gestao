"use client";
import { useEffect, useState } from "react";
import Brand from "./Brand";
import { ThemeControl } from "./ThemeProvider";
export default function RecoveryForm() {
  const [token, setToken] = useState("");
  const [verification, setVerification] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    setVerification(p.get("modo") === "confirmar");
    setToken(
      new URLSearchParams(location.hash.slice(1)).get("token") ||
        p.get("token") ||
        "",
    );
    if (p.has("token") || location.hash)
      history.replaceState(null, "", location.pathname);
  }, []);
  return (
    <main className="access-page">
      <header className="booking-header">
        <a href="/">
          <Brand />
        </a>
        <ThemeControl />
      </header>
      <section className="panel access-card">
        <span className="eyebrow">SEU ACESSO</span>
        <h1>
          {token
            ? "Crie uma nova senha"
            : verification
              ? "Reenviar confirmação"
              : "Recuperar minha conta"}
        </h1>
        <p className="muted">
          {token
            ? "Use pelo menos dez caracteres. As sessões anteriores serão encerradas."
            : "Informe o e-mail da sua conta para receber as instruções."}
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const f = new FormData(e.currentTarget);
            if (token && f.get("password") !== f.get("confirm")) {
              setError("As senhas não coincidem.");
              setBusy(false);
              return;
            }
            try {
              const r = await fetch("/api/access", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(
                  token
                    ? { action: "reset", token, password: f.get("password") }
                    : {
                        action: verification
                          ? "resend_verification"
                          : "request",
                        email: f.get("email"),
                      },
                ),
              });
              const d = await r.json();
              if (!r.ok)
                throw Error(
                  d.message || d.error || "Não foi possível concluir.",
                );
              setMessage(
                token
                  ? "Senha atualizada. Entre novamente para continuar."
                  : d.message,
              );
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {!message &&
            (token ? (
              <>
                <label className="field">
                  Nova senha
                  <input
                    name="password"
                    type="password"
                    minLength={10}
                    maxLength={128}
                    autoComplete="new-password"
                    required
                  />
                </label>
                <label className="field">
                  Confirme a senha
                  <input
                    name="confirm"
                    type="password"
                    minLength={10}
                    maxLength={128}
                    autoComplete="new-password"
                    required
                  />
                </label>
              </>
            ) : (
              <label className="field">
                E-mail da conta
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </label>
            ))}
          {!message && (
            <button className="primary" disabled={busy}>
              {busy
                ? "Aguarde…"
                : token
                  ? "Atualizar senha"
                  : "Enviar instruções"}
            </button>
          )}
        </form>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="success-note" role="status">
            {message}
          </p>
        )}
        <nav className="login-links">
          <a href="/">Voltar para entrar</a>
          <a href="/recuperar-senha?modo=confirmar">Reenviar confirmação</a>
        </nav>
      </section>
    </main>
  );
}
