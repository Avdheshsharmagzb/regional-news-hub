export const SectionHeader = ({ title, subtitle, action }) => (
  <div className="flex items-end justify-between mb-5">
    <div className="section-bar">
      {subtitle && <div className="text-xs font-bold uppercase tracking-widest text-[#D4AC0D] mb-1">{subtitle}</div>}
      <h2 className="font-hindi-head text-2xl sm:text-3xl font-bold text-foreground leading-tight">{title}</h2>
    </div>
    {action}
  </div>
);
