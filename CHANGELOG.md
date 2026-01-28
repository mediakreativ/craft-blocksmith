# Changelog

All notable changes to Blocksmith will be documented in this file.

## 1.7.2 - 2026-01-28

### Added
- Craft CMS 5.9+ compatibility for Matrix fields with grouped entry types

### Fixed
- Cards View (Modal): Expandable containers now hidden correctly
- Cards View (Button Group): Groups wrapper positioned outside containers
- Blocks View (Modal): Duplicate button prevention for grouped structures

All fixes use DOM-based feature detection for backward compatibility with Craft < 5.9.

## 1.7.1 - 2025-11-29

### Fixed
- Prevent 403 error on login page by checking auth state before AJAX request

## 1.7.0 - 2025-09-20

### Added
- Site-level translations for block types, categories, and field names

## 1.6.9 - 2025-07-16

### Fixed
- Fixed an issue where the domain was stripped from selected asset URLs, causing broken preview images when using external asset domains (e.g. Servd CDN or S3)
- Resolved a JavaScript error (`MutationObserver.observe: Argument 1 must be an instance of Node`) that could occur if expected DOM elements were not yet rendered

## 1.6.8 - 2025-07-10

### Fixed
- Placeholder image in the Preview Modal now loads correctly on Craft installations running in a subfolder or with custom site URLs

## 1.6.7 - 2025-07-09

### Fixed
- Resolved DisclosureMenu conflicts in Live Preview by ensuring that all grouped button dropdowns now have unique IDs for proper menu handling

## 1.6.6 - 2025-07-07

### Fixed
- Fixed wrong block positioning when using "Add block above" in Cards view
- Fixed missing "Add new block" button and Button Group in Inline editable blocks view

## 1.6.5 - 2025-07-06

### Improved
- Refactored matrix field settings loading to use async/await with the Fetch API instead of deprecated synchronous AJAX requests

### Added
- Added missing translation string
