"use client";
import { useEffect, useState } from "react";
type State = {
  mode: string;
  commercialReady: boolean;
  checks: { id: string; name: string; ok: boolean }[];
  runs: { kind: string; status: string; started_at: string; detail: string }[];
  physicalDeviceTests: string;
};
export default function OperationsPanel() {
  const [data, setData] = useState<State>();
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/platform/operations", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        setData(d);
      })
      .catch((e) => setError(e.message));
  }, []);
  return (
    <section className="panel">
      <h2>Operação e prontidão</h2>
      <p className="muted">
        Estas verificações conferem configuração e registros operacionais. Não
        substituem teste de entrega de e-mail, revisão das políticas ou ensaio
        em aparelhos físicos.
      </p>
      {data && (
        <>
          <p className="pill">
            {data.mode === "demo"
              ? "Demonstração ativa"
              : data.commercialReady
                ? "Configuração comercial conferida"
                : "Há pendências para operação comercial"}
          </p>
          <div className="readiness-list">
            {data.checks.map((c) => (
              <p key={c.id}>
                <span aria-hidden="true">{c.ok ? "✓" : "○"}</span>
                <strong>{c.ok ? "Conferido" : "Pendente"}</strong> · {c.name}
              </p>
            ))}
          </div>
          <p className="form-note">{data.physicalDeviceTests}</p>
          <details className="billing-history">
            <summary>Histórico de rotinas</summary>
            {data.runs.length ? (
              data.runs.map((r, i) => (
                <p key={i}>
                  {new Date(r.started_at).toLocaleString("pt-BR")} · {r.kind} ·{" "}
                  {r.status} · {r.detail}
                </p>
              ))
            ) : (
              <p>Nenhuma rotina automática registrada.</p>
            )}
          </details>
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
