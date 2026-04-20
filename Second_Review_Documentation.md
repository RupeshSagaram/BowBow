# BowBow — Second Review Project Documentation

**Project Title:** BowBow — Peer-to-Peer Pet Care Marketplace

**Degree:** Master of Computer Applications (MCA)

**Technology Stack:** React 19 · Node.js · Express · PostgreSQL · Prisma · Socket.io · Clerk

---

## Table of Contents

| Sr. No. | Item Description |
|---------|-----------------|
| 1 | Tools & Technologies |
| 2 | Design |
| 3 | Implementation |
| 4 | Testing |

---

---

## 1. TOOLS & TECHNOLOGIES

### 1.1 Development Tools

The following development tools were used throughout the software development lifecycle of BowBow:

| Tool | Purpose |
|------|---------|
| Visual Studio Code | Primary IDE with ESLint, Prettier, and Tailwind CSS IntelliSense extensions |
| Git | Version control system for tracking changes and collaborative development |
| GitHub | Remote repository hosting, branch management, and code review |
| npm | Package manager for both frontend and backend dependency management |
| Postman | REST API testing and endpoint validation during development |
| Prisma Studio | Visual database GUI for inspecting and editing PostgreSQL records |
| Neon.tech | Serverless PostgreSQL hosting for cloud database access |
| dotenv | Environment variable management for secure configuration handling |

### 1.2 Frontend Technologies

The frontend of BowBow is a modern Single-Page Application (SPA) built with the following technologies:

| Technology | Version | Role |
|------------|---------|------|
| React | 19 | Core UI component framework for building the SPA |
| Vite | 7 | Build tool and development server with Hot Module Replacement (HMR) |
| Tailwind CSS | 4 | Utility-first CSS framework for responsive styling |
| React Router | v7 | Client-side routing and navigation management |
| Clerk (React SDK) | Latest | Authentication UI components, `useUser()` and `useAuth()` hooks |
| Socket.io-client | 4.8.3 | WebSocket client for real-time bidirectional messaging |
| react-day-picker | Latest | Interactive calendar component for availability date selection |
| Vitest | Latest | Fast unit test runner compatible with Vite |
| React Testing Library | Latest | Component and hook testing utilities |
| MSW (Mock Service Worker) | Latest | HTTP request mocking for isolated frontend tests |

### 1.3 Backend Technologies

The backend is a RESTful API server with real-time capabilities, built with the following technologies:

| Technology | Version | Role |
|------------|---------|------|
| Node.js | 18+ | JavaScript runtime environment for server-side execution |
| Express | v5 | HTTP web framework for REST API routing and middleware |
| Prisma ORM | v5 | Type-safe database access layer and migration management |
| PostgreSQL | 14+ | Relational database for persistent data storage |
| Clerk (Express SDK) | Latest | JWT token verification middleware for route protection |
| Socket.io | 4.8.3 | WebSocket server for real-time event-based communication |
| cors | Latest | Cross-Origin Resource Sharing middleware for frontend access |
| dotenv | Latest | Loads environment variables from `.env` files |
| Vitest | Latest | Unit test runner for backend controller testing |

### 1.4 Cloud and Infrastructure

| Service | Purpose |
|---------|---------|
| Clerk | Hosted authentication platform managing sign-up, sign-in, OAuth, and JWT issuance |
| Neon.tech | Serverless PostgreSQL cloud database (free tier sufficient for development) |
| Vercel / Netlify | Recommended frontend deployment targets (production-ready via Vite build) |
| Railway / Render | Recommended backend deployment targets for Node.js process hosting |

---

---

## 2. DESIGN

### 2.1 System Architecture Overview

BowBow follows a classic three-tier architecture that separates the system into three distinct layers:

**Tier 1 — Presentation Layer (Frontend)**
The frontend is a React 19 SPA served by Vite. It communicates with the backend over two channels:
- **REST API:** Standard HTTP request/response for all CRUD operations. The Clerk JWT token is attached to every protected request in the `Authorization: Bearer <token>` header.
- **WebSocket (Socket.io):** A persistent, bidirectional connection established when the user navigates to the Messages page. The Clerk JWT is passed in the Socket.io handshake `auth` object for server-side verification.

**Tier 2 — Application Layer (Backend)**
The backend is a single Node.js process running Express v5. It hosts:
- A RESTful API with eight resource routers (`/api/users`, `/api/pets`, `/api/sitters`, `/api/bookings`, `/api/messages`, `/api/reviews`, `/api/admin`)
- A Socket.io WebSocket server attached to the same HTTP server instance
- Clerk middleware that verifies JWTs and populates `req.auth` on every request

