<?php
// src/controllers/BlocksmithController.php

namespace mediakreativ\blocksmith\controllers;

use Craft;
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

        // If no volumes are found, log and return an empty message
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
     * @throws \yii\web\ForbiddenHttpException if not a CP request.
     */
    public function beforeAction($action): bool
    {
        if (!parent::beforeAction($action)) {
            return false;
        }

        $this->requireCpRequest();

        // Load the plugin settings
        $this->settings = Blocksmith::getInstance()->getSettings();

        return true;
    }

    /**
     * Returns a JSON response with available volume options.
     *
     * @return Response A JSON response with volume options.
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
