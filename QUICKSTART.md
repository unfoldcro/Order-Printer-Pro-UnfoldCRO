# Quick Start Guide - Order Docs Printer

## Prerequisites Checklist

- [ ] Node.js 18.20+ or 20.10+ installed
- [ ] PostgreSQL database running
- [ ] Shopify Partner account created
- [ ] SendGrid account with API key
- [ ] Git installed

## Step-by-Step Setup (5 minutes)

### 1. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:
```env
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_secret_here
SCOPES=read_orders,read_customers
SHOPIFY_APP_URL=https://your-app-url.com
DATABASE_URL=postgresql://user:password@localhost:5432/order_docs_printer
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
```

### 2. Database Setup

```bash
# Create database
createdb order_docs_printer

# Run migrations
npx prisma migrate dev --name init

# Verify
npx prisma studio
```

### 3. Run Tests

```bash
npm test
# Should see: ✓ 6 tests passed
```

### 4. Start Development

Terminal 1 (Main App):
```bash
npm run dev
```

Terminal 2 (Background Worker):
```bash
npm run worker
```

### 5. Register with Shopify

1. Go to [Shopify Partners](https://partners.shopify.com)
2. Create new app → "Create app manually"
3. Set App URL to your tunnel URL (e.g., from ngrok or Cloudflare Tunnel)
4. Set Redirect URLs:
   - `https://your-url.com/auth/callback`
   - `https://your-url.com/auth/shopify/callback`
5. Copy API key and secret to `.env`
6. Update `shopify.app.toml` with your `client_id` and `application_url`

### 6. Install on Test Store

```bash
# Using Shopify CLI
npm run dev

# OR manually:
# Visit: https://your-url.com/?shop=your-test-store.myshopify.com
```

## First Steps in the App

1. **Create a Template**
   - Navigate to Templates
   - Click "New Template"
   - Add HTML: `<h1>Invoice {{order.name}}</h1>`
   - Add CSS: `body { font-family: Arial; }`
   - Click Preview → Save

2. **Configure Email Settings**
   - Navigate to Settings
   - Enable auto-send
   - Set trigger to "Order Paid"
   - Enter from name and email
   - Save

3. **Test PDF Generation**
   - Create a test order in Shopify
   - Visit: `/api/orders/{orderId}/pdf`
   - Download should start

4. **Check Logs**
   - Navigate to Logs
   - See PDF generation and email events

## Common Issues

### Database Connection Error
```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql postgresql://user:password@localhost:5432/order_docs_printer
```

### Playwright Browser Missing
```bash
npx playwright install chromium
```

### Port Already in Use
```bash
# Change PORT in .env
PORT=3001 npm run dev
```

### Webhooks Not Working
1. Check webhook URLs in Shopify Partner Dashboard
2. Verify app is installed on test store
3. Use ngrok or similar for local testing:
   ```bash
   ngrok http 3000
   # Update SHOPIFY_APP_URL with ngrok URL
   ```

## Production Deployment

### Option 1: Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Launch app
fly launch

# Set secrets
fly secrets set SHOPIFY_API_KEY=xxx
fly secrets set SHOPIFY_API_SECRET=xxx
fly secrets set SENDGRID_API_KEY=xxx
fly secrets set DATABASE_URL=xxx

# Deploy
fly deploy
```

### Option 2: Railway

1. Connect GitHub repo to Railway
2. Add PostgreSQL plugin
3. Set environment variables
4. Deploy automatically on push

### Option 3: DigitalOcean App Platform

1. Create new app from GitHub
2. Add managed PostgreSQL database
3. Set environment variables
4. Deploy

## Verify Everything Works

```bash
# Run all checks
npm test                # Tests pass
npm run typecheck       # No app errors
npx prisma generate     # Client generated
npx prisma migrate status  # Migrations applied
```

## Getting Help

- **Shopify Issues**: https://shopify.dev/docs
- **Database Issues**: Check Prisma docs
- **Email Issues**: Verify SendGrid API key
- **General Issues**: Check logs in app

## What's Next?

- Customize templates for your brand
- Add more template types (receipts, returns)
- Extend with bulk operations
- Add email scheduling
- Implement template versioning
- Add analytics dashboard

## Development Commands

```bash
npm run dev          # Start dev server
npm run worker       # Start background worker
npm test            # Run tests
npm run typecheck   # Check TypeScript
npm run build       # Build for production
npm start           # Run production build
npx prisma studio   # Open database GUI
npx prisma migrate dev  # Create migration
```

## Security Reminders

- [ ] Never commit `.env` file
- [ ] Use strong database passwords
- [ ] Rotate SendGrid API key regularly
- [ ] Enable 2FA on Shopify Partner account
- [ ] Use HTTPS in production
- [ ] Keep dependencies updated

## Support

For issues or questions:
1. Check logs in app (Logs page)
2. Check browser console for errors
3. Check server logs for backend errors
4. Verify environment variables are set correctly
5. Test with sample data first

---

**Ready to build!** 🚀

All files are in place, tests are passing, and the app is ready for development.
