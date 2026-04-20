# schema.prisma — Detailed Explanation

## What is this file?

`schema.prisma` is the **single source of truth** for your database. It lives in `backend/prisma/` and is read by [Prisma ORM](https://www.prisma.io/).

It does three things:
1. **Tells Prisma how to connect** to the database (`datasource` block).
2. **Tells Prisma what code to generate** for your app (`generator` block).
3. **Defines the shape of every database table** (each `model` block = one table).

When you change this file, you run `npx prisma db push` to apply those changes to your live PostgreSQL database. You run `npx prisma generate` to regenerate the TypeScript client (`@prisma/client`) so your backend code reflects the updated types.

---

## Top-Level Blocks

### `generator client` (lines 5–7)

```prisma
generator client {
  provider = "prisma-client-js"
}
```

- This block configures what Prisma **generates** from your schema.
- `provider = "prisma-client-js"` tells Prisma to output a JavaScript/TypeScript client library.
- After running `npx prisma generate`, you get `@prisma/client` in `node_modules`, which your backend imports to query the database with full TypeScript type safety.

---

### `datasource db` (lines 9–12)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

- This block tells Prisma **which database** to connect to.
- `provider = "postgresql"` — Prisma will generate PostgreSQL-compatible SQL. If you ever switched to MySQL or SQLite, you'd change this line.
- `url = env("DATABASE_URL")` — The actual connection string (e.g. `postgresql://user:password@host:5432/dbname`) is read from the `DATABASE_URL` environment variable in your `.env` file. It is **never hardcoded** in source control for security reasons.

---

## Enums

Enums define a **fixed set of allowed values** for a field. PostgreSQL enforces this at the database level — any attempt to insert a value not in the list will be rejected.

---

### `enum Role` (lines 16–20)

```prisma
enum Role {
  OWNER
  SITTER
  BOTH
}
```

- Used on the `User.role` field to describe what kind of user someone is.
- `OWNER` — This person has pets and wants to book sitters.
- `SITTER` — This person offers pet-sitting services.
- `BOTH` — This person does both (they have pets AND sit for others).
- A value like `"ADMIN"` or `"GUEST"` would be **rejected** by the database because it's not in this list.

---

### `enum BookingStatus` (lines 23–28)

```prisma
enum BookingStatus {
  PENDING
  CONFIRMED
  CANCELLED
  COMPLETED
}
```

- Tracks where a booking is in its **lifecycle**.
- `PENDING` — The pet owner submitted the booking request; waiting for the sitter to respond.
- `CONFIRMED` — The sitter accepted the request; the stay is scheduled.
- `CANCELLED` — Either the owner or sitter cancelled before the stay.
- `COMPLETED` — The stay has finished. This is the only status that allows a review to be written.

---

## Models (Database Tables)

Each `model` block maps directly to a table in PostgreSQL. Each field inside the model maps to a **column** in that table.

---

### `model User` (lines 32–85)

The central table. Every person who signs up gets exactly one row here.

```prisma
id        String   @id @default(cuid())
```
- `id` is the **primary key** — the unique identifier for every user row.
- `String` — stored as a string, not an integer.
- `@id` — marks this as the primary key column.
- `@default(cuid())` — Prisma auto-generates a **cuid** (Collision-Resistant Unique ID) when a new row is inserted. Example: `clh3zqk8v0000356gfkw23y5m`. No need to pass an ID manually.

```prisma
clerkId   String   @unique
```
- Stores the ID that **Clerk** (the authentication provider) assigns to this user in their system.
- `@unique` — adds a uniqueness constraint in the database. No two users can share the same Clerk ID.
- Used to look up a user when a Clerk-authenticated request comes in.

```prisma
email     String   @unique
```
- The user's login email. Also `@unique` — no two accounts can share the same email address.

```prisma
firstName String
lastName  String
```
- Required name fields. They have no `?` suffix, so they **cannot be null** — every user must have a first and last name.

```prisma
avatarUrl String?
```
- The `?` makes this field **optional** (nullable). It stores a URL to the user's profile photo. Can be null if the user hasn't uploaded one.

```prisma
role      Role     @default(OWNER)
```
- Uses the `Role` enum defined above. New users default to `OWNER` when their account is created.
- Note: the default is `OWNER` not because everyone is an owner, but because we need *some* default. `hasCompletedOnboarding` (below) is what actually tells us if the user has made an intentional role choice.

```prisma
bio       String?
```
- A short free-text description the user writes about themselves. Optional.

```prisma
hasCompletedOnboarding Boolean @default(false)
```
- `false` by default. Set to `true` once the user visits `/onboarding` and explicitly picks their role.
- This is necessary because `role` defaults to `OWNER` — you can't distinguish "user chose OWNER" from "user hasn't picked yet" using `role` alone.

```prisma
isAdmin  Boolean @default(false)
```
- `true` gives this user access to the `/admin` panel.
- This is completely **separate** from `role` (OWNER/SITTER/BOTH). A user can be a SITTER and also an admin. They are orthogonal permissions.

```prisma
isBanned Boolean @default(false)
```
- If `true`, the user's sitter listing is hidden from search results and they see a "suspended" message when they log in.

```prisma
pets      Pet[]
```
- A **one-to-many relation**: one user can own many pets. This field is virtual — it doesn't create a column in the `users` table. Prisma uses it to let you do `user.pets` in code.

```prisma
sitterProfile SitterProfile?
```
- A **one-to-one relation**: a user may have one sitter profile. The `?` means it's optional — only users who are sitters will have one.

```prisma
ownerBookings  Booking[]  @relation("OwnerBookings")
```
- All the bookings this user has made **as a pet owner**.
- The `@relation("OwnerBookings")` name is required here because `Booking` has multiple connections back to `User`. Naming the relation removes ambiguity.

```prisma
messagesSent   Message[]  @relation("MessagesSent")
```
- All the chat messages this user has **sent**.

```prisma
reviewsWritten Review[]   @relation("ReviewsWritten")
```
- All the reviews this user has **authored** (as an owner reviewing a sitter).

```prisma
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
```
- `createdAt` is automatically set to the current timestamp when the row is inserted.
- `updatedAt` is automatically updated by Prisma every time the row is modified. You never set these manually.

---

### `model Pet` (lines 89–119)

Represents a pet owned by a user. Each pet belongs to exactly one user.

```prisma
id       String  @id @default(cuid())
```
- Auto-generated primary key (same pattern as User).

```prisma
name     String
species  String
```
- Both required. Every pet must have a name and species.
- `species` is a plain `String` rather than an enum. The reasoning: if a new species (e.g. "Rabbit") is added in the future, no database migration is needed — you just update the frontend dropdown. An enum would require a schema change and `db push`.

```prisma
breed    String?
age      Float?
weight   Float?
notes    String?
imageUrl String?
```
- All optional fields (`?` = nullable).
- `age Float?` — `Float` (not `Int`) allows fractional years like `1.5` (one and a half years old).
- `weight Float?` — stored in pounds.
- `notes String?` — free-text care instructions the owner writes for sitters (e.g. "needs medication twice a day").
- `imageUrl String?` — placeholder for a future pet photo upload feature.

```prisma
userId   String
owner    User     @relation(fields: [userId], references: [id])
```
- This is the standard **foreign key pattern** in Prisma.
- `userId String` is the actual FK column in the `pets` table. It stores the `id` of the User who owns this pet.
- `owner User @relation(...)` is a virtual Prisma field. `fields: [userId]` says "the FK lives in `userId`". `references: [id]` says "it points to `User.id`". This is what lets you write `pet.owner` in code to get the full User object.
- Note: `userId` stores the internal cuid (from `User.id`), NOT the Clerk ID.

```prisma
bookings Booking[]
```
- Which bookings involve this pet. One pet can appear in many bookings over time.

---

### `model SitterProfile` (lines 124–161)

Represents a sitter's public listing. Only users with `role = SITTER` or `BOTH` will have one. One-to-one with User.

```prisma
userId          String   @unique
user            User     @relation(fields: [userId], references: [id])
```
- `@unique` on `userId` is what enforces the **one-to-one** relationship with User. Because `userId` must be unique across all sitter profile rows, each user can have at most one profile.

```prisma
rate            Float
```
- The sitter's per-night rate in USD. Required — you must set a rate when creating a listing.

```prisma
services        String[]
```
- A PostgreSQL `TEXT[]` (text array) column. Stores a list of service names the sitter offers, e.g. `["Boarding", "Drop-In Visits", "Dog Walking"]`.
- Using a native array avoids needing a separate join table just for a simple list of strings.

```prisma
city            String?
state           String?
zipCode         String?
```
- Optional location fields. `state` stores the 2-letter abbreviation (e.g. `"CA"`). Used for location-based filtering in search.

```prisma
isAvailable     Boolean  @default(true)
```
- `true` = the sitter is active and appears in search results.
- `false` = the sitter has paused their listing (vacation, break, etc.) and is hidden.

```prisma
yearsExperience Int?
```
- Optional integer the sitter can fill in. Shown to pet owners as a trust signal.

```prisma
bookings        Booking[]
reviews         Review[]
availabilityBlocks AvailabilityBlock[]
```
- Reverse relation fields. They don't create columns — Prisma uses them to let you fetch related records (e.g. `sitterProfile.reviews`).

---

### `model Booking` (lines 165–198)

Created when a pet owner requests a stay with a sitter. This is the central transactional record.

```prisma
ownerId         String
owner           User          @relation("OwnerBookings", fields: [ownerId], references: [id])
```
- FK to `User`. The `@relation("OwnerBookings")` name matches the `ownerBookings` field on `User`, resolving the ambiguity (since `User` appears more than once in Booking's relations).

```prisma
sitterProfileId String
sitterProfile   SitterProfile @relation(fields: [sitterProfileId], references: [id])
```
- FK to `SitterProfile` (not to `User` directly). This is intentional: a booking is with a sitter's *listing*, not just a person. This lets you look up the rate, services, and other profile data attached to the booking.

```prisma
petId           String
pet             Pet           @relation(fields: [petId], references: [id])
```
- FK to `Pet`. Identifies which specific pet is being cared for.

```prisma
service         String
```
- Which service the owner is requesting (e.g. `"Boarding"`, `"Dog Walking"`). Stored as a plain string that must match one of the values in `SitterProfile.services`.

```prisma
startDate       DateTime
endDate         DateTime
```
- The start and end dates of the stay. Used to calculate price and to check for scheduling conflicts.

```prisma
totalPrice      Float
```
- Computed at booking creation time as `rate × number of nights`. Stored explicitly so that if the sitter later changes their rate, this booking's price does not change retroactively.

```prisma
message         String?
```
- An optional note the pet owner writes when submitting the request (e.g. "she's shy at first but warms up quickly").

```prisma
status          BookingStatus @default(PENDING)
```
- The lifecycle state. Starts at `PENDING`; moves to `CONFIRMED`, `CANCELLED`, or `COMPLETED`.

```prisma
review          Review?
```
- One-to-one optional relation. A review can only be created after the booking reaches `COMPLETED` status — enforced in API logic, not the schema.

```prisma
messages        Message[]
```
- All the chat messages exchanged between the owner and sitter for this booking.

---

### `model Message` (lines 203–218)

A single chat message tied to a booking. Messages are delivered in real-time via Socket.io; on initial page load they're fetched via `GET /api/messages/:bookingId`.

```prisma
bookingId String
booking   Booking  @relation(fields: [bookingId], references: [id])
```
- FK to `Booking`. Every message belongs to exactly one booking conversation.

```prisma
senderId  String
sender    User     @relation("MessagesSent", fields: [senderId], references: [id])
```
- FK to `User`. Identifies who sent this message. The `@relation("MessagesSent")` name matches the `messagesSent` field on `User`.

```prisma
text      String
```
- The message content. Required — you can't send a blank message.

```prisma
createdAt DateTime @default(now())
```
- Timestamp of when the message was sent. There is **no `updatedAt`** field — messages are immutable once sent.

---

### `model Review` (lines 223–244)

A review written by a pet owner after a completed stay. One review per booking, enforced at the database level.

```prisma
bookingId       String        @unique
booking         Booking       @relation(fields: [bookingId], references: [id])
```
- `@unique` on `bookingId` enforces the **one review per booking** rule at the database level. Even if someone tried to insert a second review for the same booking, the database would reject it.

```prisma
authorId        String
author          User          @relation("ReviewsWritten", fields: [authorId], references: [id])
```
- FK to `User`. The pet owner who wrote this review.

```prisma
sitterProfileId String
sitterProfile   SitterProfile @relation(fields: [sitterProfileId], references: [id])
```
- FK to `SitterProfile`. The sitter being reviewed. Stored directly (not just via the booking) so you can efficiently query all reviews for a given sitter profile.

```prisma
rating          Int
```
- The star rating, 1–5. Stored as an integer. Range validation (must be 1–5) is enforced in the API layer, not the schema.

```prisma
text            String?
```
- An optional written comment. Owners can leave a star rating without writing a review.

```prisma
createdAt       DateTime @default(now())
```
- No `updatedAt` — reviews are immutable once submitted.

---

### `model AvailabilityBlock` (lines 249–259)

Represents a date range a sitter has manually marked as unavailable (vacation, personal days, etc.). Used alongside confirmed bookings to show owners when a sitter is busy.

```prisma
sitterProfileId String
sitterProfile   SitterProfile @relation(fields: [sitterProfileId], references: [id], onDelete: Cascade)
```
- FK to `SitterProfile`.
- `onDelete: Cascade` — if the `SitterProfile` row is deleted, all of its `AvailabilityBlock` rows are **automatically deleted** by the database. Without this, deleting a sitter profile would fail because orphaned blocks would still reference it.

```prisma
startDate       DateTime
endDate         DateTime
```
- The start and end of the blocked date range. The booking system checks both these blocks and existing `CONFIRMED` bookings when determining a sitter's availability.

```prisma
createdAt       DateTime      @default(now())
```
- Timestamp of when the block was created. No `updatedAt` — blocks are replaced rather than edited.

---

## Relation Summary

| Relation | Type | Description |
|---|---|---|
| User → Pet | One-to-many | One user owns many pets |
| User → SitterProfile | One-to-one | One user has at most one sitter listing |
| User → Booking (owner) | One-to-many | One user makes many bookings as an owner |
| User → Message | One-to-many | One user sends many messages |
| User → Review | One-to-many | One user writes many reviews |
| SitterProfile → Booking | One-to-many | One sitter receives many bookings |
| SitterProfile → Review | One-to-many | One sitter has many reviews |
| SitterProfile → AvailabilityBlock | One-to-many | One sitter has many blocked date ranges |
| Booking → Message | One-to-many | One booking has many chat messages |
| Booking → Review | One-to-one | One booking has at most one review |
| Pet → Booking | One-to-many | One pet appears in many bookings |

---

## Key Conventions Used Throughout

- **`@id @default(cuid())`** — Every table uses a cuid string as its primary key instead of an integer. Cuids are safe to expose in URLs and are hard to guess.
- **`?` suffix** — Marks a field as optional (nullable in the database).
- **Foreign key pattern** — Every relation uses two fields: a `xxxId String` (the actual FK column) and a `xxx Model @relation(...)` (a virtual Prisma field for traversal). Only the `xxxId` exists as a column in the database.
- **`@relation("Name")`** — Named relations are used when a model has more than one relation to the same other model (e.g. `User` appears in `Booking` as both `owner` and implicitly via `SitterProfile`). The name links each pair unambiguously.
- **`createdAt / updatedAt`** — Present on most models. Never set manually — Prisma handles them automatically.
