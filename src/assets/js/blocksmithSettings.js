// src/assets/js/blocksmithSettings.js

/**
 * Handles click events for copy-to-clipboard badges in Blocksmith settings.
 */
document.addEventListener("click", function (event) {
  const badge = event.target.closest(".blocksmith-badge-copy");
  if (badge) {
    const handleElement = badge.querySelector(".copytextbtn__value");
    const iconElement = badge.querySelector(".blocksmith-copytextbtn__icon");

    if (handleElement && iconElement) {
      navigator.clipboard
        .writeText(handleElement.textContent.trim())
        .then(() => {
          const originalIcon = iconElement.dataset.icon;

          iconElement.dataset.icon = "check";
          iconElement.style.color = "green";

          setTimeout(() => {
            iconElement.dataset.icon = originalIcon;
            iconElement.style.color = "";
          }, 2000);

          Craft.cp.displayNotice(Craft.t("blocksmith", "Copied to clipboard."));
        })
        .catch((error) => {
          Craft.cp.displayError(
            Craft.t("blocksmith", "Failed to copy. Please try again."),
          );
          console.error("Clipboard copy failed:", error);
        });
    }
  }
});

(function ($) {
  Garnish.$doc.ready(function () {
    const $pickerBtn = $("#previewImage-picker");
    const $pathInput = $("#previewImagePath");
    const $previewContainer = $(".blocksmith-preview-image img");
    const $removeBtn = $("#previewImage-delete");

    if ($pickerBtn.length && $pathInput.length) {
      $pickerBtn.on("click", function () {
        Craft.createElementSelectorModal("craft\\elements\\Asset", {
          criteria: { kind: "image" },
          multiSelect: false,
          onSelect: function (assets) {
            if (!assets.length) return;

            const asset = assets[0];
            const url = asset.url ?? "";
            $pathInput.val(url);

            if ($previewContainer.length) {
              $previewContainer.attr("src", url);
            }

            if ($removeBtn.length) {
              $removeBtn.removeClass("hidden").show();
            }
          },
        });
      });
    }

    if ($removeBtn.length) {
      $removeBtn.on("click", function () {
        const placeholderUrl = $("#previewImagePreview").data("placeholder");
        $pathInput.val("");
        if ($previewContainer.length) {
          $previewContainer.attr("src", placeholderUrl);
        }
        $(this).hide();
      });
    }
  });
})(jQuery);

function dismissNotice() {
  const notice = document.getElementById("blocksmith-preview-image-notice");
  notice.style.display = "none";

  fetch(Craft.getActionUrl("blocksmith/dismiss-notice"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": Craft.csrfTokenValue,
    },
  }).catch((error) => {
    console.error("Failed to dismiss notice:", error);
  });
}
