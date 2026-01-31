import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@clerk/clerk-react';

// --- Types ---
interface User {
  id: string;
  device_id: string;
  clerk_user_id: string | null;
  credits: number;
  referral_code: string;
  referred_by: string | null;
  active_key_id: string | null;
  key_expires_at: string | null;
}

interface CreditsContextType {
  user: User | null;
  loading: boolean;
  credits: number;
  referralCode: string;
  isAdmin: boolean;
  isAuthenticated: boolean;
  keyExpiresAt: Date | null;
  deductCredit: () => Promise<boolean>;
  addCredits: (amount: number) => Promise<boolean>;
  watchAdForCredits: () => Promise<boolean>;
  applyReferralCode: (code: string) => Promise<{ success: boolean; message: string }>;
  activateSuperKey: (key: string) => Promise<{ success: boolean; message: string }>;
  logoutKey: () => Promise<void>;
  refetch: () => Promise<void>;
}

const CreditsContext = createContext<CreditsContextType | undefined>(undefined);

// --- Helper: Device ID Management ---
const getDeviceId = (): string => {
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
};

// --- Provider Component ---
export const CreditsProvider = ({ children }: { children: ReactNode }) => {
  const { user: clerkUser, isSignedIn, isLoaded: clerkLoaded } = useUser();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const deviceId = getDeviceId();
  const clerkUserId = clerkUser?.id || null;

  // 1. Admin Status Checker Helper
  const checkAdminStatus = useCallback((userData: User | null) => {
    if (userData?.active_key_id && userData?.key_expires_at) {
      const expiresAt = new Date(userData.key_expires_at);
      const isStillValid = expiresAt > new Date();
      setIsAdmin(isStillValid);
      return isStillValid;
    }
    setIsAdmin(false);
    return false;
  }, []);

  // 2. Fetch User Logic (Handles Merge & Guest)
  const fetchUser = useCallback(async () => {
    if (!clerkLoaded) return;
    
    try {
      // A. LOGGED IN USER FLOW
      if (isSignedIn && clerkUserId) {
        // Find existing Clerk user
        const { data: existingUser, error: findError } = await supabase
          .from('users')
          .select('*')
          .eq('clerk_user_id', clerkUserId)
          .maybeSingle();

        if (existingUser && !findError) {
          setUser(existingUser);
          checkAdminStatus(existingUser);
          setLoading(false);
          return;
        }

        // Check if Device User exists to merge
        const { data: deviceUser } = await supabase
          .from('users')
          .select('*')
          .eq('device_id', deviceId)
          .is('clerk_user_id', null)
          .maybeSingle();

        if (deviceUser) {
          // Link Device User to Clerk
           const { data: linkedUser } = await supabase
            .from('users')
            .update({ clerk_user_id: clerkUserId })
            .eq('id', deviceUser.id)
            .select()
            .single();

            if (linkedUser) {
              setUser(linkedUser);
              checkAdminStatus(linkedUser);
              setLoading(false);
              return;
            }
        }

        // Create New Authenticated User
        const { data: newUser } = await supabase
          .from('users')
          .insert({ device_id: deviceId, clerk_user_id: clerkUserId, credits: 10 })
          .select()
          .single();

        setUser(newUser);
        checkAdminStatus(newUser);
        setLoading(false);
        return;
      }

      // B. GUEST USER FLOW
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('device_id', deviceId)
        .is('clerk_user_id', null)
        .maybeSingle();

      if (!data) {
        const { data: newUser } = await supabase
          .from('users')
          .insert({ device_id: deviceId, credits: 10 })
          .select()
          .single();
        setUser(newUser);
        checkAdminStatus(newUser);
      } else {
        setUser(data);
        checkAdminStatus(data);
      }
    } catch (err) {
      console.error('Error fetching user:', err);
    } finally {
      setLoading(false);
    }
  }, [deviceId, clerkUserId, isSignedIn, clerkLoaded, checkAdminStatus]);

  // Initial Load
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // 3. Deduct Credits (With Super Key Check)
  const deductCredit = useCallback(async () => {
    if (!user) return false;
    
    // Admin (Super Key) users don't lose credits
    if (isAdmin) {
        console.log("Super Key Active: Skipping deduction");
        return true; 
    }

    if (user.credits <= 0) return false;

    // Optimistic Update: UI pehle update karo
    const prevCredits = user.credits;
    setUser(prev => prev ? { ...prev, credits: prev.credits - 1 } : null);

    const { error } = await supabase
      .from('users')
      .update({ credits: user.credits - 1 })
      .eq('id', user.id);

    if (error) {
      // Revert on error
      console.error('Deduct failed, reverting', error);
      setUser(prev => prev ? { ...prev, credits: prevCredits } : null);
      return false;
    }
    return true;
  }, [user, isAdmin]);

  // 4. Add Credits Helper
  const addCredits = useCallback(async (amount: number) => {
    if (!user) return false;

    // Optimistic Update
    const prevCredits = user.credits;
    setUser(prev => prev ? { ...prev, credits: prev.credits + amount } : null);

    const { error } = await supabase
      .from('users')
      .update({ credits: user.credits + amount })
      .eq('id', user.id);

    if (error) {
       setUser(prev => prev ? { ...prev, credits: prevCredits } : null);
       return false;
    }
    return true;
  }, [user]);

  // 5. Watch Ad Logic
  const watchAdForCredits = useCallback(async () => {
      // Sirf logged in users ad dekh sakte hain (optional rule)
      if (!isSignedIn || !clerkUserId) return false;

      // Log ad watch
      const { error } = await supabase.from('ad_watch_logs').insert({ 
          device_id: deviceId, 
          credits_earned: 1 
      });
      
      if (error) return false;

      return addCredits(1);
  }, [addCredits, deviceId, isSignedIn, clerkUserId]);

  // 6. Referral Logic
  const applyReferralCode = useCallback(async (code: string) => {
      if (!user) return { success: false, message: 'User not found' };
      if (user.referred_by) return { success: false, message: 'Referral code already used' };
      if (!isSignedIn) return { success: false, message: 'Please login to use referral codes' };
      if (code === user.referral_code) return { success: false, message: 'Cannot use your own code' };

      // Find Referrer
      const { data: referrer, error: findError } = await supabase
        .from('users')
        .select('*')
        .eq('referral_code', code)
        .single();

      if (findError || !referrer) {
          return { success: false, message: 'Invalid referral code' };
      }

      // Update Current User (Referee)
      const { error: updateError } = await supabase
        .from('users')
        .update({ referred_by: code })
        .eq('id', user.id);

      if (updateError) return { success: false, message: 'Failed to apply code' };

      // Log Transaction
      await supabase.from('referral_logs').insert({
          referrer_device_id: referrer.device_id,
          referred_device_id: deviceId,
          credits_awarded: 5
      });

      // Reward Referrer (+5 credits)
      await supabase
        .from('users')
        .update({ credits: referrer.credits + 5 })
        .eq('id', referrer.id);

      // Reward Current User (+5 credits via helper)
      await addCredits(5);
      
      // Update local state for referred_by
      setUser(prev => prev ? { ...prev, referred_by: code } : null);

      return { success: true, message: 'Code applied! You both got 5 credits.' };
  }, [user, isSignedIn, deviceId, addCredits]);

  // 7. Super Key Activation Logic (Full Implementation)
  const activateSuperKey = useCallback(async (keyCode: string) => {
      if (!isSignedIn || !clerkUserId || !user) {
          return { success: false, message: 'Please login to activate keys' };
      }

      // A. Check Key in DB
      const { data: key, error: keyError } = await supabase
          .from('super_keys')
          .select('*')
          .eq('key_code', keyCode)
          .single();

      if (keyError || !key) return { success: false, message: 'Invalid Key' };
      if (!key.is_active) return { success: false, message: 'Key is blocked' };
      
      // Check if used by someone else
      if (key.is_used && key.used_by_device_id !== deviceId) {
          return { success: false, message: 'Key already used on another device' };
      }

      // B. Calculate Expiry
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + key.validity_days);

      // C. Mark Key as Used
      const { error: keyUpdateError } = await supabase
          .from('super_keys')
          .update({
              is_used: true,
              used_by_device_id: deviceId,
              used_at: new Date().toISOString(),
              expires_at: expiresAt.toISOString()
          })
          .eq('id', key.id);

      if (keyUpdateError) return { success: false, message: 'Failed to activate key' };

      // D. Update User (Grant Admin Status & Credits)
      // Note: Hum purane credits mein key ke credits add kar rahe hain
      const newCredits = user.credits + key.credits_amount;
      
      const { error: userUpdateError } = await supabase
          .from('users')
          .update({
              active_key_id: key.id,
              key_expires_at: expiresAt.toISOString(),
              credits: newCredits
          })
          .eq('id', user.id);

      if (userUpdateError) return { success: false, message: 'Error updating user profile' };

      // E. Update Local State Immediately
      setUser(prev => prev ? { 
          ...prev, 
          credits: newCredits,
          active_key_id: key.id,
          key_expires_at: expiresAt.toISOString()
      } : null);
      
      setIsAdmin(true);

      return { success: true, message: `Super Key Activated! Valid for ${key.validity_days} days.` };

  }, [user, isSignedIn, clerkUserId, deviceId]);

  // 8. Logout Key Logic
  const logoutKey = useCallback(async () => {
      if (!user || !user.active_key_id) return;

      const keyId = user.active_key_id;

      // Reset User
      setUser(prev => prev ? { 
          ...prev, 
          active_key_id: null, 
          key_expires_at: null,
          credits: 10 // Reset credits to default (optional rule)
      } : null);
      setIsAdmin(false);

      // DB Updates
      await supabase
        .from('users')
        .update({ active_key_id: null, key_expires_at: null, credits: 10 })
        .eq('id', user.id);

      await supabase
        .from('super_keys')
        .update({ 
            is_used: false, 
            used_by_device_id: null, 
            used_at: null, 
            expires_at: null 
        })
        .eq('id', keyId);

  }, [user]);


  const value = {
    user,
    loading: loading || !clerkLoaded,
    credits: user?.credits || 0,
    referralCode: user?.referral_code || '',
    isAdmin,
    isAuthenticated: !!isSignedIn,
    keyExpiresAt: user?.key_expires_at ? new Date(user.key_expires_at) : null,
    deductCredit,
    addCredits,
    watchAdForCredits,
    applyReferralCode,
    activateSuperKey,
    logoutKey,
    refetch: fetchUser
  };

  return <CreditsContext.Provider value={value}>{children}</CreditsContext.Provider>;
};

// Hook to use the context
export const useCredits = () => {
  const context = useContext(CreditsContext);
  if (context === undefined) {
    throw new Error('useCredits must be used within a CreditsProvider');
  }
  return context;
};

