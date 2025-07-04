/**
 * Resume Manager
 * Handles resume upload, processing, and storage
 */

/**
 * Internal dependencies
 */
import storageService, { ResumeData } from './storage/index';
import { showMessage, type DOMElementCache } from './ui';
import { PDFProcessor } from './utils/pdfProcessor';
import openaiService from './api/openai';

/**
 * Retrieves the current resume data from storage
 * @returns {Promise<ResumeData | null>} The resume data or null if not found
 */
export function getResumeData(): Promise<ResumeData | null> {
	return storageService.getResumeData();
}

/**
 * Initializes the resume status and updates the UI accordingly
 * @param {DOMElementCache} elements - Cached DOM elements
 * @returns {Promise<boolean>} True if resume data exists, false otherwise
 */
export async function initializeResumeStatus(
	elements: DOMElementCache
): Promise<boolean> {
	const resumeData = await getResumeData();
	updateResumeDisplay(resumeData, elements);
	return !!resumeData;
}

/**
 * Handles file selection for resume upload
 * @param {File} file - The selected file
 * @param {DOMElementCache} elements - Cached DOM elements
 */
export function handleFileSelection(
	file: File,
	elements: DOMElementCache
): void {
	// Validate file
	const validation = PDFProcessor.validateFile(file);
	if (!validation.isValid) {
		showMessage(validation.error || 'Invalid file', elements, 'error');
		return;
	}

	// Update UI to show selected file
	updateFileDisplay(file, elements);

	// Enable upload button
	if (elements.uploadResumeBtn) {
		elements.uploadResumeBtn.disabled = false;
	}
}

/**
 * Handles the resume upload and processing
 * @param {File} file - The file to upload
 * @param {DOMElementCache} elements - Cached DOM elements
 * @returns {Promise<boolean>} True if upload was successful
 */
export async function handleResumeUpload(
	file: File,
	elements: DOMElementCache
): Promise<boolean> {
	try {
		// Show processing message
		showMessage('Processing resume...', elements);

		// Disable upload button during processing
		if (elements.uploadResumeBtn) {
			elements.uploadResumeBtn.disabled = true;
		}

		// Get API key
		const apiKey = await storageService.getApiKey();
		if (!apiKey) {
			showMessage(
				'Please configure your OpenAI API key first.',
				elements,
				'error'
			);
			return false;
		}

		// Extract text from PDF
		const pdfResult = await PDFProcessor.extractTextFromPDF(file);
		if (!pdfResult.success || !pdfResult.extractedText) {
			showMessage(
				pdfResult.error || 'Failed to extract text from PDF',
				elements,
				'error'
			);
			return false;
		}

		// Parse resume with OpenAI
		const resumeData = await openaiService.parseResume(
			pdfResult.extractedText,
			file.name,
			apiKey
		);

		// Sanitize data
		const sanitizedData = PDFProcessor.sanitizeResumeData(resumeData);
		if (!sanitizedData) {
			showMessage('Failed to process resume data', elements, 'error');
			return false;
		}

		// Save to storage
		await storageService.saveResumeData(sanitizedData);

		// Update UI
		updateResumeDisplay(sanitizedData, elements);
		clearFileDisplay(elements);

		showMessage('Resume processed and saved successfully!', elements);
		return true;
	} catch (error) {
		console.error('Resume upload error:', error);
		showMessage(
			error instanceof Error ? error.message : 'Failed to process resume',
			elements,
			'error'
		);
		return false;
	} finally {
		// Re-enable upload button
		if (elements.uploadResumeBtn) {
			elements.uploadResumeBtn.disabled = true; // Keep disabled until new file is selected
		}
	}
}

/**
 * Handles the resume deletion
 * @param {DOMElementCache} elements - Cached DOM elements
 */
