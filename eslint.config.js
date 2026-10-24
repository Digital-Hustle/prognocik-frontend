import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import eslintConfigPrettier from "eslint-config-prettier";
import eslintComments from "eslint-plugin-eslint-comments";
import importPlugin from "eslint-plugin-import";
import jsxA11y from "eslint-plugin-jsx-a11y";
import prettierPlugin from "eslint-plugin-prettier";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import { eslintBoundariesConfig } from "./eslint.boundaries.js";

export default [
	{
		ignores: ["node_modules/**", "public/**", "build/**", "dist/**", "**/*.d.ts", ".agents/**"],
	},
	// Клиентский код (React)
	{
		files: ["src/**/*.{ts,tsx}"],
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parser: tsParser,
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "module",
				project: "./tsconfig.app.json",
				tsconfigRootDir: import.meta.dirname,
			},
		},
		plugins: {
			"@typescript-eslint": tsPlugin,
			react: reactPlugin,
			"react-hooks": reactHooks,
			"jsx-a11y": jsxA11y,
			import: importPlugin,
			"eslint-comments": eslintComments,
			prettier: prettierPlugin,
		},
		settings: {
			react: {
				version: "detect",
			},
			"import/resolver": {
				typescript: {
					project: "./tsconfig.app.json",
					alwaysTryTypes: true,
				},
			},
		},
		rules: {
			"prettier/prettier": "error",
			...eslintConfigPrettier.rules,

			"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
			"@typescript-eslint/consistent-type-imports": "error",

			"react/prop-types": "off",
			"react/jsx-uses-react": "off",
			"react/react-in-jsx-scope": "off",
			"react-hooks/rules-of-hooks": "error",
			"react-hooks/exhaustive-deps": "warn",

			"import/order": [
				"error",
				{
					groups: [["builtin", "external", "internal"]],
					pathGroups: [
						{
							pattern: "@/**",
							group: "internal",
							position: "after",
						},
					],
					"newlines-between": "never",
					alphabetize: {
						order: "asc",
						caseInsensitive: true,
					},
				},
			],
		},
	},
	eslintBoundariesConfig,
];
