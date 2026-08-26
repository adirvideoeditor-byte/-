// ─── Config ───────────────────────────────────────────────────────────────────
// נתיב יחסי בכוונה: הפונקציה יושבת על אותו דומיין כמו הדף, ולכן אין preflight
// ואין שום תרחיש של חסימת CORS. זה מה שהפיל את ה-Worker שישב על דומיין נפרד.
const WEBHOOK_URL = "/api/lead";
const DRAFT_KEY = "adir_lead_draft";

// ─── Lead forms (hero + final CTA share class .lead-form) ─────────────────────
document.querySelectorAll(".lead-form").forEach(setupLeadForm);

function setupLeadForm(form) {
  restoreDraft(form);

  // מנקה שגיאה ברגע שהמשתמש מתקן, כדי שלא יישאר אדום אחרי שכבר תוקן
  form.querySelectorAll("input[name]").forEach((input) => {
    input.addEventListener("input", () => {
      if (input.getAttribute("aria-invalid") === "true") clearFieldError(form, input.name);
      saveDraft(form);
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    submitLead(form);
  });
}

async function submitLead(form) {
  if (form.dataset.sending === "1") return; // מונע שליחה כפולה
  clearErrors(form);

  const values = readValues(form);
  const problem = validate(values);
  if (problem) {
    showError(form, problem.field, problem.message);
    const input = form.querySelector(`[name="${problem.field}"]`);
    if (input) input.focus();
    return;
  }

  // שמירה מפורשת לפני השליחה: מילוי אוטומטי לא תמיד יורה אירוע input,
  // וטיוטה חסרה הופכת כישלון שליחה לאובדן כל ההקלדה.
  saveDraft(form);

  form.dataset.sending = "1";
  setLoading(form, true);

  const payload = {
    name: values.name,
    phone: values.phone,
    source: `דף נחיתה יום צילום — העסק: ${values.business}`,
    honeypot: values.honeypot,
  };

  // ניסיון אחד, ואם נפל על רשת/שרת — ניסיון שני אוטומטי לפני שמציגים שגיאה
  let result = await postLead(payload);
  if (result.retryable) {
    await wait(1200);
    result = await postLead(payload);
  }

  form.dataset.sending = "0";

  if (result.ok) {
    clearDraft();
    showSuccess(form);
    onLeadSuccess(payload); // ← אירוע ה-Lead של הפיקסלים, רק אחרי אישור מהשרת
    return;
  }

  setLoading(form, false);
  showSendFailure(form, result.message, function () {
    submitLead(form);
  });
}

// מחזיר {ok:true} בהצלחה, או {ok:false, message, retryable}
async function postLead(payload) {
  let res;
  try {
    res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // רשת מנותקת, CORS חסום, או הבקשה בוטלה — שווה לנסות שוב
    return { ok: false, retryable: true, message: "השליחה נכשלה. בדוק את החיבור לאינטרנט ונסה שוב." };
  }

  if (res.status === 404) {
    // קורה כשמריצים את הדף כקובץ סטטי בלי סביבת Vercel — הפונקציה לא קיימת שם
    return { ok: false, retryable: false, message: "שירות השליחה אינו זמין כרגע. אפשר לפנות אליי ישירות בטלפון." };
  }
  if (res.status === 403) {
    return { ok: false, retryable: false, message: "השליחה נחסמה. אפשר לפנות אליי ישירות בטלפון." };
  }
  if (res.status === 429) {
    return { ok: false, retryable: false, message: "יותר מדי בקשות. נסה שוב בעוד דקה." };
  }
  if (res.status >= 500) {
    return { ok: false, retryable: true, message: "השרת לא זמין כרגע. נסה שוב." };
  }

  let body;
  try {
    body = await res.json();
  } catch (err) {
    return { ok: false, retryable: true, message: "השליחה נכשלה, נסה שוב." };
  }

  if (body.status === "ok" || body.status === "duplicate") return { ok: true };
  if (body.message === "too many requests") {
    return { ok: false, retryable: false, message: "יותר מדי בקשות. נסה שוב בעוד דקה." };
  }
  return { ok: false, retryable: false, message: "בדוק שהפרטים שהוזנו תקינים ונסה שוב." };
}

// נקודת החיבור לפיקסלים. בכוונה נקראת רק אחרי תשובה מוצלחת מה-Worker,
// כדי שלא יידווחו המרות על לידים שמעולם לא הגיעו בפועל.
function onLeadSuccess(payload) {
  /* PIXEL-LEAD-EVENT */
}

// ─── Validation ───────────────────────────────────────────────────────────────
function readValues(form) {
  function get(n) {
    const el = form.querySelector(`[name="${n}"]`);
    return el ? el.value.trim() : "";
  }
  const hp = form.querySelector('[name="honeypot"]');
  return {
    name: get("name"),
    phone: get("phone"),
    business: get("business"),
    honeypot: hp ? hp.value : "",
  };
}

// משאיר ספרות בלבד, ומתרגם קידומת בינלאומית לצורה מקומית
function normalizePhone(raw) {
  let digits = raw.replace(/[\s\-().]/g, "");
  if (digits.indexOf("+972") === 0) digits = "0" + digits.slice(4);
  else if (digits.indexOf("972") === 0) digits = "0" + digits.slice(3);
  return digits;
}

// נייד 05x / VoIP 07x (10 ספרות), או קווי 0[2,3,4,8,9] (9 ספרות)
const PHONE_RE = /^0(?:5\d{8}|7\d{8}|[2-489]\d{7})$/;

function validate(v) {
  if (!v.name) return { field: "name", message: "נא להזין שם מלא" };
  if (v.name.length < 2) return { field: "name", message: "השם קצר מדי — נא להזין שם מלא" };
  if (!v.phone) return { field: "phone", message: "נא להזין מספר טלפון" };
  if (!PHONE_RE.test(normalizePhone(v.phone)))
    return { field: "phone", message: "מספר טלפון לא תקין — לדוגמה 050-1234567" };
  if (!v.business) return { field: "business", message: "נא לכתוב בקצרה מה העסק שלך" };
  return null;
}

// ─── Draft — שליחה שנכשלה לא תעלה למבקר את כל ההקלדה מחדש ────────────────────
function saveDraft(form) {
  try {
    const v = readValues(form);
    sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ name: v.name, phone: v.phone, business: v.business })
    );
  } catch (e) {}
}

