// Accessibility toolbar — Israeli accessibility regulations (IS 5568 / WCAG 2.0 AA)
// Self-contained: injects its own markup + styles, shared across all site pages.
(function () {
  "use strict";

  var STORAGE_KEY = "adir_a11y_prefs";
  var FONT_STEPS = [1, 1.125, 1.25, 1.4];

  function loadPrefs() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { fontStep: 0, contrast: false, underline: false };
      var parsed = JSON.parse(raw);
      return {
        fontStep: typeof parsed.fontStep === "number" ? parsed.fontStep : 0,
        contrast: !!parsed.contrast,
        underline: !!parsed.underline,
      };
    } catch (e) {
      return { fontStep: 0, contrast: false, underline: false };
    }
  }

  function savePrefs(prefs) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch (e) {}
  }

  function applyPrefs(prefs) {
    document.documentElement.style.setProperty("--a11y-font-scale", FONT_STEPS[prefs.fontStep]);
    document.documentElement.classList.toggle("a11y-contrast", prefs.contrast);
    document.documentElement.classList.toggle("a11y-underline-links", prefs.underline);
  }

  var style = document.createElement("style");
  style.textContent = [
    "html { font-size: calc(16px * var(--a11y-font-scale, 1)); }",
    ":root { --a11y-bottom-offset: 16px; }",
    ".a11y-toggle {",
    "  position: fixed; left: 14px; bottom: var(--a11y-bottom-offset, 16px);",
    "  z-index: 9999; width: 46px; height: 46px; border-radius: 50%;",
    "  display: flex; align-items: center; justify-content: center;",
    "  background: var(--surface, #23223a); color: var(--ink, #f4f2fb);",
    "  border: 1.5px solid var(--hairline, rgba(180,170,220,.35));",
    "  box-shadow: 0 8px 24px -8px rgba(0,0,0,.55);",
    "  cursor: pointer; padding: 0; transition: bottom .2s ease;",
    "}",
    ".a11y-icon { font-size: 26px; font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24; }",
    ".a11y-panel {",
    "  position: fixed; left: 14px; bottom: calc(var(--a11y-bottom-offset, 16px) + 58px);",
    "  z-index: 9999; width: min(280px, calc(100vw - 44px));",
    "  max-height: min(60vh, 520px); overflow-y: auto;",
    "  transition: bottom .2s ease;",
    "  background: var(--surface, #23223a); color: var(--ink, #f4f2fb);",
    "  border: 1px solid var(--hairline, rgba(180,170,220,.35));",
    "  border-radius: 16px; padding: 18px; box-shadow: 0 20px 50px -20px rgba(0,0,0,.7);",
    "  font-family: 'Assistant', system-ui, sans-serif; font-size: 15px; line-height: 1.5;",
    "  display: none;",
    "}",
    ".a11y-panel.a11y-open { display: block; }",
    ".a11y-panel h2 { margin: 0 0 12px; font-size: 16px; font-weight: 700; }",
    ".a11y-row { display: flex; gap: 8px; margin-bottom: 10px; }",
    ".a11y-row button, .a11y-toggle-btn {",
    "  flex: 1; padding: 9px 8px; border-radius: 10px; border: 1px solid var(--hairline, rgba(180,170,220,.35));",
    "  background: var(--surface-2, #2f2e4a); color: inherit; cursor: pointer; font-size: 13.5px; font-weight: 600;",
    "}",
    ".a11y-toggle-btn { width: 100%; margin-bottom: 10px; text-align: right; }",
    ".a11y-toggle-btn[aria-pressed='true'] { outline: 2px solid var(--pink-soft, #e6a9e0); outline-offset: -2px; }",
    ".a11y-reset { width: 100%; padding: 9px 8px; border-radius: 10px; border: 1px solid var(--hairline, rgba(180,170,220,.35)); background: transparent; color: inherit; cursor: pointer; font-size: 13.5px; margin-top: 4px; }",
    ".a11y-statement { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--hairline, rgba(180,170,220,.35)); font-size: 12.5px; opacity: .8; }",
    ".a11y-close { position: absolute; top: 10px; left: 12px; background: none; border: none; color: inherit; font-size: 18px; cursor: pointer; line-height: 1; padding: 4px; }",
    "html.a11y-contrast { filter: contrast(1.25) saturate(1.1); }",
    "html.a11y-contrast body { background: #000 !important; }",
    "html.a11y-underline-links a { text-decoration: underline !important; }",
    "@media (max-width: 480px) {",
    "  .a11y-panel { left: 8px; width: calc(100vw - 84px); }",
    "  .a11y-toggle { left: 8px; }",
    "}",
  ].join("\n");
  document.head.appendChild(style);

  var toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "a11y-toggle";
  toggle.setAttribute("aria-label", "פתיחת תפריט נגישות");
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", "a11y-panel");
  toggle.innerHTML = '<span class="material-symbols-outlined a11y-icon" aria-hidden="true">accessibility_new</span>';

  var panel = document.createElement("div");
  panel.id = "a11y-panel";
  panel.className = "a11y-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "הגדרות נגישות");

  panel.innerHTML =
    '<button type="button" class="a11y-close" aria-label="סגירת תפריט נגישות">✕</button>' +
    '<h2>נגישות</h2>' +
    '<div class="a11y-row">' +
    '<button type="button" data-action="font-dec" aria-label="הקטן טקסט">א-</button>' +
    '<button type="button" data-action="font-reset" aria-label="איפוס גודל טקסט">איפוס</button>' +
    '<button type="button" data-action="font-inc" aria-label="הגדל טקסט">א+</button>' +
    '</div>' +
    '<button type="button" class="a11y-toggle-btn" data-action="contrast" aria-pressed="false">ניגודיות גבוהה</button>' +
    '<button type="button" class="a11y-toggle-btn" data-action="underline" aria-pressed="false">הדגשת קישורים</button>' +
    '<button type="button" class="a11y-reset" data-action="reset-all">איפוס כל ההגדרות</button>' +
    '<p class="a11y-statement">אתר זה שואף לעמוד בתקן הישראלי (ת"י 5568) להנגשת אתרי אינטרנט. לפניות בנושא נגישות ניתן ליצור קשר דרך פרטי הקשר באתר.</p>';

  document.body.appendChild(toggle);
  document.body.appendChild(panel);

  var prefs = loadPrefs();
  applyPrefs(prefs);
  syncButtons();

  function syncButtons() {
    var contrastBtn = panel.querySelector('[data-action="contrast"]');
    var underlineBtn = panel.querySelector('[data-action="underline"]');
    contrastBtn.setAttribute("aria-pressed", String(prefs.contrast));
    underlineBtn.setAttribute("aria-pressed", String(prefs.underline));
  }

  function openPanel() {
    panel.classList.add("a11y-open");
    toggle.setAttribute("aria-expanded", "true");
    panel.querySelector(".a11y-close").focus();
    document.addEventListener("keydown", onKeydown);
  }

  function closePanel() {
    panel.classList.remove("a11y-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.focus();
    document.removeEventListener("keydown", onKeydown);
  }

  function onKeydown(e) {
    if (e.key === "Escape") closePanel();
  }

  toggle.addEventListener("click", function () {
    if (panel.classList.contains("a11y-open")) closePanel(); else openPanel();
  });

  panel.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-action]");
    if (!btn) {
      if (e.target.classList.contains("a11y-close")) closePanel();
      return;
    }
    var action = btn.dataset.action;
    if (action === "font-inc") prefs.fontStep = Math.min(prefs.fontStep + 1, FONT_STEPS.length - 1);
    else if (action === "font-dec") prefs.fontStep = Math.max(prefs.fontStep - 1, 0);
    else if (action === "font-reset") prefs.fontStep = 0;
    else if (action === "contrast") prefs.contrast = !prefs.contrast;
    else if (action === "underline") prefs.underline = !prefs.underline;
    else if (action === "reset-all") prefs = { fontStep: 0, contrast: false, underline: false };

    applyPrefs(prefs);
    savePrefs(prefs);
    syncButtons();

    if (action === "close") closePanel();
  });

  document.addEventListener("click", function (e) {
    if (!panel.classList.contains("a11y-open")) return;
    if (panel.contains(e.target) || toggle.contains(e.target)) return;
    closePanel();
  });

  // Keep the toggle/panel clear of the cookie banner, whatever its rendered height is.
  var banner = document.getElementById("cookie-banner");
  if (banner && "ResizeObserver" in window) {
    var updateOffset = function () {
      var height = banner.classList.contains("visible") ? banner.getBoundingClientRect().height : 0;
      document.documentElement.style.setProperty("--a11y-bottom-offset", (height ? height + 16 : 16) + "px");
    };
    new ResizeObserver(updateOffset).observe(banner);
    new MutationObserver(updateOffset).observe(banner, { attributes: true, attributeFilter: ["class"] });
    updateOffset();
  }
})();
