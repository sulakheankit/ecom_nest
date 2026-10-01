# Nest — full-stack e-commerce starter

A React storefront and protected store administration interface backed by Express and PostgreSQL. Nest is a fictional Indian lifestyle brand used for the demonstration catalog. Replace the brand, photographs, policies and catalog before launching a real business.

## Quick start: no separate database service

Install **Node.js 24 LTS** and extract this project. Open a terminal in the `ecommerce` directory:

```bash
npm ci
npm run setup:demo
npm run dev
```

Open **http://localhost:5173**. The API runs at **http://localhost:5000**.

The demo setup creates an ignored `.env` containing a randomly generated JWT secret, runs migrations and creates demo accounts. Demo mode uses **PGlite, an embedded PostgreSQL engine**, with durable local files in `.data/postgres`. This is a local development convenience; production requires a PostgreSQL server. `DB_MODE=embedded` is rejected when `NODE_ENV=production`.

### Local demo accounts

| Role            | Email                 | Password          |
| --------------- | --------------------- | ----------------- |
| Admin           | admin@example.com     | NestAdmin!2026    |
| Customer        | customer@example.com  | NestCustomer!2026 |
| Second customer | customer2@example.com | NestCustomer!2026 |

These are development-only seed credentials. They are not embedded in the production backend. The seed script reads passwords from `SEED_ADMIN_PASSWORD` and `SEED_CUSTOMER_PASSWORD`, requires at least ten characters and hashes them with bcrypt. If `.env` already exists, setup preserves it; use the seed passwords configured there.

After signing in as admin, visit **/admin**. The seeded customer has six orders and four verified reviews. Use **WELCOME10** for ten percent off orders of at least ₹999, up to ₹1,000; **NEST200** gives ₹200 off orders of at least ₹1,999. Seed coupons expire ninety days after seeding.

## What works

- Responsive storefront with three hero slides, categories, featured products, new arrivals, best sellers, promotional sections and a newsletter subscription stored in the database.
- Global search across product name, SKU, brand, category and description; suggestions and device-local recent searches.
- Product filters, price limits, availability, ratings, sorting and pagination.
- Product detail galleries, zoom, specifications, features and related products.
- Variant-aware prices, SKU, stock and images. The sample variants reuse representative imagery; replace them with actual photographs of each variant.
- Guest carts in localStorage; authenticated carts in PostgreSQL; guest carts merge on sign-in with stock limits.
- Persistent authenticated wishlists, profile editing, password changes, saved addresses and order history.
- Checkout with validated shipping and separate billing addresses, delivery selection, server-calculated GST/shipping/coupon totals and Cash on Delivery.
- Transactional order creation and stock reduction. Client-submitted totals are ignored. Order access is checked against the authenticated customer.
- Admin product editing, uploaded images, variants, SEO, inventory, bulk enable/archive, nested categories, brands, customer access controls, coupons, review moderation and store settings.
- Order management with enforced status transitions and inventory restoration on cancellation or return. Duplicate cancellation is rejected.
- Date-filtered sales statistics, daily/monthly revenue, top products, category performance and average paid order value.
- Registration/login, bcrypt passwords, JWTs in HttpOnly cookies, database-backed session revocation, disabled-account checks and role enforcement on every admin API.
- Password reset tokens are hashed, expire after thirty minutes and are single-use. SMTP is supported; local reset emails are saved in `.data/outbox`.
- Input validation, parameterized SQL, auth/API rate limits, allowed-origin checks, CORS, Helmet headers and safe error responses.
- Browser page metadata, canonical URLs, Product/Breadcrumb JSON-LD, sitemap and robots endpoints.

## Technology

React 19, TypeScript, Vite, React Router, Tailwind CSS 4 with custom design tokens, Radix accessible dialogs, Lucide, Sonner, React Hook Form and Zod. Node.js/Express 5, PostgreSQL (`pg`), bcrypt, JWT, Nodemailer, Multer and Sharp. PGlite is used only for the local demonstration and integration tests.

PostgreSQL is the selected relational database. This repository does not implement a MySQL adapter.

## Structure

