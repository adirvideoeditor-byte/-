// ===================================================================
// אדיר צאנה - דף עבודות והמלצות
// כדי להחליף סרטון: לערוך את שתי הרשימות כאן למטה. שום דבר אחר לא צריך לגעת.
// ===================================================================

// ─── סרטונים שנעשו ללקוחות ────────────────────────────────────────
// רק עבודות ללקוחות. סרטונים של אדיר עצמו (אינסטגרם, מאחורי הקלעים) לא נכנסים לכאן.
// file  = שם הקובץ בתיקיית media (בלי סיומת). צריך להיות שם:
//         file.mp4 (הסרטון המלא), file_loop.mp4 (לופ שקט של 6 שניות), file.jpg (תמונה)
// type  = הסוג לסינון: "ממומן" / "אורגני" / "המלצות" / "במה"
// wide  = true לסרטון רוחבי (16:9) - הנגן נפתח לרוחב
const WORKS = [
  { file: "david-bar-ilan",     name: "דוד בר אילן",   kind: "סרטון מקמפיין",     type: "ממומן" },
  { file: "gal-israeli",        name: "גל ישראלי",     kind: "5 דברים על אקנה",   type: "אורגני" },
  { file: "dj-avi-singer",      name: "דיג'יי אבי צקול", kind: "הזמר הכי מקפיץ ברחבה", type: "אורגני" },
  { file: "marco-tender",       name: "מרקו",          kind: "רילס מתוך הרצאה",   type: "במה" },
  { file: "beit-alcohol",       name: "בית האלכוהול",  kind: "מודעה",             type: "ממומן" },
  { file: "moshe-kaplan",       name: "משה קפלן",      kind: "מלאך ושטן",         type: "אורגני" },
  { file: "dj-avi-sound",       name: "דיג'יי אבי צקול", kind: "בדיקת סאונד לפני חתונה", type: "אורגני" },
  { file: "tamir-damari",       name: "תמיר דמרי",     kind: "המלצות מהסדנה",     type: "המלצות", wide: true },
  { file: "biro",               name: "בירו",          kind: "קטע סטנדאפ",        type: "במה" },
  { file: "ofer-zilberg",       name: "אופר זילברג",   kind: "רילס",              type: "אורגני" },
  { file: "dj-avi-moments",     name: "דיג'יי אבי צקול", kind: "הרגעים שבשבילם אני דיג'יי", type: "אורגני" },
  { file: "geula",              name: "גאולה הדראי",   kind: "רילס",              type: "אורגני" },
  { file: "marco-testimonials", name: "מרקו",          kind: "סרטון המלצות",      type: "המלצות" },
  { file: "dj-avi-early",       name: "דיג'יי אבי צקול", kind: "למה דיג'יי מגיע מוקדם", type: "אורגני" },
  { file: "marco-qa",           name: "מרקו",          kind: "שאלות ותשובות",     type: "אורגני" },
];

const TYPE_LABELS = { "ממומן": "מודעות", "אורגני": "רילס אורגני", "המלצות": "סרטוני המלצות", "במה": "הרצאות ובמה" };

// ─── המלצות וידאו (יוטיוב) ────────────────────────────────────────
const TESTIMONIALS = [
  { yt: "zisXCnTTuIY", name: "עידו אלפי" },
  { yt: "PSlmWC5su2I", name: "דוד בר אילן" },
  { yt: "tPPMLNYJPEo", name: "סמית" },
  { yt: "tXWfipS-_YU", name: "קורן צבר" },
  { yt: "i5ruP2Zhjz0", name: "טל גרמאי" },
];

// ─── וואטסאפ ──────────────────────────────────────────────────────
// הדף נשלח ללידים שכבר בשיחה, אז הכפתור בסוף מחזיר אותם לוואטסאפ.
// למלא מספר בפורמט בינלאומי בלי פלוס ובלי אפס מוביל, למשל "972501234567".
// כל עוד המספר ריק - מוצג טופס השארת הפרטים במקומו.
const WHATSAPP = "";
const WHATSAPP_TEXT = "היי אדיר, ראיתי את העבודות וההמלצות. בוא נדבר";

