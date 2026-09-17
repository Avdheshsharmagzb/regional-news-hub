import { mediaUrl } from "@/lib/api";

export const ArticleImage = ({ src, alt, className = "", ratio = "aspect-video", showBadge = true }) => {
  return (
    <div className={`relative overflow-hidden bg-muted ${ratio} ${className}`}>
      {src ? (
        <img
          src={mediaUrl(src)}
          alt={alt}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => { e.currentTarget.style.opacity = "0.25"; }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground font-brand text-sm">
          गाज़ियाबाद टाइम्स
        </div>
      )}
      {showBadge && <span className="wm-badge">गाज़ियाबाद टाइम्स ©</span>}
    </div>
  );
};
