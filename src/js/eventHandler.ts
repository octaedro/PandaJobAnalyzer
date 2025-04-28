/**
 * Event Handler Module
 * Sets up all event listeners for the JobScope popup.
 */
/**
 * Internal dependencies
 */
import type { JobScopeApp } from './app'; // Use 'app' assuming JobScopeApp is exported there
import type { DOMElementCache } from './ui';
import * as ui from './ui';
import * as apiKeyManager from './apiKeyManager';

/**
 * Initializes all event listeners for the application.
 * @param {JobScopeApp} app The main application instance.
 * @param {DOMElementCache} elements The cached DOM elements.
 */
export function initializeEventHandlers(
	app: JobScopeApp,
	elements: DOMElementCache
): void {
	// Settings Icon
	if (elements.settingsIcon) {
		elements.settingsIcon.addEventListener('click', async () => {
			const isVisible = ui.toggleElementVisibility(
				elements.settingsPanel
			);
			if (isVisible === true) {
				// Settings Opened: Hide results/parse sections
				ui.hideElement(elements.resultsSection);
				ui.hideElement(elements.parseJobSection);
			} else if (isVisible === false) {
				// Settings Closed: Re-check saved results to show the correct section
				await app.checkSavedResults(); // Assuming checkSavedResults is still on app
			}
		});
	}

	// Settings Tabs
	if (elements.settingsTabBtns && elements.settingsTabContents) {
		elements.settingsTabBtns.forEach((button) => {
			button.addEventListener('click', (event) => {
				ui.handleTabClick(
					event as MouseEvent,
					elements.settingsTabBtns,
					elements.settingsTabContents
				);
			});
		});
	}

	// API Key Input
	if (elements.apiKeyInput) {
		elements.apiKeyInput.addEventListener('input', () => {
			apiKeyManager.handleApiKeyInput(elements);
		});
	}

	// Save/Update API Key Button
	if (elements.saveUpdateApiKeyBtn) {
		elements.saveUpdateApiKeyBtn.addEventListener('click', async () => {
			const wasFirstSave =
				await apiKeyManager.handleSaveOrUpdateClick(elements);
			// If it was the first save, hide settings and determine whether to show parse button or results
			if (wasFirstSave) {
				ui.hideElement(elements.settingsPanel);
				// Re-check results to show the appropriate section
				try {
					await app.getCurrentTabUrl(); // Ensure URL is fresh
					await app.checkSavedResults();
				} catch (e) {
					console.error(
						'Error checking results after first API key save:',
						e
					);
					ui.showElement(elements.parseJobSection); // Fallback to parse button on error
				}
			}
		});
	}

	// Clear API Key Button
	if (elements.clearApiKeyBtn) {
		elements.clearApiKeyBtn.addEventListener('click', () => {
			apiKeyManager.handleClearClick(elements);
		});
	}

	// Main Result Tabs
	if (elements.tabButtons && elements.tabContents) {
		elements.tabButtons.forEach((button) => {
			button.addEventListener('click', (event) =>
				ui.handleTabClick(
					event as MouseEvent,
					elements.tabButtons,
					elements.tabContents
				)
			);
		});
	}

	// Parse job button
	if (elements.parseJobBtn) {
		elements.parseJobBtn.addEventListener('click', () =>
			app.handleParseJob(false)
		);
	}

	// Retry button
	if (elements.retryBtn) {
		elements.retryBtn.addEventListener('click', () =>
			app.handleParseJob(true)
		);
	}
}
