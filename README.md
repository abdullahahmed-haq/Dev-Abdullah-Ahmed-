# My Profile

The repository contains one application: a Next.js App Router portfolio deployed to Cloudflare Workers through vinext. Supabase provides the authenticated write model, while immutable Cloudflare R2 releases provide the public read model.

## Local verification

```sh
npm ci
npm run verify
```

`npm run build`, `npm start`, and `npm run deploy` all target the Cloudflare Worker artifact. Use `npm run dev` for the standard Next.js development server or `npm run dev:vinext` for the Cloudflare-compatible development runtime. `npm run build:next` and `npm run start:next` are retained only for upstream Next.js compatibility checks; they are not the production release path.

## Production configuration

Copy `.env.example` to `.env.local` only for local development. Store server credentials as Cloudflare secrets in deployed environments; never populate `.env.example` with real values. The Worker requires the private `PORTFOLIO_RELEASES` R2 binding plus the Supabase, Turnstile, and Cloudinary values listed in the example file.

The release compiler and repository remain adapter-neutral. The Cloudflare adapter supplies the private R2 bucket binding and atomically switches the published manifest.

## Engineering documentation

- [`Docs/ARCHITECTURE.md`](Docs/ARCHITECTURE.md): module seams, release invariants, and security model.
- [`Docs/OPERATIONS.md`](Docs/OPERATIONS.md): configuration, deployment, recovery, and incident runbook.
- [`CONTRIBUTING.md`](CONTRIBUTING.md): development and change rules.
- [`SECURITY.md`](SECURITY.md): private reporting and secret-handling policy.
