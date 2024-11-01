import globals from "globals";
import pluginJs from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default {
  files: ["**/*.{cjs,ts,tsx,js}"], // added support for .tsx and .js for React
  languageOptions: {
    globals: { ...globals.browser, ...globals.node },
    parser: tsParser,
    ecmaVersion: 2020,
    sourceType: "module",
  },
  plugins: {
    "@typescript-eslint": tsPlugin,
  },
  rules: {
    ...pluginJs.configs.recommended.rules,
    ...tsPlugin.configs.recommended.rules,
  },
  ignores: ["**/dist/", "client/build/"] // Ignore both server and client build directories
};