// src/assets/js/blocksmithMenuUtils.js

(function (window) {
  /**
   * Properly closes the Blocksmith group dropdown that contains the given element.
   *
   * Garnish's DisclosureMenu registers a UI layer (Garnish.uiLayerManager) when it
   * opens. That layer has to be removed again on close, otherwise it stays on top
   * of the layer stack and intercepts keyboard shortcuts such as Cmd/Ctrl+S – the
   * browser then shows its native "Save page" dialog instead of Craft saving the
   * entry. Hiding the menu manually via jQuery skips this cleanup, so we go through
   * Garnish's own hide() whenever possible and only fall back to a manual cleanup
   * (which also drops the leaked layer explicitly).
   *
   * @param {jQuery|HTMLElement} el An element inside the open disclosure menu.
   */
  function closeContainingGroupDropdown(el) {
    const $menu = $(el).closest(".menu--disclosure");
    if (!$menu.length) return;

    const disclosure = $menu.data("disclosureMenu");
    if (disclosure && typeof disclosure.hide === "function") {
      disclosure.hide();
      return;
    }

    const menuId = $menu.attr("id");
    $(`.blocksmith-group-toggle[aria-controls="${menuId}"]`).attr(
      "aria-expanded",
      "false",
    );
    $menu.removeClass("visible").css("display", "");

    if (window.Garnish && Garnish.uiLayerManager) {
      Garnish.uiLayerManager.removeLayer($menu);
    }
  }

  /**
   * Enable/disable the "Add block above" button based on the native button state.
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
   * Triggers the native "Add block above" action from an inline Matrix context menu.
   */
  function triggerInlineContextButtonClick(
    entry,
    label,
    $wrapper,
    $button = null,
  ) {
    const $contextMenubtn = entry.$container.find(".actions .menubtn");
    const contextMenuId = $contextMenubtn.attr("aria-controls");

    if (!contextMenuId) {
      console.warn(
        "[Blocksmith] No disclosure menu ID found for inline btngroup.",
      );
      return;
    }

    const $contextDisclosureMenu = $(`#${contextMenuId}`);
    if (!$contextDisclosureMenu.length) {
      console.warn(
        `[Blocksmith] Disclosure menu with ID "${contextMenuId}" not found.`,
      );
      return;
    }

    const $matching = $contextDisclosureMenu
      .find("button[data-type]")
      .filter((_, el) =>
        $(el).find(".menu-item-label").text().trim().includes(label),
      );

    if ($matching.length) {
      if ($wrapper) $wrapper.remove();
      $matching[0].click();

      if ($button) {
        closeContainingGroupDropdown($button);
      }
    } else {
      console.warn(
        `[Blocksmith] No matching button found for label "${label}"`,
      );
    }
  }

  /**
   * Utility to build grouped button dropdowns from a Disclosure Menu.
   */
  function buildGroupedButtonDropdowns($menu, buttonCallback) {
    const $groupsWrapper = $(
      '<div class="blocksmith-groups-wrapper flex flex-inline"></div>',
    );
    const $headings = $menu.find("h3.h6");

    $headings.each((idx, heading) => {
      const groupName = $(heading).text().trim();
      const $list = $(heading).next("ul");
      if (!$list.length) return;

      const groupMenuId = `bs-group-${idx}`;
      const disclosureMenuId = $menu.attr("id");

      const $dropdown = $(`
      <div class="blocksmith-group-dropdown">
        <button type="button" class="btn menubtn dashed add icon blocksmith-group-toggle"
          aria-controls="${groupMenuId}-${disclosureMenuId}" aria-expanded="false">${groupName}</button>
        <div id="${groupMenuId}-${disclosureMenuId}" class="menu menu--disclosure" aria-controls="${disclosureMenuId}">
          <ul></ul>
        </div>
      </div>
    `);
      const $dropMenu = $dropdown.find("ul");

      $list.find("button").each((_, btn) => {
        const $btn = $(btn);
        const label = $btn.find(".menu-item-label").text().trim();

        const $li = $(`
        <li>
          <button type="button" class="menu-item">
            <span class="menu-item-label">${label}</span>
          </button>
        </li>
      `);

        buttonCallback(label, $li.find("button"));
        $dropMenu.append($li);
      });

      new Garnish.DisclosureMenu($dropdown.find("button")[0]);
        $groupsWrapper.append($dropdown);

    });

    return $groupsWrapper;
  }

  window.BlocksmithMenuUtils = {
    closeContainingGroupDropdown,
    syncAddBlockState,
    triggerInlineContextButtonClick,
    buildGroupedButtonDropdowns,
  };
})(window);
