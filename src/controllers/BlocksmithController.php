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
     * validates it, and stores it in the Project Config YAML.
     *
     * @return \yii\web\Response Redirects to the posted URL after saving
     */
    public function actionSaveSettings(): Response
    {
        $request = Craft::$app->getRequest();

        if (!Craft::$app->getConfig()->getGeneral()->allowAdminChanges) {
            Craft::$app
                ->getSession()
                ->setError(
                    Craft::t(
                        "blocksmith",
                        "Settings cannot be changed in this environment."
                    )
                );
            return $this->redirectToPostedUrl();
        }

        $settings = Blocksmith::getInstance()->getSettings();

        $settings->wideViewFourBlocks = (bool) $request->getBodyParam(
            "wideViewFourBlocks"
        );
        $settings->useHandleBasedPreviews = (bool) $request->getBodyParam(
            "useHandleBasedPreviews"
        );

        $settings->previewStorageMode = $request->getBodyParam(
            "previewStorageMode",
            "web"
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

        if (!$settings->useHandleBasedPreviews) {
            $settings->previewStorageMode = null;
            $settings->previewImageVolume = null;
            $settings->previewImageSubfolder = null;
        } elseif ($settings->previewStorageMode === "web") {
            $settings->previewImageVolume = null;
            $settings->previewImageSubfolder = null;
        } elseif (empty($settings->previewImageVolume)) {
            $volumes = Craft::$app->getVolumes()->getAllVolumes();
            $settings->previewImageVolume = $volumes[0]->uid ?? null;
        }

        if ($settings->useHandleBasedPreviews) {
            $blockConfig =
                Craft::$app->projectConfig->get(
                    "blocksmith.blocksmithBlocks"
                ) ?? [];
            foreach ($blockConfig as $blockUid => $blockData) {
                if (isset($blockData["previewImagePath"])) {
                    unset($blockData["previewImagePath"]);
                    Craft::$app->projectConfig->set(
                        "blocksmith.blocksmithBlocks.$blockUid",
                        $blockData
                    );
                }
            }
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
     * category, and preview image. It validates the data and stores it in the Project Config YAML.
     *
     * @return \yii\web\Response Redirects to the posted URL after saving
     */
    public function actionSaveBlockSettings(): Response
    {
        $request = Craft::$app->getRequest();

        if (!Craft::$app->getConfig()->getGeneral()->allowAdminChanges) {
            Craft::$app
                ->getSession()
                ->setError(
                    Craft::t(
                        "blocksmith",
                        "Block settings cannot be changed in this environment."
                    )
                );
            return $this->redirectToPostedUrl();
        }

        $entryTypeId = (int) $request->getBodyParam("entryTypeId");
        $description = trim((string) $request->getBodyParam("description"));
        $categories = $request->getBodyParam("categories", []);
        $previewImagePath = trim(
            (string) $request->getBodyParam("previewImagePath")
        );

        $categoriesArray = is_array($categories)
            ? array_map("strval", $categories)
            : [];

        if (!$entryTypeId) {
            Craft::$app->getSession()->setError("Entry Type ID is required.");
            return $this->redirectToPostedUrl();
        }

        $entryType = Craft::$app->entries->getEntryTypeById($entryTypeId);
        if (!$entryType) {
            Craft::error("Invalid entryTypeId: {$entryTypeId}", __METHOD__);
            Craft::$app->getSession()->setError("Invalid Entry Type.");
            return $this->redirectToPostedUrl();
        }

        $entryTypeUid = $entryType->uid;

        $blockConfig =
            Craft::$app->projectConfig->get("blocksmith.blocksmithBlocks") ??
            [];

        $blockUid = null;
        foreach ($blockConfig as $uid => $config) {
            if (($config["entryTypeUid"] ?? null) === $entryTypeUid) {
                $blockUid = $uid;
                break;
            }
        }

        if (!$blockUid) {
            $blockUid = \craft\helpers\StringHelper::UUID();
        }

        $path = "blocksmith.blocksmithBlocks.$blockUid";

        $configData = [
            "entryTypeUid" => $entryTypeUid,
            "description" => $description ?: null,
            "categories" => $categoriesArray,
        ];

        if ($previewImagePath !== "") {
            $configData["previewImagePath"] = $previewImagePath;
        }

        Craft::$app->projectConfig->set($path, $configData);

        Craft::$app
            ->getSession()
            ->setNotice("Block settings saved successfully.");
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
            "edition" => Blocksmith::getInstance()->edition,
        ]);
    }

    /**
     * Edits an existing category or initializes a new one.
     *
     * @param int|null $id The ID of the category to edit (optional).
     * @return \yii\web\Response The rendered template for editing or creating a category.
     */
    public function actionEditCategory(string $uid = null): Response
    {
        $category = null;

        if ($uid) {
            $categories =
                Craft::$app->projectConfig->get(
                    "blocksmith.blocksmithCategories"
                ) ?? [];

            if (!isset($categories[$uid])) {
                Craft::$app->getSession()->setError("Category not found.");
                return $this->redirect("blocksmith/settings/categories");
            }

            $category = [
                "uid" => $uid,
                "name" => $categories[$uid]["name"] ?? "",
            ];
        }

        return $this->renderTemplate("blocksmith/_settings/edit-category", [
            "category" => $category,
        ]);
    }

    /**
     * Saves a category to the config.
     *
     * @return \yii\web\Response Redirects to the categories settings page after saving.
     */
    public function actionSaveCategory(): Response
    {
        $this->requirePostRequest();
        $request = Craft::$app->getRequest();

        if (!Craft::$app->getConfig()->getGeneral()->allowAdminChanges) {
            Craft::$app
                ->getSession()
                ->setError(
                    Craft::t(
                        "blocksmith",
                        "Categories cannot be modified in this environment."
                    )
                );
            return $this->redirectToPostedUrl();
        }

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
        if (!Craft::$app->getConfig()->getGeneral()->allowAdminChanges) {
            return $this->asJson([
                "success" => false,
                "error" => "Project config is read-only in this environment.",
            ]);
        }

        $this->requirePostRequest();
        $request = Craft::$app->getRequest();

        $uid = $request->getBodyParam("id");

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

            $blockConfig =
                Craft::$app->projectConfig->get(
                    "blocksmith.blocksmithBlocks"
                ) ?? [];

            foreach ($blockConfig as $blockUid => $blockData) {
                $updatedCategories = array_filter(
                    $blockData["categories"] ?? [],
                    function ($categoryUid) use ($uid) {
                        return $categoryUid !== $uid;
                    }
                );

                if (
                    count($updatedCategories) !==
                    count($blockData["categories"] ?? [])
                ) {
                    Craft::$app->projectConfig->set(
                        "blocksmith.blocksmithBlocks.$blockUid.categories",
                        $updatedCategories
                    );
                    Craft::info(
                        "Blocksmith: Updated categories for block UID {$blockUid} after category UID {$uid} removal.",
                        __METHOD__
                    );
                }
            }

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
        if (!Craft::$app->getConfig()->getGeneral()->allowAdminChanges) {
            return $this->asJson([
                "success" => false,
                "error" => "Reordering is not allowed in this environment.",
            ]);
        }

        $this->requirePostRequest();

        $ids = Craft::$app->getRequest()->getRequiredBodyParam("ids");

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
                "uiMode" => isset($savedSettings[$uid]["uiMode"])
                    ? ($savedSettings[$uid]["uiMode"] === "modal" &&
                    Blocksmith::getInstance()->edition !== "pro"
                        ? "btngroup"
                        : $savedSettings[$uid]["uiMode"])
                    : "btngroup",
            ];
        }

        return $this->renderTemplate("blocksmith/_settings/matrix-fields", [
            "matrixFields" => $matrixFieldSettings,
            "enableCardsSupport" => $settings->enableCardsSupport,
            "edition" => Blocksmith::getInstance()->edition,
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

        if (!Craft::$app->getConfig()->getGeneral()->allowAdminChanges) {
            Craft::$app
                ->getSession()
                ->setError(
                    Craft::t(
                        "blocksmith",
                        "Matrix field settings cannot be changed in this environment."
                    )
                );
            return $this->redirectToPostedUrl();
        }

        $enablePreviews = $request->getBodyParam("enablePreview", []);
        $uiModes = $request->getBodyParam("uiMode", []);

        foreach ($enablePreviews as $fieldHandle => $enablePreview) {
            $field = Craft::$app->fields->getFieldByHandle($fieldHandle);

            if ($field && $field instanceof \craft\fields\Matrix) {
                $uid = $field->uid;
                $path = "blocksmith.blocksmithMatrixFields.$uid";

                Craft::$app->projectConfig->set($path, [
                    "fieldHandle" => $fieldHandle,
                    "enablePreview" => (bool) $enablePreview,
                    "uiMode" =>
                        ($uiModes[$fieldHandle] ?? "modal") === "modal" &&
                        Blocksmith::getInstance()->edition !== "pro"
                            ? "btngroup"
                            : $uiModes[$fieldHandle] ?? "modal",
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
                    "uiMode" => isset($savedSettings[$uid]["uiMode"])
                        ? ($savedSettings[$uid]["uiMode"] === "modal" &&
                        Blocksmith::getInstance()->edition !== "pro"
                            ? "btngroup"
                            : $savedSettings[$uid]["uiMode"])
                        : "btngroup",
                ];
            }
        }

        return $this->asJson(
            array_merge($result, [
                "edition" => Blocksmith::getInstance()->edition,
            ])
        );
    }

    /**
     * Renders the Blocks Settings page
     *
     * @return \yii\web\Response The rendered template for the Blocks Settings page
     */
    public function actionBlocks(): Response
    {
        $settings = Blocksmith::getInstance()->getSettings();
        $placeholderImageUrl = "/blocksmith/blocksmith-assets/placeholder.png";
        $useHandleBasedPreviews = $settings->useHandleBasedPreviews;

        $blockConfig =
            Craft::$app->projectConfig->get("blocksmith.blocksmithBlocks") ??
            [];

        $categoryConfig =
            Craft::$app->projectConfig->get(
                "blocksmith.blocksmithCategories"
            ) ?? [];

        $matrixFieldSettings =
            Craft::$app->projectConfig->get(
                "blocksmith.blocksmithMatrixFields"
            ) ?? [];

        $fieldsEnabled = [];
        foreach ($matrixFieldSettings as $uid => $config) {
            if (($config["enablePreview"] ?? true) === true) {
                $field = Craft::$app->fields->getFieldByUid($uid);
                if ($field instanceof \craft\fields\Matrix) {
                    $fieldsEnabled[$field->handle] = true;
                }
            }
        }

        $matrixFields = array_filter(
            Craft::$app->fields->getAllFields(),
            fn($field) => $field instanceof \craft\fields\Matrix
        );

        $allBlockTypes = [];

        foreach ($matrixFields as $matrixField) {
            if (!isset($fieldsEnabled[$matrixField->handle])) {
                continue;
            }

            foreach ($matrixField->getEntryTypes() as $entryType) {
                $blockHandle = $entryType->handle;
                $entryTypeUid = $entryType->uid;

                $config = null;
                foreach ($blockConfig as $uid => $data) {
                    if (($data["entryTypeUid"] ?? null) === $entryTypeUid) {
                        $config = $data;
                        break;
                    }
                }

                $description = $config["description"] ?? null;

                $categoryNames = [];
                $categoryUids = $config["categories"] ?? [];
                foreach ($categoryUids as $categoryUid) {
                    if (isset($categoryConfig[$categoryUid])) {
                        $categoryNames[] =
                            $categoryConfig[$categoryUid]["name"];
                    } else {
                        Craft::warning(
                            "Unknown category UID: {$categoryUid}",
                            __METHOD__
                        );
                    }
                }

                $previewImagePath = $config["previewImagePath"] ?? null;

                $previewImageUrl = Blocksmith::getInstance()->service->resolvePreviewImageUrl(
                    $blockHandle,
                    $previewImagePath
                );

                if (!isset($allBlockTypes[$blockHandle])) {
                    $allBlockTypes[$blockHandle] = [
                        "name" => $entryType->name,
                        "handle" => $blockHandle,
                        "description" => $description,
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

        $matrixFieldList = [];
        foreach ($matrixFields as $field) {
            $uid = $field->uid;
            $matrixFieldList[] = [
                "name" => $field->name,
                "handle" => $field->handle,
                "enablePreview" => isset($matrixFieldSettings[$uid])
                    ? (bool) $matrixFieldSettings[$uid]["enablePreview"]
                    : true,
            ];
        }

        return $this->renderTemplate("blocksmith/_settings/blocks", [
            "plugin" => Blocksmith::getInstance(),
            "title" => Craft::t("blocksmith", "Blocksmith"),
            "allBlockTypes" => $allBlockTypes,
            "placeholderImageUrl" => $placeholderImageUrl,
            "matrixFields" => $matrixFieldList,
            "edition" => Blocksmith::getInstance()->edition,
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
        $placeholderImageUrl = "/blocksmith/blocksmith-assets/placeholder.png";
        $handleBasedImageUrl = null;

        $volumeName = null;
        if (
            $useHandleBasedPreviews &&
            $settings->previewStorageMode === "volume" &&
            $settings->previewImageVolume
        ) {
            $volume = Craft::$app->volumes->getVolumeByUid(
                $settings->previewImageVolume
            );
            if ($volume) {
                $volumeName = $volume->name;
            }
        }

        $blockType = null;
        foreach (Craft::$app->fields->getAllFields() as $field) {
            if ($field instanceof \craft\fields\Matrix) {
                foreach ($field->getEntryTypes() as $entryType) {
                    if ($entryType->handle === $blockTypeHandle) {
                        $blockType = $entryType;
                        break 2;
                    }
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

        $entryTypeUid = $blockType->uid;
        $blockConfig =
            Craft::$app->projectConfig->get("blocksmith.blocksmithBlocks") ??
            [];

        $matchedBlock = null;
        foreach ($blockConfig as $uid => $config) {
            if (($config["entryTypeUid"] ?? null) === $entryTypeUid) {
                $matchedBlock = $config;
                break;
            }
        }

        $description = $matchedBlock["description"] ?? null;
        $previewImagePath = $matchedBlock["previewImagePath"] ?? null;
        $selectedCategories = $matchedBlock["categories"] ?? [];

        $categories = Blocksmith::getInstance()->service->getAllCategories();

        $previewImageUrl = Blocksmith::getInstance()->service->resolvePreviewImageUrl(
            $blockType->handle,
            $previewImagePath
        );

        $doesHandleBasedImageExist = false;

        if (
            $settings->useHandleBasedPreviews &&
            $settings->previewStorageMode === "web"
        ) {
            $absolutePath = Craft::getAlias(
                "@webroot/blocksmith/previews/" . $blockType->handle . ".png"
            );
            $doesHandleBasedImageExist = file_exists($absolutePath);
        } elseif (
            $settings->useHandleBasedPreviews &&
            $settings->previewStorageMode === "volume" &&
            $settings->previewImageVolume
        ) {
            $volume = Craft::$app->volumes->getVolumeByUid(
                $settings->previewImageVolume
            );
            if ($volume) {
                $baseUrl = rtrim($volume->getRootUrl(), "/");
                $subfolder = $settings->previewImageSubfolder
                    ? "/" . trim($settings->previewImageSubfolder, "/")
                    : "";
                $url = "{$baseUrl}{$subfolder}/{$blockType->handle}.png";

                try {
                    $headers = @get_headers($url);
                    $doesHandleBasedImageExist =
                        $headers && str_contains($headers[0], "200");
                } catch (\Throwable $e) {
                    $doesHandleBasedImageExist = false;
                }
            }
        }

        $handleBasedImageUrl = $useHandleBasedPreviews
            ? $previewImageUrl
            : null;

        $block = [
            "name" => $blockType->name,
            "handle" => $blockType->handle,
            "entryTypeId" => $blockType->id,
            "description" => $description,
            "previewImageUrl" => $previewImageUrl,
            "previewImagePath" => $previewImagePath,
            "previewStorageMode" => $settings->previewStorageMode,
            "categories" => $categories,
            "selectedCategories" => $selectedCategories,
            "useHandleBasedPreviews" => $useHandleBasedPreviews,
            "placeholderImageUrl" => $placeholderImageUrl,
            "handleBasedImageUrl" => $handleBasedImageUrl,
            "handleBasedImageExists" => $doesHandleBasedImageExist,
        ];

        return $this->renderTemplate("blocksmith/_settings/edit-block", [
            "block" => $block,
            "title" => Craft::t("blocksmith", "Edit Block"),
            "edition" => Blocksmith::getInstance()->edition,
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
