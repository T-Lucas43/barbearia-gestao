import { test } from "node:test";
import assert from "node:assert/strict";
import { commission } from "../lib/domain";
test("R$ 60 com 45% gera R$ 27 e preserva o total", () => {
  assert.equal(commission(6000, 4500), 2700);
  assert.equal(6000 - commission(6000, 4500), 3300);
});
test("arredondamento em centavos e limites", () => {
  assert.equal(commission(999, 4500), 450);
  assert.equal(commission(0, 10000), 0);
  assert.equal(commission(999, 10000), 999);
  assert.throws(() => commission(-1, 5000));
  assert.throws(() => commission(100, 10001));
  assert.throws(() => commission(1.5, 5000));
});
