/**
 * OpenAI API Service
 * Handles communication with the OpenAI API
 */

const API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

// Import dependencies
import { ResumeData } from '../storage/index';
import { cache, performanceMonitor } from '../utils/PerformanceOptimizer';
import { ValidationService } from '../services/ValidationService';
import { ErrorHandler, ErrorType } from '../services/ErrorHandler';

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
	match?: number;
	missing?: string[];
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
	 * @param {ResumeData | null} resumeData - Resume data for matching analysis
	 * @returns {OpenAIConfig} Default configuration
	 */
	getDefaultConfig(resumeData: ResumeData | null = null): OpenAIConfig {
		const baseFields =
			'- jobLocation (array of countries or regions)\n' +
			'- requiredSkills (array of strings)\n' +
			'- niceToHaveSkills (array of strings)\n' +
			'- companySummary (string)\n' +
			'- companyReviews (string or null)\n' +
			'- salaryRange (object with min and max properties as strings, example: {"min": "$50,000", "max": "$70,000"}, or null if not found)\n';

		const matchingFields = resumeData
			? '- match (integer from 1 to 100 representing how well the candidate matches the job)\n' +
				'- missing (array of specific things the candidate needs to achieve 100% match, e.g., ["Experience with AWS EC2", "React certification", "5+ years in leadership"])\n'
			: '';

		const systemPrompt =
			'You are a helpful assistant that analyzes job listings and extracts key information. Return a JSON object with the following fields:\n' +
			baseFields +
			matchingFields +
			'\nIMPORTANT: Ensure all values are simple strings or arrays of strings. For salaryRange, min and max must be text strings, not objects.';

		const userPromptTemplate = resumeData
			? 'Analyze this job listing and extract key information. Also analyze how well this candidate matches the job based on their resume data.\n\nJob listing: {{content}}\n\nCandidate resume data: {{resumeData}}'
			: 'Analyze this job listing and extract key information: {{content}}';

		return {
			model: 'gpt-4o-mini',
			systemPrompt,
			userPromptTemplate,
		};
	}

	/**
	 * Analyze job listing using OpenAI API
	 * @param {string} content - Job listing content
	 * @param {string} apiKey - OpenAI API key
	 * @param {ResumeData | null} resumeData - Optional resume data for matching analysis
	 * @returns {Promise<AnalysisResult>} Analysis results
	 */
	async analyzeJobListing(
		content: string,
		apiKey: string,
		resumeData?: ResumeData | null
	): Promise<AnalysisResult> {
		const endTimer = performanceMonitor.time('openai-analysis');
		const analysisId = Math.random().toString(36).substr(2, 9);

		try {
			// Validate inputs
			const apiKeyValidation = ValidationService.validateApiKey(apiKey);
			if (!apiKeyValidation.isValid) {
				throw ErrorHandler.handleValidationError(
					apiKeyValidation.errors
				);
			}

			const contentValidation =
				ValidationService.validateAndSanitizeText(content);
			if (!contentValidation.isValid) {
				throw ErrorHandler.handleValidationError(
					contentValidation.errors
				);
			}

			console.log(`🎯 [${analysisId}] analyzeJobListing called with:`);
			console.log(
				`📄 [${analysisId}] Content length: ${content.length} characters`
			);
			console.log(`👤 [${analysisId}] Has resume data: ${!!resumeData}`);

			// Check cache first
			const cacheKey = this.generateCacheKey(content, resumeData);
			const cachedResult = cache.get(cacheKey) as AnalysisResult | null;
			if (cachedResult) {
				console.log(`💾 [${analysisId}] Using cached result`);
				return cachedResult;
			}

			if (resumeData) {
				console.log(
					`📄 [${analysisId}] Resume data size: ${JSON.stringify(resumeData).length} characters`
				);
			}

			// Use single-call approach with optimized prompt
			console.log(
				`✅ [${analysisId}] Using single-call approach with optimized prompts`
			);

			if (!this.config) {
				this.config = this.getDefaultConfig(resumeData);
			}

			console.log(`🔄 [${analysisId}] Calling makeApiRequest...`);
			const result = await this.makeApiRequest(
				content,
				apiKey,
				resumeData
			);
			console.log(
				`✅ [${analysisId}] makeApiRequest completed successfully`
			);

			// Cache the result for 1 hour
			cache.set(cacheKey, result, 60 * 60 * 1000);

			return result;
		} catch (error) {
			if (error instanceof Error && 'type' in error) {
				throw error; // Already handled by ErrorHandler
			}
			throw ErrorHandler.createError(
				ErrorType.API,
				error instanceof Error ? error.message : 'Unknown error',
				error instanceof Error ? error : undefined,
				{ analysisId, contentLength: content.length }
			);
		} finally {
			endTimer();
		}
	}


	/**
	 * Make API request with retry logic for rate limiting
	 * @param {OpenAIRequest} prompt - The request payload
	 * @param {string} apiKey - OpenAI API key
	 * @param {string} requestType - Type of request for logging
	 * @param {number} maxRetries - Maximum retry attempts
	 * @returns {Promise<any>} Parsed response
	 */
	private async makeRequestWithRetry(
		prompt: OpenAIRequest,
		apiKey: string,
		requestType: string,
		maxRetries = 3
	): Promise<any> {
		const callId = Math.random().toString(36).substr(2, 9);
		const payloadSize = JSON.stringify(prompt).length;

		console.log(
			`🚀 [${callId}] Starting ${requestType} - Payload size: ${payloadSize} characters`
		);
		console.log(
			`📝 [${callId}] System prompt length: ${prompt.messages[0].content.length} chars`
		);
		console.log(
			`📝 [${callId}] User prompt length: ${prompt.messages[1].content.length} chars`
		);
		console.log(`🤖 [${callId}] Model: ${prompt.model}`);

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				console.log(
					`⏳ [${callId}] ${requestType} - Attempt ${attempt}/${maxRetries}`
				);

				const requestTimestamp = new Date().toISOString();
				console.log(
					`🌐 [${callId}] Making fetch request at ${requestTimestamp}`
				);

				const response = await fetch(API_ENDPOINT, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${apiKey}`,
					},
					body: JSON.stringify(prompt),
				});

				console.log(
					`📡 [${callId}] Response status: ${response.status} ${response.statusText}`
				);

				if (response.ok) {
					const data = (await response.json()) as OpenAIResponse;
					const messageContent = data.choices[0].message.content;
					const jsonMatch = messageContent.match(/\{[\s\S]*\}/);
					if (jsonMatch) {
						console.log(
							`✅ [${callId}] ${requestType} - Success on attempt ${attempt}`
						);
						return JSON.parse(jsonMatch[0]);
					} else {
						throw new Error(
							`Failed to extract JSON from ${requestType} response`
						);
					}
				} else {
					// Get error details from response
					let errorMessage = `${requestType} API request failed with status ${response.status}`;
					try {
						const errorData = await response.json();
						console.log(
							`❌ [${callId}] Error response:`,
							errorData
						);

						if (errorData.error) {
							if (errorData.error.code === 'insufficient_quota') {
								throw new Error(
									`💳 OpenAI Quota Exceeded\n\nYour OpenAI account has run out of credits. Please add credits to continue using the job analysis feature.\n\n🔗 Go to: https://platform.openai.com/account/billing`
								);
							} else if (
								errorData.error.code ===
									'rate_limit_exceeded' ||
								response.status === 429
							) {
								// Rate limited - calculate backoff delay
								const baseDelay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
								const jitter = Math.random() * 1000; // Add up to 1s random jitter
								const delay = baseDelay + jitter;

								console.log(
									`⏳ [${callId}] Rate limited (429). Waiting ${Math.round(delay / 1000)}s before attempt ${attempt + 1}...`
								);

								if (attempt < maxRetries) {
									await new Promise((resolve) =>
										setTimeout(resolve, delay)
									);
									continue;
								} else {
									throw new Error(
										`${requestType} failed after ${maxRetries} attempts due to rate limiting. Please wait a few minutes and try again.`
									);
								}
							} else {
								errorMessage = `OpenAI API Error: ${errorData.error.message || errorData.error.code}`;
							}
						}
					} catch (parseError) {
						// If we can't parse the error, use the original message
						console.log(
							`⚠️ [${callId}] Could not parse error response`
						);
					}

					throw new Error(errorMessage);
				}
			} catch (error) {
				if (attempt === maxRetries) {
					console.error(
						`${requestType} - Failed after ${maxRetries} attempts:`,
						error
					);
					throw error;
				}
				console.log(
					`${requestType} - Attempt ${attempt} failed, retrying...`
				);
			}
		}
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
			model: 'gpt-4o-mini',
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
      "from": "01-2020",
      "to": "12-2023",
      "description": "Role description",
      "achievements": ["Achievement 1", "Achievement 2"],
      "technologies": ["JavaScript", "React", "Node.js", "PostgreSQL"]
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
4. Keep descriptions concise to avoid truncation
5. For experience dates, use MM-YYYY format (e.g., "01-2020", "12-2023")
6. If only year is available, use "01-YYYY" for start and "12-YYYY" for end
7. IMPORTANT: For each experience, extract ALL technical skills, technologies, programming languages, frameworks, tools, platforms, databases, cloud services, etc. mentioned in the job description
8. Include both explicitly mentioned technologies and inferred ones from context (e.g., if they mention "web development", include HTML/CSS/JavaScript)
9. Use standard technology names (e.g., "JavaScript" not "JS", "PostgreSQL" not "Postgres")`;
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

Extract all personal information, work experience, education, skills, projects, and certifications from this resume text and return them in the specified JSON format. 

PAY SPECIAL ATTENTION TO:
- For each work experience, carefully identify and extract ALL technologies, programming languages, frameworks, databases, cloud platforms, tools, and technical skills mentioned or implied
- Look for technical keywords throughout the job descriptions, bullet points, and achievements
- Include both explicitly stated technologies and those that can be reasonably inferred from the context
- Use standard, full names for technologies (e.g., "JavaScript" not "JS", "PostgreSQL" not "Postgres", "Amazon Web Services" not "AWS")

Return ONLY the JSON, no additional text or explanations.`;
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
	 * @param {ResumeData | null} resumeData - Optional resume data for matching analysis
	 * @returns {Promise<AnalysisResult>} Analysis results
	 */
	private async makeApiRequest(
		content: string,
		apiKey: string,
		resumeData?: ResumeData | null
	): Promise<AnalysisResult> {
		if (!this.config) {
			throw new Error('Configuration not set');
		}

		let userPrompt = this.config.userPromptTemplate.replace(
			'{{content}}',
			content
		);

		// Add resume data if available and under character limit
		if (resumeData) {
			const resumeString = JSON.stringify(resumeData);
			console.log(`Resume data size: ${resumeString.length} characters`);
			console.log(`Job content size: ${content.length} characters`);

			// Allow much larger resume data - OpenAI can handle it easily
			if (resumeString.length <= 15000) {
				userPrompt = userPrompt.replace('{{resumeData}}', resumeString);
				console.log(
					`✅ Using resume data in analysis (${resumeString.length} chars)`
				);
			} else {
				console.log(
					`⚠️ Resume too large (${resumeString.length} chars), using original prompt without matching`
				);
				// If resume is too long, use the original prompt without matching
				userPrompt =
					'Analyze this job listing and extract key information: ' +
					content;
				this.config = this.getDefaultConfig(null); // Reset config to non-matching version
			}
		}

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

		console.log(
			`Final request size: ~${JSON.stringify(prompt).length} characters`
		);

		return this.makeRequestWithRetry(prompt, apiKey, 'job analysis');
	}

	/**
	 * Generate cache key for API requests
	 * @param content
	 * @param resumeData
	 */
	private generateCacheKey(content: string, resumeData?: ResumeData | null): string {
		const contentHash = this.hashString(content.substring(0, 1000)); // Use first 1000 chars
		const resumeHash = resumeData
			? this.hashString(JSON.stringify(resumeData).substring(0, 500))
			: 'no-resume';
		return `openai-${contentHash}-${resumeHash}`;
	}

	/**
	 * Simple hash function for cache keys
	 * @param str
	 */
	private hashString(str: string): string {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return Math.abs(hash).toString(36);
	}
}

// Export the service
export default new OpenAIService();
