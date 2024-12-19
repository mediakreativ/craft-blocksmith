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
      let modalViewClass = 'blocksmith-regular-view';
      if(window.BlocksmithConfig?.settings?.wideViewFourBlocks) {
        modalViewClass = 'blocksmith-wide-view';
      }

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
                <div class="categories-container">
                  <!-- Categories are dynamically inserted here -->
                </div>
                <div style="opacity:0;transition:none;" class="blocksmith-blocks ${modalViewClass}">
                  <div class="blocksmith-block-gutter"></div>
                </div>
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

      this.loadCategories()
        .done((categories) => {
          this.renderCategories(categories);
        })
        .fail((error) => {
          console.error("Failed to load categories:", error);
        });
    }

    loadCategories() {
      return $.ajax({
        url: Craft.getCpUrl("blocksmith/get-categories"),
        method: "GET",
        dataType: "json",
      });
    }

    renderCategories(categories) {
      const $categoriesContainer = this.$modal.find(".categories-container");
      $categoriesContainer.empty();

      if (categories.length > 0) {
        const setActiveCategory = ($selectedBadge) => {
          $categoriesContainer
            .find(".blocksmith-category-badge")
            .removeClass("active");
          $selectedBadge.addClass("active");
        };

        const $allCategoriesButton = $(`
          <span class="blocksmith-badge blocksmith-category-badge all-categories active">
            ${Craft.t("blocksmith", "All Categories")}
          </span>
        `);

        $allCategoriesButton.on("click", () => {
          setActiveCategory($allCategoriesButton);
          this.renderBlockTypes("");
        });

        $categoriesContainer.append($allCategoriesButton);

        categories.forEach((category) => {
          const $badge = $(`
            <span class="blocksmith-badge blocksmith-category-badge" data-category-id="${category.id}">
              ${category.name}
            </span>
          `);

          $badge.on("click", () => {
            setActiveCategory($badge);
            this.renderBlockTypes("", category.id);
          });

          $categoriesContainer.append($badge);
        });
      }
    }

    /**
     * Renders the available block types into the modal
     *
     * @param {string} searchValue - The search string for filtering block types
     */
    renderBlockTypes(searchValue, categoryId = null) {
      const $blocksContainer = this.$modal.find(".blocksmith-blocks");

        // Create all block elements and save them to create them only once
        this.blockTypes.forEach((blockType, index) => {
          if(!blockType?.elem) {

          let previewImage = blockType.previewImage || this.placeholderImage;

          if (window.BlocksmithConfig.settings.useHandleBasedPreviews) {
            previewImage = `${window.BlocksmithConfig.settings.previewImageVolume}/${
              window.BlocksmithConfig.settings.previewImageSubfolder
                ? window.BlocksmithConfig.settings.previewImageSubfolder + "/"
                : ""
            }${blockType.handle}.png`;
          }

          const description =
            blockType.description ||
            Craft.t("blocksmith", "No description available.");

          const $block = $(`
                <div class="blocksmith-block blocksmith-block-hidden" data-type="${blockType.handle}">
                  <div class="blocksmith-block-inner">
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
                              "Add a PNG file named '{fileName}' to the configured asset volume.",
                              { fileName: `${blockType.handle}.png` },
                            )}
                        </div>
                        ${blockType.description ? `<div class="blocksmith-block-description">${blockType.description}</div>` : ""}
                    </div>
                  </div>
                </div>
            `);

          $block.on("click", () => {
            this.onBlockSelected(blockType);
            this.hide();
          });
          this.blockTypes[index].elem = $block[0];
          $blocksContainer.append($block);
        }
      })

      // Filter the block types and hide / display them accordingly
      this.blockTypes.filter((blockType) => {
        // Hide all block types to start
        blockType.elem.classList.add('blocksmith-block-hidden');

        const matchesSearch = blockType.name
          .toLowerCase()
          .includes(searchValue.toLowerCase());

        // Hide the ones that have no category set when a category is being filtered
        let matchesCategory = true;
        if(categoryId !== null){
          if(blockType.categories.length > 0 && blockType.categories.includes(categoryId)){
            matchesCategory = true;
          }else{
            matchesCategory = false;
          }
        }

        if(matchesSearch && matchesCategory){
          blockType.elem.classList.remove('blocksmith-block-hidden');
        }
      });

      imagesLoaded($blocksContainer[0], () => {
        requestAnimationFrame(() => {
          this.initializeMasonry($blocksContainer[0]);
        });
      });
    }

    /**
     * Initializes Masonry with dynamic settings
     *
     * @param {HTMLElement} container - The Masonry container
     */
    initializeMasonry(container) {
      const masonryConfig = {
        itemSelector: ".blocksmith-block:not(.blocksmith-block-hidden)",
        percentPosition: true,
        transitionDuration: '.2s',
        gutter: '.blocksmith-block-gutter',
      };

      if (!this.masonryInstance) {
        this.masonryInstance = new Masonry(container, masonryConfig);
        container.style.opacity = "1";
        container.style.transition = "opacity .2s ease";
      }else{
        this.masonryInstance.layout();
      }
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

  window.BlocksmithModal = BlocksmithModal;
})(window);
