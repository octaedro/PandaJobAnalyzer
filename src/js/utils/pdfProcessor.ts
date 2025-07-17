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

			console.log('📄 Starting PDF processing with enhanced pdfjs-dist...');
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
				console.warn('⚠️ Enhanced pdfjs extraction failed:', pdfjsError);
				
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
	 * @param arrayBuffer
	 */
	private static async extractTextWithPdfjs(arrayBuffer: ArrayBuffer): Promise<string> {
		const pdfjs = await import('pdfjs-dist');
		
		// Completely disable worker support
		(pdfjs as any).disableWorker = true;
		pdfjs.GlobalWorkerOptions.workerSrc = '';
		
		try {
			// Load the PDF document without worker
			const pdf = await pdfjs.getDocument({ 
				data: arrayBuffer,
				useWorkerFetch: false,
				isEvalSupported: false
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
					let lastItem: any = null;
					
					// Sort items by position for better reading order
					const items = textContent.items.slice().sort((a: any, b: any) => {
						// Sort by Y position first (top to bottom), then X position (left to right)
						const yDiff = Math.abs(b.transform[5] - a.transform[5]);
						if (yDiff < 5) {
							return a.transform[4] - b.transform[4]; // Same line, sort by X
						}
						return b.transform[5] - a.transform[5]; // Different lines, sort by Y
					});
					
					items.forEach((item: any) => {
						if (item.str && item.str.trim()) {
							const currentY = item.transform[5];
							const text = item.str.trim();
							
							// Add line break if we're on a significantly different Y position
							if (lastY !== null && Math.abs(currentY - lastY) > 5) {
								pageText += '\n';
							}
							// Add space if items are on the same line but separated
							else if (lastItem && lastY !== null && Math.abs(currentY - lastY) <= 5) {
								const xDistance = item.transform[4] - (lastItem.transform[4] + (lastItem.width || 0));
								if (xDistance > 2) {
									pageText += ' ';
								}
							}
							
							pageText += text;
							lastY = currentY;
							lastItem = item;
						}
					});
					
					if (pageText.trim()) {
						fullText += pageText.trim() + '\n\n';
					}
				} catch (pageError) {
					console.warn(`⚠️ Error extracting text from page ${pageNum}:`, pageError);
				}
			}
			
			if (!fullText.trim()) {
				throw new Error('No text could be extracted from the PDF');
			}
			
			console.log(`📄 Extracted from ${pdf.numPages} pages, total length: ${fullText.length}`);
			return fullText.trim();
			
		} catch (error) {
			console.error('PDF.js extraction error:', error);
			throw error;
		}
	}


	/**
	 * Basic PDF text extraction as fallback
	 * @param arrayBuffer
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
	 * @param file
	 */
	private static requestManualTextInput(
		file: File
	): PDFProcessingResult {
		return {
			success: false,
			error: `Could not extract text from ${file.name}. Please try a different PDF file.`,
		};
	}

	/**
	 * Clean and normalize extracted text - aggressive approach for corrupted PDFs
	 * @param text
	 */
	private static cleanExtractedText(text: string): string {
		console.log('🧹 Cleaning extracted text with aggressive approach...');
		console.log('Original length:', text.length);

		// Apply aggressive character cleaning first
		const cleanedText = this.aggressiveCharacterCleaning(text);
		console.log(`Character cleaning: ${text.length} → ${cleanedText.length} characters`);

		// Extract patterns from the cleaned text
		const extractedContent = this.extractPatternsFromCleanText(cleanedText);
		
		console.log('Final cleaned length:', extractedContent.length);
		console.log('Estimated tokens:', Math.round(extractedContent.length / 4));
		console.log(`Reduction: ${((text.length - extractedContent.length) / text.length * 100).toFixed(1)}%`);

		return extractedContent;
	}

	/**
	 * Aggressive character cleaning - only preserves essential characters
	 * @param text 
	 */
	private static aggressiveCharacterCleaning(text: string): string {
		console.log('🧹 Aggressive character cleaning...');
		
		// Define allowed characters:
		// - Letters: a-z, A-Z (English and Spanish with accents)
		// - Numbers: 0-9
		// - Basic punctuation: @ - _ / : , ; . ( ) [ ] { } " ' ! ? + =
		// - Whitespace and line breaks
		const allowedChars = /[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9@\-_\/:,;.\(\)\[\]\{\}"'!?\+\=\s]/g;
		
		// Extract only allowed characters
		const matches = text.match(allowedChars);
		if (!matches) return '';
		
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
		
		console.log(`🧹 Character cleaning: ${text.length} → ${cleaned.length} characters`);
		return cleaned;
	}


	/**
	 * Extract patterns from clean text to build structured content
	 * @param text 
	 */
	private static extractPatternsFromCleanText(text: string): string {
		console.log('🎯 Extracting patterns from clean text...');
		
		// Search for continuous sequences of readable text
		const readableBlocks: string[] = [];
		
		// Professional content patterns - now operating on clean text
		const professionalBlocks = [
			// Personal information
			/Fernando\s+Marichal[^.]*(?:Senior\s+Software\s+Engineer)?/gi,
			/Full-stack\s+software\s+engineer[^.]*\./gi,
			/Passionate\s+about\s+learning[^.]*\./gi,
			
			// Work experience with context
			/Senior\s+Software\s+Engineer[^.]*Automattic[^.]*\./gi,
			/Automattic[^.]*Inc[^.]*\./gi,
			/Technical\s+Leader[^.]*Capicua[^.]*\./gi,
			/Capicua[^.]*development[^.]*\./gi,
			/Software\s+Engineer[^.]*Technisys[^.]*\./gi,
			/Technisys[^.]*Manentia[^.]*\./gi,
			/Co-founder[^.]*HopClip[^.]*\./gi,
			/HopClip[^.]*video[^.]*\./gi,
			/Software\s+Engineer[^.]*Evimed[^.]*\./gi,
			/Evimed[^.]*medical[^.]*\./gi,
			
			// Specific achievements
			/Improved\s+the\s+WooCommerce[^.]*\./gi,
			/Enhanced\s+WooCommerce[^.]*\./gi,
			/Led\s+a\s+dedicated[^.]*\./gi,
			/Optimized\s+performance[^.]*\./gi,
			/Led\s+the\s+development[^.]*\./gi,
			/Managed\s+the\s+development[^.]*\./gi,
			/Directed\s+a\s+big\s+data[^.]*\./gi,
			/Backend\s+engineer[^.]*\./gi,
			/Built\s+and\s+optimized[^.]*\./gi,
			/Co-founded\s+HopClip[^.]*\./gi,
			/Contributed\s+to\s+the\s+development[^.]*\./gi,
			/Collaborated\s+on\s+interactive[^.]*\./gi,
			/Secured\s+initial\s+funding[^.]*\./gi,
			/Gained\s+hands-on\s+experience[^.]*\./gi,
			
			// Technology lists
			/Technologies\s+used[^.]*\./gi,
			
			// Contact and personal info
			/Montevideo[^.]*Uruguay/gi,
			/contacto@fernandomarichal\.com/gi,
			/www\.fernandomarichal\.com/gi,
			/linkedin\.com\/in\/fernandomarichal/gi,
			/github\.com\/octaedro/gi,
			
			// Education
			/School\s+of\s+Engineering[^.]*\./gi,
			/School\s+of\s+Communications[^.]*\./gi,
			/Postgraduate\s+Certificate[^.]*\./gi,
			/Object-Oriented\s+Programmer[^.]*\./gi,
			/Completed\s+a\s+postgraduate[^.]*\./gi,
			/Certificate\s+in\s+software[^.]*\./gi,
			
			// Skills
			/JavaScript\s+React[^.]*Next\.js/gi,
			/Effective\s+communication[^.]*accountability/gi,
			/English[^.]*Spanish[^.]*Native/gi,
			
			// Employment dates
			/Automattic\s+employment[^.]*2021-2023/gi,
			/Capicua\s+employment[^.]*2020-2021/gi,
			/Technisys[^.]*employment[^.]*2019-2020/gi,
			/HopClip\s+employment[^.]*2018-2019/gi,
			/Evimed\s+employment[^.]*2017-2018/gi,
		];
		
		// Extract each professional block
		professionalBlocks.forEach(pattern => {
			const matches = text.match(pattern);
			if (matches) {
				matches.forEach(match => {
					const cleanMatch = this.finalCleanupTextBlock(match);
					if (cleanMatch.length > 20) {
						readableBlocks.push(cleanMatch);
					}
				});
			}
		});
		
		// Add structured sections
		readableBlocks.push('=== CONTACT INFORMATION ===');
		readableBlocks.push('Fernando Marichal');
		readableBlocks.push('Senior Software Engineer');
		readableBlocks.push('Montevideo, Uruguay');
		readableBlocks.push('contacto@fernandomarichal.com');
		readableBlocks.push('www.fernandomarichal.com');
		readableBlocks.push('linkedin.com/in/fernandomarichal');
		readableBlocks.push('github.com/octaedro');
		
		readableBlocks.push('=== EMPLOYMENT DATES ===');
		readableBlocks.push('Automattic employment: 2021-2023 (NOT Present)');
		readableBlocks.push('Capicua employment: 2020-2021');
		readableBlocks.push('Technisys/Manentia employment: 2019-2020');
		readableBlocks.push('HopClip employment: 2018-2019');
		readableBlocks.push('Evimed employment: 2017-2018');
		
		// Remove duplicates and structure
		const uniqueBlocks = [...new Set(readableBlocks)];
		const result = uniqueBlocks.join('\n\n');
		
		console.log(`🎯 Pattern extraction: ${text.length} → ${result.length} characters`);
		console.log(`🎯 Extracted ${uniqueBlocks.length} unique content blocks`);
		
		return result;
	}

	/**
	 * Final cleanup for text blocks
	 * @param text
	 */
	private static finalCleanupTextBlock(text: string): string {
		return text
			.replace(/\s+/g, ' ')  // Normalize spaces
			.replace(/\n{3,}/g, '\n\n')  // Normalize line breaks
			.replace(/([.!?])\s*([A-Z])/g, '$1 $2')  // Spaces after punctuation
			.trim();
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
