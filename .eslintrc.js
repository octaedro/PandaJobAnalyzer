/**
 * ESLint configuration for Chrome Extension (TypeScript)
 * Clean configuration without WordPress dependencies
 */
module.exports = {
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaVersion: 2021,
		sourceType: 'module',
	},
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:jsdoc/recommended',
		'plugin:prettier/recommended',
	],
	env: {
		browser: true,
		es2021: true,
		webextensions: true, // Chrome extension APIs
	},
	plugins: [
		'@typescript-eslint',
		'jsdoc',
		'prettier',
	],
	rules: {
		// Basic rules
		'no-console': ['warn', { allow: ['warn', 'error'] }],
		'no-debugger': 'error',
		'no-alert': 'warn',
		'prefer-const': 'error',
		'no-var': 'error',
		
		// Code quality
		'eqeqeq': ['error', 'always'],
		'curly': 'error',
		'no-eval': 'error',
		'no-implied-eval': 'error',
		'prefer-promise-reject-errors': 'error',
		'require-await': 'error',
		
		// TypeScript specific
		'@typescript-eslint/no-unused-vars': [
			'error',
			{ vars: 'all', args: 'after-used', ignoreRestSiblings: true },
		],
		'@typescript-eslint/no-explicit-any': 'error',
		'@typescript-eslint/explicit-function-return-type': 'off',
		'@typescript-eslint/explicit-module-boundary-types': 'off',
		
		// JSDoc rules
		'jsdoc/require-param': 'error',
		'jsdoc/require-param-type': 'error',
		'jsdoc/require-param-description': 'warn',
		'jsdoc/require-returns': 'error',
		'jsdoc/require-returns-type': 'error',
		
		// Prettier formatting
		'prettier/prettier': [
			'error',
			{
				useTabs: true,
				tabWidth: 4,
				singleQuote: true,
				semi: true,
				trailingComma: 'es5',
				printWidth: 80,
				bracketSpacing: true,
			},
		],
	},
	overrides: [
		{
			files: ['*.ts'],
			rules: {
				'no-undef': 'off', // TypeScript handles this
			},
		},
	],
};