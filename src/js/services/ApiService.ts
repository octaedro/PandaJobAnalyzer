/**
 * Generic API Service Interface
 * Provides a standardized way to handle API requests
 */

export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: string;
	statusCode?: number;
}

export interface RequestConfig {
	timeout?: number;
	retries?: number;
	retryDelay?: number;
}

export abstract class BaseApiService {
	protected baseUrl: string;
	protected defaultConfig: RequestConfig;

	constructor(baseUrl: string, config: RequestConfig = {}) {
		this.baseUrl = baseUrl;
		this.defaultConfig = {
			timeout: 30000,
			retries: 3,
			retryDelay: 1000,
			...config,
		};
	}

	protected async makeRequest<T>(
		endpoint: string,
		options: RequestInit = {},
		config: RequestConfig = {}
	): Promise<ApiResponse<T>> {
		const finalConfig = { ...this.defaultConfig, ...config };
		const url = `${this.baseUrl}${endpoint}`;

		for (let attempt = 1; attempt <= finalConfig.retries!; attempt++) {
			try {
				const controller = new AbortController();
				const timeoutId = setTimeout(
					() => controller.abort(),
					finalConfig.timeout
				);

				const response = await fetch(url, {
					...options,
					signal: controller.signal,
				});

				clearTimeout(timeoutId);

				if (response.ok) {
					const data = await response.json();
					return {
						success: true,
						data,
						statusCode: response.status,
					};
				} else {
					const errorData = await response.json().catch(() => ({}));
					return {
						success: false,
						error:
							errorData.error?.message ||
							`HTTP ${response.status}`,
						statusCode: response.status,
					};
				}
			} catch (error) {
				if (attempt === finalConfig.retries) {
					return {
						success: false,
						error:
							error instanceof Error
								? error.message
								: 'Unknown error',
					};
				}

				// Wait before retry
				await new Promise((resolve) =>
					setTimeout(resolve, finalConfig.retryDelay! * attempt)
				);
			}
		}

		return {
			success: false,
			error: 'Max retries exceeded',
		};
	}

	protected handleRateLimiting(response: Response): boolean {
		return response.status === 429;
	}

	protected calculateBackoffDelay(attempt: number): number {
		return Math.min(Math.pow(2, attempt) * 1000, 30000);
	}
}