function restoreDraft(form) {
  let draft = null;
  try {
    draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
  } catch (e) {
    return;
  }
  if (!draft) return;
  ["name", "phone", "business"].forEach(function (k) {
    const input = form.querySelector(`[name="${k}"]`);
    if (input && !input.value && draft[k]) input.value = draft[k];
  });
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch (e) {}
}

// ─── UI state ─────────────────────────────────────────────────────────────────
function setLoading(form, loading) {
  const btn = form.querySelector("button[type='submit']");
  if (!btn) return;
  const label = btn.querySelector(".btn-label");
  btn.disabled = loading;
  btn.setAttribute("aria-busy", loading ? "true" : "false");
  if (label) label.textContent = loading ? "שולח..." : label.dataset.label;
}

function showSuccess(form) {
  const panel = form.closest(".panel");
  form.style.display = "none";
  const success = panel ? panel.querySelector(".lead-success") : null;
  if (!success) return;
  success.style.display = "block";
  success.setAttribute("tabindex", "-1");
  success.focus({ preventScroll: true });
}

function showSendFailure(form, message, onRetry) {
  const box = globalErrorBox(form);
  box.textContent = "";

  const text = document.createElement("span");
  text.textContent = message;
  box.appendChild(text);

  const retry = document.createElement("button");
  retry.type = "button";
  retry.className = "btn-retry";
  retry.textContent = "נסה שוב";
  retry.addEventListener("click", function () {
    box.classList.remove("visible");
    onRetry();
  });
  box.appendChild(retry);

  box.classList.add("visible");
  box.focus({ preventScroll: true });
}

function globalErrorBox(form) {
  let box = form.querySelector(".form-global-error");
  if (!box) {
    box = document.createElement("div");
    box.className = "form-global-error";
    box.setAttribute("role", "alert");
    box.setAttribute("tabindex", "-1");
    form.appendChild(box);
  }
  return box;
}

