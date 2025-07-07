/**
 * Panda Job Analyzer - Main Application
 * Chrome extension for analyzing job listings using OpenAI
 */

/**
 * Internal dependencies
 */
import openAIService from '../js/api/openai';
import storageService from '../js/storage/index';
import {
	cacheDOMElements,
	type DOMElementCache,
	renderResults,
	toggleLoadingState,
	showElement, // Keep needed visibility helpers
	hideElement, // Keep needed visibility helpers
	showMessage as showUIMessage, // Keep show message
	hideMessage, // Add hide message
} from './ui';
import * as apiKeyManager from './apiKeyManager';
import * as resumeManager from './resumeManager';
import { initializeEventHandlers } from './eventHandler';

/**
 * Main application class
 */
export class PandaJobAnalyzerApp {
	public currentUrl: string = '';
	public elements: DOMElementCache;

	constructor() {
		this.elements = cacheDOMElements();
		initializeEventHandlers(this, this.elements);
	}

	async initialize(): Promise<void> {
		try {
			const hasApiKey = await apiKeyManager.initializeApiKeyStatus(
				this.elements
			);

			// Initialize resume status regardless of API key
			await resumeManager.initializeResumeStatus(this.elements);

			if (hasApiKey) {
				try {
					await this.getCurrentTabUrl();
					await this.checkSavedResults();
				} catch (error) {
					console.error(
						'Initialization error after getting API key:',
						error
					);
					showUIMessage(
						'Could not initialize job data: ' +
							(error instanceof Error
								? error.message
								: String(error)),
						this.elements,
						'error'
					);
					// Show parse button as fallback
					showElement(this.elements.parseJobSection);
					hideElement(this.elements.resultsSection);
				}
			} else {
				console.log('No API Key found, showing settings panel.');
				// Show settings panel (Ideally, UI module handles active tab too)
				showElement(this.elements.settingsPanel);
				// Hide other main sections
				hideElement(this.elements.parseJobSection);
				hideElement(this.elements.resultsSection);
			}
		} catch (error) {
			console.error('Error initializing application:', error);
			showUIMessage(
				'Error initializing: ' +
					(error instanceof Error ? error.message : String(error)),
				this.elements,
				'error'
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
	 * Check for saved results for the current URL and update UI
	 * Called during init and after settings close.
	 */
	async checkSavedResults(): Promise<void> {
		if (!this.currentUrl) {
			console.warn('checkSavedResults: No current URL, cannot check.');
			hideElement(this.elements.parseJobSection);
			hideElement(this.elements.resultsSection);
			return;
		}

		const results = await storageService.getResults(this.currentUrl);
		console.log('checkSavedResults: Found results in storage?', !!results);

		if (results) {
			renderResults(results, this.elements); // Renders and shows results section
			hideElement(this.elements.parseJobSection);
		} else {
			showElement(this.elements.parseJobSection);
			hideElement(this.elements.resultsSection);
		}
	}

	/**
	 * Handle parse job button click
	 * @param {boolean} forceRefresh - If true, force a refresh from OpenAI even if results exist
	 */
	async handleParseJob(forceRefresh = false): Promise<void> {
		// Clear any previous messages
		hideMessage(this.elements);

		const apiKey = await apiKeyManager.getApiKey();

		if (!apiKey) {
			showUIMessage(
				'Please add your OpenAI API key in the settings first.',
				this.elements,
				'error'
			);
			showElement(this.elements.settingsPanel);
			return;
		}

		if (!this.currentUrl) {
			try {
				await this.getCurrentTabUrl();
			} catch (error: unknown) {
				showUIMessage(
					'Could not get current tab URL. Please reload the page. ' +
						(error as Error).message,
					this.elements,
					'error'
				);
				return;
			}
		}

		if (!forceRefresh) {
			const hasSavedResults = await storageService.getResults(
				this.currentUrl
			);
			if (hasSavedResults) {
				console.log(
					'handleParseJob: Found saved results, displaying them.'
				);
				renderResults(hasSavedResults, this.elements); // Renders and shows results
				hideElement(this.elements.parseJobSection); // Hide parse button
				return;
			}
		}

		console.log('handleParseJob: Parsing job...');
		toggleLoadingState(true, this.elements);

		try {
			const jobContent = await this.getCurrentTabContent();
			console.log('handleParseJob: Got content, calling OpenAI...');

			// Check if we have resume data for matching analysis
			const resumeData = await storageService.getResumeData();
			console.log('handleParseJob: Resume data found:', !!resumeData);

			const results = await openAIService.analyzeJobListing(
				jobContent,
				apiKey,
				resumeData
			);
			console.log('handleParseJob: OpenAI results received:', results);

			await storageService.saveResults(this.currentUrl, results);
			console.log('handleParseJob: Results saved.');

			renderResults(results, this.elements); // Renders and shows results section
			toggleLoadingState(false, this.elements); // Hides loading spinner
			hideElement(this.elements.parseJobSection); // Explicitly hide parse section after success
		} catch (error: unknown) {
			console.error('Error during parsing:', error);
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			showUIMessage(
				`Error analyzing job: ${errorMessage}`,
				this.elements,
				'error'
			);
			toggleLoadingState(false, this.elements); // Hides loading spinner
			showElement(this.elements.parseJobSection); // Ensure parse button is visible after error
			hideElement(this.elements.resultsSection); // Hide results section on error
		}
	}

	/**
	 * Injects content script if needed and gets content from the current tab.
	 * @returns {Promise<string>} A promise resolving to the job listing content string.
	 */
	getCurrentTabContent(): Promise<string> {
		return new Promise((resolve, reject) => {
			let activeTabId: number = -1;
			(async () => {
				try {
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

					console.log(
						`Injecting content script into tab ${activeTabId}...`
					);
					await chrome.scripting.executeScript({
						target: { tabId: activeTabId },
						files: ['content.js'],
					});
					console.log(
						`Content script injected successfully into tab ${activeTabId}.`
					);

					console.log(
						`Sending parseJob message to tab ${activeTabId}...`
					);
					const response = await chrome.tabs.sendMessage(
						activeTabId,
						{
							action: 'parseJob',
						}
					);

					console.log(
						'Response received from content script:',
						response
					);
					if (
						response &&
						response.success &&
						typeof response.data === 'string'
					) {
						console.log('Content received successfully.');
						resolve(response.data);
					} else {
						console.error(
							'Invalid or unsuccessful response structure from content script (expecting string data):',
							response
						);
						reject(
							new Error(
								response?.error ||
									'Invalid or missing job content string received from content script.'
							)
						);
					}
				} catch (error: unknown) {
					console.error(
						`Error in getCurrentTabContent for tab ${activeTabId}:`,
						error
					);
					const specificError =
						error instanceof Error
							? error
							: new Error(String(error));

					if (
						specificError.message.includes(
							'Cannot access contents of url'
						)
					) {
						reject(
							new Error(
								`Cannot access this page (${this.currentUrl}). Check host permissions or page restrictions.`
							)
						);
					} else if (
						specificError.message.includes('No tab with id')
					) {
						reject(
							new Error(
								'The tab was closed or could not be found.'
							)
						);
					} else {
						reject(
							new Error(
								`Could not communicate with content script: ${specificError.message}`
							)
						);
					}
				}
			})().catch(reject);
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

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
	const app = new PandaJobAnalyzerApp();
	app.initialize(); // Start the initialization logic
});
