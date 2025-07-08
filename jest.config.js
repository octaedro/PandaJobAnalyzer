/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'jsdom',
	roots: ['<rootDir>/src'],
	testMatch: ['**/__tests__/**/*.test.ts'],
	collectCoverageFrom: [
		'src/**/*.ts',
		'!src/**/*.d.ts',
		'!src/**/__tests__/**',
		'!src/content.ts' // Exclude content script from coverage as it's browser-specific
	],
	setupFilesAfterEnv: ['<rootDir>/src/js/__tests__/setup.ts'],
	transform: {
		'^.+\\.ts$': 'ts-jest'
	},
	moduleFileExtensions: ['ts', 'js', 'json'],
	verbose: true,
	coverageReporters: ['text', 'lcov', 'html'],
	coverageDirectory: 'coverage',
	collectCoverage: true,
	coverageThreshold: {
		global: {
			branches: 70,
			functions: 70,
			lines: 70,
			statements: 70
		}
	}
};
