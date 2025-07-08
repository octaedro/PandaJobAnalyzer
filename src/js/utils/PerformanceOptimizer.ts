/**
 * Performance Optimization Utilities
 * Provides caching, debouncing, and other performance improvements
 */

export interface CacheEntry<T> {
	data: T;
	timestamp: number;
	ttl: number;
}

export class MemoryCache<T> {
	private cache = new Map<string, CacheEntry<T>>();
	private maxSize: number;

	constructor(maxSize: number = 100) {
		this.maxSize = maxSize;
	}

	set(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
		// Clean expired entries if cache is full
		if (this.cache.size >= this.maxSize) {
			this.cleanExpired();

			// If still full, remove oldest entry
			if (this.cache.size >= this.maxSize) {
				const firstKey = this.cache.keys().next().value;
				if (firstKey !== undefined) {
					this.cache.delete(firstKey);
				}
			}
		}

		this.cache.set(key, {
			data,
			timestamp: Date.now(),
			ttl,
		});
	}

	get(key: string): T | null {
		const entry = this.cache.get(key);

		if (!entry) {
			return null;
		}

		// Check if expired
		if (Date.now() - entry.timestamp > entry.ttl) {
			this.cache.delete(key);
			return null;
		}

		return entry.data;
	}

	has(key: string): boolean {
		return this.get(key) !== null;
	}

	delete(key: string): boolean {
		return this.cache.delete(key);
	}

	clear(): void {
		this.cache.clear();
	}

	private cleanExpired(): void {
		const now = Date.now();
		for (const [key, entry] of this.cache.entries()) {
			if (now - entry.timestamp > entry.ttl) {
				this.cache.delete(key);
			}
		}
	}

	getStats() {
		return {
			size: this.cache.size,
			maxSize: this.maxSize,
			keys: Array.from(this.cache.keys()),
		};
	}
}

export class Debouncer {
	private timeouts = new Map<string, number>();

	debounce<T extends (...args: any[]) => any>(
		fn: T,
		delay: number,
		key: string = 'default'
	): (...args: Parameters<T>) => void {
		return (...args: Parameters<T>) => {
			const existingTimeout = this.timeouts.get(key);
			if (existingTimeout) {
				clearTimeout(existingTimeout);
			}

			const timeoutId = window.setTimeout(() => {
				fn(...args);
				this.timeouts.delete(key);
			}, delay);

			this.timeouts.set(key, timeoutId);
		};
	}

	cancel(key: string): void {
		const timeoutId = this.timeouts.get(key);
		if (timeoutId) {
			clearTimeout(timeoutId);
			this.timeouts.delete(key);
		}
	}

	cancelAll(): void {
		for (const timeoutId of this.timeouts.values()) {
			clearTimeout(timeoutId);
		}
		this.timeouts.clear();
	}
}

export class Throttler {
	private lastCall = new Map<string, number>();
	private timeouts = new Map<string, number>();

	throttle<T extends (...args: any[]) => any>(
		fn: T,
		delay: number,
		key: string = 'default'
	): (...args: Parameters<T>) => void {
		return (...args: Parameters<T>) => {
			const now = Date.now();
			const lastCallTime = this.lastCall.get(key) || 0;

			if (now - lastCallTime >= delay) {
				fn(...args);
				this.lastCall.set(key, now);
			} else {
				// Schedule for later if not already scheduled
				if (!this.timeouts.has(key)) {
					const timeoutId = window.setTimeout(
						() => {
							fn(...args);
							this.lastCall.set(key, Date.now());
							this.timeouts.delete(key);
						},
						delay - (now - lastCallTime)
					);

					this.timeouts.set(key, timeoutId);
				}
			}
		};
	}

	cancel(key: string): void {
		const timeoutId = this.timeouts.get(key);
		if (timeoutId) {
			clearTimeout(timeoutId);
			this.timeouts.delete(key);
		}
		this.lastCall.delete(key);
	}
}

export class BatchProcessor<T> {
	private batches = new Map<string, T[]>();
	private timeouts = new Map<string, number>();

