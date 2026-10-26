"use client";
import { useEffect, useState } from "react";
import { Bell, MessageCircle, ExternalLink, RefreshCw } from "lucide-react";
import {
  reminderMessage,
  whatsappLink,
  type ManualReminder,
} from "@/lib/manual-whatsapp";
import type { Data } from "./types";

export default function ManualRemindersPanel({ data }: { data: Data }) {
  const [period, setPeriod] = useState("week");
  const [professional, setProfessional] = useState("");
  const [rows, setRows] = useState<ManualReminder[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    async function load() {
      try {
        const r = await fetch(
          `/api/reminders?period=${period}&professionalId=${encodeURIComponent(professional)}`,
          { signal: controller.signal },
        );
        const result = await r.json();
        if (!r.ok) throw Error(result.error);
        if (!disposed) {
          setRows(result.appointments);
          setError("");
        }
      } catch (e) {
        if (!disposed && (e as Error).name !== "AbortError")
          setError((e as Error).message);
      } finally {
        if (!disposed) setLoading(false);
      }
    }
    setLoading(true);
    setRows([]);
    void load();
    const timer = setInterval(() => void load(), 30000);
    return () => {
      disposed = true;
      controller.abort();
      clearInterval(timer);
    };
  }, [period, professional, refresh]);
  const due = rows.filter(
    (a) => a.due && a.consent && whatsappLink(a.phone, "Lembrete"),
  ).length;
  return (
    <section className="panel manual-reminders">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">ENVIO MANUAL</span>
          <h2>Lembretes dos atendimentos</h2>
          <p>
            Abra a conversa com a mensagem pronta. Revise e toque em enviar no
            seu WhatsApp.
          </p>
        </div>
        <span className="pill">
          <Bell size={14} /> {due} para lembrar agora
        </span>
      </div>
      <p className="form-note manual-reminder-note">
        Não precisa de integração. O WhatsApp precisa estar instalado ou
        conectado no dispositivo. Abrir a conversa não confirma envio ou
        entrega.
      </p>
      {data.isDemo && (
        <p className="demo-banner">
          Demonstração: para testar o atalho, crie um agendamento usando seu
          próprio número e marque a autorização de WhatsApp. Os telefones de
          exemplo são fictícios.
        </p>
      )}
      <div className="manual-reminder-filters">
        <label className="field">
          Período
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="today">Hoje</option>
            <option value="tomorrow">Amanhã</option>
            <option value="week">Próximos 7 dias</option>
          </select>
        </label>
        {data.role !== "barber" && (
          <label className="field">
            Profissional
            <select
              value={professional}
              onChange={(e) => setProfessional(e.target.value)}
            >
              <option value="">Todos os profissionais</option>
              {data.professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          className="secondary"
          disabled={loading}
          onClick={() => setRefresh((n) => n + 1)}
        >
          <RefreshCw size={16} /> Atualizar
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p className="empty">Carregando lembretes…</p>
      ) : (
        <>
          <div className="manual-reminder-list">
            {rows.map((a) => {
              // A reschedule generates a new draft; an old date is never reused.
              const key = a.id + ":" + a.starts_at;
              const message =
                drafts[key] ?? reminderMessage(a, data.tenant.name);
              const href = a.consent ? whatsappLink(a.phone, message) : null;
              return (
                <article className="manual-reminder-card" key={key}>
                  <div className="manual-reminder-heading">
                    <div>
                      <strong>{a.customer}</strong>
                      <span>
                        {a.service_name} · {a.professional_name}
                      </span>
                    </div>
                    <span className={"pill" + (a.due ? " reminder-due" : "")}>
                      {a.due ? "Lembrar agora" : "Próximo atendimento"}
                    </span>
                  </div>
                  <p className="manual-reminder-date">
                    {new Intl.DateTimeFormat("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                      weekday: "short",
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(a.starts_at))}
                    <span>{a.phone || "Sem telefone"}</span>
                  </p>
                  <details>
                    <summary>Ver ou editar mensagem</summary>
                    <label className="field">
                      Mensagem para {a.customer}
                      <textarea
                        value={message}
                        maxLength={2000}
                        rows={6}
                        onChange={(e) =>
                          setDrafts((d) => ({ ...d, [key]: e.target.value }))
                        }
                      />
                    </label>
                  </details>
                  <div className="manual-reminder-actions">
                    {href ? (
                      <a
                        className="primary"
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        referrerPolicy="no-referrer"
                      >
                        <MessageCircle size={17} /> Abrir WhatsApp{" "}
                        <ExternalLink size={14} />
                      </a>
                    ) : (
                      <p className="form-note">
                        {!a.consent
                          ? "Cliente não autorizou lembretes pelo WhatsApp."
                          : !message.trim()
                            ? "Preencha a mensagem para abrir a conversa."
                            : "Confira o telefone brasileiro com DDD no agendamento."}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          {!rows.length && !error && (
            <div className="empty">
              <MessageCircle size={28} />
              <h3>Nenhum agendamento futuro neste período.</h3>
              <p>
                Os próximos atendimentos aparecem aqui, respeitando os horários
                e a autorização do cliente.
              </p>
            </div>
          )}
          {!!rows.length && (
            <p className="form-note">
              Atualização a cada 30 segundos enquanto esta tela estiver aberta.
              Atendimentos cancelados, concluídos e cortes avulsos não entram
              nos lembretes. Exibimos até 200 agendamentos por período.
            </p>
          )}
        </>
      )}
    </section>
  );
}
