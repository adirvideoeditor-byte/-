// Vercel Serverless Function: קליטת לידים -> Airtable
// POST /api/lead
//
// הוחלף כאן Cloudflare Worker שישב על דומיין נפרד. הפונקציה הזו רצה על אותו
// דומיין כמו הדף, ולכן הדפדפן לא מבצע preflight ואין שום מצב של חסימת CORS —
// זה היה מקור התקלה היחיד במנגנון הקודם.

const RATE_LIMIT_MAX = 5; // בקשות
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;

const PHONE_RE = /^0[2-9]\d{7,8}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HTML_TAG_RE = /[<>]/;

// שמות השדות תואמים בדיוק לטבלת "Leads" הקיימת (עברית, רגיש לרווחים ולתווים).
const FIELD_NAME = "שם הלקוח / חברה";
const FIELD_PHONE = "מספר טלפון";
const FIELD_NOTES = "הערות / סיכום שיחה";

// ── זיכרון מקומי לאינסטנס ─────────────────────────────────────────────────────
// ל-Worker היה Cloudflare KV משותף. ב-Vercel אין מאגר כזה בלי שירות נוסף,
// אז ההגבלה כאן היא per-instance ומתאפסת כשהאינסטנס נרדם.
// זה עוצר הצפה מיידית וכפילויות של אותו מבקר, אבל אינו הגנה מלאה.
// אם תגיע תנועה עוינת אמיתית — צריך Vercel KV / Upstash.
const hits = new Map();
const seenPhones = new Map();

function sweep(map, now) {
  for (const [k, exp] of map) if (exp <= now) map.delete(k);
}

function rateLimited(ip, now) {
  sweep(hits, now);
  const entry = hits.get(ip);
  if (!entry || entry.exp <= now) {
    hits.set(ip, { count: 1, exp: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT_MAX) return true;
  entry.count += 1;
  return false;
}

function isDuplicate(phone, now) {
  sweep(seenPhones, now);
  if (seenPhones.has(phone)) return true;
  seenPhones.set(phone, now + DEDUP_WINDOW_MS);
  return false;
}

// ── ולידציה ───────────────────────────────────────────────────────────────────
function normalizePhone(raw) {
  let p = String(raw || "").trim().replace(/[\s\-().]/g, "");
  if (p.startsWith("+972")) p = "0" + p.slice(4);
  else if (p.startsWith("972")) p = "0" + p.slice(3);
  return p;
}

function validateLead(body) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const source = typeof body.source === "string" ? body.source.trim().slice(0, 200) : "";

  if (name.length < 2 || name.length > 60) return { error: "invalid name" };
  if (HTML_TAG_RE.test(name)) return { error: "invalid name" };

  const phone = normalizePhone(body.phone);
  if (!PHONE_RE.test(phone)) return { error: "invalid phone" };
  if (email && !EMAIL_RE.test(email)) return { error: "invalid email" };

  return { value: { name, phone, email, source } };
}

// ── Airtable ──────────────────────────────────────────────────────────────────
async function createLead(lead) {
  const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(
    process.env.AIRTABLE_TABLE_NAME
  )}`;
  const notes = [lead.source, lead.email ? `אימייל: ${lead.email}` : null].filter(Boolean);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: {
        [FIELD_NAME]: lead.name,
        [FIELD_PHONE]: lead.phone,
        [FIELD_NOTES]: notes.join(" | "),
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`airtable create failed: ${res.status} ${text}`);
  }
}

function log(ip, reason) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), ip, reason }));
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ status: "error", message: "method not allowed" });
  }

  const ip =
    (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() || "unknown";

  // הפונקציה נועדה לדף הזה בלבד. אם הגיעה כותרת Origin והיא לא המארח שלנו —
  // זו בקשה מאתר אחר. אין preflight כאן, אז הבדיקה זולה ולא שוברת כלום.
  const origin = req.headers.origin;
  if (origin) {
    let originHost = "";
    try {
      originHost = new URL(origin).host;
    } catch (e) {}
    if (originHost && originHost !== req.headers.host) {
      log(ip, "cross-origin request rejected");
      return res.status(403).json({ status: "error", message: "forbidden" });
    }
  }

  const now = Date.now();
  if (rateLimited(ip, now)) {
    log(ip, "rate limit exceeded");
    return res.status(429).json({ status: "error", message: "too many requests" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      log(ip, "invalid json body");
      return res.status(400).json({ status: "error", message: "invalid request body" });
    }
  }
  if (!body || typeof body !== "object") {
    return res.status(400).json({ status: "error", message: "invalid request body" });
  }

  // מלכודת בוטים: שדה מוסתר שרק סקריפט אוטומטי ימלא.
  // מחזירים ok כדי שהבוט לא ילמד שנתפס.
  if (typeof body.honeypot === "string" && body.honeypot.trim() !== "") {
    log(ip, "honeypot triggered");
    return res.status(200).json({ status: "ok" });
  }

  const { value: lead, error } = validateLead(body);
  if (error) {
    log(ip, `validation: ${error}`);
    return res.status(400).json({ status: "error", message: error });
  }

  if (!process.env.AIRTABLE_TOKEN || !process.env.AIRTABLE_BASE_ID || !process.env.AIRTABLE_TABLE_NAME) {
    log(ip, "missing airtable env vars");
    return res.status(500).json({ status: "error", message: "server not configured" });
  }

  try {
    if (isDuplicate(lead.phone, now)) {
      log(ip, "duplicate phone");
      return res.status(200).json({ status: "duplicate" });
    }
    await createLead(lead);
    log(ip, "lead saved");
    return res.status(200).json({ status: "ok" });
  } catch (err) {
    log(ip, `airtable error: ${err.message}`);
    return res.status(502).json({ status: "error", message: "could not save lead" });
  }
}
