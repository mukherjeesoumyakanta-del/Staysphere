import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { createApp } from "./app.js";
import { loadEnvironment, getConfig } from "./config/env.js";

loadEnvironment();
const config = getConfig();
try {
  await connectDatabase(config);
} catch (error) {
  console.error(
    "Database/auth startup failed. Check MONGO_URI, JWT_SECRET, and Atlas network access.",
    { name: error.name },
  );
  await disconnectDatabase();
  process.exit(1);
}
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
  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));
