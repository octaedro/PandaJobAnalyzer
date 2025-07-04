/**
 * Storage Service
 * Handles local storage for the extension
 */

// Storage keys
const STORAGE_KEY_API = 'openaiApiKey';
const STORAGE_KEY_RESULTS = 'pandaJobAnalyzerResults';
const STORAGE_KEY_RESUME = 'pandaJobAnalyzerResume';

// Define result types
export interface AnalysisResult {
	jobLocation?: string[] | string;
	requiredSkills?: string[];
	niceToHaveSkills?: string[];
	companySummary?: string;
	companyReviews?: string | null;
	salaryRange?: {
		min?: string;
		max?: string;
	} | null;
	[key: string]: unknown;
}

export interface StoredResults {
	[url: string]: AnalysisResult;
}

export interface ResumeData {
	personalInfo: {
		name: string;
		email?: string;
		phone?: string;
		location?: string;
		linkedin?: string;
		github?: string;
		website?: string;
	};
	summary?: string;
	experience: Array<{
		company: string;
		position: string;
		duration: string;
		description?: string;
		achievements?: string[];
	}>;
	education: Array<{
		institution: string;
		degree: string;
		fieldOfStudy?: string;
		graduationYear?: string;
		gpa?: string;
	}>;
	skills: {
		technical: string[];
		soft: string[];
		languages?: string[];
	};
	projects?: Array<{
		name: string;
		description: string;
		technologies?: string[];
		url?: string;
	}>;
	certifications?: Array<{
		name: string;
		issuer: string;
		date?: string;
	}>;
	uploadedAt: string;
	fileName: string;
}

/**
 * Storage Service
 */
class StorageService {
	/**
	 * Get the API key from storage
	 * @returns {Promise<string|null>} The API key or null if not found
	 */
	getApiKey(): Promise<string | null> {
		return new Promise((resolve) => {
			chrome.storage.local.get([STORAGE_KEY_API], (result) => {
				resolve(result[STORAGE_KEY_API] || null);
			});
		});
	}

	/**
	 * Save the API key to storage
	 * @param {string} apiKey - The API key to save
	 * @returns {Promise<void>}
	 */
	saveApiKey(apiKey: string): Promise<void> {
		return new Promise((resolve) => {
			chrome.storage.local.set({ [STORAGE_KEY_API]: apiKey }, () => {
				resolve();
			});
		});
	}

	/**
	 * Delete the API key from storage
	 * @returns {Promise<void>}
	 */
	deleteApiKey(): Promise<void> {
		return new Promise((resolve) => {
			chrome.storage.local.remove(STORAGE_KEY_API, () => {
				resolve();
			});
		});
	}

	/**
	 * Get saved job analysis results for a specific URL
	 * @param {string} url - The URL to get results for
	 * @returns {Promise<AnalysisResult|null>} The results or null if not found
	 */
	getResults(url: string): Promise<AnalysisResult | null> {
		return new Promise((resolve) => {
			chrome.storage.local.get([STORAGE_KEY_RESULTS], (result) => {
				const savedResults =
					(result[STORAGE_KEY_RESULTS] as StoredResults) || {};
				resolve(savedResults[url] || null);
			});
		});
	}

	/**
	 * Save job analysis results for a specific URL
	 * @param {string} url - The URL to save results for
	 * @param {AnalysisResult} results - The results to save
	 * @returns {Promise<void>}
	 */
	saveResults(url: string, results: AnalysisResult): Promise<void> {
		return new Promise((resolve) => {
			chrome.storage.local.get([STORAGE_KEY_RESULTS], (result) => {
				const savedResults =
					(result[STORAGE_KEY_RESULTS] as StoredResults) || {};
				savedResults[url] = results;

				chrome.storage.local.set(
					{ [STORAGE_KEY_RESULTS]: savedResults },
					() => {
						resolve();
					}
				);
			});
		});
	}

	/**
	 * Get all saved job analysis results
	 * @returns {Promise<StoredResults>} All saved results
	 */
	getAllResults(): Promise<StoredResults> {
		return new Promise((resolve) => {
			chrome.storage.local.get([STORAGE_KEY_RESULTS], (result) => {
				resolve((result[STORAGE_KEY_RESULTS] as StoredResults) || {});
			});
		});
	}

	/**
	 * Clear all saved job analysis results
	 * @returns {Promise<void>}
	 */
	clearAllResults(): Promise<void> {
		return new Promise((resolve) => {
			chrome.storage.local.remove(STORAGE_KEY_RESULTS, () => {
				resolve();
			});
		});
	}

	/**
	 * Get the resume data from storage
	 * @returns {Promise<ResumeData|null>} The resume data or null if not found
	 */
	getResumeData(): Promise<ResumeData | null> {
		return new Promise((resolve) => {
			chrome.storage.local.get([STORAGE_KEY_RESUME], (result) => {
				resolve(result[STORAGE_KEY_RESUME] || null);
			});
		});
	}

	/**
	 * Save the resume data to storage
	 * @param {ResumeData} resumeData - The resume data to save
	 * @returns {Promise<void>}
	 */
	saveResumeData(resumeData: ResumeData): Promise<void> {
		return new Promise((resolve) => {
			chrome.storage.local.set(
				{ [STORAGE_KEY_RESUME]: resumeData },
				() => {
					resolve();
				}
			);
		});
	}

	/**
	 * Delete the resume data from storage
	 * @returns {Promise<void>}
	 */
	deleteResumeData(): Promise<void> {
		return new Promise((resolve) => {
			chrome.storage.local.remove(STORAGE_KEY_RESUME, () => {
				resolve();
			});
		});
	}
}

// Export constants
export const KEYS = {
	API: STORAGE_KEY_API,
	RESULTS: STORAGE_KEY_RESULTS,
	RESUME: STORAGE_KEY_RESUME,
};

// Export service
export default new StorageService();
