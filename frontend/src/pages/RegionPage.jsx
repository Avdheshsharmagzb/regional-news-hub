import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { NewsCard } from "@/components/NewsCard";
import { SectionHeader } from "@/components/SectionHeader";
import { REGION_LABELS, UP_DISTRICTS, DISTRICT_LABELS } from "@/lib/config";

export default function RegionPage() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const district = params.get("district");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    let url = `/articles?region=${slug}&limit=40`;
    if (slug === "up" && district) url += `&district=${district}`;
    api.get(url).then((r) => setItems(r.data)).finally(() => setLoading(false));
  }, [slug, district]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <SectionHeader title={REGION_LABELS[slug] || "राज्य समाचार"} subtitle="राज्य एवं जिला" />

      {slug === "up" && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button data-testid="district-tab-all" onClick={() => navigate("/state/up")}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${!district ? "bg-[#B71C1C] text-white border-[#B71C1C]" : "border-border hover:border-[#B71C1C]"}`}>
            संपूर्ण यूपी
          </button>
          {UP_DISTRICTS.map((d) => (
            <button key={d.slug} data-testid={`district-tab-${d.slug}`} onClick={() => navigate(`/state/up?district=${d.slug}`)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${district === d.slug ? "bg-[#B71C1C] text-white border-[#B71C1C]" : "border-border hover:border-[#B71C1C]"}`}>
              {d.hi}
            </button>
          ))}
        </div>
      )}

      {slug === "up" && district && ["ghaziabad", "noida", "greater-noida", "hapur", "lucknow"].includes(district) && (
        <div className="bg-[#D4AC0D]/10 border border-[#D4AC0D]/30 rounded-lg p-3 mb-6 text-sm text-foreground hindi-lh">
          <strong>{DISTRICT_LABELS[district]}</strong> की विशेष कवरेज — प्रशासन, शासन और अधिकारियों के तबादलों पर गहन नज़र।
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-muted-foreground">लोड हो रहा है...</div>
      ) : items.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((a) => <NewsCard key={a.id} article={a} />)}
        </div>
      ) : (
        <div className="py-20 text-center text-muted-foreground">इस क्षेत्र में अभी कोई समाचार उपलब्ध नहीं है।</div>
      )}
    </div>
  );
}
