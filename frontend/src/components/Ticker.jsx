import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";

export const Ticker = () => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.get("/ticker").then((r) => setItems(r.data)).catch(() => {});
  }, []);

  if (!items.length) return null;
  const loop = [...items, ...items];

  return (
    <div data-testid="breaking-news-ticker" className="bg-[#1A1A1A] dark:bg-black text-white border-y border-[#B71C1C]/40">
      <div className="max-w-7xl mx-auto flex items-stretch">
        <div className="flex items-center gap-2 bg-[#B71C1C] px-4 py-2 font-bold text-sm shrink-0">
          <span className="w-2 h-2 rounded-full bg-white blink-dot" />
          <span className="font-hindi-body whitespace-nowrap">ताज़ा ख़बर</span>
        </div>
        <div className="ticker-wrap overflow-hidden flex-1 flex items-center">
          <div className="ticker-track">
            {loop.map((it, i) => (
              <Link key={i} to={`/article/${it.id}`} className="inline-flex items-center gap-2 px-6 py-2 text-sm hover:text-[#D4AC0D] transition-colors">
                {it.is_breaking && <span className="text-[#D4AC0D] font-bold text-xs">●</span>}
                {it.title}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
