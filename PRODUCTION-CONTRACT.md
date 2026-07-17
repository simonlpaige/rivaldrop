# RivalDrop production contract

Production is the existing loopback pipeline on `127.0.0.1:4871`, exposed only by the named `rivaldrop-intake` Cloudflare tunnel at `intake.rivaldrop.com`. Stripe uses the single existing webhook and the single one-time $149 Agency Pilot identified in `production-contract.json`.

The port-8383 `rivaldrop-webhook-handler.js` is forbidden. The verifier must never create DNS records, Stripe webhooks, or $79/$299 RivalDrop subscription products. Test-mode checkout gates may create a temporary one-time $149 product, price, and payment link only when their cleanup archives or deactivates all three.

Customer email is pinned to the test recipient, canonical Smartlead campaign `3527869` remains `PAUSED`, and draft campaign `3528435` remains `DRAFTED` until every gate passes in the same repair run:

1. The key inventory exists and contains every required key name. Values are never printed or persisted.
2. All backend and frontend tests pass.
3. Stripe T1-T7 and checkout-to-delivery E2E pass in test mode with zero DNS or webhook creation.
4. Live Stripe reconciliation confirms exactly one matching webhook and the active one-time $149 offer.
5. Supervisor, tunnel, recovery email, suppression, backup freshness, and port/handler checks pass.
6. Smartlead is still drafted, reply-stop is enabled, suppression lists are honored, each lead has a matching public sample, and the sending schedule/account health are approved.

Suppression is non-terminal: a paid order waiting for activation must remain in `delivering`, never be marked delivered. Activation requires an explicit marker with `activated: true`; an absent, unreadable, or malformed marker fails closed.

The production verifier is read-only. It reports readiness but does not unpin recipients, activate Smartlead, create infrastructure, or mutate Stripe.
