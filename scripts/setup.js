#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

// ── Colors ───────────────────────────────────────────────
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

function run(cmd) {
  try {
    execSync(cmd, { cwd: ROOT, stdio: "inherit" });
  } catch {
    console.error(red(`\nCommand failed: ${cmd}`));
    process.exit(1);
  }
}

// ── Check Node version ───────────────────────────────────
const [major] = process.versions.node.split(".").map(Number);
if (major < 20) {
  console.error(red(`Node.js >= 20 is required (found ${process.version}).`));
  process.exit(1);
}

console.log(bold("\n>_ Chiron OS Setup\n"));

// ── Database ─────────────────────────────────────────────
console.log(cyan("1/3") + " Pushing database schema...");
run("pnpm db:push");

console.log(cyan("2/3") + " Seeding default personas...");
run("pnpm db:seed");

// ── Config file ──────────────────────────────────────────
const configPath = join(ROOT, "chiron.config.json");
if (!existsSync(configPath)) {
  console.log(cyan("3/3") + " Creating template config...");
  writeFileSync(
    configPath,
    JSON.stringify({ defaultModel: "claude-opus-4-6" }, null, 2) + "\n",
    "utf-8"
  );
  console.log(dim(`     Created ${configPath}`));
} else {
  console.log(cyan("3/3") + " Config file already exists " + dim("(skipped)"));
}

// ── Done ─────────────────────────────────────────────────
console.log(green("\nSetup complete!\n"));
console.log(bold("Next steps:\n"));
console.log(`  ${yellow("1.")} Configure your API key (pick one):`);
console.log(dim(`     echo '{ "apiKey": "sk-ant-..." }' > chiron.config.json`));
console.log(dim(`     export ANTHROPIC_API_KEY="sk-ant-..."`));
console.log(dim(`     (or install Claude Code for automatic auth)\n`));
console.log(`  ${yellow("2.")} Start the dev server:`);
console.log(dim(`     pnpm dev\n`));
console.log(`  ${yellow("3.")} Open ${cyan("http://localhost:4173")} in your browser\n`);
