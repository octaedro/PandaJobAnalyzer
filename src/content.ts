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
			const jobSelectors = [
				// LinkedIn
				'.jobs-description',
				'.jobs-description-content',
				'.jobs-box__html-content',
				// Indeed
				'#jobDescriptionText',
				'.jobsearch-jobDescriptionText',
				// Glassdoor
				'.jobDescriptionContent',
				'.desc',
				'.empInfo',
				// Monster
				'.job-description',
				// ZipRecruiter
				'.job_description',
				// RemoteOK
				'.description',
				// WeWorkRemotely
				'.listing-container',
				// AngelList/Wellfound
				'.job-description',
				'.decorated-job-posting',
				// Stack Overflow Jobs
				'.job-details__content',
				// GitHub Jobs
				'.markdown-body',
				// Generic selectors (try last)
				'[data-testid="job-description"]',
				'[data-automation="jobDescription"]',
				'[itemprop="description"]',
				'article',
				'main',
				'.main-content',
				'.job-content',
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
			// Send the extracted content back under the 'data' key for consistency
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
