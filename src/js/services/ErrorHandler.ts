/**
 * Error Handler Service
 * Centralizes error handling and logging
 */

export enum ErrorType {
	VALIDATION = 'VALIDATION',
	API = 'API',
	NETWORK = 'NETWORK',
	STORAGE = 'STORAGE',
	CHROME_API = 'CHROME_API',
	PARSING = 'PARSING',
	UNKNOWN = 'UNKNOWN',
}

export interface AppError {
	id: string;
	type: ErrorType;
	message: string;
	originalError?: Error;
	context?: Record<string, any>;
	timestamp: string;
	userFriendly: string;
}

export class ErrorHandler {
	private static errors: AppError[] = [];
	private static maxErrors = 50;

	/**
	 * Create a standardized error
	 * @param type
	 * @param message
	 * @param originalError
	 * @param context
	 */
	static createError(
		type: ErrorType,
		message: string,
		originalError?: Error,
		context?: Record<string, any>
	): AppError {
		const error: AppError = {
			id: Math.random().toString(36).substr(2, 9),
			type,
			message,
			originalError,
			context,
			timestamp: new Date().toISOString(),
			userFriendly: this.generateUserFriendlyMessage(
				type,
				message,
				originalError
			),
		};

		this.logError(error);
		this.storeError(error);

		return error;
	}

	/**
	 * Handle API errors specifically
	 * @param error
	 * @param context
	 */
	static handleApiError(error: any, context?: Record<string, any>): AppError {
		if (error.status === 401) {
			return this.createError(
				ErrorType.API,
				'Invalid API key',
				error,
				context
			);
		}

		if (error.status === 429) {
			return this.createError(
				ErrorType.API,
				'Rate limit exceeded',
				error,
				context
			);
		}

		if (error.status === 403) {
			return this.createError(
				ErrorType.API,
				'API access forbidden',
				error,
				context
			);
		}

		if (error.message?.includes('quota')) {
			return this.createError(
				ErrorType.API,
				'API quota exceeded',
				error,
				context
			);
		}

		return this.createError(
			ErrorType.API,
			error.message || 'API request failed',
			error,
			context
		);
	}

	/**
	 * Handle Chrome API errors
	 * @param error
	 * @param context
	 */
	static handleChromeApiError(
		error: any,
		context?: Record<string, any>
	): AppError {
		if (error.message?.includes('Cannot access contents')) {
			return this.createError(
				ErrorType.CHROME_API,
				'Cannot access page contents',
				error,
				context
			);
		}

		if (error.message?.includes('No tab with id')) {
			return this.createError(
				ErrorType.CHROME_API,
				'Tab not found or closed',
				error,
				context
			);
		}

		return this.createError(
			ErrorType.CHROME_API,
			error.message || 'Chrome API error',
			error,
			context
		);
	}

	/**
	 * Handle validation errors
	 * @param errors
	 * @param context
	 */
	static handleValidationError(
		errors: string[],
		context?: Record<string, any>
	): AppError {
		return this.createError(
			ErrorType.VALIDATION,
			`Validation failed: ${errors.join(', ')}`,
			undefined,
			context
		);
	}

	/**
	 * Handle network errors
	 * @param error
	 * @param context
	 */
	static handleNetworkError(
		error: any,
		context?: Record<string, any>
	): AppError {
		if (error.name === 'AbortError') {
			return this.createError(
				ErrorType.NETWORK,
				'Request timeout',
				error,
				context
			);
		}

		if (error.message?.includes('fetch')) {
			return this.createError(
				ErrorType.NETWORK,
				'Network connection failed',
				error,
				context
			);
		}

		return this.createError(
			ErrorType.NETWORK,
			error.message || 'Network error',
			error,
			context
		);
	}

	/**
	 * Handle storage errors
	 * @param error
	 * @param context
	 */
	static handleStorageError(
		error: any,
		context?: Record<string, any>
	): AppError {
		return this.createError(
			ErrorType.STORAGE,
			`Storage operation failed: ${error.message}`,
			error,
			context
		);
	}

	/**
	 * Handle parsing errors
	 * @param error
	 * @param context
	 */
	static handleParsingError(
		error: any,
		context?: Record<string, any>
	): AppError {
		return this.createError(
			ErrorType.PARSING,
			`Failed to parse data: ${error.message}`,
			error,
			context
		);
	}

