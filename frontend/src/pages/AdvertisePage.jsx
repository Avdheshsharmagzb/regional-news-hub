import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { SectionHeader } from "@/components/SectionHeader";
import { Check, Megaphone, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function AdvertisePage() {
  const [packages, setPackages] = useState([]);
  const [selected, setSelected] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.get("/ad-packages").then((r) => { setPackages(r.data); setSelected(r.data[0]?.id || ""); });
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post("/ad-inquiry", { ...form, package_id: selected });
      setDone(true);
      toast.success(data.message);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#B71C1C]/10 text-[#B71C1C] font-semibold text-sm mb-3">
          <Megaphone className="w-4 h-4" /> विज्ञापन दें
        </div>
        <h1 className="font-hindi-head text-4xl sm:text-5xl font-bold text-foreground">अपने व्यवसाय को लाखों तक पहुँचाएँ</h1>
        <p className="text-muted-foreground mt-3 hindi-lh max-w-2xl mx-auto">गाज़ियाबाद टाइम्स पर विज्ञापन देकर गाज़ियाबाद, नोएडा और पूरे एनसीआर के पाठकों तक पहुँचें।</p>
      </div>

      <SectionHeader title="विज्ञापन पैकेज" subtitle="Packages" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {packages.map((p) => (
          <button key={p.id} onClick={() => setSelected(p.id)} data-testid={`ad-package-${p.id}`}
            className={`text-left rounded-xl border-2 p-5 transition-all ${selected === p.id ? "border-[#B71C1C] bg-[#B71C1C]/5 shadow-md" : "border-border bg-card hover:border-[#B71C1C]/50"}`}>
            <div className="font-hindi-body font-bold text-lg text-foreground">{p.name}</div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-num text-2xl font-bold text-[#B71C1C]">₹{p.price.toLocaleString("en-IN")}</span>
              <span className="text-xs text-muted-foreground">/ {p.duration}</span>
            </div>
            <ul className="mt-4 space-y-2">
              {p.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-[#15803D] shrink-0 mt-0.5" /> {f}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto bg-card border border-border rounded-xl p-6 sm:p-8">
        {done ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-16 h-16 text-[#15803D] mx-auto mb-4" />
            <h3 className="font-hindi-head text-2xl font-bold mb-2">धन्यवाद!</h3>
            <p className="text-muted-foreground hindi-lh">आपका विज्ञापन अनुरोध प्राप्त हो गया है। हमारी टीम भुगतान विवरण के साथ 24 घंटे में आपसे संपर्क करेगी।</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <h3 className="font-hindi-head text-2xl font-bold">विज्ञापन बुकिंग फ़ॉर्म</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input required placeholder="आपका नाम *" data-testid="ad-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-input bg-background outline-none focus:border-[#B71C1C]" />
              <input required placeholder="फ़ोन नंबर *" data-testid="ad-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-input bg-background outline-none focus:border-[#B71C1C]" />
              <input required type="email" placeholder="ईमेल *" data-testid="ad-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-input bg-background outline-none focus:border-[#B71C1C]" />
              <input placeholder="कंपनी / व्यवसाय" data-testid="ad-company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-input bg-background outline-none focus:border-[#B71C1C]" />
            </div>
            <select value={selected} onChange={(e) => setSelected(e.target.value)} data-testid="ad-package-select" className="w-full px-4 py-2.5 rounded-lg border border-input bg-background outline-none focus:border-[#B71C1C]">
              {packages.map((p) => <option key={p.id} value={p.id}>{p.name} — ₹{p.price.toLocaleString("en-IN")}</option>)}
            </select>
            <textarea placeholder="संदेश / आवश्यकताएँ" rows={3} data-testid="ad-message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-input bg-background outline-none focus:border-[#B71C1C]" />
            <button type="submit" disabled={submitting} data-testid="advertise-submit-payment-button" className="w-full bg-[#B71C1C] text-white py-3 rounded-lg font-semibold hover:bg-[#961616] transition-colors disabled:opacity-60">
              {submitting ? "भेजा जा रहा है..." : "बुकिंग अनुरोध भेजें"}
            </button>
            <p className="text-xs text-muted-foreground text-center">अनुरोध भेजने पर हमारी टीम भुगतान (UPI / कार्ड / बैंक ट्रांसफर) का विवरण साझा करेगी।</p>
          </form>
        )}
      </div>
    </div>
  );
}