**Tier 3 — Data Layer (Database)**
PostgreSQL stores all application data. Prisma ORM handles all database access with type-safe, auto-generated query builders and manages schema migrations via `prisma migrate dev`.

```
┌──────────────────────────────┐
│     React 19 SPA (Vite)      │  ← Presentation Tier
│  Tailwind CSS · React Router │
│  Clerk SDK · Socket.io-client│
└───────────┬──────────────────┘
            │  REST (HTTP/HTTPS)
            │  WebSocket (Socket.io)
            ▼
┌──────────────────────────────┐
│  Node.js · Express v5        │  ← Application Tier
│  Clerk Middleware            │
│  REST API Routers            │
│  Socket.io WebSocket Server  │
└───────────┬──────────────────┘
            │  Prisma ORM
            ▼
┌──────────────────────────────┐
│        PostgreSQL            │  ← Data Tier
│   (Neon.tech / local)        │
└──────────────────────────────┘
```

---

### 2.2 Database Design

#### 2.2.1 Data Models

The database schema is defined using Prisma and comprises seven models and two enumerations.

**Enumerations:**

| Enum | Values | Usage |
|------|--------|-------|
| `Role` | OWNER, SITTER, BOTH | Assigned to each User; controls which features are accessible |
| `BookingStatus` | PENDING, CONFIRMED, CANCELLED, COMPLETED | Tracks the lifecycle state of each Booking |

**Model: User**

| Field | Type | Notes |
|-------|------|-------|
| id | String (CUID) | Primary key — URL-safe, collision-resistant unique identifier |
| clerkId | String (unique) | Clerk authentication provider ID; used to link Clerk identity to DB record |
| email | String (unique) | User's email address |
| firstName | String | First name (synced from Clerk on login) |
| lastName | String | Last name (synced from Clerk on login) |
| avatarUrl | String? | Optional profile picture URL from Clerk |
| role | Role | OWNER, SITTER, or BOTH (default: OWNER) |
| bio | String? | Optional user bio |
| hasCompletedOnboarding | Boolean | Tracks whether role selection has been completed (default: false) |
| isAdmin | Boolean | Admin panel access flag (default: false) |
| isBanned | Boolean | Prevents access and hides listing from search (default: false) |
| createdAt | DateTime | Record creation timestamp |
| updatedAt | DateTime | Auto-updated on every modification |

**Model: Pet**

| Field | Type | Notes |
|-------|------|-------|
| id | String (CUID) | Primary key |
| name | String | Pet's name (required) |
| species | String | Stored as plain string for flexibility (dog, cat, bird, rabbit, etc.) |
| breed | String? | Optional breed information |
| age | Float? | Age in years; accepts fractional values (e.g., 0.5 for 6 months) |
| weight | Float? | Weight in pounds |
| notes | String? | Special care instructions for sitters |
| imageUrl | String? | Optional photo URL |
| userId | String | Foreign key → User.id |

**Model: SitterProfile**

| Field | Type | Notes |
|-------|------|-------|
| id | String (CUID) | Primary key |
| userId | String (unique) | Foreign key → User.id; `@unique` enforces one profile per user |
| rate | Float | Per-night rate in USD |
| services | String[] | PostgreSQL text array (e.g., ["Boarding", "Dog Walking", "Daycare"]) |
| city | String? | Sitter's city |
| state | String? | Two-letter state abbreviation |
| zipCode | String? | Postal code |
| isAvailable | Boolean | If false, listing is hidden from search results (default: true) |
| yearsExperience | Int? | Optional years of pet care experience |

**Model: Booking**

| Field | Type | Notes |
|-------|------|-------|
| id | String (CUID) | Primary key |
| ownerId | String | Foreign key → User.id (named relation: "OwnerBookings") |
| sitterProfileId | String | Foreign key → SitterProfile.id |
| petId | String | Foreign key → Pet.id |
| service | String | Service type selected (e.g., "Boarding") |
| startDate | DateTime | Start of the booking period |
| endDate | DateTime | End of the booking period |
| totalPrice | Float | Computed at creation time (rate × nights); stored to freeze historical price |
| message | String? | Optional introductory note from owner |
| status | BookingStatus | Lifecycle state (default: PENDING) |

**Model: Message**

| Field | Type | Notes |
|-------|------|-------|
| id | String (CUID) | Primary key |
| bookingId | String | Foreign key → Booking.id |
| senderId | String | Foreign key → User.id |
| text | String | Message content |
| createdAt | DateTime | Send timestamp; no `updatedAt` — messages are immutable |

**Model: Review**