- `frontend/src/components`: product cards, accessible UI controls and SEO.
- `frontend/src/pages`: customer and admin screens.
- `frontend/src/layouts`: storefront and administration shells.
- `frontend/src/store`: authentication, cart, wishlist and shared store configuration.
- `frontend/src/services`: API transport, image paths and formatting.
- `frontend/src/hooks`: data loading, errors and reloads.
- `frontend/src/types`: shared frontend models.
- `backend/src/routes`: authentication, catalog, shopping and admin REST endpoints.
- `backend/src/middleware`: authentication and role enforcement.
- `backend/src/services`: catalog/cart calculations, transactions, email and payment integration interfaces.
- `backend/src/validators`: server-side Zod schemas.
- `backend/src/config`: PostgreSQL/PGlite adapter and database transactions.
- `database/migrations`: versioned relational schema.
- `database/seed`: demonstration catalog/accounts/orders.
- `scripts`: setup, development runner and compiled production migrations.
- `tests`: database-backed API tests and React interaction tests.
- `deploy`: Vercel and Netlify configuration templates.

## PostgreSQL development setup

Create a PostgreSQL database and user, copy `.env.example` to `.env`, then set:

```dotenv
DB_MODE=postgres
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/nest
JWT_SECRET=your-random-secret-with-at-least-32-characters
FRONTEND_URL=http://localhost:5173
PUBLIC_URL=http://localhost:5173
PORT=5000
COOKIE_SECURE=false
SEED_ADMIN_PASSWORD=choose-a-development-admin-password
SEED_CUSTOMER_PASSWORD=choose-a-development-customer-password
```

Run:

```bash
npm ci
npm run db:migrate
npm run db:seed
npm run dev
```

Migrations run once and record their filenames in `migrations`. Seed data is inserted in a transaction and is skipped when users already exist. Run migrations from one release process at a time. Back up production data before schema changes; down migrations are not included.

## Environment variables

| Variable                                                           | Purpose                                                                  |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| DATABASE_URL                                                       | PostgreSQL connection string                                             |
| DB_MODE                                                            | `postgres` for production; `embedded` for the local demo                 |
| DB_PATH                                                            | Optional embedded database path for development/testing                  |
| DB_SSL                                                             | Set `true` if the PostgreSQL server requires verified TLS                |
| JWT_SECRET                                                         | Random secret of at least 32 characters                                  |
| PORT                                                               | Backend listening port, defaults to 5000                                 |
| FRONTEND_URL                                                       | Exact trusted frontend origin; supports a comma-separated allowlist      |
| PUBLIC_URL                                                         | Canonical public store origin used by sitemap/robots                     |
| COOKIE_SECURE                                                      | `true` for HTTPS production; `false` only for local HTTP                 |
| TRUST_PROXY                                                        | `true` only behind a trusted single reverse proxy                        |
| VITE_API_URL                                                       | Optional frontend API origin; leave empty with same-origin proxy routing |
| SEED_ADMIN_PASSWORD                                                | Admin seed password; never ship demo credentials to production           |
| SEED_CUSTOMER_PASSWORD                                             | Customer seed password                                                   |
| SMTP_HOST / SMTP_PORT                                              | SMTP host and port                                                       |
| SMTP_USER / SMTP_PASSWORD / SMTP_FROM                              | Server-side email configuration                                          |
| RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET                              | Reserved for a future gateway adapter                                    |
| SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_STORAGE_BUCKET | Production image storage configuration; key is server-only               |
| POSTGRES_PASSWORD                                                  | PostgreSQL password used by Docker Compose                               |

The application reads root `.env` in both development and compiled backend builds. Hosting environment variables take precedence. Never commit `.env`, database files or credentials.

## Useful commands

```bash
npm run dev                  # frontend and backend together
npm run dev -w frontend      # frontend only
npm run dev -w backend       # backend only
npm run build                # frontend bundle and backend TypeScript build
npm run start                # compiled backend; also serves frontend/dist
npm run db:migrate           # development migrations
npm run db:seed              # demonstration seed
node scripts/migrate.mjs     # production migrations after build
npm test                     # all backend and frontend tests
npm run test:backend
npm run test:frontend
```

