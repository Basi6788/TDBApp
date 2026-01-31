import { useState, useRef, useCallback, useEffect, memo } from 'react';
import { ArrowLeft, Upload, Image as ImageIcon, Sparkles, Copy, Check, X, Wand2, Download, Coins } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import FloatingOrbs from '@/components/FloatingOrbs';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCredits } from '@/contexts/CreditsContext';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';

// API Key ko secure rakhna behtar hai, abhi ke liye yahan rehne diya hai
const API_KEY = "vk-leik4EI5WtQ93v2BaWFo52maFRZHK8BZBFYQBxBAwjox2bD";

// --- 1. MEMOIZED BACKGROUND ---
const OptimizedBackground = memo(() => {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <FloatingOrbs />
    </div>
  );
});

// --- 2. FIXED ADSENSE COMPONENT (Production Ready) ---
const AdSenseBanner = memo(({ slot, format = 'auto', style = {} }: { slot: string, format?: string, style?: React.CSSProperties }) => {
  useEffect(() => {
    // Localhost check to prevent 400 errors during dev
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (isLocalhost) {
      console.log(`AdSense blocked on localhost for slot ${slot} to prevent Error 400`);
      return;
    }

    try {
        const adElement = document.getElementById(`ad-${slot}`);
        // Check if ad is already filled or processing to prevent duplicates
        if (adElement && adElement.getAttribute('data-ad-status') === 'filled') {
            return; 
        }

        // Push ad only if window object exists and slot is empty
        // @ts-ignore
        if (window.adsbygoogle) {
            // @ts-ignore
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        }
    } catch (e) {
        console.error("AdSense Error:", e);
    }
  }, [slot]);

  // Localhost pe placeholder dikhana better hai testing ke liye
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  if (isLocalhost) {
    return (
      <div className="my-4 w-full h-[100px] rounded-xl border border-dashed border-yellow-500/50 bg-yellow-500/10 flex items-center justify-center text-yellow-500 text-xs">
        [AdSense Placeholder - Slot {slot}] <br/> (Ads disabled on Localhost)
      </div>
    );
  }

  return (
    <div className="my-4 w-full min-h-[100px] overflow-hidden rounded-xl border border-white/5 bg-black/5 flex items-center justify-center backdrop-blur-sm relative z-10">
      <ins 
        id={`ad-${slot}`}
        className="adsbygoogle" 
        style={{ display: 'block', width: '100%', ...style }} 
        data-ad-client="ca-pub-3694003275001232"
        data-ad-slot={slot} 
        data-ad-format={format} 
        data-full-width-responsive="true"
      ></ins>
      <span className="text-[9px] text-muted-foreground/50 absolute bottom-1 right-2">Ad</span>
    </div>
  );
});

