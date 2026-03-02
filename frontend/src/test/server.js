import { setupServer } from 'msw/node';

// Bare server — individual test files add handlers with server.use(...)
export const server = setupServer();
