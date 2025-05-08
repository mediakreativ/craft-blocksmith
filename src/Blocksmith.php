<?php
// src/Blocksmith.php

namespace mediakreativ\blocksmith;

use Craft;
use craft\base\Model;
use craft\base\Plugin;
use craft\web\UrlManager;
use craft\web\View;
use craft\helpers\UrlHelper;
use yii\base\Event;
use craft\services\Plugins;
use craft\events\PluginEvent;
use mediakreativ\blocksmith\services\BlocksmithService;
use mediakreativ\blocksmith\assets\BlocksmithAsset;
use mediakreativ\blocksmith\models\BlocksmithSettings;
use craft\events\FieldEvent;
use craft\services\Fields;

use craft\db\Query; /* Remove in future Version */

/**
 * Blocksmith plugin for Craft CMS
 *
 * Provides an optimized experience for managing Craft CMS Matrix fields and their entry types
 * through custom modals with block previews and an intuitive block selection interface.
 *
 * @author Christian Schindler
 * @copyright (c) 2024 Christian Schindler
 * @link https://mediakreativ.de
 * @license https://craftcms.github.io/license/ Craft License
 *
 * @method static Blocksmith getInstance() Returns the plugin instance.
 * @property-read BlocksmithService $service The plugin's primary service for handling functionality.
 * @property-read BlocksmithSettings $settings The plugin's settings model.
 * @method BlocksmithSettings getSettings() Returns the plugin's settings model.
 */

class Blocksmith extends Plugin
{
    public const TRANSLATION_CATEGORY = "blocksmith";

    public string $schemaVersion = "1.1.4";
    // public string $migrationNamespace = "mediakreativ\\blocksmith\\migrations";
    public bool $hasCpSettings = true;

    /**
     * Initializes the plugin, setting up default settings, routes, event handlers, and assets.
     *
     * @return void
     */
    public function init(): void
    {
        parent::init();

        $this->setComponents([
            "service" =>
                \mediakreativ\blocksmith\services\BlocksmithService::class,
        ]);

        Craft::info(
            "Is Blocksmith installed? " . ($this->isInstalled ? "Yes" : "No"),
            __METHOD__
        );

        Craft::info("Blocksmith plugin initialized.", __METHOD__);

        /**
         * Handles the `EVENT_REGISTER_CP_URL_RULES` event to define
         * routes for the plugin's settings pages. Each route maps a URL pattern to a specific
         * controller action.
         *
         * @param \craft\events\RegisterUrlRulesEvent $event The event object containing URL rules.
         * @return void
         */
        Event::on(
            UrlManager::class,
            UrlManager::EVENT_REGISTER_CP_URL_RULES,
            function (\craft\events\RegisterUrlRulesEvent $event) {
                Craft::info(
                    "Registering custom routes for Blocksmith settings pages.",
                    __METHOD__
                );

                $event->rules["blocksmith/settings/general"] =
                    "blocksmith/blocksmith/general";

                $event->rules["blocksmith/settings/categories"] =
                    "blocksmith/blocksmith/categories";

                $event->rules["blocksmith/settings/categories/new"] =
                    "blocksmith/blocksmith/edit-category";

                $event->rules["blocksmith/settings/categories/edit/<uid:.*>"] =
                    "blocksmith/blocksmith/edit-category";

                $event->rules["blocksmith/settings/categories/save"] =
                    "blocksmith/blocksmith/save-category";

                $event->rules["blocksmith/settings/categories/delete"] =
                    "blocksmith/blocksmith/delete-category";

                $event->rules["blocksmith/settings/blocks"] =
                    "blocksmith/blocksmith/blocks";

                $event->rules["blocksmith/settings/save"] =
                    "blocksmith/blocksmith/save-settings";

                $event->rules[
                    "blocksmith/settings/edit-block/<blockTypeHandle>"
                ] = "blocksmith/blocksmith/edit-block";

                $event->rules["blocksmith-modal/get-block-types"] =
                    "blocksmith/blocksmith-modal/get-block-types";

                $event->rules["blocksmith-modal/get-categories"] =
                    "blocksmith/blocksmith-modal/get-categories";

                $event->rules["blocksmith/reorder-categories"] =
                    "blocksmith/blocksmith/reorder-categories";

                $event->rules["blocksmith/settings/matrix-fields"] =
                    "blocksmith/blocksmith/matrix-fields";
            }
        );

        Event::on(
            Plugins::class,
            Plugins::EVENT_AFTER_INSTALL_PLUGIN,
            function (PluginEvent $e) {
                if ($e->plugin === $this) {
                    /**
                     * Write all default plugin settings to the project config after installation.
                     */
                    $defaults = $this->getSettings()->toArray();
                    Craft::$app->plugins->savePluginSettings($this, $defaults);
                }
            }
        );

        // Migrate old DB settings into YAML (e.g. from v1.4.1 or earlier)
        if (
            $this->isInstalled &&
            Craft::$app
                ->getProjectConfig()
                ->get("plugins.blocksmith.enabled") &&
            Craft::$app->db->tableExists("{{%blocksmith_matrix_settings}}")
        ) {
            $this->ensureMigrationCompleted();
        }

        // Ensure the previewStorageMode and previewImageVolume settings exist in project.yaml after installation or update
        if ($this->isInstalled && Craft::$app->getRequest()->getIsCpRequest()) {
            $pc = Craft::$app->projectConfig;
            $pcSettings = $pc->get("plugins.blocksmith.settings") ?? [];

            if (!array_key_exists("previewStorageMode", $pcSettings)) {
                $settings = $this->getSettings();

                if ($settings->useHandleBasedPreviews) {
                    $settings->previewStorageMode = "volume";
                } else {
                    $settings->previewStorageMode = null;
                    $settings->previewImageVolume = null;
                }

                Craft::$app->plugins->savePluginSettings(
                    $this,
                    $settings->toArray()
                );
            }
        }

        // Initialize default Matrix field settings for fields not covered by migration
        $this->initializeDefaultMatrixFieldSettings();

        // Register the Twig extension for the custom translation filter
        Craft::$app->view->registerTwigExtension(
            new class extends \Twig\Extension\AbstractExtension {
                public function getFilters(): array
                {
                    return [
                        new \Twig\TwigFilter("bt", [Blocksmith::class, "t"]),
                    ];
                }
            }
        );

        $this->publishAssets();
        $this->initializeCoreFeatures();
        $this->initializeSiteFeatures();
        $this->initializeControlPanelFeatures();

        /**
         * Automatically registers a new Matrix field in the Project Config YAML when it is saved.
         *
         * This ensures that newly created Matrix fields are enabled for Blocksmith preview
         * without requiring manual activation in the settings panel.
         *
         * @param FieldEvent $event The event containing the saved field.
         */
        Event::on(Fields::class, Fields::EVENT_AFTER_SAVE_FIELD, function (
            FieldEvent $event
        ) {
            $field = $event->field;

            if ($field instanceof \craft\fields\Matrix) {
                $uid = $field->uid;
                $path = "blocksmith.blocksmithMatrixFields.$uid";

                // Check if entry already exists in Project Config
                $existing = Craft::$app->projectConfig->get($path);

                if (!$existing) {
                    Craft::$app->projectConfig->set($path, [
                        "fieldHandle" => $field->handle,
                        "enablePreview" => true, // Default: new fields have preview enabled
                    ]);

                    Craft::info(
                        "Blocksmith: Auto-registered Matrix field '{$field->handle}' (UID: {$uid}) into Project Config.",
                        __METHOD__
                    );
                }
            }
        });

        /**
         * Automatically removes a Matrix field entry from the Project Config YAML when it is deleted.
         *
         * This keeps the Blocksmith configuration clean and avoids orphaned field references.
         *
         * @param FieldEvent $event The event containing the field being deleted.
         */

        Event::on(Fields::class, Fields::EVENT_BEFORE_DELETE_FIELD, function (
            FieldEvent $event
        ) {
            $field = $event->field;

            if ($field instanceof \craft\fields\Matrix) {
                $uid = $field->uid;
                $path = "blocksmith.blocksmithMatrixFields.$uid";

                Craft::$app->projectConfig->remove($path);

                Craft::info(
                    "Blocksmith: Removed Matrix field setting '{$field->handle}' (UID: {$uid}) from Project Config.",
                    __METHOD__
                );
            }
        });
    }

    /**
     * Publishes plugin assets to the web directory.
     *
     * Copies all files from the plugin's src/web directory into the
     * Craft project's public web directory (web/blocksmith) to make them
     * publicly accessible.
     *
     * @return void
     */
    private function publishAssets(): void
    {
        $src = Craft::getAlias("@mediakreativ/blocksmith/web");
        $dest = Craft::getAlias("@webroot/blocksmith");

        if (!is_dir($src)) {
            Craft::warning(
                "Source directory for Blocksmith assets does not exist: {$src}",
                __METHOD__
            );
            return;
        }

        if (!is_dir($dest)) {
            mkdir($dest, 0755, true);
        }

        $files = scandir($src);
        foreach ($files as $file) {
            if ($file === "." || $file === "..") {
                continue;
            }

            $srcFile = $src . DIRECTORY_SEPARATOR . $file;
            $destFile = $dest . DIRECTORY_SEPARATOR . $file;

            if (is_file($srcFile)) {
                copy($srcFile, $destFile);
            } elseif (is_dir($srcFile)) {
                $this->copyDirectory($srcFile, $destFile);
            }
        }

        Craft::info("Blocksmith assets published to {$dest}.", __METHOD__);
    }

    /**
     * Recursively copies a directory and its contents to a destination.
     *
     * @param string $src The source directory to copy from.
     * @param string $dest The destination directory to copy to.
     * @return void
     */
    private function copyDirectory(string $src, string $dest): void
    {
        if (!is_dir($dest)) {
            mkdir($dest, 0755, true);
        }

        $files = scandir($src);
        foreach ($files as $file) {
            if ($file === "." || $file === "..") {
                continue;
            }

            $srcFile = $src . DIRECTORY_SEPARATOR . $file;
            $destFile = $dest . DIRECTORY_SEPARATOR . $file;

            if (is_file($srcFile)) {
                copy($srcFile, $destFile);
            } elseif (is_dir($srcFile)) {
                $this->copyDirectory($srcFile, $destFile);
            }
        }
    }

    /**
     * Cleans up by removing all published Blocksmith assets from the web directory.
     *
     * This method is automatically called when the plugin is uninstalled.
     * It ensures that all plugin-specific files in the public web directory
     * are removed to avoid leaving orphaned files behind.
     *
     * @return void
     */
    public function afterUninstall(): void
    {
        $dest = Craft::getAlias("@webroot/blocksmith");
        try {
            if (is_dir($dest)) {
                \yii\helpers\FileHelper::removeDirectory($dest);
                Craft::info(
                    "Blocksmith assets removed from {$dest}.",
                    __METHOD__
                );
            } else {
                Craft::warning(
                    "Blocksmith assets directory not found at {$dest}.",
                    __METHOD__
                );
            }
        } catch (\Exception $e) {
            Craft::error(
                "Failed to remove Blocksmith assets: " . $e->getMessage(),
                __METHOD__
            );
        }

        // Remove all related Project Config entries
        $config = Craft::$app->projectConfig;
        $config->remove("blocksmith.blocksmithMatrixFields");
        $config->remove("blocksmith.blocksmithBlocks");
        $config->remove("blocksmith.blocksmithCategories");
        $config->remove("blocksmith.__migrationCompleted");

        Craft::info("Blocksmith Project Config entries removed.", __METHOD__);

        // Drop legacy DB tables if they still exist (for users upgrading from older versions)
        $db = Craft::$app->db;

        foreach (
            [
                "blocksmith_matrix_settings",
                "blocksmith_blockdata",
                "blocksmith_categories",
                "blocksmith_favorites",
            ]
            as $table
        ) {
            $tableName = "{{%$table}}";

            if ($db->tableExists($tableName)) {
                try {
                    $db->createCommand()->dropTable($tableName)->execute();
                    Craft::info(
                        "Dropped legacy Blocksmith table: $tableName",
                        __METHOD__
                    );
                } catch (\Throwable $e) {
                    Craft::warning(
                        "Could not drop table $tableName: " . $e->getMessage(),
                        __METHOD__
                    );
                }
            }
        }
    }

    /**
     * Provides a translation wrapper for the plugin.
     *
     * @param string $message The message to be translated.
     * @param array $params Parameters to replace in the message (key-value pairs).
     * @return string The translated message.
     */
    public static function t(string $message, array $params = []): string
    {
        return Craft::t(self::TRANSLATION_CATEGORY, $message, $params);
    }

    /**
     * Creates and returns the plugin's settings model.
     *
     * The settings model defines the structure and default values for
     * the plugin's configuration options.
     *
     * @return Model|null The settings model instance, or null if no settings are defined.
     */
    protected function createSettingsModel(): ?Model
    {
        $settings = new BlocksmithSettings();

        Craft::info("Creating settings model for Blocksmith.", __METHOD__);
        Craft::debug(
            "Current settings: " . json_encode($settings->toArray()),
            __METHOD__
        );

        return $settings;
    }

    /**
     * Generates the HTML for the plugin settings page.
     *
     * This method renders the settings template for the plugin, providing
     * the necessary data to populate the form in the Control Panel.
     *
     * @return string|null The rendered HTML for the settings page, or null if the rendering fails.
     */
    public function settingsHtml(): ?string
    {
        $settings = $this->getSettings();
        if (!$settings->validate()) {
            Craft::error(
                "Validation failed: " . json_encode($settings->getErrors()),
                __METHOD__
            );
        }
        return Craft::$app
            ->getResponse()
            ->redirect(UrlHelper::cpUrl("blocksmith/settings/general"))
            ->send();
    }

    /**
     * Initializes the core functionality of the plugin.
     *
     * This method is responsible for setting up any features that are
     * required globally, regardless of whether the request is for the
     * front-end site or the Control Panel.
     *
     * @return void
     */
    private function initializeCoreFeatures()
    {
        Craft::$app->onInit(function () {
            Craft::debug("Blocksmith core features initialized.", __METHOD__);
        });
    }

    /**
     * Sets up features specific to site requests.
     *
     * This method initializes logic and event handlers that are only
     * relevant for front-end site requests. It is skipped for Control
     * Panel or other non-site requests.
     *
     * @return void
     */
    private function initializeSiteFeatures()
    {
        Craft::$app->onInit(function () {
            $isSiteRequest = Craft::$app->getRequest()->getIsSiteRequest();

            Craft::debug(
                "Initializing site features. Is site request: " .
                    ($isSiteRequest ? "true" : "false"),
                __METHOD__
            );

            if (!$isSiteRequest) {
                Craft::debug(
                    "Skipped initializing site features because this is not a site request.",
                    __METHOD__
                );
                return;
            }

            $this->registerSiteRequestHandlers();

            Craft::debug(
                "Site request handlers successfully registered.",
                __METHOD__
            );
        });
    }

    /**
     * Sets up features specific to Control Panel requests.
     *
     * This method initializes logic and assets required for the Craft
     * Control Panel. It ensures that all necessary scripts, styles, and
     * handlers are loaded for admin users.
     *
     * @return void
     */
    private function initializeControlPanelFeatures()
    {
        Craft::$app->onInit(function () {
            if (!Craft::$app->getRequest()->getIsCpRequest()) {
                Craft::debug(
                    "Skipped initializing Control Panel features because this is not a CP request.",
                    __METHOD__
                );
                return;
            }

            $this->registerControlPanelAssets();

            Craft::debug(
                "Control Panel assets successfully registered.",
                __METHOD__
            );
        });
    }

