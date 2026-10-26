"use client";
import { useEffect, useState } from "react";
import Brand from "./Brand";
import { ThemeControl } from "./ThemeProvider";
export default function VerifyEmailForm() {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    setToken(new URLSearchParams(location.hash.slice(1)).get("token") || "");
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
        <h1>Confirme seu e-mail.</h1>
        <p className="muted">
          Esta confirmação protege o acesso à sua conta. Não cria uma assinatura
          nem realiza cobrança.
        </p>
        {token && !message && (
          <button
            className="primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                const r = await fetch("/api/access", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "verify_email", token }),
                });
                const d = await r.json();
                if (!r.ok) throw Error(d.error);
                setMessage(
                  "E-mail confirmado. Entre com sua senha para continuar.",
                );
                setToken("");
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Confirmando…" : "Confirmar meu e-mail"}
          </button>
        )}
        {!token && !message && (
          <p className="error">
            Abra o link recebido por e-mail ou solicite uma nova confirmação.
          </p>
        )}
        {message && (
          <p className="success-note" role="status">
            {message}
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <nav className="login-links">
          <a href="/">Entrar no painel</a>
          <a href="/recuperar-senha?modo=confirmar">Reenviar confirmação</a>
        </nav>
      </section>
    </main>
  );
}
