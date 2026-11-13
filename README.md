# GreenMart – Organic Products E-Commerce Platform

GreenMart connects customers with local farmers to buy organic produce. Customers browse products, add to cart, checkout, and track orders live. Farmers manage their product catalog, inventory, and fulfill orders. Admins oversee users, farmers, products, orders, offers, and certifications.

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
- [Admin Offer Management](#admin-offer-management)
- [Home Page Offers](#home-page-offers)
- [Continuous Horizontal Carousel Animations](#continuous-horizontal-carousel-animations)
- [Time-Based Offers & Scheduling](#time-based-offers--scheduling)
- [Notification System](#notification-system)
- [Roles & Permissions](#roles--permissions)
- [Environment Variables](#environment-variables)
- [Run Locally](#run-locally)
- [Development Workflow](#development-workflow)
- [Database and First Admin](#database-and-first-admin)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [License](#license)
- [Recent Changes](#recent-changes)

---

## Project Overview

GreenMart connects customers with local farmers to buy organic produce. Customers browse products, add to cart, checkout, and track orders live. Farmers manage their product catalog, inventory, and fulfill orders. Admins oversee users, farmers, products, orders, offers, and certifications.

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
> The client ships with `client/.env.example`. Copy it to `client/.env` and adjust `VITE_API_URL` / `VITE_SOCKET_URL` as needed.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS 3.4, Redux Toolkit, React Router, Axios, Leaflet / React Leaflet, Chart.js / react-chartjs-2, Lucide React, Socket.IO Client, React Hot Toast, React Toastify, SweetAlert2, Framer Motion (useMotionValue-driven ContinuousMarquee infinite horizontal carousels with responsive clamp() card widths, hover/focus pause, touch swipe pause/resume, and prefers-reduced-motion support) |
| Backend | Node.js, Express, MongoDB (Mongoose), JWT, bcryptjs, Zod, Multer, Socket.IO, Nodemailer, Helmet, Express Rate Limit, cookie-parser, dotenv, pdfkit, pdf-poppler |
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
| `config/db.js` | Mongoose database connection |
| `config/cloudinary.js` | Cloudinary SDK configuration |
| `config/gemini.js` | Lazy-initialized Google GenAI client |
| `config/mailer.js` | Nodemailer SMTP transporter + `sendMail` helper |
| `config/clientOrigins.js` | Computes allowed CORS origins based on environment |
| `constants/categories.js` | Product categories list |
| `constants/orderStatus.js` | Order status constants and valid status flow |
| `constants/roles.js` | Role constants: `customer`, `farmer`, `admin` |
| `controllers/*.js` | Request handlers for each domain (auth, user, product, order, cart, admin, farmer, offer, notification, etc.) |
| `middleware/auth.js` | JWT authentication middleware |
| `middleware/role.js` | Role-based access control middleware (`role(...roles)`) |
| `middleware/approvedFarmer.js` | Ensures farmer account is admin-approved before product actions |
| `middleware/upload.js` | Multer configuration for product, avatar, and farm-photo uploads |
| `middleware/validate.js` | Zod request validation middleware |
| `middleware/errorHandler.js` | Global `notFound` and `errorHandler` middleware |
| `models/*.js` | Mongoose schemas: User, Product, Order, Cart, Wishlist, Category, Address, FarmerProfile, Review, Notification, Message, Setting, Offer, Crop, Harvest, InventoryAdjustment, InvoiceCounter, RefreshToken, AdminAuditLog |
| `routes/*.js` | Express route definitions for each domain (auth, product, order, cart, farmer, admin, contact, message, offer, review, settings, notification, crop, harvest, inventory, sales, location, adminOffer, etc.) |
| `routes/index.js` | Aggregates all route modules |
| `services/*.js` | Business logic layer: cartService, orderService, offerService, emailService, notificationService, assistantService, statsService, cloudinaryUpload, reportPdfService |
| `sockets/index.js` | Socket.io connection setup |
| `sockets/emitters.js` | Socket emitters for real-time events (new order, status update, location update, notification) |
| `bootstrap/ensureDefaults.js` | Seed default categories and settings on startup |
| `seed/seed.js` | Development demo data seeder |
| `seed/createAdmin.js` | First admin account creation |
| `seed/images/*.jpg` | Sample product images for seeding |
| `utils/asyncHandler.js` | Async route handler wrapper |
| `utils/authValidation.js` | Shared auth validation helpers |
| `utils/generateOrderNumber.js` | Order number generator |
| `utils/haversine.js` | Distance calculation for farm locations |
| `utils/tokens.js` | JWT token utilities |
| `utils/invoice.js` | PDF invoice generation |
| `utils/invoiceNumbers.js` | Invoice number sequencing |
| `utils/offerValidation.js` | Offer discount validation helpers |

### Client (`client/src`)

| Path | Purpose |
|---|---|
| `main.jsx` | React entry point |
| `App.jsx` | Root app component with provider and router |
| `api/axiosInstance.js` | Axios instance with base URL, auth token injection, and response normalization |
| `api/*.js` | API service modules per domain (authApi, productApi, orderApi, cartApi, userApi, adminApi, farmerApi, notificationApi, contactApi, messageApi, assistantApi, adminOffersApi, etc.) |
| `app/store.js` | Redux Toolkit store configuration |
| `features/*/slice.js` | Redux slices: auth, cart, products, orders, wishlist, notifications, assistant |
| `components/common/*.jsx` | Shared UI components: Button, Input, Modal, Pagination, EmptyState, ErrorState, ImageWithFallback, Loader, Rating, ContinuousMarquee (infinite horizontal carousel), etc. |
| `components/layout/*.jsx` | Layout shells: Navbar, Topbar, Sidebar, Footer, PublicNavigation, RoleNavigation, MobileNavigationDrawer |
| `components/notifications/*.jsx` | NotificationBell |
| `components/offers/*.jsx` | OfferCountdown (live countdown timers for scheduled offers) |
| `components/product/*.jsx` | ProductCard, ProductGrid, ProductForm, FilterPanel, ReviewList |
| `components/cart/*.jsx` | CartTable, OrderSummary, QuantityControl |
| `components/checkout/*.jsx` | AddressCard, CheckoutStepper |
| `components/orders/*.jsx` | OrderStepper |
| `components/map/*.jsx` | MapView, LocationPicker (Leaflet-based farm/customer map) |
| `components/messages/*.jsx` | MessageFarmerModal |
| `components/assistant/*.jsx` | ChatAssistant (AI chat UI) |
| `components/dashboard/*.jsx` | StatCard, SalesLineChart |
| `components/routing/*.jsx` | ProtectedRoute (role-gated routes) |
| `layouts/*.jsx` | AuthLayout, PublicLayout, DashboardLayout |
| `pages/public/*.jsx` | Public pages: Home, Shop, ProductDetail, About, Contact, Farmers, FarmerProfile, FarmLocations, NotFound |
| `pages/auth/*.jsx` | Auth pages: Login, Register, ForgotPassword, ResetPassword |
| `pages/customer/*.jsx` | Customer pages: CustomerDashboard, MyOrders, Profile, SavedAddresses, Settings, Wishlist |
| `pages/farmer/*.jsx` | Farmer pages: FarmerDashboard, MyProducts, ProductAddEdit, Inventory, FarmerOrders, FarmerProfilePage, FarmerNotifications |
| `pages/admin/*.jsx` | Admin pages: AdminDashboard, AdminNotifications, AdminProducts, AdminOrders, AdminUsers, AdminFarmers, AdminInventory, AdminReports, AdminSettings, AdminAnalytics, AdminOffers |
| `pages/shared/*.jsx` | Shared pages: Cart, Checkout, OrderConfirmation, OrderDetails, TrackOrder, Notifications |
| `routes/AppRoutes.jsx` | Route definitions with role-based protection |
| `socket/socketClient.js` | Socket.io client connection for real-time updates |
| `hooks/*.js` | Custom hooks: useAuth, useDebounce, useGeolocation |
| `config/notificationConfig.js` | Centralized notification type → icon mapping, colors, and category lists |
| `utils/*.js` | Utilities: tokenStorage, roleAccess, authValidation, imageUrl, csv, constants |
| `styles/index.css` | Global Tailwind CSS styles |
| `data/demoCatalog.js` | Demo product catalog data |
| `tests/` | Test utilities |

---

## Features

### Customer Features

- **Account**: Register/login as a customer, manage profile and saved addresses
- **Shopping**: Browse products with search, filter (category, price), and farm origin details; view product detail pages with reviews
- **Home Page Offers**: "Special Offers & Discounts" section below the hero shows approved, active product offers with real prices, images, dates, live countdown timers (hours:minutes:seconds), and a **View All Offers** link. Offers scroll continuously right-to-left in an infinite horizontal marquee carousel that pauses on hover and supports touch swiping on mobile.
- **Cart**: DB-persisted cart that survives across sessions/devices; quantity adjustment and removal
- **Checkout**: Demo checkout with UPI / Card / Cash on Delivery payment options; delivery charge applied; offers revalidated and calculated by the backend using server time
- **Offers**: Eligible, approved farmer promotions are priced by the server, shown in the shop/cart, and snapshotted on order items at checkout. Offers support scheduled start/end date and time; upcoming offers show a countdown until start, active offers show a countdown until expiry
- **Featured Products**: Products with an eligible active offer show original price (strikethrough), discounted price, and a discount badge; products without offers keep their normal price. Featured products scroll continuously right-to-left in an infinite horizontal marquee carousel that pauses on hover.
- **Customer Dashboard**: Recommended products and Offers & Discounts (Active and Coming Soon tabs) scroll continuously right-to-left in independent infinite horizontal marquee carousels that pause on hover/focus and support touch swiping on mobile.
- **Order Tracking**: Live order status tracking (Order Placed → Packed → Out for Delivery → Delivered) with Socket.io updates and farmer delivery location
- **Wishlist**: Save products to a wishlist; notified when a wishlisted product comes back in stock
- **Reviews**: Review products only after receiving them
- **Messaging**: Message farmers directly about products
- **Notifications**: View notifications for order updates, offers, wishlist, messages, support, and account; mark-as-read/delete; category filters; loading/empty/error states
- **AI Assistant**: Chat with the Google Gemini-powered shopping assistant for product recommendations

### Farmer Features

- **Account**: Register as a farmer; account requires admin approval before product actions (via `approvedFarmer` middleware)
- **Product Management**: Full product CRUD (create, read, update, delete) with Multer image uploads; images are streamed to Cloudinary for storage/delivery
- **Profile Photos**: Authenticated customer/farmer avatar and farmer farm-photo uploads stored via Multer + Cloudinary
- **Inventory**: Track stock levels, receive low-stock alerts, manage inventory; notified when stock transitions to low or back in stock
- **Orders**: View orders containing their products; update order status and delivery location
- **My Offers**: Create, edit, view, and deactivate product offers with scheduled start/end date and time; new or materially edited offers require admin approval
- **Offer performance**: Offer units and sales are attributed from delivered order-item snapshots, not current product prices
- **Bundle offers**: Bundle discounts apply to the selected product once its minimum quantity is met; multi-product bundles are not supported. Minimum order amount is evaluated against the original cart subtotal before discounts.
- **Earnings**: View earnings and stats dashboard
- **Certification**: Maintain certification text (subject to admin verification/revocation); notified when certification is verified or rejected with reason
- **Notifications**: Receive live new-order notifications via Socket.io; notifications persist in MongoDB and survive refresh/login; category filters, mark-as-read/delete, pagination

### Crop Management

- Create, list, view, update, and delete crops owned by the farmer
- Each crop is tied to the registering farmer

### Harvest Management

- Create, list, view, update, and delete harvests owned by the farmer
- Update harvest availability (quantity and sale status)

### Inventory Adjustments

- Record stock increases/decreases for products and harvests
- View adjustment history per item and across all items

### Admin Features

- **Dashboard**: View totals and charts (sales, orders, users, products)
- **Notifications**: Admin Notifications page for orders, farmers, products, inventory, support, reviews, and security alerts; real-time Socket.io delivery; mark-as-read/delete
- **User Management**: Manage all users; block/unblock and change roles (cannot modify self)
- **Farmer Management**: View and manage all farmers; verify/revoke farmer certifications; notified of new farmer registrations
- **Product Management**: Manage all products across all farmers; notified of new products, low-stock, out-of-stock
- **Offer Approvals**: Filter, review, approve, reject, and deactivate farmer offers; rejection includes reason
- **Admin Offer Management**: Independently create new offers (for any farmer's eligible product) and edit any farmer's offer; supports scheduled start/end date and time; admin-created/edited offers are approved directly without a separate approval step; notified farmers of changes
- **Order Management**: View and manage all orders
- **Certification**: Verify or revoke farmer certifications
- **Inventory Alerts**: Monitor low-stock products across all farmers
- **Reports**: Export reports as CSV
- **Settings**: Configure delivery charge and product categories
- **Live Feed**: Real-time new-order feed via Socket.io
- **Sales Reports**: View farmer sales overview (revenue, orders, products sold, quantity)
- **PDF Invoices**: Generate and download order invoices as PDF
- **Contact Form**: Customers submit support requests; admins are notified
- **Admin Audit Log**: Track admin actions for accountability

---

## Admin Offer Management

Admin has complete offer management access across all farmers.

### Permissions

| Action | Permission |
|---|---|
| View all farmers' offers | Yes |
| Create a new offer | Yes |
| Edit any farmer's offer | Yes |
| Approve new farmer-submitted offers | Yes |
| Approve edited farmer-submitted offers | Yes |
| Reject pending offers with a reason | Yes |
| Deactivate any offer | Yes |
| View rejected offers | Yes |
| View inactive offers | Yes |
| Search and filter all offers | Yes |

Farmers retain their existing permissions: create/edit offers for their own eligible products, submit for admin approval, view approval status/rejection reasons, correct and resubmit rejected offers, deactivate their own offers. Farmers cannot approve, reject, or edit another farmer's offers.

### Admin Create Offer

Admin can create an offer via **Admin → Offer Management → Create Offer**. Fields: Offer Title, Description, Offer Type, Farmer, Product, Discount Type, Discount Value, Start Date, Start Time, End Date, End Time, Minimum Quantity, Minimum Order Amount, Maximum Discount.

- Admin can select any registered and eligible farmer; after selecting a farmer, only that farmer's eligible products load (actual product name, image, price, stock from MongoDB).
- Frontend validation plus full backend validation of discount values, dates, and minimum conditions.
- Backend does not trust frontend-supplied farmer IDs, product prices, or stock values.
- Admin-created offers are saved as `Approved` after successful server-side validation; creator and approver administrator IDs and timestamps are recorded.
- The associated farmer is notified that Admin created an offer for their product.

### Admin Edit Offer

Admin can edit any offer regardless of which farmer created it, via the **Edit Offer** action on the offer details page and offer list. Editable fields: Offer Title, Description, Offer Type, Associated Farmer, Associated Product, Discount Type, Discount Value, Start Date, Start Time, End Date, End Time, Minimum Quantity, Minimum Order Amount, Maximum Discount.

- Existing offer details load into the edit form; changing the farmer reloads that farmer's eligible products.
- Product ownership and offer configuration are revalidated on the backend; frontend-supplied prices/stock are not trusted.
- The administrator who edited the offer and the edit timestamp are recorded; previous information is preserved in audit history.
- Admin edits are saved directly as `Approved` when validation succeeds and do not go into the farmer approval queue. A previously `Rejected` offer can be corrected and approved through the edit workflow.
- The associated farmer is notified about the changes; invalid updates are rejected with a meaningful validation error.

---

## Home Page Offers

The Home page includes a **Special Offers & Discounts** section below the hero and before Featured Products. Both offers and featured products are displayed in continuous horizontal marquee carousel rows.

### Continuous Carousel Behavior

- Offer cards and product cards scroll continuously from right to left in an infinite marquee loop.
- The card sequence is duplicated so the loop wraps seamlessly — no blank gaps or abrupt position resets.
- Movement pauses on mouse hover and keyboard focus, and resumes when interaction ends.
- On mobile, the carousel supports natural touch swiping; auto movement pauses while the user is actively touching/dragging and resumes after interaction ends.
- Card widths are responsive (`clamp()`-based): roughly 1–2 cards on mobile (320–767px), 2–3 on tablets (768–1023px), and multiple cards on desktop (1024px+).
- `overflow: hidden` is applied only to the carousel viewport — never to the entire page — so horizontal page overflow is prevented.
- With `prefers-reduced-motion`, automatic movement is disabled and the row becomes a manually scrollable horizontal list.
- All card interactions remain functional: product navigation, Add to Cart, Wishlist, and OfferCountdown timers are preserved.

- Only offers that are `Approved`, active, not deactivated, within valid start/end dates/times, with an active available product belonging to the correct farmer, and valid discount configuration appear.
- Pending, rejected, inactive, or expired offers never appear as active promotions.
- Each offer card shows product image, product name, offer title, original price (strikethrough), discounted final price, discount badge (`20% OFF` / `₹30 OFF`), start/end dates and times, minimum quantity, live countdown timer, and a **Shop Now** action.
- Discounts are calculated using actual database product prices, respecting maximum discount limits, minimum quantity, minimum order amount, and offer dates/times.
- Upcoming offers show a countdown until start; active offers show a countdown until expiry.
- Featured Products cards show original price (strikethrough), discounted price, and discount badge when a product has an eligible offer; products without offers keep their normal price.
- **View All Offers** link navigates to the existing Offers page.
- Empty state: "No active offers available right now. Check back soon!"

## Continuous Horizontal Carousel Animations

GreenMart implements five independent horizontal marquee carousel rows using Framer Motion (`^14.6.0`):

| # | Section | Page | Content | Speed | Card Width (desktop) | Card Width (mobile min) |
|---|---------|------|---------|-------|----------------------|-------------------------|
| 1 | Offers & Discounts | Home | Active offers (`HomeOfferCard`) | 50 px/s | 260px | 170px |
| 2 | Featured Products | Home | Products (`ProductCard`) | 40 px/s | 220px | 160px |
| 3 | Offers & Discounts | Customer Dashboard | Active offers (`DashboardOfferCard`) | 50 px/s | 220px | 160px |
| 4 | Offers & Discounts | Customer Dashboard | Coming Soon offers (`DashboardOfferCard`) | 40 px/s | 220px | 160px |
| 5 | Recommended Products | Customer Dashboard | Recommended products (`ProductCard` compact) | 40 px/s | 200px | 150px |

### Component

`client/src/components/common/ContinuousMarquee.jsx` — a reusable horizontal marquee component.

**Props:**
- `children` — React nodes to scroll (card components)
- `speed` — pixels per second (default 50)
- `gap` — gap between cards in px (default 24)
- `itemWidth` — desktop card width fallback in px (default 220)
- `minItemWidth` — mobile minimum card width in px (default 160)
- `pauseOnHover` — pause on mouse enter (default true)
- `pauseOnFocus` — pause on keyboard focus (default true)
- `showControls` — show Previous/Next arrow buttons (default true)
- `infinite` — request triple-copy seamless loop (default true); effective infinite mode also requires the measured copy width to exceed the viewport width

**Behavior:**
- `scrollLeft` is the single source of truth for position — both auto-scroll and manual interaction update `scrollLeft` directly, so there is no conflict between translateX transforms and native scrolling
- Auto-scroll uses `requestAnimationFrame` for smooth linear movement (zero React re-renders during animation)
- Track width re-measured via `ResizeObserver` so it adapts to responsive card widths and window resizing
- Viewport-aware infinite mode: if one full copy fits entirely inside the viewport, infinite mode is automatically disabled to prevent visible duplicate cards
- Triple-copy seamless loop (`copy0 + copy1 + copy2`) when enough unique items exist — the loop wraps back to copy1 invisibly because copy1 and copy2 are identical
- Finite mode renders unique items only once (no duplicates), disables auto-scroll, but keeps Previous/Next arrows, mouse drag, and touch swipe
- Pauses on hover/focus; resumes on leave/blur; pauses during touch/drag
- Previous/Next arrows scroll approximately one card width; disabled only when movement is genuinely unavailable
- Mouse click-and-drag on desktop; finger swipe on mobile; trackpad horizontal scrolling works natively
- Click-after-drag suppression prevents accidental card navigation after a drag
- `prefers-reduced-motion`: no auto movement, manually scrollable row, no duplicated nodes (`aria-hidden` on duplicates otherwise)
- Cleans up animation frame and ResizeObserver on unmount; no memory leaks

### Data Deduplication

Both `Home.jsx` and `CustomerDashboard.jsx` deduplicate products and offers by their stable `_id` before passing them to `ContinuousMarquee`. This prevents duplicate records from the API from being rendered as separate cards. Genuinely different products with similar names are preserved.

### Infinite vs Finite Mode Decision

1. Page component deduplicates items by `_id` and counts unique items
2. Page component passes `infinite = (uniqueCount >= MIN_ITEMS_FOR_INFINITE)` where `MIN_ITEMS_FOR_INFINITE = 5`
3. `ContinuousMarquee` starts with `effectiveInfinite = infinite`
4. On mount, the component measures one copy width against the viewport width
5. If one full copy fits entirely inside the viewport, `effectiveInfinite` is set to `false` (all cards fit; no duplicates needed)
6. Auto-scroll effect runs only when `effectiveInfinite === true`
7. Triple copies render only when `effectiveInfinite === true`

**Behavior with N unique products:**
| Unique Items | Narrow viewport | Wide viewport (copy fits in viewport) |
|-------------|-----------------|--------------------------------------|
| 4 | Finite (4 cards, no duplicates, no auto-scroll) | Finite (4 cards, no duplicates, no auto-scroll) |
| 5 | Infinite (15 cards, triple copy, auto-scroll) | Finite (5 cards, no duplicates, no auto-scroll) |
| 6+ | Infinite (3× count, triple copy, auto-scroll) | Infinite (3× count, triple copy, auto-scroll) |

### Preserved Functionality

No backend/API changes were made. The following are untouched:
- Product API, Offer API, and backend logic
- Active and Coming Soon offer filtering
- Offer countdown calculations
- Offer approval and scheduling
- Product recommendation logic
- Product prices, stock, and discount calculations
- Add to Cart and Wishlist interactions
- Authentication and role permissions
- Existing responsive layouts outside the specified sections

No fake or hardcoded offers/products are added.

## Newsletter Subscription

GreenMart includes a newsletter subscription feature on the Home Page ("Fresh from Our Farms" section).

### Component

`client/src/components/common/Newsletter.jsx` would be the reusable component (not yet extracted; subscription logic is inline in Home.jsx).

### Backend API

`server/src/models/Newsletter.js` — Mongoose model with `email` (unique, trimmed, lowercase), `subscribedAt`, and `isActive` fields.

`server/src/controllers/newsletterController.js` — Controller with three endpoints:

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/newsletter/subscribe` | POST | None | Subscribes an email address. Normalizes (trim + lowercase), validates format, prevents duplicates. Returns 201 on new subscription, 200 on reactivation, 409 on duplicate active subscription. |
| `/newsletter/unsubscribe` | POST | None | Deactivates an existing subscription. Returns 404 if email not found. |
| `/newsletter/` | GET | Admin only | Lists all subscribers (with optional `isActive` query filter). |

`server/src/routes/newsletterRoutes.js` — Route definitions mounted at `/api/newsletter`.

### Frontend

`client/src/api/newsletterApi.js` — API service with `subscribe(email)` and `unsubscribe(email)` methods.

`client/src/pages/public/Home.jsx` — Home Page newsletter form (bottom of "Fresh from Our Farms" section):

- Controlled email input with validation
- Join button with loading state
- Success/error messages displayed below the form
- Email field cleared after successful subscription
- Button disabled during submission
- No navigation or page refresh on submit
- No authentication required; no JWT or session involvement
- Rate-limited by the global Express rate limiter (300 requests per 15 minutes in production)

### Data Isolation

Newsletter subscriptions are stored in a dedicated MongoDB collection (`newsletters`), completely separate from customer accounts, authentication tokens, and user profiles. Subscribing does not read, modify, or redirect any user account.

---

## Time-Based Offers & Scheduling

GreenMart offers support scheduled start and end date/time for precise discount windows. Both farmers and admins can create offers with `Start Date`, `Start Time`, `End Date`, and `End Time` fields.

### Scheduling Fields

| Field | Example | Description |
|---|---|---|
| Start Date | 10 November 2026 | Date the offer becomes eligible |
| Start Time | 09:00 AM | Time the offer becomes eligible |
| End Date | 12 November 2026 | Date the offer expires |
| End Time | 09:00 PM | Time the offer expires |

### Backend Scheduling

- **`startAt` / `endAt`**: New UTC `Date` fields added to the `Offer` model alongside existing `startDate`/`endDate` for backward compatibility.
- **Timezone handling**: Farmer/admin date+time inputs are interpreted in `Asia/Kolkata` (UTC+5:30) and converted to UTC before storage.
- **Validation**: End datetime must be after start datetime; invalid dates/times are rejected; product prices and stock are verified from MongoDB (not trusted from frontend).
- **Backward compatibility**: Existing offers with only `startDate`/`endDate` continue to work — end dates are treated as end-of-day UTC.

### Automatic Offer Status

Offer eligibility is calculated dynamically using server time (no cron job required):

| Status | Condition | Discount Applies? | Countdown |
|---|---|---|---|
| Pending Approval | Waiting for admin approval | No | No |
| Scheduled | Approved, start time in future | No | "Starts in HH:MM:SS" |
| Active | Approved, within start/end window | Yes | "Offer ends in HH:MM:SS" |
| Expired | End time passed | No | No |
| Inactive | Manually deactivated | No | No |

- Approval status and time-based availability are both checked — an approved offer can be `Scheduled` rather than `Active`.
- Offers automatically activate at `startAt` and expire at `endAt`; no admin manual activation required.
- Checkout independently revalidates offers from MongoDB using server time; expired/upcoming/pending/rejected/deactivated offers are rejected.

### Live Countdown

A reusable `OfferCountdown` component (`client/src/components/offers/OfferCountdown.jsx`) displays `HH:MM:SS` on customer-facing pages:

- Updates every second
- Shows "Starts in" for upcoming offers, "Offer ends in" for active offers
- Stops at zero; does not continue showing old discounted prices
- Handles browser tab visibility changes (recalculates on focus)
- Clears intervals on unmount (no memory leaks)
- Uses server-provided time offset for clock accuracy

### Countdown on Customer Pages

- **Home page**: Offer cards show countdown timers; upcoming offers display original price with "Starts in", active offers show discounted price with "Offer ends in"
- **Customer Offers page**: Offer cards show countdown timers
- **Product cards**: Products with eligible offers show countdown timers

---

## Notification System

GreenMart has a role-based notification system for Customer, Farmer, and Admin.

### Architecture

- **MongoDB model**: `Notification` with recipient user ID, role, type, category, title, message, safe icon identifier, priority, related entity type/ID, action URL, read status, read timestamp, creation timestamp, and event deduplication key.
- **Backend**: JWT-authenticated APIs (`GET /notifications`, `GET /unread-count`, `PATCH /:id/read`, `PATCH /read-all`, `DELETE /:id`). Users access only their own notifications; IDs/filters/pagination are validated.
- **Socket.IO**: JWT-authenticated connections; users join only their authorized notification rooms; notifications are saved in MongoDB before being emitted; unread counts update in real time; reconnection retrieves persisted notifications without duplication.
- **Email**: `EMAIL_ENABLED=false` works; in-app notifications work without SMTP credentials; optional email failures never block business operations.

### Notification Triggers

Notifications are generated after successful database operations for: orders, order status changes, offers, farmer registration/activation/verification, certifications, products, inventory threshold changes, messages, reviews, support, and account security.

- Multi-farmer orders: each farmer is notified only about their own products.
- Farmer-created offers awaiting review notify Admin recipients.
- Admin-created offers (immediately approved) do not generate unnecessary pending-review notifications.
- Offer approval, rejection, and deactivation notify the associated farmer; rejection includes the actual saved reason.
- Wishlist notifications go only to customers with the matching product in their wishlist.
- Low-stock notifications are generated on threshold crossing, not on every inventory check.

### Categories

**Customer:** All, Orders, Offers, Payments, Wishlist, Messages, Support, Account
**Farmer:** All, Orders, Offers, Products, Inventory, Certifications, Messages, Support, Account
**Admin:** All, Orders, Farmers, Products, Offers, Inventory, Support, Security

### Icons

A centralized config (`client/src/config/notificationConfig.js`) maps every notification type to a safe, predefined `lucide-react` icon (ShoppingBag, Truck, BadgeCheck, CircleX, PackagePlus, AlertTriangle, Heart, ShieldAlert, LockKeyhole, Bell, etc.) with consistent colors and a fallback icon for unknown types. Arbitrary component names from database values are never rendered.

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
| View notifications | own | own | all (Admin Notifications page) |
| Export CSV reports | no | no | yes |
| Manage crops | no | own only | all |
| Manage harvests | no | own only | all |
| Inventory adjustments | no | own only | all |
| Sales reports | no | own sales | all |
| PDF invoices | own orders | no | all |
| Contact/support form | yes | yes | notified |
| Admin audit log | no | no | yes |

### Important Security Notes

- Authorization is enforced by **backend middleware** (`auth`, `role`, `approvedFarmer`) and protected routes — not by the frontend alone.
- Farmers cannot perform product actions until their account is approved by an admin (`approvedFarmer` middleware checks the `farmerApproved` flag).
- Admins cannot approve, reject, or edit another farmer's offers through the farmer workflow; farmers cannot use admin create/edit offer permissions.
- Offer approval status is set by the backend only; the frontend cannot decide whether an offer is approved.
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
| `IMAGEKIT_PUBLIC_KEY` | ImageKit public key | No (only for newsletter banners) |
| `IMAGEKIT_PRIVATE_KEY` | ImageKit private key (server-only) | No (only for newsletter banners) |
| `IMAGEKIT_URL_ENDPOINT` | ImageKit URL endpoint | No (only for newsletter banners) |

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
cp .env.example .env
# VITE_API_URL=http://localhost:5000/api
# VITE_SOCKET_URL=http://localhost:5000
npm install
npm run dev
```

- **Frontend**: http://127.0.0.1:5173 (or alternate port if in use)
- **Backend**: http://127.0.0.1:5000

> If `localhost` refuses the connection, use `http://127.0.0.1:5173` for the frontend and `http://127.0.0.1:5000` for the backend. `localhost` may resolve to IPv6 (`::1`) while the servers listen on IPv4 (`0.0.0.0`).

---

## Development Workflow

### Typical development loop

1. **Start the backend** — from `server/`: `npm run dev` (uses `nodemon`, watches `src/`).
2. **Start the frontend** — from `client/`: `npm run dev` (Vite dev server with hot reload).
3. **Seed data** — `npm run seed:admin` creates the first admin; `npm run seed` seeds demo development data (requires `SEED_PASSWORD`, refused in production).
4. **Run tests** — backend: `cd server && npm test` (Jest, `mongodb-memory-server`); frontend: `cd client && npm run test` (Vitest).
5. **Build for production** — frontend: `cd client && npm run build` (outputs to `dist/`).
6. **Verify responsive carousels** — open Home page and Customer Dashboard at breakpoints 375px, 430px, 768px, 1366px, and 1920px; confirm cards move continuously in infinite mode, render once without duplicates in finite mode, pause on hover/touch, swipe manually on mobile, and do not cause horizontal page overflow.
7. **Lint/typecheck** — there is no separate lint script; run tests to verify behavior.

### Seed commands (run from `server/`)

| Command | Purpose |
|---|---|
| `npm run seed:admin` | Create the first administrator (safe to rerun; does not overwrite existing admin) |
| `npm run seed` | Seed development demo data (requires `SEED_PASSWORD`; refuses production) |
| `npm run seed:reset` | Remove and replace demo data only (does not reset admin password) |

### Environment workflow

- Copy `server/.env.example` → `server/.env` and fill in `MONGO_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
- Copy `client/.env.example` → `client/.env` and set `VITE_API_URL`, `VITE_SOCKET_URL`.
- Never commit `.env` files (covered by `.gitignore`).

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

**Latest test results** (all green):
- Backend: 30 suites, ~300 tests passed (2 pre-existing environment failures unrelated to this change: mongodb-memory-server disk space, stock-alert notification)
- Frontend: 46 suites, 326 tests passed
- Production build (`npm run build`): succeeds

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
| `farmerApi is not defined` | Missing import in a public page | Ensure `farmerApi` is imported (fixed in `client/src/pages/public/FarmLocations.jsx`). |
| Offer countdown not updating | Server time not fetched or component unmounted | The `OfferCountdown` component fetches server time via `GET /products/storefront/server-time`; ensure the backend is running. |
| Offer not activating at start time | `startAt`/`endAt` stored in UTC; date/time inputs interpreted in Asia/Kolkata | Backend converts Asia/Kolkata local date+time to UTC before storage. Verify server timezone and input format (`YYYY-MM-DD` + `HH:MM`). |

---

## License

This project is private and intended for internal use. Do not distribute or publish without authorization.

---

## Final Production Readiness Audit
- Backend Jest: 30 suites pass (2 pre-existing environment failures unrelated to this change)
- Frontend Vitest: 46 suites / 326 tests passed
- Frontend production build: succeeded
- Backend startup: MongoDB connected; no startup errors
- No new bugs discovered; no secrets exposed; no commits/pushes performed

- **Time-Based Product Offers & Countdown**: Added scheduled start/end date and time to offers (`startAt`/`endAt` UTC fields); automatic offer activation at start time and expiration at end time using server time; live `HH:MM:SS` countdown timers on Home page, Customer Offers page, and product cards; `OfferCountdown` reusable component; timezone handling (Asia/Kolkata → UTC); server-time API endpoint (`GET /products/storefront/server-time`); checkout revalidates offers using server time; 17 new backend test scenarios; 22 frontend test updates
- **Admin Offer Management**: Admin can independently create and edit offers for any farmer; admin-created/edited offers are approved directly after backend validation; farmers are notified; full frontend + backend validation; 12 new test scenarios
- **Home Page Offers**: New "Special Offers & Discounts" section below the hero showing approved, active offers with real prices, images, dates, and badges; Featured Products show discount strikethrough/badge when eligible; View All Offers link; empty/loading states
- **Admin Add Farmer Certification Fields**: Added "Certification Name" and "Certificate Number" text inputs to the Add Farmer form; saved to FarmerProfile MongoDB record; does not auto-verify the farmer; displayed in the Farmer Verification table ("Not provided" when missing)
- **Notification System Audit & Improvements**: Added `actionUrl`, `readAt`, `priority`, `icon`, `eventKey` fields to Notification model; category filter + pagination on notification list API; customer registration → admin notification; wishlist back-in-stock notification; centralized `notificationConfig.js` with type→lucide-icon mapping; updated shared and farmer notification pages with category filters, deletion, pagination; deduplication via event keys; 24 new tests
- **Bug Fix**: Added missing `farmerApi` import in `client/src/pages/public/FarmLocations.jsx` (was causing a runtime `ReferenceError`)
- Cart quantity: optimistic updates (instant UI feedback), smooth QuantityControl controls, per-item pending states, stock validation, rollback on API failure
- Notifications: customer + farmer order-placed and status-change notifications via DB + Socket.io; admin notifications for orders, farmers, products, inventory, support, reviews, security
- Admin Notifications page: summary cards, category filters, mark-as-read/delete, pagination, loading/empty/error states
- Inventory: editable Current Stock and Minimum Stock per product; targeted product update (avoids full-document validation on stock-only changes); low-stock/out-of-stock status transitions
- Product validation fix: stock-only updates no longer blocked by missing legacy product descriptions
- UI consistency passes: base font 17px, shared layout components, container 1280px, responsive grids.
- Customer mobile drawer (hamburger menu): shows public links (Home, Shop, Offers, About, Farmers, Contact) followed by customer links (Customer Dashboard, My Orders, Cart, Wishlist, Track Orders, Profile, Notifications, Settings) and Logout; customer login redirects to home page

---

## Recent Bug Fixes (Latest Session)

### Root Cause: Missing Products in Special Offers & Discounts (Home & Customer Dashboard)

**Problem:** The Special Offers & Discounts sections on both the public Home page and Customer Dashboard were not displaying any products. Every offer API returned an empty list.

**Root cause:** `server/src/models/Offer.js` did not declare an `isActive` field, but all three customer-facing offer queries filtered on `isActive: true`:
- `productController.storefrontOffers` → `GET /api/products/storefront/offers` (public Home page)
- `customerOfferController.list` → `GET /api/offers/customer` (Customer Dashboard)
- `newsletterController.customerExclusiveOffers` → `GET /api/newsletter/customer/offers` (subscriber exclusives)

With Mongoose strict mode, `isActive` was never persisted on offer documents, so `isActive: true` matched zero documents and every customer offer API returned an empty list.

### Files Modified

| File | Change |
|------|--------|
| `server/src/models/Offer.js` | Added `isActive: { type: Boolean, default: true, index: true }` to the Offer schema |
| `server/src/services/offerService.js` | `getEffectiveStatus` checks `offer.isActive === false` (not `!offer.isActive`); `getActiveOffers` uses `isActive: { $ne: false }` |
| `server/src/controllers/customerOfferController.js` | `isActive: { $ne: false }` + excludes `isSubscriberExclusive: true` |
| `server/src/controllers/productController.js` | `isActive: { $ne: false }` |
| `server/src/controllers/newsletterController.js` | 3 query sites use `isActive: { $ne: false }` (backward-compatible with existing offers lacking the field) |
| `client/src/pages/public/Home.jsx` | Added Retry button on offers error state, farmer name on offer cards, `fetchOffers()` with `useRef` cleanup |
| `client/src/pages/admin/AdminNewsletter.jsx` | Fixed subscribers parsing (`subs.data?.items`); removed farmer/guest from type filter (customer-only) |
| `client/src/pages/customer/CustomerDashboard.jsx` | `loadExclusiveOffers()` now triggers directly after `loadNewsletterPreferences()` completes |
| `client/src/pages/customer/NewsletterDetail.jsx` | Fixed `discPct` → `discountPct` crash; unwrapped `{productId, snapshot}` / `{offerId, snapshot}` snapshots so featured product images, names, prices, and discounts render correctly; View Product links guarded against undefined IDs |

### Backward Compatibility

Existing offers in the database that lack the `isActive` field are treated as active (`isActive: { $ne: false }`), so older offers continue to work without migration. Only `isActive: false` explicitly deactivates an offer.

### Verification

- **Backend:** `customerOffers.test.js` 11/11 pass (was 6/11 before fix)
- **Frontend:** 46 test files / 326 tests pass
- **Production build:** `vite build` succeeds
- **Live API:** Public offers return real populated data (product image, name, farmer name, price, discounted price, discount percent)
- **Public vs subscriber-exclusive:** Remain separate; public offers are never hidden for unsubscribed customers; exclusive offers require an active newsletter subscription
- **Bug Fix – Customer Farmer Explore blank page**: Fixed `client/src/pages/public/FarmerProfile.jsx` (missing `ErrorState` import, unreachable loading state, async useEffect returning a Promise that React tried to destroy on unmount, missing farmer name/category/description/certification status, and non-active products). Backend `GET /farmers/:id` now populates the farmer `name`, returns `category`/`description`/`certification.verifiedByAdmin`, and returns 404 for invalid or missing farmer IDs. The page now shows the selected farmer's actual details, location map, admin verification status, and only that farmer's approved and active products, with a route back to the farmers listing.
- **Bug Fix – Customer Notification Centre**: `client/src/pages/shared/Notifications.jsx` now uses backend pagination (`category`/`page`/`limit`) with page reset on category change, displays each notification's category, and keeps mark-all-read, unread counts, empty/loading/error states and Socket.IO real-time updates. `notificationsSlice.fetchNotifications` accepts optional params and normalizes paginated responses. Backend order notifications (`orderConfirmation`, `statusUpdate`) are now tagged with `category: "orders"` so the Orders filter shows order placed/packed/out-for-delivery/delivered notifications; duplicates are still prevented by existing event-key/orderId dedup.
- **Bug Fix – Farmer Notification Categories empty**: Farmer notifications were saved without a `category` field (e.g. `newOrderFarmer`, `newMessage`), so clicking Orders/Products/Inventory/Certifications/Messages/Support/Account showed "You're all caught up" even though records existed. Fixed by adding `category` to the missing `createNotification` calls (`server/src/controllers/orderController.js` newOrderFarmer → `orders`; `server/src/controllers/messageController.js` newMessage → `messages`), normalizing legacy null-category records by `type` at query time (`server/src/controllers/notificationController.js` `TYPE_CATEGORY_MAP` + `$or` matching), adding a one-time backfill migration script (`server/src/scripts/backfillNotificationCategories.js`), and rewriting `client/src/pages/farmer/FarmerNotifications.jsx` with accurate per-category counts, unread counts, loading/error/genuine-empty states, mark-read/delete, and pagination that resets to page 1 on category change. Frontend `client/src/config/notificationConfig.js` gained a shared `TYPE_TO_CATEGORY` map + `normalizeCategory()` helper.

## Recent Changes

- **Offer pricing consistency** (`server/src/services/offerService.js`, customer offer controllers, `client/src/pages/customer/CustomerDashboard.jsx`): subscriber-exclusive products can appear in the general current/upcoming offers feed at normal price, with the regular offer and Premium extra savings shown separately; the Premium payable price remains in the subscriber-only feed. Public product, cart, and checkout pricing exclude subscriber discounts. Premium pricing applies the configured regular discount followed by its additional subscriber discount. Effective whole-number percentages use conventional rounding with floating-point tolerance, so 57.5% displays as 58%.
- **Admin newsletter unsubscribe notifications** (`server/src/controllers/newsletterController.js`): `unsubscribe` and `unsubscribeByToken` (public token page) now create a persisted admin in-app notification (`newsletter_unsubscribed_admin`, title "Newsletter Unsubscription", message `email has unsubscribed...`) via the existing `createNotification` + Socket.IO `emitToAdmins` infra after a successful MongoDB `isActive = false` update; early-return when already unsubscribed (no duplicate notifications) and skip notification when the unsubscribe fails. `customerUnsubscribe` additionally notifies admins that a customer unsubscribed. `NEWSLETTER_EMAIL_MODE=mock` preserved; no SMTP/email service configured.
- **Carousel Previous/Back button fix** (`client/src/components/common/ContinuousMarquee.jsx`): `canScrollLeft`/`canScrollRight` now read from a `scrollPosition` state that re-renders on every scroll/drag/arrow click (previously read from a stale `ref`, so buttons stayed disabled after scrolling); `scrollPosRef` is clamped to `[0, maxScroll]` so buttons stay accurate after reaching the end. Covers Home Special Offers, Home Featured, CustomerDashboard Offers, and CustomerDashboard Recommended carousels.
- **Admin Newsletter Management page redesign** (`client/src/pages/admin/AdminNewsletter.jsx`): rebuilt with GreenMart design tokens (cards `#FFFFFF`/`border-[#E2E6DF]`, green palette `#245C3A`/`#477A4E`/`#EAF2E7`, Poppins heading font, `gm-card`/`gm-input`/`gm-btn` styles). Compact stat cards (Total/Active/Unsubscribed/Campaigns Processed (Mock)) from `newsletterApi.stats()`. Create Campaign + Live Preview side-by-side on desktop (stacked mobile) with all form fields, eligible-recipient count, and dynamic preview with Desktop/Mobile toggles. Campaign History with View/Test/Process/Cancel/Duplicate actions (`sent` renders as `Processed (Mock)`). Subscriber Management with email search, All/Active/Unsubscribed filter, green Active / neutral-red Unsubscribed badges, and pagination. Sidebar, header, other admin pages, and backend APIs untouched.
- **Carousel bug fixes** (`ContinuousMarquee.jsx`): viewport-aware infinite mode (auto-disables infinite when one copy fits in viewport), fixed Next arrow reset-on-click bug (arrow delta now uses `itemWidth` instead of full copy width), added finite-mode initialization effect (arrows now appear and work in finite mode), fixed arrow disabled states using live `scrollWidth`/`clientWidth` bounds
- **Carousel regression tests** (`ContinuousMarquee.test.jsx`): 12 new tests covering 4/5/6 unique items, finite vs infinite mode, arrow visibility in finite mode, duplicate children handling, cleanup on unmount
- **Carousel threshold fix**: `MIN_ITEMS_FOR_INFINITE = 5` with viewport-width re-check after layout measurement; 5 items on wide screens now correctly falls back to finite mode when one copy fits in the viewport
- All 314 frontend tests pass (46 suites); production build succeeds
- Product detail page now displays full image gallery with legacy image fallback.
- Admin Add Farmer supports certificate and farm photo uploads to Cloudinary.
- SweetAlert2 alert utility expanded (showInfo, showDeleteConfirm, showLoading, closeAlert).
- Refresh-token auth, notification system, time-based offers maintained.

---

## ImageKit Newsletter Banner Uploads

GreenMart uses **ImageKit.io** for newsletter campaign banner images (separate from Cloudinary product images).

### Admin flow
1. Admin Dashboard ? Newsletter ? Create/Edit Campaign.
2. Use **Upload Banner Image** (JPG/PNG/WebP, max 5 MB) or paste a public URL.
3. Uploaded image is sent to backend POST /api/newsletter/admin/newsletter-banner/upload (admin-only, Multer-validated), which uploads to ImageKit folder /greenmart/newsletters/banners/ with a unique filename and returns { url, fileId }.
4. The returned URL is saved as annerImage/annerImageUrl on the campaign; annerImageFileId supports replacement/cleanup.

### Customer flow
- Customer Dashboard ? My Newsletters ? campaign detail renders the banner image prominently above the heading/content, with graceful fallback when missing or broken.

### Environment variables (server/.env)
- IMAGEKIT_PUBLIC_KEY
- IMAGEKIT_PRIVATE_KEY
- IMAGEKIT_URL_ENDPOINT

Configure these from the ImageKit dashboard (Developer options ? API keys). If missing, uploads return a clear 503 configuration error.

### Security
- Private key stays server-side only.
- Only authenticated admins can upload/replace/remove banners.
- File type and size validated on both frontend and backend.
