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

          window.BlocksmithMenuUtils.syncAddBlockState(
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
        BlocksmithCardsSupportUtils.setupButtonGroupCleanupOnResize();
        BlocksmithCardsSupportUtils.setupButtonGroupDismissOnOutsideClick();
        BlocksmithCardsSupportUtils.setupMarkerCleanupListeners();
      }

      window.BlocksmithConfig = window.BlocksmithConfig || {};
      window.BlocksmithConfig.matrixFieldSettings =
        matrixFieldSettings.settings || {};
      window.BlocksmithConfig.edition = matrixFieldSettings.edition;
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
        const disclosure = matrixInput.$addEntryMenuBtn.data("disclosureMenu");

        // Skip injection if only a single block type exists
        if (!disclosure || !disclosure.$container) {
          debugLog(
            `Skipping inline btngroup injection for "${matrixFieldHandle}" – DisclosureMenu not ready or only 1 block type.`,
          );
          return;
        }

        const $buttons = disclosure.$container.find("button");

        // Do not inject a button group if only a single block type exists.
        // In this case, Craft uses the native “New entry” button directly.
        if ($buttons.length <= 1) {
          debugLog(
            `Skipping inline btngroup injection – only 1 block type for "${matrixFieldHandle}"`,
          );
          return;
        }

        this.injectButtonGroup(matrixInput, matrixFieldHandle);
        matrixInput.$addEntryMenuBtn.hide();
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
          ?.$container?.find("button") || $();
      if (blockTypes.length <= 1) {
        return;
      }

      if (disclosureMenu._menuInitialized) {
        this.verifyExistence($container, matrix);
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
      this.verifyExistence($container, matrix);
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
            debugLog(
              "Injecting grouped Button Group above current block (inline)",
            );

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

            const $globalMenubtn = matrix.$container
              .find("button.menubtn.add")
              .first();

            if (!$globalMenubtn.length) {
              console.warn("[Blocksmith] Global menubtn not found.");
              return;
            }

            const globalMenuId = $globalMenubtn.attr("aria-controls");
            const $menu = $(`#${globalMenuId}`);

            if (!$menu.length) {
              console.warn(
                `[Blocksmith] Disclosure menu "${globalMenuId}" not found.`,
              );
              return;
            }

            const $groups = $menu.find(".menu-group");

            if ($groups.length && this.settings.useEntryTypeGroups === true) {
              $groups.each((idx, group) => {
                const $group = $(group);
                const groupName = $group.find("h3.h6").text().trim();
                const $list = $group.find("ul");

                if (!$list.length) return;

                const groupId = `bs-ctx-inline-${entry.id}-${idx}`;

                const $dropdown = $(`
                  <div class="blocksmith-group-dropdown"> 
                  <button
                    type="button"
                    class="btn menubtn dashed add icon blocksmith-group-toggle"
                    aria-controls="${groupId}"
                    data-disclosure-trigger="true">${groupName}
                  </button>
                  <div id="${groupId}" class="menu menu--disclosure">
                    <ul></ul>
                  </div>
                  </div>
                  `);

                const $dropMenu = $dropdown.find("ul");

                $list.find("button[data-type]").each((_, btn) => {
                  const $btn = $(btn);
                  const handle = $btn.data("type");
                  const label = $btn.find(".menu-item-label").text().trim();

                  const $li = $(`
                    <li>
                     <button type="button" class="menu-item" data-type="${handle}">
                      <span class="menu-item-label">${label}</span>
                     </button>
                    </li>
                    `);

                  const $button = $li.find("button");

                  const canAdd = Craft.Blocksmith.prototype.canAddMoreEntries(
                    matrix,
                    null,
                  );
                  if (!canAdd) {
                    $button
                      .prop("disabled", true)
                      .addClass("disabled")
                      .attr(
                        "title",
                        Craft.t(
                          "blocksmith",
                          "Maximum number of blocks reached.",
                        ),
                      );
                  }

                  $button.on("click", function (e) {
                    e.preventDefault();
                    if ($button.prop("disabled")) return;

                    window.BlocksmithMenuUtils.triggerInlineContextButtonClick(
                      entry,
                      label,
                      $wrapper,
                      $button,
                    );
                  });

                  $dropMenu.append($li);
                });

                new Garnish.DisclosureMenu($dropdown.find("button")[0]);
                $btngroup.append($dropdown);
              });
            } else {
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
                  data-type="${blockHandle}">
                    <span class="menu-item-label">${label}</span>
                  </button>
                  `);

                const canAdd = Craft.Blocksmith.prototype.canAddMoreEntries(
                  matrix,
                  null,
                );
                if (!canAdd) {
                  $button
                    .prop("disabled", true)
                    .addClass("disabled")
                    .attr(
                      "title",
                      Craft.t(
                        "blocksmith",
                        "Maximum number of blocks reached.",
                      ),
                    );
                }

                $button.on("click", function (e) {
                  e.preventDefault();
                  if ($button.prop("disabled")) return;

                  window.BlocksmithMenuUtils.triggerInlineContextButtonClick(
                    entry,
                    label,
                    $wrapper,
                  );
                });

                $btngroup.append($button);
              });
            }

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
              ?.$container.find("button") || $();

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

          const isGridView =
            BlocksmithCardsSupportUtils.isTrueGridView(matrixContainer);

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

            window.BlocksmithCardsSupportUtils.observeInsertedCard(
              matrixContainer,
              insertAboveEntryId,
            );
          });

          $newList.append($addNewBlockButton);
        } else {
          const isGridView =
            BlocksmithCardsSupportUtils.isTrueGridView(matrixContainer);

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
                BlocksmithCardsSupportUtils.isTrueGridView(matrixContainer);

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
                  matrixContainer.find(".blocksmith-insert-anchor").remove();
                  $targetCard.before(
                    '<div class="blocksmith-insert-anchor"></div>',
                  );
                  const $anchor = matrixContainer
                    .find(".blocksmith-insert-anchor")
                    .first();

                  const $menubtn = matrixContainer
                    .find(".blocksmith-replaced.menubtn")
                    .first();
                  const menuId = $menubtn.attr("aria-controls");
                  const $menu = $(`#${menuId}`);

                  const $wrapper = $(
                    '<div class="blocksmith-floating-btngroup"></div>',
                  );

                  const $headings = $menu.find("h3.h6");

                  if (
                    $headings.length &&
                    this.settings.useEntryTypeGroups === true
                  ) {
                    $headings.each((idx, heading) => {
                      const groupName = $(heading).text().trim();
                      const $list = $(heading).next("ul");
                      if (!$list.length) return;

                      const $dropdown = $(
                        `<div class="blocksmith-group-dropdown">
                          <button type="button"
                            class="btn menubtn dashed add icon blocksmith-group-toggle"
                            aria-controls="bs-group-${insertAboveEntryId}-${idx}"
                            data-disclosure-trigger="true">${groupName}
                          </button>
                          <div id="bs-group-${insertAboveEntryId}-${idx}"
                            class="menu menu--disclosure">
                              <ul></ul>
                          </div>
                          </div>`,
                      );
                      const $dropMenu = $dropdown.find("ul");

                      $list.find("button").each((_, btn) => {
                        const $btn = $(btn);
                        const label = $btn
                          .find(".menu-item-label")
                          .text()
                          .trim();
                        const handle = $btn.data("type");

                        const $li = $(
                          `<li>
                            <button type="button" class="menu-item" data-type="${handle}">
                              <span class="menu-item-label">${label}</span>
                            </button>
                          </li>`,
                        );

                        $li.find("button").on("click", (e) => {
                          e.preventDefault();

                          delete window.BlocksmithRuntime.insertAboveEntryId;
                          window.BlocksmithRuntime = { insertAboveEntryId };

                          const $matching = $menu
                            .find("button")
                            .filter(
                              (_, el) =>
                                $(el).find(".menu-item-label").text().trim() ===
                                label,
                            );

                          if ($matching.length) {
                            window.BlocksmithCardsSupportUtils.observeInsertedCard(
                              matrixContainer,
                              insertAboveEntryId,
                            );
                            $matching[0].click();
                          }

                          $wrapper.addClass("btns-removed");
                        });

                        $dropMenu.append($li);
                      });

                      new Garnish.DisclosureMenu($dropdown.find("button")[0]);
                      $wrapper.append($dropdown);
                    });
                  } else {
                    blockTypes.forEach((block) => {
                      const $btn = $(
                        `<button type="button"
                          class="menu-item add icon btn dashed"
                          data-type="${block.handle}">
                            <span class="menu-item-label">${block.name}</span>
                        </button>`,
                      );

                      $btn.on("click", () => {
                        delete window.BlocksmithRuntime.insertAboveEntryId;
                        window.BlocksmithRuntime = { insertAboveEntryId };

                        const $matchingButton = $menu
                          .find("button")
                          .filter(
                            (_, el) =>
                              $(el).text().trim() === block.name.trim(),
                          );

                        if ($matchingButton.length) {
                          window.BlocksmithCardsSupportUtils.observeInsertedCard(
                            matrixContainer,
                            insertAboveEntryId,
                          );
                          $matchingButton[0].click();
                        }

                        $wrapper.addClass("btns-removed");
                      });

                      $wrapper.append($btn);
                    });
                  }

                  $anchor.append($wrapper);
                } else {
                  const $insertionPoint = matrixContainer
                    .find(`.element[data-id="${insertAboveEntryId}"]`)
                    .closest("li");
                  if (!$insertionPoint.length) {
                    console.warn(
                      "Blocksmith: Target block not found for insertion.",
                    );
                    return;
                  }

                  const $menubtn = matrixContainer
                    .find(".blocksmith-replaced.menubtn")
                    .first();
                  const menuId = $menubtn.attr("aria-controls");
                  const $menu = $(`#${menuId}`);

                  const $wrapper = $(
                    '<li class="blocksmith-btngroup insert-above"><div class="btngroup"></div></li>',
                  );
                  const $btngroup = $wrapper.find(".btngroup");

                  const $headings = $menu.find("h3.h6");

                  if (
                    $headings.length &&
                    this.settings.useEntryTypeGroups === true
                  ) {
                    $headings.each((idx, heading) => {
                      const groupName = $(heading).text().trim();
                      const $list = $(heading).next("ul");
                      if (!$list.length) return;

                      const groupId = `bs-inline-${insertAboveEntryId}-${idx}`;

                      const $dropdown = $(
                        `<div class="blocksmith-group-dropdown"><button type="button" class="btn menubtn dashed add icon blocksmith-group-toggle" aria-controls="${groupId}" data-disclosure-trigger="true">${groupName}</button><div id="${groupId}" class="menu menu--disclosure"><ul></ul></div></div>`,
                      );

                      const $dropMenu = $dropdown.find("ul");

                      $list.find("button").each((_, btn) => {
                        const $btn = $(btn);
                        const label = $btn
                          .find(".menu-item-label")
                          .text()
                          .trim();
                        const handle = $btn.data("type");

                        const $li = $(
                          `<li><button type="button" class="menu-item" data-type="${handle}"><span class="menu-item-label">${label}</span></button></li>`,
                        );

                        $li.find("button").on("click", (e) => {
                          e.preventDefault();

                          delete window.BlocksmithRuntime.insertAboveEntryId;
                          window.BlocksmithRuntime = { insertAboveEntryId };

                          const $target = matrixContainer.find(
                            `.element[data-id="${insertAboveEntryId}"]`,
                          );
                          $target.before(
                            '<span class="btn dashed blocksmith-insert-marker"></span>',
                          );

                          const $matching = $menu
                            .find("button")
                            .filter(
                              (_, el) =>
                                $(el).find(".menu-item-label").text().trim() ===
                                label,
                            );

                          if ($matching.length) {
                            window.BlocksmithCardsSupportUtils.observeInsertedCard(
                              matrixContainer,
                              insertAboveEntryId,
                            );
                            $matching[0].click();

                            const $disclosureMenu = $li
                              .find("button")
                              .closest(".menu--disclosure");
                            if ($disclosureMenu.length) {
                              const menuId = $disclosureMenu.attr("id");
                              const $toggleButton = $(
                                `.blocksmith-group-toggle[aria-controls="${menuId}"]`,
                              );
                              $toggleButton.attr("aria-expanded", "false");
                              $disclosureMenu.hide();
                            }
                          }

                          $wrapper.remove();
                        });

                        $dropMenu.append($li);
                      });

                      new Garnish.DisclosureMenu($dropdown.find("button")[0]);
                      $btngroup.append($dropdown);
                    });
                  } else {
                    blockTypes.forEach((block) => {
                      const $btn = $(
                        `<button type="button" class="menu-item add icon btn dashed" data-type="${block.handle}"><span class="menu-item-label">${block.name}</span></button>`,
                      );
                      $btn.on("click", () => {
                        delete window.BlocksmithRuntime.insertAboveEntryId;
                        window.BlocksmithRuntime = { insertAboveEntryId };

                        const $target = matrixContainer.find(
                          `.element[data-id="${insertAboveEntryId}"]`,
                        );
                        $target.before(
                          '<span class="btn dashed blocksmith-insert-marker"></span>',
                        );

                        const $matchingButton = $menu
                          .find("button")
                          .filter(
                            (_, el) =>
                              $(el).text().trim() === block.name.trim(),
                          );

                        if ($matchingButton.length) {
                          window.BlocksmithCardsSupportUtils.observeInsertedCard(
                            matrixContainer,
                            insertAboveEntryId,
                          );
                          $matchingButton[0].click();
                        }

                        $wrapper.remove();
                      });

                      $btngroup.append($btn);
                    });
                  }

                  $insertionPoint.before($wrapper);
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
    verifyExistence: function ($container, matrix) {
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

      return true;
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

    injectButtonGroup: function (matrixInput) {
      const $existing = matrixInput.$container
        .children(".buttons")
        .children(".blocksmith-btngroup");

      if ($existing.length) {
        $existing.remove();
      }

      const $menu =
        matrixInput.$addEntryMenuBtn.data("disclosureMenu")?.$container || $();
      const $buttons = $menu.find("button") || $();

      let $wrapper = $(
        '<div class="blocksmith-btngroup"><div class="btngroup"></div></div>',
      );

      const $btngroup = $wrapper.find(".btngroup");

      const $headings = $menu.find("h3.h6");

      if ($headings.length && this.settings.useEntryTypeGroups === true) {
        const $groupsWrapper =
          window.BlocksmithMenuUtils.buildGroupedButtonDropdowns(
            $menu,
            (label, $button) => {
              const disabled = !Craft.Blocksmith.prototype.canAddMoreEntries(
                matrixInput,
                null,
              );
              if (disabled) {
                $button
                  .prop("disabled", true)
                  .addClass("disabled")
                  .attr(
                    "title",
                    Craft.t("blocksmith", "Maximum number of blocks reached."),
                  );
              }

              $button.on("click", function (e) {
                e.preventDefault();
                if ($button.prop("disabled")) return;

                const $matching = $menu
                  .find("button")
                  .filter(
                    (_, el) =>
                      $(el).find(".menu-item-label").text().trim() === label,
                  );

                if ($matching.length) {
                  $matching[0].click();
                }

                const $disclosureMenu = $button.closest(".menu--disclosure");
                if ($disclosureMenu.length) {
                  const menuId = $disclosureMenu.attr("id");
                  const $toggleButton = $(
                    `.blocksmith-group-toggle[aria-controls="${menuId}"]`,
                  );
                  $toggleButton.attr("aria-expanded", "false");
                  $disclosureMenu.hide();
                }
              });
            },
          );

        $btngroup.append($groupsWrapper.children());
      } else {
        $buttons.each(function () {
          const $menuBtn = $(this);
          const blockHandle = $menuBtn.data("type");
          const label = $menuBtn.find(".menu-item-label").text().trim();

          const $button = $(`
        <button
          type="button"
          class="menu-item add icon btn dashed"
          data-type="${blockHandle}"
        >
          <span class="menu-item-label">${label}</span>
        </button>
      `);

          if (
            !Craft.Blocksmith.prototype.canAddMoreEntries(matrixInput, null)
          ) {
            $button
              .prop("disabled", true)
              .addClass("disabled")
              .attr(
                "title",
                Craft.t("blocksmith", "Maximum number of blocks reached."),
              );
          }

          $button.on("click", function (e) {
            e.preventDefault();
            if ($button.prop("disabled")) return;
            $menuBtn.trigger("activate");
          });

          $btngroup.append($button);
        });
      }

      matrixInput.$container.find("> .buttons").append($wrapper);
    },

    injectButtonGroupForCards: function (matrixContainer, matrixFieldHandle) {
      const existing = matrixContainer.querySelector(
        ".blocksmith-groups-wrapper",
      );
      if (existing) {
        existing.remove();
      }

      this.loadBlockTypes(matrixFieldHandle).done((blockTypes) => {
        if (!blockTypes?.length) return;

        const $triggerButton = $(matrixContainer).find(
          "button.blocksmith-replaced.menubtn",
        );
        if (!$triggerButton.length) {
          console.warn("Blocksmith: No .menubtn trigger found.");
          return;
        }

        const menuId = $triggerButton.attr("aria-controls");
        const $menu = $(`#${menuId}`);
        console.log("$menu: ", $menu);
        if (!$menu.length) {
          console.warn("Blocksmith: Disclosure menu not found in DOM.");
          return;
        }

        const $headings = $menu.find("h3.h6");

        if ($headings.length && this.settings.useEntryTypeGroups === true) {
          $groupsWrapper =
            window.BlocksmithMenuUtils.buildGroupedButtonDropdowns(
              $menu,
              (label, $button) => {
                const disabled = !Craft.Blocksmith.prototype.canAddMoreEntries(
                  null,
                  $triggerButton,
                );
                if (disabled) {
                  $button
                    .prop("disabled", true)
                    .addClass("disabled")
                    .attr(
                      "title",
                      Craft.t(
                        "blocksmith",
                        "Maximum number of blocks reached.",
                      ),
                    );
                }

                $button.on("click", (e) => {
                  e.preventDefault();
                  console.log("Grouped Button Group clicked");
                  console.log("$menu (Grouped button group): ", $menu);
                  console.log(
                    "matrixContainer (Grouped Button group): ",
                    matrixContainer,
                  );
                  if ($button.prop("disabled")) return;

                  window.BlocksmithRuntime = window.BlocksmithRuntime || {};
                  delete window.BlocksmithRuntime.insertAboveEntryId;

                  const $matching = $menu
                    .find("button")
                    .filter(
                      (_, el) =>
                        $(el).find(".menu-item-label").text().trim() === label,
                    );

                  console.log("$matching: ", $matching);

                  if ($matching.length) {
                    $matching.trigger("activate");
                  }

                  const $disclosureMenu = $button.closest(".menu--disclosure");
                  if ($disclosureMenu.length) {
                    const menuId = $disclosureMenu.attr("id");
                    const $toggleButton = $(
                      `.blocksmith-group-toggle[aria-controls="${menuId}"]`,
                    );
                    $toggleButton.attr("aria-expanded", "false");
                    $disclosureMenu.hide();
                  }
                });
              },
            );
        } else {
          $groupsWrapper = $(
            '<div class="blocksmith-btngroup"><div class="btngroup"></div></div>',
          );
          const $btngroup = $groupsWrapper.find(".btngroup");

          blockTypes.forEach((block) => {
            const $button = $(
              `<button type="button" class="menu-item add icon btn dashed" data-type="${block.handle}"><span class="menu-item-label">${block.name}</span></button>`,
            );

            if (
              !Craft.Blocksmith.prototype.canAddMoreEntries(
                null,
                $triggerButton,
              )
            ) {
              $button
                .prop("disabled", true)
                .addClass("disabled")
                .attr(
                  "title",
                  Craft.t("blocksmith", "Maximum number of blocks reached."),
                );
            }

            $button.on("click", (e) => {
              e.preventDefault();
              console.log("Ungrouped Button Group clicked");
              console.log("$menu (Ungrouped Button Group): ", $menu);
              console.log(
                "matrixContainer (Ungrouped Button Group): ",
                matrixContainer,
              );
              if ($button.prop("disabled")) return;

              window.BlocksmithRuntime = window.BlocksmithRuntime || {};
              delete window.BlocksmithRuntime.insertAboveEntryId;

              const $matching = $menu
                .find("button")
                .filter((_, el) => $(el).text().trim() === block.name.trim());

              if ($matching.length) {
                $matching.trigger("activate");
              }
            });

            $btngroup.append($button);
          });
        }

        $triggerButton.after($groupsWrapper);

        const $allButtons = $groupsWrapper.find("button");
        const syncState = () => {
          const disabled = !Craft.Blocksmith.prototype.canAddMoreEntries(
            null,
            $triggerButton,
          );
          $allButtons.each(function () {
            $(this)
              .prop("disabled", disabled)
              .toggleClass("disabled", disabled)
              .attr(
                "title",
                disabled
                  ? Craft.t("blocksmith", "Maximum number of blocks reached.")
                  : "",
              );
          });
        };
        syncState();
        const observer = new MutationObserver(() => setTimeout(syncState, 100));
        observer.observe(matrixContainer.querySelector("ul.elements"), {
          childList: true,
        });
      });
    },
  });
})(window);
