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
