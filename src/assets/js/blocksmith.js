// src/assets/js/blocksmith.js

(function (window) {
  const { Craft, Garnish, $ } = window;
  if (!Craft || !Garnish || !$) {
    return;
  }

  /**
   * Blocksmith
   *
   * A custom implementation for enhancing CraftCMS Matrix fields.
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

      if (!Garnish.DisclosureMenu || !Craft.MatrixInput) {
        return;
      }

      const modifyContextMenu = Garnish.DisclosureMenu.prototype.show;
      Garnish.DisclosureMenu.prototype.show = function (...args) {
        self.initiateContextMenu(this);
        modifyContextMenu.apply(this, args);
      };

      // Hook für die Aktualisierung des Add-Buttons
      const originalUpdateAddEntryBtn =
        Craft.MatrixInput.prototype.updateAddEntryBtn;
      Craft.MatrixInput.prototype.updateAddEntryBtn = function (...args) {
        originalUpdateAddEntryBtn.apply(this, args);
        if (!this.$addEntryMenuBtn) return; // Nur fortfahren, wenn der Button existiert

        const matrixInstance = this; // Aktuelle Matrix-Instanz

        // Original-Button verstecken
        this.$addEntryMenuBtn.hide();

        // Neuen "Add new block"-Button erstellen
        const $newAddButton = $(
          '<button class="blocksmith-add-btn btn add icon dashed">Add new block</button>',
        );
        this.$addEntryMenuBtn.after($newAddButton);

        // Klick-Event für das Modal
        $newAddButton.on("click", (event) => {
          event.preventDefault(); // Verhindert das Standard-Button-Verhalten (z. B. Formular-Submit)

          const blockTypes = [];

          const $buttons = this.$addEntryMenuBtn
            .data("disclosureMenu")
            .$container.find("button");

          $buttons.each(function () {
            const $button = $(this);
            const blockHandle = $button.data("type");

            // Dynamischer Pfad für das Vorschaubild
            const previewImagePath = `${config.settings.previewImageVolume}/${config.settings.previewImageSubfolder ? config.settings.previewImageSubfolder + "/" : ""}${blockHandle}.png`;

            blockTypes.push({
              handle: blockHandle,
              name: $button.find(".menu-item-label").text(),
              previewImage: previewImagePath,
            });
          });

          // Modal öffnen
          const modal = new BlocksmithModal(
            blockTypes,
            async (selectedBlock) => {
              try {
                // Finde den Button im nativen Dropdown, der dem ausgewählten Blocktyp entspricht
                const $button = matrixInstance.$addEntryMenuBtn
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

                // Trigger das native 'activate'-Event, um den Block hinzuzufügen
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

    initiateContextMenu(disclosureMenu) {
      const { $trigger, $container } = disclosureMenu;
      if (!$trigger || !$container || !$trigger.hasClass("action-btn")) {
        return;
      }
      const $element = $trigger.closest(".actions").parent(".matrixblock");
      if (!$element.length) {
        return;
      }
      const { typeId, entry } = $element.data();
      if (!typeId || !entry) {
        return;
      }

      const matrix = entry.matrix;
      if (!matrix) {
        return;
      }

      if (disclosureMenu._menuInitialized) {
        this.verifyExistance($container, matrix);
        return;
      }
      disclosureMenu._menuInitialized = true;

      this.addMenuToContextMenu($container, typeId, entry, matrix);
    },

    addMenuToContextMenu: function ($container, typeId, entry, matrix) {
      const $menu = $('<ul class="blocksmith"></ul>');

      this.addNewBlockBtnToDisclosureMenu($menu, typeId, entry, matrix);
      this.verifyExistance($menu, matrix);

      const $addButtonContainer = $container
        .find('[data-action="add"]')
        .parent()
        .parent();
      $addButtonContainer.prev().remove();
      $addButtonContainer.remove();

      $menu.insertBefore($container.find("ul").eq(0));
    },

    addNewBlockBtnToDisclosureMenu: function ($menu, _, entry, matrix) {
      if (!matrix.$addEntryMenuBtn.length && !matrix.$addEntryBtn.length) {
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

      $addNewBlockButton.find("button").on("click", () => {
        // Blocktypen aus Matrix-Instanz abrufen
        const blockTypes = [];
        const $buttons = matrix.$addEntryMenuBtn
          .data("disclosureMenu")
          .$container.find("button");

        const settings = this.settings; // Settings des Plugins aus der JS-Config

        $buttons.each(function () {
          const $button = $(this);
          const blockHandle = $button.data("type");

          // Dynamischer Pfad für das Vorschaubild
          const previewImagePath = `${settings.previewImageVolume}/${settings.previewImageSubfolder ? settings.previewImageSubfolder + "/" : ""}${blockHandle}.png`;

          blockTypes.push({
            handle: blockHandle,
            name: $button.find(".menu-item-label").text(),
            previewImage: previewImagePath,
          });
        });

        // Modal erstellen und anzeigen
        const modal = new BlocksmithModal(blockTypes, async (selectedBlock) => {
          try {
            await matrix.addEntry(selectedBlock.handle, entry.$container);
          } catch (error) {
            console.error("Error adding block:", error);
          }
        });

        modal.show();
      });
    },
    verifyExistance: function ($container, matrix) {
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
