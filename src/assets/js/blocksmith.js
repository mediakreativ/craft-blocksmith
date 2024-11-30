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
   * This plugin extends the native MatrixInput functionality by modifying its UI and behavior.
   */

  /**
   * Extracts block types from the Matrix add entry button.
   *
   * @param {jQuery} $addEntryMenuBtn - The jQuery object representing the "Add entry" menu button.
   * @param {string} previewImageVolume - The base path for preview images.
   * @param {string} previewImageSubfolder - The optional subfolder for preview images.
   * @returns {Array<Object>} An array of block type objects with handle, name, and previewImage.
   */
  function getBlockTypes(
    $addEntryMenuBtn,
    previewImageVolume,
    previewImageSubfolder,
  ) {
    const blockTypes = [];
    const $buttons = $addEntryMenuBtn
      .data("disclosureMenu")
      .$container.find("button");

    $buttons.each(function () {
      const $button = $(this);
      const blockHandle = $button.data("type");

      const previewImagePath = `${previewImageVolume}/${previewImageSubfolder ? previewImageSubfolder + "/" : ""}${blockHandle}.png`;

      blockTypes.push({
        handle: blockHandle,
        name: $button.find(".menu-item-label").text(),
        previewImage: previewImagePath,
      });
    });

    return blockTypes;
  }

  /**
   * Opens the Blocksmith modal to select a block type.
   *
   * @param {Object} matrixInstance - The current MatrixInput instance.
   * @param {jQuery} $addEntryMenuBtn - The jQuery object representing the "Add entry" menu button.
   * @param {Object} settings - The Blocksmith settings object.
   */
  function openBlocksmithModal(matrixInstance, $addEntryMenuBtn, settings) {
    const blockTypes = getBlockTypes(
      $addEntryMenuBtn,
      settings.previewImageVolume,
      settings.previewImageSubfolder,
    );

    const modal = new BlocksmithModal(blockTypes, async (selectedBlock) => {
      try {
        const $button = $addEntryMenuBtn
          .data("disclosureMenu")
          .$container.find("button")
          .filter((_, el) => $(el).data("type") === selectedBlock.handle);

        if (!$button.length) {
          throw new Error(
            `No button found for block type: ${selectedBlock.handle}`,
          );
        }

        $button.trigger("activate");
      } catch (error) {
        console.error("Error adding block:", error);
      }
    });

    modal.show();
  }

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

      if (!Garnish.DisclosureMenu || !Craft.MatrixInput) {
        return;
      }

      // Modify the context menu to add custom menu items
      const modifyContextMenu = Garnish.DisclosureMenu.prototype.show;
      Garnish.DisclosureMenu.prototype.show = function (...args) {
        self.initializeContextMenu(this);
        modifyContextMenu.apply(this, args);
      };

      // Hook into the Matrix "Add entry" button update
      const originalUpdateAddEntryBtn =
        Craft.MatrixInput.prototype.updateAddEntryBtn;
      Craft.MatrixInput.prototype.updateAddEntryBtn = function (...args) {
        originalUpdateAddEntryBtn.apply(this, args);

        if (!this.$addEntryMenuBtn) return;

        if (this.$addEntryMenuBtn.siblings(".blocksmith-add-btn").length > 0) {
          return;
        }

        this.$addEntryMenuBtn.hide();

        const $newAddButton = $(
          `<button class="blocksmith-add-btn btn add icon dashed">${Craft.t("blocksmith", "Add new block")}</button>`
        );

        this.$addEntryMenuBtn.after($newAddButton);

        $newAddButton.on("click", (event) => {
          event.preventDefault();
          openBlocksmithModal(this, this.$addEntryMenuBtn, config.settings);
        });
      };
    },

    /**
     * Initializes the context menu by adding custom menu items.
     *
     * @param {Object} disclosureMenu - The Garnish DisclosureMenu instance.
     */
    initializeContextMenu(disclosureMenu) {
      const { $trigger, $container } = disclosureMenu;
      if (!$trigger?.hasClass("action-btn") || !$container) {
        return;
      }

      const $element = $trigger.closest(".actions").parent(".matrixblock");
      if (!$element.length) {
        return;
      }

      const { typeId, entry } = $element.data();
      if (!typeId || !entry || !entry.matrix) {
        return;
      }

      if (disclosureMenu._menuInitialized) {
        this.verifyExistence($container, entry.matrix);
        return;
      }

      disclosureMenu._menuInitialized = true;
      this.addMenuToContextMenu($container, typeId, entry, entry.matrix);
    },

    /**
     * Adds custom menu items to the context menu.
     *
     * @param {jQuery} $container - The jQuery object representing the menu container.
     * @param {string} typeId - The block type ID.
     * @param {Object} entry - The current entry object.
     * @param {Object} matrix - The current MatrixInput instance.
     */
    addMenuToContextMenu: function ($container, typeId, entry, matrix) {
      const $deleteList = $container
        .find('button[data-action="delete"]')
        .closest("ul");

      if ($deleteList.length) {
        const $newList = $('<ul class="blocksmith"></ul>');
        const $addNewBlockButton = $(`
          <li>
            <button class="blocksmith-menu-item menu-item add icon" data-action="add-block" tabindex="0">
              <span class="menu-item-label">
                ${Craft.t("blocksmith", "Add block above")}
              </span>
            </button>
          </li>
        `);

        $newList.append($addNewBlockButton);
        $deleteList.before($newList);
        $newList.after('<hr class="padded">');

        $addNewBlockButton.on("click", () => {
          openBlocksmithModal(matrix, matrix.$addEntryMenuBtn, this.settings);
        });

        const $addButtonContainer = $container
          .find('[data-action="add"]')
          .parent()
          .parent();
        $addButtonContainer.prev().remove();
        $addButtonContainer.remove();
      } else {
        const $menu = $('<ul class="blocksmith"></ul>');
        $container.append($menu);
        this.addNewBlockBtnToDisclosureMenu($menu, typeId, entry, matrix);
        $menu.after('<hr class="padded">');
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
      if (!matrix.$addEntryMenuBtn.length) {
        return;
      }

      const $addNewBlockButton = $(`
        <li>
          <button class="blocksmith-menu-item menu-item add icon" data-action="add-block" tabindex="0">
            <span class="menu-item-label">
              ${Craft.t("blocksmith", "Add block above")}
            </span>
          </button>
        </li>
      `);

      $menu.append($addNewBlockButton);

      $addNewBlockButton.on("click", () => {
        openBlocksmithModal(matrix, matrix.$addEntryMenuBtn, this.settings);
      });
    },

    /**
     * Verifies the existence of menu items and enables them if necessary.
     *
     * @param {jQuery} $container - The jQuery object representing the menu container.
     * @param {Object} matrix - The current MatrixInput instance.
     */
    verifyExistence: function ($container, matrix) {
      const $addButton = $container.find('button[data-action="add-block"]');
      $addButton.disable();
      const $parent = $addButton.parent();
      $parent.attr("title", "");

      if (!matrix.canAddMoreEntries()) {
        $parent.attr(
          "title",
          Craft.t("blocksmith", "You reached the maximum number of entries."),
        );
        return;
      }

      $addButton.enable();
    },
  });
})(window);