import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  weekStart,
  calendarRange,
  appointmentDay,
} from "../lib/calendar";
test("semana inicia na segunda e cruza mês e ano", () => {
  assert.equal(weekStart("2026-10-25"), "2026-10-19");
  assert.equal(weekStart("2026-10-26"), "2026-10-26");
  assert.equal(weekStart("2027-01-01"), "2026-12-28");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
});
test("mês usa 42 dias, com fim exclusivo e datas locais", () => {
  const r = calendarRange("2026-10-25", "month");
  assert.equal(r.start, "2026-09-28");
  assert.equal(r.end, "2026-11-09");
  assert.equal(r.days.length, 42);
  assert.equal(appointmentDay("2026-10-26T01:00:00Z"), "2026-10-25");
  assert.equal(calendarRange("2026-10-25", "week").days.length, 7);
});
