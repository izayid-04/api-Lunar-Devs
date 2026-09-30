// Entry point for Passenger/Hodifly.
//
// Passenger's node-loader.js starts the app with require(), and require()
// cannot load an ES module that uses top-level await (dist/main.js does,
// via `await bootstrap()` in src/main.ts) — it throws
// ERR_REQUIRE_ASYNC_MODULE. This file must stay CommonJS (.cjs, no
// top-level await) so Passenger can require() it; it then uses dynamic
// import(), which — unlike require() — can load an ESM module with
// top-level await without issue.
//
// See docs/DEPLOIEMENT.md, section "Piège Passenger + ESM".
import('./dist/main.js').catch((err) => {
  console.error('Failed to start the application:', err);
  process.exit(1);
});
