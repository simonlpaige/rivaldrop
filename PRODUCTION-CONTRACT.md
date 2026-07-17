# RivalDrop production contract

Production is the existing loopback pipeline on `127.0.0.1:4871`, exposed only by the named `rivaldrop-intake` Cloudflare tunnel at `intake.rivaldrop.com`. Stripe uses the single existing webhook and the single one-time $149 Agency Pilot identified in `production-contract.json`.

The port-8383 `rivaldrop-webhook-handler.js` is forbidden. The verifier must never create DNS records, Stripe webhooks, or $79/$299 RivalDrop subscription products. Test-mode checkout gates may create a temporary one-time $149 product, price, and payment link only when their cleanup archives or deactivates all three.

Production was explicitly activated by Simon after every gate passed. The activation marker is now required evidence, not a condition the verifier expects to remain absent. Customer delivery stays fail-closed if that marker becomes absent or malformed.

1. The encrypted vault's masked registry contains every required key name. Values are never printed or persisted, and no temporary inventory file is required.
2. All backend and frontend tests pass.
3. Stripe T1-T7 and checkout-to-delivery E2E pass in test mode with zero DNS or webhook creation.
4. Live Stripe reconciliation confirms exactly one matching webhook and the active one-time $149 offer.
5. Supervisor, tunnel, recovery email, suppression, backup freshness, and port/handler checks pass.
6. Smartlead campaign `3527869` is `ACTIVE` or safely `PAUSED`; reply-stop is enabled; the approved three-step sequence fingerprint is unchanged; suppression lists are honored; each queued lead has a matching public sample; and the weekday schedule/account health remain approved.
7. The bounded growth policy pins campaign `3527869`, caps the pre-signal queue at 25, and forbids automatic resume, copy changes, new campaigns, new geography, and purchases. The `RivalDrop Growth Supervisor` scheduled task is present and enabled.

Suppression is non-terminal: a paid order waiting for activation must remain in `delivering`, never be marked delivered. Activation requires an explicit marker with `activated: true`; an absent, unreadable, or malformed marker fails closed.

The production verifier is read-only. It reports the current activated contract but does not import leads, pause/resume Smartlead, edit sequences, create infrastructure, or mutate Stripe.
