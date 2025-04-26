/**
 * OpenAI API Service
 * Handles communication with the OpenAI API
 */

const API_ENDPOINT = "https://api.openai.com/v1/chat/completions";

/**
 * OpenAI API Service
 */
class OpenAIService {
  constructor() {
    this.config = null;
  }

  /**
   * Load the configuration from the provided config object
   * @param {Object} config - Configuration for OpenAI
   */
  setConfig(config) {
    this.config = config;
  }

  /**
   * Get default configuration for OpenAI
   * @returns {Object} Default configuration
   */
  getDefaultConfig() {
    return {
      model: "gpt-4",
      systemPrompt:
        "You are a helpful assistant that analyzes job listings and extracts key information. Return a JSON object with the following fields:\n" +
        "- jobLocation (array of countries or regions)\n" +
        "- requiredSkills (array of strings)\n" +
        "- niceToHaveSkills (array of strings)\n" +
        "- companySummary (string)\n" +
        "- companyReviews (string or null)\n" +
        '- salaryRange (object with min and max properties as strings, example: {"min": "$50,000", "max": "$70,000"}, or null if not found)\n\n' +
        "IMPORTANT: Ensure all values are simple strings or arrays of strings. For salaryRange, min and max must be text strings, not objects.",
      userPromptTemplate:
        "Analyze this job listing and extract key information: {{content}}",
    };
  }

  /**
   * Analyze job listing using OpenAI API
   * @param {string} content - Job listing content
   * @param {string} apiKey - OpenAI API key
   * @returns {Promise<Object>} Analysis results
   */
  analyzeJobListing(content, apiKey) {
    if (!this.config) {
      this.config = this.getDefaultConfig();
    }

    return this.makeApiRequest(content, apiKey);
  }

  /**
   * Make API request to OpenAI
   * @param {string} content - Content to analyze
   * @param {string} apiKey - OpenAI API key
   * @returns {Promise<Object>} Analysis results
   */
  makeApiRequest(content, apiKey) {
    // Replace {{content}} in template with actual content
    const userPrompt = this.config.userPromptTemplate.replace(
      "{{content}}",
      content
    );

    const prompt = {
      model: this.config.model,
      messages: [
        {
          role: "system",
          content: this.config.systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    };

    return fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(prompt),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        try {
          const content = data.choices[0].message.content;
          // Extract JSON from the response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          } else {
            throw new Error("Failed to extract JSON from response");
          }
        } catch (e) {
          console.error("Error parsing response:", e);
          throw new Error("Failed to parse analysis results");
        }
      });
  }
}

// Export the service
export default new OpenAIService();
