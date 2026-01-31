import { useEffect, useRef, useState, useMemo } from 'react';
import { Search, Sparkles, Smartphone, CreditCard } from 'lucide-react';
import gsap from 'gsap';

interface SearchBoxProps {
  onSearch: (number: string) => void;
  isLoading: boolean;
}

const SearchBox = ({ onSearch, isLoading }: SearchBoxProps) => {
  const [number, setNumber] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);

  // Detect input type: phone or CNIC
  const inputType = useMemo(() => {
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.length === 0) return 'search';
    // CNIC is 13 digits
    if (cleaned.length === 13) return 'cnic';
    // Phone numbers (10-12 digits with possible 0 or 92 prefix)
    if (cleaned.length >= 10 && cleaned.length <= 12) return 'phone';
    // If it's getting close to 13, might be CNIC
    if (cleaned.length > 10) return 'cnic';
    return 'phone';
  }, [number]);

  // Clean number for API: remove leading 0 or 92
  const cleanNumberForApi = (input: string): string => {
    let cleaned = input.replace(/\D/g, '');
    
    // Remove leading 92 (Pakistan country code)
    if (cleaned.startsWith('92') && cleaned.length > 10) {
      cleaned = cleaned.substring(2);
    }
    // Remove leading 0
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    
    return cleaned;
  };

  useEffect(() => {
    if (!containerRef.current) return;

    gsap.fromTo(
      containerRef.current,
      { opacity: 0, y: 40, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'back.out(1.2)', delay: 0.3 }
    );
  }, []);

  // Animate icon when input type changes
  useEffect(() => {
    if (!iconRef.current) return;
    
    // Bounce animation when icon changes
    gsap.fromTo(iconRef.current, 
      { scale: 0.5, rotate: -20 },
      { scale: 1, rotate: 0, duration: 0.4, ease: 'back.out(2)' }
    );
  }, [inputType]);

  // Continuous subtle animation for the icon
  useEffect(() => {
    if (!iconRef.current || inputType === 'search') return;
    
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 2 });
    tl.to(iconRef.current, {
      y: -3,
      duration: 0.3,
      ease: 'power2.out',
    }).to(iconRef.current, {
      y: 0,
      duration: 0.3,
      ease: 'bounce.out',
    }).to(iconRef.current, {
      rotate: 10,
      duration: 0.15,
    }).to(iconRef.current, {
      rotate: -10,
      duration: 0.15,
    }).to(iconRef.current, {
      rotate: 0,
      duration: 0.2,
      ease: 'elastic.out(1, 0.5)',
    });

    return () => {
      tl.kill();
    };
  }, [inputType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!number.trim() || isLoading) return;

    if (buttonRef.current) {
      gsap.to(buttonRef.current, {
        scale: 0.95,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        ease: 'power2.inOut',
      });
    }

    // Send cleaned number to API
    const cleanedNumber = cleanNumberForApi(number);
    onSearch(cleanedNumber);
  };

  const handleFocus = () => {
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        scale: 1.02,
        duration: 0.3,
      });
    }
  };

  const handleBlur = () => {
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        scale: 1,
        duration: 0.3,
      });
    }
  };

  const getIcon = () => {
    switch (inputType) {
      case 'phone':
        return <Smartphone className="w-5 h-5 text-primary" />;
      case 'cnic':
        return <CreditCard className="w-5 h-5 text-accent" />;
      default:
        return <Search className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg mx-auto">
      <div
        ref={containerRef}
        className="space-y-3"
      >
        {/* Input */}
        <div className="glass-card rounded-2xl p-2">
          <div className="flex items-center gap-3 px-4">
            <div ref={iconRef} className="w-5 h-5 flex-shrink-0">
              {getIcon()}
            </div>
            <input
              ref={inputRef}
              type="text"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder="Enter phone number or CNIC..."
              className="flex-1 bg-transparent py-3 text-foreground placeholder:text-muted-foreground focus:outline-none font-medium min-w-0"
            />
          </div>
        </div>
        
        {/* Search Button Below */}
        <button
          ref={buttonRef}
          type="submit"
          disabled={isLoading || !number.trim()}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/25"
        >
          <Sparkles className="w-5 h-5" />
          <span>Search Database</span>
        </button>
      </div>
    </form>
  );
};

export default SearchBox;
