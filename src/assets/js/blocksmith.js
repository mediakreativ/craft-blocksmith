// src/assets/js/blocksmith.js

(function (window) {
  const { Craft, Garnish, $ } = window;
  if (!Craft || !Garnish || !$) {
    return;
  }

  // window.BlocksmithDebug = true;

  function debugLog(...args) {
    if (!window.BlocksmithDebug) return;
    console.log("[Blocksmith]", ...args);
  }

  /**
   * Enable/disable the "Add block above" button based on the native button state.
   *
   * @param {jQuery} $container The context-menu container
   * @param {jQuery} nativeBtn  The native Craft add-button jQuery object
   */
  function syncAddBlockState($container, nativeBtn) {
    const $add = $container.find('button[data-action="add-block"]');
    const isAllowed = !nativeBtn.hasClass("disabled");

    $add
      .prop("disabled", !isAllowed)
      .toggleClass("disabled", !isAllowed)
      .parent()
      .attr(
        "title",
        isAllowed
          ? ""
          : Craft.t("blocksmith", "Maximum number of blocks reached."),
      );
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
        headers: {
          Accept: "application/json",
        },
        success: function (response) {
          Object.assign(matrixFieldSettings, response);
        },
        error: function () {
          debugLog("Failed to fetch Blocksmith matrix field settings.");
        },
      });

      this.matrixFieldSettings = matrixFieldSettings;

      // Override Craft's default "New Entry" button rendering
      // to inject Blocksmith’s custom inline-add button (if enabled)
      const replaceCraftNewEntryButton =
        Craft.MatrixInput.prototype.updateAddEntryBtn;
      Craft.MatrixInput.prototype.updateAddEntryBtn = function (...args) {
        // replaceCraftNewEntryButton.apply(this, args);
        const matrixContainer = this.$container.closest(".matrix-field");
        const matrixFieldId = matrixContainer.attr("id");
        const matrixFieldHandle = matrixFieldId
          ?.replace(/^fields-/, "")
          .split("-fields-")
          .pop();

        // Skip modification if Blocksmith preview is disabled for this field
        if (
          matrixFieldHandle &&
          (matrixFieldSettings[matrixFieldHandle]?.enablePreview ?? true) ===
            false
        ) {
          // Show Matrix Extended Button Group if Blocksmith preview disabled for this field
          requestAnimationFrame(() => {
            const btnGroup = matrixContainer[0].querySelector(
              ":scope > .buttons > .matrix-extended-buttons",
            );

            if (btnGroup) {
              btnGroup.classList.add("blocksmith-preview-disabled");
            }
          });

          return;
        }
        self.addBlocksmithAddButton(this, matrixFieldHandle, matrixContainer);
        replaceCraftNewEntryButton.apply(this, args);
      };

      // Override Craft's default context menu rendering
      // to inject Blocksmith’s custom "Add block above" action
      // for both inline and Cards view modes (if preview is enabled)
      const modifyContextMenu = Garnish.DisclosureMenu.prototype.show;
      Garnish.DisclosureMenu.prototype.show = function (...args) {
        const $trigger = this.$trigger;
        const triggerEl = $trigger?.[0];
        debugLog("trigger: ", $trigger);

        // === Inline view ===
        if (triggerEl?.parentElement?.classList.contains("actions")) {
          debugLog("Inline view");

          const matrixContainer = this.$trigger
            .parents(".matrix-field")
            .first();
          const matrixFieldId = matrixContainer.attr("id");
          const matrixFieldHandle = matrixFieldId
            ?.replace(/^fields-/, "")
            .split("-fields-")
            .pop();

          debugLog("matrixFieldHandle: ", matrixFieldHandle);

          // Skip modification if Blocksmith preview is disabled for this field
          if (
            matrixFieldHandle &&
            (matrixFieldSettings[matrixFieldHandle]?.enablePreview ?? true) ===
              false
          ) {
            // Show Matrix Extended Context Menu if Blocksmith preview disabled for this field
            requestAnimationFrame(() => {
              const menuId = this.$trigger.attr("aria-controls");
              const menuEl = document.getElementById(menuId);
              const extendedMenu = menuEl?.querySelector("ul.matrix-extended");
              if (extendedMenu) {
                extendedMenu.classList.add("blocksmith-preview-disabled");

                const addBlockButton = extendedMenu.querySelector(
                  'button[data-action="add-block"]',
                );
                if (addBlockButton) {
                  addBlockButton.focus();
                }
              }
            });

            return modifyContextMenu.apply(this, args);
          }
          self.initiateContextMenu(this, matrixFieldHandle);
          return modifyContextMenu.apply(this, args);
        }

        // === Cards view ===
        if (
          triggerEl?.parentElement?.classList.contains("card-actions") &&
          self.settings.enableCardsSupport !== false
        ) {
          debugLog("Cards view");

          const matrixContainer = this.$trigger
            .parents(".nested-element-cards")
            .first();

          // This check ensures we only apply Blocksmith logic to actual Matrix fields cards.
          if (!matrixContainer.length) {
            debugLog(
              "No .nested-element-cards container found – not a Matrix field - skipping.",
            );
            return modifyContextMenu.apply(this, args);
          }

          const matrixFieldId = matrixContainer.attr("id");

          const matches = [
            ...matrixFieldId.matchAll(/fields-([a-zA-Z0-9_]+)/g),
          ];
          const matrixFieldHandle = matches.at(-1)?.[1];

          debugLog("matrixFieldHandle: ", matrixFieldHandle);

          // Skip modification if Blocksmith preview is disabled for this field
          if (
            matrixFieldHandle &&
            (matrixFieldSettings[matrixFieldHandle]?.enablePreview ?? true) ===
              false
          ) {
            return modifyContextMenu.apply(this, args);
          }

          const $clickedCard = this.$trigger.parents(".element.card").first();
          debugLog("$clickedCard: ", $clickedCard);

          const insertAboveEntryId = $clickedCard.data("id");

          self.initiateCardsContextMenu(
            this,
            matrixFieldHandle,
            matrixContainer,
            insertAboveEntryId,
          );

          const result = modifyContextMenu.apply(this, args);

          syncAddBlockState(
            this.$container,
            matrixContainer.find("button.btn.icon.dashed.wrap"),
          );

          return result;
        }

        return modifyContextMenu.apply(this, args);
      };

      // Initialize custom buttons for Cards view and observe DOM for dynamic changes
      if (this.settings.enableCardsSupport !== false) {
        this.initCardViewAddButtons();
        this.observeLivePreviewForCardButtons();
        BlocksmithUtils.setupButtonGroupCleanupOnResize();
        BlocksmithUtils.setupButtonGroupDismissOnOutsideClick();
        BlocksmithUtils.setupMarkerCleanupListeners();
      }
    },

    /**
     * Injects a custom "Add block" button for inline-editable Matrix fields,
     * replacing Craft’s default menu button and opening the Blocksmith modal.
     *
     * @param {Craft.MatrixInput} matrixInput - The MatrixInput instance
     * @param {string} matrixFieldHandle - The handle of the Matrix field
     */
    addBlocksmithAddButton: function (matrixInput, matrixFieldHandle) {
      const uiMode = this.matrixFieldSettings[matrixFieldHandle]?.uiMode;
      if (uiMode === "btngroup") {
        this.injectButtonGroup(matrixInput, matrixFieldHandle);
        matrixInput.$addEntryMenuBtn.hide(); // Original-Button ausblenden
        return;
      }

      const self = this;
      matrixInput.$addEntryMenuBtn.siblings(".blocksmith-add-btn").remove();

      const newBlockLabel =
        matrixInput.$addEntryMenuBtn.find(".label").text() ||
        Craft.t("blocksmith", "New Entry");

      matrixInput.$addEntryMenuBtn.hide();

      const $newAddButton = $(
        `<button class="blocksmith-add-btn btn add icon dashed">${newBlockLabel}</button>`,
      );

      matrixInput.$addEntryMenuBtn.after($newAddButton);

      if (!Craft.Blocksmith.prototype.canAddMoreEntries(matrixInput, null)) {
        $newAddButton.prop("disabled", true).addClass("disabled");
        $newAddButton.attr(
          "title",
          Craft.t("blocksmith", "Maximum number of blocks reached."),
        );
      }

      $newAddButton.on("click", (event) => {
        event.preventDefault();

        if (!Craft.Blocksmith.prototype.canAddMoreEntries(matrixInput, null)) {
          console.warn("Cannot add more blocks, limit reached.");
          return;
        }

        const blockTypes = [];
        const $buttons = matrixInput.$addEntryMenuBtn
          .data("disclosureMenu")
          .$container.find("button");

        $buttons.each(function () {
          const $button = $(this);
          const blockHandle = $button.data("type");

          const previewImagePath = `${self.settings.previewImageVolume}/${self.settings.previewImageSubfolder ? self.settings.previewImageSubfolder + "/" : ""}${blockHandle}.png`;

          blockTypes.push({
            handle: blockHandle,
            name: $button.find(".menu-item-label").text(),
            previewImage: previewImagePath,
          });
        });

        const modal = new BlocksmithModal(blockTypes, async (selectedBlock) => {
          try {
            const $button = matrixInput.$addEntryMenuBtn
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

        modal.show(matrixFieldHandle);
      });
    },

    /**
     * Injects Blocksmith-specific menu items into the context menu
     * for inline-editable Matrix blocks (if preview is enabled).
     *
     * @param {Object} disclosureMenu - The Garnish DisclosureMenu instance
     * @param {string} matrixFieldHandle - The field handle of the current Matrix field
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
        entry,
        matrix,
        matrixFieldHandle,
        disclosureMenu,
      );
      this.verifyExistance($container, matrix);
    },

    /**
     * Adds the "Add block above" action to the context menu of an inline Matrix block.
     * Replaces Craft’s native "Add" button in the context menu if multiple block types exist.
     *
     * @param {jQuery} $container - The jQuery object representing the menu container
     * @param {Object} entry - The current entry object, containing data about the Matrix block
     * @param {Craft.MatrixInput} matrix - The current MatrixInput instance managing the Matrix field
     * @param {string} matrixFieldHandle - The field handle of the Matrix field
     */
    addMenuToContextMenu: function (
      $container,
      entry,
      matrix,
      matrixFieldHandle,
      disclosureMenu,
    ) {
      const $addButtonContainer = $container
        .find('[data-action="add"]')
        .parent()
        .parent();

      $addButtonContainer.prev().hide();
      $addButtonContainer.hide();

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
          const uiMode = this.matrixFieldSettings[matrixFieldHandle]?.uiMode;

          if (uiMode === "btngroup") {
            debugLog("Injecting Button Group above current block (inline)");

            const $existing = matrix.$container.find(
              ".blocksmith-btngroup.insert-above",
            );
            if ($existing.length) {
              $existing.remove();
            }

            const $wrapper = $(`
              <div class="blocksmith-btngroup insert-above">
              <div class="btngroup"></div>
              </div>
            `);

            const $btngroup = $wrapper.find(".btngroup");

            const $menubtn = entry.$container.find(".actions .menubtn");
            const menuId = $menubtn.attr("aria-controls");

            if (!menuId) {
              console.warn(
                "[Blocksmith] No disclosure menu ID found for inline btngroup.",
              );
              return;
            }

            const $menu = $(`#${menuId}`);
            if (!$menu.length) {
              console.warn(
                `[Blocksmith] Disclosure menu with ID "${menuId}" not found.`,
              );
              return;
            }

            const $buttons = $menu.find("button[data-type]");

            $buttons.each((_, el) => {
              const $btn = $(el);
              const blockHandle = $btn.data("type");
              const label =
                $btn.find(".menu-item-label").text().trim() ||
                $btn.text().trim();

              const $button = $(`
                <button
                  type="button"
                  class="menu-item add icon btn dashed"
                  data-type="${blockHandle}"
                  data-menu-id="${menuId}"
                >
                 <span class="menu-item-label">${label}</span>
                </button>
              `);

              const canAdd = Craft.Blocksmith.prototype.canAddMoreEntries(
                matrix,
                null,
              );
              if (!canAdd) {
                $button.prop("disabled", true).addClass("disabled");
                $button.attr(
                  "title",
                  Craft.t("blocksmith", "Maximum number of blocks reached."),
                );
              }

              $button.on("click", function (e) {
                e.preventDefault();

                debugLog("[btngroup-inline] Button clicked:", {
                  blockHandle: $(this).data("type"),
                  menuId: $(this).data("menu-id"),
                });

                const menuId = $(this).data("menu-id");
                const blockHandle = $(this).data("type");
                const $menu = $(`#${menuId}`);

                if (!$menu.length) {
                  console.warn(
                    `[Blocksmith] Disclosure menu with ID "${menuId}" not found.`,
                  );
                  return;
                }

                debugLog(
                  `[btngroup-inline] Menu found – searching button for type "${blockHandle}"`,
                );

                const $nativeBtn = $menu.find(
                  `button[data-type="${blockHandle}"]`,
                );

                if ($nativeBtn.length) {
                  debugLog(
                    "[btngroup-inline] Native Disclosure button found – triggering click",
                    $nativeBtn[0],
                  );

                  window.BlocksmithRuntime = window.BlocksmithRuntime || {};
                  window.BlocksmithRuntime.insertAboveEntryId = entry.id;

                  $wrapper.remove();

                  setTimeout(() => {
                    $nativeBtn[0].click();
                  }, 50);
                } else {
                  console.warn(
                    `[Blocksmith] No matching native button for type "${blockHandle}" in menu "${menuId}".`,
                  );
                  debugLog("[btngroup-inline] Menu HTML:", $menu.html());
                }
              });

              $btngroup.append($button);
            });

            entry.$container.before($wrapper);

            if (disclosureMenu && typeof disclosureMenu.hide === "function") {
              disclosureMenu.hide();
            }
            return;
          }

          const blockTypes = [];
          const $buttons =
            matrix.$addEntryMenuBtn
              .data("disclosureMenu")
              ?.$container.find("button") || [];

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
     * Prepares the context menu for a Matrix block in Cards view.
     * Adds the "Add block above" action if the blocksmith preview is enabled.
     *
     * @param {Object} disclosureMenu - The Garnish DisclosureMenu instance
     * @param {string} matrixFieldHandle - The field handle of the Matrix field
     * @param {jQuery} matrixContainer - The container element of the Matrix field in Cards view
     */
    initiateCardsContextMenu: function (
      disclosureMenu,
      matrixFieldHandle,
      matrixContainer,
      insertAboveEntryId,
    ) {
      if (this.settings.enableCardsSupport === false) {
        debugLog("Skipping Cards support – disabled via settings.");
        return;
      }

      const { $trigger, $container } = disclosureMenu;
      if (!$trigger || !$container || !$trigger.hasClass("action-btn")) {
        return;
      }
      debugLog("$trigger: ", $trigger);

      const $element = $trigger.closest(".card-titlebar").parent(".element");
      debugLog("$element: ", $element);
      if (!$element.length) {
        return;
      }

      // Inject Blocksmith menu items for Cards context
      this.addMenuToCardsContextMenu(
        $container,
        matrixFieldHandle,
        matrixContainer,
        insertAboveEntryId,
        disclosureMenu,
      );
    },

    /**
     * Adds the custom "Add block above" action to the context menu
     * for Matrix blocks in Cards view (if blocksmith preview is enabled).
     *
     * @param {jQuery} $container - The context menu container element
     * @param {string} matrixFieldHandle - The handle of the Matrix field
     * @param {jQuery} matrixContainer - The container element of the Matrix field in Cards view
     */

    addMenuToCardsContextMenu: function (
      $container,
      matrixFieldHandle,
      matrixContainer,
      insertAboveEntryId,
      disclosureMenu,
    ) {
      // Skip entirely if Cards support is disabled
      if (this.settings.enableCardsSupport === false) {
        debugLog("Skipping Cards menu injection - disabled via settings.");
        return;
      }

      // Remove any previous Blocksmith menus to allow a fresh injection
      $container.find("ul.blocksmith, hr.padded").remove();

      debugLog("Injecting Blocksmith menu into Cards context…");

      const $deleteList = $container
        .find('button[data-destructive="true"]')
        .closest("ul");

      if (!$deleteList.length) {
        console.error("Delete button not found in context menu.");
        return;
      }

      const $newList = $('<ul class="blocksmith"></ul>');
      const nativeAddButton = matrixContainer.find(
        "button.btn.icon.dashed.wrap",
      );

      this.loadBlockTypes(matrixFieldHandle).done((blockTypes) => {
        const isDisabled = !this.canAddMoreEntries(null, nativeAddButton);

        if (blockTypes.length === 1) {
          const singleBlock = blockTypes[0];

          const isGridView = BlocksmithUtils.isTrueGridView(matrixContainer);

          const translatedLabel = Craft.t(
            "blocksmith",
            isGridView ? "Add {name} before" : "Add {name} above",
            { name: singleBlock.name },
          );

          const $addNewBlockButton = $(`
            <li>
              <button class="blocksmith-menu-item menu-item add icon" data-action="add-block" tabindex="0">
                <span class="menu-item-label">
                ${translatedLabel}
                </span>
              </button>
            </li>
          `);

          const $button = $addNewBlockButton.find("button");

          $button
            .prop("disabled", isDisabled)
            .toggleClass("disabled", isDisabled)
            .attr(
              "title",
              isDisabled
                ? Craft.t("blocksmith", "Maximum number of blocks reached.")
                : "",
            );

          $button.on("click", async () => {
            if ($button.prop("disabled")) return;

            window.BlocksmithRuntime = window.BlocksmithRuntime || {};
            window.BlocksmithRuntime.insertAboveEntryId = insertAboveEntryId;

            nativeAddButton[0].click();

            window.BlocksmithUtils.observeInsertedCard(
              matrixContainer,
              insertAboveEntryId,
            );
          });

          $newList.append($addNewBlockButton);
        } else {
          const isGridView = BlocksmithUtils.isTrueGridView(matrixContainer);

          const $addNewBlockButton = $(`
            <li>
              <button class="blocksmith-menu-item menu-item add icon" data-action="add-block" tabindex="0">
                <span class="menu-item-label">
                ${Craft.t("blocksmith", isGridView ? "Add block before" : "Add block above")}
                </span>
              </button>
            </li>
          `);

          const $button = $addNewBlockButton.find("button");

          $button
            .prop("disabled", isDisabled)
            .toggleClass("disabled", isDisabled)
            .attr(
              "title",
              isDisabled
                ? Craft.t("blocksmith", "Maximum number of blocks reached.")
                : "",
            );

          $button.on("click", (e) => {
            e.preventDefault();
            if ($button.prop("disabled")) return;

            debugLog("Opening contextual add handler for:", matrixFieldHandle);

            const uiMode = this.matrixFieldSettings[matrixFieldHandle]?.uiMode;

            window.BlocksmithRuntime = window.BlocksmithRuntime || {};
            window.BlocksmithRuntime.insertAboveEntryId = insertAboveEntryId;

            if (uiMode === "btngroup") {
              debugLog("Injecting Button Group instead of opening Modal");

              const isGridView =
                BlocksmithUtils.isTrueGridView(matrixContainer);

              // Remove any existing groups (both types)
              matrixContainer
                .find(
                  ".blocksmith-floating-btngroup, .blocksmith-btngroup.insert-above",
                )
                .remove();

              this.loadBlockTypes(matrixFieldHandle).done((blockTypes) => {
                const $targetCard = matrixContainer.find(
                  `.element[data-id="${insertAboveEntryId}"]`,
                );

                if (!$targetCard.length) {
                  console.warn("Blocksmith: Target card not found.");
                  return;
                }

                if (isGridView) {
                  // === FLOATING BUTTON GROUP ===

                  // Insert anchor
                  matrixContainer.find(".blocksmith-insert-anchor").remove();
                  $targetCard.before(
                    '<div class="blocksmith-insert-anchor"></div>',
                  );
                  const $anchor = matrixContainer
                    .find(".blocksmith-insert-anchor")
                    .first();

                  const $floatGroup = $(
                    '<div class="blocksmith-floating-btngroup"></div>',
                  );

                  blockTypes.forEach((block) => {
                    const $btn = $(`
                      <button
                      type="button"
                      class="menu-item add icon btn dashed"
                      data-type="${block.handle}"
                      >
                      <span class="menu-item-label">${block.name}</span>
                      </button>
                    `);

                    $btn.on("click", () => {
                      delete window.BlocksmithRuntime.insertAboveEntryId;

                      const $menubtn = matrixContainer
                        .find(".blocksmith-replaced.menubtn")
                        .first();

                      if (!$menubtn.length) {
                        console.warn(
                          "Blocksmith: No menu trigger button found.",
                        );
                        return;
                      }

                      const menuId = $menubtn.attr("aria-controls");
                      const $menu = $(`#${menuId}`);
                      const labelToClick = block.name.trim();

                      const $matchingButton = $menu
                        .find("button")
                        .filter(
                          (_, el) => $(el).text().trim() === labelToClick,
                        );

                      if ($matchingButton.length) {
                        window.BlocksmithUtils.observeInsertedCard(
                          matrixContainer,
                          insertAboveEntryId,
                        );
                        $matchingButton[0].click();
                      } else {
                        console.warn(
                          `Blocksmith: No matching Disclosure menu button found for "${labelToClick}".`,
                        );
                      }

                      $floatGroup.addClass("btns-removed");
                    });

                    $floatGroup.append($btn);
                  });

                  $anchor.append($floatGroup);
                } else {
                  // === INLINE BUTTON GROUP ===

                  const $wrapper = $(
                    '<li class="blocksmith-btngroup insert-above"><div class="btngroup"></div></li>',
                  );
                  const $btngroup = $wrapper.find(".btngroup");

                  blockTypes.forEach((block) => {
                    const $bgButton = $(`
                      <button
                      type="button"
                      class="menu-item add icon btn dashed"
                      data-type="${block.handle}"
                      >
                      <span class="menu-item-label">${block.name}</span>
                      </button>
                    `);

                    $bgButton.on("click", () => {
                      delete window.BlocksmithRuntime.insertAboveEntryId;

                      const $menubtn = matrixContainer
                        .find(".blocksmith-replaced.menubtn")
                        .first();

                      if (!$menubtn.length) {
                        console.warn(
                          "Blocksmith: No menu trigger button found.",
                        );
                        return;
                      }

                      const menuId = $menubtn.attr("aria-controls");
                      const $menu = $(`#${menuId}`);
                      const labelToClick = block.name.trim();

                      const $matchingButton = $menu
                        .find("button")
                        .filter(
                          (_, el) => $(el).text().trim() === labelToClick,
                        );

                      if ($matchingButton.length) {
                        const $target = matrixContainer.find(
                          `.element[data-id="${insertAboveEntryId}"]`,
                        );
                        $target.before(
                          '<span class="btn dashed blocksmith-insert-marker"></span>',
                        );

                        window.BlocksmithUtils.observeInsertedCard(
                          matrixContainer,
                          insertAboveEntryId,
                        );
                        $matchingButton[0].click();
                      } else {
                        console.warn(
                          `Blocksmith: No button with label "${labelToClick}" found.`,
                        );
                      }

                      $wrapper.remove();
                    });

                    $btngroup.append($bgButton);
                  });

                  const $insertionPoint = matrixContainer
                    .find(`.element[data-id="${insertAboveEntryId}"]`)
                    .closest("li");

                  if ($insertionPoint.length) {
                    $wrapper.insertBefore($insertionPoint);
                  } else {
                    console.warn(
                      "Blocksmith: Target block not found for insertion.",
                    );
                  }
                }
              });

              if (disclosureMenu && typeof disclosureMenu.hide === "function") {
                disclosureMenu.hide();
              }

              return;
            }

            // Default: Open Preview Modal
            debugLog(
              "→ Opening Blocksmith Modal with handle:",
              matrixFieldHandle,
            );

            const modal = new BlocksmithModal(
              [],
              (selectedBlock) => {
                debugLog("Selected block (Cards):", selectedBlock);
              },
              {
                mode: "cards",
                scope: matrixContainer,
              },
            );

            modal.show(matrixFieldHandle);
          });

          $newList.append($addNewBlockButton);
        }

        $deleteList.before($newList);
        $newList.after('<hr class="padded">');
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
      const $parent = $addButton.parent();
      $parent.attr("title", "");

      const isAllowed = this.canAddMoreEntries(matrix, null);

      $addButton
        .prop("disabled", !isAllowed)
        .toggleClass("disabled", !isAllowed);
      if (!isAllowed) {
        $parent.attr(
          "title",
          Craft.t("blocksmith", "You reached the maximum number of entries."),
        );
      }
    },

    /**
     * Injects custom "Add block" buttons into Matrix fields rendered in Cards view,
     * replacing Craft’s default dropdowns (if Blocksmith preview is enabled).
     *
     * This method scans the DOM for .nested-element-cards containers and replaces
     * the native "Add" buttons with custom Blocksmith buttons that open the Blocksmith modal.
     *
     * @param {Document|HTMLElement} [root=document] - Optional root element to scope the DOM query
     */
    initCardViewAddButtons: function (root = document) {
      if (this.settings.enableCardsSupport === false) {
        debugLog("Skipping initCardViewAddButtons – Cards support disabled.");
        return;
      }

      const createBlocksmithButton = (nativeBtn, fieldHandle) => {
        fieldHandle = fieldHandle?.split("-fields-").pop();

        const matrixContainer = nativeBtn.closest(".nested-element-cards");

        // Skip modification if Blocksmith preview is disabled for this field
        if (
          fieldHandle &&
          (this.matrixFieldSettings[fieldHandle]?.enablePreview ?? true) ===
            false
        ) {
          // Show Matrix Extended Button Group if Blocksmith preview disabled for this field
          requestAnimationFrame(() => {
            matrixContainer
              .querySelectorAll(".matrix-extended-buttons")
              .forEach((buttonGroup) => {
                buttonGroup.classList.add("blocksmith-preview-disabled");
              });
          });

          return;
        }

        nativeBtn.classList.add("blocksmith-replaced");
        nativeBtn.style.display = "none";

        const uiMode = this.matrixFieldSettings[fieldHandle]?.uiMode;
        if (uiMode === "btngroup") {
          this.injectButtonGroupForCards(matrixContainer, fieldHandle);
          return;
        }

        const labelEl = nativeBtn.querySelector(".label");
        const newBlockLabel =
          labelEl?.textContent.trim() || Craft.t("blocksmith", "New Entry");

        const customBtn = document.createElement("button");
        customBtn.className = "btn add icon dashed blocksmith-add-btn";
        customBtn.textContent = newBlockLabel;

        nativeBtn.after(customBtn);

        // Synchronize disabled state between the native and custom "Add block" buttons
        // Ensures the custom button is disabled if the native one would be (e.g. max blocks reached)
        const syncDisabledState = () => {
          const isDisabled = !Craft.Blocksmith.prototype.canAddMoreEntries(
            null,
            $(nativeBtn),
          );
          customBtn.disabled = isDisabled;
          customBtn.classList.toggle("disabled", isDisabled);
          customBtn.title = isDisabled
            ? Craft.t("blocksmith", "Maximum number of blocks reached.")
            : "";
        };

        syncDisabledState();

        // Observe class changes on the native button to update the custom button state accordingly
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

          debugLog("Opening Blocksmith Modal with handle:", fieldHandle);

          const modal = new BlocksmithModal(
            [],
            (selectedBlock) => {
              debugLog("Selected block (Cards):", selectedBlock);
            },
            {
              mode: "cards",
              scope: matrixContainer,
            },
          );

          modal.show(fieldHandle);
        });

        debugLog("Blocksmith Button injected!");
      };

      root.querySelectorAll(".nested-element-cards").forEach((container, i) => {
        debugLog(`[${i}] Checking .nested-element-cards container`, container);

        if (container.classList.contains("blocksmith-initialized")) {
          debugLog(`Already initialized [${i}]`);
          return;
        }

        container.classList.add("blocksmith-initialized");

        const id = container.id;
        const fieldHandle =
          id?.match(/fields-(.+?)-element-index/)?.[1] || null;

        debugLog(`[${i}] Field detected`, { container, fieldHandle });

        const observer = new MutationObserver(() => {
          const nativeBtn =
            container.querySelector(".btn.menubtn.add") ||
            container.querySelector(
              'button.btn.icon.dashed.wrap.menubtn[aria-controls^="menu-"]',
            );

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

        // Fallback: handle already rendered native buttons that were not observed in time
        const nativeBtn =
          container.querySelector(".btn.menubtn.add") ||
          container.querySelector(
            'button.btn.icon.dashed.wrap.menubtn[aria-controls^="menu-"]',
          );

        if (nativeBtn && !nativeBtn.classList.contains("blocksmith-replaced")) {
          createBlocksmithButton(nativeBtn, fieldHandle);
          observer.disconnect();
        }
      });
    },

    /**
     * Observes DOM changes and Live Preview toggles to re-inject Blocksmith buttons
     * into Matrix fields in Cards view, ensuring buttons are re-rendered when needed
     */
    observeLivePreviewForCardButtons: function () {
      if (this.settings.enableCardsSupport === false) {
        debugLog(
          "Skipping observeLivePreviewForCardButtons – Cards support disabled.",
        );
        return;
      }

      const observer = new MutationObserver((mutationsList) => {
        let shouldReinit = false;

        for (const mutation of mutationsList) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType !== 1) continue;

            const el = /** @type {HTMLElement} */ (node);

            // Trigger re-initialization when the Live Preview editor is rendered
            if (el.classList?.contains("lp-editor-container")) {
              shouldReinit = true;
              break;
            }

            // Or when a new .nested-element-cards container appears (e.g. slideout)
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
          debugLog("DOM changed – reinitializing Blocksmith card buttons");
          setTimeout(() => {
            this.initCardViewAddButtons(document);
          }, 100);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      // Also re-initialize when Live Preview is toggled
      Craft.cp.on("toggleLivePreview", () => {
        debugLog("Live Preview toggled – triggering Blocksmith reinit");
        setTimeout(() => {
          this.initCardViewAddButtons(document);
        }, 100);
      });
    },

    /**
     * Checks whether a new Matrix block can be added
     *
     * @param {Craft.MatrixInput|null} matrix - The MatrixInput instance (for inline mode)
     * @param {jQuery|null} nativeBtn - The hidden native add button (for cards mode)
     * @returns {boolean} Whether a new block can be added
     */
    canAddMoreEntries: function (matrix, nativeBtn) {
      if (matrix && typeof matrix.canAddMoreEntries === "function") {
        return matrix.canAddMoreEntries();
      }

      if (nativeBtn && nativeBtn.length) {
        return !nativeBtn.hasClass("disabled");
      }

      return true; // Fallback if nothing is known
    },

    /**
     * Loads available block types for a given Matrix field via Ajax.
     */
    loadBlockTypes: function (matrixFieldHandle) {
      return $.ajax({
        url: Craft.getCpUrl("blocksmith-modal/get-block-types"),
        method: "GET",
        dataType: "json",
        data: {
          handle: matrixFieldHandle,
        },
      });
    },

    injectButtonGroup: function (matrixInput, matrixFieldHandle) {
      const $existing = matrixInput.$container
        .children(".buttons")
        .children(".blocksmith-btngroup");

      if ($existing.length) {
        $existing.remove();
      }

      const $wrapper = $(
        '<div class="blocksmith-btngroup"><div class="btngroup"></div></div>',
      );
      const $btngroup = $wrapper.find(".btngroup");

      this.loadBlockTypes(matrixFieldHandle).done((blockTypes) => {
        const groups = {};
        blockTypes.forEach((b) => {
          const gid = b.buttonGroupUid || "_";
          if (!groups[gid]) {
            groups[gid] = { name: b.buttonGroupName || "", blocks: [] };
          }
          groups[gid].blocks.push(b);
        });

        Object.values(groups).forEach((group) => {
          const $dropdown = $('<div class="blocksmith-dropdown"></div>');
          const $btn = $(
            `<button type="button" class="btn dashed">${group.name || Craft.t('blocksmith','Group')}</button>`,
          );
          const $menu = $('<div class="blocksmith-dropdown-menu"></div>');

          group.blocks.forEach((block) => {
            const $option = $(
              `<button type="button" class="menu-item add icon btn dashed" data-type="${block.handle}"><span class="menu-item-label">${block.name}</span></button>`,
            );
            $option.on("click", () => {
              const $native = matrixInput.$addEntryMenuBtn
                .data("disclosureMenu")
                .$container.find(`button[data-type="${block.handle}"]`);
              $native.trigger("activate");
            });
            $menu.append($option);
          });

          $btn.on("click", () => {
            $dropdown.toggleClass("open");
          });

          $dropdown.append($btn).append($menu);
          $btngroup.append($dropdown);
        });

        matrixInput.$container.find("> .buttons").append($wrapper);
      });
    },

    injectButtonGroupForCards: function (matrixContainer, matrixFieldHandle) {
      const existing = matrixContainer.querySelector(".blocksmith-btngroup");
      if (existing) existing.remove();

      this.loadBlockTypes(matrixFieldHandle).done((blockTypes) => {
        if (!blockTypes || !blockTypes.length) return;

        const $wrapper = $(
          '<div class="blocksmith-btngroup"><div class="btngroup"></div></div>',
        );
        const $btngroup = $wrapper.find(".btngroup");

        const groups = {};
        blockTypes.forEach((b) => {
          const gid = b.buttonGroupUid || "_";
          if (!groups[gid]) {
            groups[gid] = { name: b.buttonGroupName || "", blocks: [] };
          }
          groups[gid].blocks.push(b);
        });

        Object.values(groups).forEach((group) => {
          const $dropdown = $('<div class="blocksmith-dropdown"></div>');
          const $btn = $(
            `<button type="button" class="btn dashed">${group.name || Craft.t('blocksmith','Group')}</button>`,
          );
          const $menu = $('<div class="blocksmith-dropdown-menu"></div>');

          group.blocks.forEach((block) => {
            const $option = $(
              `<button type="button" class="menu-item add icon btn dashed" data-type="${block.handle}"><span class="menu-item-label">${block.name}</span></button>`,
            );
            $option.on("click", () => {
              const $triggerButton = $(matrixContainer).find(
                "button.blocksmith-replaced.menubtn",
              );
              const menuId = $triggerButton.attr("aria-controls");
              const $menuNative = $(`#${menuId}`);
              const $nativeBtn = $menuNative
                .find(`button`)
                .filter((_, el) => $(el).text().trim() === block.name.trim());
              if ($nativeBtn.length) {
                $nativeBtn[0].click();
              }
            });
            $menu.append($option);
          });

          $btn.on("click", () => {
            $dropdown.toggleClass("open");
          });

          $dropdown.append($btn).append($menu);
          $btngroup.append($dropdown);
        });

        $(matrixContainer).find("button.blocksmith-replaced.menubtn").after($wrapper);
      });
    },
  });
})(window);
