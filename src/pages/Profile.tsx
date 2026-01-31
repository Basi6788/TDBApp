import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Check, CreditCard, User, Mail, Calendar, Camera, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';
import { useCredits } from '@/contexts/CreditsContext';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import gsap from 'gsap';
import FloatingOrbs from '@/components/FloatingOrbs';
import ThemeToggle from '@/components/ThemeToggle';

const Profile = () => {
  const navigate = useNavigate();
  const { displayName, avatarUrl, userEmail } = useClerkAuth();
  const { user } = useUser();
  const { credits, user: creditsUser } = useCredits();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [myReferralCount, setMyReferralCount] = useState(0);
  
  const contentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  // Fetch referral count
  useEffect(() => {
    const fetchReferralCount = async () => {
      if (!creditsUser?.clerk_user_id) return;
      
      const { data, error } = await supabase
        .from('referral_logs')
        .select('id')
        .eq('referrer_clerk_user_id', creditsUser.clerk_user_id);
      
      if (data && !error) {
        setMyReferralCount(data.length);
      }
    };
    
    fetchReferralCount();
  }, [creditsUser?.clerk_user_id]);

  // Animations
  useEffect(() => {
    if (contentRef.current) {
      gsap.fromTo(
        contentRef.current.children,
        { opacity: 0, y: 30 },
        { 
          opacity: 1, 
          y: 0, 
          stagger: 0.1, 
          duration: 0.6, 
          ease: 'power3.out' 
        }
      );
    }
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingOrbs />

      {/* Header */}
      <header className="fixed top-4 left-0 right-0 z-50 px-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="liquid-glass-btn p-3 rounded-2xl"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          
          <h1 className="text-lg font-display font-bold text-gradient">Profile</h1>
          
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main ref={contentRef} className="container mx-auto px-4 pt-24 pb-12 max-w-md relative z-10">
        {/* Hidden file input for avatar upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarUpload}
          className="hidden"
          disabled={uploadingAvatar}
        />

        {/* Profile Card */}
        <section className="glass-card rounded-3xl p-6 mb-6 text-center">
          {/* Clickable Avatar */}
          <div 
            className="relative inline-block mb-4 cursor-pointer group"
            onClick={handleAvatarClick}
          >
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt="Profile" 
                className="w-24 h-24 rounded-full border-4 border-primary/30 shadow-lg transition-opacity group-hover:opacity-80"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center border-4 border-primary/30 transition-opacity group-hover:opacity-80">
                <User className="w-10 h-10 text-primary" />
              </div>
            )}
            
            {/* Camera overlay on hover/uploading */}
            <div className={`absolute inset-0 flex items-center justify-center bg-black/50 rounded-full transition-opacity ${uploadingAvatar ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
              {uploadingAvatar ? (
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              ) : (
                <Camera className="w-8 h-8 text-white" />
              )}
            </div>
            
            {/* Verified badge */}
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
              <Check className="w-4 h-4 text-primary-foreground" />
            </div>
          </div>
          
          {/* Tap to change hint */}
          <p className="text-xs text-muted-foreground mb-2">Tap avatar to change</p>
          
          <h2 className="text-xl font-bold text-foreground mb-1">
            {displayName || 'User'}
          </h2>
          
          {userEmail && (
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Mail className="w-4 h-4" />
              {userEmail}
            </p>
          )}
        </section>

        {/* Credits Card */}
        <section className="glass-card rounded-3xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
              <CreditCard className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Available Credits</p>
              <p className="text-3xl font-bold text-gradient">{credits}</p>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="glass-card rounded-3xl p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Activity
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 rounded-2xl bg-secondary/30">
              <p className="text-2xl font-bold text-gradient">0</p>
              <p className="text-xs text-muted-foreground">Searches</p>
            </div>
            <div 
              className="text-center p-4 rounded-2xl bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-colors"
              onClick={() => navigate('/referral')}
            >
              <p className="text-2xl font-bold text-gradient">{myReferralCount}</p>
              <p className="text-xs text-muted-foreground">Referrals</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Profile;
