"use client";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  RefreshCw,
} from "lucide-react";
import type { Appointment, Professional } from "./types";
import {
  calendarRange,
  appointmentDay,
  addDays,
  type CalendarView,
} from "@/lib/calendar";
import { localDay, time, money } from "@/lib/domain";
const views = [
  { id: "list", name: "Lista", icon: List },
  { id: "day", name: "Dia", icon: CalendarDays },
  { id: "week", name: "Semana", icon: CalendarRange },
  { id: "month", name: "Mês", icon: LayoutGrid },
] as const;
const status: Record<string, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  in_progress: "Em atendimento",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
};
export default function Calendar({
  day,
  professionals,
  professional,
  query,
  onSelect,
  onDay,
  revision,
}: {
  day: string;
  professionals: Professional[];
  professional: string;
  query: string;
  onSelect: (a: Appointment) => void;
  onDay: (day: string) => void;
  revision: Appointment[];
}) {
  const [view, setView] = useState<CalendarView>("day");
  const [rows, setRows] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const range = useMemo(() => calendarRange(day, view), [day, view]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(`/api/agenda?start=${range.start}&end=${range.end}`, {
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw Error("Não foi possível carregar a agenda.");
        return r.json();
      })
      .then((d) => setRows(d.appointments))
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [range.start, range.end, revision, retry]);
  const filtered = rows.filter(
    (a) =>
      (professional === "all" || a.professional_id === professional) &&
      `${a.customer} ${a.service_name}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const pros = professionals.filter(
    (p) => professional === "all" || p.id === professional,
  );
  const forDay = (value: string) =>
    filtered.filter((a) => appointmentDay(a.starts_at) === value);
  const card = (a: Appointment, compact = false) => (
    <button
      key={a.id}
      className={`calendar-appointment ${compact ? "compact" : ""} ${a.status}`}
      style={{ borderLeftColor: a.color }}
      onClick={() => onSelect(a)}
    >
      <span className="calendar-card-time">
        {time(a.starts_at)}–{time(a.ends_at)}
      </span>
      <strong>{a.customer}</strong>
      <span>{a.service_name}{a.source === "walk_in" && <small className="walk-in-badge">Avulso</small>}</span>
      <small>
        {a.professional_name} · {money(a.price)}
      </small>
      <span className={`status ${a.status}`}>{status[a.status]}</span>
    </button>
  );
  return (
    <div className="calendar-area">
      <div className="calendar-controls">
        <div
          className="view-switch"
          role="group"
          aria-label="Visualização da agenda"
        >
          {views.map((v) => (
            <button
              key={v.id}
              aria-pressed={view === v.id}
              className={view === v.id ? "selected" : ""}
              onClick={() => setView(v.id)}
            >
              <v.icon size={15} />
              {v.name}
            </button>
          ))}
        </div>
        <div className="period-navigation">
          {(view === "week" || view === "month") && (
            <button
              className="icon-button"
              aria-label={view === "week" ? "Semana anterior" : "Mês anterior"}
              onClick={() => {
                if (view === "week") onDay(addDays(day, -7));
                else {
                  const d = new Date(day.slice(0, 7) + "-01T12:00Z");
                  d.setUTCMonth(d.getUTCMonth() - 1);
                  onDay(d.toISOString().slice(0, 10));
                }
              }}
            >
              <ChevronLeft size={17} />
            </button>
          )}
          <span className="calendar-range">
            {range.start.split("-").reverse().join("/")}{" "}
            {range.days.length > 1 &&
              `— ${range.days.at(-1)!.split("-").reverse().join("/")}`}
          </span>
          {(view === "week" || view === "month") && (
            <button
              className="icon-button"
              aria-label={view === "week" ? "Próxima semana" : "Próximo mês"}
              onClick={() => {
                if (view === "week") onDay(addDays(day, 7));
                else {
                  const d = new Date(day.slice(0, 7) + "-01T12:00Z");
                  d.setUTCMonth(d.getUTCMonth() + 1);
                  onDay(d.toISOString().slice(0, 10));
                }
              }}
            >
              <ChevronRight size={17} />
            </button>
          )}
        </div>
      </div>
      {loading ? (
        <div className="empty" role="status">
          Carregando agenda…
        </div>
      ) : error ? (
        <div className="empty" role="alert">
          <p>{error}</p>
          <button className="secondary" onClick={() => setRetry(retry + 1)}>
            <RefreshCw size={16} />
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          {view === "list" && (
            <div className="calendar-list">
              {filtered.length ? (
                filtered.map((a) => card(a))
              ) : (
                <p className="empty">Nenhum atendimento nesta data.</p>
              )}
            </div>
          )}
          {view === "day" && (
            <>
              <p className="calendar-help">
                Horários por profissional · toque em um atendimento para abrir
                os detalhes.
              </p>
              <div
                className="timeline-scroll"
                tabIndex={0}
                role="region"
                aria-label="Agenda diária por profissional"
              >
                <div
                  className="timeline"
                  style={{
                    gridTemplateColumns: `48px repeat(${pros.length}, minmax(170px, 1fr))`,
                  }}
                >
                  <div className="timeline-label">Hora</div>
                  {pros.map((p) => (
                    <div className="timeline-name" key={p.id}>
                      <i style={{ background: p.color }} />
                      {p.name}
                    </div>
                  ))}
                  <div className="timeline-hours">
                    {Array.from({ length: 10 }, (_, i) => (
                      <span key={i} style={{ top: i * 90 }}>
                        {String(i + 9).padStart(2, "0")}:00
                      </span>
                    ))}
                  </div>
                  {pros.map((p) => (
                    <div className="timeline-lane" key={p.id}>
                      {forDay(day)
                        .filter(
                          (a) =>
                            a.professional_id === p.id &&
                            !["cancelled", "no_show"].includes(a.status),
                        )
                        .map((a) => {
                          const start =
                            Number(time(a.starts_at).slice(0, 2)) * 60 +
                            Number(time(a.starts_at).slice(3));
                          const duration =
                            (+new Date(a.ends_at) - +new Date(a.starts_at)) /
                            60000;
                          return (
                            <div
                              key={a.id}
                              className={`timeline-event ${["cancelled", "no_show"].includes(a.status) ? "inactive" : ""}`}
                              style={{
                                top: (start - 540) * 1.5,
                                height: Math.max(duration * 1.5 - 3, 24),
                              }}
                            >
                              {card(a, true)}
                            </div>
                          );
                        })}
                    </div>
                  ))}
                </div>
              </div>
              <div className="calendar-legend">
                <span>09h–18h · fuso de São Paulo</span>
                <span>Deslize para ver todos os profissionais</span>
              </div>
              {forDay(day).some((a) =>
                ["cancelled", "no_show"].includes(a.status),
              ) && (
                <div className="month-details">
                  <h3>Cancelamentos e faltas</h3>
                  <div className="calendar-list">
                    {forDay(day)
                      .filter((a) =>
                        ["cancelled", "no_show"].includes(a.status),
                      )
                      .map((a) => card(a))}
                  </div>
                </div>
              )}
            </>
          )}
          {view === "week" && (
            <>
              <p className="calendar-help">
                Semana de segunda a domingo · deslize para ver os dias.
              </p>
              <div
                className="week-scroll"
                tabIndex={0}
                role="region"
                aria-label="Agenda semanal"
              >
                <div className="week-board">
                  {range.days.map((value) => (
                    <section
                      className={`week-day ${value === localDay() ? "is-today" : ""}`}
                      key={value}
                    >
                      <button
                        className="week-heading"
                        onClick={() => {
                          onDay(value);
                          setView("day");
                        }}
                      >
                        <small>
                          {new Date(value + "T12:00Z").toLocaleDateString(
                            "pt-BR",
                            { weekday: "short", timeZone: "UTC" },
                          )}
                        </small>
                        <strong>{value.slice(8)}</strong>
                        <span>{forDay(value).length} atendimento(s)</span>
                      </button>
                      <div className="week-events">
                        {forDay(value).map((a) => card(a))}
                        {!forDay(value).length && (
                          <p className="calendar-day-empty">Sem agendamentos</p>
                        )}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            </>
          )}
          {view === "month" && (
            <>
              <div className="month-weekdays">
                {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className="month-grid">
                {range.days.map((value) => (
                  <button
                    key={value}
                    aria-label={`${value.split("-").reverse().join("/")}, ${forDay(value).length} atendimentos`}
                    aria-pressed={day === value}
                    className={`month-day ${value.slice(0, 7) !== day.slice(0, 7) ? "outside" : ""} ${value === localDay() ? "today" : ""} ${day === value ? "selected" : ""}`}
                    onClick={() => onDay(value)}
                  >
                    <b>{Number(value.slice(8))}</b>
                    <span className="month-dots">
                      {forDay(value)
                        .slice(0, 3)
                        .map((a) => (
                          <i key={a.id} style={{ background: a.color }} />
                        ))}
                    </span>
                    <small>{forDay(value).length || "—"}</small>
                  </button>
                ))}
              </div>
              <div className="month-details">
                <h3>
                  {day.split("-").reverse().join("/")} · {forDay(day).length}{" "}
                  atendimento(s)
                </h3>
                <div className="calendar-list">
                  {forDay(day).map((a) => card(a))}
                  {!forDay(day).length && (
                    <p className="empty">
                      Sem agendamentos no dia selecionado.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
