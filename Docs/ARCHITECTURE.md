# Architecture

## System shape

The application is a Next.js 16 App Router monolith deployed as a Cloudflare Worker through vinext. Supabase is the authenticated write model. Cloudflare R2 is the immutable public read model. Cloudinary stores signed media uploads, and Turnstile protects public contact submissions.

```text
Browser -> Next adapters -> application modules -> external adapters
                         |-> Supabase Auth/Postgres
                         |-> Cloudflare R2
                         |-> Turnstile
                         `-> Cloudinary
```

Route Handlers, Server Actions, and Server Components are adapters. Business rules and external-service orchestration live under `lib/` and expose small interfaces.

## Module map

| Module | Responsibility | External seams |
| --- | --- | --- |
| `lib/admin` | Admin authorization and CMS workspace commands | Supabase user client, release repository |
| `lib/contact` | Validate, challenge-check, privacy-hash, and persist contact messages | Turnstile verifier, contact repository |
| `lib/http` | Bounded request decoding, mutation-origin checks, stable responses | Web Request/Response |
| `lib/media` | Sign uploads and bind returned URLs to Cloudinary asset identity | Cloudinary, Supabase service client |
| `lib/publishing` | Compile and atomically publish one source revision | Publication source, release repository |
| `lib/release` | Canonical release format, integrity verification, rollback | Object store interface |
| `lib/platform` | Runtime-specific object-store adapters | Cloudflare R2 or local in-memory store |
| `lib/config` | Lazy, typed server configuration | Runtime environment |

The `ObjectStore` and contact verifier/repository seams have production and in-memory test adapters. Other implementation details stay private until a second adapter is justified.

## Publication invariants

1. A publish targets one exact CMS revision.
2. Release objects are immutable and content-indexed with SHA-256.
3. Files are uploaded and verified before the live manifest changes.
4. The manifest uses a conditional write, so concurrent publication cannot silently overwrite another release.
5. R2 is authoritative after the manifest switch; Supabase publication metadata is reconciliatory.
6. Rollback verifies every retained file before switching the manifest.

Release I/O uses bounded concurrency to reduce publish latency without issuing an unbounded request burst. R2 listings consume every pagination cursor.

## Security model

- Only allowlisted Supabase users can enter the admin data path.
- Service-role credentials are limited to server-only modules.
- Mutation endpoints reject explicit cross-site requests and validate media type, schema, and byte size.
- Public API errors use stable codes and do not return provider or configuration details.
- Contact IP addresses are never stored; a salted SHA-256 identifier supports rate limiting.
- The database serializes contact submissions per identifier to prevent concurrent rate-limit bypass.
- Global response headers set CSP, clickjacking, MIME-sniffing, referrer, permissions, and production HSTS policies.

## Change rules

- Keep framework adapters thin; add behavior to an existing `lib/` module when it shares an invariant.
- Test through the module interface rather than private implementation details.
- Do not add a new interface for a dependency until production and test/alternate adapters are both useful.
- Any release-format change requires a schema-version and renderer-compatibility decision.
- Any new server secret must be documented in `.env.example` and accessed through `lib/config/server.ts`.
