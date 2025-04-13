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
   * through custom modals with block previews and an intuitive block selection interface
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
     * Initializes the Blocksmith functionality with provided settings
     *
     * @param {Object} config Configuration object containing settings
     */
    init: function (config) {
      const self = this;
      this.settings = config.settings || {};

      if (!Garnish.DisclosureMenu || !Craft.MatrixInput) {
        return;
      }

      // Fetch matrix field settings asynchronously
      const matrixFieldSettings = {};
      $.ajax({
        url: Craft.getActionUrl(
          "blocksmith/blocksmith/get-matrix-field-settings",
        ),
        method: "GET",
        async: false,
        success: function (response) {
          Object.assign(matrixFieldSettings, response);
        },
        error: function () {
          console.error("Failed to fetch Blocksmith matrix field settings.");
        },
      });

      const modifyContextMenu = Garnish.DisclosureMenu.prototype.show;
      Garnish.DisclosureMenu.prototype.show = function (...args) {
        const matrixBlock = this.$trigger.closest(".matrixblock");
        const matrixContainer = matrixBlock.closest(".matrix-field");
        const matrixFieldId = matrixContainer.attr("id");
        const matrixFieldHandle = matrixFieldId
          ?.replace(/^fields-/, "")
          .split("-fields-")
          .pop();

        // Skip modification if preview is disabled for this field
        if (
          matrixFieldHandle &&
          matrixFieldSettings[matrixFieldHandle]?.enablePreview === 0
        ) {
          // Show Matrix Extended Context Menu if preview disabled
          requestAnimationFrame(() => {
            document.querySelectorAll("ul.matrix-extended").forEach((menu) => {
              menu.classList.add("blocksmith-preview-disabled");

              const addBlockButton = menu.querySelector(
                'button[data-action="add-block"]',
              );
              if (addBlockButton) {
                addBlockButton.focus();
              }
            });
          });

          modifyContextMenu.apply(this, args);
          return;
        }

        self.initiateContextMenu(this, matrixFieldHandle);
        modifyContextMenu.apply(this, args);
      };

      const originalUpdateAddEntryBtn =
        Craft.MatrixInput.prototype.updateAddEntryBtn;
      Craft.MatrixInput.prototype.updateAddEntryBtn = function (...args) {
        originalUpdateAddEntryBtn.apply(this, args);
        const matrixContainer = this.$container.closest(".matrix-field");
        const matrixFieldId = matrixContainer.attr("id");
        const matrixFieldHandle = matrixFieldId
          ?.replace(/^fields-/, "")
          .split("-fields-")
          .pop();

        // Skip modification if preview is disabled for this field
        if (
          matrixFieldHandle &&
          matrixFieldSettings[matrixFieldHandle]?.enablePreview === 0
        ) {
          // Show Matrix Extended Button Group if preview disabled
          requestAnimationFrame(() => {
            matrixContainer[0]
              .querySelectorAll(".matrix-extended-buttons")
              .forEach((buttonGroup) => {
                buttonGroup.classList.add("blocksmith-preview-disabled");
              });
          });

          originalUpdateAddEntryBtn.apply(this, args);
          return;
        }

        this.$addEntryMenuBtn.siblings(".blocksmith-add-btn").remove();

        const newBlockLabel =
          this.$addEntryMenuBtn.find(".label").text() ||
          Craft.t("blocksmith", "New Entry");

        this.$addEntryMenuBtn.hide();

        const $newAddButton = $(
          `<button class="blocksmith-add-btn btn add icon dashed">${newBlockLabel}</button>`,
        );

        this.$addEntryMenuBtn.after($newAddButton);

        if (!this.canAddMoreEntries()) {
          $newAddButton.prop("disabled", true).addClass("disabled");
          $newAddButton.attr(
            "title",
            Craft.t("blocksmith", "Maximum number of blocks reached."),
          );
        }

        $newAddButton.on("click", (event) => {
          event.preventDefault();

          if (!this.canAddMoreEntries()) {
            console.warn("Cannot add more blocks, limit reached.");
            return;
          }

          const blockTypes = [];
          const $buttons = this.$addEntryMenuBtn
            .data("disclosureMenu")
            .$container.find("button");

          $buttons.each(function () {
            const $button = $(this);
            const blockHandle = $button.data("type");

            const previewImagePath = `${config.settings.previewImageVolume}/${config.settings.previewImageSubfolder ? config.settings.previewImageSubfolder + "/" : ""}${blockHandle}.png`;

            blockTypes.push({
              handle: blockHandle,
              name: $button.find(".menu-item-label").text(),
              previewImage: previewImagePath,
            });
          });

          const modal = new BlocksmithModal(
            blockTypes,
            async (selectedBlock) => {
              try {
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
                // $button[0].click();
              } catch (error) {
                console.error("Error adding block:", error);
              }
            },
          );

          modal.show(matrixFieldHandle);
        });
      };

      // Initialisiere auch Card View Support
      this.initCardViewSupport();
      this.observeLivePreview();
    },

    /**
     * Initializes the context menu by adding custom menu items
     *
     * @param {Object} disclosureMenu - The Garnish DisclosureMenu instance
     */
    initiateContextMenu: function (disclosureMenu, matrixFieldHandle) {
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

      const blockTypes =
        matrix.$addEntryMenuBtn
          ?.data("disclosureMenu")
          ?.$container?.find("button") || [];
      if (blockTypes.length <= 1) {
        return;
      }

      if (disclosureMenu._menuInitialized) {
        this.verifyExistance($container, matrix);
        return;
      }
      disclosureMenu._menuInitialized = true;

      this.addMenuToContextMenu(
        $container,
        typeId,
        entry,
        matrix,
        matrixFieldHandle,
      );
      this.verifyExistance($container, matrix);
    },

    /**
     * Adds custom menu items to the context menu.
     *
     * @param {jQuery} $container - The jQuery object representing the menu container
     * @param {string} typeId - The block type ID (e.g., "text", "image")
     * @param {Object} entry - The current entry object, containing data about the Matrix block
     * @param {Craft.MatrixInput} matrix - The current MatrixInput instance managing the Matrix field
     */
    addMenuToContextMenu: function (
      $container,
      typeId,
      entry,
      matrix,
      matrixFieldHandle,
    ) {
      const $addButtonContainer = $container
        .find('[data-action="add"]')
        .parent()
        .parent();
      $addButtonContainer.prev().remove();
      $addButtonContainer.remove();

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

        $addNewBlockButton.find("button").on("click", () => {
          const blockTypes = [];
          const $buttons = matrix.$addEntryMenuBtn
            .data("disclosureMenu")
            .$container.find("button");

          const settings = this.settings;

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

          const modal = new BlocksmithModal(
            blockTypes,
            async (selectedBlock) => {
              try {
                await matrix.addEntry(selectedBlock.handle, entry.$container);
              } catch (error) {
                console.error("Error adding block:", error);
              }
            },
          );

          modal.show(matrixFieldHandle);
        });

        $deleteList.before($newList);
        $newList.after('<hr class="padded">');
      } else {
        console.error("Delete button not found in context menu.");
      }
    },

    /**
     * Adds a custom "Add block above" button to the context menu.
     *
     * @param {jQuery} $menu - The jQuery object representing the menu
     * @param {string} typeId - The block type ID
     * @param {Object} entry - The current entry object
     * @param {Object} matrix - The current MatrixInput instance
     */
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
        const blockTypes = [];
        const $buttons = matrix.$addEntryMenuBtn
          .data("disclosureMenu")
          .$container.find("button");

        const settings = this.settings;

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

    /**
     * Verifies the existence of menu items and enables or disables them based on the Matrix field's state
     *
     * @param {jQuery} $container - The jQuery object representing the menu container
     * @param {Object} matrix - The current MatrixInput instance
     */
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

    initCardViewSupport: function (root = document) {
      const createBlocksmithButton = (nativeBtn, fieldHandle) => {
        nativeBtn.classList.add("blocksmith-replaced");
        nativeBtn.style.display = "none";

        const labelEl = nativeBtn.querySelector(".label");
        const newBlockLabel =
          labelEl?.textContent.trim() || Craft.t("blocksmith", "New Entry");

        const customBtn = document.createElement("button");
        customBtn.className = "btn add icon dashed blocksmith-add-btn";
        customBtn.textContent = newBlockLabel;

        nativeBtn.after(customBtn);

        // Initial disabled status übernehmen
        const syncDisabledState = () => {
          const isDisabled = nativeBtn.classList.contains("disabled");
          customBtn.disabled = isDisabled;
          customBtn.classList.toggle("disabled", isDisabled);
          customBtn.title = isDisabled
            ? Craft.t("blocksmith", "Maximum number of blocks reached.")
            : "";
        };

        syncDisabledState();

        // MutationObserver für Klassenänderungen
        const observer = new MutationObserver(() => {
          syncDisabledState();
        });

        observer.observe(nativeBtn, {
          attributes: true,
          attributeFilter: ["class"],
        });

        customBtn.addEventListener("click", (e) => {
          e.preventDefault();

          if (customBtn.disabled) {
            return;
          }

          // Extract raw field handle in case it's namespaced
          const rawHandle =
            fieldHandle?.match(/fields-(.+?)(-|$)/)?.[1] || fieldHandle;

          console.log("Opening Blocksmith Modal with handle:", rawHandle);

          const modal = new BlocksmithModal(
            [],
            (selectedBlock) => {
              console.log("Selected block (Cards):", selectedBlock);
            },
            {
              mode: "cards",
            },
          );

          modal.show(rawHandle);
        });

        console.log("Blocksmith Button injected!");
      };

      root.querySelectorAll(".nested-element-cards").forEach((container, i) => {
        console.log(
          `[${i}] Checking .nested-element-cards container`,
          container,
        );

        if (container.classList.contains("blocksmith-initialized")) {
          console.log(`Already initialized [${i}]`);
          return;
        }

        container.classList.add("blocksmith-initialized");

        const id = container.id;
        const fieldHandle =
          id?.match(/fields-(.+?)-element-index/)?.[1] || null;

        console.log(`[${i}] Field detected`, { container, fieldHandle });

        const observer = new MutationObserver(() => {
          const nativeBtn = container.querySelector(".btn.menubtn.add");
          if (
            !nativeBtn ||
            nativeBtn.classList.contains("blocksmith-replaced") ||
            (getComputedStyle(nativeBtn).display === "none" &&
              !container.querySelector(".matrix-extended-buttons"))
          ) {
            return;
          }

          observer.disconnect();
          createBlocksmithButton(nativeBtn, fieldHandle);
        });

        observer.observe(container, {
          childList: true,
          subtree: true,
        });

        // Fallback für bereits gerenderte Buttons
        const nativeBtn = container.querySelector(".btn.menubtn.add");
        if (nativeBtn && !nativeBtn.classList.contains("blocksmith-replaced")) {
          createBlocksmithButton(nativeBtn, fieldHandle);
          observer.disconnect();
        }
      });
    },

    observeLivePreview: function () {
      const observer = new MutationObserver((mutationsList) => {
        let shouldReinit = false;

        for (const mutation of mutationsList) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType !== 1) continue;

            const el = /** @type {HTMLElement} */ (node);

            // Wenn Live Preview Editor geladen wird
            if (el.classList?.contains("lp-editor-container")) {
              shouldReinit = true;
              break;
            }

            // Oder wenn ein .nested-element-cards-Container neu gerendert wurde
            if (
              el.matches?.(".nested-element-cards") ||
              el.querySelector?.(".nested-element-cards")
            ) {
              shouldReinit = true;
              break;
            }
          }
        }

        if (shouldReinit) {
          console.log("DOM changed – reinitializing Blocksmith card buttons");
          setTimeout(() => {
            this.initCardViewSupport(document);
          }, 100);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      // Zusätzlich: Live Preview Wechsel abfangen
      Craft.cp.on("toggleLivePreview", () => {
        console.log("Live Preview toggled – triggering Blocksmith reinit");
        setTimeout(() => {
          this.initCardViewSupport(document);
        }, 100);
      });
    },
  });
})(window);
