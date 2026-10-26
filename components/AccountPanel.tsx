"use client";
import { useState } from "react";
export default function AccountPanel({
  name,
  readOnly = false,
}: {
  name: string;
  readOnly?: boolean;
}) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  if (readOnly)
    return (
      <section className="panel account-panel">
        <h2>Minha conta</h2>
        <p className="muted">
          As credenciais das contas de demonstração são fixas. Use os botões da
          tela de entrada para alternar entre gestor e profissional.
        </p>
      </section>
    );
  return (
    <section className="panel account-panel">
      <h2>Minha conta</h2>
      <p className="muted">
        Olá, {name}. Altere sua senha individual. Os outros aparelhos serão
        desconectados.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (readOnly) {
            setError("A conta de demonstração permite somente consulta.");
            return;
          }
          setError("");
          setSuccess(false);
          const f = new FormData(e.currentTarget);
          if (f.get("new") !== f.get("confirm")) {
            setError("As novas senhas não coincidem.");
            return;
          }
          setBusy(true);
          try {
            const r = await fetch("/api/auth/change-password", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                currentPassword: f.get("current"),
                newPassword: f.get("new"),
                revokeOtherSessions: true,
              }),
            });
            const d = await r.json();
            if (!r.ok)
              throw Error(
                d.message || d.error || "Não foi possível alterar a senha.",
              );
            setSuccess(true);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          Senha atual
          <input
            name="current"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        <label className="field">
          Nova senha
          <input
            name="new"
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
          />
        </label>
        <label className="field">
          Confirme a nova senha
          <input
            name="confirm"
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
          />
        </label>
        <button className="primary" disabled={busy || readOnly}>
          {busy ? "Salvando…" : "Alterar minha senha"}
        </button>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="success-note" role="status">
          Senha atualizada com sucesso.
        </p>
      )}
    </section>
  );
}
