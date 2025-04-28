/**
 * Internal dependencies
 */
import storageService from './storage/index'; // Assuming storageService path
import { updateApiKeyDisplay, showMessage, type DOMElementCache } from './ui';

/**
 * Retrieves the current API key from storage.
 * @returns {Promise<string | null>} The API key string or null if not found.
 */
export function getApiKey(): Promise<string | null> {
	return storageService.getApiKey();
}

/**
 * Initializes the API key status and updates the UI accordingly.
 * @param {DOMElementCache} elements - Cached DOM elements.
 * @returns {Promise<boolean>} True if an API key exists, false otherwise.
 */
export async function initializeApiKeyStatus(
	elements: DOMElementCache
): Promise<boolean> {
	const apiKey = await getApiKey();
	console.log('initializeApiKeyStatus: Found key?', !!apiKey);
	updateApiKeyDisplay(apiKey, elements);
	return !!apiKey;
}

/**
 * Handles the click event for the Save/Update API key button.
 * @param {DOMElementCache} elements - Cached DOM elements.
 * @returns {Promise<boolean>} True if the key was saved/updated and it was the first save, false otherwise.
 */
export async function handleSaveOrUpdateClick(
	elements: DOMElementCache
): Promise<boolean> {
	if (!elements.apiKeyInput || !elements.saveUpdateApiKeyBtn) {
		return false;
	}

	const apiKeyToSave = elements.apiKeyInput.value.trim();
	const isFirstSave = elements.saveUpdateApiKeyBtn.textContent === 'Save';

	if (apiKeyToSave) {
		await storageService.saveApiKey(apiKeyToSave);
		showMessage('API key saved successfully!', elements);
		updateApiKeyDisplay(apiKeyToSave, elements);
		return isFirstSave;
	} else {
		showMessage('Please enter an API key.', elements, 'error');
		return false;
	}
}

/**
 * Handles the click event for the Clear API key button.
 * @param {DOMElementCache} elements - Cached DOM elements.
 */
export function handleClearClick(elements: DOMElementCache): void {
	if (!elements.apiKeyInput) {
		return;
	}

	elements.apiKeyInput.value = '';
	storageService.deleteApiKey();
	showMessage('API key cleared.', elements);
	updateApiKeyDisplay(null, elements);
}

/**
 * Handles the input event for the API key field to enable/disable the save button.
 * @param {DOMElementCache} elements - Cached DOM elements.
 */
export function handleApiKeyInput(elements: DOMElementCache): void {
	if (elements.apiKeyInput && elements.saveUpdateApiKeyBtn) {
		// Enable button only if input is not empty
		elements.saveUpdateApiKeyBtn.disabled =
			elements.apiKeyInput.value.trim() === '';
	}
}

export {};
