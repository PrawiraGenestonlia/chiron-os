import { defineConfig } from "drizzle-kit";
import { join } from "node:path";
import { homedir } from "node:os";

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./src/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: join(homedir(), ".chiron", "chiron.db"),
  },
});
