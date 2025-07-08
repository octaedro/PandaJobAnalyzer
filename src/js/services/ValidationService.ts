/**
 * Validation Service
 * Centralizes all validation logic
 */

export interface ValidationResult {
	isValid: boolean;
	errors: string[];
}

export class ValidationService {
	/**
	 * Validate API key format
	 * @param apiKey
	 */
	static validateApiKey(apiKey: string): ValidationResult {
		const errors: string[] = [];

		if (!apiKey || typeof apiKey !== 'string') {
			errors.push('API key is required');
			return { isValid: false, errors };
		}

		if (apiKey.length < 10) {
			errors.push('API key is too short');
		}

		if (!apiKey.startsWith('sk-')) {
			errors.push('API key must start with "sk-"');
		}

		if (apiKey.includes(' ')) {
			errors.push('API key cannot contain spaces');
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Validate URL format
	 * @param url
	 */
	static validateUrl(url: string): ValidationResult {
		const errors: string[] = [];

		if (!url || typeof url !== 'string') {
			errors.push('URL is required');
			return { isValid: false, errors };
		}

		try {
			new URL(url);
		} catch {
			errors.push('Invalid URL format');
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Validate file upload
	 * @param file
	 * @param allowedTypes
	 */
	static validateFile(
		file: File,
		allowedTypes: string[] = ['application/pdf']
	): ValidationResult {
		const errors: string[] = [];

		if (!file) {
			errors.push('File is required');
			return { isValid: false, errors };
		}

		if (!allowedTypes.includes(file.type)) {
			errors.push(
				`File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`
			);
		}

		const maxSize = 5 * 1024 * 1024; // 5MB
		if (file.size > maxSize) {
			errors.push(
				`File size ${this.formatFileSize(file.size)} exceeds maximum allowed size of ${this.formatFileSize(maxSize)}`
			);
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Validate analysis results
	 * @param results
	 */
	static validateAnalysisResults(results: any): ValidationResult {
		const errors: string[] = [];

		if (!results || typeof results !== 'object') {
			errors.push('Results must be an object');
			return { isValid: false, errors };
		}

		// Check required fields
		const requiredFields = ['jobLocation', 'requiredSkills'];
		for (const field of requiredFields) {
			if (!(field in results)) {
				errors.push(`Missing required field: ${field}`);
			}
		}

		// Validate arrays
		if (
			'requiredSkills' in results &&
			!Array.isArray(results.requiredSkills)
		) {
			errors.push('requiredSkills must be an array');
		}

		if (
			'niceToHaveSkills' in results &&
			!Array.isArray(results.niceToHaveSkills)
		) {
			errors.push('niceToHaveSkills must be an array');
		}

		// Validate match score
		if ('match' in results) {
			const match = results.match;
			if (typeof match !== 'number' || match < 0 || match > 100) {
				errors.push('match must be a number between 0 and 100');
			}
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Validate resume data
	 * @param resumeData
	 */
	static validateResumeData(resumeData: any): ValidationResult {
		const errors: string[] = [];

		if (!resumeData || typeof resumeData !== 'object') {
			errors.push('Resume data must be an object');
			return { isValid: false, errors };
		}

		// Check for personal info
		if (
			!resumeData.personalInfo ||
			typeof resumeData.personalInfo !== 'object'
		) {
			errors.push('Personal info is required');
		} else {
			if (!resumeData.personalInfo.name) {
				errors.push('Name is required in personal info');
			}
		}

		// Validate experience array
		if (resumeData.experience && !Array.isArray(resumeData.experience)) {
			errors.push('Experience must be an array');
		}

		// Validate skills object
		if (resumeData.skills && typeof resumeData.skills !== 'object') {
			errors.push('Skills must be an object');
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Sanitize HTML input
	 * @param input
	 */
	static sanitizeHtml(input: string): string {
		return input
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	/**
	 * Validate and sanitize text input
	 * @param text
	 * @param maxLength
	 */
	static validateAndSanitizeText(
		text: string,
		maxLength: number = 10000
	): ValidationResult {
		const errors: string[] = [];

		if (!text || typeof text !== 'string') {
			errors.push('Text is required');
			return { isValid: false, errors };
		}

		if (text.length > maxLength) {
			errors.push(
				`Text length ${text.length} exceeds maximum allowed length of ${maxLength}`
			);
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Format file size for display
	 * @param bytes
	 */
	private static formatFileSize(bytes: number): string {
		if (bytes === 0) {
			return '0 Bytes';
		}

		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));

		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}
}
