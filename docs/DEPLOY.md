# Deploying Nexus Docs (Mintlify)

## Local preview

```bash
cd docs
npx mintlify@latest dev
```

Open `http://localhost:3000` (Mintlify dev server).

## Deploy to Mintlify Cloud

1. Create a free account at [mintlify.com](https://mintlify.com)
2. Install the [Mintlify GitHub App](https://mintlify.com/docs/settings/github) on `Akash8585/nexus`
3. Set the **docs directory** to `docs`
4. Mintlify reads `docs.json` (or legacy `mint.json`) for navigation and branding
5. Push to `main` — Mintlify auto-deploys on each commit

After deploy, update these URLs to your live docs site (e.g. `https://your-project.mintlify.app`):

- `nexus/README.md` — Documentation link
- `dashboard/app/page.tsx` — footer and nav Docs link

## Configuration

| File | Purpose |
| --- | --- |
| `docs.json` | Primary Mintlify config (navigation, colors, navbar) |
| `mint.json` | Legacy alias — same structure for older tooling |

Brand colors match the dashboard (`DESIGN.md`):

- Primary: `#00D992`
- Canvas: `#101010`
