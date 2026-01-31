import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, CreditCard, Key, Play, Loader2, LogOut, User, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useClerk, useUser } from '@clerk/clerk-react';
import gsap from 'gsap';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCredits } from '@/contexts/CreditsContext';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';
import { toast } from 'sonner';
import FloatingOrbs from '@/components/FloatingOrbs';
import ThemeToggle from '@/components/ThemeToggle';
import AdBanner from '@/components/AdBanner';

const Settings = () => {
  const navigate = useNavigate();
  const { 
    credits, 
    isAdmin, 
    keyExpiresAt,
    watchAdForCredits, 
    activateSuperKey,
    logoutKey,
    loading 
  } = useCredits();

  const { showRewardedAd, isAdLoading } = useRewardedAd();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { displayName, userEmail, avatarUrl } = useClerkAuth();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    try {
      await user.setProfileImage({ file });
      toast.success('Avatar updated successfully!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to update avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };
  
  const [superKeyInput, setSuperKeyInput] = useState('');
  const [processingKey, setProcessingKey] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current.children,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, stagger: 0.1, duration: 0.6, ease: 'power3.out' }
      );
    }
  }, [loading]);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current.children,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, stagger: 0.1, duration: 0.6, ease: 'power3.out' }
      );
    }
  }, [loading]);

  const handleWatchAd = async () => {
    const adWatched = await showRewardedAd();
    
    if (adWatched) {
      const success = await watchAdForCredits();
      if (success) {
        toast.success('You earned 1 credit!');
      } else {
        toast.error('Failed to add credit');
      }
    }
  };

  const handleActivateKey = async () => {
    if (!superKeyInput.trim()) return;
    
    if (superKeyInput.trim().toLowerCase() === 'uchihalegacy') {
      navigate('/admin');
      return;
    }
    
    setProcessingKey(true);
    const result = await activateSuperKey(superKeyInput.trim());
    setProcessingKey(false);
    if (result.success) {
      toast.success(result.message);
      setSuperKeyInput('');
    } else {
      toast.error(result.message);
    }
  };

  const handleLogoutKey = async () => {
    await logoutKey();
    toast.success('Key logged out successfully');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingOrbs />

      {/* Header */}
      <div className="fixed top-6 left-6 z-50">
        <button
          onClick={() => navigate('/')}
          className="p-3 glass-card rounded-xl hover:scale-105 transition-transform duration-200"
        >
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
      </div>

      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <main className="container mx-auto px-4 py-24 relative z-10">
        <div className="max-w-lg mx-auto" ref={containerRef}>
          <h1 className="text-3xl font-display font-bold text-center mb-2">Settings</h1>
          <p className="text-muted-foreground text-center mb-8">Manage your credits and account</p>

          {/* User Profile Card */}
          <div className="glass-card rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-4">
              {/* Avatar with upload option */}
              <div className="relative group">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="w-14 h-14 rounded-full border-2 border-primary/30" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="w-7 h-7 text-primary" />
                  </div>
                )}
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                  {uploadingAvatar ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 text-white" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={uploadingAvatar}
                  />
                </label>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{displayName || 'User'}</p>
                <p className="text-sm text-muted-foreground">{userEmail}</p>
              </div>
            </div>
          </div>

          {/* Credits Card */}
          <div className="glass-card rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Your Credits</p>
                <p className="text-3xl font-bold text-gradient">{credits}</p>
              </div>
            </div>
            {isAdmin && keyExpiresAt && (
              <div className="bg-primary/10 rounded-xl p-3 mb-4">
                <p className="text-sm text-primary">
                  ✨ Premium Active until {keyExpiresAt.toLocaleDateString()}
                </p>
              </div>
            )}
            <p className="text-sm text-muted-foreground">1 credit = 1 search</p>
          </div>

          {/* Watch Ad */}
          <div className="glass-card rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                <Play className="w-6 h-6 text-accent" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Watch Ad</p>
                <p className="text-sm text-muted-foreground">Earn 1 credit per ad</p>
              </div>
            </div>
            
            <Button 
              onClick={handleWatchAd} 
              disabled={isAdLoading}
              className="w-full"
            >
              {isAdLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Watching...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Watch Ad (+1 Credit)
                </>
              )}
            </Button>
          </div>

          {/* Super Key */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <Key className="w-6 h-6 text-yellow-500" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Super Key</p>
                <p className="text-sm text-muted-foreground">Activate premium features</p>
              </div>
            </div>

            {isAdmin ? (
              <Button variant="destructive" onClick={handleLogoutKey} className="w-full">
                Logout Key
              </Button>
            ) : (
              <div className="flex gap-2">
                <Input 
                  value={superKeyInput}
                  onChange={(e) => setSuperKeyInput(e.target.value)}
                  placeholder="Enter super key"
                  type="password"
                />
                <Button onClick={handleActivateKey} disabled={processingKey}>
                  {processingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Activate'}
                </Button>
              </div>
            )}
          </div>

          {/* Ad Banner */}
          {!isAdmin && (
            <div className="mt-6">
              <AdBanner className="rounded-xl overflow-hidden" />
            </div>
          )}

          {/* Logout Button at bottom */}
          <div className="mt-6">
            <Button variant="outline" className="w-full" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
