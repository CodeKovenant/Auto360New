# AutoDirectory — Replit Project Guide

## Overview

AutoDirectory is a SaaS directory platform for car-related businesses, targeting the Kenyan market. It allows car businesses (dealers, garages, spare parts shops, car washes, insurers) to register, get admin-approved, and be discovered by customers.

**Core features:**
- Public business directory with search and filters (category, city, rating)
- Business registration with admin approval workflow
- Business owner dashboard (manage listing, spare parts inventory, view reviews and messages)
- Admin panel (approve/reject businesses, manage reviews and users)
- Customer-facing business profiles with contact forms and WhatsApp links
- Star ratings and reviews system
- Spare parts catalog linked to car brands/models
- **Car Dealer Listings:** Car dealers can add individual car listings (brand/model/year/price/mileage/fuel/transmission/condition/images), displayed on `/cars` with filters (including condition: Brand New / Used) and detail view at `/cars/:id`; condition badge shown on car cards (green "Brand New" / dark "Used")
- **Garage Service Cards:** Garages can add/edit/delete service listings (name/description/price), displayed on `/garages/services` with quick-filter chips; WhatsApp booking CTA on each card
- **Spare Parts Editing:** Spare parts shops can now add, edit (inline form with all fields), and delete parts from their dashboard
- **Automotive Support Services Management:** Insurance/Car Wash/Other businesses have a "My Services" tab in their dashboard with full add/edit/delete support for their service listings
- Homepage features "Featured Cars for Sale" and "Popular Garage Services" sections
- **Social Sharing:** Business profiles have share buttons (Facebook, X, Instagram, WhatsApp) that generate pre-filled share messages
- **Safety Tips:** An amber-styled Safety Tips section appears below reviews on every business profile
- **Report Business:** Visitors can submit a report on any business (reason + description); reports are stored in `business_reports` table and visible in the Admin panel under a dedicated Reports tab
- **Navigation overhaul:** Navbar now shows 4 category top-level links: Automobile Dealers, Auto Spare Parts, Auto Garage, Automotive Support — each links to filtered `/businesses?category=...` listing
- **Interactive Map:** Business profiles show a Leaflet.js map with a location marker when `latitude`/`longitude` are set; all seeded businesses have Nairobi coordinates
- **Automotive Support Services:** Insurance, Car Wash, and Other businesses can list their services via a new `support_services` table; displayed as cards (name, description, KSh price, Call/WhatsApp CTAs) on business profiles
- **`automotive_support` meta-category:** A virtual category in the URL (`/businesses?category=automotive_support`) that filters for insurance + car_wash + other businesses combined
- **Premium Business Subscriptions (M-Pesa):** Businesses can pay KSh 2,000 for 30-day premium status via M-Pesa STK Push. Premium businesses get a blue verified checkmark (BadgeCheck) on their listing and are featured in a dedicated "Premium Businesses" section on the homepage. Admins can manually activate/deactivate premium status for any approved business. Backend: `server/mpesa.ts` (STK Push via Daraja API), `POST /api/mpesa/initiate`, `POST /api/mpesa/callback`, `POST /api/mpesa/manual-activate`, `POST /api/mpesa/manual-deactivate`, `GET /api/businesses/premium`. Schema: `premium` (boolean) + `premiumExpiresAt` (timestamp) on businesses table. Required env vars: `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_CALLBACK_URL` (optional: `MPESA_ENV=production`, `MPESA_PREMIUM_AMOUNT`, `MPESA_PREMIUM_DAYS`).

The stack is a monorepo: React (Vite) frontend + Express backend, sharing TypeScript types via a `/shared` folder.

---

## User Preferences

Preferred communication style: Simple, everyday language.

---

## System Architecture

### Frontend (React + Vite)
- **Framework:** React 18, TypeScript, Vite
- **Routing:** `wouter` (lightweight client-side routing)
- **State/data fetching:** TanStack Query (React Query v5) for all server state; no Redux or global state store
- **UI library:** shadcn/ui (Radix UI primitives + Tailwind CSS), "new-york" style
- **Forms:** React Hook Form with Zod resolvers
- **Styling:** Tailwind CSS with CSS variables for theming, supporting light/dark mode
- **Auth state:** JWT token + user object stored in `localStorage`, read via a `useAuth` hook backed by the `auth.ts` lib

