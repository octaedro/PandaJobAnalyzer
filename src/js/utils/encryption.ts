/**
 * Encryption utilities for sensitive data
 * Uses Web Crypto API for secure encryption/decryption
 */

interface EncryptedData {
	encryptedData: string;
	iv: string;
	salt: string;
}

/**
 * Encryption service for protecting sensitive data
 */
export class EncryptionService {
	private static readonly ALGORITHM = 'AES-GCM';
	private static readonly KEY_LENGTH = 256;
	private static readonly IV_LENGTH = 12;
	private static readonly SALT_LENGTH = 16;

	/**
	 * Derives a key from a password using PBKDF2
	 * @param password - The password to derive key from
	 * @param salt - Salt for key derivation
	 * @returns Derived CryptoKey
	 */
	private static async deriveKey(
		password: string,
		salt: Uint8Array
	): Promise<CryptoKey> {
		const encoder = new TextEncoder();
		const keyMaterial = await crypto.subtle.importKey(
			'raw',
			encoder.encode(password),
			'PBKDF2',
			false,
			['deriveKey']
		);

		return crypto.subtle.deriveKey(
			{
				name: 'PBKDF2',
				salt: salt,
				iterations: 100000,
				hash: 'SHA-256',
			},
			keyMaterial,
			{ name: this.ALGORITHM, length: this.KEY_LENGTH },
			false,
			['encrypt', 'decrypt']
		);
	}

	/**
	 * Generates a device-specific password for encryption
	 * @returns Device-specific password
	 */
	private static async getDevicePassword(): Promise<string> {
		// Use extension ID + userAgent as base for device-specific encryption
		// NOTE: No timestamp to ensure the password is consistent across sessions
		const extensionId = chrome.runtime.id;
		const userAgent = navigator.userAgent;

		// Create a hash from device-specific data
		const data = `${extensionId}-${userAgent}-jobScope-v1`;
		const encoder = new TextEncoder();
		const hashBuffer = await crypto.subtle.digest(
			'SHA-256',
			encoder.encode(data)
		);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
	}

	/**
	 * Encrypts sensitive data
	 * @param data - Data to encrypt
	 * @returns Encrypted data with metadata
	 */
	public static async encrypt(data: string): Promise<EncryptedData> {
		try {
			const encoder = new TextEncoder();
			const dataBuffer = encoder.encode(data);

			// Generate random salt and IV
			const salt = crypto.getRandomValues(
				new Uint8Array(this.SALT_LENGTH)
			);
			const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

			// Derive key from device-specific password
			const password = await this.getDevicePassword();
			const key = await this.deriveKey(password, salt);

			// Encrypt the data
			const encryptedBuffer = await crypto.subtle.encrypt(
				{
					name: this.ALGORITHM,
					iv: iv,
				},
				key,
				dataBuffer
			);

			// Convert to base64 for storage
			const encryptedArray = Array.from(new Uint8Array(encryptedBuffer));
			const encryptedDataB64 = btoa(
				String.fromCharCode(...encryptedArray)
			);
			const ivB64 = btoa(String.fromCharCode(...iv));
			const saltB64 = btoa(String.fromCharCode(...salt));

			return {
				encryptedData: encryptedDataB64,
				iv: ivB64,
				salt: saltB64,
			};
		} catch (error) {
			console.error('Encryption failed:', error);
			throw new Error('Failed to encrypt data');
		}
	}

	/**
	 * Decrypts sensitive data
	 * @param encryptedData - Encrypted data with metadata
	 * @returns Decrypted data
	 */
	public static async decrypt(encryptedData: EncryptedData): Promise<string> {
		try {
			// Convert from base64
			const dataArray = new Uint8Array(
				atob(encryptedData.encryptedData)
					.split('')
					.map((char) => char.charCodeAt(0))
			);
			const salt = new Uint8Array(
				atob(encryptedData.salt)
					.split('')
					.map((char) => char.charCodeAt(0))
			);
			const iv = new Uint8Array(
				atob(encryptedData.iv)
					.split('')
					.map((char) => char.charCodeAt(0))
			);

			// Validate lengths
			if (
				salt.length !== this.SALT_LENGTH ||
				iv.length !== this.IV_LENGTH
			) {
				throw new Error(
					`Invalid salt (${salt.length}) or IV (${iv.length}) length`
				);
			}

			// Derive the same key
			const password = await this.getDevicePassword();
			const key = await this.deriveKey(password, salt);

			// Decrypt the data
			const decryptedBuffer = await crypto.subtle.decrypt(
				{
					name: this.ALGORITHM,
					iv: iv,
				},
				key,
				dataArray
			);

			const decoder = new TextDecoder();
			return decoder.decode(decryptedBuffer);
		} catch (error) {
			console.error('❌ Decryption failed:', error);
			console.error('📊 Error details:', {
				errorName: error instanceof Error ? error.name : 'Unknown',
				errorMessage:
					error instanceof Error ? error.message : String(error),
				encryptedDataValid: this.isEncrypted(encryptedData),
			});
			throw new Error('Failed to decrypt data');
		}
	}

	/**
	 * Checks if data is encrypted
	 * @param data - Data to check
	 * @returns True if data appears to be encrypted
	 */
	public static isEncrypted(data: any): data is EncryptedData {
		return (
			typeof data === 'object' &&
			data !== null &&
			typeof data.encryptedData === 'string' &&
			typeof data.iv === 'string' &&
			typeof data.salt === 'string'
		);
	}
}
