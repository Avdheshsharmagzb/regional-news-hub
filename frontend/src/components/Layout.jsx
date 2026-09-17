import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, X, Search, Sun, Moon, Megaphone, ChevronDown, MapPin, Youtube, Facebook, Instagram, Twitter } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { CATEGORIES, REGIONS, UP_DISTRICTS } from "@/lib/config";
import { Ticker } from "@/components/Ticker";

const todayHindi = () =>
  new Date().toLocaleDateString("hi-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const SocialLinks = ({ className = "" }) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <a href="https://youtube.com" target="_blank" rel="noreferrer" data-testid="social-youtube" className="hover:text-[#D4AC0D] transition-colors"><Youtube className="w-4.5 h-4.5" /></a>
    <a href="https://facebook.com" target="_blank" rel="noreferrer" data-testid="social-facebook" className="hover:text-[#D4AC0D] transition-colors"><Facebook className="w-4.5 h-4.5" /></a>
    <a href="https://instagram.com" target="_blank" rel="noreferrer" data-testid="social-instagram" className="hover:text-[#D4AC0D] transition-colors"><Instagram className="w-4.5 h-4.5" /></a>
    <a href="https://twitter.com" target="_blank" rel="noreferrer" data-testid="social-twitter" className="hover:text-[#D4AC0D] transition-colors"><Twitter className="w-4.5 h-4.5" /></a>
  </div>
);

