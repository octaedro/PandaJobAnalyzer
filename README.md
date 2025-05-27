# JobScope

A Chrome extension that analyzes job listings using OpenAI to extract key information:

- Job location/target countries
- Required skills
- Nice-to-have skills
- Company summary
- Company reviews
- Salary range

## Setup Instructions

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" using the toggle in the top-right corner
4. Click "Load unpacked" and select the extension directory
5. The JobScope icon (green magnifying glass) will appear in your browser toolbar

## Usage

1. Navigate to any job listing webpage
2. Click on the JobScope icon in your browser toolbar
3. Enter your OpenAI API key (if first time using)
4. Click "Parse this job!" button
5. View the analyzed job information

## Creating the Extension Icons

To complete the extension, you need to create three icon files in the `icons` directory:

- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

These should be green magnifying glass icons as specified. You can create these using any image editing software or use online icon generators.

## OpenAI API Key

This extension requires an OpenAI API key to function. Your API key is stored locally on your device and is never sent to any server other than OpenAI's API endpoints.

To get an API key:

1. Go to [OpenAI's platform website](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to API keys section
4. Create a new secret key

## Notes

- The extension works best on standard job listing pages
- If the extension has trouble identifying the job content, it will analyze the entire page

## License

This project is licensed under the MIT License.  
Copyright (c) 2025 Fernando Marichal.

See the [LICENSE](LICENSE) file for more details.
