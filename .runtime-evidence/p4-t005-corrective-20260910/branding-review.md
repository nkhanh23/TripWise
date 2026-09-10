# Ticketmaster Attribution & Branding Decision Review (T005)

**Document**: `branding-review.md`  
**Date**: 2026-09-10  
**Status**: APPROVED & COMPLIANT (Textual Disclosure / Semantic Theme)

---

## 1. Context & Authority

Ticketmaster Discovery API requires attribution for event data delivered to end users under Ticketmaster Developer Terms of Use.

- **Exact Reference**: Ticketmaster Developer Terms of Use & Discovery API Branding Guidelines.
- **Explicit Requirement**:
  1. Any application displaying event metadata sourced from Ticketmaster must identify Ticketmaster as the source of that event data.
  2. Data must be accurately represented without claiming direct affiliation, sponsorship, endorsement, or formal partnership unless a specific commercial partner agreement is executed.

---

## 2. What Is Established vs. What Is NOT Established

### Established:
- Sourced events originate from Ticketmaster Discovery API (via Supabase Edge Function `discover-events`).
- Event title, venue name, and event start time are factual provider data.
- Clear textual disclosure is provided in both summary lists (`EventCandidateCard`) and detailed inspection sheets (`EventPreviewSheet`).
- Accessibility labels explicitly communicate source attribution to assistive technologies:
  - English: `Events provided by Ticketmaster`
  - Vietnamese: `Sự kiện cung cấp bởi Ticketmaster`

### NOT Established:
- **No Official Brand Partnership**: TripWise is a client consuming the Discovery API; it does not hold a co-branding or enterprise sponsorship contract with Ticketmaster.
- **No Trademark License for Custom Color Seals**: An earlier draft claimed a custom blue badge (`#026cdf` / `#009cde`) was an "official Ticketmaster brand blue badge". This was an unsubstantiated claim and has been **completely removed**.
- **No Official Logo Graphic Ingestion**: Using third-party SVG/PNG logos without explicit CDN authorization or trademark licensing can introduce licensing defects or broken asset links.

---

## 3. Current Implementation Decision

1. **Textual Provider Disclosure**:
   - The UI renders a pill badge containing the clear text: `Ticketmaster`.
   - The badge uses TripWise's semantic theme tokens (`colors.brand.primary` for background and `colors.text.inverse` for text) rather than claiming proprietary brand palette fidelity.

2. **Accompanying Legal / Review Disclaimer**:
   - Every event card and preview sheet pairs the Ticketmaster badge with a `Review Required` (`Chờ xem xét`) badge.
   - Accompanying helper text explicitly advises:
     - English: *"Events provided by Ticketmaster"* and *"Live provider fact. Review before adding to itinerary."*
     - Vietnamese: *"Sự kiện cung cấp bởi Ticketmaster"* and *"Dữ liệu trực tiếp từ đối tác. Vui lòng kiểm tra trước khi thêm vào lịch trình."*

3. **Accessibility**:
   - Each badge is an accessible `text` element with `accessibilityLabel={t('intelligence.events.attribution')}`.

---

## 4. Attribution Compliance Verdict

- Unsupported "official blue badge" claims: **REMOVED (RESOLVED)**
- Unsupported logo authorization claims: **NONE (RESOLVED)**
- Clear, honest textual attribution present: **YES (PASS)**
- Non-persistence / review disclaimer present: **YES (PASS)**

**Verdict: PASS (Textual Attribution Compliant)**
