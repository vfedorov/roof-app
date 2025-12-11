import {defineConfig, globalIgnores} from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    plugins: {
      prettier: prettierPlugin
    },
    rules: {
      ...prettierConfig.rules,
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      indent: "off",
      quotes: ["error", "double"],
      semi: ["error", "always"],
      "linebreak-style": ["error", "unix"],
      "prettier/prettier": [
        "error",
        {
          tabWidth: 4,
          singleQuote: false,
          semi: true,
          trailingComma: "all",
          endOfLine: "lf"
        }
      ]
    }
  }
]);
