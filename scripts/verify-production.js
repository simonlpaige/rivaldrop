#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const contract = JSON.parse(fs.readFileSync(path.join(ROOT, "production-contract.json"), "utf8"));
const workspace = process.env.RIVALDROP_WORKSPACE || "C:/Users/simon/.openclaw/workspace";
const pipeline = path.join(workspace, contract.pipeline.moduleRelativeToWorkspace);
const checks = [];

function check(name, pass, detail) {
  checks.push({ name, pass: Boolean(pass), detail });
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function canonicalSequences(response) {
  const rows = Array.isArray(response) ? response : response && (response.data || response.sequences) || [];
  return rows.map((row) => ({
    seq_number: row.seq_number,
    subject: row.subject || "",
    email_body: row.email_body || "",
    delay: row.seq_delay_details || null,
    variants: row.sequence_variants || []
  }));
}

function leadRows(response) {
  const rows = Array.isArray(response)
    ? response
    : Array.isArray(response && response.data)
      ? response.data
      : Array.isArray(response && response.leads)
        ? response.leads
        : [];
  return rows.map((row) => row && row.lead ? row.lead : row).filter(Boolean);
}

async function main() {
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

  for (const taskName of ["RivalDrop Supervisor", contract.backup.taskName, contract.smartlead.growthSupervisorTaskName]) {
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

  try {
    const accessor = require(path.join(workspace, contract.keyRegistryRelativeToWorkspace));
    const entries = accessor.list();
    const names = new Set(entries.map((entry) => entry.id));
    const missing = contract.requiredKeyNames.filter((name) => !names.has(name));
    const exposesValues = entries.some((entry) => Object.prototype.hasOwnProperty.call(entry, "value"));
    check("vault key registry", missing.length === 0 && !exposesValues, `${names.size} masked key names inspected; ${missing.length} required names missing`);
  } catch (_) {
    check("vault key registry", false, "masked registry unavailable; no values printed");
  }

  try {
    const markerPath = path.join(pipeline, contract.activation.markerRelativeToPipeline);
    const marker = JSON.parse(read(markerPath));
    const evidence = marker.gate_evidence || {};
    const missingEvidence = contract.activation.requiredEvidence.filter((name) => !evidence[name]);
    const approvedAt = Date.parse(marker.approved_at || "");
    check(
      "approved production activation",
      marker.activated === contract.activation.expectedActivated && marker.approved_by === "Simon Paige" && Number.isFinite(approvedAt) && missingEvidence.length === 0,
      `${missingEvidence.length} required evidence fields missing`
    );
  } catch (_) {
    check("approved production activation", false, "activation marker missing or malformed");
  }

  try {
    const policy = JSON.parse(read(path.join(workspace, contract.smartlead.growthPolicyRelativeToWorkspace)));
    check(
      "bounded growth policy",
      policy.enabled === true &&
        policy.campaign.id === contract.smartlead.activationTargetCampaignId &&
        policy.campaign.approved_sequence_sha256 === contract.smartlead.approvedSequenceSha256 &&
        policy.limits.max_queued_without_positive_reply === contract.smartlead.maxQueuedWithoutPositiveReply &&
        policy.mutations.allow_resume === false &&
        policy.mutations.allow_sequence_change === false,
      "single campaign, pinned sequence, capped queue, no auto-resume or copy edits"
    );
  } catch (_) {
    check("bounded growth policy", false, "growth policy missing or malformed");
  }

  try {
    const smartlead = require(path.join(workspace, "tools", "smartlead-client.js"));
    const [campaign, sequencesResponse, analytics, leadsResponse] = await Promise.all([
      smartlead.getCampaign(contract.smartlead.activationTargetCampaignId),
      smartlead.getCampaignSequences(contract.smartlead.activationTargetCampaignId),
      smartlead.getCampaignAnalytics(contract.smartlead.activationTargetCampaignId),
      smartlead.getCampaignLeads(contract.smartlead.activationTargetCampaignId, { offset: 0, limit: 100 })
    ]);
    const sequences = canonicalSequences(sequencesResponse);
    const fingerprint = crypto.createHash("sha256").update(JSON.stringify(sequences)).digest("hex");
    const schedule = campaign.scheduler_cron_value || {};
    const requiredSchedule = contract.smartlead.requiredSchedule;
    check(
      "Smartlead campaign identity",
      campaign.id === contract.smartlead.activationTargetCampaignId && campaign.name === contract.smartlead.approvedCampaignName && contract.smartlead.requiredOperationalStatuses.includes(campaign.status),
      `campaign ${campaign.id}; status ${campaign.status}`
    );
    check("Smartlead reply stop", campaign.stop_lead_settings === contract.smartlead.requiredStopCondition, "reply stops the lead");
    check(
      "Smartlead sending schedule",
      schedule.tz === requiredSchedule.tz && schedule.startHour === requiredSchedule.startHour && schedule.endHour === requiredSchedule.endHour && JSON.stringify(schedule.days) === JSON.stringify(requiredSchedule.days),
      "weekdays 09:00-18:00 America/Chicago"
    );
    check("Smartlead sequence fingerprint", sequences.length === contract.smartlead.expectedSequenceCount && fingerprint === contract.smartlead.approvedSequenceSha256, `${sequences.length} approved steps; sha256 ${fingerprint.slice(0, 12)}...`);
    const sequenceText = JSON.stringify(sequences);
    check("Smartlead compliance and sample fields", /unsubscribe/i.test(sequenceText) && /Kansas City|Groundlayer|641/i.test(sequenceText) && /sample_url/.test(sequenceText) && /portfolio_brand/.test(sequenceText), "unsubscribe, sender identity, and exact sample variables present");
    const stats = analytics.campaign_lead_stats || {};
    const rows = leadRows(leadsResponse);
    const samplesBound = rows.every((lead) => {
      const fields = lead.custom_fields || {};
      return typeof fields.sample_url === "string" && fields.sample_url.startsWith("https://rivaldrop.com/teardowns/") && Boolean(fields.portfolio_brand);
    });
    check("Smartlead lead sample binding", rows.length > 0 && rows.length <= contract.smartlead.maxQueuedWithoutPositiveReply && samplesBound, `${rows.length} leads inspected without printing PII`);
    check("Smartlead sender health", Number(analytics.bounce_count || 0) === 0 && Number(analytics.unsubscribed_count || 0) === 0 && Number(stats.blocked || 0) === 0, "zero bounces, unsubscribes, and blocks");
  } catch (error) {
    check("Smartlead live contract", false, `read-only verification failed: ${String(error.message || error).slice(0, 120)}`);
  }

  const failed = checks.filter((item) => !item.pass);
  for (const item of checks) console.log(`${item.pass ? "PASS" : "FAIL"} ${item.name}: ${item.detail}`);
  console.log(`${checks.length - failed.length}/${checks.length} production contract checks passed`);
  process.exitCode = failed.length ? 1 : 0;
}

main().catch((error) => {
  console.error(`FAIL verifier crashed: ${String(error.message || error).slice(0, 160)}`);
  process.exitCode = 1;
});
