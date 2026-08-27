<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Automatic preview deployment

After every user-requested change that affects the running application, run the
relevant verification and then `npm run deploy:preview` before reporting the
task complete. The command builds, updates, and smoke-tests the canonical
preview at:

`https://my-profile-next-preview.odd-andesaurus.workers.dev`

Never report a deployment as successful if the command or its smoke checks
fail. Documentation-only changes do not require deployment.
