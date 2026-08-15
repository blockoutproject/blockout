const { defineConfig, globalIgnores } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const reactNativePlugin = require("eslint-plugin-react-native");

module.exports = defineConfig([
  globalIgnores(["dist/**", "src/shared/generated/**"]),
  expoConfig,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: {
      "react-native": reactNativePlugin,
    },
    rules: {
      "react/jsx-no-leaked-render": [
        "error",
        { validStrategies: ["coerce", "ternary"] },
      ],
      "react/display-name": "warn",
      "react-native/no-color-literals": "error",
    },
  },
  {
    files: ["src/shared/theme/tokens.ts"],
    rules: {
      "react-native/no-color-literals": "off",
    },
  },
  {
    files: ["**/__tests__/**/*.{ts,tsx}", "**/*.{test,spec}.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);
