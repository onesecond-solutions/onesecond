(function () {
  "use strict";

  var STORAGE_KEY = "dayfolder-detail-panel-width";
  var active = null;

  function storedWidth() {
    var value = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  function maximumWidth(workspace, minimum) {
    var sidebar = workspace.querySelector(".sidebar");
    var sidebarWidth = workspace.classList.contains("sidebar-collapsed") ? 0 : (sidebar ? sidebar.getBoundingClientRect().width : 0);
    return Math.max(minimum, workspace.getBoundingClientRect().width - sidebarWidth - 520);
  }

  function finishResize() {
    if (!active) return;
    active.workspace.classList.remove("dayfolder-detail-resizing");
    localStorage.setItem(STORAGE_KEY, String(Math.round(active.width)));
    active = null;
    document.removeEventListener("pointermove", resize);
    document.removeEventListener("pointerup", finishResize);
    document.removeEventListener("pointercancel", finishResize);
  }

  function resize(event) {
    if (!active) return;
    var requested = active.startWidth + (active.startX - event.clientX);
    active.width = Math.min(active.maximum, Math.max(active.minimum, requested));
    active.workspace.style.setProperty("--dayfolder-detail-width", Math.round(active.width) + "px");
  }

  function beginResize(event, workspace, panel) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    var minimum = Number(workspace.dataset.dayfolderDetailMinimum) || Math.round(panel.getBoundingClientRect().width);
    var width = Math.round(panel.getBoundingClientRect().width);
    active = {
      workspace: workspace,
      startX: event.clientX,
      startWidth: width,
      width: width,
      minimum: minimum,
      maximum: maximumWidth(workspace, minimum)
    };
    workspace.classList.add("dayfolder-detail-resizing");
    document.addEventListener("pointermove", resize);
    document.addEventListener("pointerup", finishResize);
    document.addEventListener("pointercancel", finishResize);
  }

  function ensureHandle() {
    if (window.innerWidth <= 840) return;
    var workspace = document.querySelector(".workspace.detail-open");
    var panel = workspace && workspace.querySelector(":scope > .detail-panel");
    if (!workspace || !panel) return;

    if (!workspace.dataset.dayfolderDetailMinimum) {
      var minimum = Math.round(panel.getBoundingClientRect().width);
      if (!minimum) return;
      workspace.dataset.dayfolderDetailMinimum = String(minimum);
      var saved = storedWidth();
      if (saved > minimum) {
        workspace.style.setProperty("--dayfolder-detail-width", Math.min(saved, maximumWidth(workspace, minimum)) + "px");
      } else {
        workspace.style.setProperty("--dayfolder-detail-width", minimum + "px");
      }
    }

    if (panel.querySelector(".dayfolder-detail-resize-handle")) return;
    var handle = document.createElement("button");
    handle.type = "button";
    handle.className = "dayfolder-detail-resize-handle";
    handle.setAttribute("aria-label", "미리보기 너비 조절");
    handle.title = "왼쪽으로 끌어 미리보기를 넓힙니다";
    handle.addEventListener("pointerdown", function (event) { beginResize(event, workspace, panel); });
    panel.prepend(handle);
  }

  function start() {
    ensureHandle();
    new MutationObserver(ensureHandle).observe(document.getElementById("root") || document.body, { childList: true, subtree: true });
    window.addEventListener("resize", ensureHandle);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
