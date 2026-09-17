import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { Layout } from "@/components/Layout";
import Home from "@/pages/Home";
import CategoryPage from "@/pages/CategoryPage";
import RegionPage from "@/pages/RegionPage";
import NcrPage from "@/pages/NcrPage";
import ArticlePage from "@/pages/ArticlePage";
import AdvertisePage from "@/pages/AdvertisePage";
import DisclaimerPage from "@/pages/DisclaimerPage";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";

function App() {
  return (
    <div className="App">
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/category/:slug" element={<CategoryPage />} />
                <Route path="/search" element={<CategoryPage />} />
                <Route path="/state/:slug" element={<RegionPage />} />
                <Route path="/ncr" element={<NcrPage />} />
                <Route path="/article/:id" element={<ArticlePage />} />
                <Route path="/advertise" element={<AdvertisePage />} />
                <Route path="/disclaimer" element={<DisclaimerPage />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminDashboard />} />
              </Routes>
            </Layout>
          </BrowserRouter>
          <Toaster position="top-center" richColors />
        </AuthProvider>
      </ThemeProvider>
    </div>
  );
}

export default App;
