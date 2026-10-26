"use client";
import { useEffect, useState } from "react";
import { Scissors, CalendarDays, ArrowRight, Clock, Plus } from "lucide-react";
import type { Data, Appointment } from "./types";
import { money, time, localDay } from "@/lib/domain";
type Cut = Appointment & { completed_at?: string };
export default function CutsPanel({
  data,
  onSelect,
  onWalkIn,
  onBooking,
}: {
  data: Data;
  onSelect: (a: Appointment) => void;
  onWalkIn: () => void;
  onBooking: () => void;
}) {
  const [professional, setProfessional] = useState(
    data.professionalId ||
      data.professionals.find((p) => p.active !== false)?.id ||
      "",
  );
  const [cuts, setCuts] = useState<Cut[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let disposed = false;
    const controller = new AbortController();
    async function load() {
      if (!professional) {
        setLoading(false);
        return;
      }
      try {
        const r = await fetch(
          "/api/cuts?professionalId=" + encodeURIComponent(professional),
          { signal: controller.signal },
        );
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        if (!disposed) {
          setCuts(d.appointments);
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
    void load();
    const timer = setInterval(() => void load(), 30000);
    return () => {
      disposed = true;
      controller.abort();
      clearInterval(timer);
    };
  }, [professional, data.appointments]);
  const current = cuts.find((a) => a.status === "in_progress");
  const upcoming = cuts.filter((a) =>
    ["scheduled", "confirmed"].includes(a.status),
  );
  const today = localDay();
  const done = cuts.filter(
    (a) =>
      a.status === "completed" &&
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
      }).format(new Date(a.completed_at || a.ends_at)) === today,
  );
  const next = upcoming[0];
  const card = (a: Cut, label: string) => (
    <div className="cut-focus-card">
      <span className="eyebrow">{label}</span>
      <h2>{a.customer}</h2>
      <p>
        {a.service_name}
        {a.source === "walk_in" && (
          <small className="walk-in-badge">Avulso</small>
        )}
      </p>
      <div className="cut-time">
        <Clock size={17} />
        {new Date(a.starts_at).toLocaleDateString("pt-BR", {
          timeZone: "America/Sao_Paulo",
          day: "2-digit",
          month: "2-digit",
        })}{" "}
        · {time(a.starts_at)}–{time(a.ends_at)}
      </div>
      <button className="secondary" onClick={() => onSelect(a)}>
        Ver atendimento
        <ArrowRight size={16} />
      </button>
    </div>
  );
  return (
    <div className="cuts-module">
      <div className="cuts-toolbar">
        <div>
          <span className="eyebrow">SEU DIA NA CADEIRA</span>
          <h2>Seus cortes</h2>
          <p>
            {done.length} concluídos hoje · {upcoming.length} próximos
            agendamentos
          </p>
        </div>
        <div className="page-actions">
          <button
            className="secondary"
            onClick={onBooking}
            disabled={data.readOnly}
          >
            <CalendarDays size={17} />
            Agendar
          </button>
          <button
            className="primary"
            onClick={onWalkIn}
            disabled={data.readOnly}
          >
            <Plus size={17} />
            Registrar corte avulso
          </button>
        </div>
      </div>
      {data.role === "owner" && (
        <label className="field cuts-professional">
          Profissional
          <select
            value={professional}
            onChange={(e) => setProfessional(e.target.value)}
          >
            {data.professionals
              .filter((p) => p.active !== false)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </label>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p className="empty">Carregando seus cortes…</p>
      ) : (
        <>
          <div className="cut-focus-grid">
            {current ? (
              card(current, "EM ATENDIMENTO")
            ) : (
              <div className="cut-focus-card quiet">
                <Scissors size={27} />
                <h2>Pronto para o próximo corte.</h2>
                <p>Nenhum atendimento iniciado no momento.</p>
              </div>
            )}
            {next ? (
              card(next, "PRÓXIMO CORTE")
            ) : (
              <div className="cut-focus-card quiet">
                <CalendarDays size={27} />
                <h2>Sua cadeira está livre.</h2>
                <p>
                  Agende um cliente ou registre um corte avulso já realizado.
                </p>
              </div>
            )}
          </div>
          <section className="panel">
            <div className="panel-heading">
              <h2>Próximos agendamentos</h2>
            </div>
            {upcoming.slice(0, 12).map((a) => (
              <button
                className="cut-list-row"
                key={a.id}
                onClick={() => onSelect(a)}
              >
                <span className="cut-list-time">
                  {time(a.starts_at)}
                  <small>
                    {new Date(a.starts_at).toLocaleDateString("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </small>
                </span>
                <span>
                  <strong>{a.customer}</strong>
                  <small>{a.service_name}</small>
                </span>
                <span className={"status " + a.status}>
                  {a.status === "confirmed" ? "Confirmado" : "Agendado"}
                </span>
                <ArrowRight size={17} />
              </button>
            ))}
            {!upcoming.length && (
              <p className="empty">Nenhum agendamento nos próximos 30 dias.</p>
            )}
          </section>
          <section className="panel">
            <div className="panel-heading">
              <h2>Cortes concluídos hoje</h2>
              <span className="pill">{done.length}</span>
            </div>
            {done.map((a) => (
              <button
                key={a.id}
                className="cut-list-row"
                onClick={() => onSelect(a)}
              >
                <Scissors size={18} />
                <span>
                  <strong>{a.customer}</strong>
                  <small>
                    {a.service_name}
                    {a.source === "walk_in" ? " · Avulso" : ""}
                  </small>
                </span>
                <b>{money(a.price)}</b>
                <span className="pill">
                  {a.paid >= a.price ? "Recebido" : "Pendente"}
                </span>
              </button>
            ))}
            {!done.length && (
              <p className="empty">
                Os seus cortes concluídos e avulsos aparecerão aqui.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
