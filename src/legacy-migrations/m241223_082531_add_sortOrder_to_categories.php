<?php

namespace mediakreativ\blocksmith\migrations;

use Craft;
use craft\db\Migration;

/**
 * Adds the `sortOrder` column to the `blocksmith_categories` table.
 */
class m241223_082531_add_sortOrder_to_categories extends Migration
{
    /**
     * Adds the `sortOrder` column.
     *
     * @return bool
     */
    public function safeUp(): bool
    {
        // Check if the table exists
        if (!$this->db->tableExists('{{%blocksmith_categories}}')) {
            Craft::error('The table `blocksmith_categories` does not exist.', __METHOD__);
            return false;
        }

        // Add the `sortOrder` column if it does not exist
        if (!$this->db->columnExists('{{%blocksmith_categories}}', 'sortOrder')) {
            $this->addColumn(
                '{{%blocksmith_categories}}',
                'sortOrder',
                $this->integer()->notNull()->defaultValue(0)->after('description') // Adjust placement as needed
            );
            Craft::info('Column `sortOrder` added to `blocksmith_categories`.', __METHOD__);
        } else {
            Craft::info('Column `sortOrder` already exists in `blocksmith_categories`.', __METHOD__);
        }

        // Update existing rows with default sortOrder based on current IDs
        $categories = (new \yii\db\Query())
            ->select(['id'])
            ->from('{{%blocksmith_categories}}')
            ->orderBy(['id' => SORT_ASC])
            ->all();

        foreach ($categories as $index => $category) {
            $this->update(
                '{{%blocksmith_categories}}',
                ['sortOrder' => $index + 1],
                ['id' => $category['id']]
            );
        }

        return true;
    }

    /**
     * Removes the `sortOrder` column.
     *
     * @return bool
     */
    public function safeDown(): bool
    {
        // Remove the `sortOrder` column if it exists
        if ($this->db->columnExists('{{%blocksmith_categories}}', 'sortOrder')) {
            $this->dropColumn('{{%blocksmith_categories}}', 'sortOrder');
            Craft::info('Column `sortOrder` removed from `blocksmith_categories`.', __METHOD__);
        }

        return true;
    }
}
