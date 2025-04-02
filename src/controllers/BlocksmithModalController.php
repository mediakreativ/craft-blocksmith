<?php
// src/controllers/BlocksmithModalController.php

namespace mediakreativ\blocksmith\controllers;

use Craft;
use craft\web\Controller;
use yii\web\Response;

/**
 * Blocksmith Modal Controller
 *
 * Provides endpoints for the block selection modal so that non-admins
 * (e.g. editors who can edit entries in the CP) can retrieve block types and
 * categories.
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
        $placeholderImageUrl = "/blocksmith/images/placeholder.png";
        $fieldsService = Craft::$app->fields;

        $blockTypes = [];
        $processedEntryTypes = [];

        $allFields = $fieldsService->getAllFields();

        $fieldsEnabled = (new \yii\db\Query())
            ->select(["fieldHandle", "enablePreview"])
            ->from("{{%blocksmith_matrix_settings}}")
            ->indexBy("fieldHandle")
            ->where(["enablePreview" => true])
            ->all();

        foreach ($allFields as $field) {
            if (
                $field instanceof \craft\fields\Matrix &&
                isset($fieldsEnabled[$field->handle])
            ) {
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

                    $matrixFields = [];
                    foreach ($allFields as $potentialField) {
                        if ($potentialField instanceof \craft\fields\Matrix) {
                            $entryTypeHandles = array_map(
                                fn($type) => $type->handle,
                                $potentialField->getEntryTypes()
                            );
                            if (
                                in_array(
                                    $entryType->handle,
                                    $entryTypeHandles,
                                    true
                                )
                            ) {
                                $matrixFields[] = [
                                    "name" => $potentialField->name,
                                    "handle" => $potentialField->handle,
                                ];
                            }
                        }
                    }

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
                        "matrixFields" => $matrixFields,
                    ];
                }
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
        $categories = (new \yii\db\Query())
            ->select(["id", "name", "sortOrder"])
            ->from("{{%blocksmith_categories}}")
            ->orderBy(["sortOrder" => SORT_ASC])
            ->all();

        return $this->asJson($categories);
    }
}
