# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2024-01-17

### Added
- **Dynamic Popup Height**: The popup now automatically adjusts its height based on content size, eliminating unnecessary scrolling
- **Generic PDF Parser**: Completely redesigned PDF parsing to work with any CV/resume, not just specific formats
- **Improved PDF Cleaning**: Enhanced text extraction from corrupted PDFs (especially Canva-generated ones) with 15% content reduction while preserving important information
- **Promise-based Height Adjustment**: Refactored `adjustPopupHeight()` to use Promises and `requestAnimationFrame` for better performance

### Improved
- **Code Quality**: Fixed all ESLint and TypeScript linting errors across the codebase
- **Type Safety**: Replaced all `any` types with proper TypeScript types for better type safety
- **Error Handling**: Added comprehensive error handling for PDF processing and height adjustments
- **Performance**: Debounced height adjustments to prevent multiple simultaneous calls

### Fixed
- **Popup Sizing**: Fixed issue where popup wouldn't shrink when switching to sections with less content (e.g., Settings)
- **PDF Text Extraction**: Improved handling of corrupted PDFs with mixed readable content and binary garbage
- **Date Extraction**: Enhanced date pattern recognition in corrupted italic text
- **UI Responsiveness**: Popup now properly adjusts when showing/hiding content like JSON viewer

### Technical Changes
- **JSDoc Documentation**: Added comprehensive JSDoc type annotations to all functions
- **Generic Approach**: Removed hardcoded patterns specific to individual CVs
- **Character Filtering**: Implemented aggressive character cleaning that preserves only essential characters
- **Height Management**: Improved overflow handling based on content size

### Removed
- **Test Files**: Cleaned up temporary test files used during development
- **Hardcoded Patterns**: Removed CV-specific hardcoded patterns from PDF processor
- **Unused Code**: Eliminated unused variables and functions

## [1.0.1] - 2024-01-10

### Initial Release
- Basic job posting analysis functionality
- Resume upload and processing
- OpenAI API integration for parsing
- Support for multiple job boards
- Basic popup interface

---

## Notes
- Version 1.1.0 focuses on improving PDF processing and user experience
- All changes maintain backward compatibility
- The extension now works with any CV format, not just specific ones