/**
 * ESLint configuration for WooCommerce (JS/TS without React/JSX)
 * Requires installing the dependencies:
 * - eslint (core)
 * - @wordpress/eslint-plugin (WordPress rules)
 * - @typescript-eslint/eslint-plugin and @typescript-eslint/parser (TypeScript rules)
 * - eslint-plugin-jsdoc (JSDoc rules)
 * - eslint-plugin-prettier and prettier (Prettier formatting rules)
 */
module.exports = {
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaVersion: 2021, // Supports the latest features of ES2021
		sourceType: 'module', // Allows using imports/exports (ES modules)
		// If using TypeScript with a project, could add: project: './tsconfig.json'
	},
	extends: [
		'eslint:recommended', // Recommended base rules from ESLint
		'plugin:@typescript-eslint/recommended', // Recommended rules for TypeScript
		'plugin:jsdoc/recommended', // Added to load recommended JSDoc rules
		'plugin:prettier/recommended', // Integrates Prettier (IMPORTANT: should be last)
		// Optional: 'plugin:@wordpress/eslint-plugin/recommended' if using a lot of WP code
	],
	env: {
		browser: true, // Browser environment (window, document, etc.)
		es2021: true, // ES2021 environment (ES12)
		node: true, // Allows Node variables (require, module, etc.)
		jquery: true, // jQuery environment (defines $ and jQuery as globals)
	},
	plugins: [
		'@wordpress', // WordPress rules plugin
		'@typescript-eslint', // TypeScript rules plugin
		'jsdoc', // JSDoc rules plugin
		'prettier', // Prettier formatting rules plugin
	],
	rules: {
		// **Possible errors (ESLint recommendations)**
		'no-cond-assign': ['error', 'always'], // Prohibits assignments in conditionals
		'no-console': ['warn', { allow: ['warn', 'error'] }], // Avoids console.log (only allows console.warn/error)
		'no-debugger': 'error', // Prohibits the use of debugger
		'no-alert': 'warn', // Discourages the use of alert/confirm/prompt
		'no-constant-condition': ['warn', { checkLoops: false }], // Avoids constant conditions (except intentional loops)
		'no-dupe-else-if': 'error', // Prohibits duplicate else-if clauses
		'no-dupe-keys': 'error', // Prohibits duplicate keys in objects
		'no-duplicate-case': 'error', // Prohibits duplicate cases in switch
		'no-ex-assign': 'error', // Prohibits reassigning exceptions in catch
		'no-extra-boolean-cast': 'error', // Prohibits unnecessary boolean casts
		'no-extra-semi': 'off', // (Disabled - Prettier/TypeScript handles it)
		'no-func-assign': 'error', // Prohibits reassigning function declarations
		'no-invalid-regexp': 'error', // Prohibits invalid regular expressions
		'no-irregular-whitespace': 'error', // Prohibits invalid whitespace
		'no-obj-calls': 'error', // Prohibits calling global objects as functions (Math(), JSON(), etc.)
		'no-prototype-builtins': 'error', // Discourages direct use of prototype methods of Object
		'no-regex-spaces': 'error', // Prohibits multiple spaces in regular expressions
		'no-sparse-arrays': 'error', // Prohibits sparse arrays [1,,3]
		'no-template-curly-in-string': 'error', // Prohibits using ${} in normal strings instead of template strings
		'no-unexpected-multiline': 'error', // Avoids confusing multiline expression matches
		'no-unreachable': 'error', // Prohibits unreachable code after return/throw
		'no-unreachable-loop': 'error', // Prohibits loops that never terminate or cannot be reached
		'no-unsafe-finally': 'error', // Prohibits unsafe behaviors in finally
		'no-unsafe-negation': 'error', // Prohibits incorrect negations in relational expressions (e.g., `!a in b`)
		'use-isnan': 'error', // Requires using isNaN() to compare with NaN
		'valid-typeof': ['error', { requireStringLiterals: true }], // typeof only compared with valid strings

		// **Best practices**
		curly: 'error', // Requires { } in all blocks (if/loops even one-liners)
		eqeqeq: ['error', 'always'], // Requires === and !== instead of == or !=
		'no-caller': 'error', // Prohibits using arguments.caller or .callee
		'no-case-declarations': 'error', // Prohibits declaring variables in case without a block
		'no-empty': ['error', { allowEmptyCatch: true }], // Prohibits empty blocks (allows empty catch)
		'no-empty-pattern': 'error', // Prohibits empty destructuring patterns
		'no-eval': 'error', // Prohibits using eval()
		'no-implied-eval': 'error', // Prohibits methods equivalent to eval() (setTimeout string)
		'no-fallthrough': 'error', // Prohibits falling through from one case to the next without break
		'no-global-assign': 'error', // Prohibits assigning to native global variables
		'no-octal': 'error', // Prohibits octal literals `0123`
		'no-octal-escape': 'error', // Prohibits octal escape sequences in strings
		'no-return-await': 'error', // Discourages using `return await` inside async functions
		'no-self-assign': 'error', // Prohibits assigning a variable to itself
		'no-self-compare': 'error', // Prohibits comparing a variable to itself
		'no-sequences': 'error', // Prohibits the comma operator (sequence operator)
		'no-throw-literal': 'error', // Requires throwing only exceptions of type Error
		'no-useless-catch': 'error', // Prohibits redundant catch that only rethrows the error
		'no-useless-concat': 'error', // Prohibits unnecessary string concatenations
		'no-useless-return': 'error', // Prohibits unnecessary `return` at the end of a function
		'no-with': 'error', // Prohibits the use of `with`
		'prefer-promise-reject-errors': 'error', // Requires using Error when rejecting Promises (Promise.reject(new Error()))
		'require-await': 'error', // Prohibits async functions that do not use await
		yoda: ['error', 'never'], // Prohibits Yoda conditions (literal on the left in comparisons)

		// **Variables**
		'no-delete-var': 'error', // Prohibits deleting declared variables (only allow delete properties)
		'no-label-var': 'error', // Prohibits labels with the same name as variables
		'no-undef': 'error', // Prohibits the use of undefined variables (disabled in TypeScript, below)
		'no-undef-init': 'error', // Prohibits initializing variables to undefined (unnecessary)
		'no-unused-vars': 'off', // Disabled – uses the TypeScript rule below for JS/TS
		'no-use-before-define': 'off', // Disabled – uses the TypeScript rule below
		'no-shadow': 'off', // Disabled – uses the TypeScript rule below

		// **Node.js and CommonJS (not React, but for completeness)**
		'global-require': 'error', // Requires calls to require() only at the top of the file
		'no-buffer-constructor': 'error', // Prohibits using Buffer() constructor (deprecated)
		'no-new-require': 'error', // Prohibits creating objects via require (e.g., new require('foo'))
		'no-path-concat': 'error', // Prohibits concatenating __dirname + 'file', suggests path.join

		// **Code style – handled by Prettier**
		// (Prettier will handle formatting: indentation, quotes, commas, etc.)
		'prettier/prettier': [
			'error',
			{
				useTabs: true, // Use tabs instead of spaces
				tabWidth: 4, // Tab width equivalent to 4 spaces
				singleQuote: true, // Use single quotes for strings
				semi: true, // Use semicolon at the end of statements
				trailingComma: 'es5', // Trailing comma in multiline objects/arrays (es5)
				printWidth: 80, // Recommended maximum line length
				bracketSpacing: true, // Space inside object braces: { key: value }
			},
		], // **Requires plugin: eslint-plugin-prettier** (and having Prettier configured, e.g., @wordpress/prettier-config) // **WordPress specific rules (Automattic/Woo)**

		'@wordpress/dependency-group': 'error', // Requires correct formatting in dependency blocks (/* Dependencies: */)
		'@wordpress/i18n-ellipsis': 'error', // Avoids three dots `...` without ellipsis character in translatable texts
		'@wordpress/i18n-no-collapsible-whitespace': 'error', // Avoids collapsible spaces in translatable texts
		'@wordpress/i18n-no-placeholders-only': 'error', // Avoids translatable strings that only have placeholders
		'@wordpress/i18n-no-variables': 'error', // Requires text literals in translation functions (no loose variables)
		'@wordpress/i18n-text-domain': 'error', // Requires valid text domain in translation functions
		'@wordpress/i18n-translator-comments': 'error', // Requires translator comments before strings with placeholders
		'@wordpress/no-base-control-with-label-without-id': 'error', // Avoids using BaseControl (WP component) with label without id
		'@wordpress/no-unguarded-get-range-at': 'error', // Prohibits using Range.getRangeAt() without error checking
		'@wordpress/no-unsafe-wp-apis': 'error', // Prohibits unsafe use of WordPress APIs (e.g., some global functions)
		'@wordpress/no-unused-vars-before-return': 'error', // Avoids assigning variables that are never used before a return
		'@wordpress/no-wp-process-env': 'error', // Prohibits using process.env.* from WP (legacy)
		'@wordpress/valid-sprintf': 'error', // Requires correct use of sprintf (number of placeholders vs. arguments)
		// (To use these rules, it is necessary to install the package `@wordpress/eslint-plugin`)

		// **JSDoc rules** (comment and document functions correctly)
		'jsdoc/check-alignment': 'error', // Asterisks aligned in JSDoc comments
		'jsdoc/check-param-names': 'error', // The names of @param in JSDoc must match those in the function
		'jsdoc/check-tag-names': 'error', // Checks JSDoc tag names (e.g., @returns vs @return)
		'jsdoc/check-types': 'error', // Checks valid types in JSDoc
		'jsdoc/no-undefined-types': 'error', // Avoids referencing undefined types in JSDoc
		'jsdoc/require-param': 'error', // Requires documenting all function parameters in JSDoc
		'jsdoc/require-param-type': 'error', // Requires indicating the type of each @param
		'jsdoc/require-returns': 'error', // Requires documenting the output with @returns in public functions
		'jsdoc/require-returns-type': 'error', // Requires indicating the return type
		// (Requires installing `eslint-plugin-jsdoc` to enable these rules)

		// **Specific TypeScript rules** (supplementary to the previous ones)
		'@typescript-eslint/no-unused-vars': [
			'error',
			{ vars: 'all', args: 'after-used', ignoreRestSiblings: true },
		],
		'@typescript-eslint/no-use-before-define': [
			'error',
			{ functions: false, classes: true, variables: true },
		],
		'@typescript-eslint/no-shadow': 'error',
		// '@typescript-eslint/no-empty-function': 'error', // (covered by recommended)
		// '@typescript-eslint/no-var-requires': 'error', // (covered by recommended)
		// '@typescript-eslint/no-array-constructor': 'error', // (covered by recommended)
		// '@typescript-eslint/no-useless-constructor': 'error', // (covered by recommended)
		'@typescript-eslint/consistent-type-definitions': [
			'error',
			'interface',
		], // Prefers `interface` over `type` to define objects
		// '@typescript-eslint/explicit-module-boundary-types': 'error', // (covered by recommended)
		// '@typescript-eslint/ban-ts-comment': 'error', // (covered by recommended)
		// (Requires installing `@typescript-eslint/eslint-plugin` and `@typescript-eslint/parser` to use these rules)
	},
	overrides: [
		{
			files: ['*.ts'],
			rules: {
				// Disables ESLint rules that do not apply in TypeScript (handled by the compiler)
				'no-undef': 'off', // Type/interface references in TS might incorrectly be marked as undefined by no-undef
			},
		},
	],
};
