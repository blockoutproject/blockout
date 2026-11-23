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
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          disallowTypeAnnotations: false,
          fixStyle: "inline-type-imports",
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
    },
  },
  {
    files: ["src/**/*.{js,cjs,mjs,jsx,ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react-native/**"],
              message: "Import from the public react-native API.",
            },
          ],
        },
      ],
    },
  },
]);
