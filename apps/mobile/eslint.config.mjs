import { defineConfig, globalIgnores } from "eslint/config";
import expo from "eslint-config-expo/flat.js";
import stylistic from "@stylistic/eslint-plugin";
import checkFile from "eslint-plugin-check-file";

const testFiles = ["**/__tests__/**", "**/test-support/**"];
const reactNativeImportRestrictions = {
  patterns: [
    {
      group: ["react-native/**"],
      message: "Import from the public react-native API.",
    },
  ],
};
const sharedTransportMessage = "Use the shared API transport.";

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
    files: ["**/*.{js,cjs,mjs,jsx,ts,tsx}"],
    plugins: { "@stylistic": stylistic },
    rules: {
      curly: ["error", "all"],
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "no-case-declarations": "error",
      "no-fallthrough": "error",
      "no-else-return": "error",
      "no-unneeded-ternary": "error",
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
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/ban-ts-comment": "error",
      "@typescript-eslint/naming-convention": [
        "error",
        { selector: "typeLike", format: ["PascalCase"] },
      ],
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/only-throw-error": "error",
    },
  },
  {
    files: ["src/**/*.{js,cjs,mjs,jsx,ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", reactNativeImportRestrictions],
    },
  },
  {
    files: ["src/shared/**/*.{js,cjs,mjs,jsx,ts,tsx}"],
    ignores: testFiles,
    rules: {
      "import/no-restricted-paths": [
        "error",
        {
          basePath: import.meta.dirname,
          zones: [{ target: "./src/shared", from: "./src/features" }],
        },
      ],
    },
  },
  {
    files: ["src/{app,features}/**/*.{js,cjs,mjs,jsx,ts,tsx}"],
    ignores: testFiles,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          ...reactNativeImportRestrictions,
          paths: [{ name: "expo/fetch", message: sharedTransportMessage }],
        },
      ],
      "no-restricted-globals": [
        "error",
        {
          globals: [{ name: "fetch", message: sharedTransportMessage }],
          checkGlobalObject: true,
          globalObjects: ["global"],
        },
      ],
    },
  },
  {
    files: ["src/**/*.{js,cjs,mjs,jsx,ts,tsx}"],
    ignores: ["src/app/**/{_layout,+*,\\[*\\]}.*"],
    plugins: { "check-file": checkFile },
    rules: {
      "check-file/filename-naming-convention": [
        "error",
        { "**/*": "KEBAB_CASE" },
        { ignoreMiddleExtensions: true },
      ],
    },
  },
]);
