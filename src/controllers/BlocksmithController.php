<?php
// src/controllers/BlocksmithController.php

namespace mediakreativ\blocksmith\controllers;

use Craft;
use craft\web\Controller;
use mediakreativ\blocksmith\Blocksmith;
use yii\web\Response;
use craft\helpers\StringHelper;

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
        $settings->enableCardsSupport = (bool) $request->getBodyParam(
            "enableCardsSupport"
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
        $categories = $request->post("categories", []);
        $previewImageId = $request->post("previewImageId");

        $categoriesArray = is_array($categories)
            ? array_map("strval", $categories)
            : [];

        $previewImageUrl = null;
        if ($previewImageId) {
            $asset = Craft::$app->assets->getAssetById((int) $previewImageId);
            $previewImageUrl = $asset ? $asset->getUrl() : null;

            if (!$asset) {
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
                "categories: " . json_encode($categoriesArray),
                __METHOD__
            );
            Craft::info("previewImageId: " . $previewImageId, __METHOD__);
            Craft::info("previewImageUrl: " . $previewImageUrl, __METHOD__);
        }

        if (!$entryTypeId) {
            Craft::$app->session->setError("Entry Type ID is required.");
            return $this->redirectToPostedUrl();
        }

        $now = new \yii\db\Expression("NOW()");

        $insertData = [
            "entryTypeId" => $entryTypeId,
            "description" => $description ?: null,
            "categories" => $categoriesArray,
            "previewImageId" => $previewImageId ?: null,
            "previewImageUrl" => $previewImageUrl ?: null,
            "dateCreated" => $now,
            "dateUpdated" => $now,
        ];

        $updateData = [
            "description" => $description ?: null,
            "categories" => $categoriesArray,
            "previewImageId" => $previewImageId ?: null,
            "previewImageUrl" => $previewImageUrl ?: null,
            "dateUpdated" => $now,
        ];

        try {
            Craft::$app->db
                ->createCommand()
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
        $categoriesFromConfig =
            Craft::$app->projectConfig->get(
                "blocksmith.blocksmithCategories"
            ) ?? [];

        $categories = [];

        foreach ($categoriesFromConfig as $uid => $categoryData) {
            if (!isset($categoryData["name"])) {
                Craft::warning(
                    "Blocksmith: Skipping category with UID {$uid} due to missing 'name'.",
                    __METHOD__
                );
                continue;
            }

            $categories[] = [
                "uid" => $uid,
                "name" => $categoryData["name"],
                "sortOrder" => (int) ($categoryData["sortOrder"] ?? 0),
            ];
        }

        usort($categories, function ($a, $b) {
            return $a["sortOrder"] <=> $b["sortOrder"];
        });

        return $this->renderTemplate("blocksmith/_settings/categories", [
            "categories" => $categories,
            "plugin" => Blocksmith::getInstance(),
            "title" => Craft::t("blocksmith", "Categories"),
        ]);
    }

    /**
     * Edits an existing category or initializes a new one.
     *
     * @param int|null $id The ID of the category to edit (optional).
     * @return \yii\web\Response The rendered template for editing or creating a category.
     */
    public function actionEditCategory(int $id = null): Response
    {
        $category = null;

        if ($id) {
            $category = (new \yii\db\Query())
                ->select(["id", "name"])
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

    /**
     * Saves a category to the database.
     *
     * @return \yii\web\Response Redirects to the categories settings page after saving.
     */
    public function actionSaveCategory(): Response
    {
        $this->requirePostRequest();

        $request = Craft::$app->getRequest();
        $uid = $request->getBodyParam("id");
        $name = $request->getBodyParam("name");

        if (!$name) {
            Craft::$app->getSession()->setError("Category name is required.");
            return $this->redirectToPostedUrl();
        }

        $path = "blocksmith.blocksmithCategories";

        $existingCategories = Craft::$app->projectConfig->get($path) ?? [];

        if (!$uid) {
            $uid = StringHelper::UUID();
        }

        $sortOrder =
            $existingCategories[$uid]["sortOrder"] ??
            count($existingCategories) + 1;

        Craft::$app->projectConfig->set("$path.$uid", [
            "name" => $name,
            "sortOrder" => $sortOrder,
        ]);

        Craft::$app->getSession()->setNotice("Category saved successfully.");
        return $this->redirect("blocksmith/settings/categories");
    }

    /**
     * Deletes a category and updates any related block data.
     *
     * @return \yii\web\Response JSON response indicating success or failure.
     */
    public function actionDeleteCategory(): Response
    {
        $this->requirePostRequest();

        $request = Craft::$app->getRequest();
        $uid = $request->getBodyParam("id"); // ID = UID!

        if (!$uid) {
            return $this->asJson([
                "success" => false,
                "error" => "Category UID is required.",
            ]);
        }

        $path = "blocksmith.blocksmithCategories.$uid";

        try {
            Craft::$app->projectConfig->remove($path);
            Craft::$app->projectConfig->processConfigChanges($path);

            Craft::info(
                "Blocksmith: Deleted category with UID {$uid} from Project Config.",
                __METHOD__
            );

            // @todo: Remove references to this category UID from blocksmith_blockdata once blocksmith_blockdata is migrated to Project Config

            return $this->asJson(["success" => true]);
        } catch (\Throwable $e) {
            Craft::error(
                "Blocksmith: Failed to delete category UID {$uid}: " .
                    $e->getMessage(),
                __METHOD__
            );

            return $this->asJson([
                "success" => false,
                "error" => "Failed to delete category.",
            ]);
        }
    }

    /**
     * Reorders categories based on the provided IDs.
     *
     * @return \yii\web\Response JSON response indicating success or failure.
     */
    public function actionReorderCategories(): Response
    {
        $this->requirePostRequest();

        $ids = Craft::$app->getRequest()->getRequiredBodyParam("ids");

        // IDs können als JSON-String kommen – sicherstellen, dass sie ein Array sind
        if (is_string($ids)) {
            $ids = json_decode($ids, true);
        }

        if (!is_array($ids)) {
            Craft::error(
                "Blocksmith: Failed to decode category IDs for reorder.",
                __METHOD__
            );
            return $this->asJson([
                "success" => false,
                "error" => "Invalid IDs format.",
            ]);
        }

        $categoriesPath = "blocksmith.blocksmithCategories";
        $categories = Craft::$app->projectConfig->get($categoriesPath) ?? [];

        foreach ($ids as $sortOrder => $uid) {
            if (isset($categories[$uid])) {
                $categories[$uid]["sortOrder"] = $sortOrder + 1;
            } else {
                Craft::warning(
                    "Blocksmith: UID {$uid} not found during reorder.",
                    __METHOD__
                );
            }
        }

        try {
            // Ganze Kategorien-Struktur zurückschreiben
            Craft::$app->projectConfig->set($categoriesPath, $categories);

            Craft::info(
                "Blocksmith: Categories reordered successfully.",
                __METHOD__
            );

            return $this->asJson(["success" => true]);
        } catch (\Throwable $e) {
            Craft::error(
                "Blocksmith: Failed to reorder categories: " . $e->getMessage(),
                __METHOD__
            );

            return $this->asJson([
                "success" => false,
                "error" => "Failed to reorder categories.",
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
        $settings = Blocksmith::getInstance()->getSettings();

        $matrixFields = Blocksmith::getInstance()->service->getAllMatrixFields();

        $savedSettings =
            Craft::$app->projectConfig->get(
                "blocksmith.blocksmithMatrixFields"
            ) ?? [];

        $matrixFieldSettings = [];
        foreach ($matrixFields as $field) {
            $uid = $field->uid;

            $matrixFieldSettings[] = [
                "name" => $field->name,
                "handle" => $field->handle,
                "enablePreview" => isset($savedSettings[$uid])
                    ? (bool) $savedSettings[$uid]["enablePreview"]
                    : true,
            ];
        }

        return $this->renderTemplate("blocksmith/_settings/matrix-fields", [
            "matrixFields" => $matrixFieldSettings,
            "enableCardsSupport" => $settings->enableCardsSupport,
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
            $field = Craft::$app->fields->getFieldByHandle($fieldHandle);

            if ($field && $field instanceof \craft\fields\Matrix) {
                $uid = $field->uid;
                $path = "blocksmith.blocksmithMatrixFields.$uid";

                Craft::$app->projectConfig->set($path, [
                    "fieldHandle" => $fieldHandle,
                    "enablePreview" => (bool) $enablePreview,
                ]);

                Craft::info(
                    "Blocksmith: Saved matrix field setting for '{$fieldHandle}' (UID: {$uid}) to Project Config.",
                    __METHOD__
                );
            } else {
                Craft::warning(
                    "Blocksmith: Cannot save setting, matrix field '{$fieldHandle}' not found.",
                    __METHOD__
                );
            }
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
        $this->requireAcceptsJson();

        $savedSettings =
            Craft::$app->projectConfig->get(
                "blocksmith.blocksmithMatrixFields"
            ) ?? [];

        $result = [];

        foreach (Craft::$app->fields->getAllFields() as $field) {
            if ($field instanceof \craft\fields\Matrix) {
                $uid = $field->uid;
                $handle = $field->handle;

                $enablePreview = true;
                if (isset($savedSettings[$uid])) {
                    $enablePreview =
                        (bool) ($savedSettings[$uid]["enablePreview"] ?? true);
                }

                $result[$handle] = [
                    "enablePreview" => $enablePreview,
                ];
            }
        }

        return $this->asJson($result);
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

        $savedSettings =
            Craft::$app->projectConfig->get(
                "blocksmith.blocksmithMatrixFields"
            ) ?? [];

        $fieldsEnabled = [];
        foreach (Craft::$app->fields->getAllFields() as $field) {
            if ($field instanceof \craft\fields\Matrix) {
                $uid = $field->uid;
                if (
                    isset($savedSettings[$uid]) &&
                    !empty($savedSettings[$uid]["enablePreview"])
                ) {
                    $fieldsEnabled[$field->handle] = true;
                }
            }
        }

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
            if (isset($fieldsEnabled[$matrixField->handle])) {
                foreach ($matrixField->getEntryTypes() as $blockType) {
                    $blockHandle = $blockType->handle;
                    $entryTypeId = $blockType->id;

                    $data = $blockData[$entryTypeId] ?? null;

                    $categoryIds = [];
                    if (isset($data["categories"])) {
                        $decodedCategories = json_decode(
                            $data["categories"],
                            true
                        );
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

                    if (
                        $useHandleBasedPreviews &&
                        $settings->previewImageVolume
                    ) {
                        $volume = Craft::$app->volumes->getVolumeByUid(
                            $settings->previewImageVolume
                        );
                        if ($volume) {
                            $baseVolumeUrl = rtrim($volume->getRootUrl(), "/");
                            $subfolder = $settings->previewImageSubfolder
                                ? "/" .
                                    trim($settings->previewImageSubfolder, "/")
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
        }

        $matrixFieldSettings = [];
        foreach ($matrixFields as $field) {
            $uid = $field->uid;
            $enablePreview = true; // Default

            if (isset($savedSettings[$uid])) {
                $enablePreview =
                    (bool) ($savedSettings[$uid]["enablePreview"] ?? true);
            }

            $matrixFieldSettings[] = [
                "name" => $field->name,
                "handle" => $field->handle,
                "enablePreview" => $enablePreview,
            ];
        }

        return $this->renderTemplate("blocksmith/_settings/blocks", [
            "plugin" => Blocksmith::getInstance(),
            "title" => Craft::t("blocksmith", "Blocksmith"),
            "allBlockTypes" => $allBlockTypes,
            "placeholderImageUrl" => $placeholderImageUrl,
            "matrixFields" => $matrixFieldSettings,
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

        $categories = Blocksmith::getInstance()->service->getAllCategories();

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
