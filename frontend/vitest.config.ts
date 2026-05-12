import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    /** Só testes Vitest em `tests/`; `e2e/*.spec.ts` é Playwright (`npm run test:e2e`). */
    include: ["tests/**/*.ts"],
    exclude: ["e2e/**", "node_modules/**"],
    environment: "node",
    fileParallelism: false,
    globals: false,
    hookTimeout: 60_000,
    testTimeout: 60_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
