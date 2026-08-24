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

const CATEGORIES = ["סדנה", "כנס", "הרצאה", "קורס", "אירוע"];
const TARGET_AUDIENCES = ["כולם", "משפחות", "פעוטות", "ילדים", "נוער", "מבוגרים", "גיל שלישי", "אחר"];
const CATEGORY_ICONS = {
  סדנה: "🎨",
  כנס: "🎤",
  הרצאה: "🎓",
  קורס: "📖",
  אירוע: "🎉",
  מפגש: "🧑‍🤝‍🧑",
};

const CITIES = [
  "אבן גבירול",
  "אחוזת הנשיא",
  "חצרות המושבה",
  "מרכז העיר",
  "סלע אפרים",
  "קריית ההגנה",
  "קריית משה",
  "רחובות ההולנדית",
  "רחובות המדע",
  "רחובות הצעירה",
  "שדרות חן",
  "שכונת אבני חן",
  "שכונת אושיות",
  "שכונת גבעתי",
  "שכונת גינות סביון",
  "שכונת גן פלסטיק",
  "שכונת דניה",
  "שכונת היובל",
  "שכונת היקב",
  "שכונת המדע",
  "שכונת חבצלת",
  "שכונת מילצ'ן",
  "שכונת מקוב",
  "שכונת מרמורק",
  "שכונת נווה יהודה",
  "שכונת נווה עמית",
  "שכונת עין גנים",
  "שכונת קרית דוד",
  "שכונת רחובות החדשה",
  "שכונת רחובות שלי",
  "שכונת רמת אהרון",
  "שכונת שעריים",
  "שכונת שרונה",
];

const SURROUNDING_AREAS = [
  "באר יעקב",
  "גבעת ברנר",
  "יבנה",
  "לוד",
  "מזכרת בתיה",
  "נס ציונה",
  "קריית עקרון",
  "רמלה",
];

const TERMS_LAST_UPDATED = "9 באוגוסט 2026";
const EMAILJS_SERVICE_ID = "service_hhojs8f";
const EMAILJS_TEMPLATE_ID = "template_rpy96zi";
const EMAILJS_PUBLIC_KEY = "K8aoKOi9Bnn-4x5de";

function notifyByEmail(type, { name = "", email = "", message = "" }) {
  if (!window.emailjs) return;
  const reply_to = email || SITE_CONTACT_EMAIL;
  window.emailjs
    .send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, { type, name, email, message, reply_to }, EMAILJS_PUBLIC_KEY)
    .catch(() => {});
}
const SITE_OPERATOR_NAME = "צוות רחובותי";
const SITE_CONTACT_EMAIL = "liatmorgan10@gmail.com";

