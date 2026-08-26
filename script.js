// ─── Config ───────────────────────────────────────────────────────────────────
const WEBHOOK_URL = "https://adir-lead-intake.adirpagelior.workers.dev/submit-lead";

// ─── Lead forms (hero + final CTA share class .lead-form) ─────────────────────
document.querySelectorAll(".lead-form").forEach((leadForm) => {
  leadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors(leadForm);

    const name     = leadForm.querySelector('[name="name"]').value.trim();
    const phone    = leadForm.querySelector('[name="phone"]').value.trim();
    const business = leadForm.querySelector('[name="business"]').value.trim();
    const honeypot = leadForm.querySelector('[name="honeypot"]')?.value || "";

    if (!name)  { showError(leadForm, "name",  "נא להזין שם מלא"); return; }
    if (!phone) { showError(leadForm, "phone", "נא להזין מספר טלפון"); return; }
    if (!isValidPhone(phone)) { showError(leadForm, "phone", "מספר טלפון לא תקין"); return; }
    if (!business) { showError(leadForm, "business", "נא לכתוב מה העסק שלך"); return; }

    setLoading(leadForm, true);

    let result;
    try {
      result = await postToWebhook({
        name,
        phone,
        source: `דף נחיתה יום צילום — העסק: ${business}`,
        honeypot,
      });
    } catch (err) {
      setLoading(leadForm, false);
      showGlobalError(leadForm, "אירעה שגיאה בשליחה. נסה שוב או צור קשר טלפונית.");
      return;
    }

    if (result.status === "error") {
      setLoading(leadForm, false);
      showGlobalError(leadForm, result.message === "too many requests"
        ? "יותר מדי בקשות, נסה שוב בעוד דקה."
        : "בדוק שהפרטים שהוזנו תקינים ונסה שוב.");
      return;
    }

    const panel = leadForm.closest(".panel");
    leadForm.style.display = "none";
    const success = panel ? panel.querySelector(".lead-success, #lead-success") : null;
    if (success) {
      success.style.display = "block";
    } else {
      setLoading(leadForm, false);
      leadForm.style.display = "flex";
      showGlobalError(leadForm, "נשלח! ניצור איתך קשר בקרוב.");
    }
  });
});

// ─── Cookie consent banner ─────────────────────────────────────────────────────
const COOKIE_KEY = "adir_cookie_consent";
const banner = document.getElementById("cookie-banner");

function getConsent() {
  try { return localStorage.getItem(COOKIE_KEY); } catch (e) { return null; }
}
function setConsent(value) {
  try { localStorage.setItem(COOKIE_KEY, value); } catch (e) {}
}

if (banner && !getConsent()) {
  banner.classList.add("visible");
}

const acceptBtn = document.getElementById("cookie-accept");
const declineBtn = document.getElementById("cookie-decline");
const settingsLink = document.getElementById("cookie-settings-link");

if (acceptBtn) acceptBtn.addEventListener("click", () => {
  setConsent("all");
  banner.classList.remove("visible");
});
if (declineBtn) declineBtn.addEventListener("click", () => {
  setConsent("essential");
  banner.classList.remove("visible");
});
if (settingsLink) settingsLink.addEventListener("click", (e) => {
  e.preventDefault();
  banner.classList.add("visible");
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function postToWebhook(payload) {
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res.status === 403) return { status: "error", message: "blocked origin" };
  return res.json();
}

function isValidPhone(phone) {
  return /^0[2-9]\d{7,8}$/.test(phone.replace(/[\s-]/g, ""));
}

function setLoading(form, loading) {
  const btn = form.querySelector("button[type='submit']");
  // רק ה-span של הטקסט מתחלף — האייקון נשאר במקומו
  const label = btn.querySelector(".btn-label");
  btn.disabled = loading;
  if (!label) return;
  label.textContent = loading ? "שולח..." : label.dataset.label;
}

function showError(form, fieldName, msg) {
  const input = form.querySelector(`[name="${fieldName}"]`);
  if (!input) return;
  const group = input.closest(".field-group") || input.parentElement;
  const errEl = group.querySelector(".form-error");
  if (errEl) { errEl.textContent = msg; errEl.classList.add("visible"); }
}

function showGlobalError(form, msg) {
  let globalErr = form.querySelector(".form-global-error");
  if (!globalErr) {
    globalErr = document.createElement("p");
    globalErr.className = "form-error form-global-error visible";
    globalErr.style.textAlign = "center";
    form.appendChild(globalErr);
  }
  globalErr.textContent = msg;
  globalErr.classList.add("visible");
}

function clearErrors(form) {
  form.querySelectorAll(".form-error").forEach(el => {
    el.textContent = "";
    el.classList.remove("visible");
  });
}

// שמירת נוסח הכפתור המקורי, כדי להחזיר אותו אחרי מצב טעינה
document.querySelectorAll("button[type='submit'] .btn-label").forEach(label => {
  label.dataset.label = label.textContent.trim();
});


// ─── Sticky mobile CTA — מופיע אחרי טופס ה-Hero, נעלם כשמגיעים לטופס התחתון ──
(function () {
  const bar  = document.getElementById("sticky-cta");
  const hero = document.getElementById("hero-form");
  const lead = document.getElementById("lead");
  if (!bar || !hero || !lead) return;

  let ticking = false;

  function update() {
    ticking = false;
    const vh = window.innerHeight;
    const pastHero = hero.getBoundingClientRect().bottom < 0;      // עברנו את טופס ה-Hero
    const atLead   = lead.getBoundingClientRect().top < vh * 0.85; // הטופס התחתון כבר על המסך
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
