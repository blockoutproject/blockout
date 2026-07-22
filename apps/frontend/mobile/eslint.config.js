const { defineConfig, globalIgnores } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  globalIgnores(["dist/**", "src/shared/generated/**"]),
  expoConfig,
  {
    rules: {
      "react/jsx-no-leaked-render": [
        "error",
        { validStrategies: ["coerce", "ternary"] },
      ],
      "react/display-name": "warn",
    },
  },
  {
    files: ["**/__tests__/**/*.{ts,tsx}", "**/*.{test,spec}.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);
