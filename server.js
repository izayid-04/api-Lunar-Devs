// Entry point for Passenger/Hodifly: starts the compiled Nest app.
// Passenger runs `node server.js` and expects the process to bind
// to process.env.PORT itself (handled in dist/main.js).
await import('./dist/main.js');
