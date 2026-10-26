type Booking = {
  id: string;
  professional_id: string;
  status: string;
  starts_at: string;
  ends_at: string;
};
export function professionalQueue<T extends Booking>(
  appointments: T[],
  professionalId: string,
  now: Date,
) {
  const rows = appointments
    .filter((a) => a.professional_id === professionalId)
    .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
  const current = rows.find((a) => a.status === "in_progress");
  const expected = !current
    ? rows.find(
        (a) =>
          ["scheduled", "confirmed"].includes(a.status) &&
          +new Date(a.starts_at) <= +now &&
          +new Date(a.ends_at) > +now,
      )
    : undefined;
  const active = current || expected;
  const next = rows
    .filter(
      (a) =>
        a.id !== active?.id &&
        ["scheduled", "confirmed"].includes(a.status) &&
        +new Date(a.starts_at) > +now,
    )
    .slice(0, 3);
  const overdue = rows.filter(
    (a) =>
      ["scheduled", "confirmed"].includes(a.status) &&
      +new Date(a.ends_at) <= +now,
  ).length;
  return { current, expected, active, next, overdue };
}
