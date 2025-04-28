/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node', // Use 'jsdom' if testing DOM manipulation
	roots: ['<rootDir>/test'], // Look for tests in the test directory
	testMatch: [
		'**/__tests__/**/*.+(ts|tsx|js)',
		'**/?(*.)+(spec|test).+(ts|tsx|js)',
	],
	transform: {
		'^.+\.(ts|tsx)$?': [
			'ts-jest',
			{
				/* ts-jest config options here */
			},
		],
	},
	// If mocking chrome APIs becomes necessary:
	// setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
};
