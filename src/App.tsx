import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import { ClerkAuthProvider } from "@/contexts/ClerkAuthContext";
import { CreditsProvider } from "@/contexts/CreditsContext"; 
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import SsoCallback from "./pages/SsoCallback";
import Profile from "./pages/Profile";
import AIImage from "./pages/AIImage";
import Referral from "./pages/Referral";

// --- NEW IMPORTS FOR APP/WEB DETECTION ---
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { AdMob, BannerAdSize, BannerAdPosition } from "@capacitor-community/admob";

// React Query Optimization
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, 
      retry: 1,
    },
  },
});

const CLERK_PUBLISHABLE_KEY = "pk_test_ZGlzdGluY3QtbWFja2VyZWwtMzEuY2xlcmsuYWNjb3VudHMuZGV2JA";

// --- HYBRID LOGIC COMPONENT (Handles Ads & Deep Links) ---
const HybridManager = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if running on Native App (Android/Termux)
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      console.log("Running on Android App - Initializing Native Features");

      // 1. DEEP LINKING (Invitation & Auth)
      CapacitorApp.addListener("appUrlOpen", (data) => {
        // URL se path nikalo (e.g., https://tdb-67.vercel.app/invite/romeo -> /invite/romeo)
        const slug = data.url.split(".app").pop();
        if (slug) {
          navigate(slug);
        }
      });

      // 2. ADMOB SETUP (Sirf App me chalega)
      const initAdMob = async () => {
        try {
          await AdMob.initialize({
            requestTrackingAuthorization: true,
            initializeForTesting: true, // Production me isay false kar dena
          });

          // Show Banner
          await AdMob.showBanner({
            // FILHAL TEST ID USE KAR RAHE HAIN (Crash se bachne ke liye)
            // Jab tum "Banner" unit bana lo, apni ID yahan dalna: "ca-app-pub-3694003275001232/XXXXXXXX"
            adId: "ca-app-pub-3940256099942544/6300978111", 
            adSize: BannerAdSize.ADAPTIVE_BANNER,
            position: BannerAdPosition.BOTTOM_CENTER,
            margin: 0,
          });
        } catch (e) {
          console.error("AdMob Error:", e);
        }
      };

      initAdMob();
    } else {
      console.log("Running on Web - AdSense handled by index.html");
      // Web par kuch nahi karna, index.html ka script khud ads dikhayega
    }
  }, [navigate]);

  return null; // Ye component kuch render nahi karta, sirf logic chalata hai
};

const ClerkRouterBridge = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  
  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      signInUrl="/auth"
      signUpUrl="/auth"
      afterSignOutUrl="/"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
    >
      {children}
    </ClerkProvider>
  );
};

const AppRoutes = () => (
  <ClerkAuthProvider>
    <CreditsProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        
        {/* Yahan humne Hybrid Logic insert kar di */}
        <HybridManager />

        <Routes>
          <Route path="/sso-callback" element={<SsoCallback />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<Index />} />
          <Route path="/ai-image" element={<AIImage />} />
          
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/referral"
            element={
              <ProtectedRoute>
                <Referral />
              </ProtectedRoute>
            }
          />

          <Route path="/auth/*" element={<Navigate to="/auth" replace />} />
          <Route path="/image-to-prompt" element={<Navigate to="/ai-image" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </CreditsProvider>
  </ClerkAuthProvider>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ClerkRouterBridge>
        <AppRoutes />
      </ClerkRouterBridge>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;

