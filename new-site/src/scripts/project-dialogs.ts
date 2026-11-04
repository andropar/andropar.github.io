// "More" buttons on Selected work tiles open a project's <dialog>. Escape closes it natively; the
// close button and a click on the backdrop close it too.

document
  .querySelectorAll<HTMLButtonElement>("button[data-dialog]")
  .forEach((button) => {
    const dialog = document.getElementById(
      button.dataset.dialog!,
    ) as HTMLDialogElement | null;
    if (!dialog) return;
    button.addEventListener("click", () => {
      dialog.showModal();
      // Graphics draw in when they scroll into view; a dialog's graphic is already in view.
      dialog
        .querySelectorAll(".graphic")
        .forEach((graphic) => graphic.classList.add("is-visible"));
    });
  });

document
  .querySelectorAll<HTMLDialogElement>("dialog.project-dialog")
  .forEach((dialog) => {
    dialog
      .querySelector(".project-dialog-close")
      ?.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  });
