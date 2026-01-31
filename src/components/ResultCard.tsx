import { useEffect, useRef } from 'react';
import { User, MapPin, Phone, CreditCard, Hash } from 'lucide-react';
import gsap from 'gsap';
import CopyButton from './CopyButton';
import AnimatedIcon from './AnimatedIcon';

interface ResultData {
  full_name?: string;
  phone?: string;
  cnic?: string;
  address?: string;
  [key: string]: string | undefined;
}

interface ResultCardProps {
  data: ResultData;
  index: number;
}

const ResultCard = ({ data, index }: ResultCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const fieldsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cardRef.current) return;

    // Card entrance animation
    const tl = gsap.timeline();
    
    tl.fromTo(
      cardRef.current,
      {
        opacity: 0,
        y: 80,
        rotateX: -20,
        scale: 0.85,
      },
      {
        opacity: 1,
        y: 0,
        rotateX: 0,
        scale: 1,
        duration: 0.7,
        delay: index * 0.15,
        ease: 'back.out(1.4)',
      }
    );

    // Stagger animate fields
    if (fieldsRef.current) {
      gsap.fromTo(
        fieldsRef.current.children,
        { opacity: 0, x: -20 },
        { 
          opacity: 1, 
          x: 0, 
          stagger: 0.1, 
          duration: 0.4, 
          delay: 0.3 + index * 0.15,
          ease: 'power2.out' 
        }
      );
    }

    // Add hover animation
    const card = cardRef.current;
    const handleMouseEnter = () => {
      gsap.to(card, {
        scale: 1.02,
        boxShadow: '0 25px 50px -12px hsl(var(--primary) / 0.25)',
        duration: 0.3,
        ease: 'power2.out'
      });
    };
    const handleMouseLeave = () => {
      gsap.to(card, {
        scale: 1,
        boxShadow: '0 8px 32px hsl(var(--glass-shadow))',
        duration: 0.3,
        ease: 'power2.out'
      });
    };

    card.addEventListener('mouseenter', handleMouseEnter);
    card.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      card.removeEventListener('mouseenter', handleMouseEnter);
      card.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [index]);

  const getDisplayName = (key: string): string => {
    const nameMap: Record<string, string> = {
      full_name: 'Name',
      phone: 'Phone',
      cnic: 'CNIC',
      address: 'Address',
    };
    return nameMap[key] || key.toUpperCase();
  };

  const getAllText = () => {
    return Object.entries(data)
      .filter(([_, value]) => value)
      .map(([key, value]) => `${getDisplayName(key)}: ${value}`)
      .join('\n');
  };

  const getIcon = (key: string) => {
    const iconMap: Record<string, typeof User> = {
      full_name: User,
      cnic: CreditCard,
      address: MapPin,
      phone: Phone,
    };
    return iconMap[key.toLowerCase()] || Hash;
  };

  const fields = Object.entries(data).filter(([_, value]) => value);

  return (
    <div
      ref={cardRef}
      className="glass-card rounded-2xl p-6 relative overflow-hidden cursor-pointer"
      style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
    >
      {/* Decorative gradient orbs */}
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-24 h-24 rounded-full bg-accent/20 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <AnimatedIcon icon={User} className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display font-semibold text-lg truncate">{data.full_name || 'Unknown'}</h3>
            <p className="text-xs text-muted-foreground">Record #{index + 1}</p>
          </div>
        </div>
        <CopyButton text={getAllText()} label="Copy All" variant="full" />
      </div>

      {/* Fields */}
      <div ref={fieldsRef} className="space-y-3">
        {fields.map(([key, value]) => {
          const IconComponent = getIcon(key);
          return (
            <div
              key={key}
              className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors duration-200 gap-2"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <AnimatedIcon icon={IconComponent} className="w-4 h-4 text-primary" animate={false} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{getDisplayName(key)}</p>
                  <p className="font-medium truncate">{value}</p>
                </div>
              </div>
              <CopyButton text={value || ''} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ResultCard;
