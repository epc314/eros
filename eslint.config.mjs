import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  { rules: { "react-hooks/set-state-in-effect": "off" } },
  globalIgnores([
    ".next/**", ".vinext/**", "dist/**", "node_modules/**", "coverage/**",
    "playwright-report/**", "test-results/**", "services/flux2/.venv/**",
    "services/flux2/output/**", "next-env.d.ts",
  ]),
]);
