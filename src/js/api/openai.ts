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
	summary?: string;
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
				'- missing (array of specific things the candidate needs to achieve 100% match, e.g., ["Experience with AWS EC2", "React certification", "5+ years in leadership"])\n' +
				'- summary (string summarizing the match analysis, including location compatibility)\n'
			: '';

		const systemPrompt =
			'You are a helpful assistant that analyzes job listings and extracts key information. Return a JSON object with the following fields:\n' +
			baseFields +
			matchingFields +
			'\nIMPORTANT: Ensure all values are simple strings or arrays of strings. For salaryRange, min and max must be text strings, not objects.' +
			(resumeData
				? '\n\nSCORING RULES (CRITICAL):\n' +
					'1. LOCATION COMPATIBILITY (MAJOR FACTOR): Compare job location requirements with candidate location:\n' +
					'   - Perfect match (same country/region): No penalty\n' +
					'   - Remote work allowed and candidate can work remotely: No penalty\n' +
					'   - Location mismatch (e.g., "Remote-US" vs "Colombia"): Reduce score by 25-35 points\n' +
					'   - Visa requirements not met: Reduce score by 30-40 points\n' +
					'2. SKILL MATCHING:\n' +
					'   - Required skills: Each missing required skill reduces score by 10-15 points\n' +
					'   - Nice-to-have skills: Each missing nice-to-have skill reduces score by 3-5 points\n' +
					'3. EXPERIENCE MATCHING:\n' +
					'   - Years of experience: Significant mismatch reduces score by 10-20 points\n' +
					'   - Relevant experience: Missing relevant experience reduces score by 15-25 points\n' +
					'4. PERFECT MATCH CRITERIA:\n' +
					'   - Award 100% when all required skills, location compatibility, and experience requirements are met\n' +
					'   - If all requirements are met, "missing" array should be empty\n' +
					'5. SUMMARY REQUIREMENTS:\n' +
					'   - Always mention location compatibility\n' +
					'   - For 100% matches, use celebratory language like "🎉 Perfect match!" or "Excellent fit!"\n' +
					'   - For location mismatches, clearly state the impact\n' +
					'   - Keep explanations concise and friendly'
				: '');

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

				// Validate API key format for additional security
				if (!apiKey.startsWith('sk-') || apiKey.length < 20) {
					throw new Error('Invalid API key format');
				}

				const response = await fetch(API_ENDPOINT, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${apiKey}`,
						'User-Agent': 'PandaJobAnalyzer/1.0.0',
						'X-Request-ID': callId,
						'X-Requested-With': 'XMLHttpRequest',
						Origin: chrome.runtime.getURL(''),
					},
					body: JSON.stringify(prompt),
				});

				console.log(
					`📡 [${callId}] Response status: ${response.status} ${response.statusText}`
				);

				if (response.ok) {
					// Validate response headers for security
					const contentType = response.headers.get('content-type');
					if (
						!contentType ||
						!contentType.includes('application/json')
					) {
						throw new Error('Invalid response content type');
					}

					const data = (await response.json()) as OpenAIResponse;

					// Validate response structure
					if (
						!data.choices ||
						!Array.isArray(data.choices) ||
						data.choices.length === 0
					) {
						throw new Error('Invalid response structure');
					}

					const messageContent = data.choices[0].message.content;
					if (!messageContent || typeof messageContent !== 'string') {
						throw new Error('Invalid message content');
					}

					const jsonMatch = messageContent.match(/\{[\s\S]*\}/);
					if (jsonMatch) {
						console.log(
							`✅ [${callId}] ${requestType} - Success on attempt ${attempt}`
						);

						// Validate JSON before parsing
						const jsonString = jsonMatch[0];
						if (jsonString.length > 100000) {
							// 100KB limit
							throw new Error('Response JSON too large');
						}

						return JSON.parse(jsonString);
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
		return `You are an expert resume parser specializing in technical profiles. You MUST return a complete, valid JSON object. Do not truncate or cut off the response.

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
  "summary": "Brief professional summary highlighting key strengths and experience",
  "experience": [
    {
      "company": "Company Name",
      "position": "Job Title", 
      "from": "01-2020",
      "to": "12-2023",
      "description": "Comprehensive role description with context and responsibilities",
      "achievements": ["Quantified achievement with metrics", "Impact-focused achievement"],
      "technologies": ["JavaScript", "React", "Node.js", "PostgreSQL", "AWS", "Docker"]
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
    "technical": ["Programming Languages", "Frameworks", "Tools", "Platforms"],
    "soft": ["Leadership", "Communication", "Problem Solving"],
    "languages": ["English (Native)", "Spanish (Fluent)"]
  },
  "projects": [
    {
      "name": "Project Name",
      "description": "Detailed project description with impact and scope", 
      "technologies": ["React", "Node.js", "MongoDB"],
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

CRITICAL PARSING RULES:
1. Return ONLY valid JSON - no explanations, markdown, or extra text
2. Ensure the JSON is complete and properly closed with all brackets
3. Use "Not Available" for missing information

DATE EXTRACTION RULES (CRITICAL):
4. For experience dates, use MM-YYYY format (e.g., "01-2020", "12-2023")
5. If only year is available, use "01-YYYY" for start and "12-YYYY" for end
6. For "Present" or "Current" positions, use "Present" as the "to" value
7. IMPORTANT: Look for date patterns like "2020-2023", "2020 - 2023", "Jan 2020 - Dec 2023"
8. Extract dates from context: if text shows "Senior Software Engineer, Automattic Inc." followed by any date indicators
9. Common date formats to look for: "YYYY-YYYY", "MM/YYYY", "Month YYYY", "YYYY-Present"
10. If dates appear separately from job titles, match them by proximity and context

TECHNOLOGY EXTRACTION (MOST IMPORTANT):
- Extract ALL technical skills, technologies, programming languages, frameworks, tools, platforms, databases, cloud services, methodologies mentioned or implied
- Look for technical keywords in job descriptions, bullet points, achievements, and project descriptions
- Include both explicitly stated and contextually inferred technologies
- Use standard, full names: "JavaScript" not "JS", "PostgreSQL" not "Postgres", "Amazon Web Services" not "AWS"
- Common categories to look for: Programming Languages, Frameworks, Databases, Cloud Platforms, DevOps Tools, Testing Frameworks, Operating Systems, Version Control

ACHIEVEMENT EXTRACTION:
- Focus on quantified achievements with numbers, percentages, metrics
- Look for impact statements: "increased by X%", "reduced by X hours", "managed team of X"
- Include context about scope and scale of work
- Prioritize business impact over technical details

DESCRIPTION ENHANCEMENT:
- Provide comprehensive role descriptions that include context, responsibilities, and scope
- Avoid truncating important information
- Include industry context and company size when available
- Focus on accomplishments rather than just duties`;
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
		return `Analyze this resume thoroughly and extract all information according to the specified JSON structure. 

File: ${fileName}

Resume Content:
${extractedText}

EXTRACTION PRIORITIES:

1. DATE EXTRACTION (CRITICAL FOR EXPERIENCE):
   - Carefully scan for ANY date patterns: "2020-2023", "2020 - 2023", "Jan 2020 - Dec 2023", "2020-Present"
   - Look for dates near job titles and company names
   - Match dates to their corresponding jobs by proximity in the text
   - Be flexible with date formats but convert all to MM-YYYY format for "from" and "to" fields
   - If you find "2021" and "Present" near "Automattic", that's "from": "01-2021", "to": "Present"

2. TECHNOLOGY EXTRACTION (CRITICAL):
   - Scan every word for technical terms: programming languages, frameworks, databases, cloud services, tools, methodologies
   - Look in job descriptions, bullet points, achievements, project descriptions, and skills sections
   - Include variations and related technologies (e.g., if "web development" is mentioned, include HTML, CSS, JavaScript)
   - Extract version numbers when mentioned (e.g., "React 18", "Node.js 16")
   - Look for industry-standard abbreviations and expand them to full names

3. QUANTIFIED ACHIEVEMENTS:
   - Find all numbers, percentages, timeframes, team sizes, budget amounts, performance metrics
   - Look for impact statements: "improved", "increased", "reduced", "optimized", "managed", "led"
   - Calculate implied achievements from context
   - Include scale indicators: company size, project scope, user base

4. COMPREHENSIVE DESCRIPTIONS:
   - Extract full context for each role: company background, team structure, project scope
   - Include responsibilities AND accomplishments
   - Capture industry/domain knowledge
   - Note leadership, collaboration, and cross-functional work

5. COMPLETE PERSONAL INFO:
   - Check headers, footers, and contact sections thoroughly
   - Look for social media profiles, portfolios, personal websites
   - Extract location information including willingness to relocate

6. EDUCATION & CERTIFICATIONS:
   - Include all degrees, certificates, courses, bootcamps
   - Extract relevant coursework, thesis topics, academic projects
   - Note honors, awards, GPA if mentioned

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
	private generateCacheKey(
		content: string,
		resumeData?: ResumeData | null
	): string {
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
