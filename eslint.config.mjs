import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "next-env.d.ts",
  ]),
  {
    files: ["app/page.tsx"],
    rules: {
      // The client intentionally initializes browser-only preferences, URL state,
      // and remote data from effects after hydration.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
