import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { ArticleImage } from "@/components/ArticleImage";
import { CATEGORY_LABELS, DISTRICT_LABELS, REGION_LABELS, timeAgo } from "@/lib/config";

export const NewsCard = ({ article, size = "md" }) => {
  const tag = article.district
    ? DISTRICT_LABELS[article.district]
    : article.region
    ? REGION_LABELS[article.region]
    : CATEGORY_LABELS[article.category];

  return (
    <Link
      to={`/article/${article.id}`}
      data-testid={`article-card-${article.id}`}
      className="group bg-card border border-border rounded-lg overflow-hidden flex flex-col shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
    >
      <ArticleImage src={article.image_url} alt={article.title} ratio={size === "lg" ? "aspect-video" : "aspect-[4/3]"} />
      <div className="p-3.5 flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#D4AC0D]/15 text-[#B71C1C] dark:text-[#D4AC0D] border border-[#D4AC0D]/30">
            {tag}
          </span>
          {article.is_breaking && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#B71C1C] text-white">
              ब्रेकिंग
            </span>
          )}
        </div>
        <h3 className={`font-hindi-body font-semibold text-foreground group-hover:text-[#B71C1C] transition-colors leading-snug ${size === "lg" ? "text-xl sm:text-2xl" : "text-base"}`}>
          {article.title}
        </h3>
        {size === "lg" && article.summary && (
          <p className="text-sm text-muted-foreground hindi-lh line-clamp-2">{article.summary}</p>
        )}
        <div className="mt-auto flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
          <Clock className="w-3.5 h-3.5" />
          <span>{timeAgo(article.published_at || article.created_at)}</span>
          <span className="mx-1">•</span>
          <span className="truncate">{article.source_name}</span>
        </div>
      </div>
    </Link>
  );
};
