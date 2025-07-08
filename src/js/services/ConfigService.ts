/**
 * Configuration Service
 * Manages application configuration and settings
 */

export interface AppConfig {
	openai: {
		model: string;
		maxTokens: number;
		temperature: number;
		timeout: number;
		retries: number;
	};
	storage: {
		cacheExpiry: number;
		maxResultsPerUrl: number;
	};
	ui: {
		messageTimeout: number;
		loadingDelay: number;
	};
	validation: {
		maxFileSize: number;
		allowedFileTypes: string[];
		maxTextLength: number;
	};
	features: {
		enableResumeMatching: boolean;
		enableCaching: boolean;
		enableErrorReporting: boolean;
	};
}

export class ConfigService {
	private static instance: ConfigService;
	private config: AppConfig;

	private constructor() {
		this.config = this.getDefaultConfig();
	}

	/**
	 * Get singleton instance
	 */
	static getInstance(): ConfigService {
		if (!ConfigService.instance) {
			ConfigService.instance = new ConfigService();
		}
		return ConfigService.instance;
	}

	/**
	 * Get default configuration
	 */
	private getDefaultConfig(): AppConfig {
		return {
			openai: {
				model: 'gpt-4o-mini',
				maxTokens: 4000,
				temperature: 0.1,
				timeout: 60000,
				retries: 3,
			},
			storage: {
				cacheExpiry: 24 * 60 * 60 * 1000, // 24 hours
				maxResultsPerUrl: 10,
			},
			ui: {
				messageTimeout: 5000,
				loadingDelay: 500,
			},
			validation: {
				maxFileSize: 5 * 1024 * 1024, // 5MB
				allowedFileTypes: ['application/pdf'],
				maxTextLength: 50000,
			},
			features: {
				enableResumeMatching: true,
				enableCaching: true,
				enableErrorReporting: true,
			},
		};
	}

	/**
	 * Load configuration from external source
	 */
	async loadConfig(): Promise<void> {
		try {
			const response = await fetch('config.json');
			if (response.ok) {
				const externalConfig = await response.json();
				this.mergeConfig(externalConfig);
			}
		} catch (error) {
			console.warn(
				'Could not load external config, using defaults:',
				error
			);
		}
	}

	/**
	 * Merge external configuration with defaults
	 * @param externalConfig
	 */
	private mergeConfig(externalConfig: Partial<AppConfig>): void {
		this.config = this.deepMerge(this.config, externalConfig);
	}

	/**
	 * Deep merge two objects
	 * @param target
	 * @param source
	 */
	private deepMerge(target: any, source: any): any {
		const result = { ...target };

		for (const key in source) {
			if (
				source[key] &&
				typeof source[key] === 'object' &&
				!Array.isArray(source[key])
			) {
				result[key] = this.deepMerge(target[key] || {}, source[key]);
			} else {
				result[key] = source[key];
			}
		}

		return result;
	}

	/**
	 * Get full configuration
	 */
	getConfig(): AppConfig {
		return { ...this.config };
	}

	/**
	 * Get OpenAI configuration
	 */
	getOpenAIConfig() {
		return { ...this.config.openai };
	}

	/**
	 * Get storage configuration
	 */
	getStorageConfig() {
		return { ...this.config.storage };
	}

	/**
	 * Get UI configuration
	 */
	getUIConfig() {
		return { ...this.config.ui };
	}

	/**
	 * Get validation configuration
	 */
	getValidationConfig() {
		return { ...this.config.validation };
	}

	/**
	 * Get feature flags
	 */
	getFeatures() {
		return { ...this.config.features };
	}

	/**
	 * Update configuration
	 * @param updates
	 */
	updateConfig(updates: Partial<AppConfig>): void {
		this.config = this.deepMerge(this.config, updates);
	}

	/**
	 * Check if feature is enabled
	 * @param feature
	 */
	isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
		return this.config.features[feature];
	}

	/**
	 * Get environment-specific config
	 */
	getEnvironmentConfig(): Partial<AppConfig> {
		const isDevelopment = process.env.NODE_ENV === 'development';

		if (isDevelopment) {
			return {
				openai: {
					...this.config.openai,
					timeout: 30000, // Shorter timeout in development
				},
				ui: {
					...this.config.ui,
					messageTimeout: 10000, // Longer message timeout in development
				},
				features: {
					...this.config.features,
					enableErrorReporting: false, // Disable error reporting in development
				},
			};
		}

		return {};
	}

	/**
	 * Validate configuration
	 */
	validateConfig(): { isValid: boolean; errors: string[] } {
		const errors: string[] = [];

		// Validate OpenAI config
		if (this.config.openai.maxTokens <= 0) {
			errors.push('OpenAI maxTokens must be positive');
		}

		if (
			this.config.openai.temperature < 0 ||
			this.config.openai.temperature > 2
		) {
			errors.push('OpenAI temperature must be between 0 and 2');
		}

		if (this.config.openai.timeout <= 0) {
			errors.push('OpenAI timeout must be positive');
		}

		// Validate storage config
		if (this.config.storage.cacheExpiry <= 0) {
			errors.push('Cache expiry must be positive');
		}

		// Validate validation config
		if (this.config.validation.maxFileSize <= 0) {
			errors.push('Max file size must be positive');
		}

		if (this.config.validation.allowedFileTypes.length === 0) {
			errors.push('At least one file type must be allowed');
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Reset to default configuration
	 */
	resetToDefaults(): void {
		this.config = this.getDefaultConfig();
	}

	/**
	 * Export configuration
	 */
	exportConfig(): string {
		return JSON.stringify(this.config, null, 2);
	}

	/**
	 * Import configuration
	 * @param configJson
	 */
	importConfig(configJson: string): { success: boolean; error?: string } {
		try {
			const importedConfig = JSON.parse(configJson);
			const validation = this.validateConfig();

			if (!validation.isValid) {
				return {
					success: false,
					error: `Invalid configuration: ${validation.errors.join(', ')}`,
				};
			}

			this.mergeConfig(importedConfig);

			return { success: true };
		} catch (error) {
			return {
				success: false,
				error: `Failed to parse configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
			};
		}
	}
}
