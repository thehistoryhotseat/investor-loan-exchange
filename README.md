# Investor Loan Exchange

Static site for the ILX scenario-routing desk, served by GitHub Pages from the
default branch root: https://thehistoryhotseat.github.io/investor-loan-exchange/

## Files

- `index.html` - the whole site: landing sections and the native multi-step
  scenario intake (currently in test mode; entries are validated and shown to
  the submitter as a readable deal sheet (raw JSON behind a "For agents" toggle); nothing is transmitted).
- `scenario.schema.json` - JSON Schema (draft 2020-12, v1.8) for one loan
  scenario. Agents prepare files against it; the intake loader prefills from a
  valid file but never loads contact details or consent.
- `llms.txt` - machine-readable instructions for AI agents using the site.
- `og-image.png` - social/link preview card.
- `robots.txt`, `sitemap.xml` - crawl directives.

## Deploy

Push to the default branch; GitHub Pages republishes in under a minute.

## Going live with submissions

The intake stays in test mode while `SUBMIT_ENDPOINT` in `index.html` is an
empty string. To switch on live submissions, set it to the chosen intake URL.
The form then POSTs an envelope wrapping the lender-facing record
(`{"submission_id": "ILX-...", "consent": {"version": ..., "given_at": ...},
"scenario": {...}, "contact": "..."}`, sent as `Content-Type: text/plain` so
Apps Script gets no preflight). Contact never travels inside the lender-facing
record itself. The send only counts as delivered when the endpoint answers
JSON with `ok: true`; an optional `{"reference": "..."}` in that reply is then
shown on the confirmation screen, and no reference is ever invented locally.
A failed send keeps every entry on the page and tells the submitter nothing
was lost. Any endpoint that accepts a JSON
POST works (Formspree, a Google Apps Script web app writing to a Sheet, a
Zapier/Make webhook).

## Rules of the house

- No borrower names, SSNs, account numbers, or documents anywhere - scenarios only.
- Consent is set by the human submitter in the form, never by an agent or a file.
- Sample figures are illustrative, never live rates or offers.
