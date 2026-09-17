export const CATEGORIES = [
  { slug: "breaking", hi: "ब्रेकिंग", en: "Breaking" },
  { slug: "national-politics", hi: "देश / राजनीति", en: "National" },
  { slug: "international", hi: "विदेश", en: "International" },
  { slug: "sports", hi: "खेल", en: "Sports" },
  { slug: "lifestyle", hi: "जीवनशैली", en: "Lifestyle" },
];

export const CATEGORY_LABELS = {
  breaking: "ब्रेकिंग न्यूज़",
  "national-politics": "देश / राजनीति",
  international: "विदेश",
  sports: "खेल",
  lifestyle: "जीवनशैली / स्वास्थ्य / शिक्षा",
};

export const REGIONS = [
  { slug: "up", hi: "उत्तर प्रदेश" },
  { slug: "delhi", hi: "दिल्ली" },
  { slug: "haryana", hi: "हरियाणा" },
  { slug: "punjab", hi: "पंजाब" },
  { slug: "rajasthan", hi: "राजस्थान" },
  { slug: "uttarakhand", hi: "उत्तराखंड" },
];

export const REGION_LABELS = {
  up: "उत्तर प्रदेश",
  delhi: "दिल्ली",
  haryana: "हरियाणा",
  punjab: "पंजाब",
  rajasthan: "राजस्थान",
  uttarakhand: "उत्तराखंड",
};

export const UP_DISTRICTS = [
  { slug: "ghaziabad", hi: "गाज़ियाबाद" },
  { slug: "noida", hi: "नोएडा" },
  { slug: "greater-noida", hi: "ग्रेटर नोएडा" },
  { slug: "hapur", hi: "हापुड़" },
  { slug: "lucknow", hi: "लखनऊ" },
];

export const DISTRICT_LABELS = {
  ghaziabad: "गाज़ियाबाद",
  noida: "नोएडा",
  "greater-noida": "ग्रेटर नोएडा",
  hapur: "हापुड़",
  lucknow: "लखनऊ",
};

export const timeAgo = (iso) => {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "अभी";
  if (diff < 3600) return `${Math.floor(diff / 60)} मिनट पहले`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} घंटे पहले`;
  return `${Math.floor(diff / 86400)} दिन पहले`;
};
