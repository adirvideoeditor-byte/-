// ===================================================================
// אדיר צאנה - דף עבודות והמלצות
// כדי להחליף סרטון: לערוך את שתי הרשימות כאן למטה. שום דבר אחר לא צריך לגעת.
// ===================================================================

// ─── סרטונים לדוגמה ───────────────────────────────────────────────
// file  = שם הקובץ בתיקיית media (בלי סיומת). צריך להיות שם:
//         file.mp4 (הסרטון המלא), file_loop.mp4 (לופ שקט של 6 שניות), file.jpg (תמונה)
// row   = באיזו שורה בקיר הסרטון מופיע (0 או 1)
const WORKS = [
  { file: "marco-tender",       name: "מרקו",            kind: "רילס מתוך הרצאה",  row: 0 },
  { file: "beit-alcohol",       name: "בית האלכוהול",    kind: "מודעה ממומנת",     row: 0 },
  { file: "adir-eda",           name: "אדיר צאנה",       kind: "רילס אורגני",      row: 0 },
  { file: "biro",               name: "בירו",            kind: "קטע סטנדאפ",       row: 0 },
  { file: "marco-testimonials", name: "מרקו",            kind: "סרטון המלצות",     row: 0 },
  { file: "adir-ad",            name: "יום צילום",       kind: "מודעה ממומנת",     row: 1 },
  { file: "geula",              name: "גאולה הדראי",     kind: "רילס אורגני",      row: 1 },
  { file: "bts",                name: "מאחורי הקלעים",   kind: "סדרה לאינסטגרם",   row: 1 },
  { file: "marco-qa",           name: "מרקו",            kind: "שאלות ותשובות",    row: 1 },
  { file: "adir-organic",       name: "אדיר צאנה",       kind: "רילס אורגני",      row: 1 },
];

// ─── המלצות וידאו (יוטיוב) ────────────────────────────────────────
const TESTIMONIALS = [
  { yt: "zisXCnTTuIY", name: "עידו אלפי" },
  { yt: "PSlmWC5su2I", name: "דוד בר אילן" },
  { yt: "tPPMLNYJPEo", name: "סמית" },
  { yt: "tXWfipS-_YU", name: "קורן צבר" },
  { yt: "i5ruP2Zhjz0", name: "טל גרמאי" },
];

const TICKER = ["מודעות ממומנות", "רילס אורגני", "סרטוני המלצות", "ימי צילום", "הרצאות", "סטנדאפ", "מאחורי הקלעים"];

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

// ─── פס טקסט רץ ───────────────────────────────────────────────────
(function buildTicker() {
  const track = document.getElementById("ticker");
  if (!track) return;
  // פעמיים ברצף - כדי שהלולאה תהיה חלקה
  for (let pass = 0; pass < 2; pass++) {
    for (let rep = 0; rep < 2; rep++) {
      TICKER.forEach((word) => track.appendChild(el("span", "", word)));
    }
  }
})();

// ─── קיר הסרטונים ─────────────────────────────────────────────────
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
    }, { rootMargin: "120px" })
  : null;

function workCard(work, isClone) {
  const card = el("button", "work");
  card.type = "button";
  card.setAttribute("aria-label", `ניגון: ${work.name}, ${work.kind}`);
  if (isClone) { card.tabIndex = -1; card.setAttribute("aria-hidden", "true"); }

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

  card.appendChild(playBadge());
  const meta = el("span", "work__meta");
  meta.appendChild(el("span", "work__name", work.name));
  meta.appendChild(el("span", "work__kind", work.kind));
  card.appendChild(meta);

  card.addEventListener("click", () => openLightbox({
    kind: "file", src: `${MEDIA}${work.file}.mp4`, poster: `${MEDIA}${work.file}.jpg`,
    caption: `${work.name} · ${work.kind}`, opener: card,
  }));
  return card;
}

(function buildWall() {
  document.querySelectorAll(".wall__track").forEach((track) => {
    const row = Number(track.dataset.row);
    const items = WORKS.filter((w) => w.row === row);
    items.forEach((w) => track.appendChild(workCard(w, false)));
    // עותק שני של השורה - בשביל לולאה אינסופית (בלי תנועה אין בו צורך)
    if (!reduceMotion) items.forEach((w) => track.appendChild(workCard(w, true)));
  });
})();

// ─── מניפת ההמלצות ────────────────────────────────────────────────
(function buildFan() {
  const fan = document.getElementById("fan");
  if (!fan) return;
  TESTIMONIALS.forEach((t) => {
    const card = el("button", "tcard");
    card.type = "button";
    card.setAttribute("aria-label", `ניגון המלצה: ${t.name}`);

    const img = el("img");
    img.src = `https://i.ytimg.com/vi/${t.yt}/oardefault.jpg`;
    img.alt = "";
    img.loading = "lazy";
    // אם אין תמונה אנכית - נופלים לתמונה הרגילה של יוטיוב
    img.addEventListener("error", () => { img.src = `https://i.ytimg.com/vi/${t.yt}/hqdefault.jpg`; }, { once: true });
    card.appendChild(img);

    card.appendChild(el("span", "tcard__tag", "המלצה"));
    card.appendChild(playBadge());
    card.appendChild(el("span", "tcard__name", t.name));

    card.addEventListener("click", () => openLightbox({
      kind: "yt", id: t.yt, caption: `${t.name} · המלצה`, opener: card,
    }));
    fan.appendChild(card);
  });
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
  lbStage.replaceChildren(); // עוצר את הניגון
  if (lbOpener) lbOpener.focus();
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
  }, { threshold: 0.15 });
  nodes.forEach((n) => io.observe(n));
})();

