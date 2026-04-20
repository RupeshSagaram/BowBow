# routes/ — Detailed Explanation

## What is the `routes/` folder?

In an Express application, **routes** are the layer that maps an incoming HTTP request (method + URL) to the function that should handle it. The `routes/` folder contains one file per resource (users, pets, sitters, etc.). Each file creates an Express `Router` instance, registers its routes on it, and exports it.

Routes are registered globally in `app.js` with a line like:
```js
app.use('/api/users', require('./routes/users'));
```
This means every route defined inside `users.js` is automatically prefixed with `/api/users`. The route files themselves only define the *suffix* portion of the path.

Routes are intentionally thin — they don't contain business logic. Their only jobs are:
1. Declare the HTTP method and path.
2. Apply middleware (e.g. authentication guards).
3. Call the appropriate controller function.

---

## File Index

| File | URL Prefix | Auth Required |
|---|---|---|
| [users.js](#usersjs) | `/api/users` | All routes |
| [pets.js](#petsjs) | `/api/pets` | All routes |
| [sitters.js](#sittersjs) | `/api/sitters` | `/me` routes only |
| [bookings.js](#bookingsjs) | `/api/bookings` | All routes |
| [messages.js](#messagesjs) | `/api/messages` | All routes |
| [reviews.js](#reviewsjs) | `/api/reviews` | POST only |
| [admin.js](#adminjs) | `/api/admin` | All routes (admin-only) |

---

## users.js

### Purpose
Handles everything related to a logged-in user's own account: syncing to our database after sign-in, reading their profile, and updating their profile. All three routes require authentication.

### Full Source
```js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const usersController = require('../controllers/usersController');

router.post('/sync', requireAuth(), usersController.sync);
router.get('/me',    requireAuth(), usersController.getMe);
router.patch('/me',  requireAuth(), usersController.updateMe);

module.exports = router;
```

### Line-by-Line

```js
const express = require('express');
```
Imports the Express framework. This gives us access to `express.Router()`.

```js
const router = express.Router();
```
Creates a new **mini-application** (Router instance) that can hold its own set of routes. This router is later exported and mounted in `app.js`. Using a Router instead of the main `app` object keeps each resource's routes isolated.

```js
const { requireAuth } = require('../middleware/auth');
```
Imports the `requireAuth` function from the auth middleware file. `requireAuth()` (called with parentheses) returns a Clerk middleware function that validates the incoming request's JWT. If the token is missing or invalid, it short-circuits the request and automatically sends a `401 Unauthorized` response — the controller never runs.

```js
const usersController = require('../controllers/usersController');
```
Imports the controller module that contains the actual business logic for each user action. The route file does not contain any logic itself — it just points to these functions.

```js
router.post('/sync', requireAuth(), usersController.sync);
```
- **`POST /api/users/sync`**
- Called by the frontend immediately after a user signs in via Clerk.
- The frontend passes the Clerk JWT; `requireAuth()` validates it and sets `req.auth`.
- `usersController.sync` looks up or creates the user in our PostgreSQL database using the Clerk ID. This is necessary because Clerk manages authentication, but our database needs its own user record to store app-specific data (role, pets, bookings, etc.).

```js
router.get('/me', requireAuth(), usersController.getMe);
```
- **`GET /api/users/me`**
- Returns the full database record for the currently authenticated user.
- Used by the frontend on load to populate the user context (role, name, onboarding status, etc.).

```js
router.patch('/me', requireAuth(), usersController.updateMe);
```
- **`PATCH /api/users/me`**
- Updates user-controlled fields: `role`, `bio`, and `hasCompletedOnboarding`.
- `PATCH` (not `PUT`) is used because this is a partial update — callers only need to send the fields they want to change.

```js
module.exports = router;
```
Exports the router so `app.js` can mount it at `/api/users`.

---

## pets.js

### Purpose
Handles full CRUD for pets belonging to the signed-in user. All four routes require authentication. Ownership verification (confirming the pet belongs to the requesting user) is intentionally delegated to the controller layer rather than being enforced here.

### Full Source
```js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const petsController = require('../controllers/petsController');

router.get('/',      requireAuth(), petsController.getMyPets);
router.post('/',     requireAuth(), petsController.createPet);
router.patch('/:id', requireAuth(), petsController.updatePet);
router.delete('/:id', requireAuth(), petsController.deletePet);

module.exports = router;
```

### Line-by-Line

```js
const express = require('express');
const router = express.Router();
```
Standard setup — imports Express and creates an isolated router instance (same as `users.js`).

```js
const { requireAuth } = require('../middleware/auth');
const petsController = require('../controllers/petsController');
```
Imports the auth guard and the controller. Every pet route will use `requireAuth()` before reaching the controller.

```js
router.get('/', requireAuth(), petsController.getMyPets);
```
- **`GET /api/pets`**
- Returns all pets that belong to the currently signed-in user.
- The controller uses `req.auth.userId` (set by Clerk's middleware) to find the user in our DB and return only their pets — not everyone's.

```js
router.post('/', requireAuth(), petsController.createPet);
```
- **`POST /api/pets`**
- Creates a new pet and associates it with the signed-in user.
- The controller reads the pet details from `req.body` (name, species, breed, age, etc.) and sets `userId` to the current user.

```js
router.patch('/:id', requireAuth(), petsController.updatePet);
```
- **`PATCH /api/pets/:id`**
- Updates a specific pet. The `:id` is an Express **URL parameter** — if the request is `PATCH /api/pets/clh3zqk8v0000...`, then `req.params.id` equals `"clh3zqk8v0000..."`.
- The controller verifies that the pet with that ID belongs to the requesting user before applying the update. If it doesn't belong to them, the controller returns a `403 Forbidden`.

```js
router.delete('/:id', requireAuth(), petsController.deletePet);
```
- **`DELETE /api/pets/:id`**
- Deletes a specific pet. Same ownership check in the controller as the PATCH route.

```js
module.exports = router;
```
Exports the router for mounting in `app.js`.

---

## sitters.js

### Purpose
Handles the sitter listing system. Some routes are **public** (browsing sitters doesn't require an account) while others require auth (managing your own listing). Contains the most routes of any file and has an important route ordering constraint.

### Full Source
```js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const sittersController = require('../controllers/sittersController');

router.get('/',                    sittersController.getAllSitters);
router.get('/me',     requireAuth(), sittersController.getMyListing);
router.put('/me',     requireAuth(), sittersController.upsertMyListing);
router.put('/me/availability', requireAuth(), sittersController.updateMyAvailability);
router.get('/:id',               sittersController.getSitter);
router.get('/:id/availability',  sittersController.getSitterAvailability);

module.exports = router;
```

### Line-by-Line

```js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const sittersController = require('../controllers/sittersController');
```
Standard imports — same pattern as the other route files.

```js
router.get('/', sittersController.getAllSitters);
```
- **`GET /api/sitters`**
- Public — no `requireAuth()`. Any visitor (even unauthenticated) can browse sitter listings.
- Returns all sitter profiles where `isAvailable = true` and the user is not banned.

```js
router.get('/me', requireAuth(), sittersController.getMyListing);
```
- **`GET /api/sitters/me`**
- Auth required. Returns the signed-in user's own sitter profile.
- Used by the sitter dashboard to pre-populate the edit form.
- **CRITICAL: This route must come before `/:id`** (see below).

```js
router.put('/me', requireAuth(), sittersController.upsertMyListing);
```
- **`PUT /api/sitters/me`**
- Auth required. Creates or updates the signed-in user's sitter profile.
- Uses `PUT` (not `PATCH`) and `upsert` semantics — the controller does `prisma.sitterProfile.upsert(...)` which creates the row if it doesn't exist, or replaces it if it does.

```js
router.put('/me/availability', requireAuth(), sittersController.updateMyAvailability);
```
- **`PUT /api/sitters/me/availability`**
- Auth required. Replaces ALL of the sitter's manually-blocked date ranges in one operation.
- Uses `PUT` because this is a full replacement (not a delta). The controller deletes all existing `AvailabilityBlock` rows for this sitter and inserts the new set.

```js
router.get('/:id', sittersController.getSitter);
```
- **`GET /api/sitters/:id`**
- Public. Returns a single sitter's public profile by their `SitterProfile.id`.
- `:id` is a URL parameter captured as `req.params.id`.
- **Why `/me` must come first**: Express matches routes top-to-bottom. If `/:id` were declared before `/me`, a request to `GET /api/sitters/me` would match `/:id` with `id = "me"`, and the controller would try to find a sitter profile with id `"me"` — which doesn't exist. By declaring `/me` first, Express matches it before it ever reaches `/:id`.

```js
router.get('/:id/availability', sittersController.getSitterAvailability);
```
- **`GET /api/sitters/:id/availability`**
- Public. Returns the sitter's blocked date ranges (from `AvailabilityBlock`) merged with their confirmed bookings. Used by the availability calendar on the sitter's public profile page so owners can see when the sitter is busy.

```js
module.exports = router;
```
Exports the router.

---

## bookings.js

### Purpose
Handles the booking lifecycle — creating a booking request, retrieving the user's bookings, and updating a booking's status (confirm, cancel, complete). All routes require authentication.

### Full Source
```js
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const bookingsController = require('../controllers/bookingsController');

router.post('/',     requireAuth(), bookingsController.createBooking);
router.get('/',      requireAuth(), bookingsController.getMyBookings);
router.patch('/:id', requireAuth(), bookingsController.updateBookingStatus);

module.exports = router;
```

### Line-by-Line

```js
const router = require('express').Router();
```
A shorthand for `require('express').Router()` — creates the router in a single line without storing `express` in a separate variable.

```js
const { requireAuth } = require('../middleware/auth');
const bookingsController = require('../controllers/bookingsController');
```
Imports the auth guard and controller.

```js
router.post('/', requireAuth(), bookingsController.createBooking);
```
- **`POST /api/bookings`**
- Creates a new booking. The owner sends the sitter profile ID, pet ID, service, start date, end date, and an optional message in `req.body`.
- The controller validates for date conflicts (no overlapping confirmed bookings or availability blocks), calculates `totalPrice` (rate × nights), and inserts the new `Booking` row with `status = PENDING`.

```js
router.get('/', requireAuth(), bookingsController.getMyBookings);
```
- **`GET /api/bookings`**
- Returns all bookings relevant to the signed-in user.
- The controller checks the user's role: if they're an owner it returns their `ownerBookings`; if they're a sitter it returns bookings linked to their `sitterProfile`; if they're `BOTH`, it returns all of them.

```js
router.patch('/:id', requireAuth(), bookingsController.updateBookingStatus);
```
- **`PATCH /api/bookings/:id`**
- Updates the status of a single booking. `:id` is the booking's cuid.
- The controller enforces who can make which transition:
  - Sitter can: `PENDING → CONFIRMED`, `PENDING/CONFIRMED → CANCELLED`
  - Owner can: `PENDING/CONFIRMED → CANCELLED`, `CONFIRMED → COMPLETED`
- Only the `status` field is changed — no other fields can be patched through this route.

```js
module.exports = router;
```
Exports the router.

---

## messages.js

### Purpose
Handles the per-booking chat thread. Messages are always scoped to a specific booking — there is no global message inbox. Both routes require authentication. Real-time delivery is handled separately by Socket.io; these routes handle the initial load and persistence.

### Full Source
```js
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const messagesController = require('../controllers/messagesController');

router.get( '/:bookingId', requireAuth(), messagesController.getMessages);
router.post('/:bookingId', requireAuth(), messagesController.sendMessage);

module.exports = router;
```

### Line-by-Line

```js
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const messagesController = require('../controllers/messagesController');
```
Standard router + middleware + controller imports.

```js
router.get('/:bookingId', requireAuth(), messagesController.getMessages);
```
- **`GET /api/messages/:bookingId`**
- Fetches all messages for a specific booking, ordered by `createdAt` ascending (oldest first).
- `:bookingId` is a URL parameter — `req.params.bookingId` will hold the booking's cuid.
- The controller verifies the requesting user is either the booking's owner or the sitter before returning messages. This prevents one user from reading another user's conversation.
- Called on initial page load when a user opens the messaging view.

```js
router.post('/:bookingId', requireAuth(), messagesController.sendMessage);
```
- **`POST /api/messages/:bookingId`**
- Persists a new message to the database and then emits it over Socket.io so the recipient sees it in real-time without refreshing.
- `req.body.text` contains the message content.
- The controller sets `senderId` to the current user's ID (from `req.auth`) — callers cannot claim to be someone else.

```js
module.exports = router;
```
Exports the router.

---

## reviews.js

### Purpose
Handles creating and reading reviews. The POST route (write a review) is auth-protected; the GET route (read a sitter's reviews) is public so that prospective owners can evaluate sitters without an account.

### Full Source
```js
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const reviewsController = require('../controllers/reviewsController');

router.post('/',                        requireAuth(), reviewsController.createReview);
router.get('/sitter/:sitterProfileId',               reviewsController.getReviewsForSitter);

module.exports = router;
```

### Line-by-Line

```js
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const reviewsController = require('../controllers/reviewsController');
```
Standard imports.

```js
router.post('/', requireAuth(), reviewsController.createReview);
```
- **`POST /api/reviews`**
- Auth required. Creates a new review.
- The controller verifies:
  1. The referenced booking exists and belongs to the requesting user (as the owner).
  2. The booking's status is `COMPLETED` — you can only review a stay that has finished.
  3. No review already exists for that booking (`bookingId` has a `@unique` constraint in the schema).
- `req.body` should contain `bookingId`, `rating` (1–5), and optionally `text`.

```js
router.get('/sitter/:sitterProfileId', reviewsController.getReviewsForSitter);
```
- **`GET /api/reviews/sitter/:sitterProfileId`**
- **Public** — no `requireAuth()`. Anyone can read a sitter's reviews, including unauthenticated visitors.
- `:sitterProfileId` is a URL parameter identifying which sitter's reviews to fetch.
- The controller returns all reviews for that sitter profile, including the reviewer's name and avatar, ordered newest-first.
- This route is intentionally scoped under `/sitter/:id` (not just `/:id`) to make the URL self-documenting and avoid ambiguity with a potential future route to fetch a single review by its own ID.

```js
module.exports = router;
```
Exports the router.

---

## admin.js

### Purpose
Provides the API for the admin panel. Admins can view platform statistics, manage users (ban/unban), manage bookings (force-cancel), and moderate reviews (delete). Unlike other route files that use `requireAuth()` from Clerk, these routes use a custom `requireAdmin` middleware that performs **two checks**: the Clerk JWT must be valid AND the user's `isAdmin` flag in the database must be `true`.

### Full Source
```js
const router       = require('express').Router();
const requireAdmin = require('../middleware/adminAuth');
const adminCtrl    = require('../controllers/adminController');

router.get('/stats',                 requireAdmin, adminCtrl.getStats);

router.get('/users',                 requireAdmin, adminCtrl.getUsers);
router.patch('/users/:id/ban',       requireAdmin, adminCtrl.banUser);
router.patch('/users/:id/unban',     requireAdmin, adminCtrl.unbanUser);

router.get('/bookings',              requireAdmin, adminCtrl.getAllBookings);
router.patch('/bookings/:id/cancel', requireAdmin, adminCtrl.cancelBooking);

router.get('/reviews',               requireAdmin, adminCtrl.getAllReviews);
router.delete('/reviews/:id',        requireAdmin, adminCtrl.deleteReview);

module.exports = router;
```

### Line-by-Line

```js
const router = require('express').Router();
```
Creates the router instance.

```js
const requireAdmin = require('../middleware/adminAuth');
```
Imports the `requireAdmin` middleware — note this is a **direct import** (no destructuring, no calling with `()`). Unlike `requireAuth` from Clerk which is a factory (`requireAuth()` returns a function), `requireAdmin` is already a middleware function ready to be used directly. It checks the Clerk JWT AND queries the database to confirm `user.isAdmin === true`. Any user who passes Clerk auth but does not have `isAdmin: true` receives a `403 Forbidden`.

```js
const adminCtrl = require('../controllers/adminController');
```
Imports the admin controller, aliased as `adminCtrl` for brevity.

```js
router.get('/stats', requireAdmin, adminCtrl.getStats);
```
- **`GET /api/admin/stats`**
- Returns platform-wide aggregate counts: total users, total bookings by status, total reviews, etc.
- Used by the admin dashboard's summary cards at the top of the page.

```js
router.get('/users', requireAdmin, adminCtrl.getUsers);
```
- **`GET /api/admin/users`**
- Returns a list of all registered users with their profile details, role, and ban status.
- Used to populate the user management table in the admin panel.

```js
router.patch('/users/:id/ban', requireAdmin, adminCtrl.banUser);
```
- **`PATCH /api/admin/users/:id/ban`**
- Sets `isBanned = true` on the user with the given `:id`.
- A banned user's sitter listing is hidden from search, and they see a suspended message when they log in.
- Uses `PATCH` with a verb in the URL (`/ban`) rather than `PATCH /users/:id` with `{ isBanned: true }` in the body. This pattern makes the intent explicit and readable in logs.

```js
router.patch('/users/:id/unban', requireAdmin, adminCtrl.unbanUser);
```
- **`PATCH /api/admin/users/:id/unban`**
- Sets `isBanned = false`, restoring the user's access.

```js
router.get('/bookings', requireAdmin, adminCtrl.getAllBookings);
```
- **`GET /api/admin/bookings`**
- Returns all bookings across all users — not filtered to the requesting admin's account.
- Includes owner, sitter, pet, and status details for the booking management table.

```js
router.patch('/bookings/:id/cancel', requireAdmin, adminCtrl.cancelBooking);
```
- **`PATCH /api/admin/bookings/:id/cancel`**
- Force-cancels any booking regardless of its current status or who the parties are.
- Used for dispute resolution or policy violations.

```js
router.get('/reviews', requireAdmin, adminCtrl.getAllReviews);
```
- **`GET /api/admin/reviews`**
- Returns all reviews platform-wide.
- Shown in the moderation table so admins can read reviews before deciding to delete them.

```js
router.delete('/reviews/:id', requireAdmin, adminCtrl.deleteReview);
```
- **`DELETE /api/admin/reviews/:id`**
- Permanently deletes a review by its ID.
- Uses `DELETE` (not `PATCH`) because the record is removed entirely, not just marked as hidden.

```js
module.exports = router;
```
Exports the router for mounting in `app.js` at `/api/admin`.

---

## Design Patterns Used Across All Route Files

### 1. Router-per-resource
Each file creates its own `express.Router()` and exports it. `app.js` mounts each router at its URL prefix. This keeps route files small and focused.

### 2. Thin routes
Route files contain no `if` statements, no database calls, no business logic. Their only jobs are: declare the path, apply middleware, call a controller function.

### 3. Two-argument vs three-argument middleware
- `requireAuth()` from Clerk is a **factory** — calling it with `()` returns the actual middleware function.
- `requireAdmin` from `adminAuth.js` is already a function — it's passed directly without calling it.
Both patterns are valid Express middleware; the difference is just in how the middleware was implemented.

### 4. Named action URLs for state changes
Routes that change status (ban, unban, cancel) use a verb in the URL path (`/ban`, `/cancel`) rather than a generic PATCH with a body. This makes API logs readable and clarifies what each endpoint does.

### 5. Public vs protected routes in the same file
`sitters.js` and `reviews.js` mix public and protected routes in the same file. This is intentional — the resource is the same, just some actions require auth and some don't. The protection is applied per-route, not per-file.
