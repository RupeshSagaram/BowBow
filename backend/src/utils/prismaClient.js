// prismaClient.js — A singleton (single shared instance) of the Prisma database client.
//
// Why a singleton?
// PrismaClient opens a connection pool to the database.
// If you create a new PrismaClient() in every file that needs it,
// you'd open dozens of connection pools simultaneously and hit Neon's free-tier limit.
// By creating it ONCE here and importing it everywhere, you share one connection.

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = prisma;