// ─── ענן החלקיקים במסך הפתיחה ─────────────────────────────────────
(function particles() {
  const canvas = document.getElementById("particles");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  const hero = canvas.parentElement;

  // כחול > סגול > ורוד, כמו גרדיאנט המותג
  const STOPS = [[76, 141, 255], [168, 85, 247], [255, 92, 170]];
  function colorAt(t) {
    const seg = t < 0.5 ? 0 : 1;
    const k = t < 0.5 ? t * 2 : (t - 0.5) * 2;
    const a = STOPS[seg], b = STOPS[seg + 1];
    return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * k));
  }

  let w = 0, h = 0, dpr = 1, dots = [], running = false, raf = 0;
  const pointer = { x: -9999, y: -9999 };

  function gauss() { // התפלגות פעמון בקירוב
    return (Math.random() + Math.random() + Math.random() + Math.random() - 2) / 2;
  }

  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = hero.clientWidth; h = hero.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const mobile = w < 760;
    const count = mobile ? 700 : Math.min(2600, Math.round(w * 1.9));
    const spread = mobile ? Math.max(w, h) * 0.55 : Math.max(w * 0.36, h * 0.62);
    dots = [];
    for (let i = 0; i < count; i++) {
      const gx = gauss(), gy = gauss();
      const dist = Math.min(1, Math.hypot(gx, gy) * 1.3);
      const rgb = colorAt(Math.min(1, Math.max(0, 0.5 + gx * 0.9 + (Math.random() - 0.5) * 0.3)));
      dots.push({
        ox: gx * spread, oy: gy * spread,              // מיקום ביחס למרכז הענן
        r: (mobile ? 1 : 1.3) + Math.random() * 2.6 * (1 - dist * 0.5),
        a: (mobile ? 0.5 : 0.95) * (0.4 + Math.random() * 0.6) * (1 - dist * 0.45),
        ph: Math.random() * Math.PI * 2,
        sp: 0.25 + Math.random() * 0.6,
        amp: 6 + Math.random() * 16,
        px: 0, py: 0,                                  // דחיפה מהעכבר
        fill: `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`,
      });
    }
  }

  function frame(ms) {
    const t = ms / 1000;
    const mobile = w < 760;
    // בדסקטופ הענן יושב בצד שמאל (הטקסט בימין), בנייד מאחורי הכל
    const cx = mobile ? w * 0.5 : w * 0.27;
    const cy = mobile ? h * 0.36 : h * 0.5;
    const rot = t * 0.035, cos = Math.cos(rot), sin = Math.sin(rot);

    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      let x = cx + d.ox * cos - d.oy * sin + Math.cos(t * d.sp + d.ph) * d.amp;
      let y = cy + d.ox * sin + d.oy * cos + Math.sin(t * d.sp * 1.3 + d.ph) * d.amp;

      const dx = x - pointer.x, dy = y - pointer.y;
      const dist2 = dx * dx + dy * dy;
      if (dist2 < 19600) { // 140px
        const dist = Math.sqrt(dist2) || 1;
        const force = (1 - dist / 140) * 3.2;
        d.px += (dx / dist) * force; d.py += (dy / dist) * force;
      }
      d.px *= 0.92; d.py *= 0.92;
      x += d.px; y += d.py;

      ctx.globalAlpha = d.a * (0.7 + 0.3 * Math.sin(t * 1.4 + d.ph));
      ctx.fillStyle = d.fill;
      ctx.beginPath();
      ctx.arc(x, y, d.r, 0, 6.2832);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (running) raf = requestAnimationFrame(frame);
  }

  function start() { if (!running && !reduceMotion) { running = true; raf = requestAnimationFrame(frame); } }
  function stop() { running = false; cancelAnimationFrame(raf); }

  build();
  if (reduceMotion) { frame(0); return; }

  hero.addEventListener("pointermove", (e) => {
    const box = canvas.getBoundingClientRect();
    pointer.x = e.clientX - box.left; pointer.y = e.clientY - box.top;
  });
  hero.addEventListener("pointerleave", () => { pointer.x = pointer.y = -9999; });

  let resizeTimer = 0, lastW = w;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      // בנייד סרגל הכתובת משנה את הגובה בגלילה - לא בונים מחדש בגלל זה
      if (hero.clientWidth !== lastW) { lastW = hero.clientWidth; build(); }
    }, 180);
  });

  // לא מציירים כשמסך הפתיחה לא נראה או כשהלשונית ברקע
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop())).observe(hero);
  } else {
    start();
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else if (hero.getBoundingClientRect().bottom > 0) start();
  });
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
