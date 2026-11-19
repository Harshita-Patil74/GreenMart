# GreenMart – Organic Products E-Commerce Platform

**Tagline:** Fresh. Organic. Direct from Farmers.

GreenMart connects customers with local farmers to buy organic produce. Customers browse products, add to cart, checkout, and track orders live. Farmers manage their product catalog, inventory, and fulfill orders. Admins oversee users, farmers, products, orders, offers, and certifications.

---

## Project Overview

GreenMart is a full-stack organic e-commerce platform that bridges local farmers and customers. It enables farmers to sell produce directly to consumers while giving customers a modern shopping experience with live order tracking, time-based offers, real-time notifications, and an AI shopping assistant.

Customers can browse organic products, search/filter by category and price, view detailed product pages with reviews, maintain a DB-persisted cart, checkout with demo payment options (UPI/Card/Cash on Delivery), track orders live with farmer delivery location and road route visualization, save wishlists, message farmers, and chat with a Google Gemini-powered assistant.

Farmers can register (pending admin approval), manage product CRUD with Cloudinary image uploads, track inventory with low-stock alerts, create scheduled time-based offers (subject to admin approval), view and update orders for their products, monitor earnings, and maintain certification records.

Admins are provisioned server-side only and can manage users and farmers, verify/revoke certifications, approve/reject offers, independently create and edit offers for any farmer, manage all products and orders, export CSV reports, generate PDF invoices, configure delivery charges and categories, manage newsletter campaigns, and review an admin audit log.

---

## Key Features

### Customer Features

- **Account:** Register/login as a customer; manage profile and saved addresses.
- **Shopping:** Browse products with search and category/price filters; view product detail pages with images, price, reviews, and eligible offer countdown.
- **Home Page Offers:** "Special Offers & Discounts" section below the hero displays approved, active offers with real prices, images, dates, discount badges, and live `HH:MM:SS` countdown timers in an infinite horizontal marquee carousel (pauses on hover/focus; supports touch swipe on mobile). Includes a **View All Offers** link.
- **Cart:** DB-persisted cart that survives across sessions/devices; optimistic quantity updates with rollback on failure; stock validation; guest-to-customer cart merge after login with server-side concurrency locking and idempotent merge operations.
- **Checkout:** Demo checkout with UPI/Card/Cash on Delivery; delivery charge applied; offers revalidated and calculated server-side using server time; discounts snapshotted on order items at checkout.
- **Featured Products:** Products with eligible active offers show original price (strikethrough), discounted price, and a discount badge; rendered in a continuous horizontal marquee carousel.
- **Customer Dashboard:** Recommended products and Active/Coming Soon offers scroll in independent infinite marquee carousels.
- **Order Tracking:** Live status flow (Order Placed → Packed → Out for Delivery → Delivered) with Socket.io updates and farmer delivery location.
- **Wishlist:** Save products; notified when a wishlisted product comes back in stock.
- **Reviews:** Review products only after receiving them.
- **Messaging:** Message farmers directly about products.
- **Notifications:** View notifications for orders, offers, wishlist, messages, support, and account; mark-as-read/delete; category filters; pagination; loading/empty/error states.
- **AI Assistant:** Chat with the Google Gemini-powered shopping assistant for product recommendations.
- **Premium Newsletter:** Customer-only paid subscription (₹199/month INR, monthly billing, 30-day duration, mock payment flow) with subscription checkout, payment confirmation, cancellation, and payment history. Authenticated customers manage their own subscription and preferences; admins manage campaigns and subscriber lists.

### Farmer Features

- **Account:** Register as a farmer; requires admin approval before product actions (`approvedFarmer` middleware).
- **Product Management:** Full product CRUD with Multer image uploads streamed to Cloudinary.
- **Profile Photos:** Avatar and farm-photo uploads stored via Multer + Cloudinary.
- **Inventory:** Track stock levels, low-stock alerts, inventory adjustments with history per item.
- **Orders:** View orders containing their products; update order status and delivery location; notified of new orders via Socket.io.
- **My Offers:** Create, edit, view, and deactivate product offers with scheduled start/end date/time; new or materially edited offers require admin approval.
- **Offer Performance:** Offer units and sales attributed from delivered order-item snapshots.
- **Bundle Offers:** Bundle discounts apply once minimum quantity is met; minimum order amount evaluated against the original cart subtotal.
- **Earnings:** View earnings and stats dashboard.
- **Certification:** Maintain certification text (subject to admin verification/revocation); notified when verified or rejected with reason.
- **Notifications:** Live new-order notifications via Socket.io; persisted in MongoDB; category filters, mark-as-read/delete, pagination.
- **Crop Management:** Create, list, view, update, and delete crops owned by the farmer.
- **Harvest Management:** Create, list, view, update, and delete harvests; update availability (quantity and sale status).
- **Inventory Adjustments:** Record stock increases/decreases for products and harvests; view adjustment history.
- **Live Delivery Tracking:** Start/stop sharing live GPS location during active deliveries; customers see the farmer's real-time position and road route on the Track Order map.

