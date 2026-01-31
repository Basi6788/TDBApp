import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    adsbygoogle: any[];
    googletag: any;
  }
}

interface UseAdMobReturn {
  showRewardedAd: () => Promise<boolean>;
  isAdLoading: boolean;
  isAdReady: boolean;
  adError: string | null;
}

export const useAdMob = (): UseAdMobReturn => {
  const [isAdLoading, setIsAdLoading] = useState(false);
  const [isAdReady, setIsAdReady] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);
  const [adUnitId, setAdUnitId] = useState<string | null>(null);

  // Fetch ad config on mount
  useEffect(() => {
    const fetchAdConfig = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-ad-config');
        if (error) throw error;
        if (data?.adUnitId) {
          setAdUnitId(data.adUnitId);
          setIsAdReady(true);
        }
      } catch (err) {
        console.error('Failed to fetch ad config:', err);
        setAdError('Failed to load ad configuration');
      }
    };

    fetchAdConfig();
  }, []);

  // Load Google AdSense script for rewarded ads
  useEffect(() => {
    if (!adUnitId) return;

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="pagead2.googlesyndication.com"]');
    if (existingScript) return;

    const script = document.createElement('script');
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.setAttribute('data-ad-client', adUnitId.split('/')[0] || adUnitId);
    
    script.onload = () => {
      console.log('AdSense script loaded');
      setIsAdReady(true);
    };

    script.onerror = () => {
      console.error('Failed to load AdSense script');
      setAdError('Failed to load ads');
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, [adUnitId]);

  const showRewardedAd = useCallback(async (): Promise<boolean> => {
    if (!adUnitId) {
      setAdError('Ad unit not configured');
      return false;
    }

    setIsAdLoading(true);
    setAdError(null);

    try {
      // For web, we'll use a simulated rewarded ad experience
      // In production, you would integrate with Google's rewarded ad API
      
      // Create a modal overlay for the ad
      const overlay = document.createElement('div');
      overlay.id = 'ad-overlay';
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        color: white;
        font-family: system-ui, sans-serif;
      `;

      const adContainer = document.createElement('div');
      adContainer.style.cssText = `
        background: #1a1a2e;
        border-radius: 16px;
        padding: 32px;
        text-align: center;
        max-width: 400px;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
      `;

      const title = document.createElement('h2');
      title.textContent = '🎬 Rewarded Ad';
      title.style.cssText = 'margin: 0 0 16px 0; font-size: 24px;';

      const countdown = document.createElement('p');
      countdown.style.cssText = 'font-size: 48px; margin: 24px 0; font-weight: bold; color: #00d4ff;';
      
      const subtext = document.createElement('p');
      subtext.textContent = 'Watch to earn 1 credit';
      subtext.style.cssText = 'color: #888; margin: 0;';

      // AdSense ad slot (if properly configured)
      const adSlot = document.createElement('ins');
      adSlot.className = 'adsbygoogle';
      adSlot.style.cssText = 'display:block; width: 300px; height: 250px; margin: 16px auto;';
      adSlot.setAttribute('data-ad-client', adUnitId.split('/')[0] || adUnitId);
      adSlot.setAttribute('data-ad-slot', adUnitId.split('/')[1] || adUnitId);
      adSlot.setAttribute('data-ad-format', 'auto');

      adContainer.appendChild(title);
      adContainer.appendChild(adSlot);
      adContainer.appendChild(countdown);
      adContainer.appendChild(subtext);
      overlay.appendChild(adContainer);
      document.body.appendChild(overlay);

      // Try to load AdSense ad
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.log('AdSense push error (may be normal):', e);
      }

      // Countdown timer (5 seconds for rewarded ad)
      return new Promise((resolve) => {
        let seconds = 5;
        countdown.textContent = seconds.toString();

        const interval = setInterval(() => {
          seconds--;
          countdown.textContent = seconds.toString();

          if (seconds <= 0) {
            clearInterval(interval);
            
            // Show completion message
            adContainer.innerHTML = `
              <div style="font-size: 64px; margin-bottom: 16px;">✅</div>
              <h2 style="margin: 0 0 8px 0; color: #00ff88;">Reward Earned!</h2>
              <p style="color: #888; margin: 0;">+1 Credit added to your account</p>
            `;

            setTimeout(() => {
              overlay.remove();
              setIsAdLoading(false);
              resolve(true);
            }, 1500);
          }
        }, 1000);
      });

    } catch (err) {
      console.error('Error showing ad:', err);
      setAdError('Failed to show ad');
      setIsAdLoading(false);
      return false;
    }
  }, [adUnitId]);

  return {
    showRewardedAd,
    isAdLoading,
    isAdReady,
    adError
  };
};
