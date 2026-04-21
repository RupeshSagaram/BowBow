// prismaClient.js — A singleton (single shared instance) of the Prisma database client.
//
// Why a singleton?
// PrismaClient opens a connection pool to the database.
// If you create a new PrismaClient() in every file that needs it,
// you'd open dozens of connection pools simultaneously and hit Neon's free-tier limit.
// By creating it ONCE here and importing it everywhere, you share one connection.

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Neon free-tier suspends compute after 5 minutes of inactivity, causing the next
// Prisma query to hang until the DB wakes up (can exceed client-side timeouts).
// Pinging every 4 minutes keeps the connection alive during active server sessions.
const keepAlive = setInterval(async () => {
  try {
    await prisma.$executeRaw`SELECT 1`;
  } catch {
    // ignore — server may be shutting down
  }
}, 4 * 60 * 1000);

// Don't let this interval prevent the Node process from exiting cleanly
keepAlive.unref();

module.exports = prisma;
