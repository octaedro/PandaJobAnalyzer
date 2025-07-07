/**
 * Storage Service
 * Handles local storage for the extension with encryption for sensitive data
 */

/**
 * Internal dependencies
 */
import { EncryptionService } from '../utils/encryption';

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
		from: string;
		to: string;
		description?: string;
		achievements?: string[];
		technologies?: string[];
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
	 * Get the API key from storage (decrypts if encrypted)
	 * @returns {Promise<string|null>} The API key or null if not found
	 */
	async getApiKey(): Promise<string | null> {
		return new Promise((resolve) => {
			chrome.storage.local.get([STORAGE_KEY_API], async (result) => {
				try {
					const storedData = result[STORAGE_KEY_API];
					if (!storedData) {
						resolve(null);
						return;
					}

					// Check if data is encrypted
					if (EncryptionService.isEncrypted(storedData)) {
						const decryptedKey =
							await EncryptionService.decrypt(storedData);
						resolve(decryptedKey);
					} else {
						// Legacy unencrypted data - migrate to encrypted
						console.warn(
							'Found unencrypted API key, migrating to encrypted storage'
						);
						await this.saveApiKey(storedData);
						resolve(storedData);
					}
				} catch (error) {
					console.error('Failed to decrypt API key:', error);
					console.warn('Clearing corrupted API key data...');
					// Clear corrupted data
					chrome.storage.local.remove(STORAGE_KEY_API, () => {
						console.log('Corrupted API key data cleared');
					});
					resolve(null);
				}
			});
		});
	}

	/**
	 * Save the API key to storage (encrypted)
	 * @param {string} apiKey - The API key to save
	 * @returns {Promise<void>}
	 */
	async saveApiKey(apiKey: string): Promise<void> {
		try {
			const encryptedData = await EncryptionService.encrypt(apiKey);
			return new Promise((resolve) => {
				chrome.storage.local.set(
					{ [STORAGE_KEY_API]: encryptedData },
					() => {
						resolve();
					}
				);
			});
		} catch (error) {
			console.error('Failed to encrypt API key:', error);
			throw new Error('Failed to save API key securely');
		}
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
	 * Get the resume data from storage (decrypts if encrypted)
	 * @returns {Promise<ResumeData|null>} The resume data or null if not found
	 */
	async getResumeData(): Promise<ResumeData | null> {
		return new Promise((resolve) => {
			chrome.storage.local.get([STORAGE_KEY_RESUME], async (result) => {
				try {
					const storedData = result[STORAGE_KEY_RESUME];
					if (!storedData) {
						resolve(null);
						return;
					}

					// Check if data is encrypted
					if (EncryptionService.isEncrypted(storedData)) {
						const decryptedData =
							await EncryptionService.decrypt(storedData);
						const resumeData = JSON.parse(
							decryptedData
						) as ResumeData;
						resolve(resumeData);
					} else {
						// Legacy unencrypted data - migrate to encrypted
						console.warn(
							'Found unencrypted resume data, migrating to encrypted storage'
						);
						await this.saveResumeData(storedData);
						resolve(storedData);
					}
				} catch (error) {
					console.error('Failed to decrypt resume data:', error);
					console.warn('Clearing corrupted resume data...');
					// Clear corrupted data
					chrome.storage.local.remove(STORAGE_KEY_RESUME, () => {
						console.log('Corrupted resume data cleared');
					});
					resolve(null);
				}
			});
		});
	}

	/**
	 * Save the resume data to storage (encrypted)
	 * @param {ResumeData} resumeData - The resume data to save
	 * @returns {Promise<void>}
	 */
	async saveResumeData(resumeData: ResumeData): Promise<void> {
		try {
			const dataString = JSON.stringify(resumeData);
			const encryptedData = await EncryptionService.encrypt(dataString);
			return new Promise((resolve) => {
				chrome.storage.local.set(
					{ [STORAGE_KEY_RESUME]: encryptedData },
					() => {
						resolve();
					}
				);
			});
		} catch (error) {
			console.error('Failed to encrypt resume data:', error);
			throw new Error('Failed to save resume data securely');
		}
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
