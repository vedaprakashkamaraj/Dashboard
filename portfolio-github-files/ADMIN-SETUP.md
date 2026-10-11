# Private admin for the portfolio (Supabase + GitHub Pages)

## What changed
| File | Status |
|---|---|
| `index.html` (public Spider-Man portfolio) | **Unchanged.** It never had admin links; none were added. |
| `admin/index.html, admin.js, admin.css, config.js` | New, separate page at `/admin/`, not linked anywhere. |
| `supabase/schema.sql` | New. Tables, admin allow-list, Row Level Security. |

## Why Supabase
GitHub Pages is static, so real authentication has to live on a backend. Supabase gives you hosted Auth (hashed passwords, TOTP 2FA, rate limits), Postgres and Row Level Security (RLS), with a free tier and no server to run. Firebase would also work. Supabase fits better because the data rules are plain SQL you can read and audit.

**How it stays secure:** the browser only holds the *anon* key, which is public by design. Every read and write is checked by the database. A request counts as admin only if the user is in `public.admins` **and** signed in with 2FA (`aal2`). If someone edits the front-end JS, the database still refuses.

## Setup steps
1. **Create a project** at supabase.com, with a strong database password stored in a password manager.
2. **Disable public signups:** Authentication → Sign In / Providers → turn **off** "Allow new users to sign up". (Also leave other providers off.)
3. **Create yourself:** Authentication → Users → Add user → email + a 16+ character password, tick "Auto Confirm User".
4. **Password rules:** Authentication → Sign In / Providers → Email → minimum password length 12 or more. Turn on "Prevent use of leaked passwords" if your plan has it.
5. **Run the schema:** SQL Editor → paste `supabase/schema.sql` → Run. Then run the last line, with your email, to make yourself admin:
   `insert into public.admins (user_id) select id from auth.users where email = 'you@example.com';`
6. **URLs:** Authentication → URL Configuration → Site URL = `https://<user>.github.io/<repo>/`.
7. **Keys:** Project Settings → API. Copy **Project URL** and the **anon / public** key into `admin/config.js`.
   **Never** copy the `service_role` key anywhere in this repo.
8. **Pin integrity (recommended):** `curl -s https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js | openssl dgst -sha384 -binary | openssl base64 -A`
   Add `integrity="sha384-<hash>" crossorigin="anonymous"` to that `<script>` tag in `admin/index.html`. Or download the file into `admin/` and load it with `src="supabase.js"`, then remove `https://cdn.jsdelivr.net` from the CSP.
9. **Deploy:** copy the `admin/` folder next to your public `index.html` in the GitHub repo and push. Open `https://<user>.github.io/<repo>/admin/` (bookmark it).
10. **First login:** sign in, scan the QR code with an authenticator app, enter the code. Save the secret in your password manager as a backup. From then on every login asks for a code.
11. **Test the lock:** open a private window, run `curl "$SUPABASE_URL/rest/v1/messages?select=*" -H "apikey: $ANON"` → must return `[]` or a permission error, never your messages.

## Optional: hook up the public site (not required, nothing changes by default)
- **Contact form → inbox:** today it opens `mailto:`. To store messages instead, `POST` to `$SUPABASE_URL/rest/v1/messages` with the anon key and `{name,email,message}`. Add a hidden honeypot field, and enable CAPTCHA (Authentication → Attack Protection) or put an Edge Function in front if you get spam.
- **Dashboard-managed projects/skills:** the `projects` and `skills` tables are publicly readable. Fetch them in `index.html` only when you want them to replace the hard-coded `PROJ` and skills arrays. Fall back to the current arrays if the fetch fails, so the site never breaks.

## Hosting caveats (be honest about these)
- GitHub Pages cannot set HTTP headers, so the CSP is a `<meta>` tag. It cannot do `frame-ancestors` (clickjacking protection). For full headers, host `/admin/` on Cloudflare Pages or Netlify instead, and add `X-Frame-Options: DENY` plus HSTS.
- `/admin/` is public code. That is fine because it holds no secrets, but it is **obscurity-free security**: the lock is Auth + RLS, not a hidden URL.
- If your repo is public, the anon key is visible. That is expected. Do not store anything in these tables that you would not accept being protected by RLS alone.

## Security checklist
- [ ] Public signups disabled; only one admin user exists
- [ ] Password ≥ 12 chars, unique, in a password manager; leaked-password check on if available
- [ ] TOTP 2FA enrolled; backup secret stored
- [ ] RLS enabled on **every** table (`select tablename, rowsecurity from pg_tables where schemaname='public';` → all true)
- [ ] `is_admin()` requires `aal2` (2FA) and an `admins` row; no insert policy on `admins`
- [ ] Only anon key in the repo; `service_role` key and DB password never committed (search the repo history)
- [ ] Anonymous users can only INSERT into `messages` (verified with the curl test above)
- [ ] CDN script pinned to an exact version with SRI, or vendored locally
- [ ] CSP meta present; no `innerHTML` with data (UI uses `textContent` only)
- [ ] Login errors are generic; Supabase rate limits left enabled
- [ ] Idle auto sign-out (15 min) working; sign out on shared devices
- [ ] No admin links in the public nav; `admin/` has `noindex`
- [ ] Email confirmations and "secure password change" on; consider a custom SMTP for reliable reset emails
- [ ] GitHub account itself uses 2FA; protect the `main` branch
- [ ] Review Supabase Auth logs and Database → Advisors (Security) monthly
