## [1.0.7-beta] - 2024-12-07

### Added
- Added a preview version of the Block Settings page, laying the groundwork for upcoming features.
- Full functionality will be introduced in a future release within the next few days.
- Prepared the structure for database migrations to support future features and enhancements.
- These migrations are currently inactive and will be rolled out in subsequent updates.

### Improvements
- Refactored the settings structure to support **multi-page settings views**.
- Minor code improvements for better readability and maintainability.

## [1.0.6-beta] - 2024-12-03

### Added
- Masonry.js integration for flexible previews.
- Improved block layout in the preview modal.
- Switched to local asset loading for Masonry.js and imagesLoaded.js.

## Fixed
- Minor performance optimizations.

## [1.0.5-beta] - 2024-12-02

Update button label logic to use Matrix field settings or default to 'New Entry'

## [1.0.4-beta] - 2024-12-02

Adjusted CSS to display blocks in a two-column grid layout

## [1.0.3-beta] - 2024-12-01

Removed obsolete \_settings folder

## [1.0.2-beta] - 2024-12-01

Small optimizations in CHANGELOG.md and README.md. Added skeleton for settings page.

## [1.0.1-beta] - 2024-12-01

### Fixed
- Fixed an issue where the "Add block above" button in the context menu was occasionally not disabled when the maximum number of entries was reached.

### Updated
- Additional optimizations and refactoring of the blocksmith.js file for better maintainability and performance.

## [1.0.0-beta] - 2024-11-30

## Initial beta release with:
- **Intuitive block selection via modal**: Effortlessly browse and add blocks with an easy-to-use modal interface, replacing Craft's default dropdown.
- **Enhanced block selection via context menu**: A dedicated "Add block above" button is available in the context menu, replacing native individual buttons for every entry type (e.g., "Add xyz above").
- **Block previews with fallback support**: Displays preview images for blocks, with a placeholder for missing previews.
- **Dynamic settings for preview image volumes and subfolders**: Customize the storage location for block preview images.
- **Language support**: Currently available in English, German, French, Spanish, Italian, Dutch, Portuguese, Russian, and Ukrainian.
- **Current limitation**: Block preview images must be named after their handle and stored in the configured asset volume. This will soon be replaced with a user-friendly upload feature directly in the plugin settings.
