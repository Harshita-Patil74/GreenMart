# GreenMart – Organic Products E-Commerce Platform

GreenMart is a full-stack organic products e-commerce platform with role-based access for **Customers**, **Farmers**, and **Admins**, real-time order tracking via Socket.io, and an AI shopping assistant powered by Google Gemini.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Project Folder Structure](#project-folder-structure)
  - [Server (`server/src`)](#server-src)
  - [Client (`client/src`)](#client-src)
- [Features](#features)
  - [Customer Features](#customer-features)
  - [Farmer Features](#farmer-features)
  - [Admin Features](#admin-features)
  - [Shared Features](#shared-features)
- [Roles & Permissions](#roles--permissions)
  - [Role Definitions](#role-definitions)
  - [Permission Matrix](#permission-matrix)
- [Workflow](#workflow)
- [Order Status Flow](#order-status-flow)
- [Product Categories](#product-categories)
- [Environment Variables](#environment-variables)
- [Run Locally](#run-locally)
- [First Admin Account](#first-admin-account)
- [Seed Commands](#seed-commands)
- [Ports](#ports)
- [IPv6 / Connection Note](#ipv6--connection-note)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [License](#license)
- [Recent Changes](#recent-changes)

---

## Project Overview

GreenMart connects customers with local farmers to buy organic produce. Customers browse products, add to cart, checkout, and track orders live. Farmers manage their product catalog, inventory, and fulfill orders. Admins oversee users, farmers, products, orders, and certifications.

## Quick Start

```bash
# Backend (terminal 1)
cd server
cp .env.example .env
# fill .env: MONGO_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, SEED_PASSWORD, GEMINI_API_KEY
npm install
npm run seed:admin
npm run dev      # http://127.0.0.1:5000

# Frontend (terminal 2)
cd client
cp .env.example .env
# VITE_API_URL=http://127.0.0.1:5000/api
# VITE_SOCKET_URL=http://127.0.0.1:5000
npm install
npm run dev      # http://127.0.0.1:5173
```

> If `localhost` refuses the connection, use `http://127.0.0.1:5173` and `http://127.0.0.1:5000` (see [IPv6 / Connection Note](#ipv6--connection-note)).

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS 3.4, Redux Toolkit, React Router, Leaflet, Chart.js |
| Backend | Node.js, Express, MongoDB (Mongoose), Socket.io, JWT, Multer, Zod, bcryptjs |
| AI | Google Gemini (`@google/genai`) – shopping assistant |
| Email | Nodemailer (SMTP) |
| Testing | Vitest (client), Jest (server) including Socket.io integration tests |
| Image uploads | Multer (local `uploads/` directory) |

---

## Project Folder Structure

```
greenmart/
  client/   (React + Vite frontend, port 5173)
  server/   (Node + Express backend, port 5000)
  README.md
```

### Server (`server/src`)

Backend source code organized by concern:

| Path | Purpose |
|---|---|
| `server.js` | Entry point: connects DB, runs defaults, creates HTTP + Socket.io server, listens on port |
| `app.js` | Express app setup: helmet, CORS, JSON body parser, rate limiting, static uploads, route mounting, error handling |
| `config/env.js` | Loads server environment variables; MongoDB validates at startup, while SMTP and Gemini validate when used |
| `config/db.js` | MongoDB connection using Mongoose |
| `config/clientOrigins.js` | Computes allowed CORS origins based on environment |
| `config/gemini.js` | Lazy-initialized Google GenAI client |
| `config/mailer.js` | Nodemailer SMTP transporter + `sendMail` helper |
| `constants/categories.js` | Product categories list |
| `constants/orderStatus.js` | Order status constants and valid status flow |
| `constants/roles.js` | Role constants: `customer`, `farmer`, `admin` |
| `controllers/*.js` | Request handlers for each domain (auth, user, product, order, cart, admin, farmer, etc.) |
| `middleware/auth.js` | JWT authentication middleware |
| `middleware/role.js` | Role-based access control middleware (`role(...roles)`) |
| `middleware/upload.js` | Multer configuration for product, profile-avatar, and farm-photo uploads |
| `middleware/validate.js` | Zod request validation middleware |
| `middleware/errorHandler.js` | Global `notFound` and `errorHandler` middleware |
| `models/*.js` | Mongoose schemas: User, Product, Order, Cart, Wishlist, Category, Address, FarmerProfile, Review, Notification, Message, Setting |
| `routes/*.js` | Express route definitions for each domain, mounted under `/api` |
| `routes/index.js` | Aggregates all route modules |
| `services/*.js` | Business logic layer: cartService, orderService, emailService, notificationService, assistantService, statsService |
| `sockets/index.js` | Socket.io connection setup |
| `sockets/emitters.js` | Socket emitters for real-time events (new order, status update, location update) |
| `bootstrap/ensureDefaults.js` | Seed default categories and settings on startup |
| `seed/seed.js` | Development demo data seeder |
| `seed/createAdmin.js` | First admin account creation |
| `seed/images/*.jpg` | Sample product images for seeding |
| `utils/asyncHandler.js` | Async route handler wrapper |
| `utils/authValidation.js` | Shared auth validation helpers |
| `utils/generateOrderNumber.js` | Order number generator |
| `utils/haversine.js` | Distance calculation for farm locations |
| `utils/tokens.js` | JWT token utilities |

### Client (`client/src`)

Frontend source code organized by feature:

| Path | Purpose |
|---|---|
| `main.jsx` | React entry point |
| `App.jsx` | Root app component with provider and router |
| `api/axiosInstance.js` | Axios instance with base URL, auth token injection, and response normalization |
| `api/*.js` | API service modules per domain (authApi, productApi, orderApi, cartApi, userApi, adminApi, farmerApi, etc.) |
| `app/store.js` | Redux Toolkit store configuration |
| `features/*/slice.js` | Redux slices: auth, cart, products, orders, wishlist, notifications, assistant |
| `components/common/*.jsx` | Shared UI components: Button, Input, Modal, Pagination, EmptyState, ErrorState, ImageWithFallback, Loader, Rating, etc. |
| `components/layout/*.jsx` | Layout shells: Navbar, Sidebar, Topbar, Footer, PublicNavigation |
| `components/product/*.jsx` | ProductCard, ProductGrid, ProductForm, FilterPanel, ReviewList |
| `components/cart/*.jsx` | CartTable, OrderSummary |
| `components/checkout/*.jsx` | AddressCard, CheckoutStepper |
| `components/orders/*.jsx` | OrderStepper |
| `components/map/*.jsx` | MapView, LocationPicker (Leaflet-based farm/customer map) |
| `components/messages/*.jsx` | MessageFarmerModal |
| `components/notifications/*.jsx` | NotificationBell |
| `components/assistant/*.jsx` | ChatAssistant (AI chat UI) |
| `components/dashboard/*.jsx` | StatCard, SalesLineChart |
| `components/routing/*.jsx` | ProtectedRoute (role-gated routes) |
| `layouts/*.jsx` | AuthLayout, PublicLayout, DashboardLayout |
| `pages/public/*.jsx` | Public pages: Home, Shop, ProductDetail, About, Contact, Farmers, FarmerProfile, FarmLocations, NotFound |
| `pages/auth/*.jsx` | Auth pages: Login, Register, ForgotPassword, ResetPassword |
| `pages/customer/*.jsx` | Customer pages: CustomerDashboard, MyOrders, Profile, SavedAddresses, Settings, Wishlist |
| `pages/farmer/*.jsx` | Farmer pages: FarmerDashboard, MyProducts, ProductAddEdit, Inventory, FarmerOrders, FarmerProfilePage, FarmerNotifications |
| `pages/admin/*.jsx` | Admin pages: AdminDashboard, AdminProducts, AdminOrders, AdminUsers, AdminFarmers, AdminInventory, AdminReports, AdminSettings, AdminAnalytics |
| `pages/shared/*.jsx` | Shared pages: Cart, Checkout, OrderConfirmation, OrderDetails, TrackOrder, Notifications |
| `routes/AppRoutes.jsx` | Route definitions with role-based protection |
| `socket/socketClient.js` | Socket.io client connection for real-time updates |
| `hooks/*.js` | Custom hooks: useAuth, useDebounce, useGeolocation |
| `utils/*.js` | Utilities: tokenStorage, roleAccess, authValidation, imageUrl, csv, constants |
| `styles/index.css` | Global Tailwind CSS styles |
| `data/demoCatalog.js` | Demo product catalog data |
| `tests/` | Test utilities |

---

## Features

### Customer Features

- **Account**: Register/login as a customer, manage profile and saved addresses
- **Shopping**: Browse products with search, filter (category, price), and farm origin details; view product detail pages with reviews
- **Cart**: DB-persisted cart that survives across sessions/devices; quantity adjustment and removal
- **Checkout**: Demo checkout with UPI / Card / Cash on Delivery payment options; delivery charge applied
- **Order Tracking**: Live order status tracking (Order Placed → Packed → Out for Delivery → Delivered) with Socket.io updates and farmer delivery location
- **Wishlist**: Save products to a wishlist
- **Reviews**: Review products only after receiving them
- **Messaging**: Message farmers directly about products
- **Notifications**: View notifications and emails for order updates
- **AI Assistant**: Chat with the Google Gemini-powered shopping assistant for product recommendations

### Farmer Features

- **Account**: Register/login as a farmer, manage farm profile and map location
- **Product Management**: Full product CRUD (create, read, update, delete) with Multer image uploads
- **Profile Photos**: Authenticated customer/farmer avatar and farmer farm-photo uploads stored in the local `server/uploads/` directory and served from `/uploads`
- **Inventory**: Track stock levels, receive low-stock alerts, manage inventory
- **Orders**: View orders containing their products; update order status and delivery location
- **Earnings**: View earnings and stats dashboard
- **Certification**: Maintain certification text (subject to admin verification/revocation)
- **Notifications**: Receive live new-order notifications via Socket.io

### Admin Features

- **Dashboard**: View totals and charts (sales, orders, users, products)
- **User Management**: Manage all users; block/unblock and change roles (cannot modify self)
- **Farmer Management**: View and manage all farmers
- **Product Management**: Manage all products across all farmers
- **Order Management**: View and manage all orders
- **Certification**: Verify or revoke farmer certifications
- **Inventory Alerts**: Monitor low-stock products across all farmers
- **Reports**: Export reports as CSV
- **Settings**: Configure delivery charge and product categories
- **Live Feed**: Real-time new-order feed via Socket.io

### Shared Features

- **Responsive UI**: Works on desktop and mobile with Tailwind CSS
- **Real-time updates**: Socket.io for live order status, location, and new-order notifications
- **Image fallbacks**: `ImageWithFallback` component with lazy loading and async decode
- **CSV export**: Admin reports downloadable as CSV
- **Authentication**: JWT-based auth with refresh handling and protected routes

---

## Roles & Permissions

### Role Definitions

| Role | Description | Provisioning |
|---|---|---|
| `customer` | Buys products, manages own cart/orders/profile | Public registration |
| `farmer` | Sells products, manages own inventory and fulfills orders | Public registration |
| `admin` | Oversees the entire platform | Created server-side only via `npm run seed:admin` |

Public registration supports **customers and farmers only**. Setting an `admin` role in a registration request does **not** create an administrator. Admin accounts must be provisioned server-side.

### Permission Matrix

| Permission | Customer | Farmer | Admin |
|---|---|---|---|
| Browse and buy products | yes | no | no |
| Add/edit own products | no | own only | all |
| See own orders | own | orders with their items | all |
| Update order status | never | own items | all |
| Verify/revoke certification | no | no | yes |
| Manage users (block/unblock/role change) | no | no | yes |
| New-order notification | no | yes | live feed |
| View dashboard analytics | no | own earnings/stats | all totals/charts |
| Export CSV reports | no | no | yes |

---

## Workflow

1. **Register/Login** — Customer or farmer registers and logs in; administrators are provisioned server-side via `npm run seed:admin`.
2. **Browse Shop** — Customer browses products, views product detail with farm origin, and uses search/filter.
3. **Add to Cart & Checkout** — Customer adds items to a DB-persisted cart and checks out with UPI / Card / COD.
4. **Order Created** — An order is created; customer, farmer(s), and admin are notified via DB, Socket.io, and email.
5. **Fulfillment** — Farmer updates order status and delivery location; the customer's tracking page updates live.
6. **Review** — On delivery, the customer reviews the received product.
7. **Admin Oversight** — Admin views totals, charts, manages users/farmers/products, and exports reports.

---

## Order Status Flow

```
Order Placed → Packed → Out for Delivery → Delivered
                 ↳ Cancelled (at any pre-delivery stage)
```

Valid statuses: `Order Placed`, `Packed`, `Out for Delivery`, `Delivered`, `Cancelled`.

---

## Product Categories

- Vegetables
- Fruits
- Grains & Pulses
- Dairy & Eggs
- Spices & Herbs
- Eco Friendly
- Others

---

## Environment Variables

### Server (`server/.env`)

| Variable | Description | Example |
|---|---|---|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment | `development` |
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://...` |
| `JWT_SECRET` | JWT signing secret | `ee63e...` |
| `JWT_EXPIRES_IN` | Token expiry | `7d` |
| `CLIENT_URL` | Frontend URL for CORS | `http://localhost:5173` |
| `ADMIN_SIGNUP_CODE` | Admin signup code | `secret-admin-code` |
| `DELIVERY_CHARGE` | Flat delivery charge | `30` |
| `EMAIL_ENABLED` | Enable email delivery (`true`/`false`, default `false`) | `false` |
| `SMTP_HOST` | SMTP host | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | `your@gmail.com` |
| `SMTP_PASS` | SMTP app password | `app-password` |
| `EMAIL_FROM` | Sender name/email | `GreenMart <your@gmail.com>` |
| `ADMIN_EMAIL` | First admin email | `admin@greenmart.test` |
| `GEMINI_API_KEY` | Google Gemini API key | `AQ.Ab...` |
| `GEMINI_MODEL` | Gemini model | `gemini-2.0-flash` |
| `SEED_PASSWORD` | Demo seeder password | `Admin@1234` |
| `ADMIN_PASSWORD` | First admin password | `Gm!...` |

### Client (`client/.env`)

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Backend API base URL | `http://127.0.0.1:5000/api` |
| `VITE_SOCKET_URL` | Socket.io server URL | `http://127.0.0.1:5000` |

---

## Run Locally

### Prerequisites
- Node.js installed
- MongoDB (Atlas cluster URI or local instance)

### Backend

```bash
cd server
cp .env.example .env
# Set MONGO_URI and JWT_SECRET. Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and EMAIL_FROM for email.
# Set GEMINI_API_KEY (and optionally GEMINI_MODEL) to enable the server-side shopping assistant.
npm install
npm run seed:admin
npm run devnp
```

MongoDB and image uploads are required for normal operation. Uploaded product, avatar, and farm photos are stored under `server/uploads/`; keep that directory writable and persistent. SMTP and Gemini are optional integrations: their related features report configuration/delivery failures rather than claiming success when they are unavailable.

### Frontend

```bash
cd client
cp .env.example .env
# VITE_API_URL=http://127.0.0.1:5000/api
# VITE_SOCKET_URL=http://127.0.0.1:5000
npm install
npm run dev
```

- **Frontend**: http://127.0.0.1:5173
- **Backend**: http://127.0.0.1:5000

> If `localhost` refuses the connection, use `http://127.0.0.1:5173` and `http://127.0.0.1:5000` (see [IPv6 / Connection Note](#ipv6--connection-note)).

---

## First Admin Account

Admin accounts are created **only** through the server-side setup command. Public registration supports customers and farmers only.

1. In `server/.env`, set `MONGO_URI` and configure:
   ```
   ADMIN_EMAIL=your-admin@gmail.com
   ADMIN_PASSWORD=use-a-unique-strong-password
   ```
   - `ADMIN_EMAIL` must be a valid lowercase email address.
   - `ADMIN_PASSWORD` must be at least 8 characters and contain lowercase, uppercase, a number, and a special character.
   - Keep `server/.env` private; do not commit it.
2. Create the account:
   ```bash
   cd server
   npm run seed:admin
   ```
   - Hashes the password with bcryptjs.
   - Creates the account only if that email is unused.
   - Safe to rerun; leaves an existing admin unchanged and refuses to promote a customer/farmer account.
3. Start the server and client.
4. Open `http://127.0.0.1:5173/admin/login` and sign in. Successful login opens `/admin/dashboard`.

To reset an admin password, use **Forgot password?** on the login page with the admin email and complete the emailed reset link (configure SMTP first). The seed command does **not** reset or overwrite existing passwords.

---

## Seed Commands

Run from `server/`:

| Command | Purpose |
|---|---|
| `npm run seed:admin` | Create the first administrator (safe to rerun; does not overwrite) |
| `npm run seed` | Seed development demo data (requires `SEED_PASSWORD`; refuses production) |
| `npm run seed:reset` | Remove and replace demo data only (does not reset admin password) |

Demo accounts are created by `npm run seed` using `SEED_PASSWORD`. Do **not** run the demo seeder in production or use demo accounts as production admin credentials.

---

## Ports

| Service | URL |
|---|---|
| Frontend | http://127.0.0.1:5173 (or 5174 if in use) |
| Backend | http://127.0.0.1:5000 |

---

## IPv6 / Connection Note

If `localhost` refuses the connection, use `http://127.0.0.1:5173` for the frontend and `http://127.0.0.1:5000` for the backend. `localhost` may resolve to IPv6 (`::1`) while the servers listen on IPv4 (`0.0.0.0`).

---

## Testing

- **Client (Vitest)**:
  ```bash
  cd client
  npm run test
  ```
- **Server (Jest)**:
  ```bash
  cd server
  npm test
  ```

Server tests run with `mongodb-memory-server` and include Socket.io integration tests for order status and location updates.

---

## Troubleshooting

| Issue | Cause | Fix |
|---|---|---|
| `MongoDB connection or index initialization failed` | `MONGO_URI` is wrong, unreachable, or the Atlas cluster is paused | Verify `MONGO_URI` in `server/.env`. Ensure the Atlas cluster is running and your IP is whitelisted. For local MongoDB, use `mongodb://127.0.0.1:27017/greenmart` and install/run MongoDB locally. |
| `localhost refused to connect` (ERR_CONNECTION_REFUSED) | `localhost` resolves to IPv6 (`::1`) while servers listen on IPv4 (`0.0.0.0`) | Use `http://127.0.0.1:5173` and `http://127.0.0.1:5000` instead of `http://localhost:...`. |
| Port 5173 or 5000 already in use | Another process is bound to the port | Vite will auto-pick an alternate port (e.g. 5174). For the backend, change `PORT` in `server/.env` and restart. |
| `Request failed with status code 429` | Rate limiter tripped from repeated `localhost` IPv6 retries | Switch to `http://127.0.0.1` URLs and restart the backend to reset the in-memory rate-limit store. |
| Admin login fails / admin not found | `npm run seed:admin` was not run or `ADMIN_EMAIL`/`ADMIN_PASSWORD` not set | Configure `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `server/.env`, then run `npm run seed:admin`. |

---

## License

This project is private and intended for internal use. Do not distribute or publish without authorization.

---

## Recent Changes

- UI consistency passes: base font 17px, shared layout components, container 1280px, responsive grids.
- Map fix: FarmLocations now uses Leaflet MapView with real markers/popups; invalid coordinates skipped.
- Shared components normalized (Button, Input, Modal, Pagination, EmptyState, ErrorState, StatCard).
- Full role workflow (register → farm pin → admin verify → order → live tracking → review → dashboard) not verified end-to-end.
- Product/farm images use local assets served via `ImageWithFallback` (lazy + async decode + placeholder fallback).
- Automated tests: client (Vitest) and server (Jest), including Socket.io integration tests for order status/location updates.
- Frontend navigation: reusable NextButton integrated on Cart (Continue to Checkout), Wishlist (Continue Shopping), ProductDetail (View Cart), OrderConfirmation (View My Orders). BackButton remains widely used.
- Recent runtime fixes: FarmerOrders Search/LoaderCircle imports, ForgotPassword/Register Logo imports, Farmers DEMO_FARMS fallback.
- Frontend tests: 24 files, 92/92 passing. Production build passing.
- Inventory: editable Current Stock and Minimum Stock in one form; status and summary counts update dynamically.
- AI assistant: Google Gemini integration for shopping recommendations; configured via GEMINI_API_KEY.