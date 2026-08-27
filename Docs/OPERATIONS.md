# Operations Runbook

## Required gates

Run the same gate used by CI before merging or deploying:

```sh
npm ci
npm run verify
```

`verify` runs behavioral tests, Next.js route type generation, strict TypeScript, vinext compatibility analysis, and the production Worker build.

## Configuration

Use `.env.local` only for local development. Cloudflare secrets must hold server-only values. Never place real credentials in `.env.example`, source files, logs, or CI output.

Required production bindings and values:

- `PORTFOLIO_RELEASES`: private R2 bucket binding.
- Supabase public URL/key and server URL/service key.
- Turnstile site/secret keys and a high-entropy `CONTACT_RATE_SALT`.
- Cloudinary cloud name, API key, and API secret.
- `NEXT_PUBLIC_SITE_ORIGIN`: canonical HTTPS origin.

## Deployment

```sh
npm run predeploy
npm run deploy
```

For the canonical public preview, use `npm run deploy:preview`. While actively
editing locally, `npm run deploy:watch` watches the source tree, debounces file
changes, builds the latest stable state, deploys it, and verifies `/en`, the
production CSP, and `/robots.txt`. Generated directories are excluded so a
build cannot trigger an infinite deployment loop. A failed build leaves the
previous Worker deployment active.

The temporary Cloudflare account is suitable only during the claim window. For
continuous deployment after claiming it, authenticate Wrangler locally or set
both `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in the deployment
environment. Never commit either value.

Pushes to `main` run `.github/workflows/deploy-cloudflare.yml`. Configure the
repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`; the API
token should be scoped to the claimed account and grant Workers Scripts edit
access. The workflow verifies the application before deployment and smoke-tests
both locales afterward.

After deployment, verify the localized public routes, canonical redirects, `/robots.txt`, `/sitemap.xml`, both RSS feeds, unauthenticated admin redirect, authenticated draft save, publish, and rollback. Confirm CSP and cache headers from the deployed edge, not only the Next.js development server.

## Recovery

- Publication failure before the manifest switch leaves the existing site unchanged.
- Reconciliation failure after the switch leaves R2 live and is repaired on a later admin operation.
- Roll back from the admin release list; the repository verifies the target release before switching.
- Supabase logical backups run daily through `.github/workflows/supabase-backup.yml`. Periodically perform a restore drill in an isolated project; an untested backup is not a recovery plan.

## Incident checklist

1. Stop further publication if integrity or credential exposure is suspected.
2. Preserve Worker request IDs, timestamps, and provider audit logs without copying message content or secrets.
3. Roll back the manifest if the current release is defective.
4. Rotate affected Supabase, Turnstile, Cloudinary, or Cloudflare credentials.
5. Re-run `npm run verify`, deploy, and record the cause and prevention action.
