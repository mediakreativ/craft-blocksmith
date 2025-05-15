// src/assets/js/blocksmitCardsSupportUtils.js

(function (window) {
  /**
   * Logs debug messages to the console if BlocksmithDebug is enabled.
   */
  function debugLog(...args) {
    if (!window.BlocksmithDebug) return;
    console.log("[Blocksmith]", ...args);
  }

  /**
   * Moves a newly inserted Card above a target block
   * by repeatedly triggering the "Move up" action in Craft's Cards UI.
   */
  async function moveCardUpUntilAbove(
    $node,
    insertAboveEntryId,
    matrixContainer,
  ) {
    const MAX_ATTEMPTS = 20;
    let attempts = 0;

    const $actionsBtn = $node.find(".action-btn");
    const menuId = $actionsBtn.attr("aria-controls");

    if (!menuId) {
      debugLog("No menu found – aborting move.");
      return;
    }

    const $menu = $(`#${menuId}`);

    const isAboveTarget = () => {
      const $siblings = matrixContainer.find(".element");
      const currentIndex = $siblings.index($node);
      const targetIndex = $siblings.index(
        $siblings.filter(`[data-id="${insertAboveEntryId}"]`),
      );
      debugLog("currentIndex: ", currentIndex);
      debugLog("targetIndex: ", targetIndex);
      return currentIndex < targetIndex;
    };

    const $moveUpBtn = await waitForMoveUpButton($menu);

    if (!$moveUpBtn?.length) {
      debugLog("Move up button not found – aborting move.");
      return;
    }

    const originalDisplayNotice = Craft.cp.displayNotice;
    Craft.cp.displayNotice = function () {};

    while (!isAboveTarget() && attempts < MAX_ATTEMPTS) {
      $moveUpBtn[0].click();
      debugLog(`Move up triggered (attempt ${attempts + 1})`);

      const delay = attempts < 3 ? 50 : 100;
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempts++;
    }

    Craft.cp.displayNotice = originalDisplayNotice;

    if (isAboveTarget()) {
      debugLog("Block successfully positioned above the target.");
    } else {
      debugLog("Target position not reached within maximum attempts.");
    }
  }

  /**
   * Waits for the first "Move up" button to appear in the context menu.
   */
  async function waitForMoveUpButton($menu) {
    const MAX_CHECKS = 10;
    let checks = 0;

    return new Promise((resolve) => {
      const check = () => {
        const $firstUl = $menu.find("ul").first();
        const expectedLabels = [
          Craft.t("app", "Move up"),
          Craft.t("app", "Move forward"),
        ];
        const $moveUpBtn = $firstUl
          .find("button.menu-item")
          .filter((_, btn) => {
            const label = $(btn).find(".menu-item-label").text().trim();
            return expectedLabels.includes(label);
          });

        if ($moveUpBtn.length) {
          debugLog("Move up button is available.");
          resolve($moveUpBtn);
        } else if (++checks >= MAX_CHECKS) {
          debugLog("Move up button not found within wait limit.");
          resolve(null);
        } else {
          const delay = checks < 5 ? 10 : 50;
          setTimeout(check, delay);
        }
      };

      check();
    });
  }

  /**
   * Observes the Matrix container for a newly inserted block
   * and moves it above a target block if needed.
   */
  function observeInsertedCard(matrixContainer, insertAboveEntryId) {
    if (!insertAboveEntryId) return;

    const observer = new MutationObserver((mutationsList, observerInstance) => {
      for (const mutation of mutationsList) {
        for (const node of mutation.addedNodes) {
          const $node = $(node);
          if (!$node.hasClass("element")) continue;

          const newEntryId = $node.data("id");
          debugLog("New block created with ID:", newEntryId);
          debugLog("Target ID to insert above:", insertAboveEntryId);

          matrixContainer.find(".blocksmith-insert-marker").remove();

          moveCardUpUntilAbove($node, insertAboveEntryId, matrixContainer);
          debugLog("Block moved above the target");
          delete window.BlocksmithRuntime.insertAboveEntryId;
          observerInstance.disconnect();
          return;
        }
      }
    });

    observer.observe(matrixContainer[0], {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Sets up global event listeners to automatically remove
   * the `.blocksmith-insert-marker` placeholder when a Slideout is closed,
   * either via ESC key, cancel button, or clicking the shade background.
   */
  function setupMarkerCleanupListeners() {
    Garnish.$doc.on("click", function (event) {
      const $target = $(event.target);

      const isCancelButton =
        $target.is("button[type='button']") &&
        $target.closest(".slideout").length &&
        $target.closest(".so-footer").length;

      const clickedOutsidePanel =
        $target.is(".slideout-shade") ||
        $target.closest(".slideout-shade").is($target);

      if (isCancelButton || clickedOutsidePanel) {
        $(".blocksmith-insert-marker").remove();
      }
    });

    Garnish.$doc.on("keydown", function (event) {
      if (
        (event.key === "Escape" || event.keyCode === 27) &&
        $(".slideout-container .so-visible").length
      ) {
        $(".blocksmith-insert-marker").remove();
      }
    });
  }

  /**
   * Removes inserted Button Group and insert anchor on window resize.
   */
  function setupButtonGroupCleanupOnResize() {
    if (window.BlocksmithButtonGroupCleanupAdded) return;

    window.addEventListener("resize", () => {
      const $floatingGroup = $(".blocksmith-floating-btngroup");
      const $inlineGroup = $(".blocksmith-btngroup.insert-above");
      const $anchor = $(".blocksmith-insert-anchor");

      if ($floatingGroup.length) $floatingGroup.remove();
      if ($inlineGroup.length) $inlineGroup.remove();
      if ($anchor.length) $anchor.remove();
    });

    window.BlocksmithButtonGroupCleanupAdded = true;
  }

  /**
   * Removes the inserted Button Group (floating or inline)
   * and anchor if the user clicks outside of it.
   */
  function setupButtonGroupDismissOnOutsideClick() {
    Garnish.$doc.on("click.blocksmithFloatingDismiss", (event) => {
      const $target = $(event.target);

      const isInsideFloating = $target.closest(
        ".blocksmith-floating-btngroup",
      ).length;
      const isInsideInline = $target.closest(
        ".blocksmith-btngroup.insert-above",
      ).length;
      const isTriggerOrMenu = $target.closest(".menu").length > 0;
      const isInsideSlideout =
        $target.closest(".slideout-container").length > 0;

      if (
        !isInsideFloating &&
        !isInsideInline &&
        !isTriggerOrMenu &&
        !isInsideSlideout
      ) {
        $(".blocksmith-floating-btngroup").remove();
        $(".blocksmith-btngroup.insert-above").remove();
        $(".blocksmith-insert-anchor").remove();
      }
    });
  }

  /**
   * Determines if the Cards view is currently rendered as a multi-column grid
   * (i.e. visually side-by-side), not just technically "grid" via CSS.
   *
   * @param {jQuery} matrixContainer - The container for the matrix field (.nested-element-cards)
   * @returns {boolean}
   */
  function isTrueGridView(matrixContainer) {
    const $elementsList = matrixContainer.find("ul.elements").first();
    const computedStyle = getComputedStyle($elementsList[0]);

    const isGridLayout = computedStyle.display === "grid";
    const columnCount = computedStyle.gridTemplateColumns
      .split(" ")
      .filter((v) => v.trim().length > 0).length;

    return isGridLayout && columnCount > 1;
  }

  window.BlocksmithUtils = {
    observeInsertedCard,
    setupMarkerCleanupListeners,
    setupButtonGroupCleanupOnResize,
    setupButtonGroupDismissOnOutsideClick,
    isTrueGridView,
  };
})(window);
