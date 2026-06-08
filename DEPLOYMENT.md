# BuildWatch — Pre-Deployment Checklist

## Environment Variables (set on Vercel)

### 1. `JWT_SECRET` — Generate a strong random secret

Signs session tokens. If compromised, anyone can forge a login session.

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Copy the output and set as `JWT_SECRET` in Vercel Project Settings → Environment Variables.

---

### 2. `FLW_CLIENT_ID`, `FLW_CLIENT_SECRET`, `FLW_SECRET_HASH` — Flutterwave payments

For processing subscription payments and webhooks.

1. Go to https://dashboard.flutterwave.com → Settings → API Keys
2. Copy **Public Key** → `FLW_CLIENT_ID`
3. Copy **Secret Key** → `FLW_CLIENT_SECRET`
4. In **Webhooks**, set URL to `https://yourdomain.com/api/payments/webhook`
5. Copy the **Webhook Secret Hash** → `FLW_SECRET_HASH`

> No Flutterwave account? Set all three to any placeholder string for now — payments won't work but the app won't crash.

---

### 3. `R2_*` — Cloudflare R2 (photo storage)

Without these, photo uploads fall back to the dev mock endpoint.

1. Go to https://dash.cloudflare.com → **R2**
2. Create a bucket (e.g. `buildwatch-photos`) → `R2_BUCKET_NAME`
3. **R2 → Overview** → Copy **Account ID** → `R2_ACCOUNT_ID`
4. **Manage R2 API Tokens** → **Create API Token** (Object Read & Write)
   - Access Key ID → `R2_ACCESS_KEY_ID`
   - Secret Access Key → `R2_SECRET_ACCESS_KEY`
5. In bucket settings → **Public Access** → allow public access

---

### 4. `RESEND_API_KEY` — Transactional email

For invite emails, notifications, weekly digests.

1. Go to https://resend.com → Sign up (free: 100 emails/day)
2. **API Keys** → Create API Key → `RESEND_API_KEY`
3. **Domains** → Add your domain → follow DNS setup instructions
   - Makes `from: 'notifications@buildwatch.app'` work

---

### 5. `DEEPSEEK_API_KEY` — AI analysis engine

**⚠️ The old key (`sk-d22c0e8b5d4e448ca517f5de96a694c6`) is committed in `.env.local` — regenerate it.**

1. Go to https://platform.deepseek.com → **API Keys**
2. **Revoke the old key** immediately
3. **Create a new key** → set as `DEEPSEEK_API_KEY`
4. Remove the old key from `.env.local`

---

### 6. `CRON_SECRET` — Protect cron endpoints

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

Set as `CRON_SECRET`. Used by `/api/cron/heartbeat` and `/api/cron/weekly-digest`.

---

### 7. `NEXT_PUBLIC_APP_URL` — Production domain

`https://yourdomain.com` (no trailing slash). Used for invite links, email URLs, fallback URLs.

---

### 8. `DATABASE_URL` — Production database

1. Go to https://console.neon.tech → create a production project
2. **Connection Details** → copy the PSQL connection string
3. Format: `postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`
4. Set as `DATABASE_URL`

---

## All 13 Environment Variables

| Variable | Source |
|---|---|
| `DATABASE_URL` | Neon console |
| `JWT_SECRET` | `crypto.randomBytes(48)` |
| `FLW_CLIENT_ID` | Flutterwave dashboard |
| `FLW_CLIENT_SECRET` | Flutterwave dashboard |
| `FLW_SECRET_HASH` | Flutterwave webhook setup |
| `DEEPSEEK_API_KEY` | DeepSeek platform (regenerated) |
| `R2_ACCOUNT_ID` | Cloudflare R2 dashboard |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 API token |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 API token |
| `R2_BUCKET_NAME` | Your bucket name |
| `RESEND_API_KEY` | Resend dashboard |
| `CRON_SECRET` | `crypto.randomBytes(24)` |
| `NEXT_PUBLIC_APP_URL` | `https://yourdomain.com` |

Add all to **Vercel → Project Settings → Environment Variables → Production**. Redeploy after setting.

---

## Security: `.env.local` git hygiene

```bash
# Ensure .env.local is not tracked
git rm --cached .env.local

# Verify .gitignore has:
echo ".env*" >> .gitignore
```

---

## Verify deployment

```bash
# Run the build locally first
npm run build

# Run tests
npm test

# Deploy to Vercel
npx vercel --prod
```
