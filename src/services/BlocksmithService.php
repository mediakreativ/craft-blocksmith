<?php
// src/services/BlocksmithService.php

namespace mediakreativ\blocksmith\services;

use Craft;
use craft\fields\Matrix;
use mediakreativ\blocksmith\Blocksmith;

/**
 * Blocksmith Service
 *
 * Provides core functionality for managing Craft CMS Matrix fields.
 */
class BlocksmithService
{
    /**
     * Retrieves all Matrix fields in the system.
     *
     * @return array An array of Matrix fields.
     */
    public function getAllMatrixFields(): array
    {
        $fields = Craft::$app->getFields()->getAllFields();

        $matrixFields = array_filter(
            $fields,
            fn($field) => $field instanceof Matrix
        );

        Craft::info(
            "Matrix fields found: " .
                implode(
                    ", ",
                    array_map(fn($field) => $field->handle, $matrixFields)
                ),
            __METHOD__
        );

        return $matrixFields;
    }

    /**
     * Retrieves a Matrix field by its handle.
     *
     * @param string $handle The handle of the Matrix field.
     * @return Matrix|null The Matrix field object or null if not found.
     */
    public function getMatrixFieldByHandle(string $handle): ?Matrix
    {
        $field = Craft::$app->getFields()->getFieldByHandle($handle);

        if ($field instanceof Matrix) {
            return $field;
        }

        Craft::warning(
            "Field with handle '{$handle}' is either not found or not a Matrix field.",
            __METHOD__
        );

        return null;
    }

    /**
     * Logs detailed information about all Matrix fields.
     *
     * @return void
     */
    public function logMatrixFieldDetails(): void
    {
        $matrixFields = $this->getAllMatrixFields();

        foreach ($matrixFields as $field) {
            $details = Blocksmith::t(
                "Matrix Field: Name='{name}', Handle='{handle}', Settings='{settings}'",
                [
                    "name" => $field->name,
                    "handle" => $field->handle,
                    "settings" => json_encode($field->settings),
                ]
            );

            Craft::info($details, __METHOD__);
        }
    }

    /**
     * Retrieves all categories from Project Config, sorted by sortOrder.
     *
     * @return array
     */
    public function getAllCategories(): array
    {
        $categoriesFromConfig =
            Craft::$app->projectConfig->get(
                "blocksmith.blocksmithCategories"
            ) ?? [];

        $categories = [];

        foreach ($categoriesFromConfig as $uid => $data) {
            if (!isset($data["name"])) {
                Craft::warning(
                    "Blocksmith: Skipping invalid category entry (missing name) for UID {$uid}.",
                    __METHOD__
                );
                continue;
            }

            $categories[] = [
                "uid" => $uid,
                "name" => $data["name"],
                "sortOrder" => (int) ($data["sortOrder"] ?? 0),
            ];
        }

        usort($categories, function ($a, $b) {
            return $a["sortOrder"] <=> $b["sortOrder"];
        });

        return $categories;
    }

    /**
     * Resolves the preview image URL for a given block handle.
     *
     * This supports all previewStorageMode types:
     * - "web": Looks for /blocksmith/previews/{handle}.png
     * - "volume": Searches the selected volume for an asset named {handle}.png
     * - fallback: Returns /blocksmith/blocksmith-assets/placeholder.png
     *
     * @param string $blockHandle The handle of the block (usually the EntryType handle).
     * @param string|null $explicitUrl Optional manually set previewImagePath (only used if handle-based previews are disabled).
     * @return string The resolved public URL to the preview image.
     */
    public function resolvePreviewImageUrl(
        string $blockHandle,
        ?string $previewImagePath = null
    ): string {
        $placeholder = "/blocksmith/blocksmith-assets/placeholder.png";

        if ($previewImagePath) {
            return "/" . ltrim($previewImagePath, "/");
        }

        $settings = Blocksmith::getInstance()->getSettings();
        if (!$settings->useHandleBasedPreviews) {
            return $placeholder;
        }

        if ($settings->previewStorageMode === "web") {
            return "/blocksmith/previews/{$blockHandle}.png";
        }

        if ($settings->previewImageVolume) {
            $volume = Craft::$app->volumes->getVolumeByUid(
                $settings->previewImageVolume
            );
            if ($volume) {
                $base = rtrim($volume->getRootUrl(), "/");
                $subfolder = $settings->previewImageSubfolder
                    ? "/" . trim($settings->previewImageSubfolder, "/")
                    : "";
                return "{$base}{$subfolder}/{$blockHandle}.png";
            }
        }

        return $placeholder;
    }
}
