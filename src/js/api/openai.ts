/**
 * OpenAI API Service
 * Handles communication with the OpenAI API
 */

const API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

// Import resume data type
/**
 * Internal dependencies
 */
import { ResumeData } from '../storage/index';

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
	 * Parse resume using OpenAI API with extracted text content
	 * @param {string} extractedText - Text content extracted from PDF
	 * @param {string} fileName - Original filename
	 * @param {string} apiKey - OpenAI API key
	 * @returns {Promise<ResumeData>} Parsed resume data
	 */
	async parseResume(
		extractedText: string,
		fileName: string,
		apiKey: string
	): Promise<ResumeData> {
		console.log('🤖 Starting OpenAI resume parsing...');
		console.log('Input text length:', extractedText.length);

		const resumeSystemPrompt = this.getResumeSystemPrompt();
		const resumeUserPrompt = this.getResumeUserPrompt(
			extractedText,
			fileName
		);

		console.log(
			'📤 System prompt:',
			resumeSystemPrompt.substring(0, 200) + '...'
		);
		console.log('📤 User prompt:', resumeUserPrompt);

		const prompt: OpenAIRequest = {
			model: 'gpt-4',
			messages: [
				{
					role: 'system',
					content: resumeSystemPrompt,
				},
				{
					role: 'user',
					content: resumeUserPrompt,
				},
			],
		};

		console.log('🌐 Sending request to OpenAI...');
		const response = await fetch(API_ENDPOINT, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify(prompt),
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error('❌ OpenAI API error:', errorText);
			throw new Error(
				`API request failed with status ${response.status}: ${errorText}`
			);
		}

		const data = (await response.json()) as OpenAIResponse;

		try {
			const messageContent = data.choices[0].message.content;
			console.log('📥 OpenAI Response (raw):', messageContent);

			// Extract JSON from the response
			const jsonMatch = messageContent.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				console.log(
					'✅ Found JSON in response:',
					jsonMatch[0].substring(0, 200) + '...'
				);

				let jsonText = jsonMatch[0];

				// Try to fix common JSON issues
				try {
					const parsedData = JSON.parse(jsonText);

					// Add metadata
					parsedData.uploadedAt = new Date().toISOString();
					parsedData.fileName = fileName;

					console.log(
						'✅ Successfully parsed resume data:',
						parsedData
					);
					return parsedData as ResumeData;
				} catch (parseError) {
					console.warn(
						'⚠️ JSON parse failed, attempting to fix...',
						parseError
					);

					// Try to fix incomplete JSON
					jsonText = this.attemptJsonFix(jsonText);

					try {
						const parsedData = JSON.parse(jsonText);

						// Add metadata
						parsedData.uploadedAt = new Date().toISOString();
						parsedData.fileName = fileName;

						console.log(
							'✅ Successfully parsed fixed JSON:',
							parsedData
						);
						return parsedData as ResumeData;
					} catch (fixError) {
						console.error('❌ Failed to fix JSON:', fixError);
						throw new Error(
							'Failed to parse JSON even after fix attempt'
						);
					}
				}
			} else {
				console.error('❌ No JSON found in response');
				throw new Error('Failed to extract JSON from response');
			}
		} catch (e) {
			console.error('❌ Error parsing resume response:', e);
			throw new Error('Failed to parse resume data');
		}
	}

	/**
	 * Get system prompt for resume parsing
	 */
	private getResumeSystemPrompt(): string {
		return `You are a professional resume parser. You MUST return a complete, valid JSON object. Do not truncate or cut off the response.

REQUIRED JSON structure (fill with actual data from resume):
{
  "personalInfo": {
    "name": "Full Name",
    "email": "email@example.com", 
    "phone": "+1 (555) 123-4567",
    "location": "City, State",
    "linkedin": "https://linkedin.com/in/username",
    "github": "https://github.com/username",
    "website": "https://website.com"
  },
  "summary": "Brief professional summary",
  "experience": [
    {
      "company": "Company Name",
      "position": "Job Title", 
      "duration": "2020 - 2023",
      "description": "Role description",
      "achievements": ["Achievement 1", "Achievement 2"]
    }
  ],
  "education": [
    {
      "institution": "University Name",
      "degree": "Bachelor of Science",
      "fieldOfStudy": "Computer Science", 
      "graduationYear": "2020",
      "gpa": "3.8"
    }
  ],
  "skills": {
    "technical": ["JavaScript", "Python", "React"],
    "soft": ["Leadership", "Communication"],
    "languages": ["English (Native)", "Spanish (Fluent)"]
  },
  "projects": [
    {
      "name": "Project Name",
      "description": "Project description", 
      "technologies": ["React", "Node.js"],
      "url": "https://github.com/user/project"
    }
  ],
  "certifications": [
    {
      "name": "AWS Solutions Architect",
      "issuer": "Amazon",
      "date": "2022"
    }
  ]
}

CRITICAL RULES:
1. Return ONLY valid JSON - no explanations, markdown, or extra text
2. Ensure the JSON is complete and properly closed with all brackets
3. Use "Not Available" for missing information
4. Keep descriptions concise to avoid truncation`;
	}

	/**
	 * Get user prompt for resume parsing
	 * @param extractedText
	 * @param fileName
	 */
	private getResumeUserPrompt(
		extractedText: string,
		fileName: string
	): string {
		return `Please parse this resume text and extract all information according to the specified JSON structure. 

File: ${fileName}

Resume Content:
${extractedText}

Extract all personal information, work experience, education, skills, projects, and certifications from this resume text and return them in the specified JSON format. Return ONLY the JSON, no additional text or explanations.`;
	}

	/**
	 * Attempt to fix incomplete or malformed JSON
	 * @param jsonText
	 */
	private attemptJsonFix(jsonText: string): string {
		console.log('🔧 Attempting to fix JSON...');

		let fixed = jsonText.trim();

		// Count braces to see if we need to close them
		const openBraces = (fixed.match(/\{/g) || []).length;
		const closeBraces = (fixed.match(/\}/g) || []).length;
		const missingCloseBraces = openBraces - closeBraces;

		// Count brackets for arrays
		const openBrackets = (fixed.match(/\[/g) || []).length;
		const closeBrackets = (fixed.match(/\]/g) || []).length;
		const missingCloseBrackets = openBrackets - closeBrackets;

		console.log(
			`Missing closing braces: ${missingCloseBraces}, brackets: ${missingCloseBrackets}`
		);

		// Remove trailing comma if present
		fixed = fixed.replace(/,\s*$/, '');

		// Add missing closing brackets first
		for (let i = 0; i < missingCloseBrackets; i++) {
			fixed += ']';
		}

		// Add missing closing braces
		for (let i = 0; i < missingCloseBraces; i++) {
			fixed += '}';
		}

		// Try to fix common issues with incomplete strings
		fixed = fixed.replace(/,\s*[\]}]/g, '$1'); // remove trailing commas
		fixed = fixed.replace(/"[^"]*$/, '""'); // close incomplete strings

		console.log('🔧 Fixed JSON preview:', fixed.substring(0, 200) + '...');

		return fixed;
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
