// Intake endpoint: the public tunnel host for the pipeline-agency server.
// Set at deploy time; no secrets live in this file. Payment is verified
// server-side with Stripe - the session id here is a lookup key, not proof.
var INTAKE_ORIGIN = "https://intake.rivaldrop.com";
var INTAKE_URL = INTAKE_ORIGIN + "/intake";
var RECOVER_URL = INTAKE_ORIGIN + "/recover";

var GENERIC_ERROR = "Something went wrong. Please try again, or email hello@rivaldrop.com and we will send a fresh intake link to the address you paid with.";

/**
 * Decide what the UI shows for an intake response. Pure function so it can be
 * unit tested in Node (see app.test.js).
 *
 * Success is shown ONLY when:
 *   - the request succeeded (2xx), or
 *   - HTTP status is exactly 409 AND the parsed body carries the safe response
 *     code "session_already_consumed" AND verified === true, which the backend
 *     sets only after it re-verified with Stripe that the order belongs to this
 *     Checkout Session. Every other 409 (unrelated proxies, conflicting intake,
 *     malformed bodies) is a generic recoverable error, never silent success.
 *
 * @param {number} status - HTTP status code
 * @param {object|null} body - parsed JSON body, or null if parsing failed
 * @returns {{outcome: "success"|"error", message?: string, resetButton?: boolean}}
 */
function classifyIntakeResponse(status, body) {
  if (status >= 200 && status < 300) return { outcome: "success" };

  if (status === 409) {
    var consumed = body && typeof body === "object" &&
      body.error === "session_already_consumed" &&
      body.verified === true;
    if (consumed) return { outcome: "success" };
    return { outcome: "error", message: GENERIC_ERROR, resetButton: true };
  }

  var msg = GENERIC_ERROR;
  if (body && typeof body === "object" && typeof body.error === "string") {
    // Only show safe public error codes.
    if (body.error === "session_not_verified") {
      msg = "We could not verify your payment. Please check your Stripe receipt or email hello@rivaldrop.com.";
    } else if (body.error === "invalid_json" || body.error === "body_too_large") {
      msg = "There was an issue with the form. Please try again.";
    } else if (body.error === "validation_failed" || body.error === "invalid_intake") {
      msg = "Please check all required fields and try again.";
    }
  }
  return { outcome: "error", message: msg, resetButton: true };
}

// ---- Browser wiring (skipped when required under Node for tests) ----
if (typeof document !== "undefined") {
  (function () {
    function show(id) { document.getElementById(id).style.display = ""; }
    function hide(id) { document.getElementById(id).style.display = "none"; }
    function showSuccess() { hide("form-section"); show("success-section"); window.scrollTo(0, 0); }
    function showRecovery() { hide("form-section"); show("recovery-section"); }

    function stripQuery() {
      if (window.history.replaceState) {
        var cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }

    var params = new URLSearchParams(window.location.search);
    var sid = params.get("session_id") || "";
    var rt = params.get("rt") || "";
    // Never leave a session id or recovery token in the address bar.
    stripQuery();

    if (/^cs_(live|test)_[A-Za-z0-9]+$/.test(sid)) {
      // Normal path: arrived from Stripe Checkout's redirect.
      document.getElementById("session_id").value = sid;
    } else if (/^rtok_[a-f0-9]{48}$/.test(rt)) {
      // Recovery path: arrived from the intake-recovery email. Exchange the
      // single-use token for the session id; the raw session id never appears
      // in any URL on this path.
      fetch(RECOVER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: rt })
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          if (res.ok && body && typeof body.session_id === "string" && /^cs_(live|test)_[A-Za-z0-9]+$/.test(body.session_id)) {
            document.getElementById("session_id").value = body.session_id;
          } else {
            showRecovery();
          }
        });
      }).catch(function () { showRecovery(); });
    } else {
      // No valid session or token - show recovery guidance, hide form.
      showRecovery();
    }

    document.getElementById("intake-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var form = e.target;
      var status = document.getElementById("form-status");
      var btn = document.getElementById("submit-btn");

      // Prevent double submission
      if (btn.disabled) return;

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      btn.disabled = true;
      status.textContent = "Verifying your payment with Stripe...";

      var competitors = ["competitor_1", "competitor_2", "competitor_3"]
        .map(function (id) { return document.getElementById(id).value.trim(); })
        .filter(Boolean);

      // Field names must match the backend's validateIntake() contract
      // (intake.js): work_email / client_store_name / client_store_url /
      // agency_logo_url / focus_area.
      var payload = {
        session_id: document.getElementById("session_id").value,
        agency_name: document.getElementById("agency_name").value.trim(),
        agency_website: document.getElementById("agency_website").value.trim(),
        work_email: document.getElementById("email").value.trim(),
        agency_logo_url: document.getElementById("logo_url").value.trim() || null,
        client_store_name: document.getElementById("store_name").value.trim(),
        client_store_url: document.getElementById("store_url").value.trim(),
        competitor_urls: competitors,
        focus_area: document.getElementById("focus").value.trim() || null
      };

      fetch(INTAKE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).then(function (res) {
        // Always attempt to parse the body; malformed bodies become null and
        // are classified as errors (never accidental success).
        return res.json().catch(function () { return null; }).then(function (body) {
          var decision = classifyIntakeResponse(res.status, body);
          if (decision.outcome === "success") {
            showSuccess();
            return;
          }
          btn.disabled = false;
          status.textContent = decision.message;
        });
      }).catch(function () {
        btn.disabled = false;
        status.textContent = "Network error. Please try again in a minute, or email hello@rivaldrop.com.";
      });
    });
  })();
}

// Node export for unit tests only; ignored by browsers.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { classifyIntakeResponse, GENERIC_ERROR };
}
