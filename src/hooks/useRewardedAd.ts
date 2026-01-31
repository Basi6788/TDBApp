import { useState, useCallback } from 'react';

interface UseRewardedAdReturn {
  showRewardedAd: () => Promise<boolean>;
  isAdLoading: boolean;
}

export const useRewardedAd = (): UseRewardedAdReturn => {
  const [isAdLoading, setIsAdLoading] = useState(false);

  const showRewardedAd = useCallback(async (): Promise<boolean> => {
    setIsAdLoading(true);

    return new Promise((resolve) => {
      // Create overlay
      const overlay = document.createElement('div');
      overlay.id = 'rewarded-ad-overlay';
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f0f23 100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        font-family: system-ui, -apple-system, sans-serif;
      `;

      // Create container
      const container = document.createElement('div');
      container.style.cssText = `
        text-align: center;
        padding: 40px;
        max-width: 400px;
        width: 90%;
      `;

      // Animated background orbs
      const orb1 = document.createElement('div');
      orb1.style.cssText = `
        position: absolute;
        width: 300px;
        height: 300px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(0, 212, 255, 0.3) 0%, transparent 70%);
        filter: blur(60px);
        top: 10%;
        left: 10%;
        animation: float1 4s ease-in-out infinite;
      `;

      const orb2 = document.createElement('div');
      orb2.style.cssText = `
        position: absolute;
        width: 250px;
        height: 250px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, transparent 70%);
        filter: blur(50px);
        bottom: 10%;
        right: 10%;
        animation: float2 5s ease-in-out infinite;
      `;

      // Add keyframes
      const style = document.createElement('style');
      style.textContent = `
        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -30px) scale(1.1); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-20px, 20px) scale(1.05); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
        @keyframes countdown-glow {
          0%, 100% { text-shadow: 0 0 20px rgba(0, 212, 255, 0.5), 0 0 40px rgba(0, 212, 255, 0.3); }
          50% { text-shadow: 0 0 30px rgba(0, 212, 255, 0.8), 0 0 60px rgba(0, 212, 255, 0.5); }
        }
        @keyframes progress-shine {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `;
      document.head.appendChild(style);

      // Icon
      const icon = document.createElement('div');
      icon.innerHTML = `
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="url(#gradient)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#00d4ff"/>
              <stop offset="100%" style="stop-color:#a855f7"/>
            </linearGradient>
          </defs>
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
      `;
      icon.style.cssText = `
        margin-bottom: 24px;
        animation: pulse 2s ease-in-out infinite;
      `;

      // Title
      const title = document.createElement('h2');
      title.textContent = 'Rewarded Ad';
      title.style.cssText = `
        color: #ffffff;
        font-size: 28px;
        font-weight: 700;
        margin: 0 0 8px 0;
        background: linear-gradient(135deg, #00d4ff, #a855f7);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      `;

      // Subtitle
      const subtitle = document.createElement('p');
      subtitle.textContent = 'Watch to earn your reward';
      subtitle.style.cssText = `
        color: rgba(255, 255, 255, 0.6);
        font-size: 14px;
        margin: 0 0 32px 0;
      `;

      // Progress container
      const progressContainer = document.createElement('div');
      progressContainer.style.cssText = `
        width: 100%;
        height: 8px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 24px;
        position: relative;
      `;

      // Progress bar
      const progressBar = document.createElement('div');
      progressBar.style.cssText = `
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, #00d4ff, #a855f7, #00d4ff);
        background-size: 200% 100%;
        border-radius: 4px;
        transition: width 0.1s linear;
        animation: progress-shine 2s linear infinite;
      `;
      progressContainer.appendChild(progressBar);

      // Countdown
      const countdown = document.createElement('div');
      countdown.style.cssText = `
        font-size: 72px;
        font-weight: 800;
        color: #00d4ff;
        margin: 16px 0;
        animation: countdown-glow 1s ease-in-out infinite;
      `;

      // Time remaining text
      const timeText = document.createElement('p');
      timeText.style.cssText = `
        color: rgba(255, 255, 255, 0.5);
        font-size: 12px;
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 2px;
      `;
      timeText.textContent = 'seconds remaining';

      // Reward info
      const rewardInfo = document.createElement('div');
      rewardInfo.style.cssText = `
        margin-top: 32px;
        padding: 16px 24px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.1);
      `;
      rewardInfo.innerHTML = `
        <p style="color: rgba(255, 255, 255, 0.7); margin: 0; font-size: 14px;">
          🎁 Reward: <span style="color: #00ff88; font-weight: 600;">+1 Credit</span>
        </p>
      `;

      container.appendChild(icon);
      container.appendChild(title);
      container.appendChild(subtitle);
      container.appendChild(progressContainer);
      container.appendChild(countdown);
      container.appendChild(timeText);
      container.appendChild(rewardInfo);

      overlay.appendChild(orb1);
      overlay.appendChild(orb2);
      overlay.appendChild(container);
      document.body.appendChild(overlay);

      // Countdown logic
      let seconds = 5;
      let progress = 0;
      countdown.textContent = seconds.toString();

      const interval = setInterval(() => {
        progress += 2;
        progressBar.style.width = `${progress}%`;

        if (progress % 20 === 0) {
          seconds--;
          countdown.textContent = seconds.toString();
        }

        if (progress >= 100) {
          clearInterval(interval);
          
          // Show completion
          container.innerHTML = `
            <div style="
              width: 100px;
              height: 100px;
              border-radius: 50%;
              background: linear-gradient(135deg, #00ff88, #00d4ff);
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 24px;
              animation: pulse 0.5s ease-out;
            ">
              <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#0f0f23" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 style="
              color: #ffffff;
              font-size: 28px;
              font-weight: 700;
              margin: 0 0 8px 0;
              background: linear-gradient(135deg, #00ff88, #00d4ff);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
            ">Reward Earned!</h2>
            <p style="color: rgba(255, 255, 255, 0.6); font-size: 16px; margin: 0;">
              +1 Credit has been added to your account
            </p>
          `;

          setTimeout(() => {
            overlay.style.transition = 'opacity 0.3s ease';
            overlay.style.opacity = '0';
            setTimeout(() => {
              overlay.remove();
              style.remove();
              setIsAdLoading(false);
              resolve(true);
            }, 300);
          }, 1500);
        }
      }, 100);
    });
  }, []);

  return {
    showRewardedAd,
    isAdLoading
  };
};
