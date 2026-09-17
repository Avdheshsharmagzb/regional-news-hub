import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { NewsCard } from "@/components/NewsCard";
import { SectionHeader } from "@/components/SectionHeader";

export default function NcrPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/articles?ncr=true&limit=40").then((r) => setItems(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <SectionHeader title="दिल्ली एनसीआर" subtitle="एकीकृत कवरेज" />
      <p className="text-sm text-muted-foreground mb-6 hindi-lh -mt-2">दिल्ली, नोएडा, ग्रेटर नोएडा, गाज़ियाबाद, हरियाणा और राजस्थान की ताज़ा खबरें एक ही जगह।</p>
      {loading ? (
        <div className="py-20 text-center text-muted-foreground">लोड हो रहा है...</div>
      ) : items.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((a) => <NewsCard key={a.id} article={a} />)}
        </div>
      ) : (
        <div className="py-20 text-center text-muted-foreground">एनसीआर से अभी कोई समाचार उपलब्ध नहीं है।</div>
      )}
    </div>
  );
}
