/**
 * Tests for apiKeyManager.ts
 */

// Mock the storageService module
/**
 * Internal dependencies
 */
import storageService from '../src/js/storage/index';
import * as apiKeyManager from '../src/js/apiKeyManager';
// Import ui module for showMessage check and types
import * as ui from '../src/js/ui';
import { type DOMElementCache, updateApiKeyDisplay } from '../src/js/ui';

// Create a manual mock for storageService
jest.mock('../src/js/storage/index', () => ({
	getApiKey: jest.fn(),
	saveApiKey: jest.fn(),
	deleteApiKey: jest.fn(),
	getResults: jest.fn(), // Mock other methods if needed
	saveResults: jest.fn(),
	deleteResults: jest.fn(),
}));

// Mock the ui module functions we need to check if they were called
jest.mock('../src/js/ui', () => ({
	// Need to keep original implementation for things we don't mock
	...jest.requireActual('../src/js/ui'),
	updateApiKeyDisplay: jest.fn(),
	showMessage: jest.fn(), // Mock showMessage to prevent alerts
}));

describe('apiKeyManager', () => {
	let mockElements: DOMElementCache;
	// Use mocked versions for assertions
	const mockedStorageService = storageService as jest.Mocked<
		typeof storageService
	>;
	const mockedUpdateApiKeyDisplay = updateApiKeyDisplay as jest.Mock;
	// We need the mocked version of showMessage from the ui mock
	const mockedShowMessage = ui.showMessage as jest.Mock;

	beforeEach(() => {
		// Reset mocks before each test
		jest.clearAllMocks();
		// Create fresh mock elements for each test
		// Requires testEnvironment: 'jsdom' in jest.config.js to use document
		// For now, we can create basic mocks
		mockElements = {
			settingsPanel: document.createElement('div'),
			loadingSpinner: document.createElement('div'),
			resultsSection: document.createElement('div'),
			parseJobSection: document.createElement('div'),
			apiKeyInput: document.createElement('input'),
			clearApiKeyBtn: document.createElement('button'),
			saveUpdateApiKeyBtn: document.createElement('button'),
			settingsIcon: document.createElement('div'),
			parseJobBtn: document.createElement('button'),
			retryBtn: document.createElement('button'),
			settingsTabBtns: document.querySelectorAll(
				'not-really-used-in-apiKeyManager'
			), // Mock NodeList
			settingsTabContents: document.querySelectorAll(
				'not-really-used-in-apiKeyManager'
			), // Mock NodeList
			tabButtons: document.querySelectorAll(
				'not-really-used-in-apiKeyManager'
			), // Mock NodeList
			tabContents: document.querySelectorAll(
				'not-really-used-in-apiKeyManager'
			), // Mock NodeList
			jobContentEl: document.createElement('div'),
			companyContentEl: document.createElement('div'),
			messageArea: document.createElement('div'),
		} as unknown as DOMElementCache;
	});

	describe('initializeApiKeyStatus', () => {
		it('should call getApiKey and updateApiKeyDisplay with null if no key exists', async () => {
			mockedStorageService.getApiKey.mockResolvedValue(null);

			const result =
				await apiKeyManager.initializeApiKeyStatus(mockElements);

			expect(mockedStorageService.getApiKey).toHaveBeenCalledTimes(1);
			expect(mockedUpdateApiKeyDisplay).toHaveBeenCalledTimes(1);
			expect(mockedUpdateApiKeyDisplay).toHaveBeenCalledWith(
				null,
				mockElements
			);
			expect(result).toBe(false);
		});

		it('should call getApiKey and updateApiKeyDisplay with the key if it exists', async () => {
			const testKey = 'test-api-key';
			mockedStorageService.getApiKey.mockResolvedValue(testKey);

			const result =
				await apiKeyManager.initializeApiKeyStatus(mockElements);

			expect(mockedStorageService.getApiKey).toHaveBeenCalledTimes(1);
			expect(mockedUpdateApiKeyDisplay).toHaveBeenCalledTimes(1);
			expect(mockedUpdateApiKeyDisplay).toHaveBeenCalledWith(
				testKey,
				mockElements
			);
			expect(result).toBe(true);
		});
	});

	describe('handleSaveOrUpdateClick', () => {
		it('should save the key and update display when input has value', async () => {
			const newKey = 'new-key';
			mockElements.apiKeyInput!.value = newKey;
			mockElements.saveUpdateApiKeyBtn!.textContent = 'Save';

			const result =
				await apiKeyManager.handleSaveOrUpdateClick(mockElements);

			expect(mockedStorageService.saveApiKey).toHaveBeenCalledTimes(1);
			expect(mockedStorageService.saveApiKey).toHaveBeenCalledWith(
				newKey
			);
			expect(mockedUpdateApiKeyDisplay).toHaveBeenCalledTimes(1);
			expect(mockedUpdateApiKeyDisplay).toHaveBeenCalledWith(
				newKey,
				mockElements
			);
			expect(result).toBe(true); // wasFirstSave is true
		});

		it('should not save and show message if input is empty', async () => {
			mockElements.apiKeyInput!.value = '   '; // Whitespace only

			const result =
				await apiKeyManager.handleSaveOrUpdateClick(mockElements);

			expect(mockedStorageService.saveApiKey).not.toHaveBeenCalled();
			expect(mockedUpdateApiKeyDisplay).not.toHaveBeenCalled();
			// Check the mocked showMessage from ui
			expect(mockedShowMessage).toHaveBeenCalledWith(
				'Please enter an API key.',
				mockElements,
				'error'
			);
			expect(result).toBe(false);
		});

		it('should return false for wasFirstSave if button text is Update', async () => {
			const existingKey = 'existing-key';
			mockElements.apiKeyInput!.value = existingKey;
			mockElements.saveUpdateApiKeyBtn!.textContent = 'Update'; // Indicate it's not the first save

			const result =
				await apiKeyManager.handleSaveOrUpdateClick(mockElements);

			expect(mockedStorageService.saveApiKey).toHaveBeenCalledWith(
				existingKey
			);
			expect(mockedUpdateApiKeyDisplay).toHaveBeenCalledWith(
				existingKey,
				mockElements
			);
			expect(result).toBe(false); // wasFirstSave is false
		});
	});

	describe('handleClearClick', () => {
		it('should clear input, call deleteApiKey, and update display', () => {
			mockElements.apiKeyInput!.value = 'some-key'; // Start with a value
			apiKeyManager.handleClearClick(mockElements);

			expect(mockElements.apiKeyInput!.value).toBe('');
			expect(mockedStorageService.deleteApiKey).toHaveBeenCalledTimes(1);
			// Check the mocked showMessage from ui
			expect(mockedShowMessage).toHaveBeenCalledWith(
				'API key cleared.',
				mockElements
			);
			expect(mockedUpdateApiKeyDisplay).toHaveBeenCalledTimes(1);
			expect(mockedUpdateApiKeyDisplay).toHaveBeenCalledWith(
				null,
				mockElements
			);
		});
	});

	describe('handleApiKeyInput', () => {
		it('should disable save button if input is empty or whitespace', () => {
			mockElements.apiKeyInput!.value = '  ';
			apiKeyManager.handleApiKeyInput(mockElements);
			expect(mockElements.saveUpdateApiKeyBtn!.disabled).toBe(true);

			mockElements.apiKeyInput!.value = '';
			apiKeyManager.handleApiKeyInput(mockElements);
			expect(mockElements.saveUpdateApiKeyBtn!.disabled).toBe(true);
		});

		it('should enable save button if input has non-whitespace characters', () => {
			mockElements.apiKeyInput!.value = ' a ';
			apiKeyManager.handleApiKeyInput(mockElements);
			expect(mockElements.saveUpdateApiKeyBtn!.disabled).toBe(false);
		});
	});
});
