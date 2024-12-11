<?php

namespace mediakreativ\blocksmith\migrations;

use Craft;
use craft\db\Migration;

/**
 * Install migration for the Blocksmith plugin
 */
class Install extends Migration
{
    /**
     * Applies the migration (create tables)
     *
     * @return bool
     */
    public function safeUp(): bool
    {
        // Create the blocksmith_categories table
        $this->createTable("{{%blocksmith_categories}}", [
            "id" => $this->primaryKey(),
            "name" => $this->string()->notNull(),
            "description" => $this->text(),
            "dateCreated" => $this->dateTime()
                ->notNull()
                ->defaultExpression("CURRENT_TIMESTAMP"),
            "dateUpdated" => $this->dateTime()
                ->notNull()
                ->defaultExpression(
                    "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
                ),
            "uid" => $this->char(36)->notNull(),
        ]);

        // Create the blocksmith_blockdata table
        $this->createTable("{{%blocksmith_blockdata}}", [
            "id" => $this->primaryKey(),
            "entryTypeId" => $this->integer()->notNull(),
            "description" => $this->text(),
            "categories" => $this->json(),
            "previewImageId" => $this->integer(), // Neue Spalte hinzugefügt
            "previewImageUrl" => $this->string(),
            "dateCreated" => $this->dateTime()
                ->notNull()
                ->defaultExpression("CURRENT_TIMESTAMP"),
            "dateUpdated" => $this->dateTime()
                ->notNull()
                ->defaultExpression(
                    "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
                ),
            "uid" => $this->char(36)->notNull(),
        ]);

        // Add a UNIQUE constraint on entryTypeId
        $this->createIndex(
            "blocksmith_blockdata_entryTypeId_unique",
            "{{%blocksmith_blockdata}}",
            "entryTypeId",
            true
        );

        // Add a foreign key to the blocksmith_blockdata table
        $this->addForeignKey(
            null,
            "{{%blocksmith_blockdata}}",
            "entryTypeId",
            "{{%entrytypes}}",
            "id",
            "CASCADE"
        );

        // Add a foreign key for previewImageId (Assets table)
        $this->addForeignKey(
            null,
            "{{%blocksmith_blockdata}}",
            "previewImageId",
            "{{%assets}}",
            "id",
            "SET NULL"
        );

        Craft::info("Blocksmith tables installed successfully.", __METHOD__);

        return true;
    }

    /**
     * Rolls back the migration (drop tables)
     *
     * @return bool
     */
    public function safeDown(): bool
    {
        $this->dropTableIfExists("{{%blocksmith_blockdata}}");
        $this->dropTableIfExists("{{%blocksmith_categories}}");

        Craft::info("Blocksmith tables uninstalled successfully.", __METHOD__);

        return true;
    }
}
