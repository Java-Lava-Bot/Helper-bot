// eslint.config.js
import eslint from "@eslint/js";
import globals from "globals";

export default [
  eslint.configs.recommended,
  {
    ignores: ["dist/", "node_modules/"],
    languageOptions: {
      ecmaVersion: 2021,
      globals: {
        ...globals.node, // fixes console, setInterval, require, __dirname, etc.
        ...globals.es2021,
      },
    },
    rules: {
      // Downgrade unused vars to a warning, ignore _-prefixed params
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],

      // Downgrade style issues to warnings, not hard failures
      "no-empty": "warn",
      "no-unused-expressions": "warn",
    },
  },
];
