<?php
// src/migrations/m20241206_220000_create_blocksmith_block_data_table.php
namespace mediakreativ\blocksmith\migrations;

use Craft;
use craft\db\Migration;

/**
 * Migration: Create blocksmith_blockdata table
 *
 * This migration creates a new database table to store additional data
 * for Blocksmith blocks, such as description, category, and preview image.
 */
class m20241206_220000_create_blocksmith_block_data_table extends Migration
{
    /**
     * Applies the migration (create table).
     *
     * @return bool
     */
    public function safeUp(): bool
    {
        // Create the table
        $this->createTable('{{%blocksmith_blockdata}}', [
            'id' => $this->primaryKey(), // Primary key
            'entryTypeId' => $this->integer()->notNull(), // Reference to Entry Type
            'description' => $this->text(), // Block description
            'category' => $this->string(), // Category
            'previewImageUrl' => $this->string(), // URL of the preview image
            'dateCreated' => $this->dateTime()->notNull(), // Date of creation
            'dateUpdated' => $this->dateTime()->notNull(), // Date of update
            'uid' => $this->uid(), // Unique identifier
        ]);

        // Create an index on entryTypeId for performance
        $this->createIndex(
            null,
            '{{%blocksmith_blockdata}}',
            'entryTypeId',
            false
        );

        // Add a foreign key to the entrytypes table
        $this->addForeignKey(
            null,
            '{{%blocksmith_blockdata}}',
            'entryTypeId',
            '{{%entrytypes}}',
            'id',
            'CASCADE'
        );

        Craft::info('blocksmith_blockdata table created successfully.', __METHOD__);

        return true;
    }

    /**
     * Rolls back the migration (drop table).
     *
     * @return bool
     */
    public function safeDown(): bool
    {
        // Drop the table
        $this->dropTableIfExists('{{%blocksmith_blockdata}}');
        Craft::info('blocksmith_blockdata table dropped successfully.', __METHOD__);

        return true;
    }
}
