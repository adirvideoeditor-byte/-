# Worker לקבלת לידים - Adir Tzana

Worker על Cloudflare שמקבל POST מדף הנחיתה (המתארח ב-Vercel), מאמת ומנקה קלט, בודק כפילויות, ושומר ב-Airtable. הטוקן של Airtable נשמר כ-secret בצד השרת בלבד ולא חשוף ללקוח.

## דרישות מקדימות

* חשבון Cloudflare (חינמי מספיק)
* Node.js מותקן
* חשבון Airtable עם Base וטבלה מוכנים

## שלב 1: התקנת wrangler והתחברות

```bash
npm install -g wrangler
wrangler login
```

חלון דפדפן ייפתח לאימות מול Cloudflare.

## שלב 2: יצירת KV Namespace

```bash
cd worker
wrangler kv namespace create RATE_LIMIT_KV
```

הפקודה תחזיר משהו כמו:

```
[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "abcd1234..."
```

העתק את ה-`id` לתוך `wrangler.toml` במקום `REPLACE_WITH_KV_NAMESPACE_ID`.

## שלב 3: הגדרת ה-secrets (בפרודקשן, בענן של Cloudflare)

כל secret מוזן אינטראקטיבית (הערך לא נשמר בקוד ולא ב-git):

```bash
wrangler secret put AIRTABLE_TOKEN
wrangler secret put AIRTABLE_BASE_ID
wrangler secret put AIRTABLE_TABLE_NAME
wrangler secret put ALLOWED_ORIGIN
```

לכל פקודה, wrangler ישאל "Enter a secret value" - הדבק את הערך המתאים ולחץ Enter.
לגבי הערכים עצמם (מה זה AIRTABLE_TOKEN, איפה מוצאים BASE_ID וכו') - ראה את הסבר ה"מדריך מפתחות" שנשלח בנפרד בשיחה.

## שלב 4: פריסה לפרודקשן

```bash
wrangler deploy
```

בסיום תקבל URL קבוע בסגנון:

```
https://adir-lead-intake.<your-subdomain>.workers.dev/submit-lead
```

זה הכתובת שדף הנחיתה שולח אליה את הבקשות.

## שלב 5: עדכון secret קיים

אם צריך להחליף ערך (למשל סיבבת טוקן ב-Airtable):

```bash
wrangler secret put AIRTABLE_TOKEN
```

זה ידרוס את הערך הקודם.

## פיתוח מקומי (אופציונלי)

אם בכל זאת תרצה להריץ מקומית לבדיקה:

```bash
cp .dev.vars.example .dev.vars
# מלא ערכים אמיתיים ב-.dev.vars (קובץ זה לא נכנס ל-git)
wrangler dev
```

## דוגמת fetch מהצד של דף הנחיתה

```html
<form id="lead-form">
  <input type="text" name="name" required />
  <input type="tel" name="phone" required />
  <input type="email" name="email" />
  <!-- honeypot: שדה מוסתר שרק בוטים ימלאו -->
  <input type="text" name="honeypot" style="position:absolute;left:-9999px" tabindex="-1" autocomplete="off" />
  <button type="submit">שליחה</button>
</form>

<script>
document.getElementById('lead-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const payload = {
    name: form.name.value,
    phone: form.phone.value,
    email: form.email.value || undefined,
    source: 'facebook-campaign',
    honeypot: form.honeypot.value, // חייב להישאר ריק אצל משתמש אמיתי
  };

  try {
    const res = await fetch('https://adir-lead-intake.<your-subdomain>.workers.dev/submit-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.status === 'ok') {
      // הצלחה - הפנה לתודה / הצג הודעה
    } else if (data.status === 'duplicate') {
      // כבר קיים - הצג הודעה מתאימה בלי להטעות
    } else {
      // שגיאת ואלידציה
      console.error(data.message);
    }
  } catch (err) {
    console.error('network error', err);
  }
});
</script>
```

## איך לבדוק שהכל עובד לפני השקת הקמפיין

הרץ מהטרמינל (או מ-Postman) מול ה-URL שקיבלת אחרי `wrangler deploy`. חשוב: כל בקשה חייבת לכלול header `Origin` שתואם בדיוק ל-`ALLOWED_ORIGIN` שהגדרת, אחרת תקבל 403.

**1. ליד תקין (אמור להחזיר `{"status":"ok"}` ב-200, ולהופיע רשומה חדשה ב-Airtable):**

```bash
curl -X POST https://adir-lead-intake.<your-subdomain>.workers.dev/submit-lead \
  -H "Content-Type: application/json" \
  -H "Origin: https://example.com" \
  -d '{"name":"ישראל ישראלי","phone":"0501234567","email":"test@example.com","source":"test","honeypot":""}'
```

**2. טלפון לא תקין (אמור להחזיר 400 ו-`{"status":"error","message":"invalid phone"}`):**

```bash
curl -X POST https://adir-lead-intake.<your-subdomain>.workers.dev/submit-lead \
  -H "Content-Type: application/json" \
  -H "Origin: https://example.com" \
  -d '{"name":"ישראל ישראלי","phone":"123","honeypot":""}'
```

**3. ליד כפול - הרץ שוב את בדיקה 1 בתוך 24 שעות (אמור להחזיר `{"status":"duplicate"}` ב-200, ובלי רשומה כפולה ב-Airtable):**

```bash
curl -X POST https://adir-lead-intake.<your-subdomain>.workers.dev/submit-lead \
  -H "Content-Type: application/json" \
  -H "Origin: https://example.com" \
  -d '{"name":"ישראל ישראלי","phone":"0501234567","email":"test@example.com","source":"test","honeypot":""}'
```

בדיקות נוספות מומלצות לפני השקה:
* Origin שגוי (`-H "Origin: https://evil.com"`) → אמור להחזיר 403.
* honeypot לא ריק (`"honeypot":"spam"`) → אמור להחזיר `{"status":"ok"}` בלי ליצור רשומה ב-Airtable.
* 6 בקשות רצופות תוך דקה מאותו IP → הבקשה השישית אמורה להחזיר 429.
* בדוק ב-Cloudflare Dashboard → Workers → Logs שההודעות ב-`console.log` מופיעות כמצופה על בקשות שנכשלו.
