# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Code Formatting
- `npm run format` - Format all files with Prettier
- `npm run check-format` - Check if files are properly formatted
- `npm run fix-format` - Fix formatting issues with Prettier

### Craft CMS Plugin Development
- `composer install` - Install PHP dependencies
- `./craft plugin/install blocksmith` - Install the plugin in a Craft CMS project
- `./craft plugin/uninstall blocksmith` - Uninstall the plugin

### Testing & Validation
- No specific test suite configured
- Run `npm run check-format` to validate code formatting
- Test plugin functionality within a Craft CMS installation

## Architecture Overview

### Plugin Information
- **Name**: Blocksmith
- **Type**: Craft CMS Plugin
- **Handle**: blocksmith
- **Namespace**: `mediakreativ\blocksmith`
- **Requirements**: Craft CMS 5.0+, PHP 8.2+
- **License**: Proprietary

### Plugin Structure
```
src/
├── Blocksmith.php              # Main plugin class
├── controllers/                # Plugin controllers
│   ├── BlocksmithController.php
│   └── BlocksmithModalController.php
├── models/                     # Data models
│   └── BlocksmithSettings.php
├── services/                   # Business logic services
├── assets/                     # Asset bundles
│   └── BlocksmithAsset.php
├── templates/                  # Twig templates
│   ├── _includes/
│   └── _settings/
├── translations/               # Multi-language support (21 languages)
├── web/                        # Web assets
│   └── blocksmith-assets/
└── icon.svg                    # Plugin icon
```

### Plugin Functionality

**Core Features:**
- Visual block selection for Craft CMS Matrix fields
- Two UI modes: Button Group (Lite) and Preview Modal (Pro)
- Compatibility with Craft's Inline and Cards view modes
- Multi-language support (21 languages)
- Custom preview images and categorization

**Key Components:**
- **BlocksmithController**: Handles main plugin functionality
- **BlocksmithModalController**: Manages modal interface for block selection
- **BlocksmithService**: Core business logic service
- **BlocksmithSettings**: Plugin configuration model
- **BlocksmithAsset**: Asset bundle for CSS/JS resources

### Development Patterns

**Craft CMS Plugin Standards:**
- Follows PSR-4 autoloading with `mediakreativ\blocksmith` namespace
- Uses Craft's plugin architecture with proper service registration
- Implements proper event handling for Matrix field integration
- Provides CP settings interface with `hasCpSettings = true`

**Code Organization:**
- Controllers handle HTTP requests and user interactions
- Services contain business logic and integration with Craft APIs
- Models manage data structures and validation
- Templates provide admin interface components
- Assets bundle frontend JavaScript and CSS

### Configuration

**Plugin Settings:**
- Configurable through Craft's CP settings interface
- Settings stored in `BlocksmithSettings` model
- Supports per-field configuration options

**Asset Management:**
- Frontend assets managed through `BlocksmithAsset` bundle
- CSS and JavaScript files located in `src/web/blocksmith-assets/`
- Integration with Craft's asset pipeline

### Multi-language Support

The plugin includes comprehensive internationalization:
- 21 language translations in `src/translations/`
- Languages: Arabic, Chinese, Czech, Danish, Dutch, English, French, German, Greek, Hebrew, Italian, Japanese, Korean, Polish, Portuguese, Russian, Spanish, Swedish, Turkish, Ukrainian
- Translation keys use the `blocksmith` category

### Development Workflow

1. **Plugin Development:**
   ```bash
   composer install
   npm install
   ```

2. **Code Formatting:**
   ```bash
   npm run format
   ```

3. **Testing in Craft CMS:**
   - Requires installation in a Craft CMS project
   - Test with various Matrix field configurations
   - Verify compatibility with Inline and Cards view modes

### Important Notes

- **Craft CMS Version**: Requires Craft CMS 5.0+ (specified in composer.json)
- **PHP Version**: Requires PHP 8.2+ (platform requirement)
- **Schema Version**: Currently 1.1.4 (defined in main plugin class)
- **Plugin Handle**: Uses 'blocksmith' as the unique handle
- **License**: Proprietary license (not open source)
- **Support**: GitHub issues and direct email support available

### File Naming Conventions

- PHP classes use PascalCase (e.g., `BlocksmithController.php`)
- Translation files use lowercase language codes (e.g., `de/blocksmith.php`)
- Template files use lowercase with underscores (e.g., `_settings/categories.twig`)
- Follow Craft CMS plugin development standards throughout