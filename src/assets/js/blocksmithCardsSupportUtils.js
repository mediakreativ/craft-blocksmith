// src/assets/js/blocksmithUtils.js

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

  // Exportieren
  window.BlocksmithUtils = {
    observeInsertedCard,
  };
})(window);
