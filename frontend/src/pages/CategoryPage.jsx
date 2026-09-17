import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { NewsCard } from "@/components/NewsCard";
import { SectionHeader } from "@/components/SectionHeader";
import { CATEGORY_LABELS } from "@/lib/config";

export default function CategoryPage() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const q = params.get("q");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const isSearch = slug === undefined && q;
  const title = isSearch ? `खोज परिणाम: "${q}"` : slug === "breaking" ? "ब्रेकिंग न्यूज़" : CATEGORY_LABELS[slug] || "समाचार";

  useEffect(() => {
    setLoading(true);
    const url = isSearch ? `/articles?q=${encodeURIComponent(q)}&limit=40`
      : slug === "breaking" ? "/articles?breaking=true&limit=40"
      : `/articles?category=${slug}&limit=40`;
    api.get(url).then((r) => setItems(r.data)).finally(() => setLoading(false));
  }, [slug, q, isSearch]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <SectionHeader title={title} subtitle="गाज़ियाबाद टाइम्स" />
      {loading ? (
        <div className="py-20 text-center text-muted-foreground">लोड हो रहा है...</div>
      ) : items.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((a) => <NewsCard key={a.id} article={a} />)}
        </div>
      ) : (
        <div className="py-20 text-center text-muted-foreground">इस श्रेणी में अभी कोई समाचार उपलब्ध नहीं है।</div>
      )}
    </div>
  );
}
