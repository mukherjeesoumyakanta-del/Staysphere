#!/usr/bin/env node
/**
 * StaySphere Unified Development Runner.
 * Starts both Express API server (port 5000) and Vite frontend (port 5173)
 * concurrently using native Node.js child_process without third-party dependencies.
 */

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const serverDir = path.join(rootDir, "server");

const isWin = process.platform === "win32";
const npmCmd = isWin ? "npm.cmd" : "npm";
const npxCmd = isWin ? "npx.cmd" : "npx";

console.log("\x1b[36m%s\x1b[0m", "╔═══════════════════════════════════════════════╗");
console.log("\x1b[36m%s\x1b[0m", "║           StaySphere Development Server       ║");
console.log("\x1b[36m%s\x1b[0m", "║  [API]  http://127.0.0.1:5000                 ║");
console.log("\x1b[36m%s\x1b[0m", "║  [WEB]  http://localhost:5173                 ║");
console.log("\x1b[36m%s\x1b[0m", "╚═══════════════════════════════════════════════╝");

// 1. Spawn Backend API Server
const serverProc = isWin
  ? spawn("cmd.exe", ["/c", "npm", "run", "dev"], {
      cwd: serverDir,
      stdio: "inherit",
      env: { ...process.env, NODE_ENV: "development", PORT: "5000" },
    })
  : spawn("npm", ["run", "dev"], {
      cwd: serverDir,
      stdio: "inherit",
      env: { ...process.env, NODE_ENV: "development", PORT: "5000" },
    });

// 2. Spawn Vite Frontend
const clientProc = isWin
  ? spawn("cmd.exe", ["/c", "npx", "vite", "--host", "0.0.0.0"], {
      cwd: rootDir,
      stdio: "inherit",
      env: { ...process.env },
    })
  : spawn("npx", ["vite", "--host", "0.0.0.0"], {
      cwd: rootDir,
      stdio: "inherit",
      env: { ...process.env },
    });

function cleanup() {
  console.log("\n\x1b[33m%s\x1b[0m", "Shutting down StaySphere services...");
  try {
    if (isWin) {
      if (serverProc.pid) spawn("taskkill", ["/pid", serverProc.pid.toString(), "/f", "/t"]);
      if (clientProc.pid) spawn("taskkill", ["/pid", clientProc.pid.toString(), "/f", "/t"]);
    } else {
      serverProc.kill("SIGINT");
      clientProc.kill("SIGINT");
    }
  } catch {}
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

serverProc.on("exit", (code) => {
  if (code && code !== 0) {
    console.error(`\x1b[31m[API Server exited with code ${code}]\x1b[0m`);
  }
});

clientProc.on("exit", (code) => {
  if (code && code !== 0) {
    console.error(`\x1b[31m[Vite Frontend exited with code ${code}]\x1b[0m`);
  }
});