| Field | Type | Notes |
|-------|------|-------|
| id | String (CUID) | Primary key |
| bookingId | String (unique) | Foreign key → Booking.id; `@unique` enforces one review per booking |
| authorId | String | Foreign key → User.id (the pet owner who wrote the review) |
| sitterProfileId | String | Foreign key → SitterProfile.id |
| rating | Int | Star rating from 1 to 5 |
| text | String? | Optional written review text |
| createdAt | DateTime | Submission timestamp; no `updatedAt` — reviews are immutable |

**Model: AvailabilityBlock**

| Field | Type | Notes |
|-------|------|-------|
| id | String (CUID) | Primary key |
| sitterProfileId | String | Foreign key → SitterProfile.id (onDelete: Cascade) |
| startDate | DateTime | Start of the blocked date range |
| endDate | DateTime | End of the blocked date range |
| createdAt | DateTime | Creation timestamp |

#### 2.2.2 Entity Relationships

| Relationship | Type | Description |
|-------------|------|-------------|
| User → Pet | One-to-Many | A user can own multiple pets |
| User → SitterProfile | One-to-One | A user can have at most one sitter listing (`@unique` on FK) |
| User → Booking (as owner) | One-to-Many | A user can create many booking requests |
| User → Message | One-to-Many | A user can send many messages |
| User → Review | One-to-Many | A user (as owner) can write many reviews |
| SitterProfile → Booking | One-to-Many | A sitter profile receives many bookings |
| SitterProfile → Review | One-to-Many | A sitter profile accumulates many reviews |
| SitterProfile → AvailabilityBlock | One-to-Many | A sitter can have many blocked date ranges (cascade delete) |
| Booking → Message | One-to-Many | Each booking has its own chat thread |
| Booking → Review | One-to-One | At most one review per booking (`@unique` on FK) |
| Pet → Booking | One-to-Many | A pet can appear in multiple bookings over time |

#### 2.2.3 Key Design Decisions

1. **CUID Primary Keys:** All models use `@id @default(cuid())` instead of auto-increment integers. CUIDs are URL-safe, hard to guess, and suitable for exposing in client-facing endpoints.
2. **Historical Price Freezing:** `Booking.totalPrice` is computed at creation (rate × nights) and stored. This ensures retroactive changes to a sitter's rate do not affect past booking records.
3. **Immutable Records:** `Message` and `Review` intentionally omit `updatedAt` — they are created once and never modified.
4. **Cascade Deletes:** `AvailabilityBlock` uses `onDelete: Cascade` so deleting a sitter profile automatically removes all associated availability blocks.
5. **String Species (not Enum):** `Pet.species` is a plain `String` rather than an enum to allow new animal types to be added without requiring a database migration.
6. **Named Relations:** Where a model has multiple relations to the same target (e.g., `User` appears in `Booking` as both owner and indirectly as sitter), Prisma named relations (`@relation("OwnerBookings")`) resolve the ambiguity.

---

### 2.3 Use Case Diagram

The system supports four types of actors interacting with BowBow:

**Actors and Their Use Cases:**

**Guest (Unauthenticated User)**
- Browse the sitter directory (Search Page)
- View individual sitter profiles

**Pet Owner (Authenticated, Role: OWNER or BOTH)**
- Register and sign in via Clerk
- Complete role onboarding
- Add, edit, and delete pet profiles
- Search and filter sitters by city, service, and rate
- View a sitter's public profile and reviews
- Submit a booking request (select pet, service, dates)
- View and cancel own bookings
- Send and receive real-time messages with sitters
- Leave a star rating and written review for a completed stay

**Pet Sitter (Authenticated, Role: SITTER or BOTH)**
- Register and sign in via Clerk
- Create and manage a public sitter listing (services, rate, city, bio)
- Manage availability calendar (add/remove blocked date ranges)
- View and respond to incoming booking requests (confirm or decline)
- Send and receive real-time messages with pet owners
- Mark confirmed stays as complete

**Admin (Authenticated, isAdmin = true)**
- View platform-wide statistics dashboard
- View all registered users; ban or unban user accounts
- View all platform bookings; force-cancel any booking
- View all reviews; delete inappropriate or fraudulent reviews

---

### 2.4 Sequence Diagram — Booking Request Flow

The following sequence describes the booking creation and confirmation process:

