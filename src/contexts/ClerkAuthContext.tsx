import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  userEmail: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  userId: null,
  userEmail: null,
  displayName: null,
  avatarUrl: null,
});

export const useClerkAuth = () => useContext(AuthContext);

export const ClerkAuthProvider = ({ children }: { children: ReactNode }) => {
  const { isSignedIn, isLoaded, user } = useUser();
  const [profileSynced, setProfileSynced] = useState(false);

  // If user changes (multi-account on same device) or signs out, allow re-sync.
  useEffect(() => {
    setProfileSynced(false);
  }, [user?.id, isSignedIn]);

  // Sync user profile to Supabase when signed in
  useEffect(() => {
    const syncProfile = async () => {
      if (isSignedIn && user && !profileSynced) {
        try {
          // Check if profile exists
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('clerk_user_id', user.id)
            .single();

          if (!existingProfile) {
            // Create new profile
            await supabase.from('profiles').insert({
              clerk_user_id: user.id,
              email: user.primaryEmailAddress?.emailAddress,
              display_name: user.fullName || user.firstName,
              avatar_url: user.imageUrl,
            });
          } else {
            // Update existing profile
            await supabase
              .from('profiles')
              .update({
                email: user.primaryEmailAddress?.emailAddress,
                display_name: user.fullName || user.firstName,
                avatar_url: user.imageUrl,
              })
              .eq('clerk_user_id', user.id);
          }
          setProfileSynced(true);
        } catch (error) {
          console.error('Error syncing profile:', error);
        }
      }
    };

    syncProfile();
  }, [isSignedIn, user, profileSynced]);

  const value: AuthContextType = {
    isAuthenticated: isSignedIn ?? false,
    isLoading: !isLoaded,
    userId: user?.id ?? null,
    userEmail: user?.primaryEmailAddress?.emailAddress ?? null,
    displayName: user?.fullName ?? user?.firstName ?? null,
    avatarUrl: user?.imageUrl ?? null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