export const Layout = ({ children }) => {
  const { theme, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [statesOpen, setStatesOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const doSearch = (e) => {
    e.preventDefault();
    if (q.trim()) { navigate(`/search?q=${encodeURIComponent(q.trim())}`); setMenuOpen(false); }
  };

  const navClass = ({ isActive }) =>
    `px-3 py-2 text-sm font-semibold rounded-md transition-colors ${isActive ? "text-[#B71C1C]" : "text-foreground hover:text-[#B71C1C]"}`;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Utility bar */}
      <div className="bg-[#B71C1C] text-white text-xs">
        <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center justify-between">
          <span className="font-hindi-body hidden sm:inline">{todayHindi()}</span>
          <span className="font-hindi-body sm:hidden flex items-center gap-1"><MapPin className="w-3 h-3" /> गाज़ियाबाद 32°C</span>
          <div className="flex items-center gap-4">
            <span className="hidden md:flex items-center gap-1"><MapPin className="w-3 h-3" /> गाज़ियाबाद 32°C</span>
            <SocialLinks className="text-white" />
            <button data-testid="theme-toggle-button" onClick={toggle} className="flex items-center gap-1 hover:text-[#D4AC0D] transition-colors">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Brand header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/" data-testid="brand-logo" className="flex flex-col leading-none">
            <span className="font-hindi-head text-2xl sm:text-4xl text-[#B71C1C] font-bold">गाज़ियाबाद टाइम्स</span>
            <span className="font-brand text-[10px] sm:text-xs tracking-[0.35em] text-muted-foreground uppercase">Ghaziabad Times</span>
          </Link>
          <form onSubmit={doSearch} className="hidden md:flex items-center bg-muted rounded-full px-3 py-1.5 flex-1 max-w-xs">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input data-testid="search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="समाचार खोजें..." className="bg-transparent outline-none px-2 text-sm w-full font-hindi-body" />
          </form>
          <div className="flex items-center gap-2">
            <Link to="/advertise" data-testid="advertise-cta" className="hidden sm:inline-flex items-center gap-1.5 bg-[#B71C1C] text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-[#961616] transition-colors">
              <Megaphone className="w-4 h-4" /> विज्ञापन दें
            </Link>
            <button data-testid="mobile-menu-toggle" onClick={() => setMenuOpen(!menuOpen)} className="lg:hidden p-2 text-foreground">
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Sticky nav */}
      <nav className="sticky top-0 z-40 backdrop-blur-md bg-card/90 border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 hidden lg:flex items-center gap-1">
          <NavLink to="/" end className={navClass} data-testid="nav-home">मुख्य समाचार</NavLink>
          {CATEGORIES.map((c) => (
            <NavLink key={c.slug} to={`/category/${c.slug}`} className={navClass} data-testid={`nav-cat-${c.slug}`}>{c.hi}</NavLink>
          ))}
          <div className="relative" onMouseEnter={() => setStatesOpen(true)} onMouseLeave={() => setStatesOpen(false)}>
            <button className="px-3 py-2 text-sm font-semibold text-foreground hover:text-[#B71C1C] flex items-center gap-1" data-testid="nav-states">
              राज्य एवं जिला <ChevronDown className="w-4 h-4" />
            </button>
            {statesOpen && (
              <div className="absolute left-0 top-full bg-card border border-border rounded-lg shadow-xl p-3 w-[420px] grid grid-cols-2 gap-1 z-50">
                <Link to="/ncr" className="col-span-2 px-3 py-2 rounded-md text-sm font-bold text-[#B71C1C] bg-[#B71C1C]/5 hover:bg-[#B71C1C]/10" data-testid="nav-ncr">दिल्ली एनसीआर (एकीकृत)</Link>
                {REGIONS.map((r) => (
                  <Link key={r.slug} to={`/state/${r.slug}`} className="px-3 py-2 rounded-md text-sm font-semibold text-foreground hover:bg-muted" data-testid={`nav-state-${r.slug}`}>{r.hi}</Link>
                ))}
                <div className="col-span-2 border-t border-border mt-1 pt-2 text-[11px] font-bold uppercase tracking-widest text-[#D4AC0D] px-3">यूपी जिले</div>
                {UP_DISTRICTS.map((d) => (
                  <Link key={d.slug} to={`/state/up?district=${d.slug}`} className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground" data-testid={`nav-district-${d.slug}`}>{d.hi}</Link>
                ))}
              </div>
            )}
          </div>
          <div className="ml-auto">
            <NavLink to="/admin" className="px-3 py-2 text-sm font-semibold text-[#7C3AED] hover:underline" data-testid="nav-admin">AI डैशबोर्ड</NavLink>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden bg-card border-b border-border px-4 py-3 space-y-1" data-testid="mobile-menu">
          <form onSubmit={doSearch} className="flex items-center bg-muted rounded-full px-3 py-2 mb-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="समाचार खोजें..." className="bg-transparent outline-none px-2 text-sm w-full" />
          </form>
          <Link to="/" onClick={() => setMenuOpen(false)} className="block px-3 py-2 rounded-md font-semibold hover:bg-muted">मुख्य समाचार</Link>
          {CATEGORIES.map((c) => (
            <Link key={c.slug} to={`/category/${c.slug}`} onClick={() => setMenuOpen(false)} className="block px-3 py-2 rounded-md font-semibold hover:bg-muted">{c.hi}</Link>
          ))}
          <Link to="/ncr" onClick={() => setMenuOpen(false)} className="block px-3 py-2 rounded-md font-bold text-[#B71C1C] hover:bg-muted">दिल्ली एनसीआर</Link>
          {REGIONS.map((r) => (
            <Link key={r.slug} to={`/state/${r.slug}`} onClick={() => setMenuOpen(false)} className="block px-3 py-2 rounded-md hover:bg-muted">{r.hi}</Link>
          ))}
          <Link to="/advertise" onClick={() => setMenuOpen(false)} className="block px-3 py-2 rounded-md font-semibold text-white bg-[#B71C1C]">विज्ञापन दें</Link>
          <Link to="/admin" onClick={() => setMenuOpen(false)} className="block px-3 py-2 rounded-md font-semibold text-[#7C3AED]">AI डैशबोर्ड</Link>
        </div>
      )}

      <Ticker />

      <main className="flex-1 w-full">{children}</main>

      {/* Footer */}
      <footer className="bg-[#1A1A1A] dark:bg-black text-gray-300 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="font-hindi-head text-3xl text-[#B71C1C] font-bold mb-2">गाज़ियाबाद टाइम्स</div>
            <p className="text-sm text-gray-400 hindi-lh max-w-md">गाज़ियाबाद, दिल्ली-एनसीआर, उत्तर प्रदेश और भारत की विश्वसनीय हिंदी समाचार सेवा। तेज़, सटीक और निष्पक्ष पत्रकारिता।</p>
            <SocialLinks className="mt-4 text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3">श्रेणियाँ</h4>
            <ul className="space-y-2 text-sm">
              {CATEGORIES.map((c) => <li key={c.slug}><Link to={`/category/${c.slug}`} className="hover:text-[#D4AC0D]">{c.hi}</Link></li>)}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3">कानूनी</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/disclaimer" className="hover:text-[#D4AC0D]" data-testid="footer-disclaimer">अस्वीकरण (Disclaimer)</Link></li>
              <li><Link to="/disclaimer" className="hover:text-[#D4AC0D]">नियम एवं शर्तें</Link></li>
              <li><Link to="/advertise" className="hover:text-[#D4AC0D]">विज्ञापन दें</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-4 py-4 text-xs text-gray-400 hindi-lh">
            <p className="mb-2 font-semibold text-gray-300" data-testid="jurisdiction-clause">
              किसी भी तरह की कानूनी कार्यवाही या विवाद की स्थिति में न्यायिक क्षेत्र (Jurisdiction) केवल गाजियाबाद, उत्तर प्रदेश तक ही सीमित होगा।
            </p>
            <p>© {new Date().getFullYear()} गाज़ियाबाद टाइम्स। सर्वाधिकार सुरक्षित।</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
