import { useState, useMemo, useEffect } from "react";
import { supabase } from "./supabaseClient";

const PRESENCE_TTL_MS = 60 * 1000; // consider a viewer "active" for 60s after their last heartbeat

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
  const day = ref.getDay(); // 0=Sun ... 5=Fri, 6=Sat
  let daysToFriday = (5 - day + 7) % 7;
  if (day === 6) daysToFriday = -1; // it's already Saturday - Friday was yesterday
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
}

export default function App() {
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
  const [session, setSession] = useState(null);
  const isAdmin = !!session;
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [viewerCount, setViewerCount] = useState(1);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSent, setContactSent] = useState(false);
  const [contactError, setContactError] = useState("");
  const [showContact, setShowContact] = useState(false);
  const [contactMessages, setContactMessages] = useState([]);
  const [showInbox, setShowInbox] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [submitNotice, setSubmitNotice] = useState("");
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

  // Load events from Supabase on mount, then keep listening for live changes
  // from other visitors (new publishes / deletes) via Supabase Realtime.
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

  // Live viewer count via the `presence` table: each open tab upserts its own
  // row every 20s; the count is everyone whose last_seen is within the last minute.
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

  // Track the logged-in admin session (real Supabase Auth, not just a UI toggle).
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError("");
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    if (error) {
      setLoginError("התחברות נכשלה. בדקו מייל וסיסמה.");
      return;
    }
    setLoginEmail("");
    setLoginPassword("");
    setShowLogin(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  async function handleContactSubmit(e) {
    e.preventDefault();
    if (!contactMessage.trim()) return;
    const { error } = await supabase.from("contact_messages").insert({
      name: contactName || null,
      email: contactEmail || null,
      message: contactMessage,
    });
    if (error) {
      setContactError("השליחה נכשלה, נסו שוב.");
      return;
    }
    setContactError("");
    setContactSent(true);
    setContactName("");
    setContactEmail("");
    setContactMessage("");
  }

  // Admin-only: load the contact inbox once logged in.
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    async function loadInbox() {
      const { data } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });
      if (!cancelled) setContactMessages(data || []);
    }
    loadInbox();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const approvedEvents = useMemo(() => events.filter((ev) => ev.status === "approved"), [events]);
  const pendingEvents = useMemo(() => events.filter((ev) => ev.status === "pending"), [events]);

  const cityBreakdown = useMemo(() => {
    const counts = {};
    approvedEvents.forEach((ev) => {
      counts[ev.city] = (counts[ev.city] || 0) + 1;
    });
    return [...CITIES, ...SURROUNDING_AREAS]
      .map((c) => ({ city: c, count: counts[c] || 0 }))
      .filter((c) => c.count > 0);
  }, [approvedEvents]);

  const filtered = useMemo(() => {
    return approvedEvents
      .filter((ev) => (query ? ev.title.includes(query) || (ev.venue || "").includes(query) : true))
      .filter((ev) => (category === "הכל" ? true : ev.category === category))
      .filter((ev) => (city === "הכל" ? true : ev.city === city))
      .filter((ev) => {
        if (dateFilter === "היום") return ev.date === todayStr();
        if (dateFilter === "השבוע") return isWithinDays(ev.date, 7);
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [approvedEvents, query, category, city, dateFilter]);

  const todayEvents = useMemo(() => approvedEvents.filter((ev) => ev.date === todayStr()), [approvedEvents]);
  const weekendEvents = useMemo(() => {
    const [fri, sat] = getWeekendDates(todayStr());
    return approvedEvents.filter((ev) => ev.date === fri || ev.date === sat);
  }, [approvedEvents]);

  async function deleteEvent(id) {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) setSaveError("מחיקה נכשלה, נסו שוב.");
    else setEvents((prev) => prev.filter((ev) => ev.id !== id));
  }

  async function approveEvent(id) {
    const { error } = await supabase.from("events").update({ status: "approved" }).eq("id", id);
    if (error) setSaveError("האישור נכשל, נסו שוב.");
    else setEvents((prev) => prev.map((ev) => (ev.id === id ? { ...ev, status: "approved" } : ev)));
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
    }
    setSaveError("");
    if (data) setEvents((prev) => [...prev, ...data]);
    setSubmitNotice("האירוע נשלח ✓ הוא יופיע באתר לאחר אישור מנהל/ת.");
    setForm({
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
    setShowForm(false);
  }

  return (
    <div dir="rtl" style={{ backgroundColor: COLORS.pageBg, minHeight: "100vh" }}>
      {/* hero */}
      <header className="px-4 pb-5 pt-6 text-center sm:px-10 sm:pt-8">
        <div className="mb-1 flex justify-center">
          <img
            src="/logo.jpg"
            alt="רחובותי - אירועים ופעילויות ברחובות והסביבה"
            className="h-auto w-full max-w-[150px] sm:max-w-[190px]"
            style={{ objectFit: "contain" }}
          />
        </div>

        <h1
          style={{
            fontFamily: "Suez One, serif",
            color: COLORS.ink,
            fontSize: "clamp(1.6rem, 6vw, 2.4rem)",
            lineHeight: 1.2,
          }}
        >
          מה עושים היום <span style={{ color: COLORS.accent }}>ברחובות?</span>
        </h1>

        <p
          className="mx-auto mt-1.5 max-w-md text-sm"
          style={{ color: COLORS.ink, opacity: 0.75, fontFamily: "Rubik, sans-serif" }}
        >
          כל האירועים, הסדנאות והפעילויות של העיר - במקום אחד.
        </p>

        {showAbout && (
          <p
            className="mx-auto mt-2 max-w-lg text-sm"
            style={{ color: COLORS.ink, opacity: 0.7, fontFamily: "Rubik, sans-serif" }}
          >
            רחובותי נולד כדי לאחד את כל מה שקורה בעיר. מקום לחפש ולפרסם אירועים, חוגים, סדנאות ופעילויות בכל מיני קבוצות ופרסומים שונים, רחובותי מרכז עבור תושבי רחובות והסביבה את כל מה שמעניין במקום אחד.
          </p>
        )}
        <button
          onClick={() => setShowAbout((s) => !s)}
          className="mt-1 text-xs underline"
          style={{ color: COLORS.ink, opacity: 0.55, fontFamily: "Rubik, sans-serif" }}
        >
          {showAbout ? "הצג פחות" : "קרא עוד על רחובותי"}
        </button>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <p
            className="text-xs tracking-wide"
            style={{ color: COLORS.ink, opacity: 0.55, fontFamily: "Heebo, sans-serif" }}
          >
            אירועים • סדנאות • פנאי • תרבות • רחובות • קהילה
          </p>
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
            style={{ backgroundColor: COLORS.inkLight, color: COLORS.ink, fontFamily: "Heebo, sans-serif" }}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#4CAF50" }} />
            {viewerCount} {viewerCount === 1 ? "צופה" : "צופים"} כרגע
          </div>
        </div>
      </header>

      {/* category icon chips */}
      <div className="mx-auto mb-5 max-w-3xl px-4 sm:px-6">
        <div className="flex justify-center gap-2 overflow-x-auto pb-1 sm:justify-start">
          <button
            onClick={() => setCategory("הכל")}
            className="flex min-w-[64px] flex-col items-center gap-1 rounded-2xl px-3 py-2 text-xs font-medium transition-colors"
            style={{
              backgroundColor: category === "הכל" ? COLORS.accent : COLORS.paper,
              color: category === "הכל" ? COLORS.paper : COLORS.ink,
              fontFamily: "Rubik, sans-serif",
            }}
          >
            <span className="text-xl">✨</span>
            הכל
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className="flex min-w-[64px] flex-col items-center gap-1 rounded-2xl px-3 py-2 text-xs font-medium transition-colors"
              style={{
                backgroundColor: category === c ? COLORS.accent : COLORS.paper,
                color: category === c ? COLORS.paper : COLORS.ink,
                fontFamily: "Rubik, sans-serif",
              }}
            >
              <span className="text-xl">{CATEGORY_ICONS[c]}</span>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* search + secondary filters */}
      <div className="mx-auto mb-6 max-w-3xl px-4 sm:px-6">
        <div className="flex flex-col gap-2 rounded-2xl p-3" style={{ backgroundColor: COLORS.paper }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔎 חיפוש לפי שם אירוע או מקום..."
            className="w-full rounded-xl border-0 px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
            style={{ backgroundColor: COLORS.inkLight, color: COLORS.ink, fontFamily: "Rubik, sans-serif" }}
          />
          <button
            onClick={() => setShowMoreFilters((s) => !s)}
            className="self-start text-xs underline"
            style={{ color: COLORS.ink, opacity: 0.6, fontFamily: "Rubik, sans-serif" }}
          >
            {showMoreFilters ? "הסתרת סינון מתקדם" : "סינון לפי שכונה / תאריך ⌄"}
          </button>
          {showMoreFilters && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="rounded-xl px-3 py-2 text-sm sm:flex-1"
                style={{ backgroundColor: COLORS.inkLight, color: COLORS.ink, fontFamily: "Rubik, sans-serif" }}
              >
                <option>הכל</option>
                <optgroup label="שכונות רחובות">
                  {CITIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </optgroup>
                <optgroup label="יישובי הסביבה">
                  {SURROUNDING_AREAS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </optgroup>
              </select>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="rounded-xl px-3 py-2 text-sm sm:flex-1"
                style={{ backgroundColor: COLORS.inkLight, color: COLORS.ink, fontFamily: "Rubik, sans-serif" }}
              >
                {DATE_FILTERS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {!loading && (query || category !== "הכל" || city !== "הכל" || dateFilter !== "הכל") ? (
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
              <EventRow
                events={todayEvents}
                isAdmin={isAdmin}
                onDelete={deleteEvent}
                emptyText="אין עדיין אירועים שפורסמו להיום."
              />
            )}
          </section>

          <section className="mx-auto mb-6 max-w-3xl px-4 sm:px-6">
            <div className="mb-2 flex items-center gap-2">
              <span
                className="rounded-full px-2.5 py-1 text-xs font-bold"
                style={{ backgroundColor: COLORS.teal, color: COLORS.paper }}
              >
                🎉 בסופ"ש הקרוב
              </span>
            </div>
            {loading ? (
              <p className="text-sm" style={{ color: COLORS.ink, opacity: 0.5 }}>
                טוען אירועים...
              </p>
            ) : (
              <EventRow
                events={weekendEvents}
                isAdmin={isAdmin}
                onDelete={deleteEvent}
                emptyText="אין עדיין אירועים שפורסמו לסוף השבוע הקרוב."
              />
            )}
          </section>

          <section className="mx-auto mb-6 max-w-3xl px-4 sm:px-6">
            {saveError && (
              <div
                className="mb-3 rounded-lg px-3 py-2 text-sm"
                style={{ backgroundColor: COLORS.coral, color: COLORS.paper, fontFamily: "Rubik, sans-serif" }}
              >
                {saveError}
              </div>
            )}
            <p className="mb-2 text-sm font-medium" style={{ color: COLORS.ink, opacity: 0.6, fontFamily: "Rubik, sans-serif" }}>
              כל האירועים · {filtered.length}
            </p>
            {loading ? (
              <p className="text-sm" style={{ color: COLORS.ink, opacity: 0.5 }}>
                טוען אירועים...
              </p>
            ) : (
              <EventRow events={filtered} isAdmin={isAdmin} onDelete={deleteEvent} emptyText="אין עדיין אירועים באתר." />
            )}
          </section>
        </>
      )}

      {/* publish CTA */}
      <div className="mx-auto mb-6 max-w-3xl px-4 sm:px-6">
        <div
          className="flex flex-col items-start justify-between gap-3 rounded-2xl p-4 sm:flex-row sm:items-center"
          style={{ backgroundColor: COLORS.inkLight }}
        >
          <div>
            <h2 className="text-base font-semibold" style={{ color: COLORS.ink, fontFamily: "Suez One, serif" }}>
              מארגנים אירוע או פעילות שכונתית?
            </h2>
            <p className="text-sm" style={{ color: COLORS.ink, opacity: 0.65, fontFamily: "Rubik, sans-serif" }}>
              פרסמו כאן בחינם - האירוע יופיע לאחר אישור קצר, וההרשמה נשארת תמיד אצלכם.
            </p>
          </div>
          <button
            onClick={() => {
              setShowForm((s) => !s);
              setSubmitNotice("");
            }}
            className="whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold"
            style={{ backgroundColor: COLORS.accent, color: COLORS.paper, fontFamily: "Rubik, sans-serif" }}
          >
            {showForm ? "סגירה" : "+ פרסום אירוע"}
          </button>
        </div>
        {submitNotice && (
          <p className="mt-2 text-sm" style={{ color: COLORS.ink, opacity: 0.75, fontFamily: "Rubik, sans-serif" }}>
            {submitNotice}
          </p>
        )}
      </div>

      {/* admin-only: events awaiting approval */}
      {isAdmin && pendingEvents.length > 0 && (
        <div className="mx-auto mb-6 max-w-3xl px-4 sm:px-6">
          <button
            onClick={() => setShowPending((s) => !s)}
            className="text-sm font-medium underline"
            style={{ color: COLORS.accent, fontFamily: "Rubik, sans-serif" }}
          >
            {showPending ? "סגירת רשימת ההמתנה" : `ממתינים לאישור (${pendingEvents.length})`}
          </button>
          {showPending && (
            <div className="mt-3 flex flex-col gap-3">
              {pendingEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="flex flex-col gap-2 rounded-xl p-3"
                  style={{ backgroundColor: COLORS.paper, fontFamily: "Rubik, sans-serif" }}
                >
                  <p className="text-sm font-semibold" style={{ color: COLORS.ink }}>
                    {CATEGORY_ICONS[ev.category]} {ev.title}
                  </p>
                  <p className="text-xs" style={{ color: COLORS.ink, opacity: 0.65 }}>
                    {ev.city} · {ev.venue} · {ev.date}
                  </p>
                  <p className="text-xs" style={{ color: COLORS.ink, opacity: 0.65 }}>
                    {ev.vendor_name ? `${ev.vendor_name} · ` : ""}
                    <a href={ev.vendor_url} target="_blank" rel="noopener noreferrer" className="underline">
                      קישור
                    </a>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => approveEvent(ev.id)}
                      className="rounded-full px-3 py-1.5 text-xs font-semibold"
                      style={{ backgroundColor: COLORS.teal, color: COLORS.paper }}
                    >
                      אישור ופרסום
                    </button>
                    <button
                      onClick={() => deleteEvent(ev.id)}
                      className="rounded-full px-3 py-1.5 text-xs font-semibold"
                      style={{ backgroundColor: COLORS.ink, color: COLORS.paper }}
                    >
                      דחייה ומחיקה
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* add event form */}
      {showForm && (
        <div className="mx-auto mb-8 max-w-3xl px-4 sm:px-6">
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-3 rounded-2xl p-4 sm:grid-cols-2"
            style={{ backgroundColor: COLORS.inkLight, fontFamily: "Rubik, sans-serif" }}
          >
            <input
              required
              placeholder="שם האירוע"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="rounded-xl px-3 py-2 text-sm sm:col-span-2"
              style={{ backgroundColor: COLORS.paper, color: COLORS.ink }}
            />
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="rounded-xl px-3 py-2 text-sm"
              style={{ backgroundColor: COLORS.paper, color: COLORS.ink }}
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="rounded-xl px-3 py-2 text-sm"
              style={{ backgroundColor: COLORS.paper, color: COLORS.ink }}
            >
              <optgroup label="שכונות רחובות">
                {CITIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </optgroup>
              <optgroup label="יישובי הסביבה">
                {SURROUNDING_AREAS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </optgroup>
            </select>
            <input
              required
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="rounded-xl px-3 py-2 text-sm"
              style={{ backgroundColor: COLORS.paper, color: COLORS.ink }}
            />
            <input
              placeholder="מקום (אולם/כתובת)"
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
              className="rounded-xl px-3 py-2 text-sm"
              style={{ backgroundColor: COLORS.paper, color: COLORS.ink }}
            />
            <input
              placeholder="מחיר / הערה"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="rounded-xl px-3 py-2 text-sm"
              style={{ backgroundColor: COLORS.paper, color: COLORS.ink }}
            />
            <input
              placeholder="שם הספק / אתר המכירה"
              value={form.vendorName}
              onChange={(e) => setForm({ ...form, vendorName: e.target.value })}
              className="rounded-xl px-3 py-2 text-sm"
              style={{ backgroundColor: COLORS.paper, color: COLORS.ink }}
            />
            <input
              required
              placeholder="קישור לרכישה (https://...)"
              value={form.vendorUrl}
              onChange={(e) => setForm({ ...form, vendorUrl: e.target.value })}
              className="rounded-xl px-3 py-2 text-sm sm:col-span-2"
              style={{ backgroundColor: COLORS.paper, color: COLORS.ink }}
            />
            <input
              placeholder="קישור לתמונה/פלייר של האירוע (אופציונלי)"
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              className="rounded-xl px-3 py-2 text-sm sm:col-span-2"
              style={{ backgroundColor: COLORS.paper, color: COLORS.ink }}
            />
            <label
              className="flex items-center gap-2 text-sm sm:col-span-2"
              style={{ color: COLORS.ink, opacity: 0.85 }}
            >
              <input
                type="checkbox"
                checked={form.agreedToTerms}
                onChange={(e) => setForm({ ...form, agreedToTerms: e.target.checked })}
              />
              קראתי ואני מאשר/ת את{" "}
              <button
                type="button"
                onClick={() => setShowTerms(true)}
                className="underline"
                style={{ color: COLORS.accent }}
              >
                תקנון האתר
              </button>
            </label>
            <button
              type="submit"
              disabled={!form.agreedToTerms}
              className="rounded-full px-4 py-2 text-sm font-semibold sm:col-span-2 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: COLORS.accent, color: COLORS.paper }}
            >
              פרסום האירוע
            </button>
          </form>
        </div>
      )}

      {/* neighborhood breakdown */}
      <div className="mx-auto mb-6 max-w-3xl px-4 sm:px-6">
        <p className="mb-2 text-sm font-medium" style={{ color: COLORS.ink, opacity: 0.6, fontFamily: "Rubik, sans-serif" }}>
          עיון לפי שכונה
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCity("הכל")}
            className="rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
            style={{
              fontFamily: "Rubik, sans-serif",
              backgroundColor: city === "הכל" ? COLORS.yellow : COLORS.inkLight,
              color: COLORS.ink,
            }}
          >
            כל השכונות · {approvedEvents.length}
          </button>
          {cityBreakdown.map(({ city: c, count }) => (
            <button
              key={c}
              onClick={() => setCity(c)}
              className="rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
              style={{
                fontFamily: "Rubik, sans-serif",
                backgroundColor: city === c ? COLORS.yellow : COLORS.inkLight,
                color: COLORS.ink,
              }}
            >
              {c} · {count}
            </button>
          ))}
        </div>
      </div>

      {/* contact - one button, two behaviors: send a message (public) or read the inbox (admin) */}
      <div className="mx-auto mb-6 max-w-3xl px-4 sm:px-6">
        <button
          onClick={() => (isAdmin ? setShowInbox((s) => !s) : setShowContact((s) => !s))}
          className="text-sm font-medium underline"
          style={{ color: COLORS.ink, opacity: 0.7, fontFamily: "Rubik, sans-serif" }}
        >
          {isAdmin
            ? showInbox
              ? "סגירת תיבת הפניות"
              : `תיבת פניות (${contactMessages.length})`
            : showContact
            ? "סגירת טופס יצירת קשר"
            : "יצירת קשר עם צוות רחובותי"}
        </button>

        {!isAdmin && showContact && (
          <div
            className="mt-3 rounded-2xl p-4"
            style={{ backgroundColor: COLORS.paper, fontFamily: "Rubik, sans-serif" }}
          >
            {contactSent ? (
              <p className="text-sm" style={{ color: COLORS.ink }}>
                ההודעה נשלחה, תודה! נחזור אליכם בהקדם.
              </p>
            ) : (
              <form onSubmit={handleContactSubmit} className="flex flex-col gap-2">
                <input
                  placeholder="שם (אופציונלי)"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="rounded-xl px-3 py-2 text-sm"
                  style={{ backgroundColor: COLORS.inkLight, color: COLORS.ink }}
                />
                <input
                  type="email"
                  placeholder="אימייל לחזרה (אופציונלי)"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="rounded-xl px-3 py-2 text-sm"
                  style={{ backgroundColor: COLORS.inkLight, color: COLORS.ink }}
                />
                <textarea
                  required
                  placeholder="ההודעה שלכם"
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  rows={4}
                  className="rounded-xl px-3 py-2 text-sm"
                  style={{ backgroundColor: COLORS.inkLight, color: COLORS.ink }}
                />
                {contactError && (
                  <p className="text-xs" style={{ color: COLORS.coral }}>
                    {contactError}
                  </p>
                )}
                <button
                  type="submit"
                  className="rounded-full px-4 py-2 text-sm font-semibold"
                  style={{ backgroundColor: COLORS.accent, color: COLORS.paper }}
                >
                  שליחה
                </button>
              </form>
            )}
          </div>
        )}

        {isAdmin && showInbox && (
          <div
            className="mt-3 flex flex-col gap-3 rounded-xl p-4"
            style={{ backgroundColor: COLORS.paper, fontFamily: "Rubik, sans-serif" }}
          >
            {contactMessages.length === 0 ? (
              <p className="text-sm" style={{ color: COLORS.ink, opacity: 0.6 }}>
                אין עדיין פניות.
              </p>
            ) : (
              contactMessages.map((m) => (
                <div key={m.id} className="border-b pb-2" style={{ borderColor: `${COLORS.ink}22` }}>
                  <p className="text-sm font-semibold" style={{ color: COLORS.ink }}>
                    {m.name || "אנונימי"} {m.email ? `· ${m.email}` : ""}
                  </p>
                  <p className="text-sm" style={{ color: COLORS.ink, opacity: 0.8 }}>
                    {m.message}
                  </p>
                  <p className="text-xs" style={{ color: COLORS.ink, opacity: 0.5 }}>
                    {new Date(m.created_at).toLocaleString("he-IL")}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* terms + admin toggle */}
      <footer className="mx-auto max-w-3xl px-4 pb-10 sm:px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowTerms((s) => !s)}
            className="text-sm underline"
            style={{ color: COLORS.ink, opacity: 0.6, fontFamily: "Rubik, sans-serif" }}
          >
            תקנון האתר
          </button>
          {isAdmin ? (
            <button
              onClick={handleLogout}
              className="text-sm underline"
              style={{ color: "#B5651D", fontFamily: "Rubik, sans-serif" }}
            >
              מצב ניהול פעיל - התנתקות
            </button>
          ) : (
            <button
              onClick={() => setShowLogin((s) => !s)}
              className="text-sm underline"
              style={{ color: COLORS.ink, opacity: 0.6, fontFamily: "Rubik, sans-serif" }}
            >
              כניסת מנהל/ת
            </button>
          )}
        </div>
        {showLogin && !isAdmin && (
          <form
            onSubmit={handleLogin}
            className="mt-3 flex flex-col gap-2 rounded-xl p-4"
            style={{ backgroundColor: COLORS.inkLight, fontFamily: "Rubik, sans-serif" }}
          >
            <input
              type="email"
              required
              placeholder="אימייל"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="rounded-lg px-3 py-2 text-sm"
              style={{ backgroundColor: COLORS.paper, color: COLORS.ink }}
            />
            <input
              type="password"
              required
              placeholder="סיסמה"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="rounded-lg px-3 py-2 text-sm"
              style={{ backgroundColor: COLORS.paper, color: COLORS.ink }}
            />
            {loginError && (
              <p className="text-xs" style={{ color: COLORS.coral }}>
                {loginError}
              </p>
            )}
            <button
              type="submit"
              className="rounded-full px-4 py-2 text-sm font-semibold"
              style={{ backgroundColor: COLORS.accent, color: COLORS.paper }}
            >
              התחברות
            </button>
          </form>
        )}
        {showTerms && (
          <div
            className="mt-3 flex flex-col gap-3 rounded-xl p-4"
            style={{ backgroundColor: COLORS.inkLight, fontFamily: "Rubik, sans-serif" }}
          >
            {TERMS_SECTIONS.map((s) => (
              <div key={s.title}>
                <h4 className="mb-1 text-sm font-semibold" style={{ color: COLORS.ink }}>
                  {s.title}
                </h4>
                <p className="text-sm" style={{ color: COLORS.ink, opacity: 0.75 }}>
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        )}
      </footer>
    </div>
  );
}
