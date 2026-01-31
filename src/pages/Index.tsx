import { useState, useEffect } from 'react';
import { Loader2, User, Sparkles } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';
import Hero from '@/components/Hero';
import SearchBox from '@/components/SearchBox';
import SearchProgress from '@/components/SearchProgress';
import ResultsSection from '@/components/ResultsSection';
import FloatingOrbs from '@/components/FloatingOrbs';
import Sidebar from '@/components/Sidebar';
import ReferralInvitePopup from '@/components/ReferralInvitePopup';
import { useNumberLookup } from '@/hooks/useNumberLookup';
import { useCredits } from '@/contexts/CreditsContext';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';
import { useClerk } from '@clerk/clerk-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Index = () => {
  const { data, recordsCount, error, isLoading, search } = useNumberLookup();
  const { credits, deductCredit, isAdmin, applyReferralCode, referralCode, user: creditsUser, loading: creditsLoading } = useCredits();
  const { displayName, avatarUrl, isAuthenticated, isLoading: authLoading } = useClerkAuth();
  const { openSignIn } = useClerk();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Referral popup state
  const [showReferralPopup, setShowReferralPopup] = useState(false);
  const [inviterInfo, setInviterInfo] = useState<{ name: string; avatar: string } | null>(null);
  const [pendingReferralCode, setPendingReferralCode] = useState<string | null>(null);

  // Check for referral code in URL or localStorage (after SSO)
  useEffect(() => {
    const checkReferral = async () => {
      console.log('[Referral] Checking referral...', { creditsLoading, isAuthenticated, referralCode, referred_by: creditsUser?.referred_by });
      
      // Wait for credits/user data to load before checking referral eligibility
      if (creditsLoading) {
        console.log('[Referral] Credits still loading, waiting...');
        return;
      }
      
      // First check URL param
      let ref = searchParams.get('ref');
      console.log('[Referral] URL ref param:', ref);
      
      // If no URL param, check localStorage (set before SSO redirect)
      if (!ref) {
        ref = localStorage.getItem('pending_referral_code');
        console.log('[Referral] localStorage ref:', ref);
      }
      
      // Early exit if no referral code
      if (!ref) {
        console.log('[Referral] No referral code found');
        return;
      }
      
      // If user is not authenticated, store and redirect
      if (!isAuthenticated) {
        localStorage.setItem('pending_referral_code', ref);
        
        // Clear URL param and redirect to auth
        if (searchParams.has('ref')) {
          searchParams.delete('ref');
          setSearchParams(searchParams, { replace: true });
          navigate('/auth');
        }
        return;
      }
      
      // User is authenticated - check eligibility
      // - not self-referral (check only if referralCode is loaded)
      // - user hasn't already used a referral
      const isSelfReferral = referralCode && ref === referralCode;
      const alreadyReferred = creditsUser?.referred_by;
      
      if (isSelfReferral || alreadyReferred) {
        // Clear the pending code since it can't be used
        localStorage.removeItem('pending_referral_code');
        if (searchParams.has('ref')) {
          searchParams.delete('ref');
          setSearchParams(searchParams, { replace: true });
        }
        return;
      }
      
      // Eligible for referral - fetch inviter info and show popup
      setPendingReferralCode(ref);
      
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('clerk_user_id')
          .eq('referral_code', ref)
          .single();

        if (userData) {
          let name = 'A friend';
          let avatar = '';
          
          if (userData.clerk_user_id) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('display_name, avatar_url')
              .eq('clerk_user_id', userData.clerk_user_id)
              .maybeSingle();

            if (profileData) {
              name = profileData.display_name || 'A friend';
              avatar = profileData.avatar_url || '';
            }
          }

          setInviterInfo({ name, avatar });
          setShowReferralPopup(true);

          // Clear localStorage and URL after popup is shown
          localStorage.removeItem('pending_referral_code');
          if (searchParams.has('ref')) {
            searchParams.delete('ref');
            setSearchParams(searchParams, { replace: true });
          }
        } else {
          // Invalid referral code - clear it
          localStorage.removeItem('pending_referral_code');
          if (searchParams.has('ref')) {
            searchParams.delete('ref');
            setSearchParams(searchParams, { replace: true });
          }
        }
      } catch (error) {
        console.error('Error fetching inviter info:', error);
      }
    };

    checkReferral();
  }, [searchParams, isAuthenticated, referralCode, creditsUser?.referred_by, creditsLoading, navigate, setSearchParams]);

  const handleAcceptReferral = async () => {
    if (!pendingReferralCode) return;
    
    try {
      const result = await applyReferralCode(pendingReferralCode);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to apply referral');
    }
    
    setShowReferralPopup(false);
    setPendingReferralCode(null);
  };

  const handleDeclineReferral = () => {
    setShowReferralPopup(false);
    setPendingReferralCode(null);
    localStorage.removeItem('pending_referral_code');
    toast.info('Referral declined');
  };

  const handleSearch = async (query: string) => {
    // Check if user is authenticated first
    if (!isAuthenticated) {
      toast.error('Please login or sign up first');
      navigate('/auth');
      return;
    }

    // Check credits before searching (admins have unlimited)
    if (!isAdmin && credits <= 0) {
      toast.error('No credits left! Watch an ad or use a referral code.');
      navigate('/settings');
      return;
    }

    // Search first, then deduct credit only on success
    const searchSuccess = await search(query);
    
    // Only deduct credit if search was successful (found records)
    if (searchSuccess && !isAdmin) {
      const credited = await deductCredit();
      if (!credited) {
        console.log('Failed to deduct credit but search completed');
      }
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Referral Popup */}
      {showReferralPopup && inviterInfo && (
        <ReferralInvitePopup
          inviterName={inviterInfo.name}
          inviterAvatar={inviterInfo.avatar}
          onAccept={handleAcceptReferral}
          onDecline={handleDeclineReferral}
        />
      )}

      {/* Background orbs */}
      <FloatingOrbs />

      {/* Sidebar with liquid glass hamburger */}
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      <header className="fixed top-0 left-0 right-0 z-50 px-4 py-4">
        <div className="flex items-center justify-between max-w-screen-xl mx-auto">
          {/* Left side - Space for hamburger */}
          <div className="w-14 flex-shrink-0">
            {/* Hamburger is rendered by Sidebar component */}
          </div>

          {/* Center - Credits badge */}
          <div className="liquid-glass-btn rounded-full px-4 py-2 flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-muted-foreground">Credits:</span>
            <span className={`font-bold text-sm ${isAdmin ? 'text-primary' : credits > 0 ? 'text-gradient' : 'text-destructive'}`}>
              {isAdmin ? '∞' : creditsLoading ? '…' : credits}
            </span>
          </div>

          {/* Right side - Theme toggle + User/Login */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <ThemeToggle />
            {authLoading ? (
              <div className="liquid-glass-btn flex items-center gap-2 rounded-2xl px-3 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground hidden sm:block">Signing in…</span>
              </div>
            ) : isAuthenticated ? (
              <button
                onClick={() => navigate('/profile')}
                className="liquid-glass-btn flex items-center gap-2 rounded-2xl px-3 py-2"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="w-8 h-8 rounded-full ring-2 ring-primary/30" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center ring-2 ring-primary/30">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                )}
                <span className="text-sm font-medium text-foreground hidden sm:block">
                  {displayName || 'Account'}
                </span>
              </button>
            ) : (
              <button
                onClick={() => navigate('/auth')}
                className="liquid-glass-btn flex items-center gap-2 rounded-2xl px-3 py-2"
              >
                <User className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground hidden sm:block">Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main content with animations - padding for fixed header */}
      <main className="container mx-auto px-4 pt-24 pb-16 relative z-10">
        <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <Hero />
        </div>
        
        {/* AI Image Button - Stylish angled design */}
        <div className="animate-fade-in flex justify-center mb-6" style={{ animationDelay: '0.15s' }}>
          <button
            onClick={() => navigate('/ai-image')}
            className="group relative liquid-glass-btn px-6 py-3 rounded-2xl transform -rotate-2 hover:rotate-0 transition-all duration-300 hover:scale-105"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <span className="block font-semibold text-gradient">AI Image Studio</span>
                <span className="text-xs text-muted-foreground">Generate • Edit • Analyze</span>
              </div>
            </div>
          </button>
        </div>
        
        <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <SearchBox onSearch={handleSearch} isLoading={isLoading} />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <SearchProgress isLoading={isLoading} />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <ResultsSection 
            data={data} 
            recordsCount={recordsCount}
            error={error} 
            isLoading={isLoading} 
            showAds={!isAdmin}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 pb-8 text-center">
        <p className="text-sm text-muted-foreground">
          Powered by{' '}
          <a href="https://uchihas.foundation" target="_blank" rel="noopener noreferrer" className="text-gradient font-medium hover:underline">
            Uchihas.foundation
          </a>
        </p>
      </footer>
    </div>
  );
};

export default Index;
