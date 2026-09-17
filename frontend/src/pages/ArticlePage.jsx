import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, mediaUrl } from "@/lib/api";
import { ArticleImage } from "@/components/ArticleImage";
import { NewsCard } from "@/components/NewsCard";
import { CATEGORY_LABELS, DISTRICT_LABELS, REGION_LABELS, timeAgo } from "@/lib/config";
import { ShieldCheck, Share2, Sparkles } from "lucide-react";

export default function ArticlePage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    window.scrollTo(0, 0);
    api.get(`/articles/${id}`).then((r) => setData(r.data)).catch(() => setData(null)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-20 text-center text-muted-foreground">लोड हो रहा है...</div>;
  if (!data) return <div className="max-w-3xl mx-auto px-4 py-20 text-center text-muted-foreground">समाचार नहीं मिला।</div>;

  const a = data.article;
  const tag = a.district ? DISTRICT_LABELS[a.district] : a.region ? REGION_LABELS[a.region] : CATEGORY_LABELS[a.category];

  const share = () => {
    if (navigator.share) navigator.share({ title: a.title, url: window.location.href });
    else navigator.clipboard.writeText(window.location.href);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#D4AC0D]/15 text-[#B71C1C] dark:text-[#D4AC0D] border border-[#D4AC0D]/30">{tag}</span>
        {a.is_breaking && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#B71C1C] text-white">ब्रेकिंग</span>}
        {a.ai_rewritten && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#7C3AED]/15 text-[#7C3AED] border border-[#7C3AED]/30"><Sparkles className="w-3 h-3" /> AI संपादित</span>}
      </div>

      <h1 className="font-hindi-body font-bold text-3xl sm:text-4xl leading-snug text-foreground mb-3">{a.title}</h1>

      <div className="flex items-center justify-between text-sm text-muted-foreground border-y border-border py-3 mb-5">
        <span>{timeAgo(a.published_at)} • स्रोत: {a.source_name}</span>
        <button onClick={share} data-testid="article-share-button" className="inline-flex items-center gap-1.5 hover:text-[#B71C1C]"><Share2 className="w-4 h-4" /> शेयर</button>
      </div>

      <ArticleImage src={a.image_url} alt={a.title} ratio="aspect-video" className="rounded-xl mb-6" />

      <article className="prose prose-lg max-w-none">
        {a.body.split("\n").filter(Boolean).map((p, i) => (
          <p key={i} className="font-hindi-body text-base sm:text-lg hindi-lh text-foreground mb-4">{p}</p>
        ))}
      </article>

      {a.source_url && !a.source_url.startsWith("seed") && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 mt-6 hindi-lh">
          <ShieldCheck className="w-4 h-4 text-[#15803D] shrink-0" />
          यह समाचार गाज़ियाबाद टाइम्स द्वारा मौलिक रूप से पुनर्लेखित है। मूल तथ्य एवं आँकड़े सुरक्षित रखे गए हैं।
        </div>
      )}

      {data.related?.length > 0 && (
        <div className="mt-12">
          <h3 className="font-hindi-head text-2xl font-bold section-bar mb-5">संबंधित समाचार</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.related.map((r) => <NewsCard key={r.id} article={r} />)}
          </div>
        </div>
      )}

      <Link to="/" className="inline-block mt-8 text-[#B71C1C] font-semibold hover:underline">← मुख्य पृष्ठ पर लौटें</Link>
    </div>
  );
}
