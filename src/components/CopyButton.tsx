import { useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import gsap from 'gsap';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
  variant?: 'icon' | 'full';
}

const CopyButton = ({ text, label, className = '', variant = 'icon' }: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);

    if (iconRef.current && buttonRef.current) {
      gsap.fromTo(
        iconRef.current,
        { scale: 0, rotate: -180 },
        { scale: 1, rotate: 0, duration: 0.4, ease: 'back.out(1.7)' }
      );

      gsap.to(buttonRef.current, {
        boxShadow: '0 0 20px hsl(142 76% 36% / 0.5)',
        duration: 0.2,
        yoyo: true,
        repeat: 1,
      });
    }

    setTimeout(() => setCopied(false), 2000);
  };

  if (variant === 'full') {
    return (
      <button
        ref={buttonRef}
        onClick={handleCopy}
        className={`px-3 py-2 rounded-xl flex items-center gap-2 hover:bg-secondary/50 transition-all duration-200 ${className}`}
      >
        <div ref={iconRef} className="w-4 h-4">
          {copied ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4 text-primary" />
          )}
        </div>
        <span className="text-sm font-medium text-foreground">{label || 'Copy All'}</span>
      </button>
    );
  }

  return (
    <button
      ref={buttonRef}
      onClick={handleCopy}
      className={`p-2 rounded-lg hover:bg-secondary/50 transition-all duration-200 ${className}`}
      title="Copy to clipboard"
    >
      <div ref={iconRef} className="w-4 h-4">
        {copied ? (
          <Check className="w-4 h-4 text-green-500" />
        ) : (
          <Copy className="w-4 h-4 text-muted-foreground hover:text-primary" />
        )}
      </div>
    </button>
  );
};

export default CopyButton;
