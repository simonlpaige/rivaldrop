"use strict";
/**
 * Unit tests for the intake response classifier (onboard/app.js).
 * Run: node --test onboard/app.test.js
 *
 * The classifier must NEVER treat an arbitrary 409 as success. Success on 409
 * requires the exact safe code "session_already_consumed" AND verified: true,
 * which the backend only sets after re-verifying the order belongs to that
 * Checkout Session via Stripe.
 */
const { test } = require("node:test");
const assert = require("node:assert");
const { classifyIntakeResponse, GENERIC_ERROR } = require("./app.js");

test("2xx is success", () => {
  assert.equal(classifyIntakeResponse(200, { ok: true, order_ref: "ord_ab12" }).outcome, "success");
});

test("409 consumed + verified matching session -> success (order already in progress)", () => {
  const d = classifyIntakeResponse(409, { ok: false, error: "session_already_consumed", verified: true });
  assert.equal(d.outcome, "success");
});

test("409 consumed WITHOUT backend verification flag -> generic recoverable error", () => {
  const d = classifyIntakeResponse(409, { ok: false, error: "session_already_consumed" });
  assert.equal(d.outcome, "error");
  assert.equal(d.message, GENERIC_ERROR);
});

test("email/session mismatch (402 session_not_verified) -> error, never success", () => {
  const d = classifyIntakeResponse(402, { ok: false, error: "session_not_verified", reason: "email_mismatch" });
  assert.equal(d.outcome, "error");
  assert.match(d.message, /could not verify your payment/i);
});

test("conflicting intake 409 (different code) -> generic recoverable error", () => {
  const d = classifyIntakeResponse(409, { ok: false, error: "intake_conflict", verified: true });
  assert.equal(d.outcome, "error");
  assert.equal(d.message, GENERIC_ERROR);
});

test("unrelated 409 (proxy/CDN shape) -> generic recoverable error", () => {
  const d = classifyIntakeResponse(409, { message: "Conflict", code: 409 });
  assert.equal(d.outcome, "error");
  assert.equal(d.message, GENERIC_ERROR);
});

test("malformed response body (unparseable JSON -> null) -> error", () => {
  const d = classifyIntakeResponse(409, null);
  assert.equal(d.outcome, "error");
  assert.equal(d.message, GENERIC_ERROR);
});

test("malformed body on non-409 -> generic error", () => {
  assert.equal(classifyIntakeResponse(500, null).outcome, "error");
});

test("422 validation error -> field message", () => {
  const d = classifyIntakeResponse(422, { ok: false, error: "validation_failed" });
  assert.equal(d.outcome, "error");
  assert.match(d.message, /required fields/i);
});
