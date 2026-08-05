const SHIM = `<script>
(function () {
  try { window.localStorage.getItem("__probe__"); } catch (error) {
    var store = {};
    var memory = {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; },
      clear: function () { store = {}; },
      key: function (i) { return Object.keys(store)[i] || null; },
      get length() { return Object.keys(store).length; }
    };
    try { Object.defineProperty(window, "localStorage", { value: memory, configurable: true }); } catch (e) {}
  }
  window.addEventListener("error", function (event) {
    parent.postMessage({ __vibe: "runtime-error", message: String(event.message) }, "*");
  });
})();
<\/script>`;

/** Injects a sandbox-safe storage shim and error reporter into generated documents. */
export function buildSrcDoc(code: string): string {
  if (!code.trim()) return "";
  if (/<head[^>]*>/i.test(code)) {
    return code.replace(/<head[^>]*>/i, (match) => `${match}\n${SHIM}`);
  }
  return `${SHIM}\n${code}`;
}

export function downloadHtml(filename: string, code: string) {
  const blob = new Blob([code], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function slugify(value: string, fallback = "vibe-app"): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}
