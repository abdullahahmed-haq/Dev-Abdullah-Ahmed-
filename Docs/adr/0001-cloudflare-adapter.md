# ADR 0001: Select vinext for the first Cloudflare deployment

Date: 2026-08-26

## Context

The portfolio is a new Next.js App Router project. Cloudflare recommends vinext for new Next.js applications, but vinext remains beta. OpenNext stays available as the compatibility fallback.

## Evidence

`vinext check` reported 91% compatibility, zero unsupported imports, zero project-structure issues, and two non-blocking partial configuration notes:

- Cloudflare Images is not used; Cloudinary remains the media optimizer.
- App Router strict mode defaults to the expected behavior.

The vinext production build succeeded, Wrangler launched the local Worker with the private R2 binding, and public/cache-control behavior was verified locally.

## Decision

Use vinext 1.0.0-beta.8 for the preview deployment, pinned through the lockfile. Keep release, publication, Supabase, and R2 domain code adapter-neutral. Re-run the compatibility check, Worker smoke test, and full public-route suite before upgrading vinext.

## Reversal trigger

Switch to pinned OpenNext if a production-like preview shows an unsupported standard Next.js API, incorrect R2 binding behavior, broken Server Action/route-handler behavior, or a persistent Worker limit breach that cannot be addressed without an undocumented workaround.
