/**
 * JobScope - Main Application
 * Chrome extension for analyzing job listings using OpenAI
 */

import openAIService from "./api/openai.js";
import storageService, { KEYS } from "./storage/index.js";
import uiRenderer from "./ui/renderer.js";

// Configuration timeout in milliseconds
const CONFIG_TIMEOUT = 3000;

/**
 * Main application class
 */
class JobScopeApp {
  constructor() {
    // State
    this.currentUrl = "";

    // Cache DOM elements
    this.elements = this.cacheDOMElements();

    // Initialize UI renderer
    uiRenderer.init(this.elements);

    // Bind event handlers
    this.bindEventHandlers();
  }

  /**
   * Initialize the application
   */
  async initialize() {
    try {
      // Load configuration
      await this.loadConfiguration();

      // Check if API key exists
      const hasApiKey = await this.checkApiKey();

      // Only proceed with these steps if we have an API key
      if (hasApiKey) {
        // Get current tab URL
        await this.getCurrentTabUrl();

        // Check for saved results for current URL
        await this.checkSavedResults();
      } else {
        // Ensure results are hidden when there's no API key
        this.elements.resultsSection.classList.add("hidden");
        this.elements.parseJobBtn.classList.add("hidden");
      }
    } catch (error) {
      console.error("Error initializing application:", error);
    }
  }

  /**
   * Cache all DOM elements for better performance
   */
  cacheDOMElements() {
    return {
      // Sections
      apiKeySection: document.getElementById("apiKeySection"),
      settingsPanel: document.getElementById("settingsPanel"),
      loadingSpinner: document.getElementById("loadingSpinner"),
      resultsSection: document.getElementById("results"),

      // Inputs and buttons
      apiKeyInput: document.getElementById("apiKey"),
      saveApiKeyBtn: document.getElementById("saveApiKey"),
      settingsIcon: document.getElementById("settingsIcon"),
      tabButtons: document.querySelectorAll(".tab-btn"),
      tabContents: document.querySelectorAll(".tab-content"),
      settingsApiKeyInput: document.getElementById("settingsApiKey"),
      updateApiKeyBtn: document.getElementById("updateApiKey"),
      deleteApiKeyBtn: document.getElementById("deleteApiKey"),
      parseJobBtn: document.getElementById("parseJob"),
      retryBtn: document.getElementById("retry"),

      // Result elements
      jobLocationEl: document.getElementById("jobLocation"),
      requiredSkillsEl: document.getElementById("requiredSkills"),
      niceToHaveEl: document.getElementById("niceToHave"),
      companySummaryEl: document.getElementById("companySummary"),
      companyReviewsEl: document.getElementById("companyReviews"),
      salaryRangeEl: document.getElementById("salaryRange"),
    };
  }

  /**
   * Bind all event handlers
   */
  bindEventHandlers() {
    // API Key
    this.elements.saveApiKeyBtn.addEventListener("click", () =>
      this.saveApiKey(this.elements.apiKeyInput.value)
    );

    this.elements.updateApiKeyBtn.addEventListener("click", () =>
      this.saveApiKey(this.elements.settingsApiKeyInput.value)
    );

    // Add delete API key button handler
    if (this.elements.deleteApiKeyBtn) {
      this.elements.deleteApiKeyBtn.addEventListener("click", () =>
        this.deleteApiKey()
      );
    }

    // Settings
    this.elements.settingsIcon.addEventListener("click", async () => {
      const apiKey = await storageService.getApiKey();

      if (apiKey) {
        // Toggle settings panel visibility
        this.elements.settingsPanel.classList.toggle("hidden");

        // Toggle results visibility based on settings panel state
        this.elements.resultsSection.classList.toggle("hidden");
      }
    });

    // Tab navigation
    this.elements.tabButtons.forEach((button) => {
      button.addEventListener("click", (event) => this.handleTabClick(event));
    });

    // Parse job button
    this.elements.parseJobBtn.addEventListener("click", () =>
      this.handleParseJob(false)
    );

    // Retry button
    this.elements.retryBtn.addEventListener("click", () =>
      this.handleParseJob(true)
    );
  }

