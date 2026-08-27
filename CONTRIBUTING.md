# Contributing

Use Node.js from `.nvmrc` and install from the committed lockfile with `npm ci`.

Before opening a change:

```sh
npm run verify
```

Keep route files focused on translating HTTP/Next.js inputs and outputs. Put business invariants in the appropriate `lib/` module and test them through that module's interface. Preserve the immutable-release and conditional-manifest guarantees. Schema changes require an additive Supabase migration; never edit an applied migration.

Do not commit `.env.local`, provider credentials, production content exports, database dumps, or generated build directories. Frontend visual changes require an explicit product-design scope and visual regression evidence.
