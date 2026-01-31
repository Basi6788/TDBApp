import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Gift, Copy, Check, Share2, Users, Trophy, Crown, Medal, Award, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';
import { useCredits } from '@/contexts/CreditsContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import gsap from 'gsap';
import FloatingOrbs from '@/components/FloatingOrbs';
import ThemeToggle from '@/components/ThemeToggle';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ReferredUser {
  id: string;
  displayName: string;
  avatarUrl: string;
  createdAt: string;
}

interface LeaderboardEntry {
  clerkUserId: string;
  displayName: string;
  avatarUrl: string;
  referralCount: number;
  rank: number;
}

const Referral = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useClerkAuth();
  const { referralCode, user: creditsUser } = useCredits();
  const [copied, setCopied] = useState(false);
  const [referralDomain, setReferralDomain] = useState<string>('');
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myReferralCount, setMyReferralCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const contentRef = useRef<HTMLDivElement>(null);

  // Fetch referral domain
  useEffect(() => {
    const fetchDomain = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'referral_domain')
        .single();
      
      if (data?.setting_value) {
        setReferralDomain(data.setting_value);
      }
    };
    fetchDomain();
  }, []);

  // Fetch referral data
  useEffect(() => {
    const fetchReferralData = async () => {
      if (!creditsUser?.clerk_user_id) {
        setLoading(false);
        return;
      }

      try {
        // Fetch users I referred
        const { data: logs } = await supabase
          .from('referral_logs')
          .select('referred_clerk_user_id, created_at')
          .eq('referrer_clerk_user_id', creditsUser.clerk_user_id)
          .order('created_at', { ascending: false });

        if (logs && logs.length > 0) {
          setMyReferralCount(logs.length);
          
          // Get profile info for each referred user
          const clerkIds = logs.map(l => l.referred_clerk_user_id).filter(Boolean);
          
          if (clerkIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('clerk_user_id, display_name, avatar_url')
              .in('clerk_user_id', clerkIds);

            const users: ReferredUser[] = logs.map((log, idx) => {
              const profile = profiles?.find(p => p.clerk_user_id === log.referred_clerk_user_id);
              return {
                id: log.referred_clerk_user_id || `user-${idx}`,
                displayName: profile?.display_name || 'Anonymous User',
                avatarUrl: profile?.avatar_url || '',
                createdAt: log.created_at
              };
            });
            setReferredUsers(users);
          }
        }

        // Fetch leaderboard - count referrals by referrer
        const { data: allLogs } = await supabase
          .from('referral_logs')
          .select('referrer_clerk_user_id')
          .not('referrer_clerk_user_id', 'is', null);

        if (allLogs && allLogs.length > 0) {
          // Count referrals per user
          const countMap: Record<string, number> = {};
          allLogs.forEach(log => {
            if (log.referrer_clerk_user_id) {
              countMap[log.referrer_clerk_user_id] = (countMap[log.referrer_clerk_user_id] || 0) + 1;
            }
          });

          // Sort by count
          const sortedEntries = Object.entries(countMap)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);

          // Get profiles for top users
          const topClerkIds = sortedEntries.map(([id]) => id);
          const { data: topProfiles } = await supabase
            .from('profiles')
            .select('clerk_user_id, display_name, avatar_url')
            .in('clerk_user_id', topClerkIds);

          const leaderboardData: LeaderboardEntry[] = sortedEntries.map(([clerkUserId, count], idx) => {
            const profile = topProfiles?.find(p => p.clerk_user_id === clerkUserId);
            return {
              clerkUserId,
              displayName: profile?.display_name || 'Anonymous',
              avatarUrl: profile?.avatar_url || '',
              referralCount: count,
              rank: idx + 1
            };
          });
          setLeaderboard(leaderboardData);
        }
      } catch (error) {
        console.error('Error fetching referral data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReferralData();
  }, [creditsUser?.clerk_user_id]);

  // Animations
  useEffect(() => {
    if (contentRef.current && !loading) {
      gsap.fromTo(
        contentRef.current.children,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, stagger: 0.1, duration: 0.6, ease: 'power3.out' }
      );
    }
  }, [loading]);

  const baseUrl = referralDomain || window.location.origin;
  const referralLink = `${baseUrl}/?ref=${referralCode}`;

  const copyReferralCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode || '');
      setCopied(true);
      toast.success('Referral code copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      toast.success('Referral link copied!');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const shareReferralLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on NumLookup!',
          text: 'Use my referral link and get 5 bonus credits!',
          url: referralLink
        });
      } catch {
        copyReferralLink();
      }
    } else {
      copyReferralLink();
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
        <FloatingOrbs />
        <div className="glass-card rounded-3xl p-8 text-center max-w-sm mx-4">
          <Gift className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Login Required</h2>
          <p className="text-muted-foreground mb-6">Please login to access the referral program</p>
          <button
            onClick={() => navigate('/auth')}
            className="w-full liquid-glass-btn py-3 rounded-xl font-medium"
          >
            Login / Sign Up
          </button>
        </div>
      </div>
    );
  }

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
          
          <h1 className="text-lg font-display font-bold text-gradient">Referrals</h1>
          
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main ref={contentRef} className="container mx-auto px-4 pt-24 pb-12 max-w-md relative z-10">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="glass-card rounded-2xl p-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-2">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <p className="text-3xl font-bold text-gradient">{myReferralCount}</p>
            <p className="text-xs text-muted-foreground">Total Referrals</p>
          </div>
          <div className="glass-card rounded-2xl p-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center mx-auto mb-2">
              <Gift className="w-6 h-6 text-accent" />
            </div>
            <p className="text-3xl font-bold text-gradient">{myReferralCount * 5}</p>
            <p className="text-xs text-muted-foreground">Credits Earned</p>
          </div>
        </div>

        {/* Invite Section */}
        <section className="glass-card rounded-3xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Gift className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Invite Friends</h3>
              <p className="text-xs text-muted-foreground">Both get 5 credits</p>
            </div>
          </div>

          {/* Referral Code */}
          <div className="mb-4">
            <label className="text-xs text-muted-foreground mb-2 block">Your Referral Code</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 glass-card rounded-xl px-4 py-3 font-mono text-lg font-bold text-center text-primary">
                {referralCode || '--------'}
              </div>
              <button
                onClick={copyReferralCode}
                className="liquid-glass-btn p-3 rounded-xl"
              >
                {copied ? <Check className="w-5 h-5 text-primary" /> : <Copy className="w-5 h-5 text-foreground" />}
              </button>
            </div>
          </div>

          {/* Referral Link */}
          <div className="mb-4">
            <label className="text-xs text-muted-foreground mb-2 block">Your Referral Link</label>
            <div className="glass-card rounded-xl px-4 py-3 text-sm text-muted-foreground break-all">
              {referralLink}
            </div>
          </div>

          {/* Share Button */}
          <button
            onClick={shareReferralLink}
            className="w-full liquid-glass-btn rounded-xl py-4 flex items-center justify-center gap-2 font-medium text-foreground hover:text-primary transition-colors"
          >
            <Share2 className="w-5 h-5" />
            Share Invite Link
          </button>
        </section>

        {/* Tabs for Referred Users and Leaderboard */}
        <Tabs defaultValue="referred" className="w-full">
          <TabsList className="w-full glass-card rounded-xl p-1 mb-4">
            <TabsTrigger value="referred" className="flex-1 rounded-lg">
              <Users className="w-4 h-4 mr-2" />
              My Referrals
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex-1 rounded-lg">
              <Trophy className="w-4 h-4 mr-2" />
              Leaderboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="referred">
            <section className="glass-card rounded-3xl p-4">
              {referredUsers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">No referrals yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Share your link to invite friends!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {referredUsers.map((user) => (
                    <div key={user.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
                      <Avatar className="w-10 h-10 border-2 border-primary/30">
                        <AvatarImage src={user.avatarUrl} />
                        <AvatarFallback className="bg-primary/20">
                          <User className="w-5 h-5 text-primary" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{user.displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-xs text-primary font-medium">+5 credits</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </TabsContent>

          <TabsContent value="leaderboard">
            <section className="glass-card rounded-3xl p-4">
              {leaderboard.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">No leaderboard data yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Be the first to refer friends!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {leaderboard.map((entry) => (
                    <div 
                      key={entry.clerkUserId} 
                      className={`flex items-center gap-3 p-3 rounded-xl ${
                        entry.rank <= 3 ? 'bg-primary/10 border border-primary/20' : 'bg-secondary/30'
                      }`}
                    >
                      <div className="w-8 flex justify-center">
                        {getRankIcon(entry.rank)}
                      </div>
                      <Avatar className="w-10 h-10 border-2 border-primary/30">
                        <AvatarImage src={entry.avatarUrl} />
                        <AvatarFallback className="bg-primary/20">
                          <User className="w-5 h-5 text-primary" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{entry.displayName}</p>
                        <p className="text-xs text-muted-foreground">{entry.referralCount} referrals</p>
                      </div>
                      <div className="text-sm text-primary font-bold">
                        {entry.referralCount * 5}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Referral;
