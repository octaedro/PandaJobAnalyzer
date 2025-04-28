/**
 * UI Module
 * Handles DOM manipulation, UI state updates, and rendering.
 */

// Define the structure of the elements object
export interface DOMElementCache {
	settingsPanel: HTMLElement | null;
	loadingSpinner: HTMLElement | null;
	resultsSection: HTMLElement | null;
	parseJobSection: HTMLElement | null;
	apiKeyInput: HTMLInputElement | null;
	clearApiKeyBtn: HTMLButtonElement | null;
	saveUpdateApiKeyBtn: HTMLButtonElement | null;
	settingsIcon: HTMLElement | null;
	parseJobBtn: HTMLButtonElement | null;
	retryBtn: HTMLButtonElement | null;
	settingsTabBtns: NodeListOf<HTMLElement>;
	settingsTabContents: NodeListOf<HTMLElement>;
	tabButtons: NodeListOf<HTMLElement>;
	tabContents: NodeListOf<HTMLElement>;
	jobContentEl: HTMLElement | null;
	companyContentEl: HTMLElement | null;
	messageArea: HTMLElement | null;
}

/**
 * Cache all DOM elements for better performance
 * @returns {DOMElementCache} An object containing cached DOM elements.
 */
export function cacheDOMElements(): DOMElementCache {
	return {
		settingsPanel: document.getElementById('settingsPanel'),
		loadingSpinner: document.getElementById('loadingSpinner'),
		resultsSection: document.getElementById('results'),
		parseJobSection: document.getElementById('parseJob'),
		apiKeyInput: document.getElementById('apiKey') as HTMLInputElement,
		clearApiKeyBtn: document.getElementById(
			'clearApiKey'
		) as HTMLButtonElement,
		saveUpdateApiKeyBtn: document.getElementById(
			'saveUpdateApiKeyBtn'
		) as HTMLButtonElement,
		settingsIcon: document.getElementById('settingsIcon'),
		parseJobBtn: document.querySelector(
			'#parseJob button'
		) as HTMLButtonElement,
		retryBtn: document.getElementById('retry') as HTMLButtonElement,
		settingsTabBtns: document.querySelectorAll('.settings-tab-btn'),
		settingsTabContents: document.querySelectorAll('.settings-tab-content'),
		tabButtons: document.querySelectorAll('.tab-btn'),
		tabContents: document.querySelectorAll('.tab-content'),
		jobContentEl: document.getElementById('jobContent'),
		companyContentEl: document.getElementById('companyContent'),
		messageArea: document.getElementById('messageArea'),
	};
}

/**
 * Shows an element by removing the 'hidden' class.
 * @param {HTMLElement | null} element - The element to show.
 */
export function showElement(element: HTMLElement | null): void {
	element?.classList.remove('hidden');
}

/**
 * Hides an element by adding the 'hidden' class.
 * @param {HTMLElement | null} element - The element to hide.
 */
export function hideElement(element: HTMLElement | null): void {
	element?.classList.add('hidden');
}

/**
 * Toggles the visibility of an element.
 * @param {HTMLElement | null} element - The element to toggle.
 * @param {boolean} [force] - If true, shows the element; if false, hides it.
 * @returns {boolean | undefined} The final visibility state (true if visible, false if hidden), or undefined if element is null.
 */
export function toggleElementVisibility(
	element: HTMLElement | null,
	force?: boolean
): boolean | undefined {
	if (!element) {
		return undefined;
	}
	const isHidden = element.classList.toggle(
		'hidden',
		force === undefined ? undefined : !force
	);
	return !isHidden; // Return true if visible, false if hidden
}

/**
 * Internal dependencies
 */
import type { AnalysisResult } from './api/openai'; // Import type for results

/**
 * Displays the analysis results in the UI tabs.
 * @param {unknown} resultsData - The analysis results object (needs type checking).
 * @param {DOMElementCache} elements - Cached DOM elements.
 */
export function renderResults(
	resultsData: unknown,
	elements: DOMElementCache
): void {
	console.log('Rendering results:', resultsData);

	if (typeof resultsData !== 'object' || resultsData === null) {
		console.error('renderResults called with invalid data');
		if (elements.jobContentEl) {
			elements.jobContentEl.innerHTML =
				'<p>Error: No valid results data found.</p>';
		}
		if (elements.companyContentEl) {
			elements.companyContentEl.innerHTML = '';
		}
		return;
	}

	const results = resultsData as AnalysisResult;

	if (elements.jobContentEl) {
		elements.jobContentEl.innerHTML = '';
	}
	if (elements.companyContentEl) {
		elements.companyContentEl.innerHTML = '';
	}

	let jobHtml = '';
	let companyHtml = '';
	let foundStructuredJobData = false;
	let foundStructuredCompanyData = false;

	// --- Populate Job Details ---
	if (results.jobLocation) {
		jobHtml += `<h4>Location:</h4><p>${Array.isArray(results.jobLocation) ? results.jobLocation.join(', ') : results.jobLocation}</p>`;
		foundStructuredJobData = true;
	}
	if (
		results.salaryRange &&
		(results.salaryRange.min || results.salaryRange.max)
	) {
		jobHtml += `<h4>Salary Range:</h4><p>${results.salaryRange.min || 'N/A'} - ${results.salaryRange.max || 'N/A'}</p>`;
		foundStructuredJobData = true;
	}
	if (
		results.requiredSkills &&
		Array.isArray(results.requiredSkills) &&
		results.requiredSkills.length > 0
	) {
		jobHtml += `<h4>Required Skills:</h4><ul>${results.requiredSkills.map((skill: string) => `<li>${skill}</li>`).join('')}</ul>`;
		foundStructuredJobData = true;
	}
	if (
		results.niceToHaveSkills &&
		Array.isArray(results.niceToHaveSkills) &&
		results.niceToHaveSkills.length > 0
	) {
		jobHtml += `<h4>Nice-to-Have Skills:</h4><ul>${results.niceToHaveSkills.map((skill: string) => `<li>${skill}</li>`).join('')}</ul>`;
		foundStructuredJobData = true;
	}

	// --- Populate Company Details ---
	if (results.companySummary) {
		companyHtml += `<h4>Summary:</h4><p>${results.companySummary}</p>`;
		foundStructuredCompanyData = true;
	}
	if (results.companyReviews) {
		companyHtml += `<h4>Reviews Summary:</h4><p>${results.companyReviews}</p>`;
		foundStructuredCompanyData = true;
	}

	// --- Render HTML ---
	if (elements.jobContentEl) {
		elements.jobContentEl.innerHTML = jobHtml;
	}
	if (elements.companyContentEl) {
		elements.companyContentEl.innerHTML = companyHtml;
	}

	// --- Fallback ---
	if (!foundStructuredJobData && elements.jobContentEl) {
		elements.jobContentEl.innerHTML = `<p>Could not extract structured job details. Raw analysis:</p><pre>${JSON.stringify(results, null, 2)}</pre>`;
	} else if (!foundStructuredCompanyData && elements.companyContentEl) {
		elements.companyContentEl.innerHTML = `<p>No specific company details extracted.</p>`;
	}

	showElement(elements.resultsSection);
}

