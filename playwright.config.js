import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "@playwright/test";

function loadDotEnvFile(filePath) {
  const env = globalThis.process?.env;
  if (!env || !fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || env[key] !== undefined) {
      continue;
    }

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }
}

const configDir = path.dirname(fileURLToPath(import.meta.url));
loadDotEnvFile(path.join(configDir, ".env.local"));

const browserCacheDir = path.join(os.tmpdir(), "playwright-browsers-controlbet");
if (globalThis.process?.env && !globalThis.process.env.PLAYWRIGHT_BROWSERS_PATH) {
  globalThis.process.env.PLAYWRIGHT_BROWSERS_PATH = browserCacheDir;
}

const baseURL = globalThis.process?.env?.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:5173";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  timeout: 120000,
  expect: {
    timeout: 15000,
  },
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5173",
    reuseExistingServer: true,
    timeout: 120000,
    url: baseURL,
  },
});
