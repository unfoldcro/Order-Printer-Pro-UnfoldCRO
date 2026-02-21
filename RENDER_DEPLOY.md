# Deploying to Render — Exact Values for Every Field

This guide gives you the exact value to paste into each field of Render's
**New Web Service** form.

---

## Form Fields — What to Enter

### Basic settings

| Field | Value to enter |
|---|---|
| **Name** | `order-docs-printer` |
| **Language / Runtime** | `Docker` |
| **Branch** | `copilot/add-document-templates-feature` |
| **Region** | `Singapore (Southeast Asia)` *(or match your existing services)* |
| **Root Directory** | *(leave blank)* |
| **Dockerfile Path** | `./Dockerfile` *(this is the default — leave blank)* |

---

## Environment Variables — Copy-Paste Table

Add each row below in the Render **Environment Variables** section.

> **Tip:** Click **"Add from .env"** and paste the block at the bottom of this
> file to add all variables at once.

| NAME | VALUE | Notes |
|---|---|---|
| `SHOPIFY_API_KEY` | *(your API key)* | Shopify Partner Dashboard → Apps → Your App → API key |
| `SHOPIFY_API_SECRET` | *(your API secret)* | Same page → API secret key — mark as **Secret** |
| `SHOPIFY_APP_URL` | `https://order-docs-printer.onrender.com` | Your Render service URL — update after first deploy |
| `SCOPES` | `read_orders,read_customers` | Copy exactly as shown |
| `DATABASE_URL` | *(auto-filled by Render)* | If using Render Postgres, copy the **Internal Database URL** from the DB dashboard |
| `SENDGRID_API_KEY` | `SG.xxxxxxxxxxxxxxxxxx` | [app.sendgrid.com/settings/api_keys](https://app.sendgrid.com/settings/api_keys) — mark as **Secret** |
| `NODE_ENV` | `production` | Copy exactly |
| `PORT` | `3000` | Copy exactly |

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

### 3. After first deploy — update SHOPIFY_APP_URL

1. Copy your Render URL: `https://order-docs-printer.onrender.com`
2. Render Dashboard → Your service → **Environment** → Update `SHOPIFY_APP_URL`
3. Also update the same URL in:
   - Shopify Partner Dashboard → App setup → **App URL**
   - `shopify.app.toml` → `application_url` and all three `redirect_urls`

### 4. Create the Background Worker service (optional — for auto-email)

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
5. After deploy, go to each service → **Environment** and fill in the three
   secret values marked `sync: false`:
   - `SHOPIFY_API_KEY`
   - `SHOPIFY_API_SECRET`
   - `SENDGRID_API_KEY`
   - `SHOPIFY_APP_URL` (set to your Render URL once it's created)

---

## Paste-block for "Add from .env"

Copy the block below and click **"Add from .env"** in Render's environment
variables section. Then update each placeholder value.

```env
SHOPIFY_API_KEY=PASTE_YOUR_API_KEY_HERE
SHOPIFY_API_SECRET=PASTE_YOUR_API_SECRET_HERE
SHOPIFY_APP_URL=https://order-docs-printer.onrender.com
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

### SHOPIFY_APP_URL
- After Render deploys your service it assigns a URL like:
  `https://order-docs-printer.onrender.com`
- Copy that URL and paste it as `SHOPIFY_APP_URL`
- Update the same URL in your Shopify Partner Dashboard → App setup → **App URL**

---

## Checklist

```
□ Created Render PostgreSQL database → copied Internal Database URL
□ Created Render Web Service with Docker runtime
□ Filled all 8 environment variables (see table above)
□ Service deployed successfully (green "Live" status)
□ Copied Render URL → updated SHOPIFY_APP_URL in Render env vars
□ Updated Shopify Partner Dashboard App URL to match Render URL
□ Updated shopify.app.toml → application_url + redirect_urls
□ Created Background Worker service (for auto-email)
□ Verified app loads at https://order-docs-printer.onrender.com
```