const LEAD_URL = "/api/lead";
const MEDIA = "media/";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ─── עזרים ────────────────────────────────────────────────────────
function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text) node.textContent = text;
  return node;
}

function iconEl(id) {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "icon");
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS(NS, "use");
  use.setAttribute("href", "#" + id);
  svg.appendChild(use);
  return svg;
}

function playBadge() {
  const badge = el("span", "play");
  badge.appendChild(iconEl("i-play"));
  return badge;
}

// ─── מסך פתיחה: עמודות הפריימים ברקע ─────────────────────────────
(function buildReel() {
  const reel = document.getElementById("reel");
  if (!reel) return;
  const COLS = 3;
  for (let c = 0; c < COLS; c++) {
    const col = el("div", "reel__col");
    const track = el("div", "reel__track");
    const items = WORKS.filter((_, i) => i % COLS === c);
    // פעמיים ברצף - כדי שהגלילה תהיה לולאה חלקה
    for (let pass = 0; pass < 2; pass++) {
      items.forEach((w) => {
        const img = el("img");
        img.src = `${MEDIA}${w.file}.jpg`;
        img.alt = "";
        img.decoding = "async";
        track.appendChild(img);
      });
    }
    col.appendChild(track);
    reel.appendChild(col);
  }
})();

// ─── מסך פתיחה: קוד זמן רץ בעינית ────────────────────────────────
(function timecode() {
  const node = document.getElementById("timecode");
  if (!node || reduceMotion) return;
  const FPS = 25;
  const pad = (n) => String(n).padStart(2, "0");
  const start = performance.now();
  let timer = 0;

  function tick() {
    const frames = Math.floor(((performance.now() - start) / 1000) * FPS);
    const s = Math.floor(frames / FPS);
    node.textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}:${pad(frames % FPS)}`;
  }
  function run() { if (!timer) timer = setInterval(tick, 1000 / FPS); }
  function halt() { clearInterval(timer); timer = 0; }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => (entry.isIntersecting ? run() : halt())).observe(node);
  } else {
    run();
  }
  document.addEventListener("visibilitychange", () => (document.hidden ? halt() : run()));
})();

// ─── רשת העבודות ──────────────────────────────────────────────────
const loopObserver = "IntersectionObserver" in window
  ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (entry.isIntersecting) {
          if (!video.src) video.src = video.dataset.src; // נטען רק כשהכרטיס נכנס למסך
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      });
    }, { rootMargin: "100px" })
  : null;

function workCard(work) {
  const card = el("button", "work");
  card.type = "button";
  card.dataset.type = work.type;
  card.setAttribute("aria-label", `ניגון: ${work.name}, ${work.kind}`);

  if (reduceMotion || !loopObserver) {
    const img = el("img");
    img.src = `${MEDIA}${work.file}.jpg`;
    img.alt = "";
    img.loading = "lazy";
    card.appendChild(img);
  } else {
    const video = el("video");
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "none";
    video.poster = `${MEDIA}${work.file}.jpg`;
    video.dataset.src = `${MEDIA}${work.file}_loop.mp4`;
    video.setAttribute("aria-hidden", "true");
    card.appendChild(video);
    loopObserver.observe(video);
  }

  card.appendChild(el("span", "work__tag", TYPE_LABELS[work.type] || work.type));
  card.appendChild(playBadge());
  const meta = el("span", "work__meta");
  meta.appendChild(el("span", "work__name", work.name));
  meta.appendChild(el("span", "work__kind", work.kind));
  card.appendChild(meta);

  card.addEventListener("click", () => openLightbox({
    kind: "file", src: `${MEDIA}${work.file}.mp4`, poster: `${MEDIA}${work.file}.jpg`,
    caption: `${work.name} · ${work.kind}`, opener: card, wide: Boolean(work.wide),
  }));
  return card;
}

(function buildGrid() {
  const grid = document.getElementById("grid");
  const chips = document.getElementById("chips");
  if (!grid) return;
  const cards = WORKS.map((w) => grid.appendChild(workCard(w)));
  if (!chips) return;

  const types = Object.keys(TYPE_LABELS).filter((t) => WORKS.some((w) => w.type === t));
  const options = [{ type: "", label: "הכל", count: WORKS.length }]
    .concat(types.map((t) => ({ type: t, label: TYPE_LABELS[t], count: WORKS.filter((w) => w.type === t).length })));

  options.forEach((opt, i) => {
    const chip = el("button", "chip", opt.label);
    chip.type = "button";
    chip.setAttribute("aria-pressed", i === 0 ? "true" : "false");
    chip.appendChild(el("span", "", String(opt.count)));
    chip.addEventListener("click", () => {
      chips.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
      cards.forEach((card) => { card.hidden = Boolean(opt.type) && card.dataset.type !== opt.type; });
    });
    chips.appendChild(chip);
  });
})();

// ─── המלצות: רשימת שמות + מסך ────────────────────────────────────
(function buildVoices() {
  const list = document.getElementById("voices-list");
  const stage = document.getElementById("voices-stage");
  const img = document.getElementById("voices-img");
  const nameEl = document.getElementById("voices-name");
  if (!list || !stage || !TESTIMONIALS.length) return;
  let current = -1;
  const rows = [];

  function thumb(t) { return `https://i.ytimg.com/vi/${t.yt}/oardefault.jpg`; }

  function select(i) {
    if (i === current) return;
    current = i;
    const t = TESTIMONIALS[i];
    rows.forEach((row, n) => row.classList.toggle("is-on", n === i));
    nameEl.textContent = t.name;
    stage.setAttribute("aria-label", `ניגון ההמלצה של ${t.name}`);
    img.classList.add("is-swapping");
    const next = new Image();
    const show = (src) => { img.src = src; img.classList.remove("is-swapping"); };
    next.onload = () => { if (current === i) show(next.src); };
    // אם אין תמונה אנכית - נופלים לתמונה הרגילה של יוטיוב
    next.onerror = () => { if (current === i) show(`https://i.ytimg.com/vi/${t.yt}/hqdefault.jpg`); };
    next.src = thumb(t);
  }

  function play(i, opener) {
    const t = TESTIMONIALS[i];
    openLightbox({ kind: "yt", id: t.yt, caption: `${t.name} · המלצה`, opener });
  }

  TESTIMONIALS.forEach((t, i) => {
    const row = el("button", "voice");
    row.type = "button";
    row.setAttribute("aria-label", `ניגון ההמלצה של ${t.name}`);
    row.appendChild(el("span", "voice__num", String(i + 1).padStart(2, "0")));
    row.appendChild(el("span", "voice__name", t.name));
    const go = el("span", "voice__go");
    go.appendChild(iconEl("i-play"));
    row.appendChild(go);
    row.addEventListener("pointerenter", () => select(i));
    row.addEventListener("focus", () => select(i));
    row.addEventListener("click", () => { select(i); play(i, row); });
    rows.push(row);
    list.appendChild(row);
  });

  stage.addEventListener("click", () => play(current, stage));
  select(0);
})();

