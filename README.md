# Blocksmith Plugin for Craft CMS (Beta)

Blocksmith redefines the way you work with Craft CMS Matrix fields. Say goodbye to dropdown lists and hello to a sleek modal for block selection, complete with visual previews and intuitive options.

This is the **beta release** of the Blocksmith plugin. While it is fully functional and tested, some features are still being finalized, and feedback is highly appreciated to further improve the plugin.

## Features

- **Intuitive modal for block/entry type selection**: Replace the native "New Entry" dropdown with a streamlined "Add new block" button that opens a modal featuring block previews for quick and easy selection.
- **Context menu enhancements**: Add blocks directly above existing ones with the "Add block above" option, replacing Craft's native individual entry type buttons.
- **Flexible preview settings**: Configure where preview images are stored, including support for asset volumes and optional subfolders.
- **Built-in translation support**: Currently available in English, German, French, Spanish, Italian, Dutch, Portuguese, Russian, and Ukrainian.  
  Need another language? Feel free to [contact us](mailto:plugins@mediakreativ.de) or submit a [feature request](https://github.com/mediakreativ/craft-blocksmith/issues).
- **Current limitations**: Currently, preview images need to be named after their block handle (e.g., `textAndImage.png`). A dedicated file upload feature in the plugin settings is already in development.

## Requirements

- **Craft CMS**: 5.0.0+
- **PHP**: 8.2+

## Installation

Blocksmith can be installed via the Plugin Store or Composer.

### From the Plugin Store

1. Open your project’s Control Panel.
2. Go to the Plugin Store and search for “Blocksmith”.
3. Click “Install”.

### With Composer

If you're new to Composer, follow these steps:

1. Open your terminal and navigate to your Craft project directory.
2. Run the commands below:

```bash
composer require mediakreativ/blocksmith
./craft plugin/install blocksmith
```

## Feedback

Your feedback helps us improve!
For feature requests or bug reports, please submit an [issue on GitHub](https://github.com/mediakreativ/craft-blocksmith/issues).
You can also reach us directly via email at [plugins@mediakreativ.de](mailto:plugins@mediakreativ.de).
