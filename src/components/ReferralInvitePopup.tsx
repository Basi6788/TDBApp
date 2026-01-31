import { useEffect, useRef } from 'react';
import { User, Gift, X } from 'lucide-react';
import gsap from 'gsap';

interface ReferralInvitePopupProps {
  inviterName: string;
  inviterAvatar: string;
  onAccept: () => void;
  onDecline: () => void;
}

const ReferralInvitePopup = ({ 
  inviterName, 
  inviterAvatar, 
  onAccept, 
  onDecline 
}: ReferralInvitePopupProps) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Animate in
    if (overlayRef.current && popupRef.current) {
      gsap.fromTo(
        overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
      gsap.fromTo(
        popupRef.current,
        { opacity: 0, scale: 0.8, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.4, delay: 0.1, ease: 'back.out(1.7)' }
      );
    }
  }, []);

  const handleClose = (callback: () => void) => {
    if (overlayRef.current && popupRef.current) {
      gsap.to(popupRef.current, {
        opacity: 0,
        scale: 0.9,
        y: 10,
        duration: 0.2,
        ease: 'power2.in'
      });
      gsap.to(overlayRef.current, {
        opacity: 0,
        duration: 0.2,
        delay: 0.1,
        onComplete: callback
      });
    }
  };

  return (
    <div 
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
    >
      <div 
        ref={popupRef}
        className="w-full max-w-sm glass-card rounded-3xl p-6 relative overflow-hidden"
      >
        {/* Decorative glow */}
        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-primary/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-accent/30 blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={() => handleClose(onDecline)}
          className="absolute top-4 right-4 p-2 rounded-xl hover:bg-secondary/50 transition-colors"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Content */}
        <div className="relative z-10 text-center">
          {/* Gift icon */}
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/20 flex items-center justify-center animate-pulse-glow">
            <Gift className="w-8 h-8 text-primary" />
          </div>

          <h2 className="text-xl font-bold text-foreground mb-2">
            You've been invited!
          </h2>
          
          <p className="text-sm text-muted-foreground mb-6">
            Accept the invitation to receive <span className="text-primary font-bold">5 bonus credits</span>
          </p>

          {/* Inviter info */}
          <div className="glass-card rounded-2xl p-4 mb-6 flex items-center gap-4">
            {inviterAvatar ? (
              <img 
                src={inviterAvatar} 
                alt={inviterName}
                className="w-14 h-14 rounded-full border-2 border-primary/30"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary/30">
                <User className="w-7 h-7 text-primary" />
              </div>
            )}
            <div className="text-left flex-1">
              <p className="text-xs text-muted-foreground">Invited by</p>
              <p className="font-bold text-foreground">{inviterName}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => handleClose(onDecline)}
              className="flex-1 py-3 px-4 rounded-xl border border-border text-muted-foreground hover:bg-secondary/50 transition-all font-medium"
            >
              Decline
            </button>
            <button
              onClick={() => handleClose(onAccept)}
              className="flex-1 py-3 px-4 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-all font-medium shadow-lg shadow-primary/30"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralInvitePopup;
