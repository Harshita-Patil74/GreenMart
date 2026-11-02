# GreenMart – Organic Products E-Commerce Platform

GreenMart connects customers with local farmers to buy organic produce. Customers browse products, add to cart, checkout, and track orders live. Farmers manage their product catalog, inventory, and fulfill orders. Admins oversee users, farmers, products, orders, and certifications.

Tagline: **Fresh. Organic. Direct from Farmers.**

---

## Table of Contents

- [Project Overview](#project-overview)
- [Quick Start](#quick-start)
- [Tech Stack](#tech-stack)
- [Project Folder Structure](#project-folder-structure)
- [Features](#features)
  - [Customer Features](#customer-features)
  - [Farmer Features](#farmer-features)
  - [Admin Features](#admin-features)
  - [Shared Features](#shared-features)
- [Roles & Permissions](#roles--permissions)
- [Environment Variables](#environment-variables)
- [Run Locally](#run-locally)
- [Database and First Admin](#database-and-first-admin)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [License](#license)
- [Recent Changes](#recent-changes)

---

## Project Overview

GreenMart connects customers with local farmers to buy organic produce. Customers browse products, add to cart, checkout, and track orders live. Farmers manage their product catalog, inventory, and fulfill orders. Admins oversee users, farmers, products, orders, and certifications.

---

## Quick Start

### Prerequisites
- Node.js installed
- MongoDB (Atlas cluster URI or local instance)

### Backend

```bash
cd server
cp .env.example .env
# fill .env: MONGO_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, SEED_PASSWORD, GEMINI_API_KEY
npm install
npm run seed:admin
npm run dev      # http://127.0.0.1:5000
```

### Frontend

```bash
cd client
cp .env.example .env
# VITE_API_URL=http://127.0.0.1:5000/api
# VITE_SOCKET_URL=http://127.0.0.1:5000
npm install
npm run dev      # http://127.0.0.1:5173
```

> The root `server/.env.example` exists and should be copied to `.env` before starting the backend.
> The client directory does **not** ship with a `.env.example` file. Create `client/.env` manually with `VITE_API_URL` and `VITE_SOCKET_URL`.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS 3.4, Redux Toolkit, React Router, Axios, Leaflet / React Leaflet, Chart.js / react-chartjs-2, Lucide React, Socket.IO Client, React Hot Toast |
| Backend | Node.js, Express, MongoDB (Mongoose), JWT, bcryptjs, Zod, Multer, Socket.IO, Nodemailer, Helmet, Express Rate Limit |
| AI | Google Gemini (`@google/genai` SDK, `GoogleGenAI` client) |
| Image Storage | Multer handles incoming multipart/form-data file uploads and stores them temporarily on the local server (`server/uploads/`). Cloudinary (via its Node.js SDK) provides cloud-based image storage and delivery — uploaded files are streamed from local temp storage to Cloudinary, and Cloudinary URLs are persisted in MongoDB. |
| Testing | Vitest (client), Jest (server), including Socket.io integration tests |

---

## Project Folder Structure

```
greenmart/
  client/   (React + Vite frontend)
  server/   (Node + Express backend)
  README.md
```

### Server (`server/src`)

| Path | Purpose |
|---|---|
| `server.js` | Entry point: connects DB, runs defaults, creates HTTP + Socket.io server, listens on port |
| `app.js` | Express app setup: helmet, CORS, JSON body parser, rate limiting, static uploads, route mounting, error handling |
| `config/env.js` | Loads server environment variables; validates MongoDB at startup |
| `config/cloudinary.js` | Cloudinary SDK configuration |
| `config/gemini.js` | Lazy-initialized Google GenAI client |
| `config/mailer.js` | Nodemailer SMTP transporter + `sendMail` helper |
| `config/clientOrigins.js` | Computes allowed CORS origins based on environment |
| `constants/categories.js` | Product categories list |
| `constants/orderStatus.js` | Order status constants and valid status flow |
| `constants/roles.js` | Role constants: `customer`, `farmer`, `admin` |
| `controllers/*.js` | Request handlers for each domain (auth, user, product, order, cart, admin, farmer, etc.) |
| `middleware/auth.js` | JWT authentication middleware |
| `middleware/role.js` | Role-based access control middleware (`role(...roles)`) |
| `middleware/approvedFarmer.js` | Ensures farmer account is admin-approved before product actions |
| `middleware/upload.js` | Multer configuration for product, avatar, and farm-photo uploads |
| `middleware/validate.js` | Zod request validation middleware |
| `middleware/errorHandler.js` | Global `notFound` and `errorHandler` middleware |
| `models/*.js` | Mongoose schemas: User, Product, Order, Cart, Wishlist, Category, Address, FarmerProfile, Review, Notification, Message, Setting |
| `routes/*.js` | Express route definitions for each domain (auth, product, order, cart, farmer, admin, contact, message, offer, review, settings, etc.) |
| `routes/index.js` | Aggregates all route modules |
| `services/*.js` | Business logic layer: cartService, orderService, offerService, emailService, notificationService, assistantService, statsService, cloudinaryUpload |
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

| Path | Purpose |
|---|---|
| `main.jsx` | React entry point |
| `App.jsx` | Root app component with provider and router |
| `api/axiosInstance.js` | Axios instance with base URL, auth token injection, and response normalization |
| `api/*.js` | API service modules per domain (authApi, productApi, orderApi, cartApi, userApi, adminApi, farmerApi, notificationApi, contactApi, messageApi, assistantApi, etc.) |
| `app/store.js` | Redux Toolkit store configuration |
| `features/*/slice.js` | Redux slices: auth, cart, products, orders, wishlist, notifications, assistant |
| `components/common/*.jsx` | Shared UI components: Button, Input, Modal, Pagination, EmptyState, ErrorState, ImageWithFallback, Loader, Rating, etc. |
| `components/layout/*.jsx` | Layout shells: Navbar, Topbar, Sidebar, Footer, PublicNavigation, RoleNavigation, MobileNavigationDrawer |
| `components/product/*.jsx` | ProductCard, ProductGrid, ProductForm, FilterPanel, ReviewList |
| `components/cart/*.jsx` | CartTable, OrderSummary, QuantityControl |
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
| `pages/admin/*.jsx` | Admin pages: AdminDashboard, AdminNotifications, AdminProducts, AdminOrders, AdminUsers, AdminFarmers, AdminInventory, AdminReports, AdminSettings, AdminAnalytics |
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
- **Offers**: Eligible, approved farmer promotions are priced by the server, shown in the shop/cart, and snapshotted on order items at checkout
- **Order Tracking**: Live order status tracking (Order Placed → Packed → Out for Delivery → Delivered) with Socket.io updates and farmer delivery location
- **Wishlist**: Save products to a wishlist
- **Reviews**: Review products only after receiving them
- **Messaging**: Message farmers directly about products
- **Notifications**: View notifications and emails for order updates; optimistic quantity updates with instant UI feedback and backend sync
- **AI Assistant**: Chat with the Google Gemini-powered shopping assistant for product recommendations

### Farmer Features

- **Account**: Register as a farmer; account requires admin approval before product actions (via `approvedFarmer` middleware)
- **Product Management**: Full product CRUD (create, read, update, delete) with Multer image uploads; images are streamed to Cloudinary for storage/delivery
- **Profile Photos**: Authenticated customer/farmer avatar and farmer farm-photo uploads stored via Multer + Cloudinary
- **Inventory**: Track stock levels, receive low-stock alerts, manage inventory
- **Orders**: View orders containing their products; update order status and delivery location
- **My Offers**: Create, edit, view, and deactivate product offers; new or materially edited offers require admin approval
- **Offer performance**: Offer units and sales are attributed from delivered order-item snapshots, not current product prices
- **Bundle offers**: Bundle discounts apply to the selected product once its minimum quantity is met; multi-product bundles are not supported. Minimum order amount is evaluated against the original cart subtotal before discounts.
- **Earnings**: View earnings and stats dashboard
- **Certification**: Maintain certification text (subject to admin verification/revocation)
- **Notifications**: Receive live new-order notifications via Socket.io; notifications persist in MongoDB and survive refresh/login

### Admin Features

- **Dashboard**: View totals and charts (sales, orders, users, products)
- **Notifications**: Admin Notifications page for orders, farmers, products, inventory, support, reviews, and security alerts; real-time Socket.io delivery; mark-as-read/delete
- **User Management**: Manage all users; block/unblock and change roles (cannot modify self)
- **Farmer Management**: View and manage all farmers; verify/revoke farmer certifications
- **Product Management**: Manage all products across all farmers
- **Offer Approvals**: Filter, review, approve, reject, and deactivate farmer offers
- **Order Management**: View and manage all orders
- **Certification**: Verify or revoke farmer certifications
- **Inventory Alerts**: Monitor low-stock products across all farmers
- **Reports**: Export reports as CSV
- **Settings**: Configure delivery charge and product categories
- **Live Feed**: Real-time new-order feed via Socket.io

### Shared Features

- **Responsive UI**: Works on desktop and mobile with Tailwind CSS
- **Responsive, role-based hamburger navigation**: Shared header (`Navbar.jsx` for public, `Topbar.jsx` for dashboard roles) with a hamburger menu button on mobile/tablet that opens a `MobileNavigationDrawer`. The drawer displays navigation links determined by the authenticated user's role — customer, farmer, admin, or guest/public. Features include backdrop dismissal, close button, Escape-key dismissal, automatic drawer closing after navigation, accessible ARIA attributes, keyboard navigation, and visible focus states.
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
| `farmer` | Sells products, manages own inventory and fulfills orders | Public registration; requires admin approval before product actions |
| `admin` | Oversees the entire platform | Created server-side only via `npm run seed:admin` |

Public registration supports **customers and farmers only**. Setting an `admin` role in a registration request does **not** create an administrator. Admin accounts must be provisioned server-side.

### Permission Matrix

| Permission | Customer | Farmer | Admin |
|---|---|---|---|
| Browse and buy products | yes | no | no |
| Add/edit own products | no | own only (approved farmers) | all |
| See own orders | own | orders with their items | all |
| Update order status | never | own items | all |
| Verify/revoke certification | no | no | yes |
| Manage users (block/unblock/role change) | no | no | yes |
| New-order notification | no | yes | live feed |
| View dashboard analytics | no | own earnings/stats | all totals/charts |
| View notifications | own | own | all (Admin Notifications page) |
| Export CSV reports | no | no | yes |

### Important Security Notes

- Authorization is enforced by **backend middleware** (`auth`, `role`, `approvedFarmer`) and protected routes — not by the frontend alone.
- Farmers cannot perform product actions until their account is approved by an admin (`approvedFarmer` middleware checks the `farmerApproved` flag).
- Administrators cannot view user passwords. Passwords are hashed with bcryptjs and never stored or returned in plaintext.

---

## Environment Variables

### Server (`server/.env`)

| Variable | Purpose | Required |
|---|---|---|
| `PORT` | Server port | No (default: 5000) |
| `NODE_ENV` | Environment | No (default: development) |
| `MONGO_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `JWT_EXPIRES_IN` | Token expiry | No (default: 7d) |
| `CLIENT_URL` | Frontend URL for CORS | No (default: http://localhost:5173) |
| `DELIVERY_CHARGE` | Flat delivery charge | No (default: 30) |
| `EMAIL_ENABLED` | Enable email delivery | No (default: false) |
| `SMTP_HOST` | SMTP host | No (only if email enabled) |
| `SMTP_PORT` | SMTP port | No (default: 587) |
| `SMTP_USER` | SMTP username | No (only if email enabled) |
| `SMTP_PASS` | SMTP app password | No (only if email enabled) |
| `EMAIL_FROM` | Sender name/email | No (only if email enabled) |
| `ADMIN_EMAIL` | First admin email | Yes (for seed:admin) |
| `ADMIN_PASSWORD` | First admin password | Yes (for seed:admin) |
| `GEMINI_API_KEY` | Google Gemini API key | No (only for AI assistant) |
| `GEMINI_MODEL` | Gemini model | No (default: gemini-flash-lite-latest) |
| `SEED_PASSWORD` | Demo seeder password | No (only for seed) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | No (only for image uploads) |
| `CLOUDINARY_API_KEY` | Cloudinary API key | No (only for image uploads) |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | No (only for image uploads) |

> The root `server/.env.example` exists and contains all the above variables. Copy it to `.env` and fill in real values before starting the backend.
> The client directory does **not** ship with a `.env.example` file. Create `client/.env` manually.

### Client (`client/.env`)

| Variable | Purpose | Required |
|---|---|---|
| `VITE_API_URL` | Backend API base URL | No (default: http://127.0.0.1:5000/api) |
| `VITE_SOCKET_URL` | Socket.io server URL | No (default: http://127.0.0.1:5000) |

### Variable Classification

- **Required**: `MONGO_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (backend)
- **Optional but recommended**: `SMTP_*` (email), `GEMINI_API_KEY` (AI assistant), `CLOUDINARY_*` (image uploads)
- **Never commit secrets**: `.env` files contain credentials and must not be committed to version control.

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
# Configure CLOUDINARY_* for cloud image storage.
npm install
npm run seed:admin
npm run dev      # http://127.0.0.1:5000
```

### Frontend

```bash
cd client
# Create client/.env manually (no .env.example ships with the project):
# VITE_API_URL=http://127.0.0.1:5000/api
# VITE_SOCKET_URL=http://127.0.0.1:5000
npm install
npm run dev
```

- **Frontend**: http://127.0.0.1:5173 (or alternate port if in use)
- **Backend**: http://127.0.0.1:5000

> If `localhost` refuses the connection, use `http://127.0.0.1:5173` for the frontend and `http://127.0.0.1:5000` for the backend. `localhost` may resolve to IPv6 (`::1`) while the servers listen on IPv4 (`0.0.0.0`).

---

## Database and First Admin

- Database: MongoDB (connection via `MONGO_URI`)
- Mongoose is the ODM; schemas live in `server/src/models/`
- Admin accounts are created **only** through the server-side setup command. Public registration supports customers and farmers only.

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
| Image upload fails | Cloudinary credentials missing or invalid | Configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` in `server/.env`. Multer stores files locally first; Cloudinary upload requires valid credentials. |

---

## License

This project is private and intended for internal use. Do not distribute or publish without authorization.

---

## Recent Changes

- Cart quantity: optimistic updates (instant UI feedback), smooth QuantityControl controls, per-item pending states, stock validation, rollback on API failure
- Notifications: customer + farmer order-placed and status-change notifications via DB + Socket.io; admin notifications for orders, farmers, products, inventory, support, reviews, security
- Admin Notifications page: summary cards, category filters, mark-as-read/delete, pagination, loading/empty/error states
- Inventory: editable Current Stock and Minimum Stock per product; targeted product update (avoids full-document validation on stock-only changes); low-stock/out-of-stock status transitions
- Product validation fix: stock-only updates no longer blocked by missing legacy product descriptions
- UI consistency passes: base font 17px, shared layout components, container 1280px, responsive grids.
- Customer mobile drawer (hamburger menu): shows public links (Home, Shop, Offers, About, Farmers, Contact) followed by customer links (Customer Dashboard, My Orders, Cart, Wishlist, Track Orders, Profile, Notifications, Settings) and Logout; customer login redirects to home page
