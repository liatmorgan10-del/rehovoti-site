import { useState, useMemo, useEffect } from "react";
import { supabase } from "./supabaseClient";

const PRESENCE_TTL_MS = 60 * 1000;

const COLORS = {
  ink: "#33463A",
  inkLight: "#E3EAD8",
  pageBg: "#EDF1E6",
  paper: "#FFFFFF",
  yellow: "#8FA888",
  coral: "#5C7A5A",
  teal: "#7C9A76",
  accent: "#E08D3C",
};

const CATEGORIES = ["סדנה", "כנס", "אירוע", "מפגש"];
const CATEGORY_ICONS = {
  סדנה: "🎨",
  כנס: "🎤",
  אירוע: "🎉",
  מפגש: "🧑‍🤝‍🧑",
};

const CITIES = [
  "שכונת אבני חן",
  "שכונת אושיות",
  "רחובות ההולנדית",
  "אחוזת הנשיא",
  "רחובות המדע",
  "רחובות הצעירה",
  "קריית משה",
  "מרכז העיר",
  "סלע אפרים",
  "חצרות המושבה",
  "אבן גבירול",
  "קריית ההגנה",
  "שכונת דניה",
  "שכונת קרית דוד",
  "שכונת עין גנים",
  "שכונת גבעתי",
  "שכונת מרמורק",
  "שכונת חבצלת",
  "שכונת מילצ'ן",
  "שכונת שעריים",
  "שכונת נווה יהודה",
  "שכונת גינות סביון",
  "שכונת נווה עמית",
  "שכונת היובל",
  "שכונת רחובות החדשה",
  "שכונת רמת אהרון",
  "שכונת היקב",
  "שכונת מקוב",
  "שכונת רחובות שלי",
  "שכונת שרונה",
];

const SURROUNDING_AREAS = [
  "נס ציונה",
  "יבנה",
  "רמלה",
  "לוד",
  "קריית עקרון",
  "מזכרת בתיה",
  "גבעת ברנר",
  "באר יעקב",
];

const TERMS_SECTIONS = [
  {
    title: "מה זה רחובותי",
    body: "רחובותי הוא לוח אירועים קהילתי לתושבי ופעילי העיר רחובות. כל אחד יכול לפרסם כאן אירוע או פעילות בחינם. האתר משמש כלוח מודעות בלבד - הוא אינו מארגן, מוכר כרטיסים, או אחראי על האירועים עצמם.",
  },
  {
    title: "אחריות המפרסם",
    body: "מי שמפרסם אירוע אחראי באופן מלא לתוכן, לדיוק הפרטים (תאריך, מיקום, מחיר), ולעמידה בכל דין. רחובותי אינו בודק ואינו מאמת את פרטי האירועים המתפרסמים.",
  },
  {
    title: "רכישה והרשמה",
    body: "כל רכישה, תשלום או הרשמה לאירוע מתבצעים ישירות מול המארגן או הספק המפרסם, דרך הקישור שהוא מספק. לרחובותי אין מעורבות בעסקה, ואין הוא אחראי על תהליך התשלום, ביטולים או החזרים.",
  },
  {
    title: "הסרת תוכן",
    body: "רחובותי שומר לעצמו את הזכות להסיר כל פרסום שאינו הולם, מטעה, פוגעני, או שאינו עומד ברוח הקהילתית של האתר, ללא הודעה מוקדמת.",
  },
  {
    title: "פרטיות",
    body: "פרטי קשר שמפרסמים (כמו שם ספק) מוצגים כפי שנמסרו על ידי המפרסם. אין לפרסם פרטים אישיים של צד שלישי ללא הסכמתו.",
  },
];

const DATE_FILTERS = ["הכל", "היום", "השבוע"];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function isWithinDays(dateStr, days) {
  const today = new Date(todayStr() + "T00:00:00");
  const d = new Date(dateStr + "T00:00:00");
  const diff = (d - today) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= days;
}

