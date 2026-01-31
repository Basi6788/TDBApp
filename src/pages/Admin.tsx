import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Palette, Server, Key, Loader2, Plus, Trash2, Ban, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import FloatingOrbs from '@/components/FloatingOrbs';
import ThemeToggle from '@/components/ThemeToggle';

interface SuperKey {
  id: string;
  key_code: string;
  credits_amount: number;
  validity_days: number;
  is_active: boolean;
  is_used: boolean;
  used_by_device_id: string | null;
  used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

interface SiteSetting {
  id: string;
  setting_key: string;
  setting_value: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const [settings, setSettings] = useState<SiteSetting[]>([]);
  const [keys, setKeys] = useState<SuperKey[]>([]);
  const [loading, setLoading] = useState(true);

  // Key generation form
  const [newKeyCredits, setNewKeyCredits] = useState('1000');
  const [newKeyDays, setNewKeyDays] = useState('30');
  const [generatingKey, setGeneratingKey] = useState(false);

  // API URL form
  const [apiUrl, setApiUrl] = useState('');
  const [savingApi, setSavingApi] = useState(false);

  // Referral domain form
  const [referralDomain, setReferralDomain] = useState('');
  const [savingDomain, setSavingDomain] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!loading && containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }
      );
    }
  }, [loading]);

  const fetchData = async () => {
    try {
      const [settingsRes, keysRes] = await Promise.all([
        supabase.from('site_settings').select('*'),
        supabase.from('super_keys').select('*').order('created_at', { ascending: false })
      ]);

      if (settingsRes.data) {
        setSettings(settingsRes.data);
        const apiSetting = settingsRes.data.find(s => s.setting_key === 'api_url');
        if (apiSetting) setApiUrl(apiSetting.setting_value);
        const domainSetting = settingsRes.data.find(s => s.setting_key === 'referral_domain');
        if (domainSetting) setReferralDomain(domainSetting.setting_value);
      }

      if (keysRes.data) {
        setKeys(keysRes.data);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateKey = async () => {
    setGeneratingKey(true);
    try {
      const keyCode = 'SK-' + Math.random().toString(36).substring(2, 10).toUpperCase() + 
                      '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

      const { error } = await supabase
        .from('super_keys')
        .insert({
          key_code: keyCode,
          credits_amount: parseInt(newKeyCredits) || 1000,
          validity_days: parseInt(newKeyDays) || 30
        });

      if (error) throw error;

      toast.success('Key generated: ' + keyCode);
      fetchData();
    } catch (err) {
      console.error('Error generating key:', err);
      toast.error('Failed to generate key');
    } finally {
      setGeneratingKey(false);
    }
  };

  const toggleKeyStatus = async (key: SuperKey) => {
    try {
      await supabase
        .from('super_keys')
        .update({ is_active: !key.is_active })
        .eq('id', key.id);

      toast.success(key.is_active ? 'Key blocked' : 'Key activated');
      fetchData();
    } catch (err) {
      console.error('Error toggling key:', err);
      toast.error('Failed to update key');
    }
  };

  const deleteKey = async (keyId: string) => {
    try {
      await supabase
        .from('super_keys')
        .delete()
        .eq('id', keyId);

      toast.success('Key deleted');
      fetchData();
    } catch (err) {
      console.error('Error deleting key:', err);
      toast.error('Failed to delete key');
    }
  };

  const saveApiUrl = async () => {
    setSavingApi(true);
    try {
      await supabase
        .from('site_settings')
        .update({ setting_value: apiUrl })
        .eq('setting_key', 'api_url');

      toast.success('API URL updated');
    } catch (err) {
      console.error('Error saving API:', err);
      toast.error('Failed to save API URL');
    } finally {
      setSavingApi(false);
    }
  };

  const saveReferralDomain = async () => {
    setSavingDomain(true);
    try {
      // First check if setting exists
      const { data } = await supabase
        .from('site_settings')
        .select('*')
        .eq('setting_key', 'referral_domain')
        .single();

      if (data) {
        await supabase
          .from('site_settings')
          .update({ setting_value: referralDomain })
          .eq('setting_key', 'referral_domain');
      } else {
        await supabase
          .from('site_settings')
          .insert({ setting_key: 'referral_domain', setting_value: referralDomain });
      }

      toast.success('Referral domain updated');
    } catch (err) {
      console.error('Error saving domain:', err);
      toast.error('Failed to save domain');
    } finally {
      setSavingDomain(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingOrbs />

      {/* Header */}
      <div className="fixed top-6 left-6 z-50">
        <button
          onClick={() => navigate('/settings')}
          className="p-3 glass-card rounded-xl hover:scale-105 transition-transform duration-200"
        >
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
      </div>

      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <main className="container mx-auto px-4 py-24 relative z-10">
        <div className="max-w-3xl mx-auto" ref={containerRef}>
          <h1 className="text-3xl font-display font-bold text-center mb-2">Admin Panel</h1>
          <p className="text-muted-foreground text-center mb-8">Manage your website</p>

          <Tabs defaultValue="customize" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="customize" className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Customize
              </TabsTrigger>
              <TabsTrigger value="api" className="flex items-center gap-2">
                <Server className="w-4 h-4" />
                API
              </TabsTrigger>
              <TabsTrigger value="keys" className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                Keys
              </TabsTrigger>
            </TabsList>

            {/* Customize Tab */}
            <TabsContent value="customize">
              <div className="glass-card rounded-2xl p-6">
                <h2 className="text-xl font-semibold mb-4">Website Customization</h2>
                <p className="text-muted-foreground">
                  Coming soon... You'll be able to customize colors, fonts, and layout here.
                </p>
              </div>
            </TabsContent>

            {/* API Tab */}
            <TabsContent value="api">
              <div className="space-y-6">
                <div className="glass-card rounded-2xl p-6">
                  <h2 className="text-xl font-semibold mb-4">API Configuration</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-muted-foreground mb-2 block">API URL</label>
                      <Input 
                        value={apiUrl}
                        onChange={(e) => setApiUrl(e.target.value)}
                        placeholder="https://api.example.com/..."
                      />
                    </div>
                    <Button onClick={saveApiUrl} disabled={savingApi}>
                      {savingApi ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Save API URL
                    </Button>
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-6">
                  <h2 className="text-xl font-semibold mb-4">Referral Domain</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-muted-foreground mb-2 block">Custom Domain for Referral Links</label>
                      <Input 
                        value={referralDomain}
                        onChange={(e) => setReferralDomain(e.target.value)}
                        placeholder="https://yourdomain.com"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Leave empty to use default domain. Referral links will use this domain.
                      </p>
                    </div>
                    <Button onClick={saveReferralDomain} disabled={savingDomain}>
                      {savingDomain ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Save Domain
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Keys Tab */}
            <TabsContent value="keys">
              <div className="space-y-6">
                {/* Generate Key */}
                <div className="glass-card rounded-2xl p-6">
                  <h2 className="text-xl font-semibold mb-4">Generate Super Key</h2>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-sm text-muted-foreground mb-2 block">Credits</label>
                      <Input 
                        type="number"
                        value={newKeyCredits}
                        onChange={(e) => setNewKeyCredits(e.target.value)}
                        placeholder="1000"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-2 block">Validity (days)</label>
                      <Input 
                        type="number"
                        value={newKeyDays}
                        onChange={(e) => setNewKeyDays(e.target.value)}
                        placeholder="30"
                      />
                    </div>
                  </div>
                  <Button onClick={generateKey} disabled={generatingKey} className="w-full">
                    {generatingKey ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Generate Key
                  </Button>
                </div>

                {/* Keys List */}
                <div className="glass-card rounded-2xl p-6">
                  <h2 className="text-xl font-semibold mb-4">All Keys ({keys.length})</h2>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {keys.map((key) => (
                      <div 
                        key={key.id} 
                        className={`p-4 rounded-xl ${
                          key.is_active 
                            ? 'bg-secondary/50' 
                            : 'bg-destructive/10'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <code className="text-sm font-mono">{key.key_code}</code>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => toggleKeyStatus(key)}
                            >
                              {key.is_active ? (
                                <Ban className="w-4 h-4 text-destructive" />
                              ) : (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => deleteKey(key.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                          <span>{key.credits_amount} credits</span>
                          <span>•</span>
                          <span>{key.validity_days} days</span>
                          <span>•</span>
                          <span>{key.is_used ? 'Used' : 'Available'}</span>
                          {key.expires_at && (
                            <>
                              <span>•</span>
                              <span>Expires: {new Date(key.expires_at).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    {keys.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">No keys generated yet</p>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Admin;
