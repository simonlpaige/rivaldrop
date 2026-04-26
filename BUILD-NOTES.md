# BUILD-NOTES.md - rivalDrop v1.0 brand refresh

Date: 2026-04-25
Scope: Whole-site refresh against the v1.0 Brand System.

## What changed

### New visual system
- Palette moved to **paper / ink / hot orange**:
  - `#F6F5F1` paper, `#0E1116` ink, `#FF5B1F` accent (the drop). Plus three ink levels and two paper levels.
  - Single-accent rule: only one element per visible viewport glows orange. The previous palette could light up multiple things at once. Now the eye lands on the one thing that matters.
- Type stack: **Source Serif 4** for display + body, **Inter Tight** for UI labels and buttons, **JetBrains Mono** for data and timestamps.
- The mark is now a **Feynman vertex**: two solid lines come in from the upper- and lower-left at 45 degrees, meet at a vertex, and a dashed leg exits to the right with an orange drop at the end. Five SVG variants live in `assets/` (primary lockup, mark only, reverse for dark, icon, favicon).
- All marks use **outlined paths** for the wordmark (rivalDrop in Source Serif 4 Medium with italic Drop in accent) so the lockup renders identically when loaded as an `<img>` from external referrers without depending on the webfont.
- New **og:image** at `assets/og-image.png` (1200x630). Headline asks the question.

### Voice rewrite
- Positioning broadened from "Shopify brands" to "competitive intel for sales teams." Account executives prepping for renewals, sales leaders running competitive deals, founders selling against funded competitors. Verticals like HVAC and restaurants surface as concrete examples, not separate landings.
- Voice rules: start with a question, use an analogy, cite the evidence. Plain before poetic. Honest about limits.
- Banished words: leverage, synergy, robust, holistic, ecosystem, AI-powered, intelligent, smart (without saying how), game-changing, disruptive, revolutionary, solutions, stakeholders, alignment, motion. Verified zero hits across all rebuilt copy.
- Hard rule: no em dashes anywhere. Verified zero hits.

### Pricing
- Single tier kept at **$149/month**. The previous Scout / Command / Command+ split is collapsed. Honest about what's in and what isn't.

### Pages rebuilt
- `index.html` - new hero with the central question, the analogy section, signal examples, who it's for, what you get, pricing card, final CTA.
- `onboard/index.html` - email-capture flow with Resend submission preserved exactly. Numbered steps explain what happens after.
- `services/index.html` - long-form walkthrough of the morning brief, watchlist, dashboard, and an honest "what we don't do" section.
- `welcome/index.html` - post-signup confirmation page.
- `privacy.html` and `terms.html` - re-skinned to the new system. Legal substance kept verbatim. Em dashes in legal copy were treated as punctuation, not substance, and replaced with commas or colons.

### Pages folded in / redirected
- `local/index.html` - the old local-businesses landing. Folded into the home story, page now meta-refreshes to /. Keeps inbound links alive.
- `onboarding/index.html` - was already a meta-refresh to /onboard/. Left as-is.
- `sample/index.html` - was a sample report preview page in the previous voice. Replaced with a meta-refresh to the PDF, matching the old Netlify /sample redirect behavior. The file itself is at /RivalDrop_sample_report.pdf.

### Assets cleaned up
- Removed: old `css/site.css`, `fiverr_gig_image.png`, `icon-512.png`, `logo-720.png` (no longer referenced).
- Kept: `logo-stripe-720.png`, `logo-stripe.svg`, `icon-stripe-512.png`, `icon-stripe.svg`, `simon-paige.jpg`. Stripe checkout may hotlink the stripe-branded marks. Photo may be referenced from social bios.

## Source of truth

The canonical brand system lives in the workspace at `modules/groundlayer/factory/brands/rivaldrop/docs/_refresh-staging/brand.md`. The corresponding execution briefs are at `modules/groundlayer/factory/brands/rivaldrop/docs/REFRESH-EXECUTION-BRIEF.md` and `REFRESH-PHASE-2-BRIEF.md`.

The deploy pipeline is GitHub Pages reading from `simonlpaige/rivaldrop` master branch with custom domain `rivaldrop.com`. CNAME is at the repo root.