function getWeekendDates(refDateStr) {
  const ref = new Date(refDateStr + "T00:00:00");
  const day = ref.getDay();
  let daysToFriday = (5 - day + 7) % 7;
  if (day === 6) daysToFriday = -1;
  const friday = new Date(ref);
  friday.setDate(ref.getDate() + daysToFriday);
  const saturday = new Date(friday);
  saturday.setDate(friday.getDate() + 1);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return [fmt(friday), fmt(saturday)];
}
function EventCard({ ev, isAdmin, onDelete }) {
  const dateObj = new Date(ev.date + "T00:00:00");
  const day = dateObj.toLocaleDateString("he-IL", { day: "2-digit" });
  const month = dateObj.toLocaleDateString("he-IL", { month: "short" });
  const weekday = dateObj.toLocaleDateString("he-IL", { weekday: "short" });

  return (
    <div
      className="flex flex-col overflow-hidden rounded-2xl shadow-sm transition-transform hover:-translate-y-0.5"
      style={{ backgroundColor: COLORS.paper, fontFamily: "Rubik, sans-serif" }}
    >
      <div className="relative h-32 w-full flex-shrink-0" style={{ backgroundColor: COLORS.inkLight }}>
        {ev.image_url ? (
          <img
            src={ev.image_url}
            alt={ev.title}
            className="h-full w-full object-cover"
            onError={(e) => {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
            }}
          />
        ) : null}
        <div
          className="absolute inset-0 flex items-center justify-center text-4xl"
          style={{ display: ev.image_url ? "none" : "flex" }}
        >
          {CATEGORY_ICONS[ev.category] || "📌"}
        </div>
        <div
          className="absolute top-2 right-2 flex flex-col items-center rounded-lg px-2 py-1 text-center shadow-sm"
          style={{ backgroundColor: COLORS.paper }}
        >
          <span className="text-xs font-medium" style={{ color: COLORS.ink, opacity: 0.6 }}>
            {weekday}
          </span>
          <span style={{ fontFamily: "Suez One, serif", fontSize: "1.1rem", lineHeight: 1, color: COLORS.ink }}>
            {day}
          </span>
          <span className="text-xs" style={{ color: COLORS.ink, opacity: 0.6 }}>
            {month}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-center gap-1.5">
          <span
            className="rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: COLORS.teal, color: COLORS.paper }}
          >
            {CATEGORY_ICONS[ev.category]} {ev.category}
          </span>
        </div>
        <h3 className="text-base font-semibold leading-snug" style={{ color: COLORS.ink }}>
          {ev.title}
        </h3>
        <p className="text-xs" style={{ color: COLORS.ink, opacity: 0.65 }}>
          📍 {ev.city} · {ev.venue}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span className="text-xs" style={{ color: COLORS.ink, opacity: 0.7 }}>
            {ev.price}
          </span>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => onDelete(ev.id)}
                className="rounded-lg px-2 py-1.5 text-xs font-semibold"
                style={{ backgroundColor: COLORS.ink, color: COLORS.paper }}
              >
                מחיקה
              </button>
            )}
            <a
              href={ev.vendor_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{ backgroundColor: COLORS.accent, color: COLORS.paper }}
            >
              לפרטים ←
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function EventRow({ events, isAdmin, onDelete, emptyText }) {
  if (events.length === 0) {
    return (
      <p className="text-sm" style={{ color: COLORS.ink, opacity: 0.5, fontFamily: "Rubik, sans-serif" }}>
        {emptyText}
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {events.map((ev) => (
        <EventCard key={ev.id} ev={ev} isAdmin={isAdmin} onDelete={onDelete} />
      ))}
    </div>
  );
}export default function App() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("הכל");
  const [city, setCity] = useState("הכל");
  const [dateFilter, setDateFilter] = useState("הכל");
  const [showForm, setShowForm] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewerCount, setViewerCount] = useState(1);
  const [form, setForm] = useState({
    title: "",
    category: CATEGORIES[0],
    city: CITIES[0],
    date: "",
    venue: "",
    price: "",
    vendorName: "",
    vendorUrl: "",
    imageUrl: "",
    agreedToTerms: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase.from("events").select("*").order("date", { ascending: true });
      if (!cancelled) {
        if (error) setSaveError("שגיאה בטעינת האירועים.");
        else setEvents(data || []);
        setLoading(false);
      }
    }
    load();

    const channel = supabase
      .channel("events-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => {
        load();
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const sessionId = Math.random().toString(36).slice(2);
    let cancelled = false;

    async function heartbeat() {
      await supabase.from("presence").upsert({ session_id: sessionId, last_seen: new Date().toISOString() });
      const cutoff = new Date(Date.now() - PRESENCE_TTL_MS).toISOString();
      const { count } = await supabase
        .from("presence")
        .select("*", { count: "exact", head: true })
        .gte("last_seen", cutoff);
      if (!cancelled) setViewerCount(Math.max(1, count || 1));
    }

    heartbeat();
    const interval = setInterval(heartbeat, 20000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);
  const cityBreakdown = useMemo(() => {
    const counts = {};
    events.forEach((ev) => {
      counts[ev.city] = (counts[ev.city] || 0) + 1;
    });
    return [...CITIES, ...SURROUNDING_AREAS]
      .map((c) => ({ city: c, count: counts[c] || 0 }))
      .filter((c) => c.count > 0);
  }, [events]);

  const filtered = useMemo(() => {
    return events
      .filter((ev) => (query ? ev.title.includes(query) || (ev.venue || "").includes(query) : true))
      .filter((ev) => (category === "הכל" ? true : ev.category === category))
      .filter((ev) => (city === "הכל" ? true : ev.city === city))
      .filter((ev) => {
        if (dateFilter === "היום") return ev.date === todayStr();
        if (dateFilter === "השבוע") return isWithinDays(ev.date, 7);
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [events, query, category, city, dateFilter]);

  const todayEvents = useMemo(() => events.filter((ev) => ev.date === todayStr()), [events]);
  const weekendEvents = useMemo(() => {
    const [fri, sat] = getWeekendDates(todayStr());
    return events.filter((ev) => ev.date === fri || ev.date === sat);
  }, [events]);

  async function deleteEvent(id) {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) setSaveError("מחיקה נכשלה, נסו שוב.");
    else setEvents((prev) => prev.filter((ev) => ev.id !== id));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title || !form.date || !form.vendorUrl || !form.agreedToTerms) return;
    const { data, error } = await supabase
      .from("events")
      .insert({
        title: form.title,
        category: form.category,
        city: form.city,
        date: form.date,
        venue: form.venue,
        price: form.price,
        vendor_name: form.vendorName,
        vendor_url: form.vendorUrl,
        image_url: form.imageUrl || null,
      })
      .select();
    if (error) {
      setSaveError("הפרסום נכשל, נסו שוב.");
      return;
    }{!loading && (query || category !== "הכל" || city !== "הכל" || dateFilter !== "הכל") ? (
        <main className="mx-auto max-w-3xl px-4 pb-10 sm:px-6">
          {saveError && (
            <div
              className="mb-3 rounded-lg px-3 py-2 text-sm"
              style={{ backgroundColor: COLORS.coral, color: COLORS.paper, fontFamily: "Rubik, sans-serif" }}
            >
              {saveError}
            </div>
          )}
          <p className="mb-3 text-sm" style={{ color: COLORS.ink, opacity: 0.6, fontFamily: "Heebo, sans-serif" }}>
            {filtered.length} אירועים נמצאו
          </p>
          <EventRow
            events={filtered}
            isAdmin={isAdmin}
            onDelete={deleteEvent}
            emptyText="לא נמצאו אירועים תואמים. נסו לשנות את החיפוש או הסינון."
          />
        </main>
      ) : (
        <>
          <section className="mx-auto mb-6 max-w-3xl px-4 sm:px-6">
            <div className="mb-2 flex items-center gap-2">
              <span
                className="rounded-full px-2.5 py-1 text-xs font-bold"
                style={{ backgroundColor: COLORS.accent, color: COLORS.paper }}
              >
                🔥 קורה היום
              </span>
            </div>
            {loading ? (
              <p className="text-sm" style={{ color: COLORS.ink, opacity: 0.5 }}>
                טוען אירועים...
              </p>
            ) : (
