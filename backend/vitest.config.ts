import path from "path";
import dotenv from "dotenv";
import { defineConfig } from "vitest/config";

dotenv.config({ path: path.resolve(__dirname, ".env") });

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
