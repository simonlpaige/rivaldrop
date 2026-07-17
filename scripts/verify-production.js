#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const contract = JSON.parse(fs.readFileSync(path.join(ROOT, "production-contract.json"), "utf8"));
const workspace = process.env.RIVALDROP_WORKSPACE || "C:/Users/simon/.openclaw/workspace";
const pipeline = path.join(workspace, contract.pipeline.moduleRelativeToWorkspace);
const inventory = process.env.RIVALDROP_KEY_INVENTORY || path.join(ROOT, "_scratch", "gate1-all-keys.json");
const checks = [];

function check(name, pass, detail) {
  checks.push({ name, pass: Boolean(pass), detail });
}

function read(file) { return fs.readFileSync(file, "utf8"); }

check("pipeline directory", fs.existsSync(pipeline), pipeline);
check("frontend intake origin", read(path.join(ROOT, "onboard", "app.js")).includes("https://intake.rivaldrop.com"), "expected production intake origin");

const config = read(path.join(pipeline, "config.js"));
check("port 4871 contract", config.includes("RIVALDROP_INTAKE_PORT || 4871"), "port must remain 4871");
check("one-time $149 offer", config.includes(contract.stripe.priceId) && config.includes("expectedAmount: 14900") && config.includes('mode: "payment"'), "existing offer IDs and amount");

const supervisor = read(path.join(pipeline, "supervise.js"));
check("supervisor fail closed", supervisor.includes('marker.activated === true') && supervisor.includes('RIVALDROP_DELIVERY_ENABLED: "0"'), "activation JSON plus suppressed default");
const worker = read(path.join(pipeline, "worker.js"));
check("suppression remains resumable", worker.includes('action: "delivery_gated"') && !worker.includes('transition(order.id, STATES.DELIVERED, "delivery_suppressed"'), "no terminal suppressed delivery");
const recovery = read(path.join(pipeline, "reconcile.js"));
check("recovery email gated", recovery.includes('RIVALDROP_DELIVERY_ENABLED !== "1"') && recovery.includes("RECOVERY_EMAIL_EVENT"), "gated and one-time");
const email = read(path.join(pipeline, "email.js"));
check("recipient pinning fail closed", email.includes("PHASE2_TEST_RECIPIENT") && email.includes("marker && marker.activated === true"), "pin until valid marker");

const tunnel = read(contract.cloudflare.configPath).replace(/\\/g, "/");
check("named tunnel id", tunnel.includes(contract.cloudflare.tunnelId), "existing tunnel only");
check("DNS hostname route", tunnel.includes("hostname: " + contract.cloudflare.hostname), "existing hostname only");
check("port 4871 ingress", tunnel.includes("service: http://127.0.0.1:4871"), "loopback ingress");
check("no port 8383 ingress", !tunnel.includes(":8383"), "forbidden handler port");

try {
  const netstat = execFileSync("netstat", ["-ano", "-p", "tcp"], { encoding: "utf8" });
  check("port 4871 listening", /^\s*TCP\s+127\.0\.0\.1:4871\s+/m.test(netstat), "loopback listener required");
  check("port 8383 not listening", !/^\s*TCP\s+\S+:8383\s+.*LISTENING/m.test(netstat), "forbidden handler must remain undeployed");
} catch (_) {
  check("port audit", false, "netstat unavailable");
}

for (const taskName of ["RivalDrop Supervisor", contract.backup.taskName]) {
  try {
    const task = execFileSync("schtasks", ["/Query", "/TN", taskName, "/V", "/FO", "LIST"], { encoding: "utf8" });
    check(`scheduled task ${taskName}`, /Ready|Running/.test(task), "task exists and is enabled");
  } catch (_) {
    check(`scheduled task ${taskName}`, false, "missing or unreadable");
  }
}

try {
  const latest = fs.readdirSync(contract.backup.directory)
    .filter((name) => /^orders-.*\.db$/.test(name))
    .map((name) => fs.statSync(path.join(contract.backup.directory, name)).mtimeMs)
    .sort((a, b) => b - a)[0];
  const ageHours = (Date.now() - latest) / 3600000;
  check("backup freshness", Number.isFinite(ageHours) && ageHours <= contract.backup.maxAgeHours, `${ageHours.toFixed(1)} hours old`);
} catch (_) {
  check("backup freshness", false, "no readable orders backup");
}

if (!fs.existsSync(inventory)) {
  check("key inventory", false, "missing _scratch/gate1-all-keys.json");
} else {
  try {
    const parsed = JSON.parse(read(inventory));
    const names = new Set(Object.keys(parsed));
    const missing = contract.requiredKeyNames.filter((name) => !names.has(name));
    check("key inventory", missing.length === 0, `${names.size} key names inspected; ${missing.length} required names missing`);
  } catch (_) {
    check("key inventory", false, "invalid JSON; no values printed");
  }
}

const marker = path.join(pipeline, "data", "production-activated.json");
check("activation remains off", !fs.existsSync(marker), "customer delivery and Smartlead must stay gated until all checks pass");

const failed = checks.filter((item) => !item.pass);
for (const item of checks) console.log(`${item.pass ? "PASS" : "FAIL"} ${item.name}: ${item.detail}`);
console.log(`${checks.length - failed.length}/${checks.length} production contract checks passed`);
process.exitCode = failed.length ? 1 : 0;
