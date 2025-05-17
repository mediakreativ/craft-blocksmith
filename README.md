# Blocksmith Plugin for Craft CMS

**Blocksmith redefines the way you work with Craft CMS Matrix fields.** Forget long dropdown lists and experience a sleek preview modal for block selection. Whether you're adding a block via the "New entry" button or through the enhanced context menu, **Blocksmith** transforms block selection into a seamless and visually engaging experience – in both **Inline** and **Cards** view mode.

## Features

- **Intuitive preview modal for block/entry type selection**: Replaces Craft's native dropdown with a streamlined and visually enhanced modal interface.
- **Optional Button Group Mode**: Offers a faster selection method for fields with few block types – available for both inline and cards views.
- **Full Cards View compatibility**: Blocksmith fully supports Craft’s **"Cards" view mode** – including the ability to **add cards above/before existing ones**.
- **Context menu enhancements**: Add blocks directly above existing ones with the "Add block above" option, replacing Craft's native individual entry type buttons.
- **Flexible preview settings**:  
  Upload custom preview images via the Craft Asset Browser, or use handle-based image files stored in either an **Asset Volume** or the public folder `@webroot/blocksmith/previews` *(ideal for teams using version control or automated deployment workflows)*.
- **Enhanced layout and usability**: Masonry.js ensures a flexible and aesthetic grid layout, even for blocks with tall content previews.
- **Block settings management**: Easily manage block descriptions and preview images directly within the "Configure Blocks" section.
- **Category Management**: Organize blocks into categories and quickly filter them for a streamlined selection experience.
- **Language support**: The following languages are supported: English, German, French, Spanish, Italian, Dutch, Portuguese, Russian, Ukrainian, Arabic, Czech, Danish, Greek, Hebrew, Japanese, Korean, Polish, Swedish, Turkish, and Chinese. Need another language? Feel free to [contact us](mailto:plugins@mediakreativ.de) or submit a [feature request](https://github.com/mediakreativ/craft-blocksmith/issues).

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

1. **Optimizations for Multi-Site Setups**
   - Ensure that previews and settings work correctly in multi-site environments.

### Mid-Term

1. **Favorites Settings**
   - Setting for defining favorites.
   - By default, favorite block types will be displayed in the preview modal, with an option to switch to specific categories or all categories.

2. **Individual Button Label Settings for Each Matrix Field**
   - Allow configuration of button labels directly within Matrix field settings or override them with Blocksmith-specific settings.

3. **Individual Block Settings per Matrix Field**
   - Add the ability to configure block-specific settings (e.g., descriptions, preview images) individually for each Matrix field where the block is used.
   - **Example Use Case:** A block might need different preview images in different Matrix fields due to layout variations.

### Completed Features

1. **Flexible Image Upload for Previews**

   - Users can now upload custom preview images directly via the Craft File Browser or use handle-based previews.

2. **Masonry.js Integration for Flexible Previews**

   - Implemented a flexible grid layout using Masonry.js, allowing seamless display of blocks with varying preview dimensions (e.g., for very long content).

3. **Improved preview grid**

   - Option to display 3 blocks per row (Default: 2) in wide viewports.

4. **Categories for Blocks**

   - Users can assign blocks to categories and filter by them in the preview modal.

5. **Enable or Disable Previews**

   - Option to enable or disable previews for specific Matrix fields, improving workflow in nested Matrix setups.

6. ~~**Copy-/Paste-/Clone Functionality**~~  
   ~~Add functionality to copy, paste, and clone blocks within the same Matrix field or across fields, if they are allowed in the destination field.~~

   **No longer needed** – This is now natively supported as of **Craft 5.7.0**.

7. **"Cards" view mode support**
   - Integrate Blocksmith with the "Cards" view mode of Matrix fields.
  
8. **Button Groups**
   - Faster selection method as an alternative to the Preview Modal - for fields with few block types

## Note on the Roadmap

This roadmap provides an overview of planned and completed features. Priorities may shift based on user feedback or new requirements. For suggestions or inquiries, feel free to open an [issue on GitHub](https://github.com/mediakreativ/craft-blocksmith/issues).
