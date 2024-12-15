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
 * Handles Control Panel requests and interactions for the Blocksmith plugin
 */
class BlocksmithController extends \craft\web\Controller
{
    /**
     * Determines if the controller allows anonymous access
     *
     * @var array|int|bool
     */
    protected array|int|bool $allowAnonymous = false;

    /**
     * @var \mediakreativ\blocksmith\models\BlocksmithSettings
     */
    private $settings;

    /**
     * Renders the General Settings page
     *
     * @return \yii\web\Response The rendered template for the General Settings page
     */
    public function actionGeneral()
    {
        $settings = Blocksmith::getInstance()->getSettings();
        $settings->validate();

        $defaultVolume = Craft::$app->volumes->getVolumeByHandle("images");
        $defaultVolumeUid = $defaultVolume->uid ?? null;
        $defaultVolumeName = $defaultVolume->name ?? "Default Volume";

        Craft::info("General settings route triggered.", __METHOD__);

        $volumes = Craft::$app->volumes->getAllVolumes();
        $volumeOptions = array_map(function ($volume) {
            return [
                "label" => $volume->name,
                "value" => $volume->uid,
            ];
        }, $volumes);

        $overrides = Craft::$app
            ->getConfig()
            ->getConfigFromFile(strtolower(Blocksmith::getInstance()->handle));

        $wideViewFourBlocks = $settings->wideViewFourBlocks ?? false;
        $narrowViewTwoBlocks = $settings->narrowViewTwoBlocks ?? false;

        Craft::info("Blocksmith General Settings Route triggered", __METHOD__);

        return $this->renderTemplate("blocksmith/_settings/general", [
            "plugin" => Blocksmith::getInstance(),
            "settings" => $settings,
            "volumeOptions" => $volumeOptions,
            "overrides" => array_keys($overrides),
            "translationCategory" => Blocksmith::TRANSLATION_CATEGORY,
            "title" => Craft::t("blocksmith", "Blocksmith"),
            "wideViewFourBlocks" => $wideViewFourBlocks,
            "defaultVolumeUid" => $defaultVolumeUid,
            "defaultVolumeName" => $defaultVolumeName,
        ]);
    }

