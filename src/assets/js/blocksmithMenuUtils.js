// src/assets/js/blocksmithMenuUtils.js

(function (window) {
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

      const $disclosureMenu = $button.closest(".menu--disclosure");
      if ($disclosureMenu.length) {
        const menuId = $disclosureMenu.attr("id");
        const $toggleButton = $(
          `.blocksmith-group-toggle[aria-controls="${menuId}"]`,
        );
        $toggleButton.attr("aria-expanded", "false");
        $disclosureMenu.hide();
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
    console.log("buildGroupedButtonDropdowns $menu: ", $menu);
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
    syncAddBlockState,
    triggerInlineContextButtonClick,
    buildGroupedButtonDropdowns,
  };
})(window);
