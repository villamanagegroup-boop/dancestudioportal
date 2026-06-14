# Camp "starts tomorrow" emails

Reusable sender for the weekly camp welcome email (schedule flyer + what-to-bring +
tuition reminder w/ PayPal + Chanel's signature/logo). Sends one individual email
per household — no shared CC/BCC.

## Weekly checklist

1. Open `send-camp-email.mjs` and edit the **CONFIG** block:
   - `CAMP_ID` — the week's camp (id table is in the file header comment)
   - `WEEK_LABEL`, `THEME`, `THEME_EMOJI`, `DATES`, `SUBJECT`
   - `HIGHLIGHTS` — that week's daily activities
   - `SHOWCASE` — `{ enabled, day, time }` (set `enabled:false` to drop the section)
   - `FLYER_PATH` — absolute path to that week's schedule flyer image
   - `PAYPAL_LINK` — payment link for that week's balances
   - `EXCLUDE` — emails to skip in live mode (e.g. the `villamanagegroup@` test account)
2. **Test first** (default — `MODE:'test'` only emails `TEST_TO`):
   ```
   node scripts/camp-emails/send-camp-email.mjs
   ```
3. Preview the inbox. When it looks right, set `MODE:'live'` and run again. It
   prints the household list (with SKIP/send per address) then sends.

Run from the **repo root** so `.env.local` resolves (needs `RESEND_API_KEY`,
`RESEND_FROM_EMAIL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).

## Notes

- Live recipients come from the camp roster (`camp_registrations` → primary
  guardian email), deduped by household. `STATUSES` controls which registration
  statuses get emailed (default `['registered']`).
- From / reply-to is `info@capitalcoredance.com` (the Resend-verified domain),
  even though the signature lists `info@capitalcoredancestudio.com`.
- Constant across weeks: drop-off/care times, pick-up structure, what-to-bring,
  allergy/medical section, signature. Only the theme/dates/highlights/flyer change.

## History

- 2026-06-14 — Week 1 Rainbow Remix sent live to 7 households (Evie Gray /
  `villamanagegroup@` test account excluded).
