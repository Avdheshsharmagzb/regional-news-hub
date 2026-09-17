import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { Lock } from "lucide-react";
import { toast } from "sonner";

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("स्वागत है, संपादक जी!");
      navigate("/admin");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-lg">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-[#7C3AED]/10 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6 text-[#7C3AED]" />
          </div>
          <h1 className="font-hindi-head text-3xl font-bold">AI संपादकीय डैशबोर्ड</h1>
          <p className="text-sm text-muted-foreground mt-1">केवल अधिकृत संपादकों के लिए</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <input required type="email" placeholder="ईमेल" data-testid="admin-email-input" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-input bg-background outline-none focus:border-[#7C3AED]" />
          <input required type="password" placeholder="पासवर्ड" data-testid="admin-password-input" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-input bg-background outline-none focus:border-[#7C3AED]" />
          <button type="submit" disabled={loading} data-testid="admin-login-button" className="w-full bg-[#7C3AED] text-white py-3 rounded-lg font-semibold hover:bg-[#6D28D9] transition-colors disabled:opacity-60">
            {loading ? "प्रवेश हो रहा है..." : "लॉग इन करें"}
          </button>
        </form>
      </div>
    </div>
  );
}
