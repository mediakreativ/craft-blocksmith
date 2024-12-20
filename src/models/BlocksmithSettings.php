<?php
// src/models/BlocksmithSettings.php

namespace mediakreativ\blocksmith\models;

use craft\base\Model;
use mediakreativ\blocksmith\Blocksmith;

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
                    return $model->useHandleBasedPreviews;
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
            [["useHandleBasedPreviews"], "boolean"],
            [["wideViewFourBlocks"], "boolean"],
        ];
    }
}