For a single-origin local production-build check, set `FRONTEND_URL` and `PUBLIC_URL` to `http://localhost:5000`, run `npm run build`, then `npm run start` and open port 5000. Leave `NODE_ENV` unset for this embedded-database demonstration.

## API reference

Bodies are JSON unless uploading images. Auth is a session cookie; use `credentials: include`. Errors return `{ "message": "..." }` with an appropriate HTTP status.

| Method         | Endpoint                                    | Access / purpose                                      |
| -------------- | ------------------------------------------- | ----------------------------------------------------- |
| GET            | /api/health                                 | Database health                                       |
| POST           | /api/auth/register                          | Create customer account                               |
| POST           | /api/auth/login                             | Sign in; optional `remember`                          |
| POST           | /api/auth/logout                            | Revoke current session                                |
| GET            | /api/auth/me                                | Current user                                          |
| PUT            | /api/auth/profile                           | Update own name/email/mobile                          |
| POST           | /api/auth/change-password                   | Change password; revoke other sessions                |
| POST           | /api/auth/forgot-password                   | Request reset email                                   |
| POST           | /api/auth/reset-password                    | Redeem token, set password, revoke sessions           |
| GET            | /api/products                               | Public catalog                                        |
| GET            | /api/products/:slug                         | Product detail                                        |
| GET / POST     | /api/products/:slug/reviews                 | Approved reviews / verified delivered purchase review |
| GET            | /api/categories, /api/brands, /api/settings | Public store data                                     |
| POST           | /api/newsletter                             | Save opt-in email                                     |
| GET / POST     | /api/cart                                   | Read / add authenticated cart item                    |
| POST           | /api/cart/merge                             | Merge guest items                                     |
| PUT / DELETE   | /api/cart/:itemId                           | Set quantity / remove owned item                      |
| POST           | /api/checkout/quote                         | Authoritative totals from authenticated cart          |
| POST           | /api/coupons/validate                       | Validate coupon against authenticated cart            |
| GET / POST     | /api/wishlist                               | Read / add favourite                                  |
| DELETE         | /api/wishlist/:productId                    | Remove favourite                                      |
| GET / POST     | /api/addresses                              | Read / create owned address                           |
| PUT / DELETE   | /api/addresses/:id                          | Update / delete owned address                         |
| GET / POST     | /api/orders                                 | Own orders / place order                              |
| GET            | /api/orders/:id                             | Own order details                                     |
| POST           | /api/uploads                                | Authenticated multipart image uploads; field `images` |
| GET            | /api/admin/dashboard, /api/admin/reports    | Admin metrics, optional `from`/`to` ISO dates         |
| GET / POST     | /api/admin/products                         | Admin catalog / create product                        |
| PUT / DELETE   | /api/admin/products/:id                     | Edit / archive product                                |
| PATCH          | /api/admin/products/bulk                    | Bulk active state                                     |
| GET / POST     | /api/admin/categories                       | Categories / create                                   |
| PUT / DELETE   | /api/admin/categories/:id                   | Edit / delete category                                |
| GET / POST     | /api/admin/brands                           | Brands / create brand                                 |
| GET            | /api/admin/orders                           | All orders; optional `q`                              |
| GET / PATCH    | /api/admin/orders/:id                       | Order details / allowed status transition             |
| GET            | /api/admin/customers                        | Customers; optional `q`                               |
| GET / PATCH    | /api/admin/customers/:id                    | Customer history / enable or disable                  |
| GET / POST     | /api/admin/coupons                          | Coupons / create                                      |
| PUT / DELETE   | /api/admin/coupons/:id                      | Edit / delete or archive used coupon                  |
| GET            | /api/admin/reviews                          | Review moderation list                                |
| PATCH / DELETE | /api/admin/reviews/:id                      | Moderate / delete                                     |
| GET / PUT      | /api/admin/settings                         | Read / update configuration                           |

Product query parameters: `q`, `category` (slug), `brand` (name), `min`, `max`, `rating`, `stock=true`, `offers=true`, `sort`, `page`, `limit` (1–48). Sort values: `featured`, `newest`, `price-asc`, `price-desc`, `rating`, `best-selling`.