    /**
     * Registers the request handlers for site requests.
     *
     * This method is called during the initialization of site-specific features.
     * It sets up any required logic or handlers for site requests.
     *
     * @return void
     */
    private function registerSiteRequestHandlers()
    {
        Craft::debug(
            "Blocksmith site request handlers registered.",
            __METHOD__
        );
    }

    /**
     * Registers the required asset bundle for the Control Panel.
     *
     * This method is called during the initialization of Control Panel features
     * to ensure all necessary assets (CSS, JS) are available.
     *
     * @return void
     */
    private function registerControlPanelAssets()
    {
        Craft::$app->getView()->registerAssetBundle(BlocksmithAsset::class);

        Craft::info("Blocksmith Control Panel assets registered.", __METHOD__);
    }

    /**
     * Ensures that the DB-to-Project Config YAML migration is performed.
     */
    private function ensureMigrationCompleted(): void
    {
        $config = Craft::$app->projectConfig;

        // Use an internal flag to avoid duplicate execution
        $wasCompleted = $config->get("blocksmith.__migrationCompleted");
        if ($wasCompleted) {
            return;
        }

        Craft::info(
            "Blocksmith: Running fallback migration to Project Config.",
            __METHOD__
        );

        $this->migrateMatrixFieldSettingsToProjectConfig();
        $this->migrateCategorySettingsToProjectConfig();
        $this->migrateBlockSettingsToProjectConfig();

        $config->set("blocksmith.__migrationCompleted", true);
    }

    /**
     * Migrates blocksmith_matrix_settings DB entries to the Project Config YAML.
     */
    private function migrateMatrixFieldSettingsToProjectConfig(): void
    {
        $rows = (new \craft\db\Query())
            ->select(["fieldHandle", "enablePreview"])
            ->from("{{%blocksmith_matrix_settings}}")
            ->all();

        foreach ($rows as $row) {
            $handle = $row["fieldHandle"] ?? null;

            if (!$handle) {
                Craft::warning(
                    "Blocksmith: Skipping migration for matrix field without handle.",
                    __METHOD__
                );
                continue;
            }

            /** @var \craft\fields\Matrix|null $field */
            $field = Craft::$app->fields->getFieldByHandle($handle);

            if (!$field || !$field instanceof \craft\fields\Matrix) {
                Craft::warning(
                    "Blocksmith: Skipping migration for non-existent or non-Matrix field '{$handle}'.",
                    __METHOD__
                );
                continue;
            }

            $uid = $field->uid;
            $path = "blocksmith.blocksmithMatrixFields.$uid";

            if (!Craft::$app->projectConfig->get($path)) {
                Craft::$app->projectConfig->set($path, [
                    "fieldHandle" => $handle,
                    "enablePreview" => (bool) $row["enablePreview"],
                ]);

                Craft::info(
                    "Blocksmith: Migrated matrix field '{$handle}' (UID: {$uid}) to Project Config.",
                    __METHOD__
                );
            }
        }
    }

    /**
     * Migrates blocksmith_categories DB entries to Project Config YAML.
     */
    private function migrateCategorySettingsToProjectConfig(): void
    {
        $rows = (new \craft\db\Query())
            ->select(["id", "uid", "name", "sortOrder"])
            ->from("{{%blocksmith_categories}}")
            ->all();

        foreach ($rows as $row) {
            $id = $row["id"] ?? null;
            $uid = $row["uid"] ?? null;
            $name = $row["name"] ?? null;
            $sortOrder = (int) ($row["sortOrder"] ?? 0);

            if (!$id || !$uid || !$name) {
                Craft::warning(
                    "Blocksmith: Skipping migration for category with missing ID, UID or name.",
                    __METHOD__
                );
                continue;
            }

            $path = "blocksmith.blocksmithCategories.$uid";

            if (!Craft::$app->projectConfig->get($path)) {
                Craft::$app->projectConfig->set($path, [
                    "name" => $name,
                    "sortOrder" => $sortOrder,
                ]);

                Craft::info(
                    "Blocksmith: Migrated category '{$name}' (UID: {$uid}) to Project Config.",
                    __METHOD__
                );
            }
        }
    }

