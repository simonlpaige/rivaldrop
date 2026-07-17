"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const contract = JSON.parse(fs.readFileSync(path.join(root, "production-contract.json"), "utf8"));

test("contract preserves the existing production ingress", () => {
  assert.equal(contract.pipeline.port, 4871);
  assert.equal(contract.cloudflare.tunnelName, "rivaldrop-intake");
  assert.equal(contract.cloudflare.hostname, "intake.rivaldrop.com");
  assert.equal(contract.stripe.webhookUrl, "https://intake.rivaldrop.com/stripe/webhook");
});

test("contract preserves the one-time $149 Agency Pilot", () => {
  assert.equal(contract.stripe.amount, 14900);
  assert.equal(contract.stripe.currency, "usd");
  assert.equal(contract.stripe.type, "one_time");
});

test("contract forbids the abandoned handler and subscription prices", () => {
  assert.equal(contract.forbidden.port, 8383);
  assert.equal(contract.forbidden.handler, "rivaldrop-webhook-handler.js");
  assert.deepEqual(contract.forbidden.rivaldropSubscriptionAmounts, [7900, 29900]);
});

test("verifier is read-only and inspects inventory names only", () => {
  const source = fs.readFileSync(path.join(root, "scripts", "verify-production.js"), "utf8");
  assert.match(source, /Object\.keys\(parsed\)/);
  assert.doesNotMatch(source, /Object\.values\(parsed\)/);
  assert.doesNotMatch(source, /webhook_endpoints.*POST|dns_records.*POST|campaign activate/);
});
