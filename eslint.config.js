import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
{
    ignores: [
        "dist/",
        "node_modules/"
    ],
    languageOptions: {
      ecmaVersion: 2021,
      globals: {
            // Node.js globals
        process: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        require: "readonly",
        module: "readonly",
        exports: "writable",
        },
    },
}
);