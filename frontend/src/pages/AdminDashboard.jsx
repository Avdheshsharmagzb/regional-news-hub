import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api, mediaUrl, formatApiError } from "@/lib/api";
import { ArticleImage } from "@/components/ArticleImage";
import { CATEGORY_LABELS, timeAgo } from "@/lib/config";
import { toast } from "sonner";
import {
  RefreshCw, Sparkles, Stamp, Image as ImageIcon, CheckCircle2, XCircle,
  LogOut, Clock, Newspaper, Send, AlertTriangle, Wand2,
} from "lucide-react";

const StatCard = ({ label, value, color }) => (
  <div className="bg-card border border-border rounded-lg p-4">
    <div className="text-2xl font-bold font-num" style={{ color }}>{value}</div>
    <div className="text-xs text-muted-foreground mt-1">{label}</div>
  </div>
);

export default function AdminDashboard() {
  const { user, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("pending");
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [imgPrompt, setImgPrompt] = useState("");
  const [markBreaking, setMarkBreaking] = useState(false);
  const [local, setLocal] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkProgress, setBulkProgress] = useState(null);
  const bulkIvRef = useRef(null);

  useEffect(() => () => { if (bulkIvRef.current) clearInterval(bulkIvRef.current); }, []);

  const LOCAL_FILTERS = [
    { k: "", label: "सभी" },
    { k: "d:ghaziabad", label: "गाज़ियाबाद" },
    { k: "d:noida", label: "नोएडा" },
    { k: "d:greater-noida", label: "ग्रेटर नोएडा" },
    { k: "d:hapur", label: "हापुड़" },
    { k: "d:lucknow", label: "लखनऊ" },
    { k: "r:up", label: "संपूर्ण यूपी" },
    { k: "r:delhi", label: "दिल्ली" },
    { k: "r:haryana", label: "हरियाणा" },
    { k: "r:punjab", label: "पंजाब" },
    { k: "r:rajasthan", label: "राजस्थान" },
    { k: "r:uttarakhand", label: "उत्तराखंड" },
  ];

  useEffect(() => {
    if (!authLoading && !user) navigate("/admin/login");
  }, [authLoading, user, navigate]);

  const loadStats = useCallback(() => {
    api.get("/admin/stats").then((r) => setStats(r.data)).catch(() => {});
  }, []);

  const load = useCallback((t, lf) => {
    setLoading(true);
    let url = `/admin/articles?status=${t}`;
    if (lf) url += lf.startsWith("d:") ? `&district=${lf.slice(2)}` : `&region=${lf.slice(2)}`;
    api.get(url).then((r) => setItems(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (user) { load(tab, local); loadStats(); } }, [user, tab, local, load, loadStats]);

  const aggregate = async () => {
    setBusy("aggregate");
    try {
      const { data } = await api.post("/admin/aggregate");
      toast.success(data.message);
      load("pending", local); loadStats();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(""); }
  };

  const act = async (path, label, body = {}) => {
    if (!selected) return;
    setBusy(label);
    try {
      const { data } = await api.post(`/admin/articles/${selected.id}/${path}`, body);
      if (data.id && (path === "publish" || path === "reject")) {
        toast.success(data.message);
        setSelected(null); load(tab, local); loadStats();
      } else {
        setSelected(data);
        setItems((prev) => prev.map((it) => (it.id === data.id ? data : it)));
        toast.success(label === "rewrite" ? "AI पुनर्लेखन पूर्ण" : label === "watermark" ? "वॉटरमार्क लगाया गया" : "छवि जनरेट हुई");
      }
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(""); }
  };

  const toggleSelect = (id) => setSelectedIds((prev) => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const allSelected = items.length > 0 && items.every((a) => selectedIds.has(a.id));
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(items.map((a) => a.id)));

  const pollBulk = () => {
    if (bulkIvRef.current) clearInterval(bulkIvRef.current);
    const iv = setInterval(async () => {
      try {
        const { data } = await api.get("/admin/bulk-status");
        setBulkProgress(data);
        if (!data.processing) {
          clearInterval(iv);
          bulkIvRef.current = null;
          setBulkProgress(null);
          setSelectedIds(new Set());
          load(tab, local); loadStats();
          toast.success("बल्क AI रीराइट व प्रकाशन पूर्ण");
        }
      } catch { /* ignore */ }
    }, 3000);
    bulkIvRef.current = iv;
  };

  const bulk = async (action) => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    setBusy("bulk-" + action);
    try {
      const { data } = await api.post("/admin/articles/bulk", { ids, action, is_breaking: markBreaking });
      toast.success(data.message);
      if (action === "rewrite_publish") {
        setBulkProgress({ processing: true, done: 0, total: ids.length });
        pollBulk();
      } else {
        setSelectedIds(new Set()); load(tab, local); loadStats();
      }
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(""); }
  };

  if (authLoading || !user) return <div className="py-20 text-center text-muted-foreground">लोड हो रहा है...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-hindi-head text-3xl font-bold flex items-center gap-2"><Wand2 className="w-6 h-6 text-[#7C3AED]" /> AI संपादकीय डैशबोर्ड</h1>
          <p className="text-sm text-muted-foreground">नमस्ते, {user.name} — समाचार एकत्रण, पुनर्लेखन एवं अनुमोदन</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-[#15803D] bg-[#15803D]/10 border border-[#15803D]/30 px-3 py-2 rounded-lg" data-testid="admin-auto-indicator" title={stats.last_auto_run ? `अंतिम ऑटो-अपडेट: ${timeAgo(stats.last_auto_run)}` : "ऑटो-अपडेट सक्रिय"}>
            <span className="w-2 h-2 rounded-full bg-[#15803D] blink-dot" /> ऑटो-अपडेट: हर {stats.auto_interval_minutes ?? 60} मिनट
          </span>
          <button onClick={aggregate} disabled={busy === "aggregate"} data-testid="admin-aggregate-button" className="inline-flex items-center gap-2 bg-[#B71C1C] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#961616] disabled:opacity-60">
            <RefreshCw className={`w-4 h-4 ${busy === "aggregate" ? "animate-spin" : ""}`} /> समाचार लाएँ
          </button>
          <button onClick={() => { logout(); navigate("/"); }} data-testid="admin-logout-button" className="inline-flex items-center gap-2 border border-border px-3 py-2 rounded-lg text-sm hover:bg-muted"><LogOut className="w-4 h-4" /> लॉगआउट</button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="अनुमोदन हेतु लंबित" value={stats.pending ?? 0} color="#B45309" />
        <StatCard label="प्रकाशित" value={stats.published ?? 0} color="#15803D" />
        <StatCard label="अस्वीकृत" value={stats.rejected ?? 0} color="#DC2626" />
        <StatCard label="विज्ञापन अनुरोध" value={stats.inquiries ?? 0} color="#7C3AED" />
      </div>

      <div className="flex gap-1 mb-4 border-b border-border">
        {[["pending", "लंबित"], ["published", "प्रकाशित"], ["rejected", "अस्वीकृत"]].map(([k, l]) => (
          <button key={k} onClick={() => { setTab(k); setSelected(null); setSelectedIds(new Set()); }} data-testid={`admin-tab-${k}`}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${tab === k ? "border-[#B71C1C] text-[#B71C1C]" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{l}</button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4" data-testid="admin-local-filters">
        {LOCAL_FILTERS.map((f) => (
          <button key={f.k || "all"} onClick={() => { setLocal(f.k); setSelected(null); setSelectedIds(new Set()); }} data-testid={`admin-filter-${f.k || "all"}`}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${local === f.k ? "bg-[#B71C1C] text-white border-[#B71C1C]" : "border-border text-muted-foreground hover:border-[#B71C1C] hover:text-[#B71C1C]"}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Queue */}
        <div className="lg:col-span-5">
          {tab === "pending" && items.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-2.5 mb-3 flex items-center gap-2 flex-wrap" data-testid="admin-bulk-bar">
              <label className="flex items-center gap-1.5 text-sm font-semibold cursor-pointer">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} data-testid="admin-select-all" className="w-4 h-4 accent-[#B71C1C]" />
                सभी चुनें
              </label>
              <span className="text-xs text-muted-foreground">({selectedIds.size} चयनित)</span>
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-1.5 ml-auto flex-wrap">
                  <button onClick={() => bulk("rewrite_publish")} disabled={!!busy || bulkProgress} data-testid="admin-bulk-rewrite-publish" className="inline-flex items-center gap-1.5 bg-[#7C3AED] text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#6D28D9] disabled:opacity-60">
                    <Sparkles className="w-3.5 h-3.5" /> AI रीराइट + प्रकाशित
                  </button>
                  <button onClick={() => bulk("publish")} disabled={!!busy || bulkProgress} data-testid="admin-bulk-publish" className="inline-flex items-center gap-1.5 bg-[#15803D] text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#126732] disabled:opacity-60">
                    <CheckCircle2 className="w-3.5 h-3.5" /> प्रकाशित
                  </button>
                  <button onClick={() => bulk("reject")} disabled={!!busy || bulkProgress} data-testid="admin-bulk-reject" className="inline-flex items-center gap-1.5 border border-[#DC2626] text-[#DC2626] px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#DC2626]/10 disabled:opacity-60">
                    <XCircle className="w-3.5 h-3.5" /> अस्वीकार
                  </button>
                </div>
              )}
            </div>
          )}

          {bulkProgress && (
            <div className="bg-[#7C3AED]/10 border border-[#7C3AED]/30 rounded-lg p-3 mb-3" data-testid="admin-bulk-progress">
              <div className="flex items-center justify-between text-xs font-semibold text-[#7C3AED] mb-1.5">
                <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 animate-pulse" /> AI रीराइट व प्रकाशन चल रहा है...</span>
                <span className="font-num">{bulkProgress.done}/{bulkProgress.total}</span>
              </div>
              <div className="h-1.5 bg-[#7C3AED]/20 rounded-full overflow-hidden">
                <div className="h-full bg-[#7C3AED] transition-all duration-500" style={{ width: `${bulkProgress.total ? (bulkProgress.done / bulkProgress.total) * 100 : 0}%` }} />
              </div>
            </div>
          )}

          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          {loading ? <div className="py-16 text-center text-muted-foreground">लोड हो रहा है...</div>
            : !items.length ? <div className="py-16 text-center text-muted-foreground"><Newspaper className="w-10 h-10 mx-auto mb-2 opacity-40" />कोई समाचार नहीं। "समाचार लाएँ" दबाएँ।</div>
            : items.map((a) => (
              <div key={a.id} className={`w-full p-3 rounded-lg border flex gap-2.5 transition-colors ${selected?.id === a.id ? "border-[#B71C1C] bg-[#B71C1C]/5" : "border-border bg-card hover:bg-muted/40"}`}>
                {tab === "pending" && (
                  <input type="checkbox" checked={selectedIds.has(a.id)} onChange={() => toggleSelect(a.id)} data-testid={`admin-select-${a.id}`} className="mt-1 w-4 h-4 accent-[#B71C1C] shrink-0" onClick={(e) => e.stopPropagation()} />
                )}
                <button onClick={() => { setSelected(a); setMarkBreaking(a.is_breaking); }} data-testid={`admin-queue-item-${a.id}`} className="flex gap-3 text-left min-w-0 flex-1">
                  {a.image_url && <img src={mediaUrl(a.image_url)} alt="" className="w-20 h-16 object-cover rounded-md shrink-0" />}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#D4AC0D]/15 text-[#B71C1C] dark:text-[#D4AC0D]">{CATEGORY_LABELS[a.category]}</span>
                      {a.ai_rewritten && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#7C3AED]/15 text-[#7C3AED]">AI</span>}
                      {a.watermarked && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#15803D]/15 text-[#15803D]">WM</span>}
                    </div>
                    <div className="font-hindi-body font-semibold text-sm line-clamp-2 text-foreground">{a.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(a.created_at)} • {a.source_name}</div>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Workspace */}
        <div className="lg:col-span-7">
          {!selected ? (
            <div className="border border-dashed border-border rounded-xl p-16 text-center text-muted-foreground h-full flex flex-col items-center justify-center">
              <Wand2 className="w-10 h-10 mb-3 opacity-40" />
              समाचार चुनें और AI पुनर्लेखन, वॉटरमार्क व अनुमोदन करें।
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <ArticleImage src={selected.image_url} alt={selected.title} ratio="aspect-video" className="rounded-lg" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">मूल शीर्षक</div>
                  <div className="font-hindi-body text-sm text-foreground">{selected.original_title || selected.title}</div>
                </div>
                <div className={`rounded-lg border p-3 ${selected.ai_rewritten ? "border-[#7C3AED]/40 bg-[#7C3AED]/5" : "border-border"}`}>
                  <div className="text-xs font-bold uppercase tracking-widest text-[#7C3AED] mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI पुनर्लेखित शीर्षक</div>
                  <div className="font-hindi-body text-sm font-semibold text-foreground">{selected.ai_rewritten ? selected.title : "— अभी पुनर्लेखन नहीं हुआ —"}</div>
                </div>
              </div>

              <div className="rounded-lg border border-border p-3 max-h-56 overflow-y-auto">
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">लेख सामग्री</div>
                <p className="font-hindi-body text-sm hindi-lh text-foreground whitespace-pre-line">{selected.body || selected.summary}</p>
              </div>

              {selected.category === "lifestyle" && (
                <div className="flex gap-2">
                  <input value={imgPrompt} onChange={(e) => setImgPrompt(e.target.value)} placeholder="AI छवि हेतु विवरण लिखें..." data-testid="admin-image-prompt" className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm outline-none focus:border-[#7C3AED]" />
                  <button onClick={() => act("generate-image", "genimg", { prompt: imgPrompt || selected.title })} disabled={busy === "genimg"} data-testid="admin-generate-image-button" className="inline-flex items-center gap-1.5 bg-[#0EA5E9] text-white px-3 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-60">
                    <ImageIcon className="w-4 h-4" /> {busy === "genimg" ? "..." : "AI छवि"}
                  </button>
                </div>
              )}

              {tab === "pending" && (
                <>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => act("rewrite", "rewrite")} disabled={busy === "rewrite"} data-testid="admin-ai-rewrite-button" className="inline-flex items-center gap-1.5 bg-[#7C3AED] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#6D28D9] disabled:opacity-60">
                      <Sparkles className={`w-4 h-4 ${busy === "rewrite" ? "animate-pulse" : ""}`} /> {busy === "rewrite" ? "पुनर्लेखन..." : "AI पुनर्लेखन"}
                    </button>
                    <button onClick={() => act("watermark", "watermark")} disabled={busy === "watermark" || !selected.image_url} title={!selected.image_url ? "इस समाचार में कोई छवि नहीं है" : "छवि पर वॉटरमार्क लगाएँ"} data-testid="admin-watermark-button" className="inline-flex items-center gap-1.5 border border-border px-4 py-2 rounded-lg text-sm font-semibold hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed">
                      <Stamp className={`w-4 h-4 ${busy === "watermark" ? "animate-pulse" : ""}`} /> वॉटरमार्क लगाएँ
                    </button>
                  </div>

                  {!selected.ai_rewritten && (
                    <div className="flex items-start gap-2 text-xs text-[#B45309] bg-[#B45309]/10 rounded-lg p-2.5">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> प्रकाशन से पहले कॉपीराइट सुरक्षा हेतु AI पुनर्लेखन की सलाह दी जाती है।
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={markBreaking} onChange={(e) => setMarkBreaking(e.target.checked)} data-testid="admin-breaking-checkbox" className="w-4 h-4 accent-[#B71C1C]" />
                    ब्रेकिंग न्यूज़ के रूप में चिह्नित करें
                  </label>

                  <div className="flex gap-2 pt-1 border-t border-border">
                    <button onClick={() => act("publish", "publish", { is_breaking: markBreaking })} disabled={busy === "publish"} data-testid="admin-approve-news-button" className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#15803D] text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-[#126732] disabled:opacity-60">
                      <CheckCircle2 className="w-4 h-4" /> अनुमोदित करें एवं प्रकाशित करें
                    </button>
                    <button onClick={() => act("reject", "reject")} disabled={busy === "reject"} data-testid="admin-reject-news-button" className="inline-flex items-center justify-center gap-1.5 border border-[#DC2626] text-[#DC2626] px-4 py-2.5 rounded-lg font-semibold hover:bg-[#DC2626]/10 disabled:opacity-60">
                      <XCircle className="w-4 h-4" /> अस्वीकार
                    </button>
                  </div>
                </>
              )}

              {tab !== "pending" && (
                <div className="text-sm text-muted-foreground flex items-center gap-2"><Send className="w-4 h-4" /> यह समाचार {tab === "published" ? "प्रकाशित" : "अस्वीकृत"} है।</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
