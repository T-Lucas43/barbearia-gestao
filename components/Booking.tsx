"use client";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Scissors,
  MapPin,
  Clock,
  CalendarDays,
} from "lucide-react";
import { money, localDay, time } from "@/lib/domain";
import type { Professional, Service } from "./types";
export default function Booking({
  internal = false,
  onDone,
}: {
  internal?: boolean;
  onDone?: () => void;
}) {
  const [data, setData] = useState<{
    professionals: Professional[];
    services: Service[];
    busy: { professional_id: string; starts_at: string; ends_at: string }[];
  }>();
  const [service, setService] = useState("");
  const [professional, setProfessional] = useState("");
  const [date, setDate] = useState(localDay());
  const [hour, setHour] = useState("");
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    fetch(`/api/public?date=${date}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError("Não foi possível carregar os horários."));
    setHour("");
  }, [date]);
  const selected = data?.services.find((s) => s.id === service);
  const pro = data?.professionals.find((p) => p.id === professional);
  const slots = Array.from(
    { length: 36 },
    (_, i) =>
      `${String(9 + Math.floor(i / 4)).padStart(2, "0")}:${String((i % 4) * 15).padStart(2, "0")}`,
  ).filter((h) => {
    const start = +new Date(`${date}T${h}:00-03:00`);
    const end = start + (selected?.duration || 45) * 60000;
    return (
      (internal || start > Date.now()) &&
      end <= +new Date(`${date}T18:00:00-03:00`) &&
      !data?.busy.some(
        (b) =>
          b.professional_id === professional &&
          start < +new Date(b.ends_at) &&
          end > +new Date(b.starts_at),
      )
    );
  });
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const f = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "book",
          serviceId: service,
          professionalId: professional,
          date,
          hour,
          customer: f.get("customer"),
          phone: String(f.get("phone")).replace(/\D/g, ""),
          consent: f.get("consent") === "on",
        }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      setDone(true);
      if (internal) onDone?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className={internal ? "booking embedded" : "booking"}>
      {!internal && (
        <header className="booking-header">
          <a className="brand" href="/">
            <span className="brand-icon">
              <Scissors size={22} />
            </span>
            navalha<span className="brand-dot">.</span>
          </a>
          <span className="pill">Agendamento online</span>
        </header>
      )}
      <main className="booking-layout">
        <aside className="shop-card">
          <span className="eyebrow light">SEU PRÓXIMO MOMENTO DE CUIDADO</span>
          <div className="shop-symbol">
            <Scissors size={60} strokeWidth={1} />
          </div>
          <h1>
            Studio da <br />
            Navalha<span>.</span>
          </h1>
          <p>
            Mais que um corte.
            <br />
            Seu estilo, em boas mãos.
          </p>
          <div className="shop-meta">
            <span>
              <MapPin size={16} />
              Barbearia de demonstração
            </span>
            <span>
              <Clock size={16} />
              Todos os dias · 09h às 18h
            </span>
          </div>
          <small>Ambiente local · dados fictícios</small>
        </aside>
        <section className="booking-content">
          {done ? (
            <div className="success">
              <span className="success-icon">
                <Check size={32} />
              </span>
              <span className="eyebrow">TUDO CERTO</span>
              <h2>Seu horário está reservado!</h2>
              <p>
                {selected?.name} com {pro?.name}
              </p>
              <strong>
                {new Date(`${date}T12:00`).toLocaleDateString("pt-BR")} às{" "}
                {hour}
              </strong>
              <p>
                A confirmação aparece na agenda da barbearia. Os lembretes de
                WhatsApp estão em modo simulado nesta versão.
              </p>
              <button
                className="primary"
                onClick={() => {
                  setDone(false);
                  setStep(0);
                  setHour("");
                }}
              >
                Fazer outro agendamento
              </button>
            </div>
          ) : (
            <>
              <div className="steps">
                {["Serviço", "Profissional", "Horário", "Seus dados"].map(
                  (s, i) => (
                    <span key={s} className={step >= i ? "active" : ""}>
                      <b>{i + 1}</b>
                      <small>{s}</small>
                    </span>
                  ),
                )}
              </div>
              <span className="eyebrow">PASSO {step + 1} DE 4</span>
              <h2>
                {
                  [
                    "Como podemos cuidar de você?",
                    "Escolha seu profissional",
                    "Qual o melhor momento?",
                    "Só falta confirmar",
                  ][step]
                }
              </h2>
              <p className="muted">
                {
                  [
                    "Selecione o serviço para continuar.",
                    "Gente que entende do seu estilo.",
                    "Os horários abaixo estão disponíveis.",
                    "Confira seu agendamento e preencha seus dados.",
                  ][step]
                }
              </p>
              {!data && <p>Carregando serviços…</p>}
              {step === 0 && (
                <div className="choice-list">
                  {data?.services.map((s) => (
                    <button
                      key={s.id}
                      className={`choice ${service === s.id ? "selected" : ""}`}
                      onClick={() => setService(s.id)}
                    >
                      <span className="choice-icon">
                        <Scissors size={22} />
                      </span>
                      <span>
                        <strong>{s.name}</strong>
                        <small>{s.description}</small>
                        <small>
                          <Clock size={12} />
                          {s.duration} min
                        </small>
                      </span>
                      <b>{money(s.price)}</b>
                      <span className="radio">
                        {service === s.id && <Check size={12} />}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {step === 1 && (
                <div className="choice-list">
                  {data?.professionals.map((p) => (
                    <button
                      key={p.id}
                      className={`choice ${professional === p.id ? "selected" : ""}`}
                      onClick={() => setProfessional(p.id)}
                    >
                      <span className="avatar" style={{ background: p.color }}>
                        {p.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                      <span>
                        <strong>{p.name}</strong>
                        <small>{p.specialty}</small>
                      </span>
                      <span className="radio">
                        {professional === p.id && <Check size={12} />}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {step === 2 && (
                <>
                  <div className="chips">
                    <button type="button" onClick={() => setDate(localDay())}>
                      Hoje
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 1);
                        setDate(
                          new Intl.DateTimeFormat("en-CA", {
                            timeZone: "America/Sao_Paulo",
                          }).format(d),
                        );
                      }}
                    >
                      Amanhã
                    </button>
                  </div>
                  <label className="field">
                    Data do atendimento
                    <input
                      type="date"
                      value={date}
                      min={localDay()}
                      max={new Date(Date.now() + 59 * 86400000)
                        .toISOString()
                        .slice(0, 10)}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </label>
                  <div className="slots">
                    {slots.map((h) => (
                      <button
                        className={hour === h ? "selected" : ""}
                        key={h}
                        onClick={() => setHour(h)}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                  {!slots.length && (
                    <p className="empty">
                      Sem horários nesta data. Escolha outro dia.
                    </p>
                  )}
                </>
              )}
              {step === 3 && (
                <form onSubmit={submit}>
                  <div className="booking-summary">
                    <CalendarDays size={24} />
                    <div>
                      <strong>
                        {selected?.name} · {money(selected?.price || 0)}
                      </strong>
                      <p>
                        {pro?.name} · {date.split("-").reverse().join("/")} às{" "}
                        {hour}
                      </p>
                    </div>
                  </div>
                  <label className="field">
                    Seu nome
                    <input
                      name="customer"
                      required
                      minLength={2}
                      maxLength={100}
                      placeholder="Como podemos chamar você?"
                      autoComplete="name"
                    />
                  </label>
                  <label className="field">
                    WhatsApp com DDD
                    <input
                      name="phone"
                      required
                      pattern="[0-9() +\-]{10,20}"
                      maxLength={20}
                      placeholder="(11) 99999-9999"
                      type="tel"
                      autoComplete="tel"
                    />
                  </label>
                  <label className="consent">
                    <input type="checkbox" name="consent" />
                    Aceito receber confirmações e lembretes deste agendamento
                    pelo WhatsApp.
                  </label>
                  <small className="muted">
                    Usamos seus dados para organizar o atendimento. Nesta
                    demonstração, nenhuma mensagem real será enviada.
                  </small>
                  <button className="primary wide" disabled={loading}>
                    {loading ? "Reservando…" : "Confirmar agendamento"}
                    <Check size={18} />
                  </button>
                </form>
              )}
              {error && (
                <p role="alert" className="error">
                  {error}
                </p>
              )}
              <div className="booking-actions">
                {step > 0 ? (
                  <button
                    className="text-button"
                    onClick={() => setStep(step - 1)}
                  >
                    <ArrowLeft size={16} />
                    Voltar
                  </button>
                ) : (
                  <span />
                )}
                {step < 3 && (
                  <button
                    className="primary"
                    disabled={
                      step === 0 ? !service : step === 1 ? !professional : !hour
                    }
                    onClick={() => setStep(step + 1)}
                  >
                    Continuar
                    <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      </main>
      {!internal && (
        <footer className="booking-footer">
          Agendamento simples. Cuidado de verdade.{" "}
          <span>feito com navalha.</span>
        </footer>
      )}
    </div>
  );
}
