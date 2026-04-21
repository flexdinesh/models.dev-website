# models.dev-website

A faster website for browsing `models.dev` data. Built with React + vite and deployed to Cloudflare workers with SST.

## Prereqs

- Bun
- Cloudflare account
- Cloudflare API token with Workers access
- Optional: `CLOUDFLARE_DEFAULT_ACCOUNT_ID`

## Install

```bash
bun install
```

## Local dev

Start Vite:

```bash
bun run dev
```

Build production assets:

```bash
bun run build
```

Preview production build:

```bash
bun run preview
```

## Deploy

Set Cloudflare creds in your shell:

```bash
export CLOUDFLARE_API_TOKEN="..."
export CLOUDFLARE_DEFAULT_ACCOUNT_ID="..."
```

See planned infra changes:

```bash
bun run diff --stage=production
```

If this is the first deploy for the stage, `sst diff` can fail with `stage not found`. Run deploy once, then diff will work on later changes.

Deploy:

```bash
bun run deploy --stage=production
```

SST builds the Vite app, uploads `dist/`, and deploys a Cloudflare Worker that serves assets and handles SPA fallback.

## GitHub Actions deploy

Auto-deploy runs on pushes to `main`.

Repo secrets required:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_DEFAULT_ACCOUNT_ID`

Manual trigger is also available in GitHub Actions.