  /**
   * Get the current tab URL
   */
  async getCurrentTabUrl() {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else if (tabs && tabs.length > 0) {
          this.currentUrl = tabs[0].url;
          resolve(this.currentUrl);
        } else {
          reject(new Error("No active tab found"));
        }
      });
    });
  }

  /**
   * Check for saved results for the current URL
   */
  async checkSavedResults() {
    if (!this.currentUrl) return false;

    const results = await storageService.getResults(this.currentUrl);

    if (results) {
      // If we have saved results for this URL, display them
      uiRenderer.displayResults(results);
      uiRenderer.toggleLoadingState(false, true);

      // Hide the Parse button since we already have results
      this.elements.parseJobBtn.classList.add("hidden");

      return true;
    } else {
      // Show the Parse button when there are no saved results
      this.elements.parseJobBtn.classList.remove("hidden");
      return false;
    }
  }

  /**
   * Handle tab click events
   */
  handleTabClick(event) {
    const tabId = event.currentTarget.getAttribute("data-tab");

    // Update active tab button
    this.elements.tabButtons.forEach((btn) => btn.classList.remove("active"));
    event.currentTarget.classList.add("active");

    // Show selected tab content, hide others
    this.elements.tabContents.forEach((content) => {
      content.classList.add("hidden");
    });
    document.getElementById(tabId).classList.remove("hidden");
  }

  /**
   * Handle parse job button click
   * @param {boolean} forceRefresh - If true, force a refresh from OpenAI even if results exist
   */
  async handleParseJob(forceRefresh = false) {
    const apiKey = await storageService.getApiKey();

    if (!apiKey) {
      uiRenderer.showError(
        "Please enter your OpenAI API key in settings first."
      );
      this.elements.apiKeySection.classList.remove("hidden");
      // Hide results
      this.elements.resultsSection.classList.add("hidden");
      // Hide parse button
      this.elements.parseJobBtn.classList.add("hidden");
      return;
    }

    // If not forcing refresh, check for saved results first
    if (!forceRefresh) {
      const hasSavedResults = await this.checkSavedResults();
      if (hasSavedResults) return;
    }

    // Show loading spinner
    uiRenderer.toggleLoadingState(true);

    try {
      // Get page content and analyze
      const content = await this.getCurrentTabContent();
      const results = await openAIService.analyzeJobListing(content, apiKey);

      // Save results for this URL
      await storageService.saveResults(this.currentUrl, results);

      // Display results
      uiRenderer.displayResults(results);
      uiRenderer.toggleLoadingState(false, true);

      // Hide the parse button
      this.elements.parseJobBtn.classList.add("hidden");
    } catch (error) {
      console.error("Error:", error);
      uiRenderer.toggleLoadingState(false, false);
      uiRenderer.showError("Error analyzing job listing. Please try again.");
    }
  }

  /**
   * Check if API key exists in storage
   * @returns {Promise<boolean>} True if API key exists, false otherwise
   */
  async checkApiKey() {
    const apiKey = await storageService.getApiKey();

    if (apiKey) {
      this.elements.apiKeySection.classList.add("hidden");
      this.elements.settingsApiKeyInput.value = apiKey;
      return true;
    } else {
      // Show API key input section
      this.elements.apiKeySection.classList.remove("hidden");
      // Hide results and parse button
      this.elements.resultsSection.classList.add("hidden");
      this.elements.parseJobBtn.classList.add("hidden");
      return false;
    }
  }

  /**
   * Save API key to storage
   */
  async saveApiKey(apiKey) {
    if (!apiKey) {
      uiRenderer.showError("Please enter a valid API key");
      return;
    }

    await storageService.saveApiKey(apiKey);

    // Hide the API key input section
    this.elements.apiKeySection.classList.add("hidden");

    // Update the API key in settings
    this.elements.settingsApiKeyInput.value = apiKey;

    // Hide settings panel if it was showing
    this.elements.settingsPanel.classList.add("hidden");

    // Show the Parse button to allow the user to start using the extension
    this.elements.parseJobBtn.classList.remove("hidden");

    alert("API key saved successfully!");

    // If we don't have the current URL yet, get it now
    if (!this.currentUrl) {
      try {
        await this.getCurrentTabUrl();
        // Check if we already have results for this URL
        await this.checkSavedResults();
      } catch (error) {
        console.error("Error initializing after API key save:", error);
      }
    }
  }

  /**
   * Load configuration from config.json
   */
  async loadConfiguration() {
    try {
      const response = await fetch("config.json");
      const config = await response.json();
      openAIService.setConfig(config);
    } catch (error) {
      console.error("Error loading configuration:", error);
      // Default config will be used by openAIService
    }
  }

  /**
   * Get content from the current tab
   */
  getCurrentTabContent() {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];

        chrome.scripting.executeScript(
          {
            target: { tabId: activeTab.id },
            function: () => {
              return document.body.innerText;
            },
          },
          (results) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(results[0].result);
            }
          }
        );
      });
    });
  }

  /**
   * Delete API key from storage
   */
  async deleteApiKey() {
    if (confirm("Are you sure you want to delete your API key?")) {
      await storageService.deleteApiKey();
      this.elements.settingsApiKeyInput.value = "";
      this.elements.apiKeyInput.value = "";
      this.elements.apiKeySection.classList.remove("hidden");
      alert("API key has been deleted.");
      // Toggle settings panel visibility
      this.elements.settingsPanel.classList.add("hidden");
    }
  }
}

// Initialize the application on DOM content loaded
document.addEventListener("DOMContentLoaded", async function () {
  const app = new JobScopeApp();
  await app.initialize();
});
