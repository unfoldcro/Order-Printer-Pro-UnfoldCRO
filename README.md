# Order Docs Printer - Shopify Embedded App

A production-ready Shopify embedded app for generating and emailing invoices and packing slips. Built with modern best practices: simple loops, minimal sorting, clear Polaris UI, strong validation, webhook-driven workflows, and reliable testing.

## 🎯 Features

- **Template Management**: Create and edit invoice/packing slip templates with Handlebars
- **PDF Generation**: Convert HTML templates to PDF using Playwright
- **Auto-Email**: Automatically email documents on order events (created/paid)
- **Background Jobs**: Async job processing for reliable email delivery
- **Activity Logs**: Track all PDF generations and email sends
- **Preview System**: Test templates with sample data before use
- **Webhook-Driven**: Responds to Shopify order webhooks

## 🛠️ Tech Stack

- **Framework**: Remix (Node + React)
- **Database**: PostgreSQL + Prisma ORM
- **Shopify**: Admin API GraphQL, App Bridge, Polaris UI
- **Template Engine**: Handlebars (safe, whitelisted fields only)
- **PDF Generator**: Playwright (headless Chromium)
- **Email**: SendGrid
- **Testing**: Vitest
- **Type Safety**: TypeScript

## 📁 Project Structure

```
/app
  /lib
    renderer.server.ts     # Safe Handlebars rendering + data mapping
    pdf.server.ts          # PDF generation with Playwright
    email.server.ts        # SendGrid email with attachments
    worker.server.ts       # Background job processor
  /routes
    app._index.tsx         # Dashboard
    app.templates.tsx      # Template list
    app.templates.$id.tsx  # Template editor with preview
    app.settings.tsx       # Email settings
    app.logs.tsx          # Activity logs
    api.orders.$orderId.pdf.tsx      # Generate & download PDF
    api.orders.$orderId.preview.tsx  # Preview rendered HTML
    webhooks.orders-create.tsx       # Order created webhook
    webhooks.orders-paid.tsx         # Order paid webhook
  shopify.server.ts       # Shopify app config
  db.server.ts           # Prisma client singleton

/prisma
  schema.prisma          # Database schema

/tests
  renderer.test.ts       # Unit tests for template rendering

worker.js              # Background job worker process
```

## 🗄️ Database Schema

- **Session**: Shopify OAuth sessions
- **Template**: HTML/CSS templates (INVOICE, PACKING_SLIP)
- **Settings**: Auto-send configuration per shop
- **Job**: Background job queue (SEND_DOCUMENT, BULK_EXPORT)
- **Log**: Activity tracking (PDF_GENERATED, EMAIL_SENT, ERROR)

## 🚀 Setup

### Prerequisites

- Node.js 18.20+ or 20.10+
- PostgreSQL database
- Shopify Partner account
- SendGrid account (for email)

### Installation

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

   Required variables:
   - `SHOPIFY_API_KEY`: Your Shopify app API key
   - `SHOPIFY_API_SECRET`: Your Shopify app secret
   - `SCOPES`: `read_orders,read_customers`
   - `SHOPIFY_APP_URL`: Your app URL (e.g., https://your-app.fly.dev)
   - `DATABASE_URL`: PostgreSQL connection string
   - `SENDGRID_API_KEY`: SendGrid API key

3. **Set up database**:
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

4. **Run tests**:
   ```bash
   npm test
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```

6. **Start background worker** (separate terminal):
   ```bash
   npm run worker
   ```

## 🏗️ Production Deployment

### Build the app:
```bash
npm run build
```

### Run in production:
```bash
DATABASE_URL=postgresql://... npm start
```

### Run worker in production:
```bash
DATABASE_URL=postgresql://... npm run worker
```

**Note**: Use a process manager like PM2 or systemd to keep both processes running:
```bash
pm2 start npm --name "order-docs-api" -- start
pm2 start npm --name "order-docs-worker" -- run worker
```

## 🧪 Testing

Unit tests for the renderer with coverage of:
- Order data mapping with missing fields
- Handlebars template rendering
- Safe handling of undefined values
- CSS injection into HTML output

```bash
npm test           # Run tests once
npm run typecheck  # TypeScript validation
```

## 🔐 Security

- **HMAC Verification**: All webhooks validated by Shopify App Remix
- **Sandboxed Templates**: Handlebars with whitelisted fields only
- **No Secret Logging**: Environment variables never logged
- **Server-side Validation**: All mutations validated on server
- **Session Storage**: Encrypted session storage via Prisma

## 📋 Usage

### Creating Templates

1. Navigate to **Templates** in the app
2. Click **New Template**
3. Choose type (Invoice or Packing Slip)
4. Edit HTML with Handlebars tokens:
   - `{{order.name}}` - Order number
   - `{{order.createdAt}}` - Order date
   - `{{order.totalPrice}}` - Total price
   - `{{customer.firstName}}` - Customer name
   - `{{customer.email}}` - Customer email
   - `{{#each order.lineItems}}{{title}}{{/each}}` - Line items loop
5. Add CSS for styling
6. Click **Preview** to test with sample data
7. Click **Save**

### Configuring Auto-Email

1. Navigate to **Settings**
2. Enable **Auto-send**
3. Choose trigger: **Order Created** or **Order Paid**
4. Configure email subject (supports `{{order.name}}` token)
5. Set **From Name** and **From Email**
6. Click **Save**

### Manual PDF Generation

Call the API endpoint:
```
GET /api/orders/{orderId}/pdf?type=INVOICE
```

This downloads the PDF for the specified order.

### Viewing Logs

Navigate to **Logs** to see:
- PDF generation events
- Email delivery status
- Error messages

## 🔧 Development Notes

### Code Standards

- **Simple Loops**: Single-pass, no nested loops unless unavoidable
- **No Repeated Sorts**: Filter first, sort once
- **Server Validation**: Every action validated server-side
- **Webhook-Driven**: No polling, events drive actions
- **Pagination**: Always paginate Shopify resources

### GraphQL Query Example

```graphql
query GetOrder($id: ID!) {
  order(id: $id) {
    name
    createdAt
    totalPriceSet { shopMoney { amount currencyCode } }
    customer { firstName lastName email }
    lineItems(first: 50) {
      edges {
        node { title quantity originalUnitPrice }
      }
    }
  }
}
```

### Adding New Template Tokens

1. Update `OrderData` interface in `renderer.server.ts`
2. Update `buildOrderData()` to map the field
3. Add to GraphQL query if needed
4. Add tests for the new field

## 🐛 Troubleshooting

### Database connection issues
```bash
# Check DATABASE_URL format
postgresql://user:password@host:5432/dbname

# Test connection
npx prisma db pull
```

### Playwright browser not installed
```bash
npx playwright install chromium
```

### Webhook not receiving events
- Verify webhook URLs in Shopify Partner Dashboard
- Check that app is installed on the test store
- View logs in Shopify Partner Dashboard > Apps > [Your App] > API access

### Worker not processing jobs
- Ensure worker process is running
- Check database connectivity
- View logs for error details in Log table

## 📝 License

MIT

## 🤝 Contributing

This is a production-ready starting point. Customize as needed for your use case.

## 🆘 Support

For issues related to:
- Shopify API: [Shopify Dev Docs](https://shopify.dev/docs)
- Remix: [Remix Docs](https://remix.run/docs)
- Prisma: [Prisma Docs](https://www.prisma.io/docs)