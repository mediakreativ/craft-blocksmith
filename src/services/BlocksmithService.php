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
}
