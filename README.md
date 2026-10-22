# Portoku

Personal portfolio with Astro SSR, React, Cloudflare D1/R2, Prisma, and Google OAuth allowlist admin.

## Requirements

- Node.js 22+
- pnpm 10+
- Cloudflare account for remote D1/R2 deployment

## Local setup

```bash
pnpm install
copy .env.example .env
copy .env.example .dev.vars
```

Set `DEFAULT_ADMIN_EMAIL` and `PUBLIC_SITE_URL` in both files. Astro reads `.env` at build time; the Cloudflare runtime (including `astro dev`) reads `.dev.vars`. OAuth credentials and other runtime secrets belong in `.dev.vars` locally and in Cloudflare secrets in production.

Generate Prisma client and apply local migration:

```bash
pnpm db:generate
pnpm db:migrate:local
pnpm db:seed
pnpm dev
```

Dev server command required by project harness:

```bash
astro dev --background
```

## Google OAuth

1. Open Google Cloud Console.
2. Create OAuth client credentials for a Web application.
3. Add local redirect URI:
   `http://localhost:4321/api/auth/google/callback`
4. Add production redirect URI:
   `https://YOUR_DOMAIN/api/auth/google/callback`
5. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and matching `GOOGLE_REDIRECT_URI` in `.dev.vars` or Cloudflare secrets.
6. Set `DEFAULT_ADMIN_EMAIL` to verified Google email.

## Cloudflare

Create D1 database and R2 bucket, then replace `database_id` and bucket values in `wrangler.jsonc`.

```bash
wrangler d1 create portoku
wrangler r2 bucket create portoku-media
pnpm db:migrate:remote
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put GOOGLE_REDIRECT_URI
wrangler secret put DEFAULT_ADMIN_EMAIL
wrangler secret put PUBLIC_SITE_URL
pnpm build
wrangler deploy
```

R2 stays private. Images are served through `/media/...`.

## Checks

```bash
pnpm check
pnpm build
pnpm audit
```

## Structure

- `src/lib`: D1, Prisma, auth, validation, CSRF, rate limiting, audit
- `src/pages/api`: OAuth, contact, admin APIs
- `src/pages/admin`: admin UI
- `prisma`: schema, migration, seed
- `SECURITY.md`: threat model and OWASP control map