const TERMS_SECTIONS = [
  {
    title: "תקנון ותנאי שימוש - עדכון אחרון: " + TERMS_LAST_UPDATED,
    body: "רחובותי היא פלטפורמה קהילתית המרכזת אירועים, סדנאות, פעילויות, הרצאות, מפגשים ותכנים מקומיים ברחובות והסביבה. השימוש באתר, שליחת פרסום, צפייה באירועים או יצירת קשר דרך האתר מהווים אישור לכך שקראתם את התקנון, הבנתם אותו והסכמתם לפעול לפיו.",
  },
  {
    title: "מהות השירות",
    body: "רחובותי משמשת כלוח פרסום ותיווך מידע בלבד בין מפרסמי אירועים לבין משתמשים המתעניינים בהם. האתר אינו מארגן את האירועים, אינו מפעיל את הסדנאות, אינו אחראי לניהולן, אינו מוכר כרטיסים ואינו צד להתקשרות בין המשתמש לבין מארגן האירוע. כל פרסום נועד למסירת מידע בלבד, ואין לראות בו המלצה, התחייבות או אישור מטעם רחובותי.",
  },
  {
    title: "פרסום אירועים",
    body: "מפרסם ימלא את הפרטים הנדרשים (שם, תיאור, תאריך, שעה, מיקום, מחיר ופרטי קשר). שליחת הטופס אינה מבטיחה שהאירוע יפורסם - כל אירוע נבדק ומאושר ידנית. הנהלת האתר רשאית, לפי שיקול דעתה הבלעדי, לאשר, לדחות, לערוך, להשהות או להסיר כל פרסום, ללא צורך במתן הסבר.",
  },
  {
    title: "אחריות המפרסם",
    body: "המפרסם מצהיר כי כל המידע שמסר נכון ומדויק, וכי יש לו את כל האישורים, ההיתרים והזכויות הנדרשים לקיום האירוע ולפרסום החומרים (תמונות, טקסטים, לוגו) שמסר. אסור לפרסם תוכן שקרי, מטעה, פוגעני, מסית, גזעני, בלתי חוקי או מפר זכויות יוצרים. המפרסם מתחייב לשפות את רחובותי בגין כל נזק שייגרם עקב פרסום שביצע.",
  },
  {
    title: "אחריות המשתמשים",
    body: "משתמשים מתבקשים לבדוק את פרטי האירוע ישירות מול המארגן לפני הגעה או רכישה, שכן פרטים עשויים להשתנות או האירוע עשוי להתבטל. אין להסתמך באופן בלעדי על המידע באתר.",
  },
  {
    title: "הגבלת אחריות",
    body: "רחובותי אינה אחראית לאיכות, בטיחות או קיום בפועל של אירועים, לתוכן שמסר מפרסם, לנזק גוף, נזק רכוש, הפסד כספי או עוגמת נפש שייגרמו כתוצאה מהשתתפות באירוע. רחובותי אינה מתחייבת לזמינות רציפה של האתר וללא תקלות.",
  },
  {
    title: "תשלומים",
    body: "בשלב זה האתר אינו מבצע סליקה ואינו גובה תשלום ממשתמשים. כל תשלום עבור אירוע מתבצע ישירות מול המארגן ובאחריותו המלאה. רחובותי אינה צד לעסקה ואינה אחראית לביטולים, זיכויים או מחלוקות כספיות בין הצדדים.",
  },
  {
    title: "תוכן אסור לפרסום",
    body: "אין לפרסם תוכן שקרי או מטעה; תוכן פוגעני, משפיל, מאיים, אלים, גזעני או מסית; תוכן המפר זכויות יוצרים, סימני מסחר או פרטיות של צד שלישי; תוכן בלתי חוקי; תוכן שאינו מתאים לאופי הקהילתי של האתר; ותמונות או פרטים של קטינים ללא אישור הורה או אפוטרופוס. הנהלת האתר רשאית להסיר תוכן כאמור ללא הודעה מוקדמת.",
  },
  {
    title: "זכויות יוצרים",
    body: "כל הזכויות בעיצוב, בשם, במבנה ובתכנים המקוריים של האתר שייכות לרחובותי. אין להעתיק, לשכפל או להפיץ תכני האתר ללא אישור בכתב. מפרסם מעניק לרחובותי רישיון להשתמש בחומרים שמסר לצורך פרסום האירוע באתר וברשתות החברתיות של רחובותי, ומצהיר כי החומרים שמסר אינם מפרים זכויות של צד שלישי.",
  },
  {
    title: "הודעה והסרה",
    body: "מי שסבור שתוכן שפורסם באתר מפר את זכויותיו (כגון תמונה, טקסט או סימן מסחרי) מוזמן לפנות אלינו במייל " + SITE_CONTACT_EMAIL + " עם שם מלא, פרטי קשר, קישור או צילום מסך של התוכן, והסבר קצר על הזכות שנפגעה. הפנייה תיבחן ותטופל בהתאם לשיקול דעתנו, לרבות הסרה או עריכה.",
  },
  {
    title: "קטינים",
    body: "השימוש באתר מיועד ממגיל 13 ומעלה. קטינים מתחת לגיל 18 מתבקשים להשתמש באתר בידיעת ובהסכמת הורה או אפוטרופוס, לרבות פרסום אירוע או מסירת פרטים אישיים.",
  },
  {
    title: "שינויים ודין",
    body: "הנהלת האתר רשאית לשנות תקנון זה בכל עת; הנוסח המחייב הוא זה המופיע באתר. על התקנון יחולו דיני מדינת ישראל, וסמכות השיפוט נתונה לבתי המשפט המוסמכים בישראל.",
  },
  {
    title: "מדיניות פרטיות",
    body: "רחובותי מכבדת את פרטיות המשתמשים והמפרסמים. במסגרת השימוש באתר עשוי להיאסף מידע שנמסר באופן יזום (שם, טלפון, מייל, פרטי אירוע, תמונות, תוכן פנייה), וכן מידע טכני בסיסי כגון סוג מכשיר ודפדפן. המידע משמש לטיפול בבקשות פרסום, בדיקה ואישור אירועים, יצירת קשר, ושיפור השירות. אין חובה חוקית למסור מידע, אך ייתכן שלא ניתן יהיה לטפל בבקשה בלעדיו.",
  },
  {
    title: "שיתוף מידע",
    body: "רחובותי לא תמכור מידע אישי לצדדים שלישיים. מידע עשוי להימסר לספקי שירות טכנולוגיים (כגון Supabase ו-Vercel המפעילים את האתר), יועצים מקצועיים, או רשויות מוסמכות אם קיימת חובה חוקית לכך, ורק ככל שנדרש לצורך הפעלת האתר.",
  },
  {
    title: "אבטחה ושמירת מידע",
    body: "רחובותי נוקטת אמצעים סבירים להגנה על המידע, אך אין מערכת המאובטחת באופן מוחלט. מידע יישמר למשך הזמן הנדרש לצורך המטרות שלשמן נאסף. ניתן לפנות בבקשה לעיון, תיקון או מחיקה של מידע לכתובת " + SITE_CONTACT_EMAIL + ".",
  },
  {
    title: "הצהרת נגישות",
    body: "רחובותי פועלת לאפשר לכל משתמש, לרבות אנשים עם מוגבלויות, ליהנות מהמידע והשירותים באתר בצורה נוחה וברורה - טקסטים קריאים, מבנה עמודים מסודר, וניגודיות צבעים תקינה. ייתכן שתכנים שהועלו על ידי מפרסמים חיצוניים אינם מונגשים באופן מלא. נגישות פיזית של מקום האירוע (חניה, כניסה, שירותים נגישים) היא באחריות מארגן האירוע בלבד - יש לבדוק זאת ישירות מולו. לפניות בנושא נגישות: " + SITE_CONTACT_EMAIL + ".",
  },
  {
    title: "יצירת קשר ודיווח על תוכן מפר",
    body: "לשאלות, פניות, בקשות הסרה או דיווח על תוכן פוגעני/מפר זכויות, ניתן לפנות אל " + SITE_OPERATOR_NAME + " בכתובת " + SITE_CONTACT_EMAIL + ", או דרך טופס יצירת הקשר שבתחתית העמוד.",
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
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className="rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: COLORS.teal, color: COLORS.paper }}
          >
            {CATEGORY_ICONS[ev.category]} {ev.category}
          </span>
          {ev.target_audience && (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: COLORS.yellow, color: COLORS.ink }}
            >
              👥 {ev.target_audience}
            </span>
          )}
        </div>
        <h3 className="text-base font-semibold leading-snug" style={{ color: COLORS.ink }}>
          {ev.title}
        </h3>
        <p className="text-xs" style={{ color: COLORS.ink, opacity: 0.65 }}>
          📍 {ev.city} · {ev.venue}
          {ev.time ? ` · 🕒 ${ev.time}` : ""}
        </p>
        {ev.description && (
          <p className="text-xs" style={{ color: COLORS.ink, opacity: 0.75 }}>
            {ev.description}
          </p>
        )}
        {isAdmin && ev.contact_phone && (
          <p className="text-xs font-semibold" style={{ color: COLORS.accent }}>
            📞 {ev.contact_phone} (למנהל/ת בלבד)
          </p>
        )}
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
            {ev.vendor_url && (
              <a
                href={ev.vendor_url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
                style={{ backgroundColor: COLORS.accent, color: COLORS.paper }}
              >
                לפרטים ←
              </a>
            )}
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

// Groups events by date and renders a date header above each day's events,
// in chronological order.
function DateGroupedEvents({ events, isAdmin, onDelete, emptyText }) {
  if (events.length === 0) {
    return (
      <p className="text-sm" style={{ color: COLORS.ink, opacity: 0.5, fontFamily: "Rubik, sans-serif" }}>
        {emptyText}
      </p>
    );
  }
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const groups = [];
  sorted.forEach((ev) => {
    const last = groups[groups.length - 1];
    if (last && last.date === ev.date) last.events.push(ev);
    else groups.push({ date: ev.date, events: [ev] });
  });
  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => {
        const dateObj = new Date(group.date + "T00:00:00");
        const label = dateObj.toLocaleDateString("he-IL", {
          weekday: "long",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        return (
          <div key={group.date}>
            <h3
              className="mb-2 text-sm font-bold"
              style={{ color: COLORS.ink, fontFamily: "Suez One, serif" }}
            >
              {label}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {group.events.map((ev) => (
                <EventCard key={ev.id} ev={ev} isAdmin={isAdmin} onDelete={onDelete} />
              ))}
            </div>
          </div>
        );
      })}
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
  const [showTrash, setShowTrash] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitNotice, setSubmitNotice] = useState("");
  const [form, setForm] = useState({
    title: "",
    category: CATEGORIES[0],
    city: CITIES[0],
    date: "",
    time: "",
    venue: "",
    price: "",
    description: "",
    targetAudience: TARGET_AUDIENCES[0],
    vendorName: "",
    contactPhone: "",
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

  // Daily visitor count via the `daily_visits` table: each session records
  // one row per day; the count is everyone who visited today.
  useEffect(() => {
    const sessionId = Math.random().toString(36).slice(2);
    let cancelled = false;

    async function countToday() {
      const today = new Date().toISOString().slice(0, 10);
      await supabase.from("daily_visits").upsert({ day: today, session_id: sessionId });
      const { count } = await supabase
        .from("daily_visits")
        .select("*", { count: "exact", head: true })
        .eq("day", today);
      if (!cancelled) setViewerCount(Math.max(1, count || 1));
    }

    countToday();
    return () => {
      cancelled = true;
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

  async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "")}`;
    const { error } = await supabase.storage.from("event-images").upload(fileName, file);
    if (error) {
      setSaveError("העלאת התמונה נכשלה, נסו שוב.");
      setUploadingImage(false);
      return;
    }
    const { data } = supabase.storage.from("event-images").getPublicUrl(fileName);
    setForm((f) => ({ ...f, imageUrl: data.publicUrl }));
    setUploadingImage(false);
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
    notifyByEmail("פנייה חדשה מטופס יצירת קשר", {
      name: contactName,
      email: contactEmail,
      message: contactMessage,
    });
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

  const approvedEvents = useMemo(
    () => events.filter((ev) => ev.status === "approved" && ev.date >= todayStr()),
    [events]
  );
  const pendingEvents = useMemo(() => events.filter((ev) => ev.status === "pending"), [events]);
  const trashEvents = useMemo(() => events.filter((ev) => ev.status === "trashed"), [events]);

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
    const { error } = await supabase.from("events").update({ status: "trashed" }).eq("id", id);
    if (error) setSaveError("מחיקה נכשלה, נסו שוב.");
    else setEvents((prev) => prev.map((ev) => (ev.id === id ? { ...ev, status: "trashed" } : ev)));
  }

  async function restoreEvent(id) {
    const { error } = await supabase.from("events").update({ status: "approved" }).eq("id", id);
    if (error) setSaveError("השחזור נכשל, נסו שוב.");
    else setEvents((prev) => prev.map((ev) => (ev.id === id ? { ...ev, status: "approved" } : ev)));
  }

  async function permanentlyDeleteEvent(id) {
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
    if (!form.title || !form.date) {
      setSaveError("נא למלא שם אירוע ותאריך.");
      return;
    }
    if (!form.agreedToTerms) {
      setSaveError("יש לאשר את תקנון האתר לפני הפרסום.");
      return;
    }
    setSaveError("");
    const { error } = await supabase.from("events").insert({
      title: form.title,
      category: form.category,
      city: form.city,
      date: form.date,
      time: form.time || null,
      venue: form.venue,
      price: form.price,
      description: form.description || null,
      target_audience: form.targetAudience,
      vendor_name: form.vendorName,
      contact_phone: form.contactPhone || null,
      vendor_url: form.vendorUrl || null,
      image_url: form.imageUrl || null,
    });
    if (error) {
      setSaveError("הפרסום נכשל: " + error.message);
      return;
    }
    setSubmitNotice("האירוע נשלח ✓ הוא יופיע באתר לאחר אישור מנהל/ת.");
    notifyByEmail("אירוע חדש ממתין לאישור", {
      name: form.vendorName,
      message: `${form.title} · ${form.city} · ${form.date}`,
    });
    setForm({
      title: "",
      category: CATEGORIES[0],
      city: CITIES[0],
      date: "",
      time: "",
      venue: "",
      price: "",
      description: "",
      targetAudience: TARGET_AUDIENCES[0],
      vendorName: "",
      contactPhone: "",
      vendorUrl: "",
      imageUrl: "",
      agreedToTerms: false,
    });
    setShowForm(false);
  }

  return (
    <div dir="rtl" style={{ backgroundColor: COLORS.pageBg, minHeight: "100vh" }}>
      {/* top menu bar */}
      <div className="sticky top-0 z-10 flex justify-end px-4 py-2" style={{ backgroundColor: COLORS.pageBg }}>
        <div className="relative">
          <button
            onClick={() => setShowMenu((s) => !s)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
            style={{ backgroundColor: COLORS.paper, color: COLORS.ink }}
            aria-label="תפריט"
          >
            ☰
          </button>
          {showMenu && (
            <div
              className="absolute left-0 mt-2 flex w-48 flex-col overflow-hidden rounded-xl shadow-lg"
              style={{ backgroundColor: COLORS.paper, fontFamily: "Rubik, sans-serif" }}
            >
              <button
                onClick={() => {
                  setShowForm(true);
                  setShowMenu(false);
                  document.getElementById("publish-section")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-4 py-3 text-right text-sm"
                style={{ color: COLORS.ink }}
              >
                📢 פרסום אירוע
              </button>
              <button
                onClick={() => {
                  if (isAdmin) setShowInbox(true);
                  else setShowContact(true);
                  setShowMenu(false);
                  document.getElementById("footer-section")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-4 py-3 text-right text-sm"
                style={{ color: COLORS.ink }}
              >
                📥 פניות
              </button>
              <button
                onClick={() => {
                  setShowTerms(true);
                  setShowMenu(false);
                  document.getElementById("footer-section")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-4 py-3 text-right text-sm"
                style={{ color: COLORS.ink }}
              >
                📜 תקנון
              </button>
            </div>
          )}
        </div>
      </div>

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
            {viewerCount} {viewerCount === 1 ? "צופה" : "צופים"} היום
          </div>
        </div>
      </header>

      {/* category icon chips */}
      <div className="mx-auto mb-5 max-w-3xl px-4 sm:px-6">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setCategory("הכל")}
            className="flex min-w-[52px] flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 text-[11px] font-medium transition-colors"
            style={{
              backgroundColor: category === "הכל" ? COLORS.accent : COLORS.paper,
              color: category === "הכל" ? COLORS.paper : COLORS.ink,
              fontFamily: "Rubik, sans-serif",
            }}
          >
            <span className="text-lg">✨</span>
            הכל
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className="flex min-w-[52px] flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 text-[11px] font-medium transition-colors"
              style={{
                backgroundColor: category === c ? COLORS.accent : COLORS.paper,
                color: category === c ? COLORS.paper : COLORS.ink,
                fontFamily: "Rubik, sans-serif",
              }}
            >
              <span className="text-lg">{CATEGORY_ICONS[c]}</span>
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

      {/* publish CTA - moved higher so it stays visible even as more events are published */}
      <div id="publish-section" className="mx-auto mb-6 max-w-3xl px-4 sm:px-6">
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

      {/* add event form - moved up here so it opens right under the CTA button above */}
      {showForm && (
        <div className="mx-auto mb-8 max-w-3xl px-4 sm:px-6">
          <p
            className="mb-2 text-xs"
            style={{ color: COLORS.ink, opacity: 0.6, fontFamily: "Rubik, sans-serif" }}
          >
            שליחת הטופס אינה מבטיחה פרסום - כל אירוע נבדק ומאושר ידנית. המפרסם/ת אחראי/ת באופן מלא לנכונות הפרטים, לזכויות בתמונות ובחומרים שצורפו, ולכל עניין הקשור לאירוע.
          </p>
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-3 rounded-2xl p-4 sm:grid-cols-2"
            style={{ backgroundColor: COLORS.inkLight, fontFamily: "Rubik, sans-serif" }}
          >
            {saveError && (
              <div
                className="rounded-lg px-3 py-2 text-sm sm:col-span-2"
                style={{ backgroundColor: COLORS.coral, color: COLORS.paper }}
              >
                {saveError}
              </div>
            )}
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
              <optgroup label="השכונה בה יתקיים האירוע">
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
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
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
            <select
              value={form.targetAudience}
              onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
              className="rounded-xl px-3 py-2 text-sm"
              style={{ backgroundColor: COLORS.paper, color: COLORS.ink }}
            >
              {TARGET_AUDIENCES.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
            <textarea
              placeholder="תיאור האירוע (אופציונלי)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="rounded-xl px-3 py-2 text-sm sm:col-span-2"
              style={{ backgroundColor: COLORS.paper, color: COLORS.ink }}
            />
            <input
              placeholder="שם הספק / אתר המכירה"
              value={form.vendorName}
              onChange={(e) => setForm({ ...form, vendorName: e.target.value })}
              className="rounded-xl px-3 py-2 text-sm"
              style={{ backgroundColor: COLORS.paper, color: COLORS.ink }}
            />
            <div>
              <input
                type="tel"
                placeholder="טלפון ליצירת קשר (לצוות רחובותי בלבד, לא יפורסם)"
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                className="w-full rounded-xl px-3 py-2 text-sm"
                style={{ backgroundColor: COLORS.paper, color: COLORS.ink }}
              />
            </div>
            <input
              placeholder="קישור לרכישה/הרשמה (אופציונלי - השאירו ריק אם האירוע חינמי ללא הרשמה)"
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
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm sm:col-span-2"
              style={{ backgroundColor: COLORS.paper, color: COLORS.ink, border: `1px dashed ${COLORS.ink}44` }}
            >
              {uploadingImage ? "מעלה תמונה..." : "📷 או העלו תמונה מהטלפון"}
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
            {form.imageUrl && (
              <div className="sm:col-span-2">
                <img
                  src={form.imageUrl}
                  alt="תצוגה מקדימה"
                  className="h-32 w-full rounded-xl object-cover"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "block";
                  }}
                  onLoad={(e) => {
                    e.target.style.display = "block";
                    e.target.nextSibling.style.display = "none";
                  }}
                />
                <p className="text-xs" style={{ color: COLORS.coral, display: "none" }}>
                  לא הצלחנו לטעון תמונה מהקישור הזה - ודאו שהוא קישור ישיר לתמונה.
                </p>
              </div>
            )}
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
                תקנון האתר ומדיניות הפרטיות
              </button>
              , ומצהיר/ה כי הפרטים נכונים ושיש לי זכות לפרסם את התוכן שצירפתי. ידוע לי שהפרסום כפוף לאישור ידני.
            </label>
            <button
              type="submit"
              className="rounded-full px-4 py-2 text-sm font-semibold sm:col-span-2"
              style={{ backgroundColor: COLORS.accent, color: COLORS.paper }}
            >
              פרסום האירוע
            </button>
          </form>
        </div>
      )}

      {/* admin-only: events awaiting approval - stays near the publish CTA above */}
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
                  {(ev.vendor_name || ev.vendor_url) && (
                    <p className="text-xs" style={{ color: COLORS.ink, opacity: 0.65 }}>
                      {ev.vendor_name ? `${ev.vendor_name} · ` : ""}
                      {ev.vendor_url && (
                        <a href={ev.vendor_url} target="_blank" rel="noopener noreferrer" className="underline">
                          קישור
                        </a>
                      )}
                    </p>
                  )}
                  {ev.contact_phone && (
                    <p className="text-xs font-semibold" style={{ color: COLORS.accent }}>
                      📞 {ev.contact_phone}
                    </p>
                  )}
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
          <DateGroupedEvents
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
              <DateGroupedEvents events={filtered} isAdmin={isAdmin} onDelete={deleteEvent} emptyText="אין עדיין אירועים באתר." />
            )}
          </section>
        </>
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

      {/* contact - panels only; the toggle button now lives in the footer row below */}
      <div className="mx-auto mb-6 max-w-3xl px-4 sm:px-6">
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
      <footer id="footer-section" className="mx-auto max-w-3xl px-4 pb-10 sm:px-6">
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={() => setShowTerms((s) => !s)}
            className="text-sm underline"
            style={{ color: COLORS.ink, opacity: 0.6, fontFamily: "Rubik, sans-serif" }}
          >
            תקנון האתר
          </button>
          <button
            onClick={() => (isAdmin ? setShowInbox((s) => !s) : setShowContact((s) => !s))}
            className="text-sm underline"
            style={{ color: COLORS.ink, opacity: 0.6, fontFamily: "Rubik, sans-serif" }}
          >
            {isAdmin
              ? showInbox
                ? "סגירת תיבת הפניות"
                : `תיבת פניות (${contactMessages.length})`
              : showContact
              ? "סגירת טופס יצירת קשר"
              : "יצירת קשר עם צוות רחובותי"}
          </button>
          {isAdmin && trashEvents.length > 0 && (
            <button
              onClick={() => setShowTrash((s) => !s)}
              className="text-sm underline"
              style={{ color: COLORS.ink, opacity: 0.6, fontFamily: "Rubik, sans-serif" }}
            >
              {showTrash ? "סגירת הסל" : `סל מחיקה (${trashEvents.length})`}
            </button>
          )}
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
        {showTrash && isAdmin && (
          <div className="mt-3 flex flex-col gap-3">
            {trashEvents.map((ev) => (
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
                <div className="flex gap-2">
                  <button
                    onClick={() => restoreEvent(ev.id)}
                    className="rounded-full px-3 py-1.5 text-xs font-semibold"
                    style={{ backgroundColor: COLORS.teal, color: COLORS.paper }}
                  >
                    שחזור
                  </button>
                  <button
                    onClick={() => permanentlyDeleteEvent(ev.id)}
                    className="rounded-full px-3 py-1.5 text-xs font-semibold"
                    style={{ backgroundColor: COLORS.ink, color: COLORS.paper }}
                  >
                    מחיקה לצמיתות
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
        <p
          className="mt-6 text-xs"
          style={{ color: COLORS.ink, opacity: 0.45, fontFamily: "Rubik, sans-serif" }}
        >
          © כל הזכויות שמורות לרחובותי. האירועים מתפרסמים באחריות המפרסמים בלבד.
        </p>
      </footer>
    </div>
  );
}
