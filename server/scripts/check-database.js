import { loadEnvironment, getConfig } from "../src/config/env.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
try {
  loadEnvironment();
  await connectDatabase(getConfig());
  console.log(
    "PASS: MongoDB connected and the unique user email index is initialized.",
  );
} catch (error) {
  if (
    ["ENOTFOUND", "ECONNREFUSED", "ETIMEOUT", "ESERVFAIL"].includes(error.code)
  ) {
    console.error(
      "Database DNS resolution failed. Verify the Atlas Connect/Drivers URI and test SRV resolution on the machine running the backend. Use a DNS resolver with MongoDB SRV support, or obtain the standard TLS connection string from Atlas.",
    );
  } else if (error.code === 18) {
    console.error(
      "Atlas rejected authentication. Check the database user/password and percent-encode special characters in the connection string.",
    );
  } else if (
    [
      "MongooseServerSelectionError",
      "MongoServerSelectionError",
      "MongoNetworkError",
    ].includes(error.name)
  ) {
    console.error(
      "Cannot reach Atlas. Verify that the cluster is running, Atlas Network Access permits the backend outbound IPs, and outbound TLS connections on port 27017 are allowed.",
    );
  } else {
    console.error(
      "Database configuration check failed. Verify MONGO_URI, a JWT_SECRET of at least 32 characters, and CLIENT_URL.",
    );
  }
  // Never print connection strings, passwords, tokens, or raw driver errors.
  console.error("Safe diagnostic:", {
    name: error.name,
    code: error.code ?? null,
  });
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
