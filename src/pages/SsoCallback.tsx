import { useEffect, useState } from "react";
import { AuthenticateWithRedirectCallback, useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

export default function SsoCallback() {
  const [progress, setProgress] = useState(10);
  const navigate = useNavigate();
  const { isSignedIn, isLoaded } = useAuth();

  // Fast progress animation
  useEffect(() => {
    const interval = window.setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        const bump = 3 + Math.floor(Math.random() * 7);
        return Math.min(p + bump, 90);
      });
    }, 120);

    return () => window.clearInterval(interval);
  }, []);

  // When auth is loaded and user is signed in, redirect to home.
  // This prevents Clerk from falling back to its hosted sign-in.
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      setProgress(100);
      const timer = window.setTimeout(() => {
        navigate('/', { replace: true });
      }, 250);
      return () => window.clearTimeout(timer);
    }
  }, [isLoaded, isSignedIn, navigate]);

  // Safety timeout - if stuck for too long, redirect anyway
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      console.log('SSO callback timeout - redirecting to home');
      navigate('/', { replace: true });
    }, 8000);

    return () => window.clearTimeout(timeout);
  }, [navigate]);

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <header className="mb-6 text-center">
          <h1 className="text-xl font-semibold tracking-tight">
            Signing you in…
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Almost there! Please wait...
          </p>
        </header>

        <section aria-label="SSO progress" className="space-y-3">
          <Progress value={progress} />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{progress}%</span>
            <span>Processing authentication</span>
          </div>
        </section>

        {/* Clerk handles the OAuth callback - MUST be visible */}
        <div className="mt-8">
          <AuthenticateWithRedirectCallback 
            signInUrl="/auth"
            signUpUrl="/auth"
            signInFallbackRedirectUrl="/"
            signUpFallbackRedirectUrl="/"
            signInForceRedirectUrl="/"
            signUpForceRedirectUrl="/"
            afterSignInUrl="/"
            afterSignUpUrl="/"
          />
        </div>
      </div>
    </div>
  );
}
