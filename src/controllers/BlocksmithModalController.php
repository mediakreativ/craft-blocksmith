<?php
// src/controllers/BlocksmithModalController.php

namespace mediakreativ\blocksmith\controllers;

use Craft;
use craft\web\Controller;
use yii\web\Response;
use mediakreativ\blocksmith\Blocksmith;

/**
 * Blocksmith Modal Controller
 *
 * Provides endpoints for the block selection modal so that non-admins
 * can retrieve block types and categories.
 */
class BlocksmithModalController extends Controller
{
    // No anonymous access – requireLogin() is sufficient
    protected array|int|bool $allowAnonymous = self::ALLOW_ANONYMOUS_NEVER;

    /**
     * Before each action: Allow only logged-in users.
     *
     * @param \yii\base\Action $action
     * @return bool
     */
    public function beforeAction($action): bool
    {
        if (!parent::beforeAction($action)) {
            return false;
        }
        $this->requireLogin();
        return true;
    }

    /**
     * Returns the block types with their descriptions and additional data as JSON.
     *
     * @return Response JSON response with block types
     */
    public function actionGetBlockTypes(): Response
    {
        $placeholderImageUrl = Blocksmith::getInstance()->service->getPlaceholderImageUrl();
        $request = Craft::$app->getRequest();
        $fieldsService = Craft::$app->fields;

        $settings = Blocksmith::getInstance()->getSettings();
        $previewStorageMode = $settings->previewStorageMode;

        $requestedHandle = $request->getParam("handle");
        $blockConfig =
            Craft::$app->projectConfig->get("blocksmith.blocksmithBlocks") ??
            [];
        $matrixConfig =
            Craft::$app->projectConfig->get(
                "blocksmith.blocksmithMatrixFields"
            ) ?? [];
        $categoryConfig =
            Craft::$app->projectConfig->get(
                "blocksmith.blocksmithCategories"
            ) ?? [];

        $fields = array_filter(
            $fieldsService->getAllFields(),
            fn($field) => $field instanceof \craft\fields\Matrix
        );

        $enabledFields = array_filter($fields, function ($field) use (
            $matrixConfig,
            $requestedHandle
        ) {
            return isset($matrixConfig[$field->uid]) &&
                ($matrixConfig[$field->uid]["enablePreview"] ?? true) &&
                (!$requestedHandle || $field->handle === $requestedHandle);
        });

        $blockTypes = [];
        $seenEntryUids = [];

        foreach ($enabledFields as $field) {
            foreach ($field->getEntryTypes() as $entryType) {
                $entryTypeUid = $entryType->uid;
                $entryTypeHandle = $entryType->handle;

                if (isset($seenEntryUids[$entryTypeUid])) {
                    continue;
                }
                $seenEntryUids[$entryTypeUid] = true;

                $block = null;
                foreach ($blockConfig as $uid => $config) {
                    if (($config["entryTypeUid"] ?? null) === $entryTypeUid) {
                        $block = $config;
                        break;
                    }
                }

                $description = $block["description"] ?? null;
                $previewImagePath = $block["previewImagePath"] ?? null;

                $categories = [];
                foreach ($block["categories"] ?? [] as $catUid) {
                    if (isset($categoryConfig[$catUid])) {
                        $categories[] = $catUid;
                    }
                }

                $previewImage = Blocksmith::getInstance()->service->resolvePreviewImageUrl(
                    $entryTypeHandle,
                    $previewImagePath
                );

                $matrixFields = [];
                foreach ($fields as $potentialField) {
                    foreach ($potentialField->getEntryTypes() as $et) {
                        if ($et->handle === $entryTypeHandle) {
                            $matrixFields[] = [
                                "name" => $potentialField->name,
                                "handle" => $potentialField->handle,
                            ];
                            break;
                        }
                    }
                }

                $blockTypes[] = [
                    "name" => $entryType->name,
                    "handle" => $entryTypeHandle,
                    "description" => $description,
                    "categories" => $categories,
                    "previewImage" => $previewImage,
                    "matrixFields" => $matrixFields,
                    "previewStorageMode" => $previewStorageMode,
                ];
            }
        }

        return $this->asJson($blockTypes);
    }

    /**
     * Returns all categories, sorted by their sort order, as JSON.
     *
     * @return Response JSON response with categories
     */
    public function actionGetCategories(): Response
    {
        $categories = Blocksmith::getInstance()->service->getAllCategories();

        return $this->asJson($categories);
    }
}
