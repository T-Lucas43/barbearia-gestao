import { test } from "node:test";
import assert from "node:assert/strict";
import {
  reminderMessage,
  whatsappLink,
  whatsappPhone,
} from "../lib/manual-whatsapp";

test("atalho WhatsApp normaliza DDD brasileiro sem duplicar o DDI", () => {
  assert.equal(whatsappPhone("(11) 98765-4321"), "5511987654321");
  assert.equal(whatsappPhone("+55 11 98765-4321"), "5511987654321");
  assert.equal(whatsappPhone("11 3456-7890"), "551134567890");
  assert.equal(whatsappPhone("987654321"), null);
  assert.equal(whatsappPhone("00000000000"), null);
  assert.equal(whatsappPhone(""), null);
  assert.equal(whatsappLink("11987654321", "  "), null);
});

test("mensagem preserva acentos, codifica texto e usa data/hora de São Paulo", () => {
  const message = reminderMessage(
    {
      customer: "João & Pedro",
      professional_name: "Léo",
      service_name: "Corte + barba",
      starts_at: "2026-10-27T00:30:00.000Z",
    },
    "Navalha",
  );
  assert.match(message, /26\/10\/2026 às 21:30/);
  assert.match(message, /João & Pedro/);
  assert.match(message, /Corte \+ barba/);
  const link = new URL(whatsappLink("11987654321", message)!);
  assert.equal(link.origin, "https://wa.me");
  assert.equal(link.pathname, "/5511987654321");
  assert.equal(link.searchParams.get("text"), message);
  assert.deepEqual([...link.searchParams.keys()], ["text"]);
});