### Admin Features

- **Dashboard:** Totals and charts (sales, orders, users, products).
- **Notifications:** Admin Notifications page for orders, farmers, products, inventory, support, reviews, and security alerts; real-time Socket.io delivery.
- **User Management:** Manage all users; block/unblock and change roles (cannot modify self).
- **Farmer Management:** View and manage all farmers; verify/revoke certifications; notified of new registrations.
- **Product Management:** Manage all products across all farmers; notified of new products, low-stock, out-of-stock.
- **Offer Approvals:** Filter, review, approve, reject (with reason), and deactivate farmer offers.
- **Admin Offer Management:** Independently create new offers (for any farmer's eligible product) and edit any farmer's offer; supports scheduled start/end date/time; admin-created/edited offers approved directly after backend validation; farmers notified of changes.
- **Order Management:** View and manage all orders.
- **Certification:** Verify or revoke farmer certifications.
- **Inventory Alerts:** Monitor low-stock products across all farmers.
- **Reports:** Export reports as CSV.
- **Settings:** Configure delivery charge and product categories.
- **Live Feed:** Real-time new-order feed via Socket.io.
- **Sales Reports:** View farmer sales overview (revenue, orders, products sold, quantity).
- **PDF Invoices:** Generate and download order invoices as PDF.
- **Contact Form:** Customers submit support requests; admins notified.
- **Admin Audit Log:** Track admin actions for accountability.
- **Newsletter Campaigns:** Create/edit campaigns with eligible-recipient count, upload banner images to ImageKit (JPG/PNG/WebP, max 5 MB), process campaigns (mock email mode), view campaign history, manage subscribers.

### Shared Features

- Real-time Socket.io notifications and live updates.
- Role-based protected routes and permission enforcement.
- Responsive UI with Tailwind CSS and Framer Motion carousels.
- Secure JWT-based authentication with refresh tokens.

---

## Live Delivery Tracking

GreenMart provides real-time delivery tracking from farm to doorstep:

- **Farmer side:** Approved farmers can start/stop live GPS tracking for eligible "Out for Delivery" orders from the My Orders page. GPS permission is requested only on explicit start; location updates are throttled by time (30s) and movement (50m) to avoid excessive requests.
- **Customer side:** Customers view the farmer's live position and delivery destination on an interactive map (Track Order page). The map shows distinct farmer (green truck) and customer (dark pin) markers with popups.
- **Road routing:** Actual road routes are calculated via OSRM (Open Source Routing Machine) using GeoJSON geometry, rendered as a Leaflet polyline. Route distance, estimated duration, and calculation time are displayed. No fabricated straight-line routes are drawn.
- **Real-time updates:** Farmer location updates flow via Socket.IO `order:locationUpdated` to the customer's tracking page. The farmer marker moves and the route recalculates on meaningful movement without page refresh.
- **Configuration:** Routing URL is configurable via `VITE_ROUTING_API_URL` (defaults to the public OSRM demo server for development; self-hosted OSRM recommended for production).
- **Security:** Location updates are scoped to the order. Farmers can update locations for orders containing their products; authorized admins are also permitted by the existing backend route. Customers access only their own orders. Client-side coordinate validation is performed; backend latitude/longitude range validation has not been confirmed.

---

## OSRM Routing — Troubleshooting

GreenMart uses OSRM (Open Source Routing Machine) for road-route visualization in live delivery tracking. The routing service is configured via `VITE_ROUTING_API_URL` (defaults to `https://router.project-osrm.org`).

### OSRM Error Codes

The routing service handles the following OSRM error codes with actionable messages:

| OSRM Error | Meaning | Resolution |
|---|---|---|
| `InvalidUrl` | Malformed URL | Verify `VITE_ROUTING_API_URL` includes a valid protocol (e.g., `https://router.project-osrm.org`). Do not include path segments. |
| `InvalidQuery` | Malformed query string | Verify coordinates use longitude,latitude order and that `VITE_ROUTING_API_URL` is a valid base URL with protocol. |
| `NoRoute` | No route found | OSRM could not find a drivable route between the coordinates. The last valid route is preserved if available. |

### Valid Test URL

A valid OSRM request resembles:

```
https://router.project-osrm.org/route/v1/driving/77.59,12.97;77.6,12.98?overview=full&geometries=geojson&steps=true
```

Coordinates must be in **longitude,latitude** order. The public demo server at `router.project-osrm.org` is for development/testing only; self-hosted OSRM is recommended for production.

### Production Configuration

Set `VITE_ROUTING_API_URL` in your Vercel project settings:

```
VITE_ROUTING_API_URL=https://router.project-osrm.org
```

> Do not include path segments after the host (e.g., `https://router.project-osrm.org/route` is incorrect). The routing service appends `/route/v1/driving/...` automatically. The backend server also exposes an `OSRM_BASE_URL` variable (server-side only) for any server-side routing needs.

---

## Role-Based Access

### Role Definitions

| Role | Description | Provisioning |
|---|---|---|
| `customer` | Buys products; manages own cart, orders, profile | Public registration |
| `farmer` | Sells products; manages own inventory and fulfills orders | Public registration; requires admin approval before product actions |
| `admin` | Oversees the entire platform | Created server-side only via `npm run seed:admin` |

Public registration supports **customers and farmers only**. Setting an `admin` role in a registration request does not create an administrator.

### Permission Matrix

| Permission | Customer | Farmer | Admin |
|---|---|---|---|
| Browse and buy products | yes | no | no |
| View home page offers | yes | yes | yes |
| Add/edit own products | no | own only (approved farmers) | all |
| Create/edit offers for own products | no | own only (needs admin approval) | all farmers' offers |
| Approve/reject farmer offers | no | no | yes |
| Create/approve offers directly | no | no | yes |
| See own orders | own | orders with their items | all |
| Update order status | never | own items | all |
| Verify/revoke certification | no | no | yes |
| Manage users (block/unblock/role change) | no | no | yes |
| New-order notification | no | yes | live feed |
| View dashboard analytics | no | own earnings/stats | all totals/charts |
| View notifications | own | own | all |
| Export CSV reports | no | no | yes |
| Manage crops | no | own only | all |
| Manage harvests | no | own only | all |
| Inventory adjustments | no | own only | all |
| Sales reports | no | own sales | all |
| PDF invoices | own orders | no | all |
| Contact/support form | yes | yes | notified |
| Admin audit log | no | no | yes |
| Premium newsletter subscription | yes (paid) | no | manage subscribers |

### Important Security Notes

- Authorization is enforced by **backend middleware** (`auth`, `role`, `approvedFarmer`) and protected routes — not by the frontend alone.
- Farmers cannot perform product actions until approved by an admin (`approvedFarmer` middleware checks the `farmerApproved` flag).
- Offer approval status is set by the backend only; the frontend cannot decide whether an offer is approved.
- Administrators cannot view user passwords. Passwords are hashed with bcryptjs and never stored or returned in plaintext.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS 3.4, Redux Toolkit, React Router, Axios, Leaflet / React Leaflet, Chart.js / react-chartjs-2, Lucide React, Socket.IO Client, React Hot Toast, React Toastify, SweetAlert2, Framer Motion, OSRM (road routing) |
| Backend | Node.js, Express, MongoDB (Mongoose), JWT, bcryptjs, Zod, Multer, Socket.IO, Nodemailer, Helmet, Express Rate Limit, cookie-parser, dotenv, pdfkit, pdf-poppler |
| AI | Google Gemini (`@google/genai` SDK, `GoogleGenAI` client) |
| Image Storage | Multer for local temp storage; Cloudinary for product/avatar/farm-photo delivery; ImageKit for newsletter campaign banner uploads |
| Testing | Vitest (client), Jest (server), including Socket.io integration tests |

---

## Project Architecture

GreenMart follows a client–server architecture with a REST API over HTTP and real-time events over Socket.IO.

```
Client (React + Vite)  <-->  Server (Node + Express)  <-->  MongoDB
       |                              |                        |
  Redux Toolkit                Controllers + Services       Mongoose ODM
  React Router                 Middleware (auth/role)       Cloudinary / ImageKit
  Axios + Socket.IO client     Socket.IO server             SMTP (optional)
```

### Request Flow

1. Client sends an authenticated request (JWT in cookie/header) via Axios.
2. Express middleware validates JWT (`auth` middleware) and role (`role` middleware).
3. Controller delegates to a service layer for business logic.
4. Service interacts with Mongoose models; images uploaded via Multer are streamed to Cloudinary/ImageKit.
5. Response returned to client; relevant Socket.IO events emitted for real-time updates.
6. Notifications are persisted in MongoDB before being emitted over Socket.IO.

### Real-Time Architecture

Socket.IO handles authenticated connections where users join only their authorized notification rooms. Notifications are saved to MongoDB before emission, so reconnection retrieves persisted notifications without duplication. Used for new orders, status updates, location updates, offer changes, and system alerts.

---

## Folder Structure

```
greenmart/
├── client/                 # React + Vite frontend
│   ├── public/
│   ├── src/
│   │   ├── animations/     # Framer Motion section reveal and dropdown variants
│   │   ├── api/            # Axios API service modules per domain
│   │   ├── app/            # Redux store configuration
│   │   ├── components/     # Reusable UI components
│   │   │   ├── admin/      # Admin-specific components
│   │   │   ├── assistant/  # AI assistant components
│   │   │   ├── cart/       # Cart table, order summary, etc.
│   │   │   ├── checkout/   # Checkout form components
│   │   │   ├── common/     # Shared components (Logo, BackButton, etc.)
│   │   │   ├── dashboard/  # Dashboard widgets
│   │   │   ├── layout/     # Header, navbar, footer layout components
│   │   │   ├── farmer/     # Farmer-specific components
│   │   │   │   └── FarmerTrackingControls.jsx   # Farmer live delivery location start/stop controls
│   │   │   ├── map/        # Map and location picker components
│   │   │   ├── messages/   # Customer-farmer messaging components
│   │   │   ├── notifications/  # Notification list and badge
│   │   │   ├── offers/     # Offer cards and countdown components
│   │   │   ├── orders/     # Order details and history components
│   │   │   ├── product/    # Product card, detail, form components
│   │   │   └── routing/    # Protected route and role-based route components
│   │   ├── config/         # Notification config, etc.
│   │   ├── data/           # Demo catalog data
│   │   ├── features/       # Redux slices
│   │   │   ├── assistant/  # AI assistant slice
│   │   │   ├── auth/       # Auth slice (login, logout, restore)
│   │   │   ├── cart/       # Cart slice (guest sync, merge, persistence)
│   │   │   ├── notifications/  # Notifications slice
│   │   │   ├── orders/     # Orders slice
│   │   │   ├── products/   # Products slice
│   │   │   └── wishlist/   # Wishlist slice
│   │   ├── hooks/          # Custom hooks (useAuth, useDebounce, useGeolocation)
│   │   ├── layouts/        # Page layout wrappers
│   │   ├── pages/          # Page components by role
│   │   │   ├── admin/      # Admin pages
│   │   │   ├── auth/       # Login, register, forgot/reset password pages
│   │   │   ├── customer/   # Customer dashboard and pages
│   │   │   ├── farmer/     # Farmer dashboard and pages
│   │   │   ├── public/     # Public storefront pages
│   │   │   └── shared/     # Shared pages (cart, etc.)
│   │   ├── routes/         # Route definitions with role-based protection
│   │   ├── socket/         # Socket.io client connection
│   │   ├── styles/         # Global Tailwind CSS
│   │   ├── tests/          # Test utilities
│   │   └── utils/          # Utilities (tokenStorage, roleAccess, imageUrl, routingService, ...)
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
├── server/                 # Node + Express backend
│   ├── src/
│   │   ├── server.js       # Entry point: DB connection, defaults, HTTP + Socket.io server
│   │   ├── app.js          # Express app setup (helmet, CORS, rate limiting, routes, error handling)
│   │   ├── config/         # env, db, cloudinary, gemini, mailer, clientOrigins
│   │   ├── constants/      # categories, orderStatus, roles
│   │   ├── controllers/    # Request handlers per domain
│   │   ├── middleware/     # auth, role, approvedFarmer, upload, validate, errorHandler
│   │   ├── models/         # Mongoose schemas
│   │   ├── routes/         # Express route definitions (+ index.js aggregator)
│   │   ├── services/       # Business logic layer
│   │   ├── sockets/        # Socket.io setup and emitters
│   │   ├── bootstrap/      # ensureDefaults (seed categories/settings on startup)
│   │   ├── seed/           # seed.js, createAdmin.js, sample images
│   │   ├── scripts/        # Migration/backfill scripts
│   │   └── utils/          # asyncHandler, authValidation, generateOrderNumber, haversine,
│   │                     # tokens, invoice, invoiceNumbers, offerValidation
│   ├── .env.example        # Template for server environment variables (copy to .env locally)
│   ├── package.json
│   └── .gitignore
├── README.md
└── .gitignore
```

---

## Installation and Setup

### Prerequisites

- Node.js installed
- MongoDB (Atlas cluster URI or local instance)

### Backend Setup

```bash
cd server
cp .env.example .env
# Fill .env: MONGO_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, SEED_PASSWORD, GEMINI_API_KEY
npm install
npm run seed:admin
npm run dev      # http://127.0.0.1:5000
```

### Frontend Setup

```bash
cd client
cp .env.example .env
# VITE_API_URL=http://127.0.0.1:5000/api
# VITE_SOCKET_URL=http://127.0.0.1:5000
npm install
npm run dev      # http://127.0.0.1:5173
```

> Copy `server/.env.example` → `server/.env` before starting the backend. Copy `client/.env.example` → `client/.env` and adjust `VITE_API_URL` / `VITE_SOCKET_URL` as needed.
> If `localhost` refuses the connection, use `http://127.0.0.1:5173` for the frontend and `http://127.0.0.1:5000` for the backend.

---

## Environment Variables

### Server (`server/.env`)

| Variable | Purpose | Required |
|---|---|---|
| `PORT` | HTTP server port | No (default: 5000) |
| `NODE_ENV` | Application environment | No (default: development) |
| `MONGO_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | Access token signing secret | Yes |
| `JWT_EXPIRES_IN` | Access token expiry | No (default: 7d) |
| `CLIENT_URL` | Allowed frontend origin(s) for CORS | No (default: http://localhost:5173) |
| `DELIVERY_CHARGE` | Flat standard delivery charge | No (default: 30) |
| `SMTP_HOST` | SMTP host | Conditional (required when `EMAIL_ENABLED=true`) |
| `SMTP_PORT` | SMTP port | No (default: 587) |
| `SMTP_USER` | SMTP username | Conditional (required when `EMAIL_ENABLED=true`) |
| `SMTP_PASS` | SMTP app password | Conditional (required when `EMAIL_ENABLED=true`; server-only secret) |
| `EMAIL_FROM` | Sender email address | Conditional (required when `EMAIL_ENABLED=true`) |
| `ADMIN_EMAIL` | Admin email for `seed:admin` script | Conditional (required for `npm run seed:admin`) |
| `ADMIN_PASSWORD` | Admin password for `seed:admin` script | Conditional (required for `npm run seed:admin`; server-only secret) |
| `GEMINI_API_KEY` | Google Gemini API key | Conditional (required for AI assistant; server-only secret) |
| `GEMINI_MODEL` | Gemini AI model | No (default: gemini-flash-lite-latest) |
| `SEED_PASSWORD` | Demo seeder password | Conditional (required for `npm run seed` without `--categories`; server-only secret) |
| `EMAIL_ENABLED` | Enable email delivery | No (default: false) |
| `RESEND_API_KEY` | Resend API key for email delivery | Conditional (required for Resend/newsletter email) |
| `NEWSLETTER_FROM_EMAIL` | Newsletter sender email address | Conditional (required for newsletter/resend email) |
| `NEWSLETTER_FROM_NAME` | Newsletter sender display name | No (default: GreenMart) |
| `NEWSLETTER_REPLY_TO` | Reply-to email header for newsletters | Conditional (optional for newsletters) |
| `NEWSLETTER_UNSUBSCRIBE_SECRET` | Secret for unsubscribe link signatures | Conditional (optional for newsletters; server-only secret) |
| `NEWSLETTER_EMAIL_MODE` | Newsletter email sending mode | No (default: mock) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Conditional (required for product/media uploads) |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Conditional (required for product/media uploads; server-only secret) |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Conditional (required for product/media uploads; server-only secret) |
| `IMAGEKIT_PUBLIC_KEY` | ImageKit public key | Conditional (required for newsletter banner uploads) |
| `IMAGEKIT_PRIVATE_KEY` | ImageKit private key | Conditional (required for newsletter banner uploads; server-only secret) |
| `IMAGEKIT_URL_ENDPOINT` | ImageKit URL endpoint | Conditional (required for newsletter banner uploads) |
| `OSRM_BASE_URL` | Delivery routing service URL | No (default: https://router.project-osrm.org) |

> All variables above are server-side only. Never commit `.env` files (covered by `.gitignore`). Server-only secrets must never be exposed to the frontend. `server/.env` is a local file and is not part of the public project tree; use `server/.env.example` as the template.

Seed-only variables (`SEED_PASSWORD`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`) are used by the `seed` and `seed:admin` scripts, not by normal server operation.