    /**
     * Saves the plugin's general settings
     *
     * This action processes data from the settings form in the Control Panel,
     * validates it, and stores it in the database
     *
     * @return \yii\web\Response Redirects to the posted URL after saving
     */
    public function actionSaveSettings(): Response
    {
        $request = Craft::$app->getRequest();
        $settings = Blocksmith::getInstance()->getSettings();

        $settings->wideViewFourBlocks = (bool) $request->getBodyParam(
            "wideViewFourBlocks"
        );
        $settings->useHandleBasedPreviews = (bool) $request->getBodyParam(
            "useHandleBasedPreviews"
        );
        $settings->previewImageVolume = $request->getBodyParam(
            "previewImageVolume"
        );
        $settings->previewImageSubfolder = $request->getBodyParam(
            "previewImageSubfolder"
        );
        $settings->useHandleBasedPreviews = (bool) $request->getBodyParam(
            "useHandleBasedPreviews"
        );

        if (
            $settings->useHandleBasedPreviews &&
            empty($settings->previewImageVolume)
        ) {
            $volumes = Craft::$app->getVolumes()->getAllVolumes();
            $settings->previewImageVolume = $volumes[0]->uid ?? null;
        }

        if (!$settings->validate()) {
            Craft::$app->session->setError(
                Craft::t("blocksmith", "Failed to save settings.")
            );
            return $this->redirectToPostedUrl();
        }

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
     * Saves settings for individual blocks
     *
     * This action handles data for a specific block, including its description,
     * category, and preview image. It validates the data and stores it in the
     * database
     *
     * @return \yii\web\Response Redirects to the posted URL after saving
     */
    public function actionSaveBlockSettings()
    {
        $request = Craft::$app->getRequest();
        $entryTypeId = $request->post("entryTypeId");
        $description = $request->post("description");
        $categories = $request->post("categories");
        $previewImageId = $request->post("previewImageId");
        $previewImageUrl = null;

        $categoriesJson = [];
        if (!empty($categories) && is_array($categories)) {
            $categoriesJson = array_map("intval", $categories);
        }

        if ($previewImageId) {
            $asset = Craft::$app->assets->getAssetById((int) $previewImageId);
            if ($asset) {
                $previewImageUrl = $asset->getUrl();
            } else {
                Craft::warning(
                    "Asset with ID {$previewImageId} not found.",
                    __METHOD__
                );
            }
        }

        if (YII_DEBUG) {
            Craft::info("entryTypeId: " . $entryTypeId, __METHOD__);
            Craft::info("description: " . $description, __METHOD__);
            Craft::info(
                "categories: " . json_encode($categoriesJson),
                __METHOD__
            );
            Craft::info("previewImageId: " . $previewImageId, __METHOD__);
            Craft::info("previewImageUrl: " . $previewImageUrl, __METHOD__);
        }

        if (!$entryTypeId) {
            Craft::$app->session->setError("Entry Type ID is required.");
            return $this->redirectToPostedUrl();
        }

        $insertData = [
            "entryTypeId" => $entryTypeId,
            "description" => $description ?: null,
            "categories" => $categoriesJson,
            "previewImageId" => $previewImageId ?: null,
            "previewImageUrl" => $previewImageUrl ?: null,
            "dateCreated" => new \yii\db\Expression("NOW()"),
            "dateUpdated" => new \yii\db\Expression("NOW()"),
        ];

        $updateData = [
            "description" => $description ?: null,
            "categories" => $categoriesJson,
            "previewImageId" => $previewImageId ?: null,
            "previewImageUrl" => $previewImageUrl ?: null,
            "dateUpdated" => new \yii\db\Expression("NOW()"),
        ];

        try {
            $db = Craft::$app->db;
            $db->createCommand()
                ->upsert("{{%blocksmith_blockdata}}", $insertData, $updateData)
                ->execute();

            Craft::$app->session->setNotice(
                "Block settings saved successfully."
            );
        } catch (\Throwable $e) {
            Craft::error(
                "Failed to save block settings: " . $e->getMessage(),
                __METHOD__
            );
            Craft::$app->session->setError(
                "Failed to save block settings. Please check the logs."
            );
        }

        return $this->redirectToPostedUrl();
    }

    /**
     * Renders the Categories Settings page
     *
     * @return \yii\web\Response The rendered template for the Categories Settings page
     */
    public function actionCategories(): Response
    {
        $categories = (new \yii\db\Query())
            ->select(["id", "name", "description"])
            ->from("{{%blocksmith_categories}}")
            ->all();

        return $this->renderTemplate("blocksmith/_settings/categories", [
            "categories" => $categories,
            "plugin" => Blocksmith::getInstance(),
            "title" => Craft::t("blocksmith", "Categories"),
        ]);
    }

    public function actionEditCategory(int $id = null): Response
    {
        $category = null;

        if ($id) {
            $category = (new \yii\db\Query())
                ->select(["id", "name", "description"])
                ->from("{{%blocksmith_categories}}")
                ->where(["id" => $id])
                ->one();

            if (!$category) {
                Craft::$app->getSession()->setError("Category not found.");
                return $this->redirect("blocksmith/settings/categories");
            }
        }

        return $this->renderTemplate("blocksmith/_settings/edit-category", [
            "category" => $category,
        ]);
    }

    public function actionSaveCategory(): Response
    {
        $this->requirePostRequest();

        $request = Craft::$app->getRequest();
        $id = $request->getBodyParam("id");
        $name = $request->getBodyParam("name");
        $description = $request->getBodyParam("description");

        if (!$name) {
            Craft::$app->getSession()->setError("Category name is required.");
            return $this->redirectToPostedUrl();
        }

        $data = [
            "name" => $name,
            "description" => $description ?: null,
            "dateUpdated" => new \yii\db\Expression("NOW()"),
        ];

        try {
            if ($id) {
                Craft::$app->db
                    ->createCommand()
                    ->update("{{%blocksmith_categories}}", $data, ["id" => $id])
                    ->execute();
            } else {
                $data["dateCreated"] = new \yii\db\Expression("NOW()");
                Craft::$app->db
                    ->createCommand()
                    ->insert("{{%blocksmith_categories}}", $data)
                    ->execute();
            }

            Craft::$app
                ->getSession()
                ->setNotice("Category saved successfully.");
        } catch (\Throwable $e) {
            Craft::error(
                "Failed to save category: " . $e->getMessage(),
                __METHOD__
            );
            Craft::$app->getSession()->setError("Failed to save category.");
        }

        return $this->redirect("blocksmith/settings/categories");
    }

    public function actionDeleteCategory(): Response
    {
        $this->requirePostRequest();

        $request = Craft::$app->getRequest();
        $id = $request->getBodyParam("id");

        if (!$id) {
            return $this->asJson([
                "success" => false,
                "error" => "Category ID is required.",
            ]);
        }

        $transaction = Craft::$app->db->beginTransaction();
        try {
            // Lösche die Kategorie aus der Tabelle `blocksmith_categories`
            $deleted = Craft::$app->db
                ->createCommand()
                ->delete("{{%blocksmith_categories}}", ["id" => $id])
                ->execute();

            if ($deleted) {
                // Entferne die Kategorie aus der `categories` Spalte in der `blocksmith_blockdata`-Tabelle
                $blockData = (new \yii\db\Query())
                    ->select(["id", "categories"])
                    ->from("{{%blocksmith_blockdata}}")
                    ->all();

                foreach ($blockData as $block) {
                    $categories = json_decode($block["categories"], true) ?: [];
                    if (
                        ($key = array_search((int) $id, $categories)) !== false
                    ) {
                        unset($categories[$key]);
                        // Update der `categories`-Spalte
                        Craft::$app->db
                            ->createCommand()
                            ->update(
                                "{{%blocksmith_blockdata}}",
                                [
                                    // Stelle sicher, dass das Ergebnis ein echtes JSON-Array ist
                                    "categories" => empty($categories)
                                        ? null
                                        : $categories,
                                ],
                                ["id" => $block["id"]]
                            )
                            ->execute();
                    }
                }

                $transaction->commit();
                return $this->asJson(["success" => true]);
            }

            $transaction->rollBack();
            return $this->asJson([
                "success" => false,
                "error" => "Failed to delete category.",
            ]);
        } catch (\Throwable $e) {
            $transaction->rollBack();
            Craft::error(
                "Failed to delete category: " . $e->getMessage(),
                __METHOD__
            );
            return $this->asJson([
                "success" => false,
                "error" =>
                    "An error occurred while trying to delete the category.",
            ]);
        }
    }

    /**
     * Renders the Matrix Settings page
     *
     * @return \yii\web\Response The rendered template for the Matrix Settings page
     */
    public function actionMatrixFields(): Response
    {
        $matrixFields = Blocksmith::getInstance()->service->getAllMatrixFields();

        // Abrufen gespeicherter Einstellungen
        $savedSettings = (new \yii\db\Query())
            ->select(["fieldHandle", "enablePreview"])
            ->from("{{%blocksmith_matrix_settings}}")
            ->indexBy("fieldHandle")
            ->all();

        // Feld-Array aufbauen
        $matrixFieldSettings = [];
        foreach ($matrixFields as $field) {
            $matrixFieldSettings[] = [
                "name" => $field->name, // Feldname
                "handle" => $field->handle, // Feld-Handle
                "enablePreview" =>
                    $savedSettings[$field->handle]["enablePreview"] ?? true, // enablePreview Wert
            ];
        }

        return $this->renderTemplate("blocksmith/_settings/matrix-fields", [
            "matrixFields" => $matrixFieldSettings,
        ]);
    }

    /**
     * Saves settings for Matrix fields
     *
     * @return \yii\web\Response Redirects to the posted URL after saving
     */
    public function actionSaveMatrixFieldSettings(): Response
    {
        $this->requirePostRequest();
        $request = Craft::$app->getRequest();
        $settings = $request->getBodyParam("enablePreview", []);

        foreach ($settings as $fieldHandle => $enablePreview) {
            Craft::$app->db
                ->createCommand()
                ->upsert(
                    "{{%blocksmith_matrix_settings}}",
                    [
                        "fieldHandle" => $fieldHandle,
                        "enablePreview" => (bool) $enablePreview,
                    ],
                    ["enablePreview" => (bool) $enablePreview]
                )
                ->execute();
        }

        Craft::$app->getSession()->setNotice("Matrix field settings saved.");
        return $this->redirectToPostedUrl();
    }

    /**
     * Outputs the Matrix Field settings as JSON.
     *
     * @return \yii\web\Response
     */
    public function actionGetMatrixFieldSettings(): Response
    {
        $savedSettings = (new \yii\db\Query())
            ->select(["fieldHandle", "enablePreview"])
            ->from("{{%blocksmith_matrix_settings}}")
            ->indexBy("fieldHandle")
            ->all();

        return $this->asJson($savedSettings);
    }

    /**
     * Renders the Blocks Settings page
     *
     * @return \yii\web\Response The rendered template for the Blocks Settings page
     */
    public function actionBlocks()
    {
        $settings = Blocksmith::getInstance()->getSettings();
        $placeholderImageUrl = "/blocksmith/images/placeholder.png";
        $useHandleBasedPreviews = $settings->useHandleBasedPreviews;

        $blockData = (new \yii\db\Query())
            ->select([
                "entryTypeId",
                "description",
                "categories",
                "previewImageUrl",
            ])
            ->from("{{%blocksmith_blockdata}}")
            ->indexBy("entryTypeId")
            ->all();

        $categories = (new \yii\db\Query())
            ->select(["id", "name"])
            ->from("{{%blocksmith_categories}}")
            ->indexBy("id")
            ->all();

        $matrixFields = array_filter(
            Craft::$app->fields->getAllFields(),
            fn($field) => $field instanceof \craft\fields\Matrix
        );

        $allBlockTypes = [];

        foreach ($matrixFields as $matrixField) {
            foreach ($matrixField->getEntryTypes() as $blockType) {
                $blockHandle = $blockType->handle;
                $entryTypeId = $blockType->id;

                $data = $blockData[$entryTypeId] ?? null;

                $categoryIds = [];
                if (isset($data["categories"])) {
                    $decodedCategories = json_decode($data["categories"], true);
                    if (
                        json_last_error() === JSON_ERROR_NONE &&
                        is_array($decodedCategories)
                    ) {
                        $categoryIds = $decodedCategories;
                    } else {
                        Craft::warning(
                            "Failed to decode categories for entryTypeId {$entryTypeId}. Raw value: {$data["categories"]}",
                            __METHOD__
                        );
                    }
                }

                $categoryNames = [];
                if (!empty($categories)) {
                    foreach ($categoryIds as $id) {
                        if (isset($categories[$id])) {
                            $categoryNames[] = $categories[$id]["name"];
                        } else {
                            Craft::warning(
                                "Category ID {$id} not found in categories table.",
                                __METHOD__
                            );
                        }
                    }
                }

                $previewImageUrl =
                    $data["previewImageUrl"] ?? $placeholderImageUrl;

                if ($useHandleBasedPreviews && $settings->previewImageVolume) {
                    $volume = Craft::$app->volumes->getVolumeByUid(
                        $settings->previewImageVolume
                    );
                    if ($volume) {
                        $baseVolumeUrl = rtrim($volume->getRootUrl(), "/");
                        $subfolder = $settings->previewImageSubfolder
                            ? "/" . trim($settings->previewImageSubfolder, "/")
                            : "";
                        $potentialImageUrl = "{$baseVolumeUrl}{$subfolder}/{$blockHandle}.png";
                        $previewImageUrl =
                            $potentialImageUrl ?: $placeholderImageUrl;
                    }
                }

                if (!isset($allBlockTypes[$blockHandle])) {
                    $allBlockTypes[$blockHandle] = [
                        "name" => $blockType->name,
                        "handle" => $blockHandle,
                        "description" => $data["description"] ?? null,
                        "categories" => $categoryNames,
                        "previewImageUrl" => $previewImageUrl,
                        "matrixFields" => [],
                    ];
                }

                $allBlockTypes[$blockHandle]["matrixFields"][] = [
                    "name" => $matrixField->name,
                    "handle" => $matrixField->handle,
                ];
            }
        }

        return $this->renderTemplate("blocksmith/_settings/blocks", [
            "plugin" => Blocksmith::getInstance(),
            "title" => Craft::t("blocksmith", "Blocksmith"),
            "allBlockTypes" => $allBlockTypes,
            "placeholderImageUrl" => $placeholderImageUrl,
        ]);
    }

    /**
     * Edits the settings of a specific block type
     *
     * This action retrieves the details of a block type by its handle,
     * prepares the data for editing, and renders the corresponding template
     * If the block type is not found, it redirects back to the blocks settings page
     *
     * @param string $blockTypeHandle The handle of the block type to edit
     * @return \yii\web\Response The rendered edit block template or a redirection
     */
    public function actionEditBlock(string $blockTypeHandle): Response
    {
        $settings = Blocksmith::getInstance()->getSettings();
        $useHandleBasedPreviews = $settings->useHandleBasedPreviews ?? false;
        $placeholderImageUrl = "/blocksmith/images/placeholder.png";
        $handleBasedImageUrl = null;

        $handleBasedImageUrl = null;

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

        if ($useHandleBasedPreviews && $settings->previewImageVolume) {
            $volume = Craft::$app->volumes->getVolumeByUid(
                $settings->previewImageVolume
            );
            if ($volume) {
                $baseVolumeUrl = rtrim($volume->getRootUrl(), "/");
                $subfolder = $settings->previewImageSubfolder
                    ? "/" . trim($settings->previewImageSubfolder, "/")
                    : "";
                $potentialImageUrl = "{$baseVolumeUrl}{$subfolder}/{$blockType->handle}.png";

                if (@get_headers($potentialImageUrl)[0] === "HTTP/1.1 200 OK") {
                    $handleBasedImageUrl = $potentialImageUrl;
                }
            }
        }

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

        $blockData = (new \yii\db\Query())
            ->select("*")
            ->from("{{%blocksmith_blockdata}}")
            ->where(["entryTypeId" => $blockType->id])
            ->one();

        $categories = (new \yii\db\Query())
            ->select(["id", "name"])
            ->from("{{%blocksmith_categories}}")
            ->all();

        if (!$categories) {
            $categories = [];
            Craft::warning("No categories found for Blocksmith.", __METHOD__);
        }

        $selectedCategories =
            $blockData && isset($blockData["categories"])
                ? json_decode($blockData["categories"], true)
                : [];

        $previewImageUrl = $placeholderImageUrl;
        if ($blockData && isset($blockData["previewImageId"])) {
            $asset = Craft::$app->assets->getAssetById(
                $blockData["previewImageId"]
            );
            if ($asset) {
                $previewImageUrl = $asset->getUrl();
            }
        }

        $block = [
            "name" => $blockType->name,
            "handle" => $blockType->handle,
            "entryTypeId" => $blockType->id,
            "description" => $blockData["description"] ?? null,
            "previewImageUrl" => $previewImageUrl,
            "previewImageId" => $blockData["previewImageId"] ?? null,
            "categories" => $categories,
            "selectedCategories" => $selectedCategories,
            "useHandleBasedPreviews" => $useHandleBasedPreviews,
            "placeholderImageUrl" => $placeholderImageUrl,
            "handleBasedImageUrl" => $handleBasedImageUrl,
        ];

        return $this->renderTemplate("blocksmith/_settings/edit-block", [
            "block" => $block,
            "title" => Craft::t("blocksmith", "Edit Block"),
        ]);
    }

    /**
     * Verifies the request type and initializes settings before executing any action
     *
     * This method ensures that the current request is a Control Panel request and
     * loads the plugin's settings model for use in subsequent actions
     *
     * @param \yii\base\Action $action The action being executed
     * @return bool Whether the action should proceed
     * @throws \yii\web\ForbiddenHttpException if the request is not a CP request
     */
    public function beforeAction($action): bool
    {
        if (!parent::beforeAction($action)) {
            return false;
        }
        $this->requireCpRequest();
        $this->settings = Blocksmith::getInstance()->getSettings();
        return true;
    }

    /**
     * Retrieves block types with their descriptions and other data for the modal
     *
     * @return \yii\web\Response JSON response with block types
     */
    public function actionGetBlockTypes(): Response
    {
        $placeholderImageUrl = "/blocksmith/images/placeholder.png";
        $fieldsService = Craft::$app->fields;

        $blockTypes = [];
        $processedEntryTypes = [];

        foreach ($fieldsService->getAllFields() as $field) {
            if ($field instanceof \craft\fields\Matrix) {
                foreach ($field->getEntryTypes() as $entryType) {
                    if (in_array($entryType->id, $processedEntryTypes, true)) {
                        continue;
                    }
                    $processedEntryTypes[] = $entryType->id;

                    $blockData = (new \yii\db\Query())
                        ->select([
                            "description",
                            "categories",
                            "previewImageUrl",
                        ])
                        ->from("{{%blocksmith_blockdata}}")
                        ->where(["entryTypeId" => $entryType->id])
                        ->one();

                    $blockTypes[] = [
                        "name" => $entryType->name,
                        "handle" => $entryType->handle,
                        "description" => $blockData["description"] ?? null,
                        "categories" => json_decode(
                            $blockData["categories"] ?? "[]"
                        ),
                        "previewImage" =>
                            $blockData["previewImageUrl"] ??
                            $placeholderImageUrl,
                    ];
                }
            }
        }

        return $this->asJson($blockTypes);
    }

    public function actionGetCategories(): Response
    {
        $categories = (new \yii\db\Query())
            ->select(["id", "name"])
            ->from("{{%blocksmith_categories}}")
            ->all();

        return $this->asJson($categories);
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

        if (empty($options)) {
            Craft::warning(
                "No volumes found for the plugin settings.",
                __METHOD__
            );
        }

        return $options;
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