// ─── נגן מסך מלא ──────────────────────────────────────────────────
const lightbox = document.getElementById("lightbox");
const lbStage = document.getElementById("lb-stage");
const lbCap = document.getElementById("lb-cap");
let lbOpener = null;

function openLightbox(item) {
  lbOpener = item.opener || null;
  lbStage.replaceChildren();
  lbCap.textContent = item.caption || "";
  lightbox.classList.toggle("lb--wide", Boolean(item.wide));

  if (item.kind === "yt") {
    const frame = el("iframe");
    frame.src = `https://www.youtube-nocookie.com/embed/${item.id}?autoplay=1&rel=0&playsinline=1`;
    frame.title = item.caption || "המלצה";
    frame.allow = "autoplay; encrypted-media; picture-in-picture";
    frame.allowFullscreen = true;
    lbStage.appendChild(frame);
  } else {
    const video = el("video");
    video.src = item.src;
    video.poster = item.poster;
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    lbStage.appendChild(video);
  }

  if (typeof lightbox.showModal === "function") lightbox.showModal();
  else lightbox.setAttribute("open", "");
}

function closeLightbox() {
  if (lightbox.open && typeof lightbox.close === "function") lightbox.close();
  else lightbox.removeAttribute("open");
}

lightbox.addEventListener("close", () => {
  if (lightbox.open) return; // כבר נפתח סרטון אחר בינתיים
  lbStage.replaceChildren(); // עוצר את הניגון
  if (lbOpener) lbOpener.focus({ preventScroll: true });
});
document.getElementById("lb-close").addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (e) => { if (e.target === lightbox) closeLightbox(); });

