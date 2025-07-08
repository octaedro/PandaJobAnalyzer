/**
 * Jest setup file for Chrome extension tests
 */

// Mock Chrome APIs
const mockChrome = {
	tabs: {
		query: jest.fn(),
		sendMessage: jest.fn(),
	},
	scripting: {
		executeScript: jest.fn(),
	},
	storage: {
		sync: {
			get: jest.fn(),
			set: jest.fn(),
			remove: jest.fn(),
			clear: jest.fn(),
		},
		local: {
			get: jest.fn(),
			set: jest.fn(),
			remove: jest.fn(),
			clear: jest.fn(),
		},
	},
	runtime: {
		lastError: undefined as chrome.runtime.LastError | undefined,
		getURL: jest.fn(),
		id: 'test-extension-id',
	},
};

// Set up global chrome object
Object.defineProperty(global, 'chrome', {
	value: mockChrome,
	writable: true,
});

// Mock fetch globally
global.fetch = jest.fn();

// Mock TextEncoder and TextDecoder for encryption tests
global.TextEncoder = class TextEncoder {
	encode(input: string): Uint8Array {
		return new Uint8Array(Buffer.from(input, 'utf-8'));
	}
} as any;

global.TextDecoder = class TextDecoder {
	decode(input: Uint8Array): string {
		return Buffer.from(input).toString('utf-8');
	}
} as any;

// Mock Web Crypto API
Object.defineProperty(global, 'crypto', {
	value: {
		getRandomValues: jest.fn((arr: Uint8Array) => {
			for (let i = 0; i < arr.length; i++) {
				arr[i] = Math.floor(Math.random() * 256);
			}
			return arr;
		}),
		subtle: {
			generateKey: jest.fn().mockResolvedValue({}),
			encrypt: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
			decrypt: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
			importKey: jest.fn().mockResolvedValue({}),
			exportKey: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
		},
	},
	writable: true,
});

// Simple FileReader mock
Object.defineProperty(global, 'FileReader', {
	value: Object.assign(
		jest.fn().mockImplementation(() => ({
			result: null,
			onload: null,
			onerror: null,
			onabort: null,
			readyState: 0,
			readAsArrayBuffer: jest.fn(),
			readAsText: jest.fn(),
			abort: jest.fn(),
		})),
		{
			EMPTY: 0,
			LOADING: 1,
			DONE: 2,
		}
	),
	writable: true,
});

// Mock console methods to reduce noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Optionally suppress console output in tests
if (process.env.SUPPRESS_CONSOLE === 'true') {
	console.log = jest.fn();
	console.error = jest.fn();
	console.warn = jest.fn();
}

// Clean up after each test
afterEach(() => {
	jest.clearAllMocks();

	// Reset chrome.runtime.lastError
	if (global.chrome && global.chrome.runtime) {
		global.chrome.runtime.lastError = undefined;
	}
});

// Clean up after all tests
afterAll(() => {
	if (process.env.SUPPRESS_CONSOLE === 'true') {
		console.log = originalConsoleLog;
		console.error = originalConsoleError;
		console.warn = originalConsoleWarn;
	}
});

// Add jest-dom matchers (if using @testing-library/jest-dom)
// import '@testing-library/jest-dom';
