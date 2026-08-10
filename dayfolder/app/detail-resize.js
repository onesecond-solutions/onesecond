(function () {
  "use strict";

  var STORAGE_KEY = "dayfolder-detail-panel-width";
  var HEIGHT_STORAGE_KEY = "dayfolder-preview-height";
  var active = null;
  var heightActive = null;

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

  function finishHeightResize() {
    if (!heightActive) return;
    document.body.classList.remove("dayfolder-preview-resizing");
    localStorage.setItem(HEIGHT_STORAGE_KEY, String(Math.round(heightActive.height)));
    heightActive = null;
    document.removeEventListener("pointermove", resizeHeight);
    document.removeEventListener("pointerup", finishHeightResize);
    document.removeEventListener("pointercancel", finishHeightResize);
  }

  function resizeHeight(event) {
    if (!heightActive) return;
    var requested = heightActive.startHeight + (event.clientY - heightActive.startY);
    heightActive.height = Math.min(1200, Math.max(heightActive.minimum, requested));
    heightActive.preview.style.setProperty("--dayfolder-preview-height", Math.round(heightActive.height) + "px");
  }

  function beginHeightResize(event, preview, media) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    var minimum = Number(preview.dataset.dayfolderPreviewMinimum) || Math.round(media.getBoundingClientRect().height);
    var height = Math.round(media.getBoundingClientRect().height);
    heightActive = {
      preview: preview,
      startY: event.clientY,
      startHeight: height,
      height: height,
      minimum: minimum
    };
    document.body.classList.add("dayfolder-preview-resizing");
    document.addEventListener("pointermove", resizeHeight);
    document.addEventListener("pointerup", finishHeightResize);
    document.addEventListener("pointercancel", finishHeightResize);
  }

  function ensureHeightHandle() {
    if (window.innerWidth <= 840) return;
    var preview = document.querySelector(".detail-panel .file-preview");
    if (!preview) return;
    var media = preview.querySelector(":scope > iframe, :scope > img");
    if (!media) return;

    if (!preview.dataset.dayfolderPreviewMinimum) {
      var minimum = Math.round(media.getBoundingClientRect().height);
      if (!minimum) return;
      preview.dataset.dayfolderPreviewMinimum = String(minimum);
      var saved = Number(localStorage.getItem(HEIGHT_STORAGE_KEY));
      if (Number.isFinite(saved) && saved > minimum) {
        preview.style.setProperty("--dayfolder-preview-height", Math.min(saved, 1200) + "px");
      }
    }

    if (preview.querySelector(".dayfolder-preview-height-handle")) return;
    var handle = document.createElement("button");
    handle.type = "button";
    handle.className = "dayfolder-preview-height-handle";
    handle.setAttribute("aria-label", "미리보기 높이 조절");
    handle.title = "아래로 끌어 미리보기를 늘립니다";
    handle.addEventListener("pointerdown", function (event) { beginHeightResize(event, preview, media); });
    media.insertAdjacentElement("afterend", handle);
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
    ensureHeightHandle();
  }

  function start() {
    ensureHandle();
    ensureHeightHandle();
    new MutationObserver(function () { ensureHandle(); ensureHeightHandle(); }).observe(document.getElementById("root") || document.body, { childList: true, subtree: true });
    window.addEventListener("resize", function () { ensureHandle(); ensureHeightHandle(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
