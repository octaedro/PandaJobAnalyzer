/**
 * Storage Service
 * Handles local storage for the extension
 */

// Storage keys
const STORAGE_KEY_API = "openaiApiKey";
const STORAGE_KEY_RESULTS = "jobScopeResults";

/**
 * Storage Service
 */
class StorageService {
  /**
   * Get the API key from storage
   * @returns {Promise<string|null>} The API key or null if not found
   */
  getApiKey() {
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
  saveApiKey(apiKey) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY_API]: apiKey }, () => {
        resolve();
      });
    });
  }

  /**
   * Get saved job analysis results for a specific URL
   * @param {string} url - The URL to get results for
   * @returns {Promise<Object|null>} The results or null if not found
   */
  getResults(url) {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY_RESULTS], (result) => {
        const savedResults = result[STORAGE_KEY_RESULTS] || {};
        resolve(savedResults[url] || null);
      });
    });
  }

  /**
   * Save job analysis results for a specific URL
   * @param {string} url - The URL to save results for
   * @param {Object} results - The results to save
   * @returns {Promise<void>}
   */
  saveResults(url, results) {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY_RESULTS], (result) => {
        const savedResults = result[STORAGE_KEY_RESULTS] || {};
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
   * @returns {Promise<Object>} All saved results
   */
  getAllResults() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY_RESULTS], (result) => {
        resolve(result[STORAGE_KEY_RESULTS] || {});
      });
    });
  }

  /**
   * Clear all saved job analysis results
   * @returns {Promise<void>}
   */
  clearAllResults() {
    return new Promise((resolve) => {
      chrome.storage.local.remove(STORAGE_KEY_RESULTS, () => {
        resolve();
      });
    });
  }
}

// Export constants
export const KEYS = {
  API: STORAGE_KEY_API,
  RESULTS: STORAGE_KEY_RESULTS,
};

// Export service
export default new StorageService();
