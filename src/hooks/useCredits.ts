import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@clerk/clerk-react';

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

const getDeviceId = (): string => {
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
};

export const useCredits = () => {
  // All hooks must be called unconditionally at the top
  const { user: clerkUser, isSignedIn, isLoaded: clerkLoaded } = useUser();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const deviceId = getDeviceId();
  const clerkUserId = clerkUser?.id || null;

  const fetchUser = useCallback(async () => {
    // Wait for Clerk to load
    if (!clerkLoaded) return;
    
    try {
      // If user is authenticated, fetch by clerk_user_id first
      if (isSignedIn && clerkUserId) {
        console.log('[useCredits] Fetching user for clerkUserId:', clerkUserId);
        
        const { data: existingUser, error: findError } = await supabase
          .from('users')
          .select('*')
          .eq('clerk_user_id', clerkUserId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        console.log('[useCredits] Existing user lookup:', { existingUser, findError });

        if (existingUser && !findError) {
          // Found user by clerk_user_id
          setUser(existingUser);
          if (existingUser.active_key_id && existingUser.key_expires_at) {
            const expiresAt = new Date(existingUser.key_expires_at);
            setIsAdmin(expiresAt > new Date());
          }
          setLoading(false);
          return;
        }

        // No user with this clerk_user_id, check if there's a device-based user to link
        const { data: deviceUser, error: deviceError } = await supabase
          .from('users')
          .select('*')
          .eq('device_id', deviceId)
          .is('clerk_user_id', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        console.log('[useCredits] Device user lookup:', { deviceUser, deviceError });

        if (deviceUser && !deviceError) {
          // Link existing device user to clerk account
          const { data: linkedUser, error: linkError } = await supabase
            .from('users')
            .update({ clerk_user_id: clerkUserId })
            .eq('id', deviceUser.id)
            .select()
            .single();

          console.log('[useCredits] Linked user:', { linkedUser, linkError });

          if (linkedUser && !linkError) {
            setUser(linkedUser);
            if (linkedUser.active_key_id && linkedUser.key_expires_at) {
              const expiresAt = new Date(linkedUser.key_expires_at);
              setIsAdmin(expiresAt > new Date());
            }
            setLoading(false);
            return;
          }
        }

        // Create new user for this clerk account
        console.log('[useCredits] Creating new user for clerk account');
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({ 
            device_id: deviceId, 
            clerk_user_id: clerkUserId,
            credits: 10 
          })
          .select()
          .single();

        console.log('[useCredits] New user created:', { newUser, insertError });

        if (insertError) {
          console.error('[useCredits] Insert error:', insertError);
          throw insertError;
        }
        setUser(newUser);
        setLoading(false);
        return;
      }

      // Not authenticated - show device-based credits (display only)
      // IMPORTANT: A single device can have multiple rows if multiple accounts were used.
      // We only treat the latest *guest* row (clerk_user_id IS NULL) as the current device state.
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('device_id', deviceId)
        .is('clerk_user_id', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data) {
        // No guest user row for this device, create one for display purposes
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({ device_id: deviceId, credits: 10 })
          .select()
          .single();

        if (insertError) throw insertError;
        setUser(newUser);
      } else if (error) {
        throw error;
      } else {
        setUser(data);
        if (data.active_key_id && data.key_expires_at) {
          const expiresAt = new Date(data.key_expires_at);
          setIsAdmin(expiresAt > new Date());
        }
      }
    } catch (err) {
      console.error('Error fetching user:', err);
    } finally {
      setLoading(false);
    }
  }, [deviceId, clerkUserId, isSignedIn, clerkLoaded]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const deductCredit = useCallback(async () => {
    if (!user) return false;
    
    // Must be authenticated to use credits
    if (!isSignedIn || !clerkUserId) {
      console.log('User must be authenticated to use credits');
      return false;
    }
    
    // Admin users with active key don't lose credits
    if (isAdmin) return true;
    
    if (user.credits <= 0) return false;

    const { error } = await supabase
      .from('users')
      .update({ credits: user.credits - 1 })
      .eq('id', user.id);

    if (error) {
      console.error('Error deducting credit:', error);
      return false;
    }

    setUser(prev => prev ? { ...prev, credits: prev.credits - 1 } : null);
    return true;
  }, [user, isAdmin, isSignedIn, clerkUserId]);

  const addCredits = useCallback(async (amount: number) => {
    if (!user) return false;

    const { error } = await supabase
      .from('users')
      .update({ credits: user.credits + amount })
      .eq('id', user.id);

    if (error) {
      console.error('Error adding credits:', error);
      return false;
    }

    setUser(prev => prev ? { ...prev, credits: prev.credits + amount } : null);
    return true;
  }, [user]);

  const watchAdForCredits = useCallback(async () => {
    if (!isSignedIn || !clerkUserId) {
      return false;
    }
    
    // Log the ad watch
    await supabase
      .from('ad_watch_logs')
      .insert({ device_id: deviceId, credits_earned: 1 });

    return addCredits(1);
  }, [addCredits, deviceId, isSignedIn, clerkUserId]);

  const applyReferralCode = useCallback(async (referralCodeInput: string) => {
    if (!user || user.referred_by) return { success: false, message: 'Already used a referral code' };
    
    if (!isSignedIn || !clerkUserId) {
      return { success: false, message: 'Please login first' };
    }

    // Find the referrer
    const { data: referrer, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('referral_code', referralCodeInput)
      .single();

    if (findError || !referrer) {
      return { success: false, message: 'Invalid referral code' };
    }

    if (referrer.id === user.id) {
      return { success: false, message: 'Cannot use your own referral code' };
    }

    // Update current user
    await supabase
      .from('users')
      .update({ referred_by: referralCodeInput })
      .eq('id', user.id);

    // Add credits to referrer
    await supabase
      .from('users')
      .update({ credits: referrer.credits + 5 })
      .eq('id', referrer.id);

    // Log the referral with clerk_user_ids for tracking
    await supabase
      .from('referral_logs')
      .insert({
        referrer_device_id: referrer.device_id,
        referred_device_id: deviceId,
        referrer_clerk_user_id: referrer.clerk_user_id,
        referred_clerk_user_id: clerkUserId,
        credits_awarded: 5
      });

    // Add credits to current user too
    await addCredits(5);

    // Update local state
    setUser(prev => prev ? { ...prev, referred_by: referralCodeInput } : null);

    return { success: true, message: 'Referral applied! You both got 5 credits!' };
  }, [user, deviceId, addCredits, isSignedIn, clerkUserId]);

  const activateSuperKey = useCallback(async (keyCode: string) => {
    if (!isSignedIn || !clerkUserId || !user) {
      return { success: false, message: 'Please login first' };
    }
    
    // Check if key exists and is valid
    const { data: key, error: findError } = await supabase
      .from('super_keys')
      .select('*')
      .eq('key_code', keyCode)
      .single();

    if (findError || !key) {
      return { success: false, message: 'Invalid key' };
    }

    if (!key.is_active) {
      return { success: false, message: 'This key has been blocked' };
    }

    if (key.is_used) {
      if (key.used_by_device_id !== deviceId) {
        return { success: false, message: 'This key is already in use on another device' };
      }
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + key.validity_days);

    // Update key as used
    await supabase
      .from('super_keys')
      .update({
        is_used: true,
        used_by_device_id: deviceId,
        used_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      })
      .eq('id', key.id);

    // Update user with key info and credits
    await supabase
      .from('users')
      .update({
        active_key_id: key.id,
        key_expires_at: expiresAt.toISOString(),
        credits: (user?.credits || 0) + key.credits_amount
      })
      .eq('id', user.id);

    setIsAdmin(true);
    await fetchUser();

    return { 
      success: true, 
      message: `Key activated! You got ${key.credits_amount} credits for ${key.validity_days} days!` 
    };
  }, [user, deviceId, fetchUser, isSignedIn, clerkUserId]);

  const logoutKey = useCallback(async () => {
    if (!user?.active_key_id) return;

    // Clear key from user
    await supabase
      .from('users')
      .update({
        active_key_id: null,
        key_expires_at: null,
        credits: 10 // Reset to default
      })
      .eq('id', user.id);

    // Mark key as not used
    await supabase
      .from('super_keys')
      .update({
        is_used: false,
        used_by_device_id: null,
        used_at: null,
        expires_at: null
      })
      .eq('id', user.active_key_id);

    setIsAdmin(false);
    await fetchUser();
  }, [user, fetchUser]);

  return {
    user,
    loading: loading || !clerkLoaded,
    credits: user?.credits || 0,
    referralCode: user?.referral_code || '',
    isAdmin,
    isAuthenticated: isSignedIn,
    keyExpiresAt: user?.key_expires_at ? new Date(user.key_expires_at) : null,
    deductCredit,
    addCredits,
    watchAdForCredits,
    applyReferralCode,
    activateSuperKey,
    logoutKey,
    refetch: fetchUser
  };
};
