import { createApp } from "./app.js";
import { loadEnvironment, getConfig } from "./config/env.js";

loadEnvironment();
const config = getConfig();
const app = createApp(config);
const server = app.listen(config.port, "0.0.0.0", () =>
  console.log(`StaySphere API listening on port ${config.port}`),
);
server.on("error", (error) => {
  console.error("API startup failed", { code: error.code });
  process.exitCode = 1;
});
function shutdown(signal) {
  console.log(`Received ${signal}; closing HTTP server`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}
process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));
