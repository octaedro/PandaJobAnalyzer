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
      await this.checkApiKey();

      // Get current tab URL
      await this.getCurrentTabUrl();

      // Check for saved results for current URL
      await this.checkSavedResults();
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

    // Settings
    this.elements.settingsIcon.addEventListener("click", () =>
      this.elements.settingsPanel.classList.toggle("hidden")
    );

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
      this.elements.settingsPanel.classList.remove("hidden");
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
   */
  async checkApiKey() {
    const apiKey = await storageService.getApiKey();

    if (apiKey) {
      this.elements.apiKeySection.classList.add("hidden");
      this.elements.settingsApiKeyInput.value = apiKey;
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

    this.elements.apiKeySection.classList.add("hidden");
    this.elements.settingsApiKeyInput.value = apiKey;
    alert("API key saved successfully!");
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
}

// Initialize the application on DOM content loaded
document.addEventListener("DOMContentLoaded", async function () {
  const app = new JobScopeApp();
  await app.initialize();
});
