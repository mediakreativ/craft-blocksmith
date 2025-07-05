<?php
// src/models/BlocksmithSettings.php

namespace mediakreativ\blocksmith\models;

use craft\base\Model;
use mediakreativ\blocksmith\Blocksmith;
use Craft;

/**
 * Blocksmith Settings
 *
 * Represents the settings model for the Blocksmith plugin, allowing users
 * to configure volumes and subfolders for preview images
 */
class BlocksmithSettings extends Model
{
    public ?string $previewImageVolume = null;
    public ?string $previewImageSubfolder = null;
    public bool $wideViewFourBlocks = false;
    public bool $useHandleBasedPreviews = false;
    public ?string $previewStorageMode = null;
    public bool $enableCardsSupport = true;
    public array $matrixFieldSettings = [];
    public bool $useEntryTypeGroups = false;

    /**
     * Defines validation rules for the settings attributes
     *
     * @return array Validation rules for settings attributes
     */
    public function rules(): array
    {
        return [
            [
                ["previewImageVolume"],
                "required",
                "when" => function ($model) {
                    return $model->useHandleBasedPreviews &&
                        $model->previewStorageMode === "volume";
                },
                "message" => Blocksmith::t(
                    "Please select a volume for preview images."
                ),
            ],
            [
                ["previewImageSubfolder"],
                "string",
                "message" => Blocksmith::t(
                    "The subfolder must be a valid string."
                ),
            ],
            [["previewStorageMode"], "in", "range" => ["volume", "web"]],
            [["useHandleBasedPreviews"], "boolean"],
            [["wideViewFourBlocks"], "boolean"],
            [["enableCardsSupport"], "boolean"],
            [["useEntryTypeGroups"], "boolean"],
        ];
    }

    /**
     * Ensures that Entry Type Groups setting is disabled on unsupported Craft versions.
     */
    public function normalizeSettings(): void
    {
        if (version_compare(Craft::$app->getVersion(), "5.8", "<")) {
            $this->useEntryTypeGroups = false;
        }
    }
}
