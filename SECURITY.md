# Security

## Threat model

| Asset | Main threats | Primary mitigations |
|---|---|---|
| Admin account/session | OAuth CSRF, stolen cookies, stale access | PKCE/state, `HttpOnly` secure cookie, hashed server session, expiry, allowlist recheck |
| D1 content and messages | Unauthorized mutation, injection, IDOR | middleware deny-by-default, CSRF + Origin checks, Zod validation, Prisma parameterized queries |
| R2 media | Upload abuse, public draft exposure, path traversal | private bucket, magic-byte validation, 5 MB cap, generated keys, validated `/media` access |
| Contact endpoint | Spam, oversized payloads | honeypot, D1 rate limiting, strict body schema |

## OWASP Top 10:2025 mapping

| Control | Implementation |
|---|---|
| A01 Broken Access Control | `src/middleware.ts` protects `/admin/*` and `/api/admin/*`; `src/lib/session.ts` rechecks `AdminEmail`; `src/pages/media/[...key].ts` validates key and public object reference; public queries in `src/lib/public.ts` select published projects only. |
| A02 Security Misconfiguration | `src/middleware.ts` sets CSP, frame, nosniff, referrer and permissions headers; `wrangler.jsonc` binds private D1/R2; `.gitignore` excludes secret files; `.env.example` documents required values. |
| A03 Software Supply Chain Failures | `pnpm-lock.yaml` committed; `package.json` defines deterministic generation; CI should run `pnpm install --frozen-lockfile` and `pnpm audit`. Dependabot remains deployment-repository configuration. |
| A04 Cryptographic Failures | `src/lib/crypto.ts` uses Web Crypto CSPRNG and SHA-256; `src/lib/session.ts` stores only token hashes; auth cookies are HttpOnly, Secure, SameSite=Lax and host-prefixed. |
| A05 Injection | `src/lib/validation.ts` validates all server input; routes use Prisma methods, not unsafe raw SQL; `src/lib/validation.ts` limits saved URLs to HTTP(S); upload magic-byte checks in `src/pages/api/admin/upload.ts`. No user HTML rendering APIs are used. |
| A06 Insecure Design | Threat model above; `src/lib/rate-limit.ts` protects contact/auth; `src/lib/csrf.ts` and admin routes protect mutations; `src/pages/api/admin/[resource]/[id].ts` applies anti-lockout rules. |
| A07 Authentication Failures | `src/pages/api/auth/google.ts` and callback implement OAuth PKCE/state; callback rejects unverified/unauthorized emails; `src/lib/session.ts` enforces idle and absolute expiry; logout deletes DB session. |
| A08 Software or Data Integrity Failures | All request values are parsed as untrusted input; no `eval`/dynamic code; deploy secrets belong in Cloudflare/GitHub secret stores. |
| A09 Security Logging & Alerting Failures | `src/lib/audit.ts` records auth, CRUD, upload, allowlist and logout actions without secrets/message bodies; `/admin/audit` is read-only. TODO: alert on repeated login denials from same IP hash. |
| A10 Exceptional Conditions | Auth middleware fails closed; API handlers return generic errors; external OAuth and R2 calls are caught; upload cleanup avoids orphaned objects where possible; custom error pages supplied by public UI. |

## Release status — incomplete

Build and type-check pass, but this is not a completed security certification or production-ready release. End-to-end OAuth, authenticated CRUD, uploads, and browser CSP behavior have not been verified. Remaining release blockers include strict style CSP (currently `unsafe-inline`), image replacement/deletion cleanup and retry coverage, atomic rate-limit concurrency verification, complete fail-fast environment validation, upload lifecycle tests, CI/dependency automation, and Lighthouse/browser accessibility checks. The control table describes intended implementation locations, not proof that every PRD acceptance criterion is satisfied.

## Operations

- Set production secrets only with `wrangler secret put`.
- Use HTTPS production domain. HSTS applies only there.
- Run `pnpm audit` before release. Resolve all high/critical findings or record justified exception.
- Restrict Google OAuth authorized redirect URIs to listed local and production callback URLs.
- Keep R2 bucket public access disabled.

## Contact injection review (2026-10-22)

Scope: `/contact`, `/api/contact`, message storage, and `/admin/messages`.

- No executable injection sink was found in the reviewed contact flow. Prisma `message.create` stores values as data; Astro text expressions render name, email, and body with escaping. The Workers application has no PHP execution path for contact input. Keep these values out of raw HTML, dynamic code, shell commands, and SQL concatenation.
- Fixed (Low): the 64 KB request cap trusted `Content-Length`. `src/lib/contact.ts` now bounds actual streamed bytes before JSON/form parsing, including requests with missing or misleading length headers.
- Request hardening: accept only JSON, URL-encoded, or multipart data; validate a strict field allowlist and string types; reject duplicate form fields, file values, and ambiguous `body`/`message` fields. Existing public submission, honeypot, rate limit, and generic error responses remain in place.
- Content is intentionally preserved as plain text, including code snippets and apostrophes. Blocking code-like substrings is not an injection defense; output escaping and parameterized storage are required even for old records.
- Regression command: `pnpm exec tsx --test tests/contact.test.mjs`. The 13 tests cover legitimate submissions, HTML/XSS/PHP/SQL/template payload preservation, Astro escaping, malformed inputs, unexpected fields, forms/files, and actual byte limits. Output/storage checks include source assertions; these are not a browser or live database end-to-end test.
- Limits: no production testing, authenticated browser session, or deployed Cloudflare configuration verification was performed. This review does not establish zero risk or resolve the unrelated release blockers above.