	process(
		item: T,
		processor: (batch: T[]) => Promise<void>,
		options: {
			batchSize?: number;
			delay?: number;
			key?: string;
		} = {}
	): void {
		const { batchSize = 10, delay = 1000, key = 'default' } = options;

		if (!this.batches.has(key)) {
			this.batches.set(key, []);
		}

		const batch = this.batches.get(key)!;
		batch.push(item);

		// Process immediately if batch is full
		if (batch.length >= batchSize) {
			this.processBatch(key, processor);
			return;
		}

		// Reset timeout
		const existingTimeout = this.timeouts.get(key);
		if (existingTimeout) {
			clearTimeout(existingTimeout);
		}

		// Schedule processing
		const timeoutId = window.setTimeout(() => {
			this.processBatch(key, processor);
		}, delay);

		this.timeouts.set(key, timeoutId);
	}

	private async processBatch(
		key: string,
		processor: (batch: T[]) => Promise<void>
	): Promise<void> {
		const batch = this.batches.get(key);
		if (!batch || batch.length === 0) {
			return;
		}

		// Clear batch and timeout
		this.batches.set(key, []);
		const timeoutId = this.timeouts.get(key);
		if (timeoutId) {
			clearTimeout(timeoutId);
			this.timeouts.delete(key);
		}

		try {
			await processor(batch);
		} catch (error) {
			console.error('Batch processing error:', error);
		}
	}
}

export class LazyLoader {
	private observers = new Map<string, IntersectionObserver>();

	observe(
		element: Element,
		callback: () => void,
		options: IntersectionObserverInit = {}
	): string {
		const key = Math.random().toString(36).substr(2, 9);

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						callback();
						observer.disconnect();
						this.observers.delete(key);
					}
				});
			},
			{
				threshold: 0.1,
				...options,
			}
		);

		observer.observe(element);
		this.observers.set(key, observer);

		return key;
	}

	disconnect(key: string): void {
		const observer = this.observers.get(key);
		if (observer) {
			observer.disconnect();
			this.observers.delete(key);
		}
	}

	disconnectAll(): void {
		for (const observer of this.observers.values()) {
			observer.disconnect();
		}
		this.observers.clear();
	}
}

export class PerformanceMonitor {
	private metrics = new Map<string, number[]>();

	time(label: string): () => void {
		const start = performance.now();

		return () => {
			const duration = performance.now() - start;

			if (!this.metrics.has(label)) {
				this.metrics.set(label, []);
			}

			this.metrics.get(label)!.push(duration);

			// Keep only last 100 measurements
			const measurements = this.metrics.get(label)!;
			if (measurements.length > 100) {
				measurements.shift();
			}
		};
	}

	getStats(label: string) {
		const measurements = this.metrics.get(label);
		if (!measurements || measurements.length === 0) {
			return null;
		}

		const sorted = [...measurements].sort((a, b) => a - b);
		const avg =
			measurements.reduce((sum, val) => sum + val, 0) /
			measurements.length;
		const min = Math.min(...measurements);
		const max = Math.max(...measurements);
		const p50 = sorted[Math.floor(sorted.length * 0.5)];
		const p95 = sorted[Math.floor(sorted.length * 0.95)];

		return {
			count: measurements.length,
			avg: Math.round(avg * 100) / 100,
			min: Math.round(min * 100) / 100,
			max: Math.round(max * 100) / 100,
			p50: Math.round(p50 * 100) / 100,
			p95: Math.round(p95 * 100) / 100,
		};
	}

	getAllStats() {
		const stats: Record<string, any> = {};
		for (const label of this.metrics.keys()) {
			stats[label] = this.getStats(label);
		}
		return stats;
	}

	clear(label?: string): void {
		if (label) {
			this.metrics.delete(label);
		} else {
			this.metrics.clear();
		}
	}
}

// Singleton instances
export const cache = new MemoryCache(200);
export const debouncer = new Debouncer();
export const throttler = new Throttler();
export const batchProcessor = new BatchProcessor();
export const lazyLoader = new LazyLoader();
export const performanceMonitor = new PerformanceMonitor();