/**
 * Toggles the loading state UI.
 * @param {boolean} isLoading - Whether the loading state should be active.
 * @param {DOMElementCache} elements - Cached DOM elements.
 */
export function toggleLoadingState(
	isLoading: boolean,
	elements: DOMElementCache
): void {
	// Always toggle the spinner based on isLoading
	toggleElementVisibility(elements.loadingSpinner, isLoading);

	if (isLoading) {
		// When loading starts, always hide Parse and Results sections
		hideElement(elements.parseJobSection);
		hideElement(elements.resultsSection);
	}
	// When loading stops (isLoading is false), ONLY hide the spinner.
	// The decision to show Parse or Results sections is handled elsewhere
	// (e.g., in checkSavedResults or handleParseJob success/error paths).
}

/**
 * Handles tab switching logic for a given set of buttons and content panes.
 * @param {MouseEvent} event - The click event.
 * @param {NodeList} tabButtons - The NodeList of tab buttons.
 * @param {NodeList} tabContents - The NodeList of tab content elements.
 */
export function handleTabClick(
	event: MouseEvent,
	tabButtons: NodeListOf<HTMLElement>,
	tabContents: NodeListOf<HTMLElement>
): void {
	const targetButton = event.currentTarget as HTMLElement;
	const tabData = targetButton.getAttribute('data-tab');
	if (!tabData) {
		return;
	}

	const targetContentId = tabData + 'Tab';

	tabButtons.forEach((btn) => btn.classList.remove('active'));
	targetButton.classList.add('active');

	tabContents.forEach((content) => {
		if (content.id === targetContentId) {
			content.classList.add('active');
			content.classList.remove('hidden'); // Ensure active tab is visible
		} else {
			content.classList.remove('active');
			content.classList.add('hidden'); // Hide inactive tabs
		}
	});
}

/**
 * Shows a message to the user in the dedicated message area.
 * @param {string} message - The message to display.
 * @param {DOMElementCache} elements - Cached DOM elements.
 * @param {'info' | 'error'} [type='info'] - The type of message ('info' or 'error').
 * @param {number} [timeout=3000] - Duration in ms to show the message (0 for permanent).
 */
let messageTimeoutId: number | null = null; // Store timeout ID

/**
 * Shows a message to the user in the dedicated message area.
 * @param {string} message - The message to display.
 * @param {DOMElementCache} elements - Cached DOM elements.
 * @param {'info' | 'error'} [type] - The type of message ('info' or 'error').
 * @param {number} [timeout] - Duration in ms to show the message (0 for permanent).
 */
export function showMessage(
	message: string,
	elements: DOMElementCache,
	type: 'info' | 'error' = 'info',
	timeout: number = 3000
): void {
	if (!elements.messageArea) {
		console[type === 'error' ? 'error' : 'log'](
			'Message (fallback alert): ',
			message
		);
		alert(message); // Fallback if message area not found
		return;
	}

	const msgArea = elements.messageArea;
	msgArea.textContent = message;
	msgArea.className = `message-area ${type}`; // Set class for styling
	showElement(msgArea); // Make it visible

	// Clear previous timeout if exists
	if (messageTimeoutId) {
		clearTimeout(messageTimeoutId);
		messageTimeoutId = null;
	}

	// Set timeout to hide the message
	if (timeout > 0) {
		messageTimeoutId = window.setTimeout(() => {
			hideElement(msgArea);
			messageTimeoutId = null;
		}, timeout);
	}
}

/**
 * Updates the display state of the API key input and related buttons.
 * @param {string | null} apiKey - The current API key (or null if none).
 * @param {DOMElementCache} elements - Cached DOM elements.
 */
export function updateApiKeyDisplay(
	apiKey: string | null,
	elements: DOMElementCache
): void {
	if (elements.apiKeyInput) {
		elements.apiKeyInput.value = apiKey || '';
	}
	if (elements.saveUpdateApiKeyBtn) {
		elements.saveUpdateApiKeyBtn.textContent = apiKey ? 'Update' : 'Save';
		// Disable button initially after load/update/clear, enable on input
		elements.saveUpdateApiKeyBtn.disabled = true;
	}
	if (elements.clearApiKeyBtn) {
		toggleElementVisibility(elements.clearApiKeyBtn, !!apiKey); // Show only if key exists
	}
}

export {}; // Temporary export
