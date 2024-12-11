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
          // Save the original icon
          const originalIcon = iconElement.dataset.icon;

          // Change the icon to a checkmark and set its color to green
          iconElement.dataset.icon = "check";
          iconElement.style.color = "green";

          // Restore the original icon after 2 seconds
          setTimeout(() => {
            iconElement.dataset.icon = originalIcon;
            iconElement.style.color = ""; // Farbe zurücksetzen
          }, 2000);

          // Display a native Craft success notification
          Craft.cp.displayNotice(Craft.t("blocksmith", "Copied to clipboard."));
        })
        .catch((error) => {
          // Display a native Craft error notification
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
    $("#previewImage-picker").on("click", function () {
      const assetModal = Craft.createElementSelectorModal(
        "craft\\elements\\Asset",
        {
          sources: null,
          multiSelect: false,
          criteria: { kind: "image" },
          onSelect: function (elements) {
            if (elements.length) {
              const asset = elements[0];
              $("#previewImageId").val(asset.id);

              const previewContainer = $(".blocksmith-preview-image");
              if (!previewContainer.length) {
                $(
                  '<div class="blocksmith-preview-image" style="margin-top: 1rem;"><img style="max-width: 200px;"></div>',
                ).appendTo("#previewImage-field");
              }

              $(".blocksmith-preview-image img").attr("src", asset.url);
            }
          },
        },
      );
    });

    $("#previewImage-delete").on("click", function () {
      $("#previewImageId").val("");
      $(".blocksmith-preview-image").remove();
      $(this).remove();
    });
  });
})(jQuery);



function dismissNotice() {
  const notice = document.getElementById("blocksmith-preview-image-notice");
  notice.style.display = "none";

  // AJAX-Anfrage an Craft senden, um die Einstellung für den Nutzer zu speichern
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
