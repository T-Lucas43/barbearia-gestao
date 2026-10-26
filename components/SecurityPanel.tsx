"use client";
import { useEffect, useState } from "react";
type Info = {
  enabled: boolean;
  sessions: {
    id: string;
    createdAt: string;
    expiresAt: string;
    userAgent: string | null;
    current: boolean;
  }[];
};
export default function SecurityPanel() {
  const [data, setData] = useState<Info>();
  const [setup, setSetup] = useState<{
    totpURI: string;
    backupCodes: string[];
  }>();
  const [codes, setCodes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const load = async () => {
    const r = await fetch("/api/account/security", { cache: "no-store" });
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    setData(d);
  };
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  async function call(path: string, body: object) {
    const r = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok)
      throw Error(d.message || d.error || "Não foi possível concluir.");
    return d;
  }
  return (
    <section className="account-security">
      <h3>Segundo fator de autenticação</h3>
      <p className="muted">
        Use um aplicativo autenticador para proteger sua conta. Guarde os
        códigos de recuperação fora deste dispositivo.
      </p>
      {data && (
        <p className="pill">
          {data.enabled ? "Segundo fator ativo" : "Ainda não ativado"}
        </p>
      )}
      {!setup && data && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            setNotice("");
            const f = new FormData(e.currentTarget);
            try {
              if (data.enabled) {
                await call("/api/auth/two-factor/disable", {
                  password: f.get("password"),
                });
                setNotice("Segundo fator desativado.");
                await load();
              } else {
                const d = await call("/api/auth/two-factor/enable", {
                  password: f.get("password"),
                });
                setSetup({
                  totpURI: d.totpURI,
                  backupCodes: d.backupCodes || [],
                });
              }
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="field">
            Confirme sua senha
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
            />
          </label>
          {data.enabled && (
            <label className="check-field">
              <input type="checkbox" required />
              Quero desativar a proteção por segundo fator.
            </label>
          )}
          <button className="secondary" disabled={busy}>
            {data.enabled
              ? "Desativar segundo fator"
              : "Configurar autenticador"}
          </button>
        </form>
      )}
      {setup && (
        <div className="two-factor-enrollment">
          <p>
            Adicione uma conta no seu autenticador com esta chave. A proteção só
            fica ativa depois de conferir o código.
          </p>
          <label className="field">
            Chave do autenticador
            <input
              readOnly
              value={new URL(setup.totpURI).searchParams.get("secret") || ""}
              autoComplete="off"
              onFocus={(e) => e.currentTarget.select()}
            />
          </label>
          <a className="inline-link" href={setup.totpURI}>
            Abrir no aplicativo autenticador
          </a>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              const f = new FormData(e.currentTarget);
              try {
                await call("/api/auth/two-factor/verify-totp", {
                  code: String(f.get("code")).trim(),
                  trustDevice: false,
                });
                await call("/api/auth/revoke-other-sessions", {});
                setCodes(setup.backupCodes);
                setSetup(undefined);
                setNotice(
                  "Segundo fator ativado. Guarde os códigos de recuperação abaixo.",
                );
                await load();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="field">
              Código de seis dígitos
              <input
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
              />
            </label>
            <button className="primary" disabled={busy}>
              Confirmar ativação
            </button>
          </form>
        </div>
      )}
      {!!codes.length && (
        <div className="backup-codes">
          <strong>Códigos de recuperação</strong>
          <p className="muted">
            Cada código pode ser usado uma vez. Esta tela não os guarda após
            sair.
          </p>
          <textarea
            readOnly
            aria-label="Códigos de recuperação"
            value={codes.join("\n")}
          />
          <button
            className="secondary"
            onClick={() => {
              const url = URL.createObjectURL(
                new Blob(
                  [
                    "Elares Barber — códigos de recuperação\n\n" +
                      codes.join("\n"),
                  ],
                  { type: "text/plain;charset=utf-8" },
                ),
              );
              const a = document.createElement("a");
              a.href = url;
              a.download = "elares-barber-recuperacao.txt";
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
          >
            Baixar meus códigos
          </button>
          <button className="text-button" onClick={() => setCodes([])}>
            Já guardei, ocultar códigos
          </button>
        </div>
      )}
      {data && (
        <details className="billing-history">
          <summary>Aparelhos e sessões conectadas</summary>
          {data.sessions.map((s) => (
            <div className="session-row" key={s.id}>
              <span>
                <strong>{s.current ? "Este acesso" : "Outro acesso"}</strong>
                <small>
                  {s.userAgent?.slice(0, 160) || "Dispositivo não identificado"}{" "}
                  · {new Date(s.createdAt).toLocaleString("pt-BR")}
                </small>
              </span>
              {!s.current && (
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setError("");
                    try {
                      await call("/api/account/security", { id: s.id });
                      await load();
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Encerrar acesso
                </button>
              )}
            </div>
          ))}
        </details>
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
