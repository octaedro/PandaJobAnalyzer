/**
 * OpenAI API Service
 * Handles communication with the OpenAI API
 */

const API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

// Define types for OpenAI configuration and API response
interface OpenAIConfig {
	model: string;
	systemPrompt: string;
	userPromptTemplate: string;
}

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

interface OpenAIMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

interface OpenAIRequest {
	model: string;
	messages: OpenAIMessage[];
}

interface OpenAIResponse {
	choices: {
		message: {
			content: string;
		};
	}[];
}

/**
 * OpenAI API Service
 */
class OpenAIService {
	private config: OpenAIConfig | null = null;

	/**
	 * Load the configuration from the provided config object
	 * @param {OpenAIConfig} config - Configuration for OpenAI
	 */
	setConfig(config: OpenAIConfig): void {
		this.config = config;
	}

	/**
	 * Get default configuration for OpenAI
	 * @returns {OpenAIConfig} Default configuration
	 */
	getDefaultConfig(): OpenAIConfig {
		return {
			model: 'gpt-4',
			systemPrompt:
				'You are a helpful assistant that analyzes job listings and extracts key information. Return a JSON object with the following fields:\n' +
				'- jobLocation (array of countries or regions)\n' +
				'- requiredSkills (array of strings)\n' +
				'- niceToHaveSkills (array of strings)\n' +
				'- companySummary (string)\n' +
				'- companyReviews (string or null)\n' +
				'- salaryRange (object with min and max properties as strings, example: {"min": "$50,000", "max": "$70,000"}, or null if not found)\n\n' +
				'IMPORTANT: Ensure all values are simple strings or arrays of strings. For salaryRange, min and max must be text strings, not objects.',
			userPromptTemplate:
				'Analyze this job listing and extract key information: {{content}}',
		};
	}

	/**
	 * Analyze job listing using OpenAI API
	 * @param {string} content - Job listing content
	 * @param {string} apiKey - OpenAI API key
	 * @returns {Promise<AnalysisResult>} Analysis results
	 */
	analyzeJobListing(
		content: string,
		apiKey: string
	): Promise<AnalysisResult> {
		if (!this.config) {
			this.config = this.getDefaultConfig();
		}

		return this.makeApiRequest(content, apiKey);
	}

	/**
	 * Make API request to OpenAI
	 * @param {string} content - Content to analyze
	 * @param {string} apiKey - OpenAI API key
	 * @returns {Promise<AnalysisResult>} Analysis results
	 */
	private makeApiRequest(
		content: string,
		apiKey: string
	): Promise<AnalysisResult> {
		if (!this.config) {
			throw new Error('Configuration not set');
		}

		const userPrompt = this.config.userPromptTemplate.replace(
			'{{content}}',
			content
		);

		const prompt: OpenAIRequest = {
			model: this.config.model,
			messages: [
				{
					role: 'system',
					content: this.config.systemPrompt,
				},
				{
					role: 'user',
					content: userPrompt,
				},
			],
		};

		return fetch(API_ENDPOINT, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify(prompt),
		})
			.then((response) => {
				if (!response.ok) {
					throw new Error(
						`API request failed with status ${response.status}`
					);
				}
				return response.json() as Promise<OpenAIResponse>;
			})
			.then((data) => {
				try {
					const messageContent = data.choices[0].message.content;
					// Extract JSON from the response
					const jsonMatch = messageContent.match(/\{[\s\S]*\}/);
					if (jsonMatch) {
						return JSON.parse(jsonMatch[0]) as AnalysisResult;
					} else {
						throw new Error('Failed to extract JSON from response');
					}
				} catch (e) {
					console.error('Error parsing response:', e);
					throw new Error('Failed to parse analysis results');
				}
			});
	}
}

// Export the service
export default new OpenAIService();
