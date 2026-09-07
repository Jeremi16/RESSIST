import { Navigate, createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "@/src/components/ProtectedRoute";
import { AuthProvider } from "@/components/AuthProvider";
import { ToastProvider } from "@/components/ui/toast-provider";
import { WhatsNewPopup } from "@/components/WhatsNewPopup";

// Static/marketing — konten Bahasa Indonesia, path full EN (keputusan final).
// EN file di app/ sudah re-export konten ID (mis. about -> tentang).
import Home from "@/app/page";
import About from "@/app/about/page";
import Contact from "@/app/contact/page";
import Documentation from "@/app/documentation/page";
import Features from "@/app/features/page";
import Help from "@/app/help/page";
import Privacy from "@/app/privacy/page";
import Terms from "@/app/terms/page";
import Blog from "@/app/blog/page";
import Version from "@/app/version/page";
import Harga from "@/app/harga/page";
import Karir from "@/app/karir/page";
import Keamanan from "@/app/keamanan/page";
import KebijakanCookie from "@/app/kebijakan-cookie/page";
import Panduan from "@/app/panduan/page";
import Roadmap from "@/app/roadmap/page";
import Status from "@/app/status/page";
import Docs from "@/app/docs/page";

import Login from "@/src/pages/Login";
import Dashboard from "@/src/pages/Dashboard";
import Profile from "@/src/pages/Profile";

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <div className="flex-1 flex flex-col min-h-full">{children}</div>
        <WhatsNewPopup />
      </ToastProvider>
    </AuthProvider>
  );
}

function withProviders(element: React.ReactNode) {
  return <Providers>{element}</Providers>;
}

// 7 alias ID -> EN (301 di vercel.json untuk SEO; di SPA pakai <Navigate replace>)
const idAliases = [
  { from: "/tentang", to: "/about" },
  { from: "/kontak", to: "/contact" },
  { from: "/dokumentasi", to: "/documentation" },
  { from: "/fitur", to: "/features" },
  { from: "/bantuan", to: "/help" },
  { from: "/privasi", to: "/privacy" },
  { from: "/ketentuan", to: "/terms" },
];

export const router = createBrowserRouter([
  { path: "/", element: withProviders(<Home />) },
  { path: "/about", element: withProviders(<About />) },
  { path: "/contact", element: withProviders(<Contact />) },
  { path: "/documentation", element: withProviders(<Documentation />) },
  { path: "/features", element: withProviders(<Features />) },
  { path: "/help", element: withProviders(<Help />) },
  { path: "/privacy", element: withProviders(<Privacy />) },
  { path: "/terms", element: withProviders(<Terms />) },
  { path: "/blog", element: withProviders(<Blog />) },
  { path: "/version", element: withProviders(<Version />) },
  { path: "/harga", element: withProviders(<Harga />) },
  { path: "/karir", element: withProviders(<Karir />) },
  { path: "/keamanan", element: withProviders(<Keamanan />) },
  { path: "/kebijakan-cookie", element: withProviders(<KebijakanCookie />) },
  { path: "/panduan", element: withProviders(<Panduan />) },
  { path: "/roadmap", element: withProviders(<Roadmap />) },
  { path: "/status", element: withProviders(<Status />) },
  { path: "/docs", element: withProviders(<Docs />) },
  { path: "/login", element: withProviders(<Login />) },
  // app/register/page.tsx dulu redirect('/login') di server
  { path: "/register", element: <Navigate to="/login" replace /> },
  {
    path: "/dashboard",
    element: withProviders(
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>,
    ),
  },
  {
    path: "/profile",
    element: withProviders(
      <ProtectedRoute>
        <Profile />
      </ProtectedRoute>,
    ),
  },
  ...idAliases.map(({ from, to }) => ({
    path: from,
    element: <Navigate to={to} replace />,
  })),
  { path: "*", element: <Navigate to="/" replace /> },
]);
