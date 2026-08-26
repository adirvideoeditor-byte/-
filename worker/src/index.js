// Cloudflare Worker: secure lead intake -> Airtable
// Single endpoint: POST /submit-lead

const RATE_LIMIT_MAX = 5;        // requests
const RATE_LIMIT_WINDOW_S = 60;  // seconds
const DEDUP_WINDOW_S = 24 * 60 * 60; // 24h

const PHONE_RE = /^0[2-9]\d{7,8}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HTML_TAG_RE = /[<>]/;

// ALLOWED_ORIGIN may hold a single origin or a comma-separated list, so one
// Worker can serve more than one landing page.
function isAllowedOrigin(origin, env) {
  if (!origin) return false;
  return String(env.ALLOWED_ORIGIN || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean)
    .includes(origin);
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

function log(env, ip, reason) {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    ip,
    reason,
  }));
}

function normalizePhone(raw) {
  let p = String(raw || "").trim().replace(/[\s-]/g, "");
  if (p.startsWith("+972")) p = "0" + p.slice(4);
  else if (p.startsWith("972")) p = "0" + p.slice(3);
  return p;
}

function validateLead(body) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phoneRaw = typeof body.phone === "string" ? body.phone : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const source = typeof body.source === "string" ? body.source.trim().slice(0, 200) : "";

  if (name.length < 2 || name.length > 60) {
    return { error: "invalid name" };
  }
  if (HTML_TAG_RE.test(name)) {
    return { error: "invalid name" };
  }

  const phone = normalizePhone(phoneRaw);
  if (!PHONE_RE.test(phone)) {
    return { error: "invalid phone" };
  }

  if (email && !EMAIL_RE.test(email)) {
    return { error: "invalid email" };
  }

  return { value: { name, phone, email, source } };
}

async function checkRateLimit(env, ip) {
  const bucket = Math.floor(Date.now() / 1000 / RATE_LIMIT_WINDOW_S);
  const key = `rl:${ip}:${bucket}`;
  const current = parseInt((await env.RATE_LIMIT_KV.get(key)) || "0", 10);
  if (current >= RATE_LIMIT_MAX) {
    return false;
  }
  await env.RATE_LIMIT_KV.put(key, String(current + 1), {
    expirationTtl: RATE_LIMIT_WINDOW_S * 2,
  });
  return true;
}

function airtableHeaders(env) {
  return {
    Authorization: `Bearer ${env.AIRTABLE_TOKEN}`,
    "Content-Type": "application/json",
  };
}

function airtableUrl(env) {
  return `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${encodeURIComponent(env.AIRTABLE_TABLE_NAME)}`;
}

// Field names match the existing "Leads" table exactly (Hebrew, case/spacing-sensitive).
const FIELD_NAME = "שם הלקוח / חברה";
const FIELD_PHONE = "מספר טלפון";
const FIELD_NOTES = "הערות / סיכום שיחה";

// Dedup uses KV rather than an Airtable formula match, since Airtable's Phone
// field type reformats the stored value on write (e.g. "0521234600" ->
// "(052) 123-4600"), which breaks exact-string filterByFormula comparisons.
async function isDuplicate(env, phone) {
  const key = `dedup:${phone}`;
  const existing = await env.RATE_LIMIT_KV.get(key);
  if (existing) return true;
  await env.RATE_LIMIT_KV.put(key, "1", { expirationTtl: DEDUP_WINDOW_S });
  return false;
}

async function createLead(env, lead) {
  const notesParts = [lead.source, lead.email ? `אימייל: ${lead.email}` : null].filter(Boolean);

  const res = await fetch(airtableUrl(env), {
    method: "POST",
    headers: airtableHeaders(env),
    body: JSON.stringify({
      fields: {
        [FIELD_NAME]: lead.name,
        [FIELD_PHONE]: lead.phone,
        [FIELD_NOTES]: notesParts.join(" | "),
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`airtable create failed: ${res.status} ${text}`);
  }
}

async function handleSubmitLead(request, env) {
  const origin = request.headers.get("Origin");
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";

  if (!isAllowedOrigin(origin, env)) {
    log(env, ip, "origin mismatch");
    return new Response(null, { status: 403 });
  }

  const allowed = await checkRateLimit(env, ip);
  if (!allowed) {
    log(env, ip, "rate limit exceeded");
    return jsonResponse({ status: "error", message: "too many requests" }, 429, origin);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    log(env, ip, "invalid json body");
    return jsonResponse({ status: "error", message: "invalid request body" }, 400, origin);
  }

  if (body && typeof body.honeypot === "string" && body.honeypot.trim() !== "") {
    log(env, ip, "honeypot triggered");
    return jsonResponse({ status: "ok" }, 200, origin);
  }

  const { value: lead, error } = validateLead(body || {});
  if (error) {
    log(env, ip, `validation: ${error}`);
    return jsonResponse({ status: "error", message: error }, 400, origin);
  }

  try {
    const duplicate = await isDuplicate(env, lead.phone);
    if (duplicate) {
      log(env, ip, "duplicate phone");
      return jsonResponse({ status: "duplicate" }, 200, origin);
    }

    await createLead(env, lead);
    return jsonResponse({ status: "ok" }, 200, origin);
  } catch (err) {
    log(env, ip, `airtable error: ${err.message}`);
    return jsonResponse({ status: "error", message: "could not save lead" }, 400, origin);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname !== "/submit-lead") {
      return new Response(null, { status: 404 });
    }

    if (request.method === "OPTIONS") {
      const origin = request.headers.get("Origin");
      if (!isAllowedOrigin(origin, env)) {
        return new Response(null, { status: 403 });
      }
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== "POST") {
      return new Response(null, { status: 405 });
    }

    return handleSubmitLead(request, env);
  },
};
