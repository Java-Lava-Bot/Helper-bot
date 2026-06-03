// eslint.config.js
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["dist/", "node_modules/"],
    languageOptions: {
      ecmaVersion: 2021,
      globals: {
        ...globals.node,   // fixes console, setInterval, require, __dirname, etc.
        ...globals.es2021,
      },
    },
    rules: {
      // Your project uses CommonJS require() — turn this off
      "@typescript-eslint/no-require-imports": "off",

      // Downgrade unused vars to a warning, ignore _-prefixed params
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      }],
      "no-unused-vars": "off", // use the TS version above instead

      // Downgrade style issues to warnings, not hard failures
      "no-empty": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
    },
  }
);