# Blocksmith Plugin for Craft CMS

**Blocksmith** redefines the way you work with Craft CMS Matrix fields. Forget long dropdown lists and experience a sleek, modern modal for block selection, enhanced by visual previews and intuitive controls. Whether you're adding a block via the "New entry" button or through the enhanced context menu, **Blocksmith** transforms block selection into a seamless and visually engaging experience.

## Features

- **Intuitive modal for block/entry type selection**: Replaces Craft's native dropdown with a streamlined and visually enhanced modal interface, which also supports tall content types for better previews.
- **Context menu enhancements**: Add blocks directly above existing ones with the "Add block above" option, replacing Craft's native individual entry type buttons.
- **Enable or Disable Previews**: Option to enable or disable previews for specific Matrix fields, improving workflow in nested Matrix setups.
- **Flexible preview settings**: Upload custom preview images directly via the Craft Asset Browser or use handle-based preview images as an alternative if preferred.
- **Enhanced layout and usability**: Masonry.js ensures a flexible and aesthetic grid layout, even for blocks with tall content previews.
- **Block settings management**: Easily manage block descriptions and preview images directly within the "Configure Blocks" section.
- **Category and Favorite Management**: Organize blocks into categories and quickly filter or reset with the "All Categories" button.
- **Language support**: Available in the following languages: English, German, French, Spanish, Italian, Dutch, Portuguese, Russian, Ukrainian, Arabic, Czech, Danish, Greek, Finnish, Hebrew, Japanese, Korean, Polish, Swedish, Turkish, and Chinese. Need another language? Feel free to [contact us](mailto:plugins@mediakreativ.de) or submit a [feature request](https://github.com/mediakreativ/craft-blocksmith/issues).


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

Your feedback helps us improve! For feature requests or bug reports, please submit an [issue on GitHub](https://github.com/mediakreativ/craft-blocksmith/issues).  
You can also reach us directly via email at [plugins@mediakreativ.de](mailto:plugins@mediakreativ.de).

## Roadmap

### Short-Term

1. **Favorites Settings**
   - Setting for defining favorites.
   - By default, favorite block types will be displayed in the preview modal, with an option to switch to specific categories or all categories.

2. **Individual Button Label Settings for Each Matrix Field**
   - Allow configuration of button labels directly within Matrix field settings or override them with Blocksmith-specific settings.

3. **Individual Block Settings per Matrix Field**
   - Add the ability to configure block-specific settings (e.g., descriptions, preview images) individually for each Matrix field where the block is used.
   - **Example Use Case:** A block might need different preview images in different Matrix fields due to layout variations.

### Mid-Term

1. **Copy-/Paste-/Clone Functionality**
   - Add functionality to copy, paste, and clone blocks within the same Matrix field or across fields, if they are allowed in the destination field.

2. **Optimizations for Multi-Site Setups**
   - Ensure that previews and settings work correctly in multi-site environments.
   - **Example:** Preview images and categories should be configurable per site.
3. **More Complex Block Scenarios**
   - Support for nested Matrix fields and dependencies between block types.
   - Aim: Make Blocksmith compatible with advanced content structures commonly used in modern page builders.


### Long-Term

1. **Enhanced Cards and Element Index Support**
   - Integrate Blocksmith with the "Cards" view mode of Matrix fields.
   - Expand cards to display additional block information, such as live status or specific block content.
   - Add an option to enable/disable blocks directly within the card.
   - Improve the Element Index view to allow seamless modal integration and better information display.

2. **Integration with Third-Party Plugins**
   - Add compatibility with popular Craft plugins (e.g. Neo).
   - **Aim:** Seamless integration and support of extended Matrix field functionality.

### Completed Features

1. **Flexible Image Upload for Previews**
   - Users can now upload custom preview images directly via the Craft File Browser or use handle-based previews.

2. **Masonry.js Integration for Flexible Previews**
   - Implemented a flexible grid layout using Masonry.js, allowing seamless display of blocks with varying preview dimensions (e.g., for very long content).

3. **Improved preview grid**
   - Option to display 3 blocks per row (Default: 2) in wide viewports.

4. **Categories for Blocks**
   - Users can assign blocks to categories and filter by them in the preview modal.
Includes a new "All Categories" button to reset filters.

4. **Enable or Disable Previews**
   - Option to enable or disable previews for specific Matrix fields, improving workflow in nested Matrix setups.


## Note on the Roadmap

This roadmap provides an overview of planned and completed features. Priorities may shift based on user feedback or new requirements.For suggestions or inquiries, feel free to open an [issue on GitHub](https://github.com/mediakreativ/craft-blocksmith/issues).