Cart addition: `{ "variant_id": 1, "quantity": 1 }`. Checkout quote: `{ "coupon": "WELCOME10", "delivery": "STANDARD" }`. Order creation requires `shipping_address`, optional `billing_address`, `delivery`, `payment_method: "COD"` and optional `coupon`. The address schema is in `backend/src/validators/index.ts`.

Order transitions: PENDING → CONFIRMED/CANCELLED; CONFIRMED → PROCESSING/CANCELLED; PROCESSING → SHIPPED/CANCELLED; SHIPPED → DELIVERED; DELIVERED → RETURN_REQUESTED; RETURN_REQUESTED → RETURNED/DELIVERED; RETURNED → REFUNDED. Delivered COD orders are recorded as paid. Refund recording does not transfer funds. Cancelled and returned orders restore stock once.

## Database design

The schema has users, roles, sessions, hashed password-reset tokens, products, images, variants, categories, brands, carts/items, wishlists/items, addresses, orders/items, payments, coupons/usage, reviews/images, settings and newsletter opt-ins. Foreign keys, unique constraints, inventory/price checks and common-query indexes are included. Orders retain customer/address/product/price snapshots so later edits do not change purchase history. Products are archived when deleted. A category with dependent products or child categories cannot be deleted.

Money uses PostgreSQL NUMERIC, and server-side totals are rounded to two decimal places. Prices exclude GST in this starter. GST applies to discounted product subtotal; shipping is not taxed in this demonstration calculation. Adapt tax rules to the business before launch.

## Email, payment and storage integrations

Password recovery sends through Nodemailer when SMTP is configured. Without SMTP, development writes reset emails to `.data/outbox`. Production returns a clear unavailable response until SMTP is configured, rather than claiming to send email. Newsletter opt-ins are saved; a marketing-email provider is not integrated.

Online payments are visibly disabled, and the backend rejects ONLINE orders. `backend/src/services/payments.ts` provides the provider interface. Adding keys alone does not enable a gateway: implement order/payment creation, webhook signature verification, idempotent payment-event processing and reconciliation before enabling online payment.

Uploads accept JPG, PNG and WebP up to 3 MB per request. Sharp validates decoded content, limits pixel count, removes metadata and converts to WebP. Production images are stored in Supabase Storage. Authentication is required.

## Deployment: GitHub + Vercel + Supabase

Vercel serves the React website and Express API together. Supabase supplies PostgreSQL and public image storage. Existing account authentication remains in Express; Supabase Auth is not required.

1. Create a Supabase project. In Connect, copy the **transaction pooler** connection string (port 6543) and replace its password placeholder. The backend uses unnamed parameterized pg queries, compatible with transaction pooling.
2. In Supabase Storage, create a **public** bucket named `nest-images`. Images are publicly readable; writes go through the authenticated backend using the server-only service role key. Do not add public upload policies.
3. Copy `.env.example` to `.env` locally. Set `DB_MODE=postgres`, `DATABASE_URL` to the pooler string, `DB_SSL=true`, and the Supabase URL/service role key. If certificate verification requires the project CA, set `DB_SSL_CA` to the Supabase CA certificate using literal `\n` line separators. Keep secrets out of Git and never use a `VITE_` prefix for server secrets.
4. Run `npm ci`, then `npm run db:migrate`. Migration 002 enables row-level security with no public Data API policies on application tables. Use the project postgres database owner for backend connections.
5. For a new database only, set your own strong `SEED_ADMIN_PASSWORD` and `SEED_CUSTOMER_PASSWORD`, then run `npm run db:seed` once. Seeding creates sample products and accounts; do not reseed a live store.
6. Push the entire project to your GitHub repository. Import it into Vercel, with the repository root as Root Directory (the directory containing `vercel.json`). The supplied configuration builds both workspaces, publishes `frontend/dist`, and runs `api/index.ts` as the API function. Use Node.js 24.
7. Add the production environment variables below in Vercel. Deploy, then set the exact final HTTPS URL as `FRONTEND_URL` and `PUBLIC_URL` and redeploy. Keep `VITE_API_URL` unset: website and API share one origin.
8. Check `/api/health`, login, catalog, checkout, an admin upload, and a page refresh on `/products`. Confirm the uploaded image appears in your Supabase bucket.

