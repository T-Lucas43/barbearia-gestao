"use client";
import { useEffect, useState } from "react";
export default function PrivacyPanel({ demo = false }: { demo?: boolean }) {
  const [policy, setPolicy] = useState<{
    privacy_email: string;
    privacy_retention_days: number;
  }>();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch("/api/privacy")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        setPolicy(d.policy);
      })
      .catch((e) => setError(e.message));
  }, []);
  async function send(body: object, download = false) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch("/api/privacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      if (download) {
        const url = URL.createObjectURL(
          new Blob([JSON.stringify(d, null, 2)], { type: "application/json" }),
        );
        const a = document.createElement("a");
        a.href = url;
        a.download = "dados-cliente.json";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else setNotice(d.message || "Configuração salva.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="privacy-panel">
      <h2>Privacidade dos clientes</h2>
      <p className="muted">
        Confira a identidade e a solicitação do cliente antes de exportar ou
        anonimizar seus registros. Anonimização não apaga os valores do
        atendimento nem substitui a revisão de informações em anotações livres.
      </p>
      {policy && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            send({
              action: "policy",
              email: f.get("email"),
              days: Number(f.get("days")),
            });
          }}
        >
          <label className="field">
            Contato de privacidade da barbearia
            <input
              name="email"
              type="email"
              defaultValue={policy.privacy_email}
              required
            />
          </label>
          <label className="field">
            Prazo de referência para revisão (dias)
            <input
              name="days"
              type="number"
              min="30"
              max="3650"
              defaultValue={policy.privacy_retention_days}
              required
            />
          </label>
          <p className="form-note">
            Este parâmetro orienta a revisão dos registros. Não executa exclusão
            automática nem define prazo legal obrigatório.
          </p>
          <button className="secondary" disabled={demo || busy}>
            Salvar política da barbearia
          </button>
        </form>
      )}
      <hr />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const action = f.get("action");
          send(
            action === "export"
              ? { action, phone: f.get("phone") }
              : {
                  action: "anonymize",
                  phone: f.get("phone"),
                  confirmed: f.get("confirmed") === "on",
                },
            action === "export",
          );
        }}
      >
        <label className="field">
          Telefone do cliente, somente números
          <input
            name="phone"
            inputMode="tel"
            pattern="[0-9]{10,13}"
            minLength={10}
            maxLength={13}
            required
          />
        </label>
        <label className="field">
          Solicitação
          <select name="action">
            <option value="export">Exportar registros do cliente</option>
            <option value="anonymize">Anonimizar identificação</option>
          </select>
        </label>
        <label className="check-field">
          <input name="confirmed" type="checkbox" />
          Conferi a solicitação e autorizo a anonimização, se selecionada. Esta
          ação não pode ser desfeita pelo sistema.
        </label>
        <button className="secondary" disabled={demo || busy}>
          Atender solicitação
        </button>
      </form>
      {demo && (
        <p className="form-note">
          Operações indisponíveis na demonstração compartilhada.
        </p>
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
