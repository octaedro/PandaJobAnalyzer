# Panda Job Analyzer

A Chrome extension that uses OpenAI's GPT-4o-mini to intelligently analyze job postings and match them against your resume. Get personalized insights about how well you fit each job and what you need to improve.

## Features

### 🔍 **Smart Job Analysis**

- Extract key job information (location, skills, salary, company details)
- Powered by OpenAI GPT-4o-mini for accurate parsing
- Works on most job posting websites

### 📄 **Resume Intelligence**

- Upload your resume (PDF format) once and reuse for all job analyses
- AI-powered resume parsing and structured data extraction
- Secure local storage - your resume data never leaves your device

### 🎯 **AI-Powered Job Matching**

- Get match percentage scores (1-100%) for each job posting
- Visual ranking system with color-coded indicators:
  - 🔴 Poor match (<45%)
  - 🟡 Medium match (45-65%)
  - 🟢 Good match (65-90%)
  - 🌟 Great match (90%+)
- Identify specific missing requirements to reach 100% match
- Personalized improvement suggestions

### 📊 **Interactive Results**

- **Job Details**: Location, skills, salary, requirements
- **Ranking**: Match percentage and missing requirements analysis
- **Info**: Company summary and additional details

## Setup Instructions

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" using the toggle in the top-right corner
4. Click "Load unpacked" and select the extension directory
5. The Panda Job Analyzer icon (green magnifying glass) will appear in your browser toolbar

## How to Use

### First Time Setup

1. Click the Panda Job Analyzer icon in your browser toolbar
2. Go to Settings (gear icon) → API Key tab
3. Enter your OpenAI API key and save
4. Go to Resume tab and upload your resume (PDF, max 2MB)
5. Your resume will be parsed and stored **locally** for all future job analyses

### Analyzing Jobs

1. Navigate to any job listing webpage
2. Click the Panda Job Analyzer icon
3. Click "Parse this job! 🔍" to analyze
4. View results in three tabs:
   - **Ranking**: See your match percentage and what you're missing
   - **Job Details**: Location, skills, salary requirements
   - **Info**: Company information and details

### Understanding Your Match Score

- **90%+ (Great match!)**: You're highly qualified - apply with confidence
- **65-90% (Good match)**: Strong candidate with minor gaps
- **45-65% (Medium match)**: Some qualifications missing but worth considering
- **<45% (Poor match)**: Significant skill gaps - consider if it's worth applying

The "Needed to reach 100%" section shows exactly what skills or experience you should develop to become a perfect candidate.

## OpenAI API Key

This extension requires an OpenAI API key to function. Your API key is stored locally on your device and is never sent to any server other than OpenAI's API endpoints.

To get an API key:

1. Go to [OpenAI's platform website](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to API keys section
4. Create a new secret key

## Technical Details

- **AI Model**: Uses OpenAI's GPT-4o-mini for optimal balance of speed, accuracy, and cost
- **Privacy**: All data (resume, API key) stored locally on your device
- **File Support**: PDF resume uploads up to 2MB
- **Retry Logic**: Built-in error handling and retry mechanisms for reliable API calls
- **Rate Limiting**: Intelligent request management to avoid API quota issues

## Troubleshooting

### Common Issues

- **"Quota exceeded" error**: Add credits to your OpenAI account at platform.openai.com/account/billing
- **No ranking tab**: Ensure your resume is uploaded and the job analysis completed successfully
- **Analysis fails**: Check that you're on a job posting page and your API key is valid

### Tips for Best Results

- Use the extension on dedicated job posting pages (LinkedIn, Indeed, company career pages)
- Ensure your resume PDF has clear, readable text (avoid image-only PDFs)
- Keep your resume updated in the extension when you make changes

## License

This project is licensed under the MIT License.  
Copyright (c) 2025 Fernando Marichal.

See the [LICENSE](LICENSE) file for more details.
