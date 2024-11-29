<?php
// src/models/BlocksmithSettings.php

namespace mediakreativ\blocksmith\models;

use craft\base\Model;
use mediakreativ\blocksmith\Blocksmith;

/**
 * Blocksmith Settings
 *
 * Represents the settings model for the Blocksmith plugin, allowing users
 * to configure volumes and subfolders for preview images.
 */
class BlocksmithSettings extends Model
{
    /**
     * The volume UID where preview images are stored.
     *
     * @var string|null
     */
    public ?string $previewImageVolume = null;

    /**
     * An optional subfolder within the selected volume.
     *
     * @var string|null
     */
    public ?string $previewImageSubfolder = null;

    /**
     * Defines validation rules for the settings attributes.
     *
     * @return array Validation rules for settings attributes.
     */
    public function defineRules(): array
    {
        return [
            [
                ["previewImageVolume"],
                "required",
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
        ];
    }
}
