console.log('--- Panda Job Analyzer Content Script Loaded ---');

// This script runs in the context of the webpage
// It helps extract job posting content from the page

// Listen for messages from the extension
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	// Match the action sent from app.ts
	if (request.action === 'parseJob') {
		console.log('Content script received parseJob request.'); // Debug log
		try {
			// Try to find common job listing containers first
			let jobContent = '';

			// Common job listing selectors for various job sites
			// Prioritize more specific IDs/classes, then common structural tags
			const jobSelectors = [
				// Ashby
				'div[class*="_content_"]',
				// Indeed
				'#jobDescriptionText',
				'.jobsearch-jobDescriptionText',
				// LinkedIn
				'.jobs-description__content .jobs-description-content__text', // More specific LinkedIn
				'.jobs-description-content__text',
				'.jobs-description-content',
				'.jobs-box__html-content',
				'.jobs-description',
				// Glassdoor (New generic + old ones)
				'div[class*="JobDetails_jobDescription"]',
				'.jobDescriptionContent',
				// ZipRecruiter
				'.job_description',
				// Greenhouse
				'.job__description.body',
				// Stack Overflow Jobs
				'.job-details__content .s-prose', // More specific SO
				'.job-details__content',
				// AngelList/Wellfound
				'.job-description',
				'.decorated-job-posting',
				// Generic data attributes
				'[data-testid="job-description"]',
				'[data-automation="jobDescription"]',
				'[itemprop="description"]',
				// Common class names
				'.job-details',
				'.job-description',
				'.jobDescription',
				'.job-content',
				'.description',
				// Structural elements (less reliable)
				'article',
				'main',
				'.main-content',
			];

			// Try to find job content using selectors with security validation
			for (const selector of jobSelectors) {
				try {
					const element = document.querySelector(selector);
					if (element && element instanceof HTMLElement) {
						// Use textContent for security (prevents script execution)
						const textContent = element.textContent || '';
						const trimmedContent = textContent.trim();
						
						// Validate content length and safety
						if (trimmedContent.length > 100 && trimmedContent.length < 50000) {
							// Basic content validation to prevent malicious content
							if (!trimmedContent.includes('<script>') && 
								!trimmedContent.includes('javascript:') &&
								!trimmedContent.includes('data:')) {
								jobContent = trimmedContent;
								break;
							}
						}
					}
				} catch (error) {
					// Skip invalid selectors
					continue;
				}
			}

			// If no specific job content found, try meta description with validation
			if (!jobContent) {
				try {
					const metaDescription = document.querySelector(
						'meta[name="description"]'
					);
					if (
						metaDescription &&
						(metaDescription as HTMLMetaElement).content
					) {
						const metaContent = (metaDescription as HTMLMetaElement).content;
						const title = document.title;
						
						// Validate meta content
						if (metaContent.length > 10 && metaContent.length < 1000 &&
							!metaContent.includes('<script>') &&
							!metaContent.includes('javascript:')) {
							jobContent = metaContent + '\n\n' + title;
						}
					}
				} catch (error) {
					// Skip if meta description access fails
				}
			}

			// If still no content, try gathering data from semantic elements with validation
			if (!jobContent) {
				try {
					const h1Text = Array.from(document.querySelectorAll('h1'))
						.map((el) => (el as HTMLElement).textContent || '')
						.filter(text => text.trim().length > 0 && text.trim().length < 500)
						.join('\n');
					const h2Text = Array.from(document.querySelectorAll('h2'))
						.map((el) => (el as HTMLElement).textContent || '')
						.filter(text => text.trim().length > 0 && text.trim().length < 500)
						.join('\n');

					if (h1Text || h2Text) {
						const combinedText = document.title + '\n\n' + h1Text + '\n\n' + h2Text;
						// Validate combined text
						if (combinedText.length < 10000 && 
							!combinedText.includes('<script>') &&
							!combinedText.includes('javascript:')) {
							jobContent = combinedText;
						}
					}
				} catch (error) {
					// Skip if semantic element access fails
				}
			}

			// If still no specific job content found, use entire body content with limits
			if (!jobContent || jobContent.length < 200) {
				try {
					const bodyText = document.body.textContent || '';
					// Limit body text to prevent excessive data extraction
					if (bodyText.length > 200 && bodyText.length < 100000) {
						jobContent = bodyText.substring(0, 50000); // Limit to 50KB
					}
				} catch (error) {
					jobContent = 'Error: Could not extract content from page';
				}
			}

			// Final validation of extracted content
			if (jobContent) {
				// Remove potential script tags and dangerous content
				jobContent = jobContent
					.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
					.replace(/javascript:/gi, '')
					.replace(/data:text\/html/gi, '')
					.trim();
				
				// Limit final content size
				if (jobContent.length > 50000) {
					jobContent = jobContent.substring(0, 50000) + '... [Content truncated for security]';
				}
			}

			console.log('Content script sending response.'); // Debug log
			// Revert to sending only the job content string
			sendResponse({ success: true, data: jobContent });
		} catch (error) {
			console.error('Error in content script:', error); // Debug log
			sendResponse({ success: false, error: (error as Error).message });
		}
		// Return true to indicate you wish to send a response asynchronously
		// This is crucial for keeping the message channel open.
		return true;
	}
	// Optional: handle other actions if needed
	// else if (request.action === "otherAction") { ... }

	// If the action is not recognized, it's good practice to return false or nothing
	// But in this case, only one action is expected, so we only need the 'return true' inside the 'if'.
});
