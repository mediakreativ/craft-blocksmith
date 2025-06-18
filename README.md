# Blocksmith Plugin for Craft CMS

**Blocksmith brings visual block selection to your Craft CMS Matrix fields.**  
Say goodbye to long dropdown lists - Blocksmith transforms block selection into an intuitive and elegant experience. Choose between two UI modes: **Preview Modal** (Pro only) or **Button Group** - individually configurable per Matrix field. Both are fully compatible with Inline and Cards view modes.

## Key Features

### Lite Edition

- **Full Cards view compatibility**  
Blocksmith fully supports Craft’s Cards view mode - including the ability to insert cards **above or before** existing ones.

- **Button Group UI mode**  
Quickly insert blocks via contextual buttons - ideal for fields with just a few block types. Fully compatible with both Inline and Cards views, including Grid mode.

- **Context menu enhancements**  
Add blocks directly above existing ones with the "Add block above" option - seamlessly replacing Craft’s native “Add {entry type} above” buttons with the Blocksmith UI.



### Pro Edition

Includes all Lite features, plus:

- **Preview Modal UI mode**  
A visual modal interface for selecting blocks. Includes image previews, category tabs, and search - fully compatible with both Inline and Cards views, including Grid mode.

- **Dynamic modal layout**  
Block previews are displayed in a gapless Masonry grid that adapts to varying image heights - for a clean and aesthetic visual experience.

 - **Categories management**  
 Define custom categories for your block types and display them as tabs in the Preview Modal - useful for filtering and organizing large block libraries.

- **Flexible preview image handling**  
Upload custom preview images via the Craft Asset Browser, or use handle-based image files stored in either an **Asset Volume** or the public folder `@webroot/blocksmith/previews` *(ideal for teams using version control or automated deployment workflows)*.

- **Block settings management**  
Easily manage block descriptions and preview images directly within the "Configure Blocks" section.

## Language support

Blocksmith is localized in:  
**Arabic, Chinese, Czech, Danish, Dutch, English, French, German, Greek, Hebrew, Italian, Japanese, Korean, Polish, Portuguese, Russian, Spanish, Swedish, Turkish, Ukrainian.** Need another language? Feel free to [contact us](mailto:plugins@mediakreativ.de) or [submit a feature request](https://github.com/mediakreativ/craft-blocksmith/issues).

## Requirements

- **Craft CMS**: 5.0.0+
- **PHP**: 8.2+

## Installation

Install Blocksmith via the [Craft Plugin Store](https://plugins.craftcms.com/blocksmith)  
or using Composer:

```bash
composer require mediakreativ/craft-blocksmith
./craft plugin/install blocksmith
```

## Feedback & Support

Your feedback helps us improve! For feature requests or bug reports, please submit an [issue on GitHub](https://github.com/mediakreativ/craft-blocksmith/issues). You can also reach us directly via email at [plugins@mediakreativ.de](mailto:plugins@mediakreativ.de).