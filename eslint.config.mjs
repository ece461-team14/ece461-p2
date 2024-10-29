// eslint.config.mjs
// Description: Configures ESLint for TypeScript and JavaScript files with support for browser 
//              and Node.js environments, using recommended ESLint and TypeScript rules.
// Date: October 29, 2024
// Dependencies: globals, @eslint/js, @typescript-eslint/parser, @typescript-eslint/eslint-plugin
// Contributors: (add contributors)

import globals from "globals";
import pluginJs from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default {
  files: ["**/*.{cjs,ts}"],
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
  ignores: ["**/dist/"]
};