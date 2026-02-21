# Deploying to Render — Exact Values for Every Field

> **✅ API updated in Render** — Environment variables have been set.
> The live service URL is: **https://order-printer-pro-unfoldcro.onrender.com**
>
> Remaining steps are highlighted below.

---

## Form Fields — What to Enter

### Basic settings

| Field | Value to enter |
|---|---|
| **Name** | `Order-Printer-Pro-UnfoldCRO` |
| **Language / Runtime** | `Docker` |
| **Branch** | `copilot/add-document-templates-feature` |
| **Region** | `Singapore (Southeast Asia)` *(or match your existing services)* |
| **Root Directory** | *(leave blank)* |
| **Dockerfile Path** | `./Dockerfile` *(this is the default — leave blank)* |

---

## Environment Variables — Status

| NAME | VALUE | Status |
|---|---|---|
| `SHOPIFY_API_KEY` | *(your API key)* | ✅ Set in Render |
| `SHOPIFY_API_SECRET` | *(your API secret)* | ✅ Set in Render |
| `SHOPIFY_APP_URL` | `https://order-printer-pro-unfoldcro.onrender.com` | ✅ Set in Render |
| `SCOPES` | `read_orders,read_customers` | ✅ Set in Render |
| `DATABASE_URL` | *(Internal Database URL from Render Postgres)* | ✅ Set in Render |
| `SENDGRID_API_KEY` | `SG.xxxxxxxxxxxxxxxxxx` | ✅ Set in Render |
| `NODE_ENV` | `production` | ✅ Set in Render |
| `PORT` | `3000` | ✅ Set in Render |

---

## ⚠️ Remaining Steps After API Update

Now that the API keys are set in Render, complete these steps so Shopify
can communicate with your app:

### 1. Update Shopify Partner Dashboard — App URL

1. Go to [partners.shopify.com](https://partners.shopify.com) → **Apps** → your app
2. Click **App setup**
3. Set **App URL** to:
   ```
   https://order-printer-pro-unfoldcro.onrender.com
   ```
4. Set **Allowed redirection URL(s)** to these three values:
   ```
   https://order-printer-pro-unfoldcro.onrender.com/auth/callback
   https://order-printer-pro-unfoldcro.onrender.com/auth/shopify/callback
   https://order-printer-pro-unfoldcro.onrender.com/api/auth/callback
   ```
5. Click **Save**

### 2. Update `shopify.app.toml` — client_id

Open `shopify.app.toml` and replace `YOUR_SHOPIFY_API_KEY` with your actual
Shopify API key (the same value you put in `SHOPIFY_API_KEY` on Render):

```toml
client_id = "your_actual_api_key_here"
```

The `application_url` and `redirect_urls` are already updated to the live Render URL.

### 3. Install the app on your test store

Visit:
```
https://order-printer-pro-unfoldcro.onrender.com/?shop=your-store.myshopify.com
```

Or install via Shopify Partner Dashboard → **Apps** → your app → **Test on development store**.

### 4. Run database migrations (if not done automatically)

If migrations didn't run on deploy, trigger them manually:

1. Render Dashboard → your web service → **Shell**
2. Run:
   ```bash
   npx prisma migrate deploy
   ```

### 5. Verify the app is live

- Open `https://order-printer-pro-unfoldcro.onrender.com` — should redirect to Shopify OAuth
- Check Render logs: Dashboard → your service → **Logs**

---

## Step-by-Step: Deploying via Render Dashboard (Manual)

### 1. Create a PostgreSQL database first

1. Render Dashboard → **New** → **PostgreSQL**
2. Fill in:
   - **Name**: `order-docs-printer-db`
   - **Region**: `Singapore`
   - **Plan**: Starter ($7/mo)
3. Click **Create Database**
4. Wait for it to become **Available**
5. Copy the **Internal Database URL** — you'll paste it as `DATABASE_URL`

### 2. Create the Web Service

1. Render Dashboard → **New** → **Web Service**
2. Connect your GitHub repo: `unfoldcro/Order-Printer-Pro-UnfoldCRO`
3. Fill in the form fields exactly as shown in the table above
4. In **Environment Variables**, add all variables from the table above
5. Click **Create Web Service**

### 3. Create the Background Worker service (for auto-email)

1. Render Dashboard → **New** → **Background Worker**
2. Connect same repo, same branch
3. **Dockerfile Path**: `./Dockerfile`
4. **Docker Command**: `node worker.js`
5. Add the same environment variables as the web service
6. Click **Create Background Worker**

---

## Faster Option: Render Blueprint (one click)

A `render.yaml` file is included in this repo. It provisions everything
(web service + worker + Postgres) automatically.

1. Render Dashboard → **New** → **Blueprint**
2. Connect `unfoldcro/Order-Printer-Pro-UnfoldCRO`
3. Render reads `render.yaml` and shows a preview of what will be created
4. Click **Apply**
5. After deploy, go to each service → **Environment** and fill in secrets:
   - `SHOPIFY_API_KEY`
   - `SHOPIFY_API_SECRET`
   - `SENDGRID_API_KEY`

---

## Paste-block for "Add from .env"

Copy the block below and click **"Add from .env"** in Render's environment
variables section. Then update each placeholder value.

```env
SHOPIFY_API_KEY=PASTE_YOUR_API_KEY_HERE
SHOPIFY_API_SECRET=PASTE_YOUR_API_SECRET_HERE
SHOPIFY_APP_URL=https://order-printer-pro-unfoldcro.onrender.com
SCOPES=read_orders,read_customers
DATABASE_URL=PASTE_INTERNAL_DATABASE_URL_FROM_RENDER_POSTGRES
SENDGRID_API_KEY=SG.PASTE_YOUR_SENDGRID_KEY_HERE
NODE_ENV=production
PORT=3000
```

---

## Where to get each value

### SHOPIFY_API_KEY + SHOPIFY_API_SECRET
1. [partners.shopify.com](https://partners.shopify.com) → **Apps**
2. Click your app (or create one)
3. **App setup** section → copy **API key** and **API secret key**

### DATABASE_URL
1. Render Dashboard → your PostgreSQL database
2. **Info** tab → **Connections** → copy **Internal Database URL**
   - Use the **Internal** URL (not External) so the web service and DB
     communicate over Render's private network for free

### SENDGRID_API_KEY
1. [app.sendgrid.com](https://app.sendgrid.com) → **Settings** → **API Keys**
2. **Create API Key** → Restricted → enable **Mail Send → Full Access**
3. Copy the key (starts with `SG.`)
4. Also verify your sender email: **Settings** → **Sender Authentication**

---

## Checklist

```
✅ Created Render PostgreSQL database → copied Internal Database URL
✅ Created Render Web Service with Docker runtime
✅ Filled all 8 environment variables in Render
✅ API keys set in Render (SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SENDGRID_API_KEY)
✅ SHOPIFY_APP_URL set to https://order-printer-pro-unfoldcro.onrender.com
□  Updated Shopify Partner Dashboard → App URL to Render URL
□  Updated Shopify Partner Dashboard → Allowed redirection URLs (3 values)
□  Updated shopify.app.toml → client_id with your actual API key
□  Installed app on test store
□  Verified app loads and redirects to Shopify OAuth
□  Created Background Worker service (for auto-email)
□  Confirmed logs show successful startup
```

