import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "app",
    environment: "jsdom",
    include: ["test/**/*.test.{ts,tsx}"],
    setupFiles: ["test/setup.ts"],
  },
});
