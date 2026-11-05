import { defineConfig, globalIgnores } from "eslint/config";
import expo from "eslint-config-expo/flat.js";
import stylistic from "@stylistic/eslint-plugin";

export default defineConfig([
  globalIgnores([
    "dist/**",
    ".expo/**",
    ".generated/**",
    "android/**",
    "ios/**",
  ]),
  expo,
  {
    files: ["**/*.{js,cjs,mjs,ts,tsx}"],
    plugins: { "@stylistic": stylistic },
    rules: {
      curly: ["error", "all"],
      "@stylistic/lines-between-class-members": [
        "error",
        {
          enforce: [
            { blankLine: "always", prev: "method", next: "*" },
            { blankLine: "always", prev: "*", next: "method" },
          ],
        },
      ],
      "@stylistic/padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "import", next: "*" },
        { blankLine: "any", prev: "import", next: "import" },
        {
          blankLine: "always",
          prev: "*",
          next: ["function", "class", "export"],
        },
        {
          blankLine: "always",
          prev: ["function", "class", "export"],
          next: "*",
        },
      ],
    },
  },
]);
