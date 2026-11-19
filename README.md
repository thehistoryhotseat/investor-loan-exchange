# Investor Loan Exchange

Static site for the ILX scenario-routing desk, served by GitHub Pages from the
default branch root: https://thehistoryhotseat.github.io/investor-loan-exchange/

## Files

- `index.html` - the whole site: landing sections and the native multi-step
  scenario intake (currently in test mode; entries are validated and shown to
  the submitter as JSON, nothing is transmitted).
- `scenario.schema.json` - JSON Schema (draft 2020-12, v1.1) for one loan
  scenario. Agents prepare files against it; the intake loader prefills from a
  valid file but never loads contact details or consent.
- `llms.txt` - machine-readable instructions for AI agents using the site.
- `og-image.png` - social/link preview card.
- `robots.txt`, `sitemap.xml` - crawl directives.

## Deploy

Push to the default branch; GitHub Pages republishes in under a minute.

## Rules of the house

- No borrower names, SSNs, account numbers, or documents anywhere - scenarios only.
- Consent is set by the human submitter in the form, never by an agent or a file.
- Sample figures are illustrative, never live rates or offers.
