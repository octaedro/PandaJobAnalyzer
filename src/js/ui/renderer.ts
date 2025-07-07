/**
 * UI Renderer
 * Handles rendering results to the UI
 */

/**
 * Internal dependencies
 */
import { AnalysisResult } from '../storage/index';

// Define ElementsCache interface
interface ElementsCache {
	// Sections
	apiKeySection: HTMLElement;
	settingsPanel: HTMLElement;
	loadingSpinner: HTMLElement;
	resultsSection: HTMLElement;

	// Inputs and buttons
	apiKeyInput: HTMLInputElement;
	saveApiKeyBtn: HTMLButtonElement;
	settingsIcon: HTMLElement;
	tabButtons: NodeListOf<HTMLElement>;
	tabContents: NodeListOf<HTMLElement>;
	settingsApiKeyInput: HTMLInputElement;
	updateApiKeyBtn: HTMLButtonElement;
	deleteApiKeyBtn: HTMLButtonElement;
	parseJobBtn: HTMLButtonElement;
	retryBtn: HTMLButtonElement;

	// Result elements
	jobLocationEl: HTMLElement;
	requiredSkillsEl: HTMLElement;
	niceToHaveEl: HTMLElement;
	companySummaryEl: HTMLElement;
	companyReviewsEl: HTMLElement;
	salaryRangeEl: HTMLElement;
}

type SalaryValue =
	| string
	| number
	| {
			amount?: string | number;
			value?: string | number;
			salary?: string | number;
	  };

interface SalaryRange {
	min?: string;
	max?: string;
}

/**
 * UI Renderer Service
 */
class UIRendererService {
	private elements: ElementsCache | null = null;

	/**
	 * Initialize UI elements
	 * @param {ElementsCache} elements - DOM elements
	 */
	init(elements: ElementsCache): void {
		this.elements = elements;
	}

	/**
	 * Display job analysis results in the UI
	 * @param {AnalysisResult} results - The analysis results
	 */
	displayResults(results: AnalysisResult): void {
		if (!this.elements) {
			throw new Error('UI Renderer not initialized. Call init() first.');
		}

		// Job Location
		this.elements.jobLocationEl.textContent = Array.isArray(
			results.jobLocation
		)
			? results.jobLocation.join(', ')
			: results.jobLocation || 'Not specified';

		// Required Skills
		this.renderSkillsList(
			this.elements.requiredSkillsEl,
			results.requiredSkills || []
		);

		// Nice to Have Skills
		this.renderSkillsList(
			this.elements.niceToHaveEl,
			results.niceToHaveSkills || []
		);

		// Company Summary
		this.elements.companySummaryEl.textContent =
			results.companySummary || 'No company information available';

		// Company Reviews
		this.elements.companyReviewsEl.textContent =
			results.companyReviews || 'No reviews available';

		// Salary Range
		this.renderSalaryRange(results.salaryRange);
	}

	/**
	 * Render skills list
	 * @param {HTMLElement} element - The element to render to
	 * @param {string[]} skills - The skills to render
	 */
	private renderSkillsList(element: HTMLElement, skills: string[]): void {
		element.textContent = '';
		if (Array.isArray(skills) && skills.length > 0) {
			skills.forEach((skill) => {
				const li = document.createElement('li');
				li.textContent = skill;
				element.appendChild(li);
			});
		} else {
			const li = document.createElement('li');
			li.textContent = 'No specific skills mentioned';
			element.appendChild(li);
		}
	}

	/**
	 * Render salary range
	 * @param {SalaryRange | null | undefined} salaryRange - The salary range object (or null/undefined).
	 */
	private renderSalaryRange(
		salaryRange: { min?: string; max?: string } | null | undefined
	): void {
		if (!this.elements || !this.elements.salaryRangeEl) {
			console.error('UI Renderer or salary element not initialized.');
			return;
		}

		// Handle null or undefined salaryRange input
		if (!salaryRange) {
			this.elements.salaryRangeEl.textContent =
				'Not specified in the listing';
			return;
		}

		// Now we know salaryRange is an object
		if (salaryRange.min || salaryRange.max) {
			let salaryText = '';

			// Extract values from text, handle case when min or max are objects
			const minValue = this.extractSalaryValue(salaryRange.min);
			const maxValue = this.extractSalaryValue(salaryRange.max);

			if (minValue && maxValue) {
				salaryText = `${minValue} - ${maxValue}`;
			} else if (minValue) {
				salaryText = `From ${minValue}`;
			} else if (maxValue) {
				salaryText = `Up to ${maxValue}`;
			}

			this.elements.salaryRangeEl.textContent = salaryText;
		} else {
			this.elements.salaryRangeEl.textContent =
				'Not specified in the listing';
		}
	}

	/**
	 * Extract salary value as text, handling various formats
	 * @param {any} value - The salary value which could be a string, number, or object
	 * @returns {string|null} The extracted value as a string
	 */
	private extractSalaryValue(
		value: SalaryValue | undefined | null
	): string | null {
		if (!value) {
			return null;
		}

		// If already a string or number, convert to string
		if (typeof value === 'string' || typeof value === 'number') {
			return String(value);
		}

		// If an object, try to extract useful information
		if (typeof value === 'object') {
			// Check common properties in salary objects
			if (value.amount) {
				return String(value.amount);
			}
			if (value.value) {
				return String(value.value);
			}
			if (value.salary) {
				return String(value.salary);
			}

			// Try to extract the first property if it exists
			const firstProp = Object.values(value)[0];
			if (
				firstProp &&
				(typeof firstProp === 'string' || typeof firstProp === 'number')
			) {
				return String(firstProp);
			}

			// If all else fails, convert to JSON for inspection
			try {
				return JSON.stringify(value);
			} catch {
				return 'Unknown format';
			}
		}

		return 'Unknown format';
	}

	/**
	 * Toggle loading state UI
	 * @param {boolean} isLoading - Whether loading is in progress
	 * @param {boolean} showResults - Whether to show results when done loading
	 */
	toggleLoadingState(isLoading: boolean, showResults = false): void {
		if (!this.elements) {
			throw new Error('UI Renderer not initialized. Call init() first.');
		}

		if (isLoading) {
			this.elements.loadingSpinner.classList.remove('hidden');
			this.elements.parseJobBtn.classList.add('hidden');
			this.elements.resultsSection.classList.add('hidden');
		} else {
			this.elements.loadingSpinner.classList.add('hidden');

			if (showResults) {
				this.elements.resultsSection.classList.remove('hidden');
			} else {
				this.elements.parseJobBtn.classList.remove('hidden');
			}
		}
	}

	/**
	 * Show error message
	 * @param {string} message - The error message to show
	 */
	showError(message: string): void {
		alert(message);
	}
}

// Export service
export default new UIRendererService();
