/**
 * JobScope - Main Application
 * Chrome extension for analyzing job listings using OpenAI
 */

/**
 * Internal dependencies
 */
import openAIService from '../js/api/openai';
import storageService from '../js/storage/index';
import type { AnalysisResult } from '../js/api/openai';

/**
 * Main application class
 */
class JobScopeApp {
	private currentUrl: string = '';
	private elements: ReturnType<typeof this.cacheDOMElements>;

	constructor() {
		// Cache DOM elements
		this.elements = this.cacheDOMElements();

		// Initialize UI renderer - COMMENTED OUT temporarily as elements structure changed
		// uiRenderer.init(this.elements);

		// Bind event handlers
		this.bindEventHandlers();
	}

	/**
	 * Initialize the application
	 */
	async initialize(): Promise<void> {
		try {
			// Load configuration (assuming this is needed)
			// await this.loadConfiguration();

			// Check if API key exists
			const hasApiKey = await this.checkApiKey();

			if (hasApiKey) {
				await this.getCurrentTabUrl();
				await this.checkSavedResults(); // This will now handle showing/hiding parseJobBtn/resultsSection
			} else {
				// No API Key: Hide results, hide parse button, SHOW settings focused on API tab
				console.log('No API Key found, showing settings panel.');
				if (this.elements.resultsSection) {
					this.elements.resultsSection.classList.add('hidden');
				}
				if (this.elements.parseJobSection) {
					this.elements.parseJobSection.classList.add('hidden');
				}
				if (this.elements.settingsPanel) {
					this.elements.settingsPanel.classList.remove('hidden');
				}

				// Ensure the API tab is active within settings
				this.elements.settingsTabBtns.forEach((btn) => {
					if (btn.getAttribute('data-tab') === 'api') {
						btn.classList.add('active');
					} else {
						btn.classList.remove('active');
					}
				});
				this.elements.settingsTabContents.forEach((content) => {
					if (content.id === 'apiTab') {
						content.classList.add('active');
					} else {
						content.classList.remove('active');
					}
				});
			}
		} catch (error) {
			console.error('Error initializing application:', error);
		}
	}

	/**
	 * Cache all DOM elements for better performance
	 * @returns {object} An object containing cached DOM elements.
	 */
	cacheDOMElements() {
		return {
			// Sections
			settingsPanel: document.getElementById(
				'settingsPanel'
			) as HTMLElement,
			loadingSpinner: document.getElementById(
				'loadingSpinner'
			) as HTMLElement,
			resultsSection: document.getElementById('results') as HTMLElement,
			parseJobSection: document.getElementById('parseJob') as HTMLElement,

			// Inputs and buttons
			apiKeyInput: document.getElementById('apiKey') as HTMLInputElement,
			clearApiKeyBtn: document.getElementById(
				'clearApiKey'
			) as HTMLButtonElement,
			saveUpdateApiKeyBtn: document.getElementById(
				'saveUpdateApiKeyBtn'
			) as HTMLButtonElement,
			settingsIcon: document.getElementById(
				'settingsIcon'
			) as HTMLElement,
			parseJobBtn: document.querySelector(
				'#parseJob button'
			) as HTMLButtonElement,
			retryBtn: document.getElementById('retry') as HTMLButtonElement,

			// Tabs (Settings)
			settingsTabBtns: document.querySelectorAll(
				'.settings-tab-btn'
			) as NodeListOf<HTMLElement>,
			settingsTabContents: document.querySelectorAll(
				'.settings-tab-content'
			) as NodeListOf<HTMLElement>,

			// Tabs (Main Results)
			tabButtons: document.querySelectorAll(
				'.tab-btn'
			) as NodeListOf<HTMLElement>,
			tabContents: document.querySelectorAll(
				'.tab-content'
			) as NodeListOf<HTMLElement>,

			// Result elements (Simplified)
			jobContentEl: document.getElementById('jobContent') as HTMLElement,
			companyContentEl: document.getElementById(
				'companyContent'
			) as HTMLElement,
		};
	}

