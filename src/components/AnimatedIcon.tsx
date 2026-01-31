import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { LucideIcon } from 'lucide-react';

interface AnimatedIconProps {
  icon: LucideIcon;
  className?: string;
  animate?: boolean;
}

const AnimatedIcon = ({ icon: Icon, className = '', animate = true }: AnimatedIconProps) => {
  const iconRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!animate || !iconRef.current) return;

    const tl = gsap.timeline({ repeat: -1, repeatDelay: 3 });
    tl.to(iconRef.current, {
      scale: 1.15,
      rotate: 3,
      duration: 0.3,
      ease: 'power2.out',
    })
      .to(iconRef.current, {
        scale: 1,
        rotate: 0,
        duration: 0.4,
        ease: 'elastic.out(1, 0.3)',
      });

    return () => {
      tl.kill();
    };
  }, [animate]);

  return (
    <div ref={iconRef} className={className}>
      <Icon className="w-full h-full" />
    </div>
  );
};

export default AnimatedIcon;
