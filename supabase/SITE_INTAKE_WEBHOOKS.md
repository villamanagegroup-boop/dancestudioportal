# Site → Portal intake webhooks

How public website (capitalcoredance.com) form submissions flow into the portal's
`site_intake` triage inbox.

## Flow

```
website form  →  website Supabase (ftoevxwdtznxzioljahd)  →  Database Webhook (per table, on INSERT)
                                                                   │  POST {type,table,record,...}
                                                                   ▼
                          https://studio.capitalcoredance.com/api/intake/from-site
                                                                   │  (verifies x-intake-secret)
                                                                   ▼
                                          portal Supabase (vbldwxsrpmsfvgloaboe): site_intake (status 'new')
```

A Supabase Database Webhook fires **only on new INSERTs after it is created** — it never
backfills existing rows. Add the webhook first; recover any pre-existing rows with
`scripts/backfill-site-intake.mjs`.

## The 7 form tables (all mapped in /api/intake/from-site)

| website table                | intake source_form | webhook needed |
| ---------------------------- | ------------------ | -------------- |
| `contact_submissions`        | contact            | ✅ exists       |
| `camp_registrations`         | camp               | ✅ exists       |
| `recital_orders`             | recital_order      | ✅ exists       |
| `summer_class_registrations` | summer_class       | ❌ ADD           |
| `adult_series_interest`      | adult_series       | ❌ ADD           |
| `birthday_bookings`          | birthday           | ❓ verify/ADD    |
| `recital_shirt_orders`       | recital_shirt      | ❓ verify/ADD    |

(Status as of 2026-06-08: confirmed-missing = summer_class, adult_series. birthday /
recital_shirt had 0 rows in the portal and anon reads are RLS-blocked, so add a webhook
if the dashboard doesn't already list one.)

## Create a webhook (per missing table)

Supabase dashboard → project **ftoevxwdtznxzioljahd** → **Database → Webhooks → Create a new hook**:

- **Name:** `intake_<table>` (e.g. `intake_summer_class`)
- **Table:** `public.<form table>`
- **Events:** ☑ Insert  (leave Update / Delete unchecked — receiver ignores them)
- **Type:** HTTP Request
- **Method:** `POST`
- **URL:** `https://studio.capitalcoredance.com/api/intake/from-site`
- **HTTP Headers:**
  - `Content-Type: application/json`
  - `x-intake-secret: <same value as the existing camp/contact webhook>`
- **Payload:** default (Supabase sends `{ type, table, schema, record, old_record }`)

> The `x-intake-secret` value must equal the portal's `SITE_INTAKE_SECRET` (set in Vercel).
> Copy it from an existing working webhook (e.g. `intake_camp`) — don't invent a new one,
> or the receiver returns 401.

## Verify

After saving, submit a test entry on the live form (or insert a test row), then check the
portal `/intake` inbox. To recover anything submitted before the webhook existed:

```
node scripts/backfill-site-intake.mjs            # dry run
node scripts/backfill-site-intake.mjs --commit   # write missing rows
```

Backfill is idempotent (dedupes on `source_row_id`). RLS-blocked tables
(contact, birthday, recital_orders, recital_shirt) require the website service-role key,
passed as `SITE_SERVICE_ROLE_KEY`, to be read by the backfill script.
