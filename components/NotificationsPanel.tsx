"use client";
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import type { Data } from "./types";
import ManualRemindersPanel from "./ManualRemindersPanel";
const states: Record<string, string> = {
  pending: "Na fila",
  retry: "Nova tentativa programada",
  processing: "Processando",
  simulated: "Simulado",
  cancelled: "Cancelado",
  sent: "Aceito pelo provedor",
  delivered: "Entregue",
  read: "Lido",
  failed: "Falhou",
  unknown: "Exige conciliação",
};
const kinds: Record<string, string> = {
  confirmation: "Confirmação",
  reminder: "Lembrete",
  reschedule: "Reagendamento",
  cancellation: "Cancelamento",
};
export default function NotificationsPanel({
  data,
  onChanged,
  readOnly = false,
}: {
  data: Data;
  onChanged: () => Promise<void>;
  readOnly?: boolean;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <ManualRemindersPanel data={data} />
      <details className="automatic-notifications">
        <summary>
          Histórico da integração automática{" "}
          {data.whatsappEnabled ? "" : "(simulado)"}
        </summary>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Mensagens de WhatsApp</h2>
              <p>
                {data.whatsappEnabled
                  ? "Envio real habilitado no servidor. Consulte os estados de entrega."
                  : "Modo simulado: nenhuma mensagem real será enviada."}
              </p>
            </div>
            <span className="pill">
              {data.whatsappEnabled ? "WhatsApp Business" : "Modo simulado"}
            </span>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {data.notifications.map((n) => (
            <div className="notification-entry" key={n.id}>
              <div className="ledger-row">
                <span className="ledger-icon">
                  <MessageCircle size={18} />
                </span>
                <span>
                  <strong>{n.customer}</strong>
                  <small>
                    {kinds[n.kind] || n.kind} ·{" "}
                    {new Date(n.due_at).toLocaleString("pt-BR")}
                  </small>
                  {n.last_error && <small>{n.last_error}</small>}
                </span>
                <span className="pill">{states[n.status] || n.status}</span>
              </div>
              {data.role === "owner" &&
                ["unknown", "failed"].includes(n.status) && (
                  <form
                    className="reconciliation-form"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setBusy(true);
                      setError("");
                      const f = new FormData(e.currentTarget);
                      try {
                        const r = await fetch("/api/data", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            action: "notification_reconcile",
                            id: n.id,
                            resolution: f.get("resolution"),
                            verified: f.get("verified") === "on",
                            providerId: f.get("providerId") || undefined,
                            idempotencyKey: crypto.randomUUID(),
                          }),
                        });
                        const d = await r.json();
                        if (!r.ok) throw Error(d.error);
                        await onChanged();
                      } catch (e) {
                        setError((e as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <p className="form-note">
                      Verifique o histórico no provedor antes de liberar um novo
                      envio, evitando mensagens duplicadas.
                    </p>
                    <div className="form-grid">
                      <label className="field">
                        Resultado confirmado
                        <select name="resolution">
                          <option value="not_sent">
                            Não enviada — liberar nova tentativa
                          </option>
                          <option value="sent">
                            Enviada — registrar identificador
                          </option>
                        </select>
                      </label>
                      <label className="field">
                        Identificador do provedor (se enviada)
                        <input name="providerId" />
                      </label>
                    </div>
                    <label className="check-field">
                      <input type="checkbox" name="verified" required />
                      Conferi o resultado no provedor.
                    </label>
                    <button className="secondary" disabled={busy || readOnly}>
                      Salvar conciliação
                    </button>
                  </form>
                )}
            </div>
          ))}
          {!data.notifications.length && (
            <div className="empty">
              <MessageCircle size={30} />
              <h3>As mensagens dos seus agendamentos aparecem aqui.</h3>
            </div>
          )}
        </section>
      </details>
    </>
  );
}
