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
	jobLocationEl: HTMLElement | null;
	requiredSkillsEl: HTMLElement | null;
	niceToHaveEl: HTMLElement | null;
	salaryRangeEl: HTMLElement | null;
	companySummaryEl: HTMLElement | null;
	companyReviewsEl: HTMLElement | null;
	messageArea: HTMLElement | null;
	// Resume elements
	resumeFile: HTMLInputElement | null;
	fileUploadZone: HTMLElement | null;
	fileSelectedInfo: HTMLElement | null;
	fileName: HTMLElement | null;
	fileSize: HTMLElement | null;
	removeFile: HTMLButtonElement | null;
	uploadResumeBtn: HTMLButtonElement | null;
	resumeUploaded: HTMLElement | null;
	deleteResumeBtn: HTMLButtonElement | null;
	resumeInfoText: HTMLElement | null;
	resumeJsonViewer: HTMLElement | null;
	resumeJsonTextarea: HTMLTextAreaElement | null;
	closeJsonViewer: HTMLButtonElement | null;
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
		jobLocationEl: document.getElementById('jobLocation'),
		requiredSkillsEl: document.getElementById('requiredSkills'),
		niceToHaveEl: document.getElementById('niceToHave'),
		salaryRangeEl: document.getElementById('salaryRange'),
		companySummaryEl: document.getElementById('companySummary'),
		companyReviewsEl: document.getElementById('companyReviews'),
		messageArea: document.getElementById('messageArea'),
		// Resume elements
		resumeFile: document.getElementById('resumeFile') as HTMLInputElement,
		fileUploadZone: document.getElementById('fileUploadZone'),
		fileSelectedInfo: document.getElementById('fileSelectedInfo'),
		fileName: document.getElementById('fileName'),
		fileSize: document.getElementById('fileSize'),
		removeFile: document.getElementById('removeFile') as HTMLButtonElement,
		uploadResumeBtn: document.getElementById(
			'uploadResumeBtn'
		) as HTMLButtonElement,
		resumeUploaded: document.getElementById('resumeUploaded'),
		deleteResumeBtn: document.getElementById(
			'deleteResumeBtn'
		) as HTMLButtonElement,
		resumeInfoText: document.getElementById('resumeInfoText'),
		resumeJsonViewer: document.getElementById('resumeJsonViewer'),
		resumeJsonTextarea: document.getElementById(
			'resumeJsonTextarea'
		) as HTMLTextAreaElement,
		closeJsonViewer: document.getElementById(
			'closeJsonViewer'
		) as HTMLButtonElement,
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
	if (typeof resultsData !== 'object' || resultsData === null) {
		console.error('renderResults called with invalid data');
		if (elements.jobLocationEl) {
			elements.jobLocationEl.textContent =
				'Error: No valid results data found.';
		}
		if (elements.requiredSkillsEl) {
			elements.requiredSkillsEl.innerHTML =
				'<li>Error: No valid results data found.</li>';
		}
		if (elements.niceToHaveEl) {
			elements.niceToHaveEl.innerHTML =
				'<li>Error: No valid results data found.</li>';
		}
		if (elements.salaryRangeEl) {
			elements.salaryRangeEl.textContent =
				'Error: No valid results data found.';
		}
		if (elements.companySummaryEl) {
			elements.companySummaryEl.textContent =
				'Error: No valid results data found.';
		}
		if (elements.companyReviewsEl) {
			elements.companyReviewsEl.textContent =
				'Error: No valid results data found.';
		}
		return;
	}

	const results = resultsData as AnalysisResult;

	// Clear previous content - important if re-rendering
	if (elements.jobLocationEl) {
		elements.jobLocationEl.textContent = 'Loading...';
	}
	if (elements.requiredSkillsEl) {
		elements.requiredSkillsEl.innerHTML = '<li>Loading...</li>';
	}
	if (elements.niceToHaveEl) {
		elements.niceToHaveEl.innerHTML = '<li>Loading...</li>';
	}
	if (elements.salaryRangeEl) {
		elements.salaryRangeEl.textContent = 'Loading...';
	}
	if (elements.companySummaryEl) {
		elements.companySummaryEl.textContent = 'Loading...';
	}
	if (elements.companyReviewsEl) {
		elements.companyReviewsEl.textContent = 'Loading...';
	}

	// --- Populate Job Details --- (Directly update elements)
	if (results.jobLocation && elements.jobLocationEl) {
		elements.jobLocationEl.textContent = Array.isArray(results.jobLocation)
			? results.jobLocation.join(', ')
			: results.jobLocation;
	} else if (elements.jobLocationEl) {
		elements.jobLocationEl.textContent = 'Not specified';
	}

	if (
		results.salaryRange &&
		(results.salaryRange.min || results.salaryRange.max) &&
		elements.salaryRangeEl
	) {
		elements.salaryRangeEl.textContent = `${results.salaryRange.min || 'N/A'} - ${results.salaryRange.max || 'N/A'}`;
	} else if (elements.salaryRangeEl) {
		elements.salaryRangeEl.textContent = 'Not specified in ad';
	}

	if (
		results.requiredSkills &&
		Array.isArray(results.requiredSkills) &&
		results.requiredSkills.length > 0 &&
		elements.requiredSkillsEl
	) {
		elements.requiredSkillsEl.innerHTML = results.requiredSkills
			.map((skill: string) => `<li>${skill}</li>`)
			.join('');
	} else if (elements.requiredSkillsEl) {
		elements.requiredSkillsEl.innerHTML = '<li>Not specified</li>';
	}

	if (
		results.niceToHaveSkills &&
		Array.isArray(results.niceToHaveSkills) &&
		results.niceToHaveSkills.length > 0 &&
		elements.niceToHaveEl
	) {
		elements.niceToHaveEl.innerHTML = results.niceToHaveSkills
			.map((skill: string) => `<li>${skill}</li>`)
			.join('');
	} else if (elements.niceToHaveEl) {
		elements.niceToHaveEl.innerHTML = '<li>Not specified</li>';
	}

	// --- Populate Company Details --- (Directly update elements)
	if (results.companySummary && elements.companySummaryEl) {
		elements.companySummaryEl.textContent = results.companySummary;
	} else if (elements.companySummaryEl) {
		elements.companySummaryEl.textContent = 'No summary available';
	}

	if (results.companyReviews && elements.companyReviewsEl) {
		elements.companyReviewsEl.textContent = results.companyReviews;
	} else if (elements.companyReviewsEl) {
		elements.companyReviewsEl.textContent = 'No reviews available';
	}

	// Ensure correct tab visibility after rendering results
	// This assumes 'jobTab' is the default active tab.
	elements.tabContents.forEach((contentPane) => {
		if (contentPane.id === 'jobTab') {
			contentPane.classList.add('active');
			contentPane.classList.remove('hidden');
			(contentPane as HTMLElement).style.display = 'block'; // Explicitly show
		} else {
			contentPane.classList.remove('active');
			contentPane.classList.add('hidden');
			(contentPane as HTMLElement).style.display = 'none'; // Explicitly hide
		}
	});
	// Activate the corresponding button as well
	elements.tabButtons.forEach((btn) => {
		if (btn.getAttribute('data-tab') === 'job') {
			btn.classList.add('active');
		} else {
			btn.classList.remove('active');
		}
	});

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

	const targetContentId = `${tabData}Tab`;

	tabButtons.forEach((btn) => {
		btn.classList.remove('active');
	});
	targetButton.classList.add('active');

	tabContents.forEach((content) => {
		const contentPane = content as HTMLElement;
		if (contentPane.id === targetContentId) {
			contentPane.classList.add('active');
			contentPane.classList.remove('hidden');
			contentPane.style.display = 'block';
		} else {
			contentPane.classList.remove('active');
			contentPane.classList.add('hidden');
			contentPane.style.display = 'none';
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
let messageTimeoutId: number | null = null; // Store timeout ID to clear if a new message comes quickly

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
		// Fallback if message area not found, but still log to console
		console[type === 'error' ? 'error' : 'log'](
			'Message (no UI area):',
			message
		);
		// Avoid alert if it's just an info message and no UI area is present
		if (type === 'error') {
			alert(message);
		}
		return;
	}

	const msgArea = elements.messageArea;
	msgArea.textContent = message;
	msgArea.className = `message-area ${type}`;
	showElement(msgArea);

	// Clear previous timeout if exists, so new messages don't get cut short
	if (messageTimeoutId) {
		clearTimeout(messageTimeoutId);
		messageTimeoutId = null;
	}

	// Set timeout to hide the message, unless timeout is 0 (permanent)
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
		// Disable button initially after load/update/clear; re-enabled on input by eventHandler
		elements.saveUpdateApiKeyBtn.disabled = true;
	}
	if (elements.clearApiKeyBtn) {
		// Show the clear button only if an API key exists
		toggleElementVisibility(elements.clearApiKeyBtn, !!apiKey);
	}
}

export {};
