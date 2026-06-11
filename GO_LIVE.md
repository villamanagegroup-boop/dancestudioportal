# Go-Live Runbook

**Forward-only.** The RLS lockdown is already applied in Supabase. Old production
code + locked RLS = broken member portals. The only working state is *new code
deployed*. Do not roll back the code.

## 1. Merge
Merge the open PR (`feat/intake-inbox` → `master`).

## 2. Deploy
Vercel auto-builds Production on merge to `master`. Wait for **Ready** (green).
If the build fails, stop and fix — don't proceed.

## 3. Verify security (signed in as admin/owner)
- `GET /api/health/rls` → expect `{ "secure": true }`. If EXPOSED, the anon key can
  still read rows → re-check `rls_lockdown.sql` ran.
- Admin pages load (`/dashboard`, `/families`, `/policies`).
- "Viewing as" a family shows that family's real account/billing.

## 4. Verify member isolation (parent login / incognito)
- Parent → `/portal` loads.
- Parent → `/dashboard` **redirects to `/portal`**.
- Parent → `POST /api/camps` and `POST /api/accounts/<id>/roles` return **403**.

## 5. Verify money + signups
- A `/pay/<link>` checkout link loads and pays (logged out).
- Stripe/PayPal + site-intake webhooks still return 200.
- Signup flow works.

## Auth model (how it's secured)
- App + member portals read/write via the **service-role** client (bypasses RLS);
  the public anon key is **default-denied** by RLS on every table.
- `src/proxy.ts` centrally gates admin pages + admin APIs to staff; public/member/
  payment/webhook prefixes are an **anchored** allowlist
  (`/api/auth`, `/api/portal`, `/api/account`, `/api/stripe`, `/api/paypal`,
  `/api/checkout`, `/api/intake/from-site`).
- The proxy **bypasses in local dev**, so all of the above must be verified in prod.

## Multi-tenant status
Groundwork only: `tenants` table + nullable `tenant_id` on all tables (backfilled to
one tenant). Not yet enforced. Future phases: tenant resolution by host, tenant-scoped
roles, tenant-enforcing RLS.

## If something breaks
Almost always an unfinished/incorrect deploy, not the DB. Confirm the Vercel
**Production** deployment is **Ready** and current. Do not revert code (old code is the
broken state). Capture the `/api/health/rls` output for triage.
