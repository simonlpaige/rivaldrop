# BUILD-NOTES.md - RivalDrop Radar Rebuild

Date: 2026-04-19
Branch: radar-rebuild-2026-04-19

## What was rebuilt vs. audited-only

### Rebuilt from scratch
- **index.html** - Complete rewrite. New Radar flavor homepage with all sections from BRIEF.md: hero (left-aligned, BRAND.md copy verbatim), how-it-works triplet with Lucide icons, what-we-watch list, sample report panel, empty-state honesty callout, two-product pricing row. No JS. No analytics.
- **css/site.css** - New single stylesheet with all Radar tokens as CSS custom properties. Panel, badge, table, timestamp components. Responsive breakpoints at 640/900/1200px. Print styles. prefers-reduced-motion support.
- **local/index.html** - New page. RivalDrop /local product page with Scout ($99) and Pro ($149) pricing, four vertical use cases (barbers, HVAC, restaurants, retail).
- **services/index.html** - Complete rewrite. Was a local SEO services page; now the Shopify product page with Growth ($149) and Scale ($247) tiers, four vertical use cases.
- **privacy.html** - Complete rewrite. Scoped to rivaldrop.com, Groundlayer LLC as legal party. Includes the "we only look at public information" statement from BRIEF.md. Plain English.
- **terms.html** - Complete rewrite. Scoped to rivaldrop.com, Groundlayer LLC as legal party. Plain language, no legalese fog.
- **onboard/index.html** - Complete rewrite. Was a full JS-driven form with mailto fallback. Now a static onboarding page with numbered steps explaining the process and a mailto CTA to simon@rivaldrop.com. No JS required.

### Reskinned / audited
- **welcome/index.html** - Reskinned to Radar. Was using DM Sans + Space Mono on dark-navy; now uses Source Serif 4 + Inter + JetBrains Mono with proper Radar tokens via site.css. Structure preserved (post-signup confirmation with steps).
- **sample/index.html** - Reskinned to Radar. Was a bare meta-refresh redirect to the PDF; now a proper sample report preview page with the report panel component and a PDF download link.
- **onboarding/index.html** - Was already a meta-refresh redirect to /onboard/. Updated to Radar styling with a visible fallback link and proper message.

### Untouched
- .nojekyll, CNAME, RivalDrop_sample_report.pdf, simon-paige.jpg, fiverr_gig_image.png
- logo-stripe.svg, logo-stripe-720.png, icon-stripe.svg, icon-stripe-512.png (Stripe checkout assets)

## onboard/ vs. onboarding/ consolidation

The existing onboarding/index.html was already a meta-refresh redirect to /onboard/. Decision: **keep both**. onboard/ is the canonical page with full content. onboarding/ remains a redirect with a visible fallback link saying "Taking you to /onboard/". Both now use Radar styling. This preserves any existing inbound links to either URL.

## Assets

- **assets/logo.svg** - Copied from modules/groundlayer/design-systems/logos/rivaldrop.svg (the new Radar wordmark with signal-green ping dot).
- **assets/favicon.svg** - New: signal-cyan ping dot on night-sky square. Replaces the old emoji-based favicon across all pages.
- **logo.svg, logo-720.png, icon.svg, icon-512.png** - Legacy files left in place; not referenced by new pages. The new assets/logo.svg and assets/favicon.svg supersede them. Legacy PNGs kept for any external references.

## Voice-check scan results

Scanned all HTML files for:
- **Banned words** (unlock, leverage, seamless, etc.) - zero hits
- **Em dashes / en dashes** (mdash, ndash, U+2013, U+2014) - zero hits
- **Gradients** in CSS - zero hits
- **border-radius > 8px** - zero hits
- **Non-approved fonts** - only Source Serif 4, Inter, JetBrains Mono used
- **Emoji in UI chrome** - zero (only used in meta-description and non-chrome contexts removed)
- **Uppercase button labels** - zero
- **JavaScript for content visibility** - zero; all pages render fully without JS
- **Stock photography / AI faces** - none used

## Flagged concerns

1. **mailto CTAs**: All signup/contact CTAs use mailto:simon@rivaldrop.com. This is correct per BRIEF.md ("CTAs link back to Simon's email for setup") but should be replaced with a proper form or Stripe checkout links when ready.
2. **Legacy logo/icon files**: The old logo.svg, logo-720.png, icon.svg, icon-512.png are still at root. They're not referenced by any rebuilt page but exist for backward compatibility. Can be removed once no external service references them.
3. **Google Fonts as only external request**: The brief says "No analytics beyond Google Fonts." Google Fonts is the sole external dependency. Consider self-hosting fonts to eliminate this if page weight allows.
4. **PDF sample report**: /RivalDrop_sample_report.pdf is linked from homepage, sample page, local page, and Shopify page. File exists at repo root and is ~312KB.
