# Nexus Documentation (Nextra)

Self-hosted documentation site built with [Nextra 4](https://nextra.site). Styled with Nexus brand tokens from `DESIGN.md` (`#00D992` primary, `#101010` canvas).

## Run locally

```bash
cd docs
npm install
npm run dev
```

Open **http://localhost:3001**

The dashboard landing page links here. Run the dashboard separately on port 3000.

## Project structure

```
docs/
├── app/              # Next.js + Nextra layout
├── content/          # All MDX pages (35 pages)
│   ├── introduction.mdx
│   ├── quickstart.mdx
│   ├── concepts/
│   ├── sdk/
│   ├── api/
│   ├── guides/
│   ├── dashboard/
│   ├── deployment/
│   ├── faq.mdx
│   └── contributing.mdx
├── public/           # Logo, favicon
└── mdx-components.tsx
```

Nextra reads MDX from `content/`. URLs map as `/introduction`, `/concepts/agents`, etc.

## Build for production

```bash
npm run build
npm run start
```

Deploy as a standalone Next.js app (Vercel, Railway, or your VPS).

## Why Nextra instead of Mintlify?

- No external account or hosted dependency
- Same dark theme as the Nexus dashboard
- Full control over layout and components
- Docs live in your repo and deploy with your stack
