import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettier from "eslint-config-prettier";

export default [
  {
    ignores: ["dist/**", "node_modules/**"]
  },
  js.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
      },
      globals: {
        chrome: "readonly",
        document: "readonly",
        fetch: "readonly",
        getComputedStyle: "readonly",
        MutationObserver: "readonly",
        performance: "readonly",
        PerformanceObserver: "readonly",
        PerformanceEntry: "readonly",
        PerformanceEntryList: "readonly",
        setTimeout: "readonly",
        window: "readonly",
        Element: "readonly",
        HTMLElement: "readonly",
        Document: "readonly"
      }
    },
    plugins: {
      "@typescript-eslint": tseslint
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      "no-undef": "off",
      "function-paren-newline": "off",
      "function-call-argument-newline": "off",
      "@typescript-eslint/no-explicit-any": "off"
    }
  },
  {
    files: ["**/*.d.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off"
    }
  },
  {
    files: ["vite.config.ts"],
    languageOptions: {
      globals: {
        __dirname: "readonly"
      }
    }
  },
  prettier
];