```
Pet Owner          Frontend (React)        Backend (Express)         Database
    |                     |                       |                       |
    |-- Opens SitterPage ->|                       |                       |
    |                     |-- GET /api/sitters/:id ->                     |
    |                     |                       |-- findUnique(id) ----->|
    |                     |                       |<-- SitterProfile ------|
    |                     |<-- 200 sitter data ----|                       |
    |                     |                       |                       |
    |-- Submits booking -->|                       |                       |
    |                     |-- POST /api/bookings ->|                       |
    |                     |   (JWT + payload)      |-- Validate pet ------->|
    |                     |                       |-- Check AvailBlocks -->|
    |                     |                       |-- Check PENDING/CON -->|
    |                     |                       |-- Calculate price      |
    |                     |                       |-- create(Booking) ---->|
    |                     |                       |<-- Booking (PENDING) --|
    |                     |<-- 201 booking --------|                       |
    |<-- Booking confirmed-|                       |                       |
    |                     |                       |                       |
Pet Sitter         Frontend (React)        Backend (Express)         Database
    |                     |                       |                       |
    |-- Opens Bookings --->|                       |                       |
    |                     |-- GET /api/bookings -->|                       |
    |                     |                       |-- findMany(sitter) --->|
    |                     |<-- sitterBookings ------|                       |
    |                     |                       |                       |
    |-- Clicks Confirm --->|                       |                       |
    |                     |-- PATCH /api/bookings/:id { CONFIRMED } ->    |
    |                     |                       |-- Validate transition  |
    |                     |                       |-- update(status) ----->|
    |                     |                       |<-- Updated booking ----|
    |                     |<-- 200 updated --------|                       |
    |<-- Status updated ---|                       |                       |
```

---

### 2.5 Sequence Diagram — Real-Time Messaging Flow

The following sequence describes how real-time messages are sent and received:

```
User A (Owner)      Frontend (React)     Socket.io Server    Express API      Database
    |                    |                     |                  |               |
    |-- Opens Messages -->|                    |                  |               |
    |                    |-- GET /api/messages/:bookingId ------->|               |
    |                    |                     |                  |-- findMany -->|
    |                    |<-- message history --|                  |               |
    |                    |                     |                  |               |
    |                    |-- socket.connect(JWT in handshake) --->|               |
    |                    |                     |-- verifyToken()  |               |
    |                    |                     |-- Set clerkUserId|               |
    |                    |-- emit('join_booking', bookingId) ---->|               |
    |                    |                     |-- resolveAccess()|               |
    |                    |                     |-- socket.join(room)              |
    |                    |                     |                  |               |
    |-- Types message --->|                    |                  |               |
    |                    |-- POST /api/messages/:bookingId ------>|               |
    |                    |                     |                  |-- create() -->|
    |                    |                     |                  |<-- message ---|
    |                    |                     |<-- emit('new_message', msg) -----|
    |                    |<-- socket event ----|                  |               |
    |<-- Message appears -|                    |                  |               |
    |                    |                     |                  |               |
User B (Sitter)     Frontend (React)                                              |
    |<-- socket event ----|<-- 'new_message' --|                  |               |
    |<-- Message appears--|                    |                  |               |
```

---

### 2.6 Activity Diagram — Booking Lifecycle

The booking status progresses through a defined state machine:

```
[Owner submits booking request]
          |
          v
      [PENDING]
          |
    ┌─────┴─────┐
    |           |
[Sitter      [Sitter
 Confirms]    Declines]
    |           |
    v           v
[CONFIRMED] [CANCELLED] <── [Owner Cancels PENDING/CONFIRMED]
    |
    |
[Sitter marks Complete]
    |
    v
[COMPLETED]
    |
    v
[Owner leaves Review] ──> [Review stored on SitterProfile]
```

**State Transition Rules:**
- **Sitter** can: PENDING → CONFIRMED, PENDING → CANCELLED, CONFIRMED → COMPLETED
- **Owner** can: PENDING → CANCELLED, CONFIRMED → CANCELLED
- **Admin** can force-cancel any non-terminal booking

---

### 2.7 Frontend Route Architecture

The React application implements three tiers of route protection:

**Public Routes (accessible to all users):**

| Route | Page | Description |
|-------|------|-------------|
| `/` | HomePage | Marketing landing page with hero search bar |
| `/search` | SearchPage | Sitter directory with city/service/rate filters |
| `/sitters/:id` | SitterPage | Individual sitter public profile with reviews |
| `/sign-in/*` | SignInPage | Clerk-hosted sign-in form (wildcard for Clerk sub-routes) |
| `/sign-up/*` | SignUpPage | Clerk-hosted sign-up form |

**Protected Routes (require authentication via `<ProtectedRoute>` wrapper):**

| Route | Page | Description |
|-------|------|-------------|
| `/dashboard` | DashboardPage | Role-based home; redirects to `/onboarding` if role unset |
| `/onboarding` | OnboardingPage | First-time role selection (Owner / Sitter / Both) |
| `/profile` | ProfilePage | Edit user bio and role |
| `/pets` | PetsPage | Manage pet profiles (add/edit/delete) |
| `/my-listing` | SitterSetupPage | Create/edit sitter listing and availability calendar |
| `/bookings` | BookingsPage | View/manage bookings; submit reviews |
| `/messages` | MessagesPage | Real-time booking-scoped chat |

**Admin Routes (require `isAdmin === true` via `<AdminRoute>` wrapper):**

| Route | Page | Description |
|-------|------|-------------|
| `/admin` | AdminDashboardPage | Platform statistics overview |
| `/admin/users` | AdminUsersPage | User management (ban/unban) |
| `/admin/bookings` | AdminBookingsPage | All bookings overview (force-cancel) |
| `/admin/reviews` | AdminReviewsPage | Review moderation (delete) |

---

---

## 3. IMPLEMENTATION

### 3.1 Backend Implementation

#### 3.1.1 Express Application Setup

The Express application (`app.js`) is configured with the following middleware stack applied in order:

1. **CORS** — Permits requests from `FRONTEND_URL` (production) and `http://localhost:5173` (development). Blocks all other origins.
2. **JSON Body Parser** — `express.json()` parses incoming request bodies.
3. **Clerk Middleware** — `clerkMiddleware()` validates the JWT on every request and populates `req.auth` with the authenticated user's Clerk ID. This runs globally; individual routes selectively enforce authentication.

The HTTP server is created explicitly in `server.js` (rather than using `app.listen()`) to allow Socket.io to be attached to the same server instance before it begins listening.

#### 3.1.2 Authentication Middleware

**`requireAuth()`** — A Clerk factory middleware. When added to a route, it rejects any request without a valid Clerk JWT with HTTP 401.

**`requireAdmin`** — A custom Express middleware function. It reads `req.auth.userId` (set by Clerk middleware), queries the database for the matching user, and returns HTTP 403 if `isAdmin` is false. This protects all `/api/admin` routes.

#### 3.1.3 Controller Implementations

**usersController.js**

- `sync()` — Called by the frontend after every sign-in. Uses `prisma.user.upsert()` keyed on `clerkId` to safely create or update the user record. Syncs `email`, `firstName`, `lastName`, and `avatarUrl` from Clerk. The upsert pattern makes it safe to call on every login without creating duplicates.
- `getMe()` — Returns the full internal database record for the currently authenticated user.
- `updateMe()` — Performs a partial update. Only `role`, `bio`, and `hasCompletedOnboarding` are user-editable. Name and avatar are Clerk-managed and excluded from this endpoint.

**petsController.js**

- `getMyPets()` — Returns all pets where `userId` matches the authenticated user's internal ID, ordered by creation date (oldest first).
- `createPet()` — Validates required fields (`name`, `species`), parses `age` and `weight` as floats, and associates the pet with the authenticated user.
- `updatePet()` / `deletePet()` — Each verifies that `pet.userId === currentUser.id` before proceeding. Returns HTTP 403 if the caller does not own the pet.

**sittersController.js**

- `getAllSitters()` — Queries all `SitterProfile` records where `isAvailable === true` and `user.isBanned === false`. For each sitter, computes `avgRating` (average of all review ratings, rounded to 1 decimal) and `reviewCount`.
- `getSitter()` — Returns a single sitter's full profile with all associated reviews and computed average rating.
- `upsertMyListing()` — Uses `prisma.sitterProfile.upsert()` keyed on `userId` to create or update a sitter profile in a single atomic operation.
- `getSitterAvailability()` — Returns two separate arrays: `blockedRanges` (manual `AvailabilityBlock` records) and `bookedRanges` (bookings with status `PENDING` or `CONFIRMED`). The frontend merges these two arrays to render a unified view of unavailable dates.
- `updateMyAvailability()` — Validates that each block has `startDate` and `endDate` with `endDate > startDate`. Then performs a **delete-then-create** replacement: all existing blocks for the sitter are deleted in one operation, then the new set is created. This ensures the calendar always reflects exactly what the sitter submitted.

**bookingsController.js**

- `createBooking()` — The most complex controller function. It performs the following steps in order:
  1. Verifies the requested pet belongs to the authenticated user.
  2. Verifies the sitter profile exists and the sitter is not the same user as the owner (self-booking prevention).
  3. Validates that `startDate < endDate`.
  4. Queries for any `AvailabilityBlock` where the block overlaps the requested dates. If found, returns HTTP 409.
  5. Only if no availability block conflict exists, queries for any `PENDING` or `CONFIRMED` booking that overlaps the same dates. If found, returns HTTP 409.
  6. Calculates `totalPrice = rate × max(1, nights)` (minimum 1 night charge).
  7. Creates the booking with status `PENDING`.

