## [1.5.2] - 2025-05-17

### Improved
- Improved Button Group layout in Cards Grid view
- Improved UI consistency across settings views

### Added
Added missing translation strings

## [1.5.1] - 2025-05-16

### Fixed
- Prevented all Project Config changes in read-only environments (when `allowAdminChanges = false`)
- Fixed layout shift in Cards Grid view when injecting the Button Group UI

## [1.5.0] - 2025-05-15

### Added
- This release introduces the **Button Group Mode** - ideal for Matrix fields with a small number of block types  
  - Available in both **inline view** and **Cards View**, including **Grid View mode**  
  - "Add block above" / "Add block before" is fully supported

## [1.4.5] - 2025-05-10

### Fixed
- Settings could be modified even when `CRAFT_ALLOW_ADMIN_CHANGES=false` was set  
- All views now enforce read-only mode correctly: fields are disabled, save buttons hidden, and a warning is shown

### Removed
- Legacy database migrations (`src/legacy-migrations/`) have been removed

## [1.4.4] - 2025-05-09

### Added
- Support for new setting `Preview Image Storage Mode`: load block previews from the public folder `@webroot/blocksmith/previews/` or an Asset Volume.
- Deployment-friendly handle-based image previews when using `@webroot/blocksmith/previews/` - ideal for version control and team workflows.

## [1.4.3] - 2025-05-04

> [!NOTE]
> **Important: If you haven’t updated to **Blocksmith 1.4.2** yet, please read this carefully:**

As of Version 1.4.2 Blocksmith uses **Craft’s Project Config** to store all plugin settings.

If you’ve configured Blocksmith **only on your live server**, and not synced your local environment:

👉 Do **one** of the following **before updating**, to avoid overwriting live settings:

**Option 1:** Update Blocksmith on the **live server** → pull the updated Project Config to your local environment  
**Option 2:** Sync your **live database to local** → update Blocksmith locally → deploy the updated Project Config

✅ After updating, all settings will be stored in **Project Config YAML files**. No further steps required.

### Fixed
- Fixed issue where categories were not displayed in the block selection modal after updating to v1.4.2.

## [1.4.2] - 2025-04-29

> [!NOTE]
> **Important: Read before updating!**

Blocksmith now uses **Craft’s Project Config** to store all plugin settings.

If you’ve configured Blocksmith **only on your live server**, and not synced your local environment:

👉 Do **one** of the following **before updating**, to avoid overwriting live settings:

**Option 1:** Update Blocksmith on the **live server** → pull the updated Project Config to your local environment  
**Option 2:** Sync your **live database to local** → update Blocksmith locally → deploy the updated Project Config

✅ After updating, all settings will be stored in **Project Config YAML files**. No further steps required.

---

- This update automatically migrates all Blocksmith settings from the database to Project Config.
- Settings now stored in Project Config include:
  - Categories
  - Matrix field preview settings
  - Block descriptions and assigned categories
  - Preview image paths  
    *(Note: Preview images must still be uploaded manually to the live server.)*
    
## [1.4.1] - 2025-04-23

### Fixed
- “Add block above” now works correctly in Cards view when “Show cards in a grid” is enabled.

## [1.4.0] - 2025-04-21

### Highlights
This release brings **full Cards view compatibility** to Blocksmith, making it the first plugin to support true context-aware editing for Matrix fields using the “Cards” view mode – including the ability to add blocks above existing ones, a feature not natively available in Craft CMS.

### Added
- **Full Cards View compatibility**: Bring context-aware editing to the Cards view – including the unique ability to add blocks above existing ones, a feature not natively supported by Craft.
- **Single block type fallback in Cards view**: If only a single block type is available, the context menu shows an “Add {Blockname} above” button that opens the Craft Slideout and correctly positions the new block above.

## [1.3.0] - 2025-04-02

### Fixed
- Fixed access issues for non-admin users when fetching modal data.

## [1.2.7] - 2025-03-30

### Fixed
- Fixed an issue where newly created Matrix fields were not automatically registered in Blocksmith’s settings until the Matrix Settings were saved again.
  - Previously, clicking the “Add Block” button for such fields opened an empty modal.
  - Blocksmith now listens for Matrix field creation and automatically inserts the required DB record for preview support.
- When deleting a Matrix field, the corresponding record is now also cleaned up.

### Improved UX
Improved empty state messaging in the **Block Settings** area for greater clarity:
  - If no blocks exist, a "Create Matrix Field" button is now shown.
  - If all Matrix fields have preview disabled, a clear hint with a button to open the Matrix Field Settings appears.


## [1.2.6] - 2024-12-23

### Added
- Reorder categories via drag-and-drop in the Control Panel

## [1.2.5] - 2024-12-22

### Fixed
- Correct extraction of Matrix field handles for nested Matrix fields.
- Ensured proper handling of `fields-` prefix removal.

## [1.2.4] - 2024-12-20

### Fixed
- Preview jump when initializing Masonry (Thanks to David [(@davidwebca)](https://github.com/davidwebca) for the contribution!)
- Filtering of child Matrix elements; ensure only enabled Matrix fields are displayed in the modal (Thanks to David [(@davidwebca)](https://github.com/davidwebca) for the contribution!)

### Improvement
- Ensure only block types assigned to the current Matrix field are displayed in the modal.
- Categories are properly filtered and displayed based on visible blocks when opening the modal.


## [1.2.3] - 2024-12-15

### Added
- **Compatibility with Matrix Extended**: Matrix Extended's context menu button and button group are displayed when preview modal is disabled for a Matrix field.

## [1.2.2] - 2024-12-15
- Fixed typo in translation.

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