// ─── הופעה בגלילה ─────────────────────────────────────────────────
(function reveal() {
  const nodes = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    nodes.forEach((n) => n.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add("in"); io.unobserve(entry.target); }
    });
  }, { threshold: 0.12 });
  nodes.forEach((n) => io.observe(n));
})();

// ─── כפתור וואטסאפ במקום הטופס ────────────────────────────────────
(function whatsapp() {
  if (!/^\d{10,15}$/.test(WHATSAPP)) return;
  const box = document.getElementById("wa-box");
  const link = document.getElementById("wa-link");
  const form = document.getElementById("lead-form");
  if (!box || !link) return;
  link.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(WHATSAPP_TEXT)}`;
  box.hidden = false;
  if (form) form.hidden = true;
})();

// ─── טופס יצירת קשר ───────────────────────────────────────────────
(function leadForm() {
  const form = document.getElementById("lead-form");
  const done = document.getElementById("lead-done");
  if (!form) return;
  const button = form.querySelector("button[type='submit']");
  const label = form.querySelector(".btn__label");
  const labelText = label.textContent;
  const globalErr = form.querySelector(".err--global");

  function fieldError(name, msg) {
    const input = form.querySelector(`[name="${name}"]`);
    const err = input.closest(".field").querySelector(".err");
    err.textContent = msg; err.classList.add("on");
    input.focus();
  }
  function clearErrors() {
    form.querySelectorAll(".err").forEach((e) => { e.textContent = ""; e.classList.remove("on"); });
  }
  function setLoading(on) {
    button.disabled = on;
    label.textContent = on ? "שולח..." : labelText;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();

    const name = form.elements.name.value.trim();
    const phone = form.elements.phone.value.trim();
    const business = form.elements.business.value.trim();

    if (!name) return fieldError("name", "נא להזין שם מלא");
    if (!phone) return fieldError("phone", "נא להזין מספר טלפון");
    if (!/^0[2-9]\d{7,8}$/.test(phone.replace(/[\s-]/g, ""))) return fieldError("phone", "מספר הטלפון לא תקין");
    if (!business) return fieldError("business", "נא לכתוב מה העסק שלך");

    setLoading(true);
    try {
      const res = await fetch(LEAD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, phone,
          source: `דף עבודות והמלצות - העסק: ${business}`,
          honeypot: form.elements.honeypot.value,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.status === "error") throw new Error(data.message || "failed");
    } catch (err) {
      setLoading(false);
      globalErr.textContent = "השליחה לא הצליחה. נסה שוב בעוד רגע.";
      globalErr.classList.add("on");
      return;
    }

    form.hidden = true;
    done.hidden = false;
  });
})();
