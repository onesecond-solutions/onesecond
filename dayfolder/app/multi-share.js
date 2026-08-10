(function () {
  "use strict";
  var ITEMS_KEY = "date-archive-items-v1";
  var selected = new Set();
  var modal;
  var list;
  var status;
  var sendButton;

  function loadFiles() {
    var items = [];
    try { items = JSON.parse(localStorage.getItem(ITEMS_KEY) || "[]"); } catch (_error) {}
    var files = [];
    items.forEach(function (item) {
      if (item.kind === "file") {
        files.push({ id: item.id, name: item.fileName || item.title || "파일", type: item.fileType || "application/octet-stream", size: item.fileSize || 0, date: item.date || "" });
      }
      (item.attachments || []).forEach(function (attachment) {
        files.push({ id: attachment.id, name: attachment.fileName || attachment.name || "첨부파일", type: attachment.fileType || attachment.type || "application/octet-stream", size: attachment.fileSize || attachment.size || 0, date: item.date || "" });
      });
    });
    return files;
  }

  function formatSize(bytes) {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  }

  function openDatabase() {
    return new Promise(function (resolve, reject) {
      var request = indexedDB.open("date-archive", 1);
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error); };
    });
  }

  async function getBlob(id) {
    if (window.dayfolderStorage && typeof window.dayfolderStorage.getFile === "function") {
      var stored = await window.dayfolderStorage.getFile(id);
      return stored ? new Blob([stored.bytes], { type: stored.type }) : null;
    }
    var db = await openDatabase();
    return new Promise(function (resolve, reject) {
      var request = db.transaction("files").objectStore("files").get(id);
      request.onsuccess = function () { db.close(); resolve(request.result || null); };
      request.onerror = function () { db.close(); reject(request.error); };
    });
  }

  function updateCount() {
    status.textContent = selected.size ? selected.size + "개 선택" : "파일을 선택해 주세요.";
    sendButton.disabled = selected.size === 0;
  }

  function renderList() {
    var files = loadFiles();
    selected.clear();
    list.innerHTML = "";
    if (!files.length) {
      list.innerHTML = '<div class="dayfolder-multi-share-empty">전송할 파일이 없습니다.</div>';
      updateCount();
      return;
    }
    files.forEach(function (file) {
      var row = document.createElement("label");
      row.className = "dayfolder-multi-share-item";
      row.innerHTML = '<input type="checkbox"><span><strong></strong><small></small></span><em></em>';
      row.querySelector("strong").textContent = file.name;
      row.querySelector("small").textContent = [file.date, formatSize(file.size)].filter(Boolean).join(" · ");
      row.querySelector("em").textContent = (file.type.split("/").pop() || "FILE").toUpperCase().slice(0, 8);
      row.querySelector("input").addEventListener("change", function (event) {
        if (event.target.checked) selected.add(file.id); else selected.delete(file.id);
        updateCount();
      });
      row.dataset.fileId = file.id;
      list.appendChild(row);
    });
    updateCount();
  }

  async function shareSelected() {
    var filesMeta = loadFiles().filter(function (file) { return selected.has(file.id); });
    if (!filesMeta.length) return;
    sendButton.disabled = true;
    status.textContent = "파일을 준비하는 중입니다…";
    try {
      var files = [];
      for (var i = 0; i < filesMeta.length; i += 1) {
        var blob = await getBlob(filesMeta[i].id);
        if (blob) files.push(new File([blob], filesMeta[i].name, { type: filesMeta[i].type || blob.type, lastModified: Date.now() }));
      }
      if (!files.length) throw new Error("선택한 파일 원본을 찾지 못했습니다.");
      var shareData = { files: files, title: "데이폴더 파일", text: files.length + "개 파일을 보냅니다." };
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: files }))) {
        await navigator.share(shareData);
        status.textContent = "공유창에서 카카오톡을 선택해 주세요.";
        return;
      }
      files.forEach(function (file, index) {
        setTimeout(function () {
          var link = document.createElement("a");
          link.href = URL.createObjectURL(file);
          link.download = file.name;
          link.click();
          setTimeout(function () { URL.revokeObjectURL(link.href); }, 3000);
        }, index * 250);
      });
      status.textContent = "PC에서는 내려받은 파일을 카카오톡에 첨부해 주세요.";
    } catch (error) {
      if (error && error.name === "AbortError") status.textContent = "전송을 취소했습니다.";
      else status.textContent = error.message || "파일 전송을 시작하지 못했습니다.";
    } finally {
      sendButton.disabled = selected.size === 0;
    }
  }

  function createModal() {
    modal = document.createElement("div");
    modal.className = "dayfolder-multi-share-backdrop";
    modal.hidden = true;
    modal.innerHTML = '<section class="dayfolder-multi-share-panel" aria-label="여러 파일 보내기">' +
      '<div class="dayfolder-multi-share-heading"><h2>여러 파일 보내기</h2><button type="button" data-close>×</button></div>' +
      '<div class="dayfolder-multi-share-tools"><span>보낼 파일을 여러 개 선택하세요.</span><button type="button" data-all>전체 선택</button></div>' +
      '<div class="dayfolder-multi-share-list"></div>' +
      '<div class="dayfolder-multi-share-actions"><span class="dayfolder-multi-share-status"></span><button type="button" data-cancel>취소</button><button type="button" class="primary" data-send>카톡 전송</button></div>' +
      '</section>';
    document.body.appendChild(modal);
    list = modal.querySelector(".dayfolder-multi-share-list");
    status = modal.querySelector(".dayfolder-multi-share-status");
    sendButton = modal.querySelector("[data-send]");
    function close() { modal.hidden = true; }
    modal.querySelector("[data-close]").onclick = close;
    modal.querySelector("[data-cancel]").onclick = close;
    modal.querySelector("[data-all]").onclick = function () {
      var boxes = Array.from(list.querySelectorAll('input[type="checkbox"]'));
      var check = boxes.some(function (box) { return !box.checked; });
      boxes.forEach(function (box) { box.checked = check; box.dispatchEvent(new Event("change")); });
    };
    sendButton.onclick = shareSelected;
    modal.addEventListener("click", function (event) { if (event.target === modal) close(); });
  }

  function ensureOpenButton() {
    if (document.querySelector(".dayfolder-multi-share-open")) return;
    var host = document.querySelector(".backup-actions");
    if (!host) return;
    var button = document.createElement("button");
    button.type = "button";
    button.className = "dayfolder-multi-share-open";
    button.textContent = "파일 선택";
    button.onclick = function () { renderList(); modal.hidden = false; };
    host.prepend(button);
  }

  function start() {
    createModal();
    ensureOpenButton();
    new MutationObserver(ensureOpenButton).observe(document.getElementById("root") || document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
