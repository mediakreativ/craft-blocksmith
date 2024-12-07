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

    /**
     * Saves the plugin's general settings.
     *
     * This action processes data from the settings form in the Control Panel,
     * validates it, and stores it in the database.
     *
     * @return \yii\web\Response Redirects to the posted URL after saving.
     */
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
     * Saves settings for individual blocks.
     *
     * This action handles data for a specific block, including its description,
     * category, and preview image. It validates the data and stores it in the
     * database.
     *
     * @return \yii\web\Response Redirects to the posted URL after saving.
     */
    public function actionSaveBlockSettings(): Response
    {
        $request = Craft::$app->getRequest();
        $previewImageId = $request->getBodyParam("previewImageId");
        $description = $request->getBodyParam("description");
        $category = $request->getBodyParam("category");

        // Asset-ID validieren
        $previewImage = null;
        if ($previewImageId) {
            $previewImage = \craft\elements\Asset::find()
                ->id($previewImageId)
                ->one();
            if (!$previewImage) {
                Craft::error(
                    "Asset with ID {$previewImageId} not found.",
                    __METHOD__
                );
            }
        }

        // Speichern in der Datenbank
        $blockDataToSave = [
            "description" => $description,
            "category" => $category,
        ];

        if ($previewImage) {
            $blockDataToSave["previewImageUrl"] = $previewImage->getUrl();
        }

        // Daten speichern...
        Craft::$app->db
            ->createCommand()
            ->upsert("{{%blocksmith_blockdata}}", $blockDataToSave)
            ->execute();

        // Erfolgsbenachrichtigung
        Craft::$app->session->setNotice(
            Craft::t("blocksmith", "Block settings saved successfully.")
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
        // Platzhalter-URL für Bilder (falls kein Vorschau-Bild vorhanden)
        $placeholderImageUrl = "/blocksmith/images/placeholder.png";

        // Abrufen aller Matrix-Felder
        $fieldsService = Craft::$app->fields;
        $allFields = $fieldsService->getAllFields();

        // Filtern der Matrix-Felder
        $matrixFields = array_filter(
            $allFields,
            fn($field) => $field instanceof \craft\fields\Matrix
        );

        // Sammeln der Matrix-Felder und ihrer Blocktypen
        $matrixData = [];
        foreach ($matrixFields as $matrixField) {
            $blockTypes = [];

            // Iteriere durch alle Blocktypen des Matrix-Feldes
            foreach ($matrixField->getEntryTypes() as $blockType) {
                // Vorschau-Bild-URL prüfen (falls implementiert)
                $previewImageUrl = $blockType->previewImageUrl ?? null;

                // Beschreibung und Kategorie der Blocktypen einfügen
                $blockTypes[] = [
                    "name" => $blockType->name,
                    "handle" => $blockType->handle,
                    "previewImageUrl" =>
                        $previewImageUrl ?: $placeholderImageUrl,
                    // "description" => $blockType->description ?? null,
                    "description" =>
                        "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum.",
                    "category" => $blockType->category ?? null, // Falls Kategorien unterstützt werden
                ];
            }

            // Matrix-Feld-Daten hinzufügen
            $matrixData[] = [
                "name" => $matrixField->name,
                "handle" => $matrixField->handle,
                "blockTypes" => $blockTypes,
            ];
        }

        // Rendern der Template-Datei mit den dynamischen Daten
        return $this->renderTemplate("blocksmith/_settings/blocks", [
            "plugin" => \mediakreativ\blocksmith\Blocksmith::getInstance(),
            "title" => Craft::t("blocksmith", "Blocksmith"),
            "matrixFields" => $matrixData,
            "placeholderImageUrl" => $placeholderImageUrl,
        ]);
    }

    /**
     * Edits the settings of a specific block type.
     *
     * This action retrieves the details of a block type by its handle,
     * prepares the data for editing, and renders the corresponding template.
     * If the block type is not found, it redirects back to the blocks settings page.
     *
     * @param string $blockTypeHandle The handle of the block type to edit.
     * @return \yii\web\Response The rendered edit block template or a redirection.
     */
    public function actionEditBlock(string $blockTypeHandle): Response
    {
        $placeholderImageUrl = "/blocksmith/images/placeholder.png";

        // Matrix-Feld und Blocktyp abrufen
        $fieldsService = Craft::$app->fields;
        $blockType = null;
        foreach ($fieldsService->getAllFields() as $field) {
            if ($field instanceof \craft\fields\Matrix) {
                foreach ($field->getEntryTypes() as $entryType) {
                    if ($entryType->handle === $blockTypeHandle) {
                        $blockType = $entryType;
                        break 2;
                    }
                }
            }
        }

        // Fehler ausgeben, wenn der Blocktyp nicht gefunden wird
        if (!$blockType) {
            Craft::$app->session->setError(
                Craft::t(
                    "blocksmith",
                    'Block with handle "{handle}" not found.',
                    ["handle" => $blockTypeHandle]
                )
            );
            return $this->redirect("blocksmith/settings/blocks");
        }

        // Block-Daten laden
        $blockData = (new \yii\db\Query())
            ->select("*")
            ->from("{{%blocksmith_blockdata}}")
            ->where(["entryTypeId" => $blockType->id])
            ->one();

        // Kategorien
        $categories = ["Headers", "Media", "Content"];

        // Daten des Blocktyps vorbereiten
        $block = [
            "name" => $blockType->name,
            "handle" => $blockType->handle,
            "description" => $blockData["description"] ?? "",
            "previewImageUrl" =>
                $blockData["previewImageUrl"] ?? $placeholderImageUrl,
            "categories" => $categories,
            "selectedCategory" => $blockData["category"] ?? null,
        ];

        // Template rendern
        return $this->renderTemplate("blocksmith/_settings/edit-block", [
            "block" => $block,
            "title" => Craft::t("blocksmith", "Edit Block"),
        ]);
    }

    /**
     * Retrieves all available volume options for the plugin settings dropdown.
     *
     * This helper method fetches the names and UIDs of all volumes defined in Craft
     * and returns them in a structured format.
     *
     * @return array An array of volumes with their labels and values.
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
     * Verifies the request type and initializes settings before executing any action.
     *
     * This method ensures that the current request is a Control Panel request and
     * loads the plugin's settings model for use in subsequent actions.
     *
     * @param \yii\base\Action $action The action being executed.
     * @return bool Whether the action should proceed.
     * @throws \yii\web\ForbiddenHttpException if the request is not a CP request.
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
     * Returns a JSON response with all available volumes.
     *
     * This action is used to dynamically fetch volume options for the plugin
     * settings, providing an error message if no volumes are found.
     *
     * @return \yii\web\Response A JSON response with volume options or an error.
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