	/**
	 * Bind all event handlers
	 */
	bindEventHandlers(): void {
		// Settings Icon
		if (this.elements.settingsIcon && this.elements.settingsPanel) {
			this.elements.settingsIcon.addEventListener('click', async () => {
				const isSettingsHidden =
					this.elements.settingsPanel.classList.toggle('hidden');

				if (!isSettingsHidden) {
					// Settings Opened: Hide results regardless of state
					if (this.elements.resultsSection) {
						this.elements.resultsSection.classList.add('hidden');
					}
					if (this.elements.parseJobSection) {
						this.elements.parseJobSection.classList.add('hidden');
					} // Also hide parse button
				} else {
					// Settings Closed: Re-check saved results to show the correct section
					await this.checkSavedResults();
				}
			});
		}

		// Settings Tabs
		this.elements.settingsTabBtns.forEach((button) => {
			button.addEventListener('click', () => {
				const tabData = button.getAttribute('data-tab');
				const targetContentId = tabData + 'Tab';

				this.elements.settingsTabBtns.forEach((btn) =>
					btn.classList.remove('active')
				);
				this.elements.settingsTabContents.forEach((content) =>
					content.classList.remove('active')
				); // Assuming 'active' controls visibility

				button.classList.add('active');
				const targetContent = document.getElementById(targetContentId);
				if (targetContent) {
					targetContent.classList.add('active');
				}
			});
		});

		// API Key Input - Listener to enable/disable Save/Update button
		if (this.elements.apiKeyInput && this.elements.saveUpdateApiKeyBtn) {
			this.elements.apiKeyInput.addEventListener('input', () => {
				// Enable button only if input is not empty
				this.elements.saveUpdateApiKeyBtn.disabled =
					this.elements.apiKeyInput.value.trim() === '';
			});
		}

		// Save/Update API Key Button
		if (
			this.elements.saveUpdateApiKeyBtn &&
			this.elements.apiKeyInput &&
			this.elements.clearApiKeyBtn
		) {
			this.elements.saveUpdateApiKeyBtn.addEventListener(
				'click',
				async () => {
					const apiKeyToSave = this.elements.apiKeyInput.value.trim();
					const isFirstSave =
						this.elements.saveUpdateApiKeyBtn.textContent ===
						'Save'; // Check if it was the first save

					if (apiKeyToSave) {
						await storageService.saveApiKey(apiKeyToSave);
						showMessage('API key saved successfully!');

						// Update button state
						this.elements.saveUpdateApiKeyBtn.textContent =
							'Update';
						this.elements.saveUpdateApiKeyBtn.disabled = true;

						// Show the clear button after saving
						if (this.elements.clearApiKeyBtn) {
							this.elements.clearApiKeyBtn.classList.remove(
								'hidden'
							);
						}

						// If it was the first save, hide settings and show parse button
						if (isFirstSave) {
							if (this.elements.settingsPanel) {
								this.elements.settingsPanel.classList.add(
									'hidden'
								);
							}
							if (this.elements.parseJobSection) {
								this.elements.parseJobSection.classList.remove(
									'hidden'
								);
							}
							if (this.elements.resultsSection) {
								this.elements.resultsSection.classList.add(
									'hidden'
								);
							} // Ensure results are hidden
							// Optionally get URL ready
							// try { await this.getCurrentTabUrl(); } catch(e) { console.error("Failed to get URL after first save"); }
						}
					} else {
						showMessage('Please enter an API key.');
					}
				}
			);
		}

		// Clear API Key Button
		if (
			this.elements.clearApiKeyBtn &&
			this.elements.apiKeyInput &&
			this.elements.saveUpdateApiKeyBtn
		) {
			this.elements.clearApiKeyBtn.addEventListener('click', () => {
				this.elements.apiKeyInput.value = '';
				storageService.deleteApiKey();
				showMessage('API key cleared.');

				// Update Save/Update button state
				this.elements.saveUpdateApiKeyBtn.textContent = 'Save';
				this.elements.saveUpdateApiKeyBtn.disabled = true;

				// Hide the clear button itself
				this.elements.clearApiKeyBtn.classList.add('hidden');
			});
		}

		// Main Result Tabs
		this.elements.tabButtons.forEach((button) => {
			button.addEventListener('click', (event) =>
				this.handleTabClick(event)
			);
		});

		// Parse job button
		if (this.elements.parseJobBtn) {
			this.elements.parseJobBtn.addEventListener('click', () =>
				this.handleParseJob(false)
			);
		}

		// Retry button
		if (this.elements.retryBtn) {
			this.elements.retryBtn.addEventListener('click', () =>
				this.handleParseJob(true)
			);
		}
	}

