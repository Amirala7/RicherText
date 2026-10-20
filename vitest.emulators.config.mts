import { defineConfig } from "vitest/config";

// Tests that need the Firebase emulators; run them with `pnpm test:emulators`.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/emulators/**/*.test.ts"],
    testTimeout: 15_000,
  },
});
