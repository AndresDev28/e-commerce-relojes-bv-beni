module.exports = {
  extends: [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
    "plugin:storybook/recommended"
  ],
  plugins: ["@typescript-eslint", "prettier"],
  rules: {
    // Prettier config
    "prettier/prettier": [
      "error",
      {
        semi: false,
        singleQuote: true,
        trailingComma: "es5",
        tabWidth: 2,
        printWidth: 80,
        bracketSpacing: true,
        arrowParens: "avoid"
      }
    ],
    
    // Modern JavaScript/TypeScript rules
    "semi": ["error", "never"],
    "quotes": ["error", "single"],
    "comma-dangle": ["error", "only-multiline"],
    
    // TypeScript specific
    "@typescript-eslint/no-extra-semi": "error",
    "@typescript-eslint/member-delimiter-style": [
      "error",
      {
        multiline: {
          delimiter: "none",
          requireLast: false
        },
        singleline: {
          delimiter: "comma",
          requireLast: false
        }
      }
    ],
    
    // React best practices
    "react/jsx-quotes": ["error", "prefer-double"],
    "react-hooks/exhaustive-deps": "warn",
    
    // General code quality
    "no-console": "warn",
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "prefer-const": "error",
    "no-var": "error"
  }
}