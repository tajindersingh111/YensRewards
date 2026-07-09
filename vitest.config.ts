import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["server/tests/**/*.test.ts"],
    env: {
      DATABASE_URL: "postgresql://postgres:Taj@2004@localhost:5433/yens_thai",
      SESSION_SECRET: "test_session_secret",
      JWT_SECRET: "test_jwt_secret",
      NODE_ENV: "test",
    },
  },
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "shared"),
      "@": path.resolve(__dirname, "server"),
    },
  },
});
