/**
 * Internal dependencies
 */
import type { PandaJobAnalyzerApp } from './app'; // Use 'app' assuming PandaJobAnalyzerApp is exported there
import type { DOMElementCache } from './ui';
import * as ui from './ui';
import * as apiKeyManager from './apiKeyManager';
import * as resumeManager from './resumeManager';

/**
 * Initializes all event listeners for the application.
 * @param {PandaJobAnalyzerApp} app The main application instance.
 * @param {DOMElementCache} elements The cached DOM elements.
 */
export function initializeEventHandlers(
	app: PandaJobAnalyzerApp,
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

	// Resume file input
	if (elements.resumeFile) {
		elements.resumeFile.addEventListener('change', (event) => {
			const target = event.target as HTMLInputElement;
			const file = target.files?.[0];
			if (file) {
				resumeManager.handleFileSelection(file, elements);
			}
		});
	}

	// File upload zone click
	if (elements.fileUploadZone && elements.resumeFile) {
		elements.fileUploadZone.addEventListener('click', () => {
			elements.resumeFile?.click();
		});

		// Drag and drop functionality
		elements.fileUploadZone.addEventListener('dragover', (event) => {
			event.preventDefault();
			elements.fileUploadZone?.classList.add('drag-over');
		});

		elements.fileUploadZone.addEventListener('dragleave', () => {
			elements.fileUploadZone?.classList.remove('drag-over');
		});

		elements.fileUploadZone.addEventListener('drop', (event) => {
			event.preventDefault();
			elements.fileUploadZone?.classList.remove('drag-over');

			const files = event.dataTransfer?.files;
			const file = files?.[0];
			if (file) {
				resumeManager.handleFileSelection(file, elements);
			}
		});
	}

	// Remove file button
	if (elements.removeFile) {
		elements.removeFile.addEventListener('click', () => {
			resumeManager.handleRemoveFile(elements);
		});
	}

	// Upload resume button
	if (elements.uploadResumeBtn && elements.resumeFile) {
		elements.uploadResumeBtn.addEventListener('click', async () => {
			const file = elements.resumeFile?.files?.[0];
			if (file) {
				await resumeManager.handleResumeUpload(file, elements);
			}
		});
	}

	// Delete resume button
	if (elements.deleteResumeBtn) {
		elements.deleteResumeBtn.addEventListener('click', async () => {
			if (confirm('Are you sure you want to delete your resume data?')) {
				await resumeManager.handleResumeDelete(elements);
			}
		});
	}

	// Resume info text click to show JSON
	if (elements.resumeInfoText) {
		elements.resumeInfoText.addEventListener('click', async () => {
			await resumeManager.showResumeJson(elements);
		});
	}

	// Close JSON viewer button
	if (elements.closeJsonViewer) {
		elements.closeJsonViewer.addEventListener('click', () => {
			resumeManager.hideResumeJson(elements);
		});
	}

	// Update resume button
	if (elements.updateResumeBtn) {
		elements.updateResumeBtn.addEventListener('click', async () => {
			await resumeManager.handleResumeUpdate(elements);
		});
	}

	// JSON textarea input for real-time validation
	if (elements.resumeJsonTextarea) {
		elements.resumeJsonTextarea.addEventListener('input', () => {
			resumeManager.validateJson(elements);
		});
	}
}
