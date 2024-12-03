// src/assets/js/blocksmith.js

(function (window) {
  const { Craft, Garnish, $ } = window;
  if (!Craft || !Garnish || !$) {
    return;
  }

  /**
   * Blocksmith plugin for Craft CMS
   *
   * Provides an optimized experience for managing Craft CMS Matrix fields and their entry types
   * through custom modals with block previews and an intuitive block selection interface.
   *
   * @author Christian Schindler
   * @copyright (c) 2024 Christian Schindler
   * @link https://mediakreativ.de
   * @license https://craftcms.github.io/license/ Craft License
   *
   * @see https://github.com/craftcms/cms/blob/5.x/src/web/assets/matrix/src/MatrixInput.js
   */

  Craft.Blocksmith = Garnish.Base.extend({
    settings: {},

    /**
     * Initializes the Blocksmith functionality with provided settings.
     *
     * @param {Object} config Configuration object containing settings.
     */
    init: function (config) {
      const self = this;
      this.settings = config.settings || {};

      // Ensure required dependencies are available
      if (!Garnish.DisclosureMenu || !Craft.MatrixInput) {
        return;
      }

      // Extend the context menu functionality to include Blocksmith logic
      const modifyContextMenu = Garnish.DisclosureMenu.prototype.show;
      Garnish.DisclosureMenu.prototype.show = function (...args) {
        self.initiateContextMenu(this);
        modifyContextMenu.apply(this, args);
      };

      // Extend the MatrixInput's "Add entry" button update logic
      const originalUpdateAddEntryBtn =
        Craft.MatrixInput.prototype.updateAddEntryBtn;
      Craft.MatrixInput.prototype.updateAddEntryBtn = function (...args) {
        // Call the original logic to ensure native behavior
        originalUpdateAddEntryBtn.apply(this, args);

        if (!this.$addEntryMenuBtn) return;

        // Remove existing Blocksmith buttons to avoid duplicates
        this.$addEntryMenuBtn.siblings(".blocksmith-add-btn").remove();

        // Extract the label from the native "Add entry" button
        const newBlockLabel =
          this.$addEntryMenuBtn.find(".label").text() ||
          Craft.t("blocksmith", "New Entry");

        // Hide the native "Add entry" button as it is replaced
        this.$addEntryMenuBtn.hide();

        // Create and append the custom "Add new block" button
        const $newAddButton = $(
          `<button class="blocksmith-add-btn btn add icon dashed">${newBlockLabel}</button>`,
        );

        this.$addEntryMenuBtn.after($newAddButton);

        // Disable the custom button if the maximum block limit is reached
        if (!this.canAddMoreEntries()) {
          $newAddButton.prop("disabled", true).addClass("disabled");
          $newAddButton.attr(
            "title",
            Craft.t("blocksmith", "Maximum number of blocks reached."),
          );
        }

        // Attach click event to the custom button to open the Blocksmith modal
        $newAddButton.on("click", (event) => {
          event.preventDefault();

          // Prevent action if the maximum block limit is reached
          if (!this.canAddMoreEntries()) {
            console.warn("Cannot add more blocks, limit reached.");
            return;
          }

          // Collect block types from the native menu
          const blockTypes = [];
          const $buttons = this.$addEntryMenuBtn
            .data("disclosureMenu")
            .$container.find("button");

          $buttons.each(function () {
            const $button = $(this);
            const blockHandle = $button.data("type");

            // Construct the preview image path based on settings
            const previewImagePath = `${config.settings.previewImageVolume}/${config.settings.previewImageSubfolder ? config.settings.previewImageSubfolder + "/" : ""}${blockHandle}.png`;

            blockTypes.push({
              handle: blockHandle,
              name: $button.find(".menu-item-label").text(),
              previewImage: previewImagePath,
            });
          });

          // Open the Blocksmith modal and handle block selection
          const modal = new BlocksmithModal(
            blockTypes,
            async (selectedBlock) => {
              try {
                // Trigger the native "activate" event for the selected block type
                const $button = this.$addEntryMenuBtn
                  .data("disclosureMenu")
                  .$container.find("button")
                  .filter(
                    (_, el) => $(el).data("type") === selectedBlock.handle,
                  );

                if (!$button.length) {
                  throw new Error(
                    `No button found for block type: ${selectedBlock.handle}`,
                  );
                }

                $button.trigger("activate");
              } catch (error) {
                console.error("Error adding block:", error);
              }
            },
          );

          modal.show();
        });
      };
    },

    /**
     * Initializes the context menu by adding custom menu items.
     *
     * @param {Object} disclosureMenu - The Garnish DisclosureMenu instance.
     */
    initiateContextMenu: function (disclosureMenu) {
      const { $trigger, $container } = disclosureMenu;

      // Ensure the disclosure menu is triggered from a valid context
      if (!$trigger || !$container || !$trigger.hasClass("action-btn")) {
        return; // Exit if the menu is not valid or not from an action button
      }

      // Locate the parent Matrix block element
      const $element = $trigger.closest(".actions").parent(".matrixblock");
      if (!$element.length) {
        return; // Exit if the menu is not part of a Matrix block
      }

      // Extract block data from the Matrix block
      const { typeId, entry } = $element.data();
      if (!typeId || !entry) {
        return; // Exit if block type ID or entry data is missing
      }

      // Retrieve the MatrixInput instance managing the field
      const matrix = entry.matrix;
      if (!matrix) {
        return; // Exit if no MatrixInput instance is associated with the entry
      }

      // Prevent re-initializing the menu if it is already customized
      if (disclosureMenu._menuInitialized) {
        this.verifyExistance($container, matrix); // Ensure buttons are correctly enabled/disabled
        return;
      }
      disclosureMenu._menuInitialized = true;

      // Add custom menu items and verify their state
      this.addMenuToContextMenu($container, typeId, entry, matrix);
      this.verifyExistance($container, matrix);
    },

    /**
     * Adds custom menu items to the context menu.
     *
     * @param {jQuery} $container - The jQuery object representing the menu container.
     * @param {string} typeId - The block type ID (e.g., "text", "image").
     * @param {Object} entry - The current entry object, containing data about the Matrix block.
     * @param {Craft.MatrixInput} matrix - The current MatrixInput instance managing the Matrix field.
     */
    addMenuToContextMenu: function ($container, typeId, entry, matrix) {
      // Locate and remove the existing "Add" button container
      const $addButtonContainer = $container
        .find('[data-action="add"]')
        .parent()
        .parent();
      $addButtonContainer.prev().remove(); // Remove separator above
      $addButtonContainer.remove(); // Remove the "Add" button itself

      // Locate the list containing the "Delete" button to insert new items before it
      const $deleteList = $container
        .find('button[data-action="delete"]')
        .closest("ul");

      if ($deleteList.length) {
        // Create a new list for Blocksmith menu items
        const $newList = $('<ul class="blocksmith"></ul>');

        // Create the custom "Add block above" button
        const $addNewBlockButton = $(`
      <li>
        <button class="blocksmith-menu-item menu-item add icon" data-action="add-block" tabindex="0">
          <span class="menu-item-label">
            ${Craft.t("blocksmith", "Add block above")}
          </span>
        </button>
      </li>
    `);

        // Append the custom button to the new list
        $newList.append($addNewBlockButton);

        // Add click event to open the Blocksmith modal
        $addNewBlockButton.find("button").on("click", () => {
          const blockTypes = [];
          const $buttons = matrix.$addEntryMenuBtn
            .data("disclosureMenu")
            .$container.find("button");

          const settings = this.settings;

          // Collect block types and their preview images
          $buttons.each(function () {
            const $button = $(this);
            const blockHandle = $button.data("type");

            const previewImagePath = `${settings.previewImageVolume}/${settings.previewImageSubfolder ? settings.previewImageSubfolder + "/" : ""}${blockHandle}.png`;

            blockTypes.push({
              handle: blockHandle,
              name: $button.find(".menu-item-label").text(),
              previewImage: previewImagePath,
            });
          });

          // Open the modal for block selection
          const modal = new BlocksmithModal(
            blockTypes,
            async (selectedBlock) => {
              try {
                // Add the selected block above the current block
                await matrix.addEntry(selectedBlock.handle, entry.$container);
              } catch (error) {
                console.error("Error adding block:", error);
              }
            },
          );

          modal.show();
        });

        // Insert the new list before the delete list and add a separator
        $deleteList.before($newList);
        $newList.after('<hr class="padded">');
      } else {
        // Log an error if the "Delete" button list is not found
        console.error("Delete button not found in context menu.");
      }
    },

    /**
     * Adds a custom "Add block above" button to the context menu.
     *
     * @param {jQuery} $menu - The jQuery object representing the menu.
     * @param {string} typeId - The block type ID.
     * @param {Object} entry - The current entry object.
     * @param {Object} matrix - The current MatrixInput instance.
     */
    addNewBlockBtnToDisclosureMenu: function ($menu, _, entry, matrix) {
      // Ensure the MatrixInput has valid buttons for adding new blocks
      if (!matrix.$addEntryMenuBtn.length && !matrix.$addEntryBtn.length) {
        return; // Exit if no valid add-entry buttons exist
      }

      // Create the custom "Add block above" button
      const $addNewBlockButton = $(`
    <li>
      <button class="blocksmith-menu-item menu-item add icon" data-action="add-block" tabindex="0">
        <span class="menu-item-label">
          ${Craft.t("blocksmith", "Add block above")}
        </span>
      </button>
    </li>
  `);

      // Append the custom button to the menu
      $menu.append($addNewBlockButton);

      // Attach click event to open the Blocksmith modal
      $addNewBlockButton.find("button").on("click", () => {
        const blockTypes = [];
        const $buttons = matrix.$addEntryMenuBtn
          .data("disclosureMenu")
          .$container.find("button");

        const settings = this.settings;

        // Collect block types and their preview images
        $buttons.each(function () {
          const $button = $(this);
          const blockHandle = $button.data("type");

          const previewImagePath = `${settings.previewImageVolume}/${settings.previewImageSubfolder ? settings.previewImageSubfolder + "/" : ""}${blockHandle}.png`;

          blockTypes.push({
            handle: blockHandle,
            name: $button.find(".menu-item-label").text(),
            previewImage: previewImagePath,
          });
        });

        // Open the modal for block selection
        const modal = new BlocksmithModal(blockTypes, async (selectedBlock) => {
          try {
            // Add the selected block above the current block
            await matrix.addEntry(selectedBlock.handle, entry.$container);
          } catch (error) {
            console.error("Error adding block:", error);
          }
        });

        modal.show();
      });
    },

    /**
     * Verifies the existence of menu items and enables or disables them based on the Matrix field's state.
     *
     * @param {jQuery} $container - The jQuery object representing the menu container.
     * @param {Object} matrix - The current MatrixInput instance.
     */
    verifyExistance: function ($container, matrix) {
      // Locate the custom "Add block above" button
      const $addButton = $container.find('button[data-action="add-block"]');

      // Disable the button by default
      $addButton.disable();

      // Clear any existing title attribute to avoid confusion
      const $parent = $addButton.parent();
      $parent.attr("title", "");

      // Check if the Matrix field can accommodate more blocks
      if (!matrix.canAddMoreEntries()) {
        // Add a tooltip indicating the block limit has been reached
        $parent.attr(
          "title",
          Craft.t("blocksmith", "You reached the maximum number of entries."),
        );
        return; // Exit early as the button remains disabled
      }

      // Enable the button if the block limit is not reached
      $addButton.enable();
    },
  });
})(window);
