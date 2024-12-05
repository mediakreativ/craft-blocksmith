<?php
// src/controllers/BlocksmithController.php

namespace mediakreativ\blocksmith\controllers;

use Craft;
use craft\web\Controller;
use mediakreativ\blocksmith\Blocksmith;
use yii\web\Response;

/**
 * Blocksmith Controller
 *
 * Handles Control Panel requests and interactions for the Blocksmith plugin.
 */
class BlocksmithController extends \craft\web\Controller
{
    /**
     * Determines if the controller allows anonymous access.
     *
     * @var array|int|bool
     */
    protected array|int|bool $allowAnonymous = false;

    /**
     * @var \mediakreativ\blocksmith\models\BlocksmithSettings
     */
    private $settings;

    /**
     * Renders the General Settings page.
     *
     * @return \yii\web\Response The rendered template for the General Settings page.
     */
    public function actionGeneral()
    {
        // Load the plugin settings
        $settings = Blocksmith::getInstance()->getSettings();
        $settings->validate();

        Craft::info("General settings route triggered.", __METHOD__);

        // Load all available volumes for the dropdown options
        $volumes = Craft::$app->volumes->getAllVolumes();
        $volumeOptions = array_map(function ($volume) {
            return [
                "label" => $volume->name,
                "value" => $volume->uid,
            ];
        }, $volumes);

        // Prepare configuration overrides
        $overrides = Craft::$app
            ->getConfig()
            ->getConfigFromFile(strtolower(Blocksmith::getInstance()->handle));

        Craft::info("Blocksmith General Settings Route triggered", __METHOD__);

        // Render the General Settings template with the required data
        return $this->renderTemplate("blocksmith/_settings/general", [
            "plugin" => Blocksmith::getInstance(),
            "settings" => $settings,
            "volumeOptions" => $volumeOptions,
            "overrides" => array_keys($overrides),
            "translationCategory" => Blocksmith::TRANSLATION_CATEGORY,
            "title" => Craft::t("blocksmith", "Blocksmith"),
        ]);
    }

    public function actionSaveSettings(): Response
    {
        $request = Craft::$app->getRequest();
        $settings = Blocksmith::getInstance()->getSettings();

        // Laden der neuen Daten aus der POST-Anfrage
        $settings->previewImageVolume = $request->getBodyParam(
            "previewImageVolume"
        );
        $settings->previewImageSubfolder = $request->getBodyParam(
            "previewImageSubfolder"
        );

        // Validierung und Speichern
        if (!$settings->validate()) {
            Craft::$app->session->setError(
                Craft::t("blocksmith", "Failed to save settings.")
            );
            return $this->redirectToPostedUrl();
        }

        // Speichern der Daten
        if (
            !Craft::$app->plugins->savePluginSettings(
                Blocksmith::getInstance(),
                $settings->toArray()
            )
        ) {
            Craft::$app->session->setError(
                Craft::t("blocksmith", "Could not save settings.")
            );
            return $this->redirectToPostedUrl();
        }

        Craft::$app->session->setNotice(
            Craft::t("blocksmith", "Settings saved successfully.")
        );
        return $this->redirectToPostedUrl();
    }

    /**
     * Renders the Categories Settings page.
     *
     * @return \yii\web\Response The rendered template for the Categories Settings page.
     */
    public function actionCategories()
    {
        return $this->renderTemplate("blocksmith/_settings/categories", [
            "plugin" => \mediakreativ\blocksmith\Blocksmith::getInstance(),
            "title" => Craft::t("blocksmith", "Blocksmith"),
        ]);
    }

    /**
     * Renders the Blocks Settings page.
     *
     * @return \yii\web\Response The rendered template for the Blocks Settings page.
     */
    public function actionBlocks()
    {
        return $this->renderTemplate("blocksmith/_settings/blocks", [
            "plugin" => \mediakreativ\blocksmith\Blocksmith::getInstance(),
            "title" => Craft::t("blocksmith", "Blocksmith"),
        ]);
    }

    /**
     * Retrieves all available volume options for the plugin settings.
     *
     * @return array An array of volumes with their names and UIDs.
     */
    public function getVolumesOptions(): array
    {
        $allVolumes = Craft::$app->volumes->getAllVolumes();
        $options = [];

        foreach ($allVolumes as $volume) {
            $options[] = [
                "label" => $volume->name,
                "value" => $volume->uid,
            ];
        }

        // Log a warning if no volumes are available
        if (empty($options)) {
            Craft::warning(
                "No volumes found for the plugin settings.",
                __METHOD__
            );
        }

        return $options;
    }

    /**
     * Ensures that requests are Control Panel requests and initializes settings.
     *
     * @param \yii\base\Action $action The action being executed.
     * @return bool Whether the action should continue to run.
     * @throws \yii\web\ForbiddenHttpException if the request is not a Control Panel request.
     */
    public function beforeAction($action): bool
    {
        if (!parent::beforeAction($action)) {
            return false;
        }

        // Ensure the request is a Control Panel request
        $this->requireCpRequest();

        // Load the plugin settings
        $this->settings = Blocksmith::getInstance()->getSettings();

        return true;
    }

    /**
     * Returns a JSON response with available volume options.
     *
     * @return \yii\web\Response A JSON response containing the volume options or an error message.
     */
    public function actionGetVolumeOptions(): Response
    {
        $volumeOptions = $this->getVolumesOptions();

        if (empty($volumeOptions)) {
            return $this->asJson([
                "error" => Blocksmith::t("No volumes are available."),
            ]);
        }

        return $this->asJson($volumeOptions);
    }
}
