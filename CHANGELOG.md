## [1.2.1] - 2024-12-15
- **New Feature**: Option to enable or disable previews for specific Matrix fields, improving workflow in nested Matrix setups.

## [1.2.0] - 2024-12-14

### Highlights
This marks the **end of the beta phase** for Blocksmith! With this stable release, we've introduced **categories for blocks**, enhanced the user experience in the preview modal, and ensured robust performance.

### Added
- **Categories for Blocks:** Users can now assign and manage categories for block types. Categories appear in the preview modal, allowing for streamlined filtering and faster block selection.
- **Improved Preview Modal:** Includes better category navigation and dynamic layouts powered by Masonry.js.
- **Stability Improvements:** Finalized functionality and bug fixes to ensure a stable, production-ready release.

## [1.1.1-beta] - 2024-12-11

Added support for new languages: ar, cs, da, el, fi, he, ja, ko, pl, sv, tr, zh

## [1.1.0-beta] - 2024-12-11

### Highlights
This release introduces the **flexible image upload for block previews** and makes the **Block Settings page** under "Configure Blocks" fully functional. Additionally, significant improvements to the user experience have been made, including the ability to choose between handle-based and uploaded preview images.

### Added
- **Flexible Preview Images for Blocks:**: In addition to handle-based preview images, users can now upload custom preview images directly via the Craft Asset Browser. Both handle-based and custom preview images are supported, offering greater flexibility in managing block previews.
- **Block Settings Page:**: The "Configure Blocks" section is now fully functional, allowing users to manage block descriptions and, if handle-based previews are disabled, upload or modify preview images.
- **Preview Modal Improvements:**: Added an option to display 3 blocks per row in wide viewports (≥1178px). The default remains 2 blocks per row.

### Improved
- **Usability:**: Automatic selection of a default volume for handle-based preview images prevents misconfigurations.
- **Performance:**: Improved AJAX requests for fetching and displaying block data and preview images, ensuring a faster and more reliable experience.

### Fixed
- Resolved an issue where handle-based preview images were not recognized if no volume was selected.
- Minor UI issues on the Block Settings page have been addressed.


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