- `updateBookingStatus()` — Enforces the role-gated state machine:
  - **Sitter** may transition: `PENDING → CONFIRMED`, `PENDING → CANCELLED`, `CONFIRMED → COMPLETED`
  - **Owner** may transition: `PENDING → CANCELLED`, `CONFIRMED → CANCELLED`
  - Any other transition attempt returns HTTP 400.

**reviewsController.js**

- `createReview()` — Validates three preconditions before writing: (1) the booking exists and the caller is its owner, (2) the booking status is `COMPLETED`, and (3) no review already exists for the booking. The database-level `@unique` on `Review.bookingId` provides an additional integrity guarantee.

**messagesController.js**

- `resolveAccess()` — A shared helper used by both `getMessages` and `sendMessage`. It verifies the caller is either the booking owner or the sitter on that booking. Returns `{ user, booking }` on success or `null` on failure.
- `sendMessage()` — After persisting the message to the database, it broadcasts the `new_message` event to the Socket.io room for that booking via `getIO().to('booking:' + bookingId).emit('new_message', { message })`. This delivers the message to all connected clients in the room instantly.

**adminController.js**

- `getStats()` — Uses `prisma.booking.groupBy({ by: ['status'] })` to count bookings by status in a single query. Revenue is computed as the sum of `totalPrice` for `COMPLETED` bookings only.
- `banUser()` — Uses `prisma.$transaction()` to atomically set `user.isBanned = true` and `sitterProfile.isAvailable = false` in the same database transaction, ensuring the banned user's listing disappears from search immediately.

#### 3.1.4 Socket.io WebSocket Implementation

**Initialization (`socket/index.js`):**
- `initIO(httpServer)` is called once in `server.js` before the server begins listening.
- Socket.io is attached to the HTTP server with CORS configured to match the frontend origin.
- A connection-level authentication middleware verifies the Clerk JWT from `socket.handshake.auth.token` using `verifyToken()`. On success, the verified Clerk user ID is stored in `socket.data.clerkUserId`. On failure, the connection is rejected with `"Invalid or expired token"`.

**Events:**
- `join_booking` — Client emits this when navigating to a booking chat. The server calls `resolveAccess()` (same logic as the REST controller helper) to verify the user is an authorized party. On success, the socket is added to room `booking:{bookingId}` via `socket.join()`.
- `leave_booking` — Client emits this when navigating away. The server calls `socket.leave(room)` to remove the socket from the room and stop delivery of future messages.
- `new_message` — Emitted by the server (from `messagesController`) via `getIO().to(room).emit()`. Delivered to all sockets currently in the room, including the sender's socket. The frontend deduplicates by `message.id` to prevent showing a message twice.

---

### 3.2 Frontend Implementation

#### 3.2.1 Authentication Flow

When a user signs in through Clerk, the `useUserSync` hook runs once per session (guarded by a `useRef(hasSynced)` flag to prevent re-execution on every render). It calls `POST /api/users/sync` with the user's Clerk JWT. The backend upserts the user record into PostgreSQL. The hook returns `{ dbUser, syncing }` which is consumed by pages needing the internal user ID or role information.

#### 3.2.2 Custom React Hooks Architecture

All seven data-fetching hooks in BowBow follow a consistent structural pattern:

- **Auto-fetch on auth change:** Each hook calls `useUser()` from Clerk to determine the signed-in state. A `useEffect` triggers the initial data fetch whenever the authentication state changes.
- **`useCallback` for stability:** All mutation functions (`createPet`, `updateBookingStatus`, etc.) are wrapped in `useCallback` with explicit dependency arrays to prevent unnecessary re-renders and stale closure bugs.
- **Optimistic state updates:** After a successful mutation, hooks update their local state immediately (append, replace, or filter) without waiting for a re-fetch. This keeps the UI responsive.
- **Error propagation:** Fetch errors are stored in an `error` state variable. Mutation errors are thrown so calling components can handle them with try/catch.

#### 3.2.3 Real-Time Messaging Hook (`useMessages`)

The `useMessages` hook manages a dual-source data pipeline:

1. **Initial Load (REST):** On mount, the hook calls `GET /api/messages/:bookingId` to load the full message history from the database.
2. **Live Updates (WebSocket):** The hook establishes a Socket.io connection using the Clerk JWT token. It emits `join_booking` to subscribe to the booking's room. Incoming `new_message` events are appended to the messages state, with deduplication by `message.id` to handle the case where the sender's own socket also receives the broadcast.