### Client (`client/.env`)

| Variable | Purpose | Required |
|---|---|---|
| `VITE_API_URL` | Backend API base URL | No (default: http://localhost:5000/api) |
| `VITE_SOCKET_URL` | Socket.io server URL | No (default: http://localhost:5000) |
| `VITE_ROUTING_API_URL` | OSRM road routing service URL | No (default: https://router.project-osrm.org) |

> Only variables prefixed with `VITE_` are exposed to the client build. No server secrets (JWT, MongoDB, SMTP, Gemini, Cloudinary, ImageKit) belong in the client environment.

---

## API Overview

All API routes are mounted under `/api`. Routes are organized by domain and protected by authentication/role middleware where applicable.

| Domain | Routes | Auth | Description |
|---|---|---|---|
| Auth | `/auth/*` | No | Register, login, logout, forgot/reset password, refresh token |
| User | `/users/*` | Yes | Profile, addresses, account management |
| Product | `/products/*` | Partial | Public storefront + admin/farmer product CRUD |
| Order | `/orders/*` | Yes | Place, view, track orders; farmer status updates |
| Cart | `/cart/*` | Yes | Cart CRUD persisted in DB |
| Wishlist | `/wishlist/*` | Yes | Wishlist management |
| Farmer | `/farmers/*` | Partial | Farmer profiles, products, dashboard |
| Admin | `/admin/*` | Admin | User/farmer/product/order management, reports, settings |
| Offer | `/offers/*` | Partial | Offer CRUD; customer offers; admin offer management |
| Admin Offer | `/admin/offers/*` | Admin | Create/edit/approve/reject offers for any farmer |
| Notification | `/notifications/*` | Yes | List, unread count, mark read/delete |
| Contact | `/contact/*` | No | Support contact form |
| Message | `/messages/*` | Yes | Customer–farmer messaging |
| Review | `/reviews/*` | Yes | Product reviews (post-purchase) |
| Category | `/categories/*` | Partial | Product categories |
| Crop | `/crops/*` | Yes | Farmer crop management |
| Harvest | `/harvests/*` | Yes | Farmer harvest management |
| Inventory | `/inventory/*` | Yes | Stock tracking and adjustments |
| Sales | `/sales/*` | Yes | Sales reports |
| Location | `/location/*` | Partial | Farm locations, map |
| Settings | `/settings/*` | Admin | Delivery charge, categories config |
| Newsletter | `/newsletter/*` | Partial | Customer preferences and premium subscription; admin campaigns |
| Assistant | `/assistant/*` | Yes | AI shopping assistant (Gemini) |
| Delivery | `/delivery/*` | Yes | Delivery tracking/location updates |

Key public endpoints:
- `GET /products/storefront/offers` — active offers for home page
- `GET /products/storefront/server-time` — server time for countdown accuracy
- `GET /newsletter/subscription/plan` — premium newsletter plan config (no auth)
- `POST /newsletter/subscription/checkout` — create mock payment (authenticated customer)
- `POST /newsletter/subscription/confirm-payment` — confirm mock payment (authenticated customer)

---

## Database Models

GreenMart uses MongoDB with Mongoose. Schemas live in `server/src/models/`.

| Model | Purpose |
|---|---|
| `User` | Accounts (customer/farmer/admin), profile, addresses, roles, password hash |
| `Product` | Product catalog (name, price, stock, category, farmer, images, offers) |
| `Order` | Orders, items, status flow, payment, delivery, snapshots |
| `Cart` | DB-persisted cart per user |
| `CartLock` | Distributed lock for concurrent cart operations; prevents race conditions during guest-cart synchronization |
| `MergeOperation` | Tracks guest-to-customer cart merge operations; supports idempotent, reliable merge processing |
| `Wishlist` | Wishlisted products per user |
| `Category` | Product categories |
| `Address` | Saved addresses |
| `FarmerProfile` | Farmer details, certification, farm photos |
| `Review` | Product reviews |
| `Notification` | Role-based notifications with category, priority, read status |
| `Message` | Customer–farmer messages |
| `Setting` | Delivery charge, categories configuration |
| `Offer` | Time-based product offers with start/end scheduling |
| `Crop` | Farmer crops |
| `Harvest` | Farmer harvests with availability |
| `InventoryAdjustment` | Stock increase/decrease history |
| `InvoiceCounter` | Invoice number sequencing |
| `RefreshToken` | JWT refresh tokens |
| `AdminAuditLog` | Admin action audit trail |
| `Newsletter` | Newsletter subscriptions (legacy guest/customer records) |
| `NewsletterCampaign` | Admin newsletter campaigns |
| `NewsletterPayment` | Premium newsletter payment records |
| `NewsletterRecipient` | Campaign recipients |
| `NewsletterSubscription` | Premium newsletter subscription management |

---

## Authentication and Authorization

### Authentication

- JWT-based stateless authentication.
- Passwords hashed with bcryptjs (never stored/returned in plaintext).
- Access tokens and refresh tokens issued on login; refresh tokens stored in `RefreshToken` collection.
- Password reset via email token (SMTP required for delivery).
- Admin accounts are **not** created via public registration; they are provisioned server-side only via `npm run seed:admin`.

### Authorization

- `auth` middleware — verifies JWT and attaches the user to the request.
- `role(...roles)` middleware — restricts routes to specific roles (`customer`, `farmer`, `admin`).
- `approvedFarmer` middleware — ensures a farmer account is admin-approved before product actions.
- Backend enforces ownership: users access only their own data; farmers access only their own products/orders; admins access all.
- Offer approval status is set by the backend only; frontend cannot decide approval.
- Admin-created/edited offers are approved directly after backend validation and recorded with creator/approver IDs and timestamps.
- Premium newsletter subscription and preferences are customer-only and require authentication.

---

## Testing

### Client (Vitest)

```bash
cd client
npm run test        # vitest run
```

### Server (Jest)

```bash
cd server
npm test            # jest --runInBand --forceExit
```

Server tests run with `mongodb-memory-server` and include Socket.io integration tests for order status and location updates.

### Latest Results

- Backend: 43 test suites passed, 479 tests passed. Full test suite runs without `--forceExit`.
- Frontend: 69 test files passed, 606 tests passed.
- Frontend production build: Successful. Vite 5.4.21; 2,297 modules transformed; build completed in 14.60 seconds.

---

## Deployment

### Backend (Node + Express)

1. Provision a MongoDB database (Atlas recommended) and obtain `MONGO_URI`.
2. Set environment variables in `server/.env` (see Environment Variables section).
3. Install dependencies: `npm install` (production dependencies only recommended).
4. Create the admin: `npm run seed:admin`.
5. Start the server: `npm start` (or `npm run dev` with nodemon in development).
6. The server listens on `PORT` (default 5000).

### Frontend (React + Vite)

1. Set `VITE_API_URL` and `VITE_SOCKET_URL` in `client/.env` to point to your deployed backend.
2. Install dependencies: `npm install`.
3. Build for production: `npm run build` (outputs to `dist/`).
4. Serve `dist/` via a static host (Nginx, Vercel, Netlify, etc.) or serve with a Node static server.

### Production Checklist

- `NODE_ENV=production`
- Strong `JWT_SECRET`
- Real `SMTP_*` credentials if email is enabled (`EMAIL_ENABLED=true`)
- Valid `CLOUDINARY_*` / `IMAGEKIT_*` credentials for image uploads
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` set for first admin provisioning
- `.env` files excluded from version control (`.gitignore`)
- Rate limiting and Helmet enabled for security

---

## Submission for the Atronz Innovation

**GreenMart – Organic E-Commerce Platform**

GreenMart is an organic e-commerce platform developed to connect customers directly with local farmers. The main aim of GreenMart is to promote organic farming, support local farmers, and make fresh, quality organic products easily available to customers.

Customers can browse and purchase products, farmers can manage their products and orders, and administrators can manage and monitor the overall platform.

GreenMart aims to make organic shopping simple, convenient, and reliable while supporting local farming communities.
