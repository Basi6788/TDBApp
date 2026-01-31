import { useEffect, useRef, useState } from 'react';
import { Menu, X, Home, User, Settings, ChevronDown, Key, Gift, Play, LogIn, Sparkles, Users } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';
import gsap from 'gsap';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar = ({ isOpen, onToggle }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useClerkAuth();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const menuItemsRef = useRef<HTMLDivElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const menuItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Sparkles, label: 'AI Image', path: '/ai-image' },
  ];

  useEffect(() => {
    if (!sidebarRef.current || !overlayRef.current) return;

    if (isOpen) {
      gsap.to(overlayRef.current, {
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out',
        display: 'block'
      });
      gsap.to(sidebarRef.current, {
        x: 0,
        duration: 0.4,
        ease: 'power3.out'
      });
      
      // Animate menu items
      if (menuItemsRef.current) {
        gsap.fromTo(
          menuItemsRef.current.children,
          { x: -30, opacity: 0 },
          { 
            x: 0, 
            opacity: 1, 
            stagger: 0.08, 
            duration: 0.4, 
            delay: 0.2,
            ease: 'power2.out' 
          }
        );
      }
    } else {
      gsap.to(overlayRef.current, {
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: () => {
          if (overlayRef.current) overlayRef.current.style.display = 'none';
        }
      });
      gsap.to(sidebarRef.current, {
        x: '-100%',
        duration: 0.3,
        ease: 'power3.in'
      });
    }
  }, [isOpen]);

  const handleNavigation = (path: string) => {
    navigate(path);
    onToggle();
  };

  return (
    <>
      {/* Hamburger Button - Liquid Glass */}
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-[60] p-3 liquid-glass-btn rounded-2xl"
      >
        <div className="relative w-6 h-6">
          <Menu 
            className={`w-6 h-6 text-foreground absolute transition-all duration-300 ${isOpen ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'}`} 
          />
          <X 
            className={`w-6 h-6 text-foreground absolute transition-all duration-300 ${isOpen ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'}`} 
          />
        </div>
      </button>

      {/* Overlay */}
      <div
        ref={overlayRef}
        onClick={onToggle}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 hidden"
        style={{ opacity: 0 }}
      />

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className="fixed left-0 top-0 h-full w-72 glass-card z-50 p-6 pt-20 overflow-y-auto"
        style={{ transform: 'translateX(-100%)' }}
      >
        {/* Logo/Brand */}
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-display font-bold text-gradient">NumLookup</h2>
          <p className="text-sm text-muted-foreground mt-1">Database Search</p>
        </div>

        {/* Decorative orb */}
        <div className="absolute -top-20 -left-20 w-40 h-40 rounded-full bg-primary/20 blur-3xl pointer-events-none" />

        {/* Menu Items */}
        <nav ref={menuItemsRef} className="space-y-2 mb-6">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <button
                key={index}
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-primary/20 text-primary' 
                    : 'hover:bg-secondary/50 text-foreground'
                }`}
              >
                <div className={`p-2 rounded-lg transition-colors ${
                  isActive ? 'bg-primary/20' : 'bg-secondary/50 group-hover:bg-primary/10'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}

          {/* Auth-based items */}
          {isAuthenticated ? (
            <>
              {/* Profile */}
              <button
                onClick={() => handleNavigation('/profile')}
                className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 group ${
                  location.pathname === '/profile' 
                    ? 'bg-primary/20 text-primary' 
                    : 'hover:bg-secondary/50 text-foreground'
                }`}
              >
                <div className={`p-2 rounded-lg transition-colors ${
                  location.pathname === '/profile' ? 'bg-primary/20' : 'bg-secondary/50 group-hover:bg-primary/10'
                }`}>
                  <User className="w-5 h-5" />
                </div>
                <span className="font-medium">Profile</span>
              </button>

              {/* Referrals - Dedicated page */}
              <button
                onClick={() => handleNavigation('/referral')}
                className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 group ${
                  location.pathname === '/referral' 
                    ? 'bg-primary/20 text-primary' 
                    : 'hover:bg-secondary/50 text-foreground'
                }`}
              >
                <div className={`p-2 rounded-lg transition-colors ${
                  location.pathname === '/referral' ? 'bg-primary/20' : 'bg-secondary/50 group-hover:bg-primary/10'
                }`}>
                  <Users className="w-5 h-5" />
                </div>
                <span className="font-medium">Referrals</span>
              </button>

              {/* Settings */}
              <button
                onClick={() => handleNavigation('/settings')}
                className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 group ${
                  location.pathname === '/settings' 
                    ? 'bg-primary/20 text-primary' 
                    : 'hover:bg-secondary/50 text-foreground'
                }`}
              >
                <div className={`p-2 rounded-lg transition-colors ${
                  location.pathname === '/settings' ? 'bg-primary/20' : 'bg-secondary/50 group-hover:bg-primary/10'
                }`}>
                  <Settings className="w-5 h-5" />
                </div>
                <span className="font-medium">Settings</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => handleNavigation('/auth')}
              className="w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 group hover:bg-secondary/50 text-foreground"
            >
              <div className="p-2 rounded-lg bg-secondary/50 group-hover:bg-primary/10 transition-colors">
                <LogIn className="w-5 h-5" />
              </div>
              <span className="font-medium">Login / Sign Up</span>
            </button>
          )}
        </nav>

        {/* Sidebar Ad removed */}

        {/* Footer */}
        <div className="absolute bottom-6 left-6 right-6">
          <div className="glass-card rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground">
              Powered by{' '}
              <a href="https://uchihas.foundation" target="_blank" rel="noopener noreferrer" className="text-gradient font-medium hover:underline">
                Uchihas.foundation
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