// --- Apple Style Loading ---
const LoadingState = () => {
  const [progress, setProgress] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [message, setMessage] = useState("Connecting to AI...");

  useEffect(() => {
    const timer = setInterval(() => setSeconds(s => s + 1), 1000);
    const progressTimer = setInterval(() => {
      setProgress(old => {
        if (old >= 92) return 92; 
        const increment = old < 30 ? 5 : old < 70 ? 2 : 0.5;
        return old + increment;
      });
    }, 150);

    const messages = ["Analyzing prompt...", "Dreaming up colors...", "Enhancing details...", "Rendering high quality...", "Almost ready..."];
    let msgIndex = 0;
    const msgTimer = setInterval(() => {
      msgIndex = (msgIndex + 1) % messages.length;
      setMessage(messages[msgIndex]);
    }, 2500);

    return () => { clearInterval(timer); clearInterval(progressTimer); clearInterval(msgTimer); };
  }, []);

  return (
    <div className="w-full aspect-square rounded-3xl overflow-hidden relative bg-secondary/10 border border-white/10 shadow-2xl z-10">
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-purple-500/10 to-blue-500/10 animate-pulse" />
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center backdrop-blur-[2px]">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-full border-[3px] border-primary/20 border-t-primary animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center font-mono text-sm font-bold opacity-80">{seconds}s</div>
        </div>
        <h3 className="text-xl font-semibold animate-pulse mb-2 tracking-tight">{message}</h3>
        <div className="w-full max-w-[240px] h-1.5 bg-secondary/50 rounded-full overflow-hidden mt-4">
          <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
};

type TabType = 'text-to-image' | 'image-to-prompt';

const AIImage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { credits, deductCredit, isAdmin } = useCredits();
  const { isAuthenticated } = useClerkAuth();
  
  const [activeTab, setActiveTab] = useState<TabType>('text-to-image');
  
  // States
  const [textPrompt, setTextPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Auth Check Helper
  const checkAuthAndCredits = useCallback((): boolean => {
    if (!isAuthenticated) {
      toast.error('Please login first to create magic!');
      navigate('/auth');
      return false;
    }
    // Admin has infinite credits
    if (!isAdmin && credits <= 0) {
      toast.error('You need more credits!');
      navigate('/settings'); // Or wherever they buy credits
      return false;
    }
    return true;
  }, [isAuthenticated, isAdmin, credits, navigate]);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) return toast.error('Please select a valid image file');
    if (file.size > 10 * 1024 * 1024) return toast.error('Image size must be less than 10MB');
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
      setGeneratedPrompt(''); // Clear previous result
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = useCallback((e: React.DragEvent, isDrop: boolean) => {
    e.preventDefault();
    setIsDragging(!isDrop);
    if (isDrop && e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
  }, []);

  // --- API Functions ---
  const generateImageFromText = async () => {
    if (!textPrompt.trim()) return toast.error('Please enter a prompt');
    if (!checkAuthAndCredits()) return;
    
    setIsGeneratingImage(true);
    setGeneratedImage(null);

    try {
      const formData = new FormData();
      formData.append('prompt', textPrompt);
      formData.append('style', 'realistic');
      formData.append('aspect_ratio', '1:1');
      formData.append('seed', Math.floor(Math.random() * 1000000).toString());

      // Note: Client-side API calls expose your Key. Ideally use Supabase Edge Function.
      const response = await fetch('https://api.vyro.ai/v2/image/generations', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${API_KEY}`,
          // 'User-Agent' header browser set karta hai, hum manually nahi set kar sakte usually
        },
        body: formData
      });

      if (!response.ok) {
        if (response.status === 402) throw new Error("API Credits exhausted on Server.");
        if (response.status === 401) throw new Error("Invalid API Key.");
        throw new Error(`Generation failed with status: ${response.status}`);
      }

      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      
      await deductCredit(); // DB update
      setGeneratedImage(imageUrl);
      toast.success('Your imagination is now reality!');

    } catch (error: any) {
      console.error("Generation Error:", error);
      toast.error(error.message || 'Something went wrong. Try again.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const generatePromptFromImage = async () => {
    if (!selectedImage) return toast.error('Upload an image first');
    if (!checkAuthAndCredits()) return;
    
    setIsGeneratingPrompt(true);
    setGeneratedPrompt('');
    
    try {
      // Remove data:image/png;base64, prefix
      const base64Data = selectedImage.split(',')[1];
      
      // Using Supabase Edge Function (Secure way)
      const { data, error } = await supabase.functions.invoke('image-to-prompt', { 
        body: { imageBase64: base64Data } 
      });

      if (error) throw error;
      
      if (data?.prompt) {
        await deductCredit();
        setGeneratedPrompt(data.prompt);
        toast.success('Image analyzed successfully!');
      } else {
        throw new Error('No prompt returned');
      }
    } catch (error) {
      console.error("Analysis Error:", error);
      toast.error('Failed to analyze image. Please try again.');
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  // Only show ads for non-admins
  const showAds = !isAdmin;

  return (
    <div className="min-h-screen relative overflow-hidden text-foreground">
      <OptimizedBackground />

      <input 
        ref={fileInputRef} 
        type="file" 
        accept="image/*" 
        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} 
        className="hidden" 
      />

      {/* Header */}
      <header className="fixed top-4 left-0 right-0 z-50 px-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate('/')} className="liquid-glass-btn p-3 rounded-2xl hover:scale-105 transition-transform backdrop-blur-md bg-background/20 border border-white/10">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          
          <div className="liquid-glass-btn rounded-full px-4 py-2 flex items-center gap-2 backdrop-blur-md bg-background/20 border border-white/10">
            <Coins className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Credits:</span>
            <span className={`font-bold text-sm ${isAdmin ? 'text-primary' : credits > 0 ? 'text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400' : 'text-destructive'}`}>
              {isAdmin ? '∞' : credits}
            </span>
          </div>
          
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 pt-24 pb-12 max-w-2xl relative z-10">
        
        {/* Top Ad */}
        {showAds && <AdSenseBanner slot="1234567890" />}

        <section className="text-center mb-6 animate-in slide-in-from-top-4 duration-700">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/10 shadow-[0_0_15px_rgba(var(--primary),0.3)]">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-display font-bold mb-2 tracking-tight">AI Art Studio</h2>
          <p className="text-muted-foreground text-sm">Create magic with words or analyze images</p>
        </section>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 glass-card p-1 rounded-2xl h-auto backdrop-blur-md bg-background/40">
            <TabsTrigger value="text-to-image" className="flex flex-col gap-1 py-3 rounded-xl data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all">
              <Wand2 className="w-4 h-4" />
              <span className="text-xs font-medium">Text to Image</span>
            </TabsTrigger>
            <TabsTrigger value="image-to-prompt" className="flex flex-col gap-1 py-3 rounded-xl data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all">
              <ImageIcon className="w-4 h-4" />
              <span className="text-xs font-medium">Image to Prompt</span>
            </TabsTrigger>
          </TabsList>

          {/* TEXT TO IMAGE TAB */}
          <TabsContent value="text-to-image" className="space-y-4 focus-visible:outline-none animate-in fade-in zoom-in-95 duration-300">
            <div className="glass-card rounded-3xl p-6 relative overflow-hidden group border border-white/10 bg-background/40 backdrop-blur-xl">
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <Textarea
                placeholder="Describe your imagination... e.g., 'A cyberpunk cat in neon rain, highly detailed, 8k'"
                value={textPrompt}
                onChange={(e) => setTextPrompt(e.target.value)}
                className="min-h-[120px] resize-none bg-secondary/30 border-0 mb-4 focus-visible:ring-1 focus-visible:ring-primary/50 text-base rounded-xl placeholder:text-muted-foreground/50"
              />
              <Button 
                onClick={generateImageFromText} 
                disabled={isGeneratingImage || !textPrompt.trim()} 
                className="w-full py-6 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all rounded-xl"
              >
                {isGeneratingImage ? 'Generating...' : <><Wand2 className="w-5 h-5 mr-2" /> Generate Art</>}
              </Button>
            </div>

            {/* Middle Ad Area */}
            {showAds && <div className="py-2"><AdSenseBanner slot="9988776655" style={{height: '100px'}} /></div>}
            
            <div className="transition-all duration-300 min-h-[50px]">
              {isGeneratingImage && (
                <div className="animate-in fade-in zoom-in-95 duration-500">
                  <LoadingState />
                </div>
              )}

              {!isGeneratingImage && generatedImage && (
                <div className="glass-card rounded-3xl p-4 animate-in fade-in slide-in-from-bottom-4 duration-700 border border-white/10 bg-background/40 backdrop-blur-xl">
                  <div className="relative rounded-2xl overflow-hidden aspect-square mb-4 shadow-2xl">
                    <img src={generatedImage} alt="Generated" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
                  </div>
                  <Button variant="outline" onClick={() => {
                     const link = document.createElement('a');
                     link.href = generatedImage;
                     link.download = `art-${Date.now()}.png`;
                     link.click();
                  }} className="w-full border-primary/20 hover:bg-primary/10 rounded-xl">
                    <Download className="w-4 h-4 mr-2" /> Download HD
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* IMAGE TO PROMPT TAB */}
          <TabsContent value="image-to-prompt" className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
            <div 
              className={`glass-card rounded-3xl p-8 transition-all duration-300 border-2 border-dashed bg-background/40 backdrop-blur-xl ${isDragging ? 'border-primary bg-primary/10 scale-[1.02]' : 'border-white/10 hover:border-primary/50'}`}
              onDragOver={(e) => handleDrag(e, false)}
              onDragLeave={(e) => handleDrag(e, true)}
              onDrop={(e) => handleDrag(e, true)}
              onClick={() => !selectedImage && fileInputRef.current?.click()}
            >
              {selectedImage ? (
                <div className="relative group">
                  <img src={selectedImage} alt="Upload" className="w-full max-h-64 object-contain rounded-xl shadow-lg mx-auto" />
                  <button onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }} className="absolute -top-3 -right-3 bg-red-500 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="text-center cursor-pointer py-4">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Upload Image</h3>
                  <p className="text-muted-foreground text-sm">Drag & drop or click to browse</p>
                </div>
              )}
            </div>

            {selectedImage && (
              <Button onClick={generatePromptFromImage} disabled={isGeneratingPrompt} className="w-full py-6 text-base rounded-xl shadow-lg shadow-primary/20">
                {isGeneratingPrompt ? 'Analyzing Magic...' : <><Sparkles className="w-5 h-5 mr-2" /> Generate Prompt</>}
              </Button>
            )}

            {generatedPrompt && (
              <div className="glass-card rounded-3xl p-6 animate-in fade-in slide-in-from-bottom-4 border border-white/10 bg-background/40 backdrop-blur-xl">
                 <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold flex items-center gap-2 text-primary">
                    <ImageIcon className="w-4 h-4" /> Result
                  </h4>
                  <Button variant="ghost" size="sm" className="rounded-full" onClick={() => {navigator.clipboard.writeText(generatedPrompt); setCopied(true); setTimeout(()=>setCopied(false), 2000);}}>
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="bg-black/20 p-4 rounded-xl text-sm leading-relaxed text-muted-foreground max-h-40 overflow-y-auto custom-scrollbar border border-white/5">
                  {generatedPrompt}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        {/* Bottom Ad */}
        {showAds && <div className="mt-8"><AdSenseBanner slot="1234567899" style={{height: '200px'}} /></div>}
      </main>
    </div>
  );
};

export default AIImage;