**Pages:**
| Route | Component | Purpose |
|---|---|---|
| `/` | Home | Hero, featured cars, popular services, featured businesses, category links |
| `/businesses` | Businesses | Searchable/filterable directory |
| `/business/:id` | BusinessProfile | Detail, reviews, spare parts, contact form |
| `/cars` | Cars | Car listings with brand/price/year/fuel/transmission filters |
| `/cars/:id` | CarDetail | Full car detail with dealer WhatsApp CTA |
| `/garages/services` | GarageServices | Service cards with quick-filter chips |
| `/login` | Login | JWT login |
| `/register` | Register | User registration (owner role) |
| `/register-business` | RegisterBusiness | Submit a new business listing |
| `/dashboard` | Dashboard | Owner: manage listing, cars (dealers)/services (garages)/parts, view messages/reviews |
| `/admin` | Admin | Admin: approve/reject businesses, manage reviews/users |

### Backend (Express + Node.js)
- **Framework:** Express.js, TypeScript, running via `tsx` in dev
- **Auth:** JWT (`jsonwebtoken`) — stateless, token passed as `Authorization: Bearer <token>` header
- **Password hashing:** `bcryptjs`
- **Middleware roles:** `authMiddleware`, `adminMiddleware`, `ownerMiddleware` guard routes
- **API style:** REST, all routes under `/api/`
- **Dev server:** Vite middleware mode integrated into Express for SSR-free HMR
- **Prod build:** esbuild bundles the server to `dist/index.cjs`; Vite builds client to `dist/public`

**Key API groups:**
- `POST /api/auth/register`, `POST /api/auth/login`
- `GET/POST /api/businesses`, `GET /api/businesses/featured`, `GET /api/businesses/:id`
- `PUT /api/admin/businesses/:id/approve|reject`, `DELETE /api/admin/...`
- `GET /api/dashboard` (owner's own data)
- `POST /api/reviews`, `POST /api/messages`
- `GET /api/admin` (admin stats + all data)
- `GET/POST/DELETE /api/spare-parts`

### Shared Layer (`/shared/schema.ts`)
- Single source of truth for DB schema (Drizzle ORM) and TypeScript types
- Zod validation schemas generated with `drizzle-zod` (`createInsertSchema`)
- Enums: `userRoleEnum` (admin, owner), `businessStatusEnum` (pending, approved, rejected), `businessCategoryEnum`, `partConditionEnum`
- Exported constants like `BUSINESS_CATEGORIES` are used by both frontend and backend

### Database
- **ORM:** Drizzle ORM (PostgreSQL dialect)
- **Driver:** `pg` (node-postgres)
- **Tables:** `users`, `businesses`, `spare_parts`, `reviews`, `messages`
- **Migrations:** `drizzle-kit push` (schema push), migration files in `/migrations`
- **Connection:** Pool via `DATABASE_URL` env variable
- **Seeding:** `server/seed.ts` seeds an admin user, several owner users, and sample businesses/parts/reviews on first boot (runs when `users` table is empty)

**Schema highlights:**
- All primary keys are UUIDs via `gen_random_uuid()`
- Businesses have `status` (pending/approved/rejected) and `ownerId` FK to users
- Spare parts link to a business and carry `carBrand`, `carModel`, `year`, `condition`
- Reviews carry `name` (public display name, no user FK), `rating` (1–5), `comment`
- Messages carry sender contact info and message text

### Authentication & Authorization
- **Mechanism:** JWT issued on login/register, stored client-side in `localStorage`
- **Token lifetime:** 30 days
- **Roles:** `admin` (full access), `owner` (can manage their own business)
- **No session cookies** — fully stateless (connect-pg-simple is a dependency but not actively used for session storage in the current implementation)
- Frontend redirects unauthenticated users to `/login` in protected pages

### Build System
- `script/build.ts` orchestrates: clean `dist/`, Vite build (client), esbuild bundle (server)
- Server bundle uses an allowlist of deps to bundle (reduces cold-start syscalls), externalizes the rest

---

## External Dependencies

| Dependency | Purpose |
|---|---|
| **PostgreSQL** | Primary database (requires `DATABASE_URL` env var) |
| **Drizzle ORM** | Type-safe SQL query builder + schema definition |
| **TanStack Query** | Client-side server state management and caching |
| **shadcn/ui + Radix UI** | Accessible headless UI primitives |
| **Tailwind CSS** | Utility-first styling |
| **wouter** | Lightweight React router |
| **jsonwebtoken** | JWT creation and verification |
| **bcryptjs** | Password hashing |
| **Vite** | Frontend build tool and dev server |
| **esbuild** | Server production bundler |
| **Zod** | Schema validation (shared between client and server) |
| **drizzle-zod** | Auto-generates Zod schemas from Drizzle table definitions |
| **Google Fonts** | DM Sans, Geist Mono, Fira Code (loaded in `index.html`) |
| **Replit plugins** | `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner` (dev only) |

**Environment variables required:**
- `DATABASE_URL` — PostgreSQL connection string (required at startup)
- `SESSION_SECRET` — JWT signing secret (falls back to hardcoded default if not set; set this in production)
- `NODE_ENV` — `development` or `production`