<?php
// src/assets/BlocksmithAsset.php

namespace mediakreativ\blocksmith\assets;

use Craft;
use craft\helpers\Json;
use craft\web\AssetBundle;
use craft\web\View;
use craft\web\assets\cp\CpAsset;
use craft\web\assets\matrix\MatrixAsset;
use mediakreativ\blocksmith\Blocksmith;

/**
 * Blocksmith Asset Bundle
 *
 * Handles the registration of CSS, JS, and translations for the plugin.
 */
class BlocksmithAsset extends AssetBundle
{
    /**
     * Initializes the asset bundle by setting paths and dependencies.
     */
    public function init(): void
    {
        $this->sourcePath = "@mediakreativ/blocksmith/assets";

        $this->js = ["js/blocksmith.js", "js/blocksmithModal.js"];
        $this->css = ["css/blocksmith.css"];
        $this->depends = [CpAsset::class, MatrixAsset::class];

        parent::init();
    }

    /**
     * Registers asset files and additional JavaScript configuration.
     *
     * @param View $view The current view.
     */
    public function registerAssetFiles($view): void
    {
        parent::registerAssetFiles($view);

        if ($view instanceof View) {
            $this->registerTranslations($view);
            $this->registerPluginJs($view);
        }
    }

    /**
     * Registers translation keys used in the plugin.
     *
     * @param View $view The current view.
     */
    private function registerTranslations(View $view): void
    {
        // Log the current language Craft is using
        $translations = $this->getTranslationKeysWithFallback();

        if (!empty($translations)) {
            // Register PHP translations for use with Craft::t()
            $view->registerTranslations(
                Blocksmith::TRANSLATION_CATEGORY,
                array_keys($translations)
            );

            // Register JavaScript translations for client-side usage
            $view->registerJs(
                "window.BlocksmithTranslations = " .
                    Json::encode($translations),
                View::POS_HEAD
            );
        }
    }

    /**
     * Retrieves all translation keys and values from translation files.
     *
     * @return array Translation keys and their values.
     */
    private function getTranslationKeysWithFallback(): array
    {
        $translationsDir = Craft::getAlias(
            "@mediakreativ/blocksmith/translations"
        );
        $defaultLanguage = "en";
        $currentLanguage = Craft::$app->language; // Aktuelle Sprache
        $allTranslations = [];

        if (is_dir($translationsDir)) {
            // Lade die Übersetzungen der aktuellen Sprache (falls vorhanden)
            $currentLanguageFile =
                $translationsDir . "/{$currentLanguage}/blocksmith.php";
            if (file_exists($currentLanguageFile)) {
                $currentTranslations = include $currentLanguageFile;
                if (is_array($currentTranslations)) {
                    $allTranslations = $currentTranslations; // Direkt hinzufügen
                } else {
                    Craft::debug(
                        "The current language file exists but does not return an array: " .
                            $currentLanguageFile,
                        __METHOD__
                    );
                }
            }

            // Lade die Fallback-Übersetzungen (englisch)
            $defaultFile =
                $translationsDir . "/{$defaultLanguage}/blocksmith.php";
            if (file_exists($defaultFile)) {
                $fallbackTranslations = include $defaultFile;
                if (is_array($fallbackTranslations)) {
                    // Füge nur Schlüssel hinzu, die noch nicht existieren
                    foreach ($fallbackTranslations as $key => $value) {
                        if (!isset($allTranslations[$key])) {
                            $allTranslations[$key] = $value;
                        }
                    }
                    Craft::debug(
                        "Loaded fallback translations from: " . $defaultFile,
                        __METHOD__
                    );
                }
            }
        } else {
            Craft::error(
                "Translation directory not found: {$translationsDir}",
                __METHOD__
            );
        }

        return $allTranslations;
    }

    /**
     * Registers Blocksmith JavaScript configuration.
     *
     * @param View $view The current view.
     */
    private function registerPluginJs(View $view): void
    {
        $config = Json::encode(
            $this->getBlocksmithConfig(),
            JSON_THROW_ON_ERROR
        );

        $js = <<<JS
document.addEventListener('DOMContentLoaded', function() {
    if (window.Craft && window.Craft.Blocksmith) {
        new window.Craft.Blocksmith($config);
    } else {
        console.warn('Blocksmith could not be initialized. Ensure all scripts are loaded.');
    }
});
JS;

        $view->registerJs($js, View::POS_END);
    }

    /**
     * Retrieves the Blocksmith configuration.
     *
     * @return array The configuration data.
     */
    private function getBlocksmithConfig(): array
    {
        $settings = Blocksmith::getInstance()->getSettings();

        // Retrieve volume and subfolder path
        $volumePath = $this->getVolumePath($settings);

        return [
            "settings" => [
                "previewImageVolume" => $volumePath,
                "previewImageSubfolder" => $settings->previewImageSubfolder,
            ],
        ];
    }

    /**
     * Constructs the volume path based on the settings.
     *
     * @param \mediakreativ\blocksmith\models\BlocksmithSettings $settings The plugin settings.
     * @return string|null The resolved volume path or null if not set.
     */
    private function getVolumePath($settings): ?string
    {
        if (empty($settings->previewImageVolume)) {
            return null;
        }

        $volume = Craft::$app->volumes->getVolumeByUid(
            $settings->previewImageVolume
        );
        if (!$volume) {
            return null;
        }

        $volumeBaseUrl = rtrim($volume->getRootUrl(), "/");
        if ($settings->previewImageSubfolder) {
            $volumeBaseUrl .=
                "/" . ltrim($settings->previewImageSubfolder, "/");
        }

        return $volumeBaseUrl;
    }
}
