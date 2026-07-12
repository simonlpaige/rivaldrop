// Intake endpoint: the public tunnel host for the pipeline-agency server.
// Set at deploy time; no secrets live in this file. Payment is verified
// server-side with Stripe - the session id here is a lookup key, not proof.
var INTAKE_URL = "https://intake.rivaldrop.com/intake";

(function () {
  var params = new URLSearchParams(window.location.search);
  var sid = params.get("session_id") || "";
  // Validate session_id shape: cs_live_ or cs_test_ followed by alphanumeric
  if (/^cs_(live|test)_[A-Za-z0-9]+$/.test(sid)) {
    document.getElementById("session_id").value = sid;
    // Strip session_id from the address bar for security (no reload)
    if (window.history.replaceState) {
      var cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  } else {
    // No valid session_id - show recovery message, hide form
    document.getElementById("form-section").style.display = "none";
    document.getElementById("recovery-section").style.display = "";
  }
})();

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

  // Disable button to prevent resubmit
  btn.disabled = true;
  status.textContent = "Verifying your payment with Stripe...";

  var competitors = ["competitor_1", "competitor_2", "competitor_3"]
    .map(function (id) { return document.getElementById(id).value.trim(); })
    .filter(Boolean);

  var payload = {
    session_id: document.getElementById("session_id").value,
    agency_name: document.getElementById("agency_name").value.trim(),
    agency_website: document.getElementById("agency_website").value.trim(),
    email: document.getElementById("email").value.trim(),
    logo_url: document.getElementById("logo_url").value.trim() || null,
    store_name: document.getElementById("store_name").value.trim(),
    store_url: document.getElementById("store_url").value.trim(),
    competitor_urls: competitors,
    focus: document.getElementById("focus").value.trim() || null
  };

  fetch(INTAKE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).then(function (res) {
    if (res.ok) {
      document.getElementById("form-section").style.display = "none";
      document.getElementById("success-section").style.display = "";
      window.scrollTo(0, 0);
      return;
    }
    if (res.status === 409) {
      // Session already consumed - this is a success, order already in progress
      document.getElementById("form-section").style.display = "none";
      document.getElementById("success-section").style.display = "";
      window.scrollTo(0, 0);
      return;
    }
    return res.json().catch(function () { return {}; }).then(function (body) {
      btn.disabled = false;
      var msg = "Something went wrong. Please try again or email hello@rivaldrop.com with your Stripe receipt.";
      if (body && body.error) {
        // Only show safe public error codes
        if (body.error === "session_not_verified") {
          msg = "We could not verify your payment. Please check your Stripe receipt or email hello@rivaldrop.com.";
        } else if (body.error === "invalid_json" || body.error === "body_too_large") {
          msg = "There was an issue with the form. Please try again.";
        } else if (body.error === "invalid_intake") {
          msg = "Please check all required fields and try again.";
        }
      }
      status.textContent = msg;
    });
  }).catch(function () {
    btn.disabled = false;
    status.textContent = "Network error. Please try again in a minute, or email hello@rivaldrop.com with your Stripe receipt.";
  });
});

// Keyboard accessibility: Enter on any input moves to next field naturally
