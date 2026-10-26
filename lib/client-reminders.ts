export async function updateManualReminder(
  action: "request" | "opened" | "done" | "reopen",
  appointmentId: string,
  version: number,
  confirmed = false,
) {
  const r = await fetch("/api/reminders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, appointmentId, version, confirmed }),
  });
  const result = await r.json();
  if (!r.ok)
    throw Error(result.error || "Não foi possível atualizar o lembrete.");
  return result;
}
