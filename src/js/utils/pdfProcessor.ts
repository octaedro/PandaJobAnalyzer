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
	 * @param file - The file to validate
	 * @returns Validation result with success status and optional error message
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
	 * @param file - The PDF file to process
	 * @returns Promise resolving to PDF processing result
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

			console.log(
				'📄 Starting PDF processing with enhanced pdfjs-dist...'
			);
			console.log(
				'File:',
				file.name,
				'Size:',
				this.formatFileSize(file.size)
			);

			// Convert file to ArrayBuffer
			const arrayBuffer = await file.arrayBuffer();

			// Try enhanced pdfjs extraction
			let extractedText = '';
			try {
				extractedText = await this.extractTextWithPdfjs(arrayBuffer);
				console.log(
					'✅ Enhanced pdfjs extraction successful, text length:',
					extractedText.length
				);
			} catch (pdfjsError) {
				console.warn(
					'⚠️ Enhanced pdfjs extraction failed:',
					pdfjsError
				);

				// Fallback to basic text extraction
				try {
					extractedText = this.extractTextBasicMethod(arrayBuffer);
					console.log(
						'✅ Basic extraction successful, text length:',
						extractedText.length
					);
				} catch (basicError) {
					console.warn('⚠️ Basic extraction failed:', basicError);
					return this.requestManualTextInput(file);
				}
			}

			if (!extractedText || extractedText.trim().length < 50) {
				console.warn(
					'⚠️ Extracted text too short, requesting manual input'
				);
				return this.requestManualTextInput(file);
			}

			console.log('✅ Successfully extracted text:');
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
	 * Extract text from PDF using enhanced pdfjs-dist approach
	 * @param {ArrayBuffer} arrayBuffer - The PDF file as ArrayBuffer
	 * @returns {Promise<string>} Promise resolving to extracted text
	 */
	private static async extractTextWithPdfjs(
		arrayBuffer: ArrayBuffer
	): Promise<string> {
		const pdfjs = await import('pdfjs-dist');

		// Completely disable worker support
		(pdfjs as unknown as { disableWorker: boolean }).disableWorker = true;
		pdfjs.GlobalWorkerOptions.workerSrc = '';

		try {
			// Load the PDF document without worker
			const pdf = await pdfjs.getDocument({
				data: arrayBuffer,
				useWorkerFetch: false,
				isEvalSupported: false,
			}).promise;

			let fullText = '';

			// Extract text from each page with better text reconstruction
			for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
				try {
					const page = await pdf.getPage(pageNum);
					const textContent = await page.getTextContent();

					// Better text reconstruction that preserves reading order
					let pageText = '';
					let lastY: number | null = null;
					let lastItem: unknown = null;

					// Sort items by position for better reading order
					const items = (textContent.items as unknown[])
						.slice()
						.sort((a: unknown, b: unknown) => {
							// Sort by Y position first (top to bottom), then X position (left to right)
							const aTransform = (a as { transform: number[] })
								.transform;
							const bTransform = (b as { transform: number[] })
								.transform;
							const yDiff = Math.abs(
								bTransform[5] - aTransform[5]
							);
							if (yDiff < 5) {
								return aTransform[4] - bTransform[4]; // Same line, sort by X
							}
							return bTransform[5] - aTransform[5]; // Different lines, sort by Y
						});

					items.forEach((item: unknown) => {
						const typedItem = item as {
							str?: string;
							transform: number[];
							width?: number;
						};
						if (typedItem.str && typedItem.str.trim()) {
							const currentY = typedItem.transform[5];
							const text = typedItem.str.trim();

							// Add line break if we're on a significantly different Y position
							if (
								lastY !== null &&
								Math.abs(currentY - lastY) > 5
							) {
								pageText += '\n';
							}
							// Add space if items are on the same line but separated
							else if (
								lastItem &&
								lastY !== null &&
								Math.abs(currentY - lastY) <= 5
							) {
								const lastItemTyped = lastItem as {
									transform: number[];
									width?: number;
								};
								const xDistance =
									typedItem.transform[4] -
									(lastItemTyped.transform[4] +
										(lastItemTyped.width || 0));
								if (xDistance > 2) {
									pageText += ' ';
								}
							}

							pageText += text;
							lastY = currentY;
							lastItem = typedItem;
						}
					});

					if (pageText.trim()) {
						fullText += pageText.trim() + '\n\n';
					}
				} catch (pageError) {
					console.warn(
						`⚠️ Error extracting text from page ${pageNum}:`,
						pageError
					);
				}
			}

			if (!fullText.trim()) {
				throw new Error('No text could be extracted from the PDF');
			}

			console.log(
				`📄 Extracted from ${pdf.numPages} pages, total length: ${fullText.length}`
			);
			return fullText.trim();
		} catch (error) {
			console.error('PDF.js extraction error:', error);
			throw error;
		}
	}

	/**
	 * Basic PDF text extraction as fallback
	 * @param {ArrayBuffer} arrayBuffer - The PDF file as ArrayBuffer
	 * @returns {string} Extracted text string
	 */
	private static extractTextBasicMethod(arrayBuffer: ArrayBuffer): string {
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
	 * Request manual text input when automatic extraction fails
	 * @param {File} file - The PDF file that failed processing
	 * @returns {PDFProcessingResult} PDF processing result with error message
	 */
	private static requestManualTextInput(file: File): PDFProcessingResult {
		return {
			success: false,
			error: `Could not extract text from ${file.name}. Please try a different PDF file.`,
		};
	}

	/**
	 * Clean and normalize extracted text - aggressive approach for corrupted PDFs
	 * @param {string} text - The raw extracted text to clean
	 * @returns {string} Cleaned and normalized text
	 */
	private static cleanExtractedText(text: string): string {
		console.log('🧹 Cleaning extracted text with aggressive approach...');
		console.log('Original length:', text.length);

		// Apply aggressive character cleaning first
		const cleanedText = this.aggressiveCharacterCleaning(text);
		console.log(
			`Character cleaning: ${text.length} → ${cleanedText.length} characters`
		);

		// Extract patterns from the cleaned text
		const extractedContent = this.extractPatternsFromCleanText(cleanedText);

		console.log('Final cleaned length:', extractedContent.length);
		console.log(
			'Estimated tokens:',
			Math.round(extractedContent.length / 4)
		);
		console.log(
			`Reduction: ${(((text.length - extractedContent.length) / text.length) * 100).toFixed(1)}%`
		);

		return extractedContent;
	}

	/**
	 * Aggressive character cleaning - only preserves essential characters
	 * @param {string} text - The text to clean
	 * @returns {string} Text with only essential characters preserved
	 */
	private static aggressiveCharacterCleaning(text: string): string {
		console.log('🧹 Aggressive character cleaning...');

		// First, try to recover dates that might be corrupted by italic formatting
		const preprocessed = this.recoverCorruptedDates(text);

		// Define allowed characters:
		// - Letters: a-z, A-Z (English and Spanish with accents)
		// - Numbers: 0-9
		// - Basic punctuation: @ - _ / : , ; . ( ) [ ] { } " ' ! ? + =
		// - Whitespace and line breaks
		const allowedChars =
			/[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9@\-_/:,;.()[\]{}"'!?+=\s]/g;

		// Extract only allowed characters
		const matches = preprocessed.match(allowedChars);
		if (!matches) {
			return '';
		}

		let cleaned = matches.join('');

		// Clean problematic patterns that may remain
		cleaned = cleaned
			// Remove sequences of single characters (e.g., "a b c d e f")
			.replace(/\b[a-zA-Z]\s+[a-zA-Z]\s+[a-zA-Z]\s+[a-zA-Z]\b/g, ' ')
			.replace(/\b[a-zA-Z]\s+[a-zA-Z]\s+[a-zA-Z]\b/g, ' ')
			.replace(/\b[a-zA-Z]\s+[a-zA-Z]\b/g, ' ')

			// Remove isolated numbers that don't form dates or versions
			.replace(/\b\d{1,2}\s+(?!\d)/g, ' ')

			// Normalize whitespace
			.replace(/\s+/g, ' ')
			.replace(/\n\s*\n\s*\n/g, '\n\n')
			.trim();

		console.log(
			`🧹 Character cleaning: ${text.length} → ${cleaned.length} characters`
		);
		return cleaned;
	}

	/**
	 * Attempts to improve date extraction by normalizing common date corruption patterns
	 * @param {string} text - The text to normalize
	 * @returns {string} Text with normalized date patterns
	 */
	private static recoverCorruptedDates(text: string): string {
		console.log('📅 Attempting to normalize date patterns...');

		let recovered = text;

		// Generic patterns to help with date recognition in corrupted PDFs
		// Note: These patterns are available for future use if needed

		// Apply basic normalization
		recovered = recovered
			.replace(/\b20\s+(\d)\s+(\d)\b/g, '20$1$2')
			.replace(/P\s*r\s*e\s*s\s*e\s*n\s*t/gi, 'Present')
			.replace(/(\d{4})\s*[-–—]\s*(\d{4})/g, '$1-$2')
			.replace(
				/(\d{4})\s*[-–—]\s*(Present|Current|present|current)/gi,
				'$1-$2'
			);

		console.log(
			`📅 Date normalization applied, length: ${text.length} → ${recovered.length}`
		);
		return recovered;
	}

	/**
	 * Extract meaningful content from cleaned text using generic patterns
	 * @param {string} text - The cleaned text to extract patterns from
	 * @returns {string} Text with improved structure and formatting
	 */
	private static extractPatternsFromCleanText(text: string): string {
		console.log('🎯 Extracting patterns from clean text...');

		// Simply return the cleaned text with basic structure improvements
		// This approach is fully generic and works for any CV
		let result = text;

		// Add some basic structure to help OpenAI parse the content better
		result = result
			// Ensure proper spacing after periods
			.replace(/\.([A-Z])/g, '. $1')
			// Ensure proper spacing after commas
			.replace(/,([A-Z])/g, ', $1')
			// Normalize multiple spaces
			.replace(/\s{2,}/g, ' ')
			// Normalize line breaks
			.replace(/\n{3,}/g, '\n\n');

		console.log(
			`🎯 Generic pattern extraction: ${text.length} → ${result.length} characters`
		);

		return result.trim();
	}
	/**
	 * Sanitizes JSON data received from OpenAI to prevent XSS and other security issues
	 * @param {unknown} data - The data to sanitize
	 * @returns {unknown} Sanitized data object
	 */
	static sanitizeResumeData(data: unknown): unknown {
		if (!data || typeof data !== 'object') {
			return null;
		}

		// Recursively sanitize all string values
		const sanitizeValue = (value: unknown): unknown => {
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
				const sanitizedObj: Record<string, unknown> = {};
				const obj = value as Record<string, unknown>;
				for (const key in obj) {
					if (Object.prototype.hasOwnProperty.call(obj, key)) {
						sanitizedObj[key] = sanitizeValue(obj[key]);
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
	 * @param {number} bytes - The file size in bytes
	 * @returns {string} Formatted file size string
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
	 * @param {string} originalName - The original filename
	 * @returns {string} Safe filename for storage
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
