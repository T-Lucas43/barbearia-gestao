export type CalendarView = "list" | "day" | "week" | "month";
export function addDays(day: string, amount: number) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
export function weekStart(day: string) {
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  return addDays(day, -(weekday + 6) % 7);
}
export function calendarRange(day: string, view: CalendarView) {
  const start =
    view === "month"
      ? weekStart(day.slice(0, 8) + "01")
      : view === "week"
        ? weekStart(day)
        : day;
  const count = view === "month" ? 42 : view === "week" ? 7 : 1;
  return {
    start,
    end: addDays(start, count),
    days: Array.from({ length: count }, (_, i) => addDays(start, i)),
  };
}
export function appointmentDay(instant: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date(instant));
}