	/**
	 * Generate user-friendly error messages
	 * @param type
	 * @param message
	 * @param originalError
	 */
	private static generateUserFriendlyMessage(
		type: ErrorType,
		message: string,
		originalError?: Error
	): string {
		switch (type) {
			case ErrorType.VALIDATION:
				return 'Please check your input and try again.';

			case ErrorType.API:
				if (message.includes('quota')) {
					return 'Your API quota has been exceeded. Please check your OpenAI account.';
				}
				if (message.includes('rate limit')) {
					return 'Too many requests. Please wait a moment and try again.';
				}
				if (message.includes('Invalid API key')) {
					return 'Your API key is invalid. Please check your settings.';
				}
				return 'API request failed. Please try again.';

			case ErrorType.NETWORK:
				return 'Network connection failed. Please check your internet connection.';

			case ErrorType.STORAGE:
				return 'Failed to save data. Please try again.';

			case ErrorType.CHROME_API:
				if (message.includes('Cannot access')) {
					return "Cannot access this page. Please make sure you're on a supported website.";
				}
				return 'Browser extension error. Please reload the page and try again.';

			case ErrorType.PARSING:
				return 'Failed to process the data. Please try again.';

			default:
				return 'An unexpected error occurred. Please try again.';
		}
	}

	/**
	 * Log error to console with security filtering
	 * @param error
	 */
	private static logError(error: AppError): void {
		// Filter sensitive information from context
		const safeContext = this.filterSensitiveInfo(error.context);
		
		// Only log essential information in production
		const isDevelopment = process.env.NODE_ENV === 'development';
		
		if (isDevelopment) {
			console.error(`[${error.type}] ${error.message}`, {
				timestamp: error.timestamp,
				context: safeContext,
				originalError: error.originalError,
			});
		} else {
			// In production, log minimal information
			console.error(`[${error.type}] ${error.message}`, {
				timestamp: error.timestamp,
				errorId: error.id,
			});
		}
	}

	/**
	 * Filter sensitive information from error context
	 * @param context
	 */
	private static filterSensitiveInfo(context: any): any {
		if (!context || typeof context !== 'object') {
			return context;
		}

		const filtered = { ...context };
		
		// Remove sensitive keys
		const sensitiveKeys = [
			'apiKey', 'password', 'token', 'secret', 'key',
			'authorization', 'auth', 'credential', 'session'
		];
		
		for (const key in filtered) {
			if (sensitiveKeys.some(sensitive => 
				key.toLowerCase().includes(sensitive.toLowerCase())
			)) {
				filtered[key] = '[REDACTED]';
			}
			
			// Recursively filter nested objects
			if (typeof filtered[key] === 'object' && filtered[key] !== null) {
				filtered[key] = this.filterSensitiveInfo(filtered[key]);
			}
		}

		return filtered;
	}

	/**
	 * Store error for debugging
	 * @param error
	 */
	private static storeError(error: AppError): void {
		this.errors.push(error);

		// Keep only the latest errors
		if (this.errors.length > this.maxErrors) {
			this.errors = this.errors.slice(-this.maxErrors);
		}
	}

	/**
	 * Get recent errors for debugging
	 */
	static getRecentErrors(): AppError[] {
		return [...this.errors];
	}

	/**
	 * Clear error history
	 */
	static clearErrors(): void {
		this.errors = [];
	}

	/**
	 * Get error statistics
	 */
	static getErrorStats(): Record<ErrorType, number> {
		const stats = {} as Record<ErrorType, number>;

		Object.values(ErrorType).forEach((type) => {
			stats[type] = 0;
		});

		this.errors.forEach((error) => {
			stats[error.type]++;
		});

		return stats;
	}

	/**
	 * Check if error is recoverable
	 * @param error
	 */
	static isRecoverableError(error: AppError): boolean {
		switch (error.type) {
			case ErrorType.NETWORK:
			case ErrorType.API:
				return (
					!error.message.includes('quota') &&
					!error.message.includes('Invalid API key')
				);

			case ErrorType.STORAGE:
			case ErrorType.PARSING:
				return true;

			case ErrorType.VALIDATION:
			case ErrorType.CHROME_API:
				return false;

			default:
				return false;
		}
	}
}