function showError(form, fieldName, msg) {
  const input = form.querySelector(`[name="${fieldName}"]`);
  if (!input) return;
  const group = input.closest(".field-group") || input.parentElement;
  const errEl = group.querySelector(".form-error");
  if (!errEl) return;
  errEl.textContent = msg;
  errEl.classList.add("visible");
  input.setAttribute("aria-invalid", "true");
  if (errEl.id) input.setAttribute("aria-describedby", errEl.id);
}

function clearFieldError(form, fieldName) {
  const input = form.querySelector(`[name="${fieldName}"]`);
  if (!input) return;
  input.removeAttribute("aria-invalid");
  input.removeAttribute("aria-describedby");
  const group = input.closest(".field-group") || input.parentElement;
  const errEl = group.querySelector(".form-error");
  if (errEl) {
    errEl.textContent = "";
    errEl.classList.remove("visible");
  }
}

function clearErrors(form) {
  form.querySelectorAll(".form-error").forEach(function (el) {
    el.textContent = "";
    el.classList.remove("visible");
  });
  form.querySelectorAll("[aria-invalid]").forEach(function (el) {
    el.removeAttribute("aria-invalid");
    el.removeAttribute("aria-describedby");
  });
  const box = form.querySelector(".form-global-error");
  if (box) box.classList.remove("visible");
}

function wait(ms) {
  return new Promise(function (r) {
    setTimeout(r, ms);
  });
}

// שמירת נוסח הכפתור המקורי, כדי להחזיר אותו אחרי מצב טעינה
document.querySelectorAll("button[type='submit'] .btn-label").forEach(function (label) {
  label.dataset.label = label.textContent.trim();
});

// ─── Cookie consent banner ─────────────────────────────────────────────────────
const COOKIE_KEY = "adir_cookie_consent";
const banner = document.getElementById("cookie-banner");

function getConsent() {
  try {
    return localStorage.getItem(COOKIE_KEY);
  } catch (e) {
    return null;
  }
}
function setConsent(value) {
  try {
    localStorage.setItem(COOKIE_KEY, value);
  } catch (e) {}
}

// הבאנר יושב fixed בתחתית המסך, ולכן חייב לפנות לעצמו מקום —
// אחרת הוא מכסה את תחתית הטופס ואי אפשר להגיע לשדות.
// הערך משמש גם ל-padding של ה-body וגם למיקום הסרגל הדביק.
function syncBannerOffset() {
  const visible = banner && banner.classList.contains("visible");
  const h = visible ? Math.ceil(banner.getBoundingClientRect().height) : 0;
  document.documentElement.style.setProperty("--cookie-h", h + "px");
}

function showBanner() {
  if (!banner) return;
  banner.classList.add("visible");
  syncBannerOffset();
}
function hideBanner() {
  if (!banner) return;
  banner.classList.remove("visible");
  syncBannerOffset();
}

if (banner && !getConsent()) showBanner();
window.addEventListener("resize", syncBannerOffset, { passive: true });

const acceptBtn = document.getElementById("cookie-accept");
const declineBtn = document.getElementById("cookie-decline");
const settingsLink = document.getElementById("cookie-settings-link");

if (acceptBtn)
  acceptBtn.addEventListener("click", function () {
    setConsent("all");
    hideBanner();
  });
if (declineBtn)
  declineBtn.addEventListener("click", function () {
    setConsent("essential");
    hideBanner();
  });
if (settingsLink)
  settingsLink.addEventListener("click", function (e) {
    e.preventDefault();
    showBanner();
  });

// ─── Sticky mobile CTA — מופיע אחרי טופס ה-Hero, נעלם כשמגיעים לטופס התחתון ──
(function () {
  const bar = document.getElementById("sticky-cta");
  const hero = document.getElementById("hero-form");
  const lead = document.getElementById("lead");
  if (!bar || !hero || !lead) return;

  let ticking = false;

  function update() {
    ticking = false;
    const vh = window.innerHeight;
    const pastHero = hero.getBoundingClientRect().bottom < 0;
    const atLead = lead.getBoundingClientRect().top < vh * 0.85;
    bar.classList.toggle("visible", pastHero && !atLead);
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  update();
})();