**Race condition protection:** A `activeBookingRef` tracks the currently selected booking ID. Before updating state from any async operation, the hook checks that `activeBookingRef.current` still matches the booking ID the response corresponds to. This prevents stale responses from a previously selected booking from updating the UI.

**Resilience:**
- On socket `connect` event (fires on reconnection after a network drop), the hook re-emits `join_booking` to re-subscribe to the room.
- On `connect_error`, the hook fetches a fresh Clerk token and reconnects the socket, handling JWT expiry transparently.
- On component unmount, the hook emits `leave_booking` (if the socket is still connected) and removes the event listener, preventing memory leaks.

#### 3.2.4 Availability Calendar Component

The `AvailabilityCalendar` component operates in two modes:

**Edit Mode** (rendered on `/my-listing` for sitters):
- Allows the sitter to select date ranges to block. Clicking a start and end date creates a new blocked range.
- Calls `saveBlocks()` from the `useAvailability` hook which sends `PUT /api/sitters/me/availability` with the complete updated array of blocks (full replacement semantics).

**View Mode** (rendered on `/sitters/:id` for pet owners):
- Read-only calendar showing which dates are unavailable.
- Fetches both `blockedRanges` (manual sitter blocks) and `bookedRanges` (existing PENDING/CONFIRMED bookings) from `GET /api/sitters/:id/availability`.
- Merges both arrays to render a unified set of grayed-out unavailable dates, giving owners a clear picture of when the sitter is free.

---

---

## 4. TESTING

### 4.1 Testing Strategy

BowBow employs a unit-testing strategy that isolates individual components and validates their behavior without requiring external infrastructure (no live database, no live server).

| Layer | Testing Approach | Framework |
|-------|-----------------|-----------|
| Backend Controllers | Mock Prisma client; test business logic in isolation | Vitest |
| Frontend Hooks | Mock HTTP via MSW; mock Socket.io client | Vitest + MSW |
| Frontend Components | Render components in jsdom; simulate user events | React Testing Library |

**Backend Test Configuration:**
- `vitest.setup.mjs` pre-populates Node's `require.cache` with a mock Prisma client before any test file imports it. This means tests can configure mock return values without real database calls.

**Frontend Test Configuration:**
- Vitest is configured with the `jsdom` test environment to simulate a browser.
- An MSW service worker intercepts all `fetch()` calls and returns configured mock responses.
- Clerk's SDK is mocked globally to simulate authenticated and unauthenticated states.

---

### 4.2 Backend Test Cases

#### File: `bookingsController.conflict.test.js`

Tests validate the conflict-detection logic in `createBooking()`. A standard mock setup provides: a valid pet owner, a separate sitter user, an available sitter profile, and no conflicts. Individual tests override specific Prisma mock calls to simulate conflict scenarios.

| Test No. | Test Description | Expected Result |
|----------|-----------------|----------------|
| TC-B-01 | AvailabilityBlock fully overlaps the requested booking dates | HTTP 409 Conflict |
| TC-B-02 | AvailabilityBlock ends before the booking start date (no overlap) | Booking created successfully (HTTP 201) |
| TC-B-03 | AvailabilityBlock partially overlaps (block starts inside requested range) | HTTP 409 Conflict |
| TC-B-04 | An existing PENDING booking overlaps the requested dates | HTTP 409 Conflict |
| TC-B-05 | An existing CONFIRMED booking overlaps the requested dates | HTTP 409 Conflict |
| TC-B-06 | No availability blocks and no conflicting bookings exist | Booking created successfully (HTTP 201) |
| TC-B-07 | AvailabilityBlock conflict detected; booking conflict check is skipped (short-circuit) | HTTP 409; only one DB query issued |

#### File: `sittersController.availability.test.js`

Tests validate `getSitterAvailability()` and `updateMyAvailability()` independently.

**getSitterAvailability() Tests:**

| Test No. | Test Description | Expected Result |
|----------|-----------------|----------------|
| TC-S-01 | Sitter profile not found in database | HTTP 404 Not Found |
| TC-S-02 | Sitter exists with blocks and bookings | HTTP 200; `blockedRanges` and `bookedRanges` populated |
| TC-S-03 | Sitter exists but has no blocks or bookings | HTTP 200; both arrays empty |
| TC-S-04 | Booking query filters by PENDING and CONFIRMED status only | Correct Prisma `status: { in: ['PENDING','CONFIRMED'] }` filter verified |
| TC-S-05 | Database throws an unexpected error | HTTP 500 Internal Server Error |

**updateMyAvailability() Tests:**

