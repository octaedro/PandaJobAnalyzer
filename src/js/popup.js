// Initialize the popup
document.addEventListener("DOMContentLoaded", initializePopup);

function initializePopup() {
  // Load saved API key
  loadApiKey();

  // Set up event listeners
  setupEventListeners();

  // Check if we have a current job
  checkCurrentJob();
}

function loadApiKey() {
  chrome.storage.local.get(["apiKey"], (result) => {
    const apiKeyInput = document.getElementById("apiKey");
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
    }
  });
}

function setupEventListeners() {
  // Settings icon click
  document.getElementById("settingsIcon").addEventListener("click", () => {
    const settingsPanel = document.getElementById("settingsPanel");
    settingsPanel.classList.toggle("hidden");
  });

  // Settings tabs
  document.querySelectorAll(".settings-tab-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const tabData = button.getAttribute("data-tab");
      const targetContentId = tabData + "Tab";

      // Deactivate all buttons and content panels
      document
        .querySelectorAll(".settings-tab-btn")
        .forEach((btn) => btn.classList.remove("active"));
      document
        .querySelectorAll(".settings-tab-content")
        .forEach((content) => content.classList.remove("active"));

      // Activate clicked button and corresponding content panel
      button.classList.add("active");
      document.getElementById(targetContentId).classList.add("active");
    });
  });

  // Main tabs
  document.querySelectorAll(".tab-btn").forEach((button) => {
    button.addEventListener("click", () => {
      // Remove active class from all buttons and content
      document
        .querySelectorAll(".tab-btn")
        .forEach((btn) => btn.classList.remove("active"));
      document
        .querySelectorAll(".tab-content")
        .forEach((content) => content.classList.remove("active"));

      // Add active class to clicked button and corresponding content
      button.classList.add("active");
      const tabId = button.getAttribute("data-tab") + "Tab";
      document.getElementById(tabId).classList.add("active");
    });
  });

  // API Key input
  document.getElementById("apiKey").addEventListener("input", (e) => {
    const apiKey = e.target.value;
    chrome.storage.local.set({ apiKey });
  });

  // Clear API Key button
  document.getElementById("clearApiKey").addEventListener("click", () => {
    document.getElementById("apiKey").value = "";
    chrome.storage.local.remove("apiKey", () => {
      showMessage("API key cleared successfully");
    });
  });

  // Parse Job button
  document.querySelector("#parseJob button").addEventListener("click", () => {
    parseCurrentJob();
  });

  // Retry button
  document.getElementById("retry").addEventListener("click", () => {
    parseCurrentJob();
  });
}

function checkCurrentJob() {
  chrome.storage.local.get(["currentJob"], (result) => {
    const parseJobSection = document.getElementById("parseJob");
    const resultsSection = document.getElementById("results");

    if (result.currentJob) {
      parseJobSection.classList.add("hidden");
      resultsSection.classList.remove("hidden");
      // TODO: Load and display the current job data
    } else {
      parseJobSection.classList.remove("hidden");
      resultsSection.classList.add("hidden");
    }
  });
}

function parseCurrentJob() {
  console.log("parseCurrentJob called"); // Debug log

  const loadingSpinner = document.getElementById("loadingSpinner");
  const parseJobSection = document.getElementById("parseJob");
  const resultsSection = document.getElementById("results");

  // Show loading spinner, hide other sections
  if (loadingSpinner) loadingSpinner.classList.remove("hidden");
  if (parseJobSection) parseJobSection.classList.add("hidden");
  if (resultsSection) resultsSection.classList.add("hidden");

  // Check for API Key before proceeding
  chrome.storage.local.get(["apiKey"], (result) => {
    if (!result.apiKey) {
      showMessage("Please add your OpenAI API key in the settings first.");
      if (loadingSpinner) loadingSpinner.classList.add("hidden"); // Hide spinner
      // Optionally re-show the parse button or redirect to settings
      if (parseJobSection) parseJobSection.classList.remove("hidden");
      return; // Stop if no API key
    }

    // Send message to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        console.error("Error querying tabs:", chrome.runtime.lastError);
        showMessage(
          "Error accessing current tab. Please reload the page and try again."
        );
        if (loadingSpinner) loadingSpinner.classList.add("hidden");
        if (parseJobSection) parseJobSection.classList.remove("hidden");
        return;
      }
      if (tabs.length === 0 || !tabs[0].id) {
        console.error("No active tab found or tab has no ID.");
        showMessage(
          "Could not find the active tab. Please ensure you are on a job page."
        );
        if (loadingSpinner) loadingSpinner.classList.add("hidden");
        if (parseJobSection) parseJobSection.classList.remove("hidden");
        return;
      }

      const tabId = tabs[0].id;
      console.log(`Sending parseJob message to tab ${tabId}`); // Debug log

      chrome.tabs.sendMessage(tabId, { action: "parseJob" }, (response) => {
        // Hide loading spinner regardless of response
        if (loadingSpinner) loadingSpinner.classList.add("hidden");

        if (chrome.runtime.lastError) {
          console.error(
            "Error sending message or receiving response:",
            chrome.runtime.lastError.message
          );
          showMessage(
            `Error communicating with the page: ${chrome.runtime.lastError.message}. Make sure the extension has permissions and the page is loaded.`
          );
          if (parseJobSection) parseJobSection.classList.remove("hidden"); // Show parse button again
          return;
        }

        console.log("Response received:", response); // Debug log

        if (response && response.success) {
          console.log("Job parsed successfully, data:", response.data); // Debug log
          // Store the parsed job
          chrome.storage.local.set({ currentJob: response.data }, () => {
            console.log("currentJob saved to storage."); // Debug log
            // Show results section
            if (resultsSection) resultsSection.classList.remove("hidden");
            // TODO: Display the actual data from response.data in #jobContent and #companyContent
            document.getElementById("jobContent").textContent = JSON.stringify(
              response.data.jobDetails,
              null,
              2
            ); // Example display
            document.getElementById("companyContent").textContent =
              JSON.stringify(response.data.companyDetails, null, 2); // Example display
          });
        } else {
          console.error("Failed to parse job. Response:", response);
          showMessage(
            response?.error ||
              "Failed to parse job content from the page. The structure might be unexpected."
          );
          if (parseJobSection) parseJobSection.classList.remove("hidden"); // Show parse button again
        }
      });
    });
  });
}

function showMessage(message) {
  // Simple alert for now, can be replaced with a better UI component
  alert(message);
}

// Initialize UI state on load
document.addEventListener("DOMContentLoaded", () => {
  // Load API key from storage
  chrome.storage.local.get(["apiKey"], (result) => {
    if (result.apiKey) {
      document.getElementById("apiKey").value = result.apiKey;
    }
  });

  // Check if job was already parsed and adjust UI
  chrome.storage.local.get(["currentJob"], (result) => {
    const parseJobSection = document.getElementById("parseJob");
    const resultsSection = document.getElementById("results");
    if (result.currentJob) {
      parseJobSection.classList.add("hidden");
      resultsSection.classList.remove("hidden");
    } else {
      parseJobSection.classList.remove("hidden");
      resultsSection.classList.add("hidden");
    }
  });
});
