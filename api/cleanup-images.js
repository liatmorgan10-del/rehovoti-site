import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const auth = req.headers["authorization"] || "";
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const results = { imagesRemovedFromOldEvents: 0, orphanedFilesDeleted: 0, errors: [] };

  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // 1) Strip images from approved events whose date is more than a week old.
    const { data: oldEvents, error: oldErr } = await supabase
      .from("events")
      .select("id, image_url")
      .lt("date", weekAgo)
      .not("image_url", "is", null);
    if (oldErr) throw oldErr;

    for (const ev of oldEvents || []) {
      const fileName = ev.image_url.split("/event-images/")[1];
      if (fileName) {
        await supabase.storage.from("event-images").remove([fileName]);
      }
      await supabase.from("events").update({ image_url: null }).eq("id", ev.id);
      results.imagesRemovedFromOldEvents++;
    }

    // 2) Delete storage files not referenced by any event or business.
    const { data: files, error: filesErr } = await supabase.storage.from("event-images").list("", { limit: 1000 });
    if (filesErr) throw filesErr;

    const { data: allEvents } = await supabase.from("events").select("image_url").not("image_url", "is", null);
    const { data: allBusinesses } = await supabase.from("businesses").select("image_url").not("image_url", "is", null);
    const usedNames = new Set(
      [...(allEvents || []), ...(allBusinesses || [])].map((row) => row.image_url.split("/event-images/")[1])
    );

    for (const file of files || []) {
      if (file.name === ".emptyFolderPlaceholder") continue;
      if (!usedNames.has(file.name)) {
        await supabase.storage.from("event-images").remove([file.name]);
        results.orphanedFilesDeleted++;
      }
    }

    res.status(200).json({ ok: true, ...results });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
