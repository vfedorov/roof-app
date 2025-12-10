import {defineConfig, globalIgnores} from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
    ...nextVitals,
    ...nextTs,

    globalIgnores([
        ".next/**",
        "out/**",
        "build/**",
        "next-env.d.ts",
    ]),

    {
        files: ["**/*.{ts,tsx,js,jsx}"],
        rules: {
            indent: ["error", 4],
            "@typescript-eslint/indent": ["error", 4],
            "linebreak-style": ["error", "unix"],
            quotes: ["error", "double"],
            semi: ["error", "always"],
            "prettier/prettier": [
                "error",
                {
                    tabWidth: 4,
                    singleQuote: false,
                    semi: true,
                    trailingComma: "all",
                    endOfLine: "lf",
                }
            ]
        }
    }
]);
