# BowBow

A peer-to-peer pet care marketplace connecting owners with trusted local sitters.

BowBow lets pet owners find reliable sitters for boarding, daycare, walks, drop-in visits, and house sitting — and lets pet sitters build a business doing what they love. It's a two-sided marketplace with real-time messaging, a full booking workflow, and a review system, all in one place.

---

## Why BowBow Exists

Leaving a pet behind is stressful. Generic listing sites offer no booking flow, no communication layer, and no accountability after the fact. BowBow was built to solve the whole problem: find a sitter, confirm a booking, stay in touch, and leave a review — all without leaving the platform.

---

## Features

### For Pet Owners
- Create profiles for each of your pets (species, breed, age, weight, care notes)
- Browse and filter local sitters by city, service type, and max daily rate
- Send booking requests with live price calculation
- Message sitters in real time before and during a stay
- Leave star ratings and written reviews after every completed stay

### For Pet Sitters
- Publish a public listing with your offered services, nightly rate, and availability
- Accept or decline incoming booking requests
- Message pet owners directly within each booking
- Mark stays as complete to close out bookings

### For Admins
- Dashboard with platform-wide stats
- Manage users (view, ban/unban)
- Oversee all bookings and cancel problematic ones
- Moderate and delete reviews

### Real-Time
- WebSocket-powered messaging via Socket.io — messages appear instantly without refreshing

---

## How It Works

### As a Pet Owner

1. Sign up and complete onboarding
Create an account with Clerk and choose your role: Owner, Sitter, or Both. New users are prompted to complete onboarding before reaching their dashboard.

2. Add your pets
Go to My Pets and create a profile for each animal — name, species (dog, cat, bird, rabbit, etc.), breed, age, weight, and any special care notes.

3. Browse sitters
Head to Find a Sitter and filter by city, the service you need, and your budget. Each sitter card shows their name, rate, offered services, and city.

4. View a sitter's profile
Click any sitter to see their full public profile: their bio, all services they offer, years of experience, and reviews from previous owners.

5. Send a booking request
On the sitter's profile, select a pet, a service type, and start/end dates. The total price is calculated live. Add a message to introduce yourself, then submit the request.

6. Message your sitter
Go to Messages to chat with your sitter in real time. Each booking has its own message thread.

7. Leave a review
Once a stay is marked complete, go to My Bookings and leave a star rating (1–5) and optional written review for the sitter.

---

### As a Pet Sitter

1. Sign up and choose the Sitter role
Select Sitter (or Both) during onboarding to unlock the sitter-specific dashboard and listing setup.

2. Create your listing
Go to My Listing and configure your profile: which services you offer (boarding, daycare, walking, drop-in visits, house sitting), your nightly/daily rate, your city, and whether you're currently available.

3. Manage booking requests
Incoming requests appear in your dashboard under Pending Requests. Review each one — see the pet, service, dates, and owner's message — then confirm or decline.

4. Communicate with owners
Use Messages to coordinate details with pet owners before and during their stay.

5. Complete the stay
When the stay is done, mark the booking as complete from My Bookings. This triggers the review window for the owner.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 7, Tailwind CSS 4 |
| Routing | React Router v7 |
| Auth | Clerk |
| Real-time | Socket.io (client + server) |
| Backend | Node.js, Express v5 |
| ORM | Prisma v5 |
| Database | PostgreSQL |

---

## Data Model

| Model | Description |
|---|---|
| User | Platform account; role is OWNER, SITTER, or BOTH |
| Pet | Pet profile owned by a user (species, breed, age, weight, notes) |
| SitterProfile | Sitter's public listing (services, rate, city, availability) |
| Booking | A reservation linking an owner's pet to a sitter; status flows PENDING → CONFIRMED → COMPLETED/CANCELLED |
| Message | Chat message within a booking thread |
| Review | Post-stay rating (1–5 stars + text) linked to a booking; one per booking |

---

## Project Structure

```
BowBow/
├── frontend/
│   └── src/
│       ├── pages/          # 16 page components (HomePage, SearchPage, DashboardPage, etc.)
│       ├── components/     # Shared UI (Navbar, SitterCard, ProtectedRoute, etc.)
│       ├── hooks/          # Custom hooks (useBookings, usePets, useMessages, etc.)
│       └── services/       # API call utilities
└── backend/
    └── src/
        ├── routes/         # Express route definitions
        ├── controllers/    # Business logic per resource
        ├── middleware/     # Clerk auth + admin guards
        ├── socket/         # Socket.io setup and event handlers
        └── utils/          # Prisma client
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- A PostgreSQL database (local or hosted, e.g. [Neon](https://neon.tech))
- A [Clerk](https://clerk.com) account (free tier works)

### 1. Clone the repo

```bash
git clone <repo-url>
cd BowBow
```

### 2. Set up the backend

```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:

```env
DATABASE_URL=postgresql://...
CLERK_SECRET_KEY=sk_...
FRONTEND_URL=http://localhost:5173
PORT=3001
```

Run migrations and start the server:

```bash
npx prisma migrate dev
npm run dev
```

### 3. Set up the frontend

```bash
cd ../frontend
npm install
```

Create a `.env` file in `frontend/`:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_...
VITE_API_URL=http://localhost:3001
```

Start the dev server:

```bash
npm run dev
```

The app will be running at `http://localhost:5173`.
