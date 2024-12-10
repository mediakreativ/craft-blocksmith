# Blocksmith Plugin for Craft CMS (Beta)

Blocksmith enhances the way you work with Craft CMS Matrix fields. Say goodbye to dropdown lists and hello to a sleek modal for block selection, complete with visual previews and intuitive options.

This is the **beta release** of the Blocksmith plugin. While it is fully functional and tested, some features are still being finalized, and feedback is highly appreciated to further improve the plugin.

## Features

- **Intuitive modal for block/entry type selection**: Replaces Craft's native dropdown with a streamlined and visually enhanced modal interface, which also supports tall content types for better previews.
- **Context menu enhancements**: Add blocks directly above existing ones with the "Add block above" option, replacing Craft's native individual entry type buttons.
- **Flexible preview settings**: Configure where preview images are stored, including support for asset volumes and optional subfolders.
- **Language support**: Currently available in English, German, French, Spanish, Italian, Dutch, Portuguese, Russian, and Ukrainian.  
  Need another language? Feel free to [contact us](mailto:plugins@mediakreativ.de) or submit a [feature request](https://github.com/mediakreativ/craft-blocksmith/issues).
- **Current limitations**: Currently, preview images need to be named after their block handle (e.g., `textAndImage.png`). A dedicated file upload feature in the plugin settings is already in development.

## Requirements

- **Craft CMS**: 5.0.0+
- **PHP**: 8.2+

## Installation

Blocksmith can be installed via the Craft Plugin Store or Composer.

### From the Plugin Store

1. Open your project’s Control Panel.
2. Go to the Plugin Store and search for “Blocksmith”.
3. Click “Install”.

### With Composer

If you're new to Composer, follow these steps:

1. Open your terminal and navigate to your Craft project directory.
2. Run the commands below:

```bash
composer require mediakreativ/craft-blocksmith
./craft plugin/install blocksmith
```

## Feedback

Your feedback helps us improve!
For feature requests or bug reports, please submit an [issue on GitHub](https://github.com/mediakreativ/craft-blocksmith/issues).
You can also reach us directly via email at [plugins@mediakreativ.de](mailto:plugins@mediakreativ.de).


## **Roadmap**

### **Short-Term**

1. **Flexible Image Upload for Previews**
   - Currently, preview images must be named after the Entry Type handle to be recognized. This feature will allow uploading preview images independently of Entry Type handles, providing more flexibility in managing block previews.

2. **Categorization and Favorites Settings**
   - Setting for categorization of block types and defining favorites.
   - By default, the favorite block types will be displayed in the preview modal, with an option to switch to specific categories or all categories.

3. **Individual Settings for Each Matrix Field**
   - Allow configuration of button labels directly within Matrix field settings or override them with Blocksmith-specific settings.
   - Option to enable or disable previews for specific Matrix fields, improving workflow in nested Matrix setups.
  
4. **Individual Block Settings per Matrix Field**
   - Add the ability to configure block-specific settings (e.g., descriptions, preview images) individually for each Matrix field where the block is used.
   - Example Use Case: A block might need different preview images in different Matrix fields due to layout variations.

### **Mid-Term**

1. **Optimizations for Multi-Site Setups**
   - Ensure that previews and settings work correctly in multi-site environments.
   - Example: Preview images and categories should be configurable per site.

2. **More Complex Block Scenarios**
   - Support for nested Matrix fields and dependencies between block types.
   - Aim: Make Blocksmith compatible with advanced content structures commonly used in modern page builders.

3. **Copy-/Paste-/Clone Functionality**
   - Add functionality to copy, paste, and clone blocks within the same Matrix field or across fields, if they are allowed in the destination field.


### **Long-Term**

1. **Enhanced Cards and Element Index Support**
   - Integrate Blocksmith with the "Cards" view mode of Matrix fields.
   - Expand cards to display additional block information, such as live status or specific block content.
   - Add an option to enable/disable blocks directly within the card.
   - Improve the Element Index view to allow seamless modal integration and better information display.

2. **Integration with Third-Party Plugins**
   - Ensure compatibility with popular Craft plugins (e.g. Neo).
   - Aim for seamless integration and support of extended Matrix field functionality.


### **Completed Features**

- **Masonry.js Integration for Flexible Previews**
  - Implemented a flexible grid layout using Masonry.js, allowing seamless display of blocks with varying preview dimensions (e.g., for very long content).


### **Note on the Roadmap**

This roadmap provides an overview of planned and completed features. Priorities may shift based on user feedback or new requirements. For suggestions or inquiries, feel free to open an [issue on GitHub](https://github.com/mediakreativ/craft-blocksmith/issues).
