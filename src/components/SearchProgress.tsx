import { useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import gsap from 'gsap';

interface SearchProgressProps {
  isLoading: boolean;
}

const SearchProgress = ({ isLoading }: SearchProgressProps) => {
  const progressRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!progressRef.current || !containerRef.current) return;

    if (isLoading) {
      gsap.set(containerRef.current, { display: 'block' });
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      );

      // Progress bar animation
      const progressTl = gsap.timeline({ repeat: -1 });
      progressTl
        .fromTo(
          progressRef.current,
          { scaleX: 0, transformOrigin: 'left' },
          { scaleX: 1, duration: 1, ease: 'power2.inOut' }
        )
        .to(progressRef.current, {
          scaleX: 0,
          transformOrigin: 'right',
          duration: 0.3,
          ease: 'power2.in',
        })
        .set(progressRef.current, { transformOrigin: 'left' });

      // Icon animation
      if (iconRef.current) {
        gsap.to(iconRef.current, {
          scale: 1.1,
          duration: 0.5,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      }

      return () => {
        progressTl.kill();
      };
    } else {
      gsap.to(containerRef.current, {
        opacity: 0,
        y: -10,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: () => {
          gsap.set(containerRef.current, { display: 'none' });
        },
      });
    }
  }, [isLoading]);

  return (
    <div
      ref={containerRef}
      className="w-full max-w-md mx-auto mt-6 hidden"
    >
      <div className="glass-card rounded-xl p-4">
        {/* Progress track */}
        <div className="h-2 rounded-full bg-secondary/50 overflow-hidden mb-3">
          <div
            ref={progressRef}
            className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-primary"
            style={{ transformOrigin: 'left' }}
          />
        </div>

        {/* Status */}
        <div className="flex items-center justify-center gap-2">
          <div ref={iconRef} className="text-primary">
            <Search className="w-4 h-4" />
          </div>
          <p className="text-sm text-muted-foreground">Searching...</p>
        </div>
      </div>
    </div>
  );
};

export default SearchProgress;
