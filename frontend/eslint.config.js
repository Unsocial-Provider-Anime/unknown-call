import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import pluginQuery from "@tanstack/eslint-plugin-query";
import pluginRouter from "@tanstack/eslint-plugin-router";
import eslintConfigPrettier from "eslint-config-prettier/flat";

import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      ...pluginQuery.configs["flat/recommended"],
      ...pluginRouter.configs["flat/recommended"],
      eslintConfigPrettier,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // This config is for the routes folder, which is where the router plugin is used
    // turn off the react-refresh rule for routes related files,
    // but the rest of the rules including react-refresh rules are still applied to other files
    files: ["src/routes/**/*"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
]);
