<?php

namespace mediakreativ\blocksmith\migrations;

use Craft;
use craft\db\Migration;

/**
 * m241219_123456_add_favorites_table migration.
 */
class m241219_123456_add_favorites_table extends Migration
{
    /**
     * @inheritdoc
     */
    public function safeUp(): bool
    {
        // Create the blocksmith_favorites table
        $this->createTable("{{%blocksmith_favorites}}", [
            "id" => $this->primaryKey(),
            "userId" => $this->integer()->notNull(),
            "blockId" => $this->integer()->notNull(),
            "siteId" => $this->integer(),
            "dateCreated" => $this->dateTime()->notNull(),
            "dateUpdated" => $this->dateTime()->notNull(),
            "uid" => $this->uid(),
        ]);

        // Add foreign key for userId
        $this->addForeignKey(
            null,
            "{{%blocksmith_favorites}}",
            "userId",
            "{{%users}}",
            "id",
            "CASCADE",
            "CASCADE"
        );

        // Add foreign key for siteId (optional for multisite support)
        $this->addForeignKey(
            null,
            "{{%blocksmith_favorites}}",
            "siteId",
            "{{%sites}}",
            "id",
            "SET NULL",
            "CASCADE"
        );

        return true;
    }

    /**
     * @inheritdoc
     */
    public function safeDown(): bool
    {
        $this->dropTableIfExists("{{%blocksmith_favorites}}");

        return true;
    }
}