| Test No. | Test Description | Expected Result |
|----------|-----------------|----------------|
| TC-S-06 | Authenticated user not found in database | HTTP 404 Not Found |
| TC-S-07 | User exists but has no sitter profile | HTTP 404 Not Found |
| TC-S-08 | `blocks` field in request body is not an array | HTTP 400 Bad Request |
| TC-S-09 | A block contains an invalid (non-parseable) date string | HTTP 400 Bad Request |
| TC-S-10 | A block has `endDate` equal to or before `startDate` | HTTP 400 Bad Request |
| TC-S-11 | Valid blocks submitted; verifies `deleteMany` then `createMany` order | Replace-all pattern confirmed; HTTP 200 |
| TC-S-12 | Empty array submitted; all existing blocks should be cleared | HTTP 200; empty array returned |
| TC-S-13 | Database throws an unexpected error during write | HTTP 500 Internal Server Error |

---

### 4.3 Frontend Hook Test Cases

#### `useMessages.test.js`

| Test No. | Behavior Tested | Expected Result |
|----------|----------------|----------------|
| TC-M-01 | Hook fetches message history via REST on mount when `bookingId` is set | Messages array populated from API response |
| TC-M-02 | `bookingId` is null on mount | No fetch issued; messages remain empty |
| TC-M-03 | Socket emits `new_message` with a duplicate `message.id` already in state | Message added only once (deduplication) |
| TC-M-04 | `sendMessage()` is called with message text | POST issued; returned message appended to state |
| TC-M-05 | Component unmounts while socket is connected | `leave_booking` emitted; event listener removed |

#### `useDbUser.test.js`

| Test No. | Behavior Tested | Expected Result |
|----------|----------------|----------------|
| TC-D-01 | Hook initial state before fetch completes | `loading: true`, `dbUser: null` |
| TC-D-02 | User is signed in; API returns user record | `dbUser` populated; `loading: false` |
| TC-D-03 | User is not signed in | No fetch issued; `dbUser` remains null |
| TC-D-04 | API returns a non-2xx HTTP status | `error` state set; `dbUser` remains null |
| TC-D-05 | `refetch()` is called after initial load | Fetch is re-triggered; state updated |

#### `usePets.test.js`

| Test No. | Behavior Tested | Expected Result |
|----------|----------------|----------------|
| TC-P-01 | Hook fetches pets on mount | `pets` array populated from API |
| TC-P-02 | `createPet()` called with valid pet data | POST issued; new pet appended to `pets` array |
| TC-P-03 | `updatePet()` called with updated fields | PATCH issued; corresponding pet replaced in `pets` array |
| TC-P-04 | `deletePet()` called with a pet ID | DELETE issued; pet removed from `pets` array |
| TC-P-05 | `createPet()` called; API returns HTTP 400 | Function throws error; `pets` array unchanged |

#### `useAvailability.test.js`

| Test No. | Behavior Tested | Expected Result |
|----------|----------------|----------------|
| TC-A-01 | Hook initial state | `loading: true`; `blockedRanges` and `bookedRanges` are empty arrays |
| TC-A-02 | `sitterId` provided; API returns ranges | Both `blockedRanges` and `bookedRanges` populated |
| TC-A-03 | API returns empty arrays for ranges | Both arrays remain empty; no errors |
| TC-A-04 | API returns non-2xx status | `error` state set; arrays remain empty |
| TC-A-05 | `sitterId` is null | No fetch issued; arrays remain empty |
| TC-A-06 | `saveBlocks()` called with new blocks array | PUT issued; `blockedRanges` updated in state |
| TC-A-07 | `saveBlocks()` sends Authorization header | Clerk JWT present in `Authorization: Bearer` header |
| TC-A-08 | `saveBlocks()` called; API returns non-2xx | Function throws error; state unchanged |

---

### 4.4 Test Execution

**Running Backend Tests:**
```bash
cd backend
npm run test
```

**Running Frontend Tests:**
```bash
cd frontend
npm run test
```

**Test Output Summary:**

| Test Suite | Total Test Cases | Scope |
|------------|-----------------|-------|
| bookingsController.conflict | 7 | Booking conflict detection (AvailabilityBlock + existing bookings) |
| sittersController.availability | 13 | Availability fetch and replace-all update |
| useMessages | 5 | Real-time messaging hook (fetch, socket, deduplication) |
| useDbUser | 5 | User record fetch and error handling |
| usePets | 5 | Pet CRUD mutations and state management |
| useAvailability | 8 | Availability fetch and authenticated save |
| **Total** | **43** | **Full coverage of core business logic** |

---

*End of Second Review Documentation — BowBow Project*
