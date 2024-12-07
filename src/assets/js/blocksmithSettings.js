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

// document.getElementById('previewImage-picker').addEventListener('click', function () {
//   const assetBrowserConfig = {
//       resizable: true,
//       storageKey: 'blocksmith.previewImage',
//       sources: ['volume:blocksmith'],
//       criteria: {
//           kind: ['image'],
//           status: null
//       },
//       multiSelect: false,
//       onSelect: function (assets) {
//           console.log('Selected assets:', assets);
//           if (assets.length > 0) {
//               const asset = assets[0];
//               const imageField = document.getElementById('previewImageId');
//               const previewImage = document.querySelector('.preview-image img');

//               imageField.value = asset.id;

//               if (previewImage) {
//                   previewImage.src = asset.url;
//               } else {
//                   const container = document.querySelector('.preview-image');
//                   container.innerHTML = `<img src="${asset.url}" alt="Preview Image" style="max-width: 200px; margin-top: 1rem;">`;
//               }
//           }
//       },
//       onCancel: function () {
//           console.log('Asset modal cancelled');
//       }
//   };

//   // Debugging: Log the configuration
//   console.log('Asset Browser Config:', assetBrowserConfig);

//   // Open Craft-Asset-Browser
//   Craft.createElementSelectorModal('craft\\elements\\Asset', assetBrowserConfig);
// });
