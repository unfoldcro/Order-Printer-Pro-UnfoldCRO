# Configuration Reference — Order Docs Printer

This page lists every field you must fill in before the app will work.
There are **two config files** and **one in-app settings page**.

---

## 1. `.env` file (copy from `.env.example`)

```bash
cp .env.example .env
```

| Variable | Required | What it is | Where to get it |
|---|---|---|---|
| `SHOPIFY_API_KEY` | ✅ Yes | Public API key / Client ID for your Shopify app | [partners.shopify.com](https://partners.shopify.com) → Apps → *Your App* → App setup |
| `SHOPIFY_API_SECRET` | ✅ Yes | Private API secret / Client secret | Same page — keep this private, never commit |
| `SCOPES` | ✅ Yes | OAuth access scopes | Leave as `read_orders,read_customers` (already set) |
| `SHOPIFY_APP_URL` | ✅ Yes | Public HTTPS URL where this app is hosted | Your server URL or ngrok tunnel URL (e.g. `https://abc123.ngrok.io`) |
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string | Your database provider (see formats below) |
| `SENDGRID_API_KEY` | ⚠️ Email only | SendGrid API key for outbound email | [app.sendgrid.com/settings/api_keys](https://app.sendgrid.com/settings/api_keys) — needs "Mail Send" permission |

### `DATABASE_URL` format examples

```
# Local PostgreSQL
postgresql://postgres:password@localhost:5432/order_docs_printer

# Fly.io (internal)
postgresql://user:pass@fly-db.internal:5432/order_docs_printer

# Railway
postgresql://postgres:pass@containers-us-west-1.railway.app:6543/railway

# Supabase
postgresql://postgres:pass@db.xxxx.supabase.co:5432/postgres

# Render
postgresql://user:pass@dpg-xxxx.render.com:5432/order_docs_printer
```

### `SHOPIFY_APP_URL` — local development

Use a tunnel to expose your local server over HTTPS:

```bash
# ngrok (free tier)
ngrok http 3000
# → copy the https://xxxx.ngrok.io URL into SHOPIFY_APP_URL

# Cloudflare Tunnel (free, no account needed for quick tests)
cloudflared tunnel --url http://localhost:3000
```

---

## 2. `shopify.app.toml` file

Two fields need updating:

| Field | What to put |
|---|---|
| `client_id` | Your Shopify app's **API key** (same as `SHOPIFY_API_KEY`) |
| `application_url` | Your public HTTPS app URL (same as `SHOPIFY_APP_URL`) |

Also update all three `redirect_urls` — replace `YOUR_APP_URL` with the same URL.

```toml
client_id = "abc123def456"               # ← your API key
application_url = "https://my-app.fly.dev"

[auth]
redirect_urls = [
  "https://my-app.fly.dev/auth/callback",
  "https://my-app.fly.dev/auth/shopify/callback",
  "https://my-app.fly.dev/api/auth/callback"
]
```

---

## 3. In-App Settings Page (`/app/settings`)

After the app is running and installed on a store, fill these in via the UI:

| Field | Required | Description |
|---|---|---|
| **Enable auto-send** | — | Toggle to turn on automatic email delivery |
| **Trigger event** | ✅ When enabled | `Order Created` or `Order Paid` — which event fires the email |
| **Email Subject** | ✅ When enabled | Subject line for outbound emails. Supports `{{order.name}}` token |
| **From Name** | ✅ When enabled | Display name shown as the email sender (e.g. "Acme Store") |
| **From Email** | ✅ When enabled | Verified sender address in SendGrid (must be verified in your SendGrid account) |

> **SendGrid sender verification**: The "From Email" address must be verified in your SendGrid account under  
> Settings → Sender Authentication → Single Sender Verification.

---

## Quick Checklist

```
□ Copy .env.example → .env
□ Fill SHOPIFY_API_KEY  (from Shopify Partner Dashboard)
□ Fill SHOPIFY_API_SECRET  (from Shopify Partner Dashboard)
□ Fill SHOPIFY_APP_URL  (your public HTTPS URL / ngrok tunnel)
□ Fill DATABASE_URL  (your PostgreSQL connection string)
□ Fill SENDGRID_API_KEY  (from SendGrid — only needed for auto-email)
□ Update shopify.app.toml → client_id  (same as SHOPIFY_API_KEY)
□ Update shopify.app.toml → application_url + redirect_urls  (same as SHOPIFY_APP_URL)
□ Run: npx prisma migrate dev
□ Open /app/settings in the installed app and fill From Name + From Email
```

---

## Where Each Value Comes From

### Shopify Partner Dashboard

1. Go to [partners.shopify.com](https://partners.shopify.com)
2. Click **Apps** in the left sidebar
3. Click **Create app** (or open an existing app)
4. Under **App setup**, copy:
   - **API key** → `SHOPIFY_API_KEY` + `client_id`
   - **API secret key** → `SHOPIFY_API_SECRET`
5. Under **App setup → URLs**, set:
   - **App URL** → your `SHOPIFY_APP_URL`
   - **Allowed redirection URL(s)** → your three redirect URLs

### SendGrid

1. Go to [app.sendgrid.com](https://app.sendgrid.com)
2. Navigate to **Settings → API Keys**
3. Click **Create API Key**
4. Choose **Restricted Access**, enable **Mail Send → Full Access**
5. Copy the key (starts with `SG.`) → `SENDGRID_API_KEY`
6. Also verify your sender: **Settings → Sender Authentication**
