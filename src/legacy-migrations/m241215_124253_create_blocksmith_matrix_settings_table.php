<?php

namespace mediakreativ\blocksmith\migrations;

use Craft;
use craft\db\Migration;

/**
 * Creates the blocksmith_matrix_settings table
 */
class m241215_124253_create_blocksmith_matrix_settings_table extends Migration
{
    /**
     * @inheritdoc
     */
    public function safeUp(): bool
    {
        // Überprüfe, ob die Tabelle bereits existiert
        if ($this->db->tableExists("{{%blocksmith_matrix_settings}}")) {
            Craft::info(
                'Table "blocksmith_matrix_settings" already exists.',
                __METHOD__
            );
            return true;
        }

        // Erstelle die Tabelle
        $this->createTable("{{%blocksmith_matrix_settings}}", [
            "id" => $this->primaryKey(),
            "fieldHandle" => $this->string(255)->notNull()->unique(),
            "enablePreview" => $this->boolean()->defaultValue(true),
            "dateCreated" => $this->dateTime()->notNull(),
            "dateUpdated" => $this->dateTime()->notNull(),
            "uid" => $this->uid(),
        ]);

        $matrixFields = Craft::$app->fields->getAllFields();
        foreach ($matrixFields as $field) {
            if ($field instanceof \craft\fields\Matrix) {
                $this->insert("{{%blocksmith_matrix_settings}}", [
                    "fieldHandle" => $field->handle,
                    "enablePreview" => true,
                    "dateCreated" => new \yii\db\Expression("NOW()"),
                    "dateUpdated" => new \yii\db\Expression("NOW()"),
                    "uid" => Craft::$app->getSecurity()->generateRandomString(),
                ]);
            }
        }

        Craft::info(
            'Table "blocksmith_matrix_settings" created successfully.',
            __METHOD__
        );

        return true;
    }

    /**
     * @inheritdoc
     */
    public function safeDown(): bool
    {
        // Lösche die Tabelle
        $this->dropTableIfExists("{{%blocksmith_matrix_settings}}");

        Craft::info('Table "blocksmith_matrix_settings" removed.', __METHOD__);

        return true;
    }
}
