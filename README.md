# Blocksmith Plugin for Craft CMS (Beta)

Blocksmith enhances Craft CMS Matrix fields by introducing a user-friendly modal interface for block selection, complete with block previews and intuitive controls.

This is the **beta release** of the Blocksmith plugin. While it is fully functional and tested, some features are still being finalized, and feedback is highly appreciated to further improve the plugin.

## Features

- **Intuitive modal for block/entry type selection**: Replace the native "New Entry" dropdown with a streamlined "Add new block" button that opens a modal featuring block previews for quick and easy selection.
- **Context menu enhancements**: Add blocks directly above existing ones with the "Add block above" option, replacing Craft's native individual entry type buttons.
- **Flexible preview settings**: Configure where preview images are stored, including support for asset volumes and optional subfolders.
- **Built-in translation support**: Currently available in English, German, French, Spanish, Italian, Dutch, Portuguese, Russian, and Ukrainian.  
  Need another language? Feel free to [contact us](mailto:plugins@mediakreativ.de) or submit a [feature request](https://github.com/mediakreativ/craft-blocksmith/issues).
- **Current limitation**: Block preview images must currently be named after their handle (e.g., `cta.png`) and placed in the configured asset volume. This workaround will soon be replaced with a dedicated file upload feature in the plugin settings.

## Requirements

- **Craft CMS**: Version 5.0.0 or later
- **PHP**: Version 8.2 or later

## Installation

Blocksmith can be installed via the Plugin Store or Composer.

### From the Plugin Store

1. Open your project’s Control Panel.
2. Go to the Plugin Store and search for “Blocksmith”.
3. Click “Install”.

### With Composer

Run the following commands in your terminal:

```bash
# Navigate to your project directory
cd /path/to/my-project.test

# Require the plugin
composer require mediakreativ/blocksmith

# Install the plugin
./craft plugin/install blocksmith
```