| Vercel variable           | Value                                            |
| ------------------------- | ------------------------------------------------ |
| NODE_ENV                  | `production`                                     |
| DB_MODE                   | `postgres`                                       |
| DATABASE_URL              | Supabase transaction pooler URL                  |
| DB_SSL                    | `true`                                           |
| DB_SSL_CA                 | Supabase CA certificate if needed                |
| JWT_SECRET                | Fresh random secret, at least 32 characters      |
| FRONTEND_URL              | Exact production HTTPS origin, no trailing slash |
| PUBLIC_URL                | Same production HTTPS origin                     |
| COOKIE_SECURE             | `true`                                           |
| TRUST_PROXY               | `true`                                           |
| SUPABASE_URL              | `https://YOUR-PROJECT.supabase.co`               |
| SUPABASE_SERVICE_ROLE_KEY | Server-only service role key                     |
| SUPABASE_STORAGE_BUCKET   | `nest-images`                                    |

Optional SMTP variables enable password-reset email. Without SMTP, production password reset is unavailable. Do not add seed passwords to Vercel; migration and seeding are explicit local operations, not part of every deployment. Preview deployments should use a separate Supabase project and their own exact trusted origin. The current request limiters are per function instance and are not a global abuse limit; configure an additional platform limit before a public launch.

Uploads are sent one image per request, up to 3 MB, to fit Vercel request limits. The interface still supports choosing multiple images. Production uploads use Supabase Storage; local development can use `backend/uploads`. Existing local upload files must be copied into the bucket and their database URLs updated separately. This package does not transfer an existing deployed database or delete services in your hosting accounts.

### GitHub repository error

If `git push` says repository not found, create `nest_ecom` under your actual GitHub account first and copy its HTTPS URL. Then run:

```bash
git remote set-url origin https://github.com/YOUR-USERNAME/nest_ecom.git
git push -u origin main
```

If the repository is private, authenticate Git with an account that has access. A remote URL alone does not create the repository.

## Validation performed

- Frontend TypeScript check and Vite production build passed.
- Backend TypeScript build passed.
- Schema migrations and seed ran successfully against embedded PostgreSQL.
- The compiled backend started in the supervised runtime.
- Eight database-backed API test groups passed: catalog/search/filtering, registration/login/role isolation, cart/wishlist/address ownership, checkout/coupons/server totals, orders/stock restoration/reports, admin CRUD, review eligibility/moderation, and CSRF/session/account revocation.
- Five React interaction tests passed: login error handling, listing filter/sort API calls, variant-aware guest cart addition, cart quantity persistence, and validated checkout/order confirmation.
- All fifteen bundled catalog photographs were retrieved successfully.

API tests dispatch real Express middleware/routes in-process with node-mocks-http and a freshly migrated/seeded PGlite database. Frontend interaction tests use jsdom and mocked API responses. A separate networked PostgreSQL server, Docker, hosted deployment, SMTP delivery, gateway payments and real-browser visual checks across the requested widths were not tested in this environment. The CSS includes breakpoints for small phones, tablets and desktops; verify the actual business catalog at the requested widths before launch.

## Before real production use

This is a functioning starter, not a completed commercial launch. Configure real hosting, PostgreSQL, email, store policies and uploaded-image retention. Replace illustrative stock photography and sample products with accurate catalog images/descriptions. Review accessibility, taxes, legal policy copy and privacy requirements for the actual business. Add operational backups, monitoring, audit logs, email verification, payment reconciliation and shared storage if needed for your scale. Public SEO metadata is currently client-rendered; use SSR or prerendering if non-JavaScript crawlers are important.

## Photograph sources

Representative demo photographs were downloaded from images.unsplash.com. The local filenames preserve their original photo IDs. Source URLs are listed in `ASSETS.md`. They illustrate the demo catalog and do not assert that a particular pictured brand/product is sold by Nest. Replace them with your own properly licensed commercial catalog assets before launching.
