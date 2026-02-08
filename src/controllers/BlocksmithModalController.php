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

        // Build a mapping of handle overrides to original field handles,
        // so that fields with custom handles in entry type layouts are matched.
        $handleOverrideMap = [];
        if ($requestedHandle) {
            foreach (Craft::$app->entries->getAllEntryTypes() as $entryType) {
                $fieldLayout = $entryType->getFieldLayout();
                if (!$fieldLayout) {
                    continue;
                }
                foreach ($fieldLayout->getCustomFieldElements() as $layoutElement) {
                    $field = $layoutElement->getField();
                    // Note: getField() returns a clone with the overridden handle,
                    // so we must use getOriginalHandle() to get the real field handle.
                    $originalHandle = $layoutElement->getOriginalHandle();
                    if (
                        $field instanceof \craft\fields\Matrix &&
                        $field->handle !== $originalHandle
                    ) {
                        $handleOverrideMap[$field->handle] = $originalHandle;
                    }
                }
            }
        }

        // Resolve the requested handle to the original field handle if it's an override
        $resolvedHandle = $requestedHandle;
        if ($requestedHandle && isset($handleOverrideMap[$requestedHandle])) {
            $resolvedHandle = $handleOverrideMap[$requestedHandle];
        }

        $enabledFields = array_filter($fields, function ($field) use (
            $matrixConfig,
            $resolvedHandle
        ) {
            return isset($matrixConfig[$field->uid]) &&
                ($matrixConfig[$field->uid]["enablePreview"] ?? true) &&
                (!$resolvedHandle || $field->handle === $resolvedHandle);
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
                            $fieldHandle = $potentialField->handle;
                            $matrixFields[] = [
                                "name" => Craft::t('site', $potentialField->name) ?: $potentialField->name,
                                "handle" => $fieldHandle,
                            ];
                            // If the requested handle is an override of this field,
                            // also add an entry with the override handle so the
                            // frontend filter matches correctly.
                            if (
                                $requestedHandle &&
                                $requestedHandle !== $fieldHandle &&
                                isset($handleOverrideMap[$requestedHandle]) &&
                                $handleOverrideMap[$requestedHandle] === $fieldHandle
                            ) {
                                $matrixFields[] = [
                                    "name" => Craft::t('site', $potentialField->name) ?: $potentialField->name,
                                    "handle" => $requestedHandle,
                                ];
                            }
                            break;
                        }
                    }
                }

                $blockTypes[] = [
                    "name" => Craft::t('site', $entryType->name),
                    "handle" => $entryTypeHandle,
                    "description" => $description ? (Craft::t('site', $description) ?: $description) : null,
                    "categories" => $categories,
                    "previewImage" => $previewImage,
                    "matrixFields" => $matrixFields,
                    "previewStorageMode" => $previewStorageMode,
                ];
            }
        }

        return $this->asJson([
            "blockTypes" => $blockTypes,
            "placeholderImageUrl" => $placeholderImageUrl,
        ]);
    }

    /**
     * Returns all categories, sorted by their sort order, as JSON.
     *
     * @return Response JSON response with categories
     */
    public function actionGetCategories(): Response
    {
        $categories = Blocksmith::getInstance()->service->getAllCategories();
        
        // Translate category names for Content Editors
        foreach ($categories as &$category) {
            $category['name'] = Craft::t('site', $category['name']) ?: $category['name'];
        }

        return $this->asJson($categories);
    }
}
