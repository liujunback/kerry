import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Test reports:
    "playwright-report/**",
    "test-results/**",
  ]),
  // Allow require() in .js files (CommonJS scripts)
  {
    files: ["**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Downgrade no-explicit-any to warning (large codebase, gradual migration)
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  // Enforce unified date handling entry point
  {
    files: ["**/*.ts", "**/*.tsx"],
    ignores: ["**/date-formatter.ts"], // 排除 date-formatter.ts 本身
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "date-fns",
              message: "请从 @/lib/utils/date-formatter 导入日期函数，以确保使用全局时区配置。",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
