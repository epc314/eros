import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test/e2e",
  timeout: 45_000,
  fullyParallel: false,
  retries: 0,
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure" },
  webServer: {
    command: "DATABASE_URL=file:./e2e.db tsx scripts/ensure-sqlite.ts && DATABASE_URL=file:./e2e.db prisma migrate reset --force --skip-seed && IMAGE_PROVIDER=mock DATABASE_URL=file:./e2e.db npm run db:seed && IMAGE_PROVIDER=mock DATABASE_URL=file:./e2e.db npm run dev -- --port 3100",
    port: 3100,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
