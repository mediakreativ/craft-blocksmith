// src/assets/js/blocksmithModal.js

(function (window) {
  const { Garnish, $ } = window;
  if (!Garnish || !$) {
    return;
  }

  /**
   * BlocksmithModal Class
   *
   * Provides a modal for selecting Matrix block types.
   */
  class BlocksmithModal {
    /**
     * Constructor for BlocksmithModal.
     *
     * @param {Array} blockTypes - Array of available block types.
     * @param {Function} onBlockSelected - Callback executed when a block is selected.
     * @param {Object} config - Additional configuration options.
     */
    constructor(blockTypes, onBlockSelected, config) {
      this.blockTypes = blockTypes; // List of available block types
      this.onBlockSelected = onBlockSelected; // Callback for block selection
      this.$overlay = null; // Overlay element
      this.$modal = null; // Modal element

      /**
       * Placeholder image for block previews.
       *
       * TODO: Update this logic once the backend provides either
       * custom preview images or a standard placeholder.
       */
      this.placeholderImage =
        config?.settings?.placeholderImage ||
        "/blocksmith/images/placeholder.png";

      // Access translations from the global scope
      this.translations = window.BlocksmithTranslations || {};
    }

    /**
     * Displays the modal.
     *
     * Creates the overlay and modal elements, attaches them to the DOM,
     * and renders the block types.
     */
    show() {
      this.createOverlay();
      this.createModal();
      this.$overlay.addClass("open");
      this.$modal.addClass("open");

      // Load block types initially
      this.renderBlockTypes("");
    }

    /**
     * Hides the modal.
     *
     * Removes the modal and overlay from the DOM and resets references.
     */
    hide() {
      this.$overlay.removeClass("open").remove();
      this.$modal.removeClass("open").remove();
      this.$overlay = null;
      this.$modal = null;
    }

    /**
     * Creates the overlay element.
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
     * Creates the modal element with dynamic translations.
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
     * Renders the available block types into the modal.
     *
     * @param {string} searchValue - The search string for filtering block types.
     */
    renderBlockTypes(searchValue) {
      const $blocksContainer = this.$modal.find(".blocksmith-blocks");
      $blocksContainer.empty();

      const filteredBlockTypes = this.blockTypes.filter((blockType) => {
        return blockType.name.toLowerCase().includes(searchValue.toLowerCase());
      });

      filteredBlockTypes.forEach((blockType) => {
        const previewImage = blockType.previewImage || this.placeholderImage;

        const $block = $(`
          <div class="blocksmith-block" data-type="${blockType.handle}">
              <img src="${previewImage}" alt="${blockType.name}" onerror="this.src='${this.placeholderImage}'">
              <span>${blockType.name}</span>
          </div>
        `);

        $block.on("click", () => {
          this.onBlockSelected(blockType);
          this.hide();
        });

        $blocksContainer.append($block);
      });
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
