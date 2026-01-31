import { useEffect, useRef } from 'react';
import { Database, Shield, Zap } from 'lucide-react';
import gsap from 'gsap';
import AnimatedIcon from './AnimatedIcon';

const Hero = () => {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const badgesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline();

    tl.fromTo(
      titleRef.current,
      { opacity: 0, y: 30, rotateX: -20 },
      { opacity: 1, y: 0, rotateX: 0, duration: 0.8, ease: 'back.out(1.2)' }
    )
      .fromTo(
        subtitleRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' },
        '-=0.4'
      )
      .fromTo(
        badgesRef.current?.children || [],
        { opacity: 0, y: 20, scale: 0.8 },
        { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.1, ease: 'back.out(1.5)' },
        '-=0.3'
      );
  }, []);

  const badges = [
    { icon: Database, label: 'Database Lookup' },
    { icon: Shield, label: 'Secure Query' },
    { icon: Zap, label: 'Instant Results' },
  ];

  return (
    <div className="text-center mb-12 relative z-10">
      <h1
        ref={titleRef}
        className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold mb-4"
        style={{ perspective: '1000px' }}
      >
        <span className="text-gradient">Number Lookup</span>
        <br />
        <span className="text-foreground">Intelligence</span>
      </h1>
      <p
        ref={subtitleRef}
        className="text-lg text-muted-foreground max-w-md mx-auto mb-8"
      >
        Instantly retrieve detailed information from phone numbers and CNIC records
      </p>
      <div ref={badgesRef} className="flex flex-wrap justify-center gap-3">
        {badges.map(({ icon, label }) => (
          <div
            key={label}
            className="glass-card px-4 py-2 rounded-full flex items-center gap-2"
          >
            <AnimatedIcon icon={icon} className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Hero;
