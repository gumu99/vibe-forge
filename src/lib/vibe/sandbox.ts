export type AssetStatus = "pending" | "ready" | "error";

export type ImageAsset = {
  slot: string;
  aspect: string;
  prompt: string;
  status: AssetStatus;
  dataUrl?: string;
  error?: string;
};

const SHIM =
  "<scr" +
  "ipt>" +
  `
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
` +
  "</scr" +
  "ipt>";

const PLACEHOLDER_TOKEN = /__VIBE_IMG_([a-z0-9-]+)__/gi;

function placeholderSvg(label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9"><rect width="16" height="9" fill="#1b1d22"/><rect x="0" y="0" width="16" height="9" fill="url(#g)" opacity="0.5"/><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#23262c"/><stop offset="1" stop-color="#14161a"/></linearGradient></defs><title>${label}</title></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Swaps __VIBE_IMG_slot__ tokens for generated data URLs (or a neutral placeholder). */
export function applyAssets(code: string, assets: ImageAsset[] = []): string {
  if (!code) return code;
  const bySlot = new Map(assets.map((asset) => [asset.slot, asset]));
  return code.replace(PLACEHOLDER_TOKEN, (_match, slot: string) => {
    const asset = bySlot.get(slot.toLowerCase());
    return asset?.dataUrl ?? placeholderSvg(slot);
  });
}

/** Injects a sandbox-safe storage shim and error reporter into generated documents. */
export function buildSrcDoc(code: string, assets: ImageAsset[] = []): string {
  if (!code.trim()) return "";
  const withAssets = applyAssets(code, assets);
  if (/<head[^>]*>/i.test(withAssets)) {
    return withAssets.replace(/<head[^>]*>/i, (match) => `${match}\n${SHIM}`);
  }
  return `${SHIM}\n${withAssets}`;
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

export function downloadDataUrl(filename: string, dataUrl: string) {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function slugify(value: string, fallback = "vibe-app"): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}
