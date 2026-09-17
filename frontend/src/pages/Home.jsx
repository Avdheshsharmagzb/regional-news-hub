import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { NewsCard } from "@/components/NewsCard";
import { SectionHeader } from "@/components/SectionHeader";
import { ArticleImage } from "@/components/ArticleImage";
import { Link } from "react-router-dom";
import { CATEGORY_LABELS, CATEGORIES, timeAgo } from "@/lib/config";

const HeroCard = ({ a }) => (
  <Link to={`/article/${a.id}`} data-testid="article-card-hero" className="group relative rounded-xl overflow-hidden border border-border bg-card block">
    <ArticleImage src={a.image_url} alt={a.title} ratio="aspect-[16/10]" />
    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
    <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7">
      {a.is_breaking && <span className="inline-block mb-2 px-3 py-1 rounded-full text-xs font-bold bg-[#B71C1C] text-white">ब्रेकिंग न्यूज़</span>}
      <h1 className="font-hindi-body text-white font-bold text-2xl sm:text-4xl leading-snug group-hover:text-[#D4AC0D] transition-colors">{a.title}</h1>
      <p className="text-gray-200 text-sm mt-2 line-clamp-2 hidden sm:block hindi-lh">{a.summary}</p>
      <div className="text-xs text-gray-300 mt-2">{timeAgo(a.published_at)} • {a.source_name}</div>
    </div>
  </Link>
);

export default function Home() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/articles?limit=48").then((r) => setArticles(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-muted-foreground">लोड हो रहा है...</div>;
  if (!articles.length) return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-muted-foreground">फ़िलहाल कोई समाचार उपलब्ध नहीं है।</div>;

  const hero = articles.find((a) => a.is_breaking) || articles[0];
  const side = articles.filter((a) => a.id !== hero.id).slice(0, 4);
  const byCat = (cat) => articles.filter((a) => a.category === cat).slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Hero bento */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-10">
        <div className="lg:col-span-8"><HeroCard a={hero} /></div>
        <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
          {side.map((a) => <NewsCard key={a.id} article={a} />)}
        </div>
      </motion.div>

      {/* Ad slot */}
      <div className="bg-muted/50 border border-dashed border-muted-foreground/30 p-4 rounded-lg text-center text-xs text-muted-foreground mb-10">
        विज्ञापन स्थान — <Link to="/advertise" className="text-[#B71C1C] font-semibold underline">यहाँ अपना विज्ञापन दें</Link>
      </div>

      {/* Category sections */}
      {CATEGORIES.filter((c) => c.slug !== "breaking").map((c) => {
        const list = byCat(c.slug);
        if (!list.length) return null;
        return (
          <section key={c.slug} className="mb-12">
            <SectionHeader title={CATEGORY_LABELS[c.slug]} subtitle={c.en}
              action={<Link to={`/category/${c.slug}`} className="text-sm font-semibold text-[#B71C1C] hover:underline">और देखें →</Link>} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {list.map((a) => <NewsCard key={a.id} article={a} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}
