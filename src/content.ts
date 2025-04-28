console.log('--- JobScope Content Script Loaded ---');

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

			// Try to find job content using selectors
			for (const selector of jobSelectors) {
				const element = document.querySelector(selector);
				if (
					element &&
					(element as HTMLElement).innerText.trim().length > 100
				) {
					// Only valid if has significant content
					jobContent = (element as HTMLElement).innerText;
					break;
				}
			}

			// If no specific job content found, try meta description
			if (!jobContent) {
				const metaDescription = document.querySelector(
					'meta[name="description"]'
				);
				if (
					metaDescription &&
					(metaDescription as HTMLMetaElement).content
				) {
					jobContent =
						(metaDescription as HTMLMetaElement).content +
						'\n\n' +
						document.title;
				}
			}

			// If still no content, try gathering data from semantic elements
			if (!jobContent) {
				const h1Text = Array.from(document.querySelectorAll('h1'))
					.map((el) => (el as HTMLElement).innerText)
					.join('\n');
				const h2Text = Array.from(document.querySelectorAll('h2'))
					.map((el) => (el as HTMLElement).innerText)
					.join('\n');

				if (h1Text || h2Text) {
					jobContent =
						document.title + '\n\n' + h1Text + '\n\n' + h2Text;
				}
			}

			// If still no specific job content found, use entire body content
			if (!jobContent || jobContent.length < 200) {
				jobContent = document.body.innerText;
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
