/**
 * Resume Processing Utility
 * Handles file validation and provides intelligent prompts for OpenAI processing
 */

export interface PDFProcessingResult {
	success: boolean;
	extractedText?: string;
	error?: string;
	metadata?: {
		fileSize: number;
		fileName: string;
		pageCount: number;
	};
}

export class PDFProcessor {
	private static readonly MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
	private static readonly SUPPORTED_MIME_TYPES = ['application/pdf'];

	/**
	 * Validates a PDF file before processing
	 * @param file
	 */
	static validateFile(file: File): { isValid: boolean; error?: string } {
		// Check file type
		if (
			!this.SUPPORTED_MIME_TYPES.includes(file.type) &&
			!file.name.toLowerCase().endsWith('.pdf')
		) {
			return { isValid: false, error: 'Only PDF files are supported' };
		}

		// Check file size
		if (file.size > this.MAX_FILE_SIZE) {
			return { isValid: false, error: 'File size exceeds 2MB limit' };
		}

		// Check if file is empty
		if (file.size === 0) {
			return { isValid: false, error: 'File is empty' };
		}

		return { isValid: true };
	}

	/**
	 * Processes resume file and extracts text locally
	 * @param file
	 */
	static async extractTextFromPDF(file: File): Promise<PDFProcessingResult> {
		try {
			// Validate file first
			const validation = this.validateFile(file);
			if (!validation.isValid) {
				return {
					success: false,
					error: validation.error,
				};
			}

			console.log('📄 Starting local PDF processing...');
			console.log(
				'File:',
				file.name,
				'Size:',
				this.formatFileSize(file.size)
			);

			// Convert file to ArrayBuffer
			const arrayBuffer = await file.arrayBuffer();

			// Try multiple extraction methods in order of preference
			let extractedText = '';

			try {
				// Method 1: Try basic PDF text extraction
				extractedText = await this.extractTextBasicMethod(arrayBuffer);
				console.log(
					'✅ Basic extraction successful, text length:',
					extractedText.length
				);
			} catch (basicError) {
				console.warn('⚠️ Basic extraction failed:', basicError);

				try {
					// Method 2: Try binary pattern matching
					extractedText =
						await this.extractTextPatternMatching(arrayBuffer);
					console.log(
						'✅ Pattern matching successful, text length:',
						extractedText.length
					);
				} catch (patternError) {
					console.warn('⚠️ Pattern matching failed:', patternError);

					// Method 3: Manual input fallback
					return this.requestManualTextInput(file);
				}
			}

			if (!extractedText || extractedText.trim().length < 50) {
				console.warn(
					'⚠️ Extracted text too short, requesting manual input'
				);
				return this.requestManualTextInput(file);
			}

			console.log('✅ Successfully extracted text locally:');
			console.log(
				'Text preview:',
				extractedText.substring(0, 300) + '...'
			);

			return {
				success: true,
				extractedText: this.cleanExtractedText(extractedText),
				metadata: {
					fileSize: file.size,
					fileName: this.generateSafeFileName(file.name),
					pageCount: 1,
				},
			};
		} catch (error) {
			console.error('❌ Resume processing error:', error);
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Failed to process resume',
			};
		}
	}

	/**
	 * Method 1: Basic PDF text extraction using simple binary analysis
	 * @param arrayBuffer
	 */
	private static async extractTextBasicMethod(
		arrayBuffer: ArrayBuffer
	): Promise<string> {
		const uint8Array = new Uint8Array(arrayBuffer);
		const pdfText = new TextDecoder('utf-8').decode(uint8Array);

		// Check if this is a valid PDF
		if (!pdfText.startsWith('%PDF-')) {
			throw new Error('Not a valid PDF file');
		}

		// Extract text using regex patterns for PDF text objects
		const textMatches = pdfText.match(/\((.*?)\)/g);
		if (!textMatches) {
			throw new Error('No text content found in PDF');
		}

		let extractedText = '';
		for (const match of textMatches) {
			// Remove parentheses and clean up the text
			const text = match
				.slice(1, -1)
				.replace(/\\n/g, '\n')
				.replace(/\\r/g, '\r')
				.replace(/\\t/g, '\t')
				.replace(/\\\(/g, '(')
				.replace(/\\\)/g, ')')
				.replace(/\\\\/g, '\\');

			if (text.length > 2 && /[a-zA-Z]/.test(text)) {
				extractedText += text + ' ';
			}
		}

		if (extractedText.length < 50) {
			throw new Error('Insufficient text extracted');
		}

		return extractedText.trim();
	}

	/**
	 * Method 2: Pattern matching extraction for more complex PDFs
	 * @param arrayBuffer
	 */
	private static async extractTextPatternMatching(
		arrayBuffer: ArrayBuffer
	): Promise<string> {
		const uint8Array = new Uint8Array(arrayBuffer);
		const pdfText = new TextDecoder('latin1').decode(uint8Array);

		// More advanced pattern matching for PDF streams
		const streamMatches = pdfText.match(/stream\s*(.*?)\s*endstream/g);
		if (!streamMatches) {
			throw new Error('No text streams found');
		}

		let extractedText = '';
		for (const stream of streamMatches) {
			// Remove stream markers
			const content = stream
				.replace(/^stream\s*/, '')
				.replace(/\s*endstream$/, '');

			// Try to extract readable text from the stream
			const readableText = this.extractReadableTextFromStream(content);
			if (readableText) {
				extractedText += readableText + ' ';
			}
		}

		if (extractedText.length < 50) {
			throw new Error('Insufficient readable text found');
		}

		return extractedText.trim();
	}

	/**
	 * Extract readable text from PDF stream content
	 * @param stream
	 */
	private static extractReadableTextFromStream(stream: string): string {
		let text = '';

		// Look for text between parentheses (standard PDF text)
		const textMatches = stream.match(/\([^)]*\)/g);
		if (textMatches) {
			for (const match of textMatches) {
				const cleanText = match.slice(1, -1);
				if (cleanText.length > 1 && /[a-zA-Z0-9]/.test(cleanText)) {
					text += cleanText + ' ';
				}
			}
		}

		// Look for text in angle brackets
		const angleMatches = stream.match(/<[^>]*>/g);
		if (angleMatches) {
			for (const match of angleMatches) {
				const hexText = match.slice(1, -1);
				try {
					// Try to decode hex-encoded text
					const decoded = this.hexToString(hexText);
					if (decoded && /[a-zA-Z]/.test(decoded)) {
						text += decoded + ' ';
					}
				} catch (e) {
					// Ignore hex decode errors
				}
			}
		}

		return text.trim();
	}

	/**
	 * Convert hex string to readable text
	 * @param hex
	 */
	private static hexToString(hex: string): string {
		if (hex.length % 2 !== 0) {
			return '';
		}

		let result = '';
		for (let i = 0; i < hex.length; i += 2) {
			const hexPair = hex.substring(i, i + 2);
			const charCode = parseInt(hexPair, 16);
			if (charCode >= 32 && charCode <= 126) {
				result += String.fromCharCode(charCode);
			}
		}
		return result;
	}

	/**
	 * Request manual text input when automatic extraction fails
	 * @param file
	 */
	private static async requestManualTextInput(
		file: File
	): Promise<PDFProcessingResult> {
		return {
			success: false,
			error: `Could not extract text from ${file.name}. Please try a different PDF file.`,
		};
	}

	/**
	 * Clean and normalize extracted text with default conservative approach
	 * @param text
	 */
	private static cleanExtractedText(text: string): string {
		console.log('🧹 Cleaning extracted text...');
		console.log('Original length:', text.length);

		// First try conservative cleaning
		let cleaned = this.cleanExtractedTextDefault(text);

		// If still too long, use aggressive cleaning
		const estimatedTokens = cleaned.length / 4; // rough estimate: 1 token ≈ 4 characters
		if (estimatedTokens > 7000) {
			// leaving buffer below 8192 limit
			console.log(
				'⚠️ Text still too long after default cleaning, using aggressive approach'
			);
			cleaned = this.cleanExtractedTextAggressive(text);
		}

		console.log('Final cleaned length:', cleaned.length);
		console.log('Estimated tokens:', Math.round(cleaned.length / 4));
		console.log('Cleaned preview:', cleaned.substring(0, 200) + '...');

		return cleaned;
	}

	/**
	 * Default conservative text cleaning - maintains formatting and structure
	 * @param text
	 */
	private static cleanExtractedTextDefault(text: string): string {
		console.log('🧹 Applying default (conservative) cleaning...');

		let cleaned = text
			// Remove binary/metadata noise more aggressively
			.replace(/[^\x09-\x0D\x20-\x7E]/g, ' ') // keep printable ASCII + common whitespace chars
			.replace(/\b[A-F0-9]{8,}\b/g, ' ') // remove hex strings (8+ chars)
			.replace(/D:\d{14}\+\d{2}'\d{2}'/g, ' ') // remove PDF timestamps
			.replace(/\b[A-Za-z0-9+/]{20,}={0,2}\b/g, ' ') // remove base64 strings
			.replace(/\b[a-f0-9]{16,}\b/gi, ' ') // remove hash-like strings
			.replace(/\\[a-zA-Z]{2,}/g, ' ') // remove PDF commands
			.replace(
				/\b(stream|endstream|obj|endobj|xref|trailer|mixed|Renderer|Canva|Producer|Creator|ModDate|CreationDate)\b/gi,
				' '
			) // remove PDF keywords
			.replace(/\([^)]{30,}\)/g, ' ') // remove long parenthetical content
			.replace(/\b[A-Z]{3,}\b/g, ' ') // remove long uppercase sequences
			.replace(/\b\d{4,}\b/g, ' ') // remove long number sequences
			.replace(/[{}[\]<>]/g, ' ') // remove brackets and braces
			.replace(/[^\w\s@.,-]/g, ' ') // keep only basic characters and punctuation
			.replace(/\s{2,}/g, ' ') // normalize whitespace
			.trim();

		// Extract meaningful sentences and words
		const sentences = cleaned.split(/[.!?]+/).filter((sentence) => {
			const words = sentence.trim().split(/\s+/);
			return (
				words.length >= 3 &&
				words.length <= 50 &&
				words.some((word) => word.length > 3 && /[a-zA-Z]/.test(word))
			);
		});

		cleaned = sentences.join('. ').trim();

		// Limit length but be more generous
		if (cleaned.length > 20000) {
			// ~5000 tokens worth
			let cutPoint = cleaned.lastIndexOf('.', 20000);
			if (cutPoint === -1) {
				cutPoint = cleaned.lastIndexOf(' ', 20000);
			}
			if (cutPoint === -1) {
				cutPoint = 20000;
			}
			cleaned = cleaned.substring(0, cutPoint) + '...';
			console.log('⚠️ Text truncated in default cleaning');
		}

		console.log('Default cleaning result length:', cleaned.length);
		return cleaned;
	}

	/**
	 * Aggressive text cleaning - removes more content to stay within limits
	 * @param text
	 */
	private static cleanExtractedTextAggressive(text: string): string {
		console.log('🧹 Applying aggressive cleaning...');

		let cleaned = text
			// Remove binary/metadata junk
			.replace(/[^\x20-\x7E\s]/g, ' ') // keep only printable ASCII + whitespace
			.replace(/\b[A-F0-9]{8,}\b/g, ' ') // remove hex strings
			.replace(/D:\d{14}\+\d{2}'\d{2}'/g, ' ') // remove date timestamps
			.replace(/\b[A-Za-z0-9+/]{20,}={0,2}\b/g, ' ') // remove base64-like strings
			.replace(/\b[a-f0-9]{32,}\b/gi, ' ') // remove MD5/SHA hashes
			.replace(/\\\w+/g, ' ') // remove backslash commands
			.replace(/\([^)]{50,}\)/g, ' ') // remove very long parenthetical content
			.replace(/[^\w\s@.-]/g, ' ') // keep only alphanumeric, email chars, and basic punctuation
			.replace(/\s+/g, ' ') // normalize whitespace
			.trim();

		// Extract meaningful words (filter out noise)
		const words = cleaned.split(/\s+/).filter((word) => {
			// Keep words that look like real content
			return (
				word.length >= 2 &&
				word.length <= 50 &&
				/[a-zA-Z]/.test(word) && // contains letters
				!/^\d+$/.test(word) && // not just numbers
				!/^[^a-zA-Z]*$/.test(word)
			); // not just symbols
		});

		// Rebuild text with only meaningful words
		cleaned = words.join(' ');

		// Further cleanup for common PDF artifacts
		cleaned = cleaned
			.replace(
				/\b(Canva|Renderer|mixed|stream|endstream|obj|endobj)\b/gi,
				' '
			)
			.replace(/\b[A-Z]{4,}\b/g, ' ') // remove long uppercase sequences (likely artifacts)
			.replace(/\s+/g, ' ')
			.trim();

		// Aggressive length limit
		if (cleaned.length > 24000) {
			// ~6000 tokens worth
			let cutPoint = cleaned.lastIndexOf(' ', 24000);
			if (cutPoint === -1) {
				cutPoint = 24000;
			}
			cleaned = cleaned.substring(0, cutPoint) + '...';
			console.log('⚠️ Text truncated in aggressive cleaning');
		}

		console.log('Aggressive cleaning result length:', cleaned.length);
		return cleaned;
	}

	/**
	 * Sanitizes JSON data received from OpenAI to prevent XSS and other security issues
	 * @param data
	 */
	static sanitizeResumeData(data: any): any {
		if (!data || typeof data !== 'object') {
			return null;
		}

		// Recursively sanitize all string values
		const sanitizeValue = (value: any): any => {
			if (typeof value === 'string') {
				// Remove potential script tags and other dangerous content
				let sanitized = value.replace(
					/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
					''
				);

				// Remove HTML tags
				sanitized = sanitized.replace(/<[^>]*>/g, '');

				// Decode HTML entities safely
				const textarea = document.createElement('textarea');
				textarea.textContent = sanitized;
				sanitized = textarea.textContent || '';

				// Limit string length for security
				const MAX_STRING_LENGTH = 1000;
				if (sanitized.length > MAX_STRING_LENGTH) {
					sanitized =
						sanitized.substring(0, MAX_STRING_LENGTH) + '...';
				}

				return sanitized.trim();
			} else if (Array.isArray(value)) {
				return value.map(sanitizeValue);
			} else if (typeof value === 'object' && value !== null) {
				const sanitizedObj: any = {};
				for (const key in value) {
					if (value.hasOwnProperty(key)) {
						sanitizedObj[key] = sanitizeValue(value[key]);
					}
				}
				return sanitizedObj;
			}
			return value;
		};

		return sanitizeValue(data);
	}

	/**
	 * Formats file size for display
	 * @param bytes
	 */
	static formatFileSize(bytes: number): string {
		if (bytes === 0) {
			return '0 Bytes';
		}

		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));

		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	/**
	 * Generates a safe filename for storage
	 * @param originalName
	 */
	static generateSafeFileName(originalName: string): string {
		// Remove potentially dangerous characters
		const safeName = originalName
			.replace(/[^a-zA-Z0-9.-]/g, '_')
			.replace(/_{2,}/g, '_')
			.toLowerCase();

		// Ensure it has .pdf extension
		if (!safeName.endsWith('.pdf')) {
			return safeName + '.pdf';
		}

		return safeName;
	}
}