    /**
     * Migrates blocksmith_blockdata DB entries to Project Config YAML.
     */
    private function migrateBlockSettingsToProjectConfig(): void
    {
        $rows = (new \craft\db\Query())
            ->select([
                "uid",
                "entryTypeId",
                "description",
                "categories",
                "previewImageUrl",
            ])
            ->from("{{%blocksmith_blockdata}}")
            ->all();

        foreach ($rows as $row) {
            $blockUid = $row["uid"] ?? null;
            $entryTypeId = $row["entryTypeId"] ?? null;

            if (!$blockUid || !$entryTypeId) {
                Craft::warning(
                    "Blocksmith: Skipping block migration – missing UID or entryTypeId.",
                    __METHOD__
                );
                continue;
            }

            $entryType = Craft::$app->entries->getEntryTypeById($entryTypeId);
            if (!$entryType) {
                Craft::warning(
                    "Blocksmith: No Matrix EntryType found for ID {$entryTypeId} (block UID: {$blockUid}).",
                    __METHOD__
                );
                continue;
            }

            $entryTypeUid = $entryType->uid;
            $description = $row["description"] ?? null;

            $categories = [];
            if (!empty($row["categories"])) {
                $decoded = json_decode($row["categories"], true);
                if (
                    json_last_error() === JSON_ERROR_NONE &&
                    is_array($decoded)
                ) {
                    $categories = $decoded;
                } else {
                    Craft::warning(
                        "Blocksmith: Invalid category JSON for block UID {$blockUid}.",
                        __METHOD__
                    );
                }
            }

            $previewImagePath = null;
            if (!empty($row["previewImageUrl"])) {
                $parsed = parse_url($row["previewImageUrl"]);
                if (!empty($parsed["path"])) {
                    $previewImagePath = ltrim($parsed["path"], "/");
                }
            }

            $path = "blocksmith.blocksmithBlocks.$blockUid";

            if (!Craft::$app->projectConfig->get($path)) {
                $config = [
                    "entryTypeUid" => $entryTypeUid,
                    "description" => $description,
                    "categories" => $categories,
                ];

                if ($previewImagePath) {
                    $config["previewImagePath"] = $previewImagePath;
                }

                Craft::$app->projectConfig->set($path, $config);

                Craft::info(
                    "Blocksmith: Migrated block UID '{$blockUid}' (EntryType UID: {$entryTypeUid}) to Project Config.",
                    __METHOD__
                );
            }
        }
    }

    /**
     * Automatically initializes all Matrix fields with default Blocksmith settings in the Project Config,
     * if no entry exists yet.
     *
     * This ensures that a fresh install of Blocksmith starts with preview enabled
     * for all existing Matrix fields – no manual “Save” step required.
     */
    private function initializeDefaultMatrixFieldSettings(): void
    {
        $fields = Craft::$app->fields->getAllFields();

        foreach ($fields as $field) {
            if (!$field instanceof \craft\fields\Matrix) {
                continue;
            }

            $uid = $field->uid;
            $path = "blocksmith.blocksmithMatrixFields.$uid";

            if (!Craft::$app->projectConfig->get($path)) {
                Craft::$app->projectConfig->set($path, [
                    "fieldHandle" => $field->handle,
                    "enablePreview" => true,
                ]);

                Craft::info(
                    "Blocksmith: Auto-initialized Matrix field '{$field->handle}' (UID: {$uid}) into Project Config.",
                    __METHOD__
                );
            }
        }
    }
}