export async function handleResumeDelete(
	elements: DOMElementCache
): Promise<void> {
	try {
		await storageService.deleteResumeData();
		updateResumeDisplay(null, elements);
		showMessage('Resume data deleted successfully.', elements);
	} catch (error) {
		console.error('Resume deletion error:', error);
		showMessage('Failed to delete resume data', elements, 'error');
	}
}

/**
 * Updates the resume display in the UI
 * @param {ResumeData | null} resumeData - The resume data to display
 * @param {DOMElementCache} elements - Cached DOM elements
 */
function updateResumeDisplay(
	resumeData: ResumeData | null,
	elements: DOMElementCache
): void {
	if (!elements.resumeUploaded) {
		return;
	}

	if (resumeData) {
		// Show uploaded status
		elements.resumeUploaded.classList.remove('hidden');

		// Update text to show filename and date
		if (elements.resumeInfoText) {
			const date = new Date(resumeData.uploadedAt).toLocaleDateString();
			elements.resumeInfoText.textContent = `Resume uploaded: ${resumeData.fileName} (${date})`;
		}
	} else {
		// Hide uploaded status
		elements.resumeUploaded.classList.add('hidden');
		// Also hide JSON viewer if it's open
		hideResumeJson(elements);
	}
}

/**
 * Updates the file display when a file is selected
 * @param {File} file - The selected file
 * @param {DOMElementCache} elements - Cached DOM elements
 */
function updateFileDisplay(file: File, elements: DOMElementCache): void {
	if (
		!elements.fileSelectedInfo ||
		!elements.fileName ||
		!elements.fileSize
	) {
		return;
	}

	// Show file info
	elements.fileSelectedInfo.classList.remove('hidden');
	elements.fileName.textContent = file.name;
	elements.fileSize.textContent = PDFProcessor.formatFileSize(file.size);

	// Hide upload zone
	if (elements.fileUploadZone) {
		elements.fileUploadZone.classList.add('hidden');
	}
}

/**
 * Clears the file display
 * @param {DOMElementCache} elements - Cached DOM elements
 */
function clearFileDisplay(elements: DOMElementCache): void {
	if (elements.fileSelectedInfo) {
		elements.fileSelectedInfo.classList.add('hidden');
	}

	if (elements.fileUploadZone) {
		elements.fileUploadZone.classList.remove('hidden');
	}

	// Clear file input
	if (elements.resumeFile) {
		elements.resumeFile.value = '';
	}

	// Disable upload button
	if (elements.uploadResumeBtn) {
		elements.uploadResumeBtn.disabled = true;
	}
}

/**
 * Handles the remove file button click
 * @param {DOMElementCache} elements - Cached DOM elements
 */
export function handleRemoveFile(elements: DOMElementCache): void {
	clearFileDisplay(elements);
}

/**
 * Shows the resume JSON data in a textarea
 * @param {DOMElementCache} elements - Cached DOM elements
 */
export async function showResumeJson(elements: DOMElementCache): Promise<void> {
	try {
		const resumeData = await storageService.getResumeData();
		if (!resumeData) {
			showMessage('No resume data found', elements, 'error');
			return;
		}

		if (elements.resumeJsonTextarea && elements.resumeJsonViewer) {
			// Format JSON nicely
			const formattedJson = JSON.stringify(resumeData, null, 2);
			elements.resumeJsonTextarea.value = formattedJson;

			// Show the JSON viewer
			elements.resumeJsonViewer.classList.remove('hidden');

			// Scroll to show the textarea
			elements.resumeJsonViewer.scrollIntoView({ behavior: 'smooth' });
		}
	} catch (error) {
		console.error('Error showing resume JSON:', error);
		showMessage('Failed to load resume data', elements, 'error');
	}
}

/**
 * Hides the resume JSON viewer
 * @param {DOMElementCache} elements - Cached DOM elements
 */
export function hideResumeJson(elements: DOMElementCache): void {
	if (elements.resumeJsonViewer) {
		elements.resumeJsonViewer.classList.add('hidden');
	}
}

export {};
