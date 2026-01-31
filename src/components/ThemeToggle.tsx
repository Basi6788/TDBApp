import { useEffect, useRef, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import gsap from 'gsap';

const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored) return stored === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const iconRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Initialize on mount
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = stored ? stored === 'dark' : prefersDark;
    
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    }
  }, []);

  const handleToggle = () => {
    if (iconRef.current && buttonRef.current) {
      gsap.to(iconRef.current, {
        rotateY: 180,
        scale: 0,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => {
          setIsDark(!isDark);
          gsap.fromTo(
            iconRef.current,
            { rotateY: -180, scale: 0 },
            { rotateY: 0, scale: 1, duration: 0.3, ease: 'back.out(1.7)' }
          );
        },
      });

      gsap.to(buttonRef.current, {
        scale: 1.1,
        duration: 0.15,
        yoyo: true,
        repeat: 1,
      });
    } else {
      setIsDark(!isDark);
    }
  };

  return (
    <button
      ref={buttonRef}
      onClick={handleToggle}
      className="liquid-glass-btn p-3 rounded-2xl"
      aria-label="Toggle theme"
    >
      <div ref={iconRef} className="w-5 h-5">
        {isDark ? (
          <Sun className="w-5 h-5 text-primary" />
        ) : (
          <Moon className="w-5 h-5 text-primary" />
        )}
      </div>
    </button>
  );
};

export default ThemeToggle;
