require('dotenv').config();

const http       = require('http');
const app        = require('./app');
const { initIO } = require('./socket');

const PORT = process.env.PORT || 3001;

// Create an explicit http.Server so Socket.io can attach to it.
// app.listen() would create an anonymous server internally — we need the
// reference so we can pass it to initIO().
const httpServer = http.createServer(app);

// Attach Socket.io to the http server before listening so the WebSocket
// upgrade handler is registered in time.
initIO(httpServer);

httpServer.listen(PORT, () => {
  console.log(`BowBow backend running at http://localhost:${PORT}`);
});
