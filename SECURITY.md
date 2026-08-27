# Security Policy

Report suspected vulnerabilities privately to the repository owner. Do not open a public issue containing exploit details, credentials, personal contact messages, or provider identifiers.

Supported code is the current `main` branch. Security fixes should include a regression test where practical and must pass `npm run verify`.

Operational secrets belong in Cloudflare or GitHub secret stores. Contact-message data is intentionally excluded from logical backups and is purged after its retention period. See `Docs/OPERATIONS.md` for response and credential-rotation steps.
