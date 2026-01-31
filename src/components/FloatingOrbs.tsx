import { useEffect, useRef } from 'react';
import gsap from 'gsap';

const FloatingOrbs = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const orb1Ref = useRef<HTMLDivElement>(null);
  const orb2Ref = useRef<HTMLDivElement>(null);
  const orb3Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const orbs = [
      { ref: orb1Ref.current, duration: 8 },
      { ref: orb2Ref.current, duration: 10 },
      { ref: orb3Ref.current, duration: 12 },
    ];

    const timelines: gsap.core.Timeline[] = [];

    orbs.forEach(({ ref, duration }) => {
      if (!ref) return;

      // Smooth floating animation
      const tl = gsap.timeline({ repeat: -1, yoyo: true });
      
      tl.to(ref, {
        x: 'random(-50, 50)',
        y: 'random(-30, 30)',
        duration: duration,
        ease: 'sine.inOut',
      });

      timelines.push(tl);

      // Subtle pulsing
      gsap.to(ref, {
        scale: 'random(0.9, 1.1)',
        opacity: 'random(0.3, 0.6)',
        duration: 4 + Math.random() * 2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    });

    return () => {
      timelines.forEach(tl => tl.kill());
    };
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Primary large orb - top left */}
      <div
        ref={orb1Ref}
        className="floating-orb w-[400px] h-[400px] -top-32 -left-32"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, hsl(var(--primary) / 0.1) 50%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Accent orb - right side */}
      <div
        ref={orb2Ref}
        className="floating-orb w-[350px] h-[350px] top-1/3 -right-24"
        style={{
          background: 'radial-gradient(circle, hsl(var(--accent) / 0.4) 0%, hsl(var(--accent) / 0.1) 50%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />

      {/* Bottom orb */}
      <div
        ref={orb3Ref}
        className="floating-orb w-[300px] h-[300px] -bottom-20 left-1/4"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, hsl(var(--accent) / 0.2) 50%, transparent 70%)',
          filter: 'blur(45px)',
        }}
      />
    </div>
  );
};

export default FloatingOrbs;
