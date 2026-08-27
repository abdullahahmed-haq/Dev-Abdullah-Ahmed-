# Legacy baseline — 2026-08-26

This directory preserves the legacy application's content before the Next.js
migration changes any serializer or content model. It is a Phase 0 artifact of
the production migration plan.

## Snapshot

`legacy-content-20260826.tar.gz` is a source snapshot, captured from the
current working tree (including the user's uncommitted blog data). It contains:

- `data/site-content.json`
- `data/blog-posts.json`
- `data/blog-media/1405a3938a04e852ab78a4f545d2df03e143.png`

Archive SHA-256:

```text
8c0859f2da5ec2eeefbc44f5563dfd42afd1f3a901d17220c16ee0c227a79f70
```

Archive size: 2,508,165 bytes.

## Content inventory

| File | Size | SHA-256 |
| --- | ---: | --- |
| `data/site-content.json` | 1,227 bytes | `609741a26234a4ac647712cc75839468869c2216fee96e7757b5ff57a0c93f18` |
| `data/blog-posts.json` | 11,956 bytes | `06f8c3552e2a2f9bb604846af33c8a525a4475e45a6a814f65030d5ecec39438` |
| `data/blog-media/1405a3938a04e852ab78a4f545d2df03e143.png` | 2,515,868 bytes | `70c71a08cced6796568ca7598ef8140d5a8668a661ebd13163a80e453e815d87` |

The local image above is the only media file under `data/`; remote Unsplash
URLs are retained verbatim in the blog JSON and are not downloaded here.

## Reproducible baseline

- Legacy revision: `ada22e201fcc39bbaa72f09dd8001722b4eadd7d`
  (`feat: build bilingual editorial blog`)
- Runtime: Node.js `v22.23.2`
- Verification: `npm test` — 29 passing, 0 failing (run after the production
  build completed)
- Production build: `npm run build` — successful

| Output file | Size | Gzip size |
| --- | ---: | ---: |
| `dist/index.html` | 0.55 kB | 0.33 kB |
| `dist/assets/blog-editor-CzFaoIa3.css` | 12.68 kB | 3.03 kB |
| `dist/assets/blog-editor-abMnkVEf.js` | 21.67 kB | 6.89 kB |
| `dist/assets/index-_C8rcmXT.css` | 59.28 kB | 11.10 kB |
| `dist/assets/index-ByKdqCSe.js` | 398.38 kB | 125.18 kB |

## Protected working-tree changes

At capture, the following pre-existing user-owned changes were present and
were not modified:

- `data/blog-posts.json`
- `src/components/blog/blog-article-page.css`
- `src/components/blog/blog-article-page.jsx`

Future migration work must preserve these files or explicitly carry their
behavior and data forward with dedicated tests.
