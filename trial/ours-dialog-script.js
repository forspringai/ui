(() => {
  if (typeof HTMLDialogElement !== "function") return;
  document.addEventListener("click", (e) => {
    const t = e.target instanceof Element ? e.target.closest("[data-dialog-open]") : null;
    if (!t || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const d = document.getElementById(t.getAttribute("data-dialog-open"));
    if (!(d instanceof HTMLDialogElement) || d.open) return;
    e.preventDefault();
    d.addEventListener("close", () => {
      d.querySelectorAll("form").forEach((f) => f.reset());
      t.focus();
    }, { once: true });
    d.showModal();
  });
})();