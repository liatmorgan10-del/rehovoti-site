import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const BUCKET = "event-images";

  // 1. ניקוי הפניות לתמונות של אירועים שעבר שבוע מאז התאריך שלהם.
  // הקבצים עצמם לא נמחקים כאן - רק בשלב 2, ורק אם אף אירוע אחר לא משתמש בהם (אירועים חוזרים חולקים תמונה).
  const cutoff = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const { error: clearErr } = await supabase
    .from("events")
    .update({ image_url: null })
    .lt("date", cutoff)
    .not("image_url", "is", null);
  if (clearErr) return res.status(500).json({ error: clearErr.message });

  // 2. מחיקת קבצים שאף אירוע או עסק לא מפנה אליהם
  const referenced = new Set();
  for (const table of ["events", "businesses"]) {
    let from = 0;
    for (;;) {
      const { data, error } = await supabase.from(table).select("image_url").not("image_url", "is", null).range(from, from + 999);
      if (error) return res.status(500).json({ error: error.message });
      data.forEach((r) => {
        const name = decodeURIComponent(String(r.image_url).split("/").pop().split("?")[0]);
        referenced.add(name);
      });
      if (data.length < 1000) break;
      from += 1000;
    }
  }
  const toDelete = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase.storage.from(BUCKET).list("", { limit: 1000, offset });
    if (error) return res.status(500).json({ error: error.message });
    data.forEach((f) => {
      if (f.name !== ".emptyFolderPlaceholder" && !referenced.has(f.name)) toDelete.push(f.name);
    });
    if (data.length < 1000) break;
    offset += 1000;
  }
  if (toDelete.length) {
    const { error } = await supabase.storage.from(BUCKET).remove(toDelete);
    if (error) return res.status(500).json({ error: error.message });
  }
  return res.status(200).json({ deleted: toDelete.length });
}
