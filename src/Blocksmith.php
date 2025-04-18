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
use mediakreativ\blocksmith\services\BlocksmithService;
use mediakreativ\blocksmith\assets\BlocksmithAsset;
use mediakreativ\blocksmith\models\BlocksmithSettings;
use craft\events\FieldEvent;
use craft\services\Fields;
use craft\db\Query;
use craft\helpers\Db;
use craft\helpers\StringHelper;

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
    public string $migrationNamespace = "mediakreativ\\blocksmith\\migrations";
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
            "Migration Namespace: " . $this->migrationNamespace,
            __METHOD__
        );

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

                $event->rules["blocksmith/settings/categories/edit/<id:\d+>"] =
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

        // Ensure a default volume is set for preview images, if not configured
        if ($this->isInstalled && Craft::$app->getRequest()->getIsCpRequest()) {
            $settings = $this->getSettings();

            if (empty($settings->previewImageVolume)) {
                $volumes = Craft::$app->volumes->getAllVolumes();
                if (!empty($volumes)) {
                    $settings->previewImageVolume = $volumes[0]->uid;
                    Craft::$app->plugins->savePluginSettings(
                        $this,
                        $settings->toArray()
                    );

                    Craft::info(
                        "Default volume set to: " . $volumes[0]->name,
                        __METHOD__
                    );
                }
            }
        }

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
         * Automatically registers a new Matrix field in blocksmith_matrix_settings when it is saved.
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
                $handle = $field->handle;

                $exists = (new Query())
                    ->from("{{%blocksmith_matrix_settings}}")
                    ->where(["fieldHandle" => $handle])
                    ->exists();

                if (!$exists) {
                    Craft::$app->db
                        ->createCommand()
                        ->insert("{{%blocksmith_matrix_settings}}", [
                            "fieldHandle" => $handle,
                            "enablePreview" => true,
                            "dateCreated" => Db::prepareDateForDb(
                                new \DateTime()
                            ),
                            "dateUpdated" => Db::prepareDateForDb(
                                new \DateTime()
                            ),
                            "uid" => StringHelper::UUID(),
                        ])
                        ->execute();

                    Craft::info(
                        "Blocksmith: Auto-registered Matrix field '$handle' in matrix_settings.",
                        __METHOD__
                    );
                }
            }
        });

        /**
         * Automatically removes a Matrix field entry from blocksmith_matrix_settings when it is deleted.
         *
         * This keeps the Blocksmith settings table clean and avoids orphaned field references.
         *
         * @param FieldEvent $event The event containing the field being deleted.
         */
        Event::on(Fields::class, Fields::EVENT_BEFORE_DELETE_FIELD, function (
            FieldEvent $event
        ) {
            $field = $event->field;
            if ($field instanceof \craft\fields\Matrix) {
                Craft::$app->db
                    ->createCommand()
                    ->delete("{{%blocksmith_matrix_settings}}", [
                        "fieldHandle" => $field->handle,
                    ])
                    ->execute();

                Craft::info(
                    "Blocksmith: Removed matrix setting for deleted field '{$field->handle}'.",
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
}
