## Title
Deploy `models.dev-website` to Cloudflare with SST

## Summary
Use SST v3 with Cloudflare, following `../models.dev`'s `sst.config.ts` shape: build the Vite app, deploy a Cloudflare Worker with static assets, and use the Worker mainly as an asset host plus SPA fallback. Keep data and logo fetches pointing at `https://models.dev/...`. Add GitHub Actions deploy on `main` to `production`.

## Key implementation changes
1. Add SST runtime deps and config.
   - Update `package.json`
   - Add `sst.config.ts`
   - Add `sst-env.d.ts`
   - Add `deploy` script and optional helper scripts like `diff`
2. Add a minimal Cloudflare Worker entrypoint.
   - Serve built assets from `env.ASSETS`
   - Rewrite `/`, `/index`, and `/index.html` to the built HTML
   - Rewrite unknown non-file paths to the app shell for SPA fallback
3. Keep Vite output shape as-is.
   - No `_index` or `_api` remap needed
   - Worker maps app requests to `/index.html`
4. Add CI deploy workflow.
   - `.github/workflows/deploy.yml`
   - Trigger on push to `main` and `workflow_dispatch`
   - Setup Bun, install deps, deploy with `bun run deploy --stage=production`
   - Pass `CLOUDFLARE_API_TOKEN` and optional `CLOUDFLARE_DEFAULT_ACCOUNT_ID`
5. Keep app fetch behavior unchanged.
   - `src/App.tsx` keeps `https://models.dev/api.json`
   - `src/Table.tsx` keeps `https://models.dev/logos/...`

## Tests or verification
1. `bun install`
2. `bun run build`
3. `bun run diff --stage=production`
4. If possible, `bun sst dev`
5. Confirm the deployed workers.dev URL loads and app network requests succeed

## Decisions made by user
- Use repo name in SST app config
- Keep direct `https://models.dev/...` fetches
- Use `workers.dev` only
- Add GitHub Action deploy
- Auto deploy from `main`
- Deploy SST stage `production`
- Deploy script name: `deploy`

## Tradeoffs and risks discussed
- Direct `models.dev` fetch is the smallest change, but the deployed app is not self-contained.
- If `models.dev` changes CORS or availability, this site can break.
- Same-origin proxy would be more robust, but intentionally skipped.
- Worker remains useful for Cloudflare hosting and SPA fallback.

## Remaining open questions
None.

## Execution guidance
If implementation deviates from this plan, update this file to reflect the latest approved plan and surface the deviation to the user.
