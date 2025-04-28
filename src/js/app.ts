/**
 * JobScope - Main Application
 * Chrome extension for analyzing job listings using OpenAI
 */

import openAIService from "../js/api/openai";
import storageService, { KEYS } from "../js/storage/index";
import uiRenderer from "../js/ui/renderer";

// Configuration timeout in milliseconds
const CONFIG_TIMEOUT = 3000;

/**
 * Main application class
 */
class JobScopeApp {
  private currentUrl: string = "";
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
      // Load configuration
      await this.loadConfiguration();

      // Check if API key exists
      const hasApiKey = await this.checkApiKey();

      if (hasApiKey) {
        await this.getCurrentTabUrl();
        await this.checkSavedResults();
      } else {
        // No API Key: Hide results, hide parse button, maybe show settings?
        if (this.elements.resultsSection) this.elements.resultsSection.classList.add("hidden");
        if (this.elements.parseJobSection) this.elements.parseJobSection.classList.add("hidden");
        // Optionally show settings panel if no API key
        // if (this.elements.settingsPanel) this.elements.settingsPanel.classList.remove("hidden");
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
      settingsPanel: document.getElementById("settingsPanel") as HTMLElement,
      loadingSpinner: document.getElementById("loadingSpinner") as HTMLElement,
      resultsSection: document.getElementById("results") as HTMLElement,
      parseJobSection: document.getElementById("parseJob") as HTMLElement,

      // Inputs and buttons
      apiKeyInput: document.getElementById("apiKey") as HTMLInputElement,
      clearApiKeyBtn: document.getElementById("clearApiKey") as HTMLButtonElement,
      settingsIcon: document.getElementById("settingsIcon") as HTMLElement,
      parseJobBtn: document.querySelector("#parseJob button") as HTMLButtonElement,
      retryBtn: document.getElementById("retry") as HTMLButtonElement,
      
      // Tabs (Settings)
      settingsTabBtns: document.querySelectorAll(".settings-tab-btn") as NodeListOf<HTMLElement>,
      settingsTabContents: document.querySelectorAll(".settings-tab-content") as NodeListOf<HTMLElement>,
      
      // Tabs (Main Results)
      tabButtons: document.querySelectorAll(".tab-btn") as NodeListOf<HTMLElement>,
      tabContents: document.querySelectorAll(".tab-content") as NodeListOf<HTMLElement>,

      // Result elements (Simplified)
      jobContentEl: document.getElementById("jobContent") as HTMLElement,
      companyContentEl: document.getElementById("companyContent") as HTMLElement,
    };
  }

  /**
   * Bind all event handlers
   */
  bindEventHandlers(): void {
    // Settings Icon
    if (this.elements.settingsIcon && this.elements.settingsPanel) {
        this.elements.settingsIcon.addEventListener("click", async () => {
            const isSettingsHidden = this.elements.settingsPanel.classList.toggle("hidden");
            
            if (!isSettingsHidden) { 
                // Settings Opened: Hide results regardless of state
                if (this.elements.resultsSection) this.elements.resultsSection.classList.add("hidden");
                if (this.elements.parseJobSection) this.elements.parseJobSection.classList.add("hidden"); // Also hide parse button
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
            
            this.elements.settingsTabBtns.forEach(btn => btn.classList.remove('active'));
            this.elements.settingsTabContents.forEach(content => content.classList.remove('active')); // Assuming 'active' controls visibility
            
            button.classList.add('active');
            const targetContent = document.getElementById(targetContentId);
            if(targetContent) targetContent.classList.add('active');
        });
    });

    // API Key Input (Auto-save)
    if (this.elements.apiKeyInput) {
        this.elements.apiKeyInput.addEventListener("input", (e) => {
            const apiKey = (e.target as HTMLInputElement).value;
            storageService.saveApiKey(apiKey);
        });
    }

    // Clear API Key Button
    if (this.elements.clearApiKeyBtn && this.elements.apiKeyInput) {
        this.elements.clearApiKeyBtn.addEventListener("click", () => {
            this.elements.apiKeyInput.value = "";
            storageService.deleteApiKey(); // Use storage service method
            showMessage("API key cleared."); // Simple message
        });
    }

    // Main Result Tabs
    this.elements.tabButtons.forEach((button) => {
      button.addEventListener("click", (event) => this.handleTabClick(event));
    });

    // Parse job button
    if (this.elements.parseJobBtn) {
        this.elements.parseJobBtn.addEventListener("click", () => this.handleParseJob(false));
    }

    // Retry button
    if (this.elements.retryBtn) {
        this.elements.retryBtn.addEventListener("click", () => this.handleParseJob(true));
    }
  }

  /**
   * Get the current tab URL
   */
  async getCurrentTabUrl(): Promise<string> {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else if (tabs && tabs.length > 0) {
          this.currentUrl = tabs[0].url || "";
          console.log("Current URL:", this.currentUrl); // Log URL
          resolve(this.currentUrl);
        } else {
          reject(new Error("No active tab found"));
        }
      });
    });
  }

  /**
   * Check API key from storage
   */
  async checkApiKey(): Promise<boolean> {
    const apiKey = await storageService.getApiKey();
    if (!apiKey && this.elements.apiKeyInput) {
        this.elements.apiKeyInput.value = ""; // Ensure field is empty if no key in storage
    } else if (apiKey && this.elements.apiKeyInput) {
        this.elements.apiKeyInput.value = apiKey; // Load existing key into field
    }
    return !!apiKey;
  }

  /**
   * Check for saved results for the current URL
   */
  async checkSavedResults(): Promise<boolean> {
    if (!this.currentUrl) {
        console.log("checkSavedResults: No current URL");
        return false;
    }

    const results = await storageService.getResults(this.currentUrl);
    console.log("checkSavedResults: Found results in storage?", !!results);

    if (results) {
        this.displayResults(results); // Use internal display method
        if(this.elements.parseJobSection) this.elements.parseJobSection.classList.add("hidden");
        if(this.elements.resultsSection) this.elements.resultsSection.classList.remove("hidden");
        return true;
    } else {
        if(this.elements.parseJobSection) this.elements.parseJobSection.classList.remove("hidden");
        if(this.elements.resultsSection) this.elements.resultsSection.classList.add("hidden");
        return false;
    }
  }

  /**
   * Handle tab click events for main results
   */
  handleTabClick(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const tabId = target.getAttribute("data-tab") + "Tab"; // Assumes content ID is data-tab + "Tab"

    if (!tabId) return;

    this.elements.tabButtons.forEach((btn) => btn.classList.remove("active"));
    target.classList.add("active");

    this.elements.tabContents.forEach((content) => {
      // Assuming tabContents have IDs like "jobTab", "companyTab"
      if (content.id === tabId) {
          content.classList.add("active"); // Use 'active' class like settings tabs
          content.classList.remove("hidden"); // Ensure visible if previously hidden
      } else {
          content.classList.remove("active");
          content.classList.add("hidden"); // Hide non-active tabs
      }
    });
  }
  
  /**
   * Display results in the UI
   */
  displayResults(results: any): void {
      console.log("Displaying results:", results);
      
      if (!results) { // Handle null/undefined results
        console.error("displayResults called with null results");
        if (this.elements.jobContentEl) this.elements.jobContentEl.innerHTML = '<p>Error: No results data found.</p>';
        if (this.elements.companyContentEl) this.elements.companyContentEl.innerHTML = ''; // Clear company tab too
        return;
      }

      // Clear previous content
      if (this.elements.jobContentEl) this.elements.jobContentEl.innerHTML = '';
      if (this.elements.companyContentEl) this.elements.companyContentEl.innerHTML = '';

      let jobHtml = '';
      let companyHtml = '';
      let foundStructuredJobData = false;
      let foundStructuredCompanyData = false;

      // --- Populate Job Details ---
      if (results.jobLocation) {
          jobHtml += `<h4>Location:</h4><p>${Array.isArray(results.jobLocation) ? results.jobLocation.join(', ') : results.jobLocation}</p>`;
          foundStructuredJobData = true;
      }
      if (results.salaryRange && (results.salaryRange.min || results.salaryRange.max)) {
          jobHtml += `<h4>Salary Range:</h4><p>${results.salaryRange.min || 'N/A'} - ${results.salaryRange.max || 'N/A'}</p>`;
          foundStructuredJobData = true;
      }
      if (results.requiredSkills && Array.isArray(results.requiredSkills) && results.requiredSkills.length > 0) {
          jobHtml += `<h4>Required Skills:</h4><ul>${results.requiredSkills.map((skill: string) => `<li>${skill}</li>`).join('')}</ul>`;
          foundStructuredJobData = true;
      }
      if (results.niceToHaveSkills && Array.isArray(results.niceToHaveSkills) && results.niceToHaveSkills.length > 0) {
          jobHtml += `<h4>Nice-to-Have Skills:</h4><ul>${results.niceToHaveSkills.map((skill: string) => `<li>${skill}</li>`).join('')}</ul>`;
          foundStructuredJobData = true;
      }
      // Add more job fields here if needed...

      // --- Populate Company Details ---
       if (results.companySummary) {
           companyHtml += `<h4>Summary:</h4><p>${results.companySummary}</p>`;
           foundStructuredCompanyData = true;
       }
       if (results.companyReviews) { // Assuming companyReviews is a summary string
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
       else if (!foundStructuredCompanyData && this.elements.companyContentEl) {
            this.elements.companyContentEl.innerHTML = `<p>No specific company details extracted.</p>`;
       }

      // Ensure results section is visible
      if(this.elements.resultsSection) this.elements.resultsSection.classList.remove('hidden');
  }

  /**
   * Toggles the loading state UI
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
      showMessage("Please add your OpenAI API key in the settings first.");
      if(this.elements.settingsPanel) this.elements.settingsPanel.classList.remove("hidden"); // Show settings
      return;
    }

    // Ensure URL is available
    if (!this.currentUrl) {
        try {
            await this.getCurrentTabUrl();
        } catch (error) {
            showMessage("Could not get current tab URL. Please reload the page.");
            return;
        }
    }
    
    // If not forcing refresh, check for saved results first
    if (!forceRefresh) {
      const hasSavedResults = await storageService.getResults(this.currentUrl); // Check storage directly
      if (hasSavedResults) {
          console.log("handleParseJob: Found saved results, displaying them.")
          this.displayResults(hasSavedResults);
          if(this.elements.parseJobSection) this.elements.parseJobSection.classList.add("hidden");
          if(this.elements.resultsSection) this.elements.resultsSection.classList.remove("hidden");
          return; // Don't re-parse if we have results unless forced
      }
    }

    console.log("handleParseJob: Parsing job...");
    this.toggleLoadingState(true);

    try {
      const content = await this.getCurrentTabContent();
      console.log("handleParseJob: Got content, calling OpenAI...");
      const results = await openAIService.analyzeJobListing(content, apiKey);
      console.log("handleParseJob: OpenAI results received:", results);

      await storageService.saveResults(this.currentUrl, results);
      console.log("handleParseJob: Results saved.");

      this.displayResults(results);
      this.toggleLoadingState(false);
       if(this.elements.parseJobSection) this.elements.parseJobSection.classList.add("hidden"); // Ensure parse button is hidden after success

    } catch (error: any) {
      console.error("Error during parsing:", error);
      showMessage(`Error analyzing job: ${error.message || error}`);
      this.toggleLoadingState(false);
      // Show parse button again on error?
       if(this.elements.parseJobSection) this.elements.parseJobSection.classList.remove("hidden");
    }
  }

  /**
   * Injects content script if needed and gets content from the current tab.
   */
  getCurrentTabContent(): Promise<string> {
    return new Promise(async (resolve, reject) => {
      let activeTabId: number = -1; // Initialize to avoid potential error
      try {
        // 1. Get Active Tab ID
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length === 0 || !tabs[0].id) {
          return reject(new Error("No active tab found or tab has no ID."));
        }
        activeTabId = tabs[0].id;
        console.log(`Attempting to get content from tab ${activeTabId}`);

        // 2. Inject content.js programmatically
        console.log(`Injecting content script into tab ${activeTabId}...`);
        await chrome.scripting.executeScript({
          target: { tabId: activeTabId },
          files: ['content.js'], // Path relative to extension root (dist)
        });
        console.log(`Content script injected successfully into tab ${activeTabId}.`);

        // 3. Send message to the now-injected script
        console.log(`Sending parseJob message to tab ${activeTabId}...`);
        const response = await chrome.tabs.sendMessage(activeTabId, { action: 'parseJob' });

        // 4. Process response
        console.log("Response received from content script:", response);
        if (response && response.success && response.data) {
          console.log("Content received successfully.");
          resolve(response.data);
        } else {
          console.error("Invalid or unsuccessful response from content script:", response);
          reject(new Error(response?.error || "Failed to get job content from page after injection."));
        }

      } catch (error: any) {
        console.error(`Error in getCurrentTabContent for tab ${activeTabId}:`, error);
        // Check for specific injection errors
        if (error.message.includes("Cannot access contents of url")) {
             reject(new Error(`Cannot access this page (${this.currentUrl}). Check host permissions or page restrictions.`));
        } else if (error.message.includes("No tab with id")) {
             reject(new Error("The tab was closed or could not be found."));
        } else {
             reject(new Error(`Could not communicate with content script: ${error.message}`));
        }
      }
    });
  }

  /**
   * Load configuration from config.json
   */
  async loadConfiguration(): Promise<void> {
    try {
      const response = await fetch("config.json");
      const config = await response.json();
      openAIService.setConfig(config);
    } catch (error) {
      console.error("Error loading configuration:", error);
      // Default config will be used by openAIService
    }
  }
}

// --- Global Helper --- 
function showMessage(message: string): void {
  alert(message);
}

// --- Initialization --- 
document.addEventListener("DOMContentLoaded", () => {
  const app = new JobScopeApp();
  app.initialize(); // Start the initialization logic
}); 