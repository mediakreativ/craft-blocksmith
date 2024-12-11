// src/assets/js/blocksmithModal.js

(function (window) {
  const { Garnish, $ } = window;
  if (!Garnish || !$) {
    return;
  }

  /**
   * BlocksmithModal Class
   *
   * Provides a modal for selecting Matrix block types
   */
  class BlocksmithModal {
    /**
     * Constructor for BlocksmithModal
     *
     * @param {Array} blockTypes - Array of available block types
     * @param {Function} onBlockSelected - Callback executed when a block is selected
     * @param {Object} config - Additional configuration options
     */
    constructor(blockTypes, onBlockSelected, config) {
      this.blockTypes = blockTypes;
      this.onBlockSelected = onBlockSelected;
      this.$overlay = null;
      this.$modal = null;

      /**
       * Placeholder image for block previews.
       */
      this.placeholderImage =
        config?.settings?.placeholderImage ||
        "/blocksmith/images/placeholder.png";

      this.translations = window.BlocksmithTranslations || {};
    }

    loadBlockTypes() {
      return $.ajax({
        url: Craft.getCpUrl("blocksmith/get-block-types"),
        method: "GET",
        dataType: "json",
      });
    }

    /**
     * Displays the modal
     */
    show() {
      this.createOverlay();
      this.createModal();
      this.$overlay.addClass("open");
      this.$modal.addClass("open");

      // Lade die Blockdaten und rendere sie
      this.loadBlockTypes()
        .done((blockTypes) => {
          this.blockTypes = blockTypes;
          this.renderBlockTypes("");
        })
        .fail((error) => {
          console.error("Failed to load block types:", error);
        });
    }

    /**
     * Hides the modal
     */
    hide() {
      if (this.masonryInstance) {
        this.masonryInstance.destroy();
        this.masonryInstance = null;
      }

      if (this.$modal) {
        this.$modal.find(".blocksmith-blocks").empty();
      }

      this.$overlay.removeClass("open").remove();
      this.$modal.removeClass("open").remove();
      this.$overlay = null;
      this.$modal = null;
    }

    /**
     * Creates the overlay element
     */
    createOverlay() {
      const $overlay = $(`
        <div class="modal-shade garnish-js-aria blocksmith-modal-overlay" style="display: block; opacity: 1;" aria-hidden="true"></div>
      `);

      $overlay.on("click", () => this.hide());
      $("body").append($overlay);
      this.$overlay = $overlay;
    }

    /**
     * Creates the modal element with dynamic translations
     */
    createModal() {
      const $modal = $(`
        <div class="blocksmith-modal">
            <div class="blocksmith-modal-content">
                <div class="search-container flex-grow texticon has-filter-btn">
                    <span class="texticon-icon search icon" aria-hidden="true"></span>
                    <input type="text" id="matrixSearch" class="clearable text fullwidth" autocomplete="off" placeholder="${this.translate(
                      "Search",
                    )}" dir="ltr" aria-label="${this.translate("Search")}">
                    <button class="clear-btn hidden" title="${this.translate(
                      "Clear search",
                    )}" role="button" aria-label="${this.translate(
                      "Clear search",
                    )}"></button>
                </div>
                <div class="blocksmith-blocks"></div>
            </div>
            <div class="footer blocksmith-modal-footer">
                <button type="button" class="btn cancel-btn" tabindex="0">${this.translate(
                  "Cancel",
                )}</button>
            </div>
        </div>
      `);

      $modal.find("#matrixSearch").on("input", (event) => {
        const searchValue = $(event.target).val();
        this.renderBlockTypes(searchValue);
      });

      $modal.find(".cancel-btn").on("click", () => this.hide());

      $("body").append($modal);
      this.$modal = $modal;
    }

    /**
     * Renders the available block types into the modal
     *
     * @param {string} searchValue - The search string for filtering block types
     */
    renderBlockTypes(searchValue) {
      const $blocksContainer = this.$modal.find(".blocksmith-blocks");
      $blocksContainer.empty();

      const filteredBlockTypes = this.blockTypes.filter((blockType) => {
        return blockType.name.toLowerCase().includes(searchValue.toLowerCase());
      });

      filteredBlockTypes.forEach((blockType) => {
        let previewImage = blockType.previewImage || this.placeholderImage;

        if (window.BlocksmithConfig.settings.useHandleBasedPreviews) {
          previewImage = `${window.BlocksmithConfig.settings.previewImageVolume}/${
            window.BlocksmithConfig.settings.previewImageSubfolder
              ? window.BlocksmithConfig.settings.previewImageSubfolder + "/"
              : ""
          }${blockType.handle}.png`;
        }

        const description =
          blockType.description || "No description available.";

        const $block = $(`
              <div class="blocksmith-block" data-type="${blockType.handle}">
                  <img src="${previewImage}" alt="${blockType.name}" onerror="
                      this.src='${this.placeholderImage}'; 
                      const hint = this.closest('.blocksmith-block').querySelector('.blocksmith-hint');
                      if (hint) {
                          hint.style.display = 'block';
                      }">
                  <div class="blocksmith-footer">
                      <span>${blockType.name}</span>
                      <div class="blocksmith-hint" style="display: none;">
                          ${Craft.t(
                            "blocksmith",
                            "Add a PNG file named {fileName} to the configured asset volume.",
                            { fileName: `${blockType.handle}.png` },
                          )}
                      </div>
                      <div class="blocksmith-block-description">${description}</div>
                  </div>
              </div>
          `);

        $block.on("click", () => {
          this.onBlockSelected(blockType);
          this.hide();
        });

        $blocksContainer.append($block);
      });

      setTimeout(() => {
        imagesLoaded($blocksContainer[0], () => {
          requestAnimationFrame(() => {
            this.initializeMasonry($blocksContainer[0]);
          });
        });
      }, 100);
    }

    // Masonry Initialization with Instance Check
    initializeMasonry(container) {
      if (!this.masonryInstance) {
        this.masonryInstance = new Masonry(container, {
          itemSelector: ".blocksmith-block",
          columnWidth: ".blocksmith-block",
          percentPosition: true,
        });
      } else {
        this.masonryInstance.reloadItems();
        this.masonryInstance.layout();
      }
    }

    /**
     * Initializes Masonry with dynamic settings
     *
     * @param {HTMLElement} container - The Masonry container
     */
    initializeMasonry(container) {
      const masonryConfig = {
        itemSelector: ".blocksmith-block",
        percentPosition: true,
        gutter: 20,
      };

      const applyColumnLogic = () => {
        const modalWidth =
          document.querySelector(".blocksmith-modal").offsetWidth;

        let columns = 1;
        let columnWidth = modalWidth;

        if (modalWidth > 800) {
          if (window.BlocksmithConfig?.settings?.wideViewFourBlocks) {
            columns = 3;
          } else {
            columns = 2;
          }
        } else {
          columns = 2;
        }

        columnWidth = modalWidth / columns - 40;

        const blockElements = container.querySelectorAll(
          masonryConfig.itemSelector,
        );
        blockElements.forEach((block) => {
          block.style.width = `${columnWidth}px`;
        });

        masonryConfig.columnWidth = columnWidth;

        if (this.masonryInstance) {
          this.masonryInstance.reloadItems();
          this.masonryInstance.layout();
        }
      };

      // Initialize Masonry
      if (!this.masonryInstance) {
        this.masonryInstance = new Masonry(container, masonryConfig);
      }

      applyColumnLogic();

      window.addEventListener("resize", applyColumnLogic);
    }

    /**
     * Translates a given message using the loaded translations.
     *
     * @param {string} message - The message to translate.
     * @returns {string} The translated message or the original if not found.
     */
    translate(message) {
      return this.translations[message] || message;
    }
  }

  // Attach BlocksmithModal to the global window object
  window.BlocksmithModal = BlocksmithModal;
})(window);