	/**
	 * Get the current tab URL
	 * @returns {Promise<string>} A promise resolving to the current tab's URL.
	 */
	getCurrentTabUrl(): Promise<string> {
		return new Promise((resolve, reject) => {
			chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
				if (chrome.runtime.lastError) {
					reject(chrome.runtime.lastError);
				} else if (tabs && tabs.length > 0) {
					this.currentUrl = tabs[0].url || '';
					console.log('Current URL:', this.currentUrl); // Log URL
					resolve(this.currentUrl);
				} else {
					reject(new Error('No active tab found'));
				}
			});
		});
	}

	/**
	 * Check API key from storage
	 * @returns {Promise<boolean>} A promise resolving to true if an API key exists, false otherwise.
	 */
	async checkApiKey(): Promise<boolean> {
		const apiKey = await storageService.getApiKey();
		console.log('checkApiKey: Found key?', !!apiKey);
		const saveButton = this.elements.saveUpdateApiKeyBtn;
		const clearButton = this.elements.clearApiKeyBtn;

		if (!apiKey && this.elements.apiKeyInput) {
			this.elements.apiKeyInput.value = '';
			if (saveButton) {
				saveButton.textContent = 'Save';
				saveButton.disabled = true;
			}
			// Hide clear button if no API key
			if (clearButton) {
				clearButton.classList.add('hidden');
			}
		} else if (apiKey && this.elements.apiKeyInput) {
			this.elements.apiKeyInput.value = apiKey;
			if (saveButton) {
				saveButton.textContent = 'Update';
				saveButton.disabled = true;
			}
			// Show clear button if API key exists
			if (clearButton) {
				clearButton.classList.remove('hidden');
			}
		}
		return !!apiKey;
	}

	/**
	 * Check for saved results for the current URL
	 * @returns {Promise<boolean>} A promise resolving to true if saved results were found and displayed, false otherwise.
	 */
	async checkSavedResults(): Promise<boolean> {
		if (!this.currentUrl) {
			console.log('checkSavedResults: No current URL');
			return false;
		}

		const results = await storageService.getResults(this.currentUrl);
		console.log('checkSavedResults: Found results in storage?', !!results);

		if (results) {
			this.displayResults(results); // Use internal display method
			if (this.elements.parseJobSection) {
				this.elements.parseJobSection.classList.add('hidden');
			}
			if (this.elements.resultsSection) {
				this.elements.resultsSection.classList.remove('hidden');
			}
			return true;
		} else {
			if (this.elements.parseJobSection) {
				this.elements.parseJobSection.classList.remove('hidden');
			}
			if (this.elements.resultsSection) {
				this.elements.resultsSection.classList.add('hidden');
			}
			return false;
		}
	}

	/**
	 * Handle tab click events for main results
	 * @param {MouseEvent} event - The mouse click event.
	 */
	handleTabClick(event: MouseEvent): void {
		const target = event.currentTarget as HTMLElement;
		const tabId = target.getAttribute('data-tab') + 'Tab'; // Assumes content ID is data-tab + "Tab"

		if (!tabId) {
			return;
		}

		this.elements.tabButtons.forEach((btn) =>
			btn.classList.remove('active')
		);
		target.classList.add('active');

		this.elements.tabContents.forEach((content) => {
			// Assuming tabContents have IDs like "jobTab", "companyTab"
			if (content.id === tabId) {
				content.classList.add('active'); // Use 'active' class like settings tabs
				content.classList.remove('hidden'); // Ensure visible if previously hidden
			} else {
				content.classList.remove('active');
				content.classList.add('hidden'); // Hide non-active tabs
			}
		});
	}

	/**
	 * Display results in the UI
	 * @param {unknown} resultsData - The analysis results object.
	 */
	displayResults(resultsData: unknown): void {
		console.log('Displaying results:', resultsData);

		// Type guard for resultsData
		if (typeof resultsData !== 'object' || resultsData === null) {
			// Handle null/undefined/non-object results
			console.error('displayResults called with invalid data');
			if (this.elements.jobContentEl) {
				this.elements.jobContentEl.innerHTML =
					'<p>Error: No valid results data found.</p>';
			}
			if (this.elements.companyContentEl) {
				this.elements.companyContentEl.innerHTML = '';
			} // Clear company tab too
			return;
		}

		// Cast to AnalysisResult after the type guard
		const results = resultsData as AnalysisResult;

		// Clear previous content
		if (this.elements.jobContentEl) {
			this.elements.jobContentEl.innerHTML = '';
		}
		if (this.elements.companyContentEl) {
			this.elements.companyContentEl.innerHTML = '';
		}

		let jobHtml = '';
		let companyHtml = '';
		let foundStructuredJobData = false;
		let foundStructuredCompanyData = false;

		// --- Populate Job Details (with type safety) ---
		if (results.jobLocation) {
			jobHtml += `<h4>Location:</h4><p>${Array.isArray(results.jobLocation) ? results.jobLocation.join(', ') : results.jobLocation}</p>`;
			foundStructuredJobData = true;
		}
		if (
			results.salaryRange && // Check if salaryRange exists and is not null
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
		// Add more job fields here if needed...

		// --- Populate Company Details (with type safety) ---
		if (results.companySummary) {
			companyHtml += `<h4>Summary:</h4><p>${results.companySummary}</p>`;
			foundStructuredCompanyData = true;
		}
		if (results.companyReviews) {
			// Assuming companyReviews is a summary string
			companyHtml += `<h4>Reviews Summary:</h4><p>${results.companyReviews}</p>`;
			foundStructuredCompanyData = true;
		}
		// Add more company fields here if needed...

		// --- Render HTML ---
		if (this.elements.jobContentEl) {
			this.elements.jobContentEl.innerHTML = jobHtml;
		}
		if (this.elements.companyContentEl) {
			this.elements.companyContentEl.innerHTML = companyHtml;
		}

		// --- Fallback for Job Tab ---
		if (!foundStructuredJobData && this.elements.jobContentEl) {
			this.elements.jobContentEl.innerHTML = `<p>Could not extract structured job details. Raw analysis:</p><pre>${JSON.stringify(results, null, 2)}</pre>`;
		}
		// Ensure Company Tab shows something if job tab has fallback
		else if (
			!foundStructuredCompanyData &&
			this.elements.companyContentEl
		) {
			this.elements.companyContentEl.innerHTML = `<p>No specific company details extracted.</p>`;
		}

		// Ensure results section is visible
		if (this.elements.resultsSection) {
			this.elements.resultsSection.classList.remove('hidden');
		}
	}

	/**
	 * Toggles the loading state UI
	 * @param {boolean} isLoading - Whether the loading state should be active.
	 */
	toggleLoadingState(isLoading: boolean): void {
		if (this.elements.loadingSpinner) {
			this.elements.loadingSpinner.classList.toggle('hidden', !isLoading);
		}
		// Hide/show other sections based on loading state
		if (this.elements.parseJobSection) {
			this.elements.parseJobSection.classList.toggle('hidden', isLoading);
		}
		if (this.elements.resultsSection) {
			this.elements.resultsSection.classList.toggle('hidden', isLoading);
		}
	}

	/**
	 * Handle parse job button click
	 * @param {boolean} forceRefresh - If true, force a refresh from OpenAI even if results exist
	 */
	async handleParseJob(forceRefresh = false): Promise<void> {
		const apiKey = await storageService.getApiKey();

		if (!apiKey) {
			showMessage(
				'Please add your OpenAI API key in the settings first.'
			);
			if (this.elements.settingsPanel) {
				this.elements.settingsPanel.classList.remove('hidden');
			} // Show settings
			return;
		}

		// Ensure URL is available
		if (!this.currentUrl) {
			try {
				await this.getCurrentTabUrl();
			} catch (error: unknown) {
				showMessage(
					'Could not get current tab URL. Please reload the page. ' +
						(error as Error).message
				);
				return;
			}
		}

		// If not forcing refresh, check for saved results first
		if (!forceRefresh) {
			const hasSavedResults = await storageService.getResults(
				this.currentUrl
			); // Check storage directly
			if (hasSavedResults) {
				console.log(
					'handleParseJob: Found saved results, displaying them.'
				);
				this.displayResults(hasSavedResults);
				if (this.elements.parseJobSection) {
					this.elements.parseJobSection.classList.add('hidden');
				}
				if (this.elements.resultsSection) {
					this.elements.resultsSection.classList.remove('hidden');
				}
				return; // Don't re-parse if we have results unless forced
			}
		}

		console.log('handleParseJob: Parsing job...');
		this.toggleLoadingState(true);

		try {
			const content = await this.getCurrentTabContent();
			console.log('handleParseJob: Got content, calling OpenAI...');
			const results = await openAIService.analyzeJobListing(
				content,
				apiKey
			);
			console.log('handleParseJob: OpenAI results received:', results);

			await storageService.saveResults(this.currentUrl, results);
			console.log('handleParseJob: Results saved.');

			this.displayResults(results);
			this.toggleLoadingState(false);
			if (this.elements.parseJobSection) {
				this.elements.parseJobSection.classList.add('hidden');
			} // Ensure parse button is hidden after success
		} catch (error: unknown) {
			console.error('Error during parsing:', error);
			// Check if error is an instance of Error before accessing message
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			showMessage(`Error analyzing job: ${errorMessage}`);
			this.toggleLoadingState(false);
			// Show parse button again on error?
			if (this.elements.parseJobSection) {
				this.elements.parseJobSection.classList.remove('hidden');
			}
		}
	}

	/**
	 * Injects content script if needed and gets content from the current tab.
	 * @returns {Promise<string>} A promise resolving to the job listing content from the current tab.
	 */
	getCurrentTabContent(): Promise<string> {
		// Remove async from promise executor
		return new Promise((resolve, reject) => {
			let activeTabId: number = -1; // Initialize to avoid potential error
			// Use async/await pattern inside the promise executor logic
			(async () => {
				try {
					// 1. Get Active Tab ID
					const tabs = await chrome.tabs.query({
						active: true,
						currentWindow: true,
					});
					if (tabs.length === 0 || !tabs[0].id) {
						return reject(
							new Error('No active tab found or tab has no ID.')
						);
					}
					activeTabId = tabs[0].id;
					console.log(
						`Attempting to get content from tab ${activeTabId}`
					);

					// 2. Inject content.js programmatically
					console.log(
						`Injecting content script into tab ${activeTabId}...`
					);
					await chrome.scripting.executeScript({
						target: { tabId: activeTabId },
						files: ['content.js'], // Path relative to extension root (dist)
					});
					console.log(
						`Content script injected successfully into tab ${activeTabId}.`
					);

					// 3. Send message to the now-injected script
					console.log(
						`Sending parseJob message to tab ${activeTabId}...`
					);
					const response = await chrome.tabs.sendMessage(
						activeTabId,
						{
							action: 'parseJob',
						}
					);

					// 4. Process response
					console.log(
						'Response received from content script:',
						response
					);
					if (response && response.success && response.data) {
						console.log('Content received successfully.');
						resolve(response.data);
					} else {
						console.error(
							'Invalid or unsuccessful response from content script:',
							response
						);
						reject(
							new Error(
								response?.error ||
									'Failed to get job content from page after injection.'
							)
						);
					}
				} catch {
					showMessage(
						'Could not get current tab URL. Please reload the page.'
					);
				}
			})().catch(reject); // Catch errors from the async IIFE and reject the promise
		});
	}

	/**
	 * Load configuration from config.json
	 */
	async loadConfiguration(): Promise<void> {
		try {
			const response = await fetch('config.json');
			const config = await response.json();
			openAIService.setConfig(config);
		} catch (error) {
			console.error('Error loading configuration:', error);
			// Default config will be used by openAIService
		}
	}
}

// --- Global Helper ---
/**
 *
 * @param {string} message - The message to display.
 */
function showMessage(message: string): void {
	alert(message);
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
	const app = new JobScopeApp();
	app.initialize(); // Start the initialization logic
});
