import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignIn, useSignUp, useAuth } from '@clerk/clerk-react';
import { Mail, Lock, User, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import FloatingOrbs from '@/components/FloatingOrbs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const Auth = () => {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [signupStep, setSignupStep] = useState('form'); // 'form' | 'verify'
  const [forgotStep, setForgotStep] = useState('request'); // 'request' | 'verify'
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { signIn, isLoaded: signInLoaded, setActive } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();

  // Redirect if already authenticated
  useEffect(() => {
    if (authLoaded && isSignedIn) {
      navigate('/');
    }
  }, [isSignedIn, authLoaded, navigate]);

  const title = useMemo(() => {
    if (mode === 'forgot') return forgotStep === 'verify' ? 'Enter OTP' : 'Reset your password';
    if (mode === 'signup') return 'Create your account';
    return 'Welcome back';
  }, [mode, forgotStep]);

  const showClerkError = (err, fallback) => {
    const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || fallback;
    toast.error(msg);
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!signInLoaded || !signUpLoaded || !signIn || !signUp) return;
    
    setIsLoading(true);
    try {
      if (mode === 'signup') {
        
        // NAME SPLITTING LOGIC (Fixes 422 Error)
        const nameParts = name.trim().split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || undefined;

        const result = await signUp.create({
          emailAddress: email,
          password,
          firstName: firstName,
          lastName: lastName,
        });

        if (result.status === 'complete' && result.createdSessionId) {
          await setActive({ session: result.createdSessionId });
          toast.success('Account created successfully!');
          navigate('/');
          return;
        }

        // OTP (email code) verification
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        toast.success('OTP sent to your email');
        setOtp('');
        setSignupStep('verify');
        return;

      } else if (mode === 'signin') {
        const result = await signIn.create({
          identifier: email,
          password,
        });
        
        if (result.status === 'complete' && result.createdSessionId) {
          await setActive({ session: result.createdSessionId });
          toast.success('Welcome back!');
          navigate('/');
        }
      }
    } catch (error) {
      showClerkError(error, 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupOtpVerify = async (e) => {
    e.preventDefault();
    if (!signUpLoaded || !signUp) return;

    setIsLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: otp });
      if (result.status === 'complete' && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        toast.success('Verified!');
        navigate('/');
        return;
      }
      toast.error('OTP verification incomplete');
    } catch (error) {
      showClerkError(error, 'Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!signInLoaded || !signIn) return;
    
    setIsLoading(true);
    try {
      // OTP-based reset
      await signIn.create({ strategy: 'reset_password_email_code', identifier: email });
      toast.success('OTP sent to your email');
      setForgotStep('verify');
      setOtp('');
      setNewPassword('');
    } catch (error) {
      showClerkError(error, 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotOtpVerify = async (e) => {
    e.preventDefault();
    if (!signInLoaded || !signIn) return;

    setIsLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: otp,
        password: newPassword,
      });

      if (result.status === 'complete' && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        toast.success('Password updated');
        navigate('/');
        return;
      }

      toast.error('Could not reset password');
    } catch (error) {
      showClerkError(error, 'Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialAuth = async (provider) => {
    if (!signInLoaded || !signIn) return;
    
    try {
      await signIn.authenticateWithRedirect({
        strategy: provider,
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/',
      });
    } catch (error) {
      showClerkError(error, 'Social login failed');
    }
  };

  if (!authLoaded || !signInLoaded || !signUpLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-fuchsia-500/10 to-orange-400/20 dark:from-violet-900/30 dark:via-fuchsia-800/20 dark:to-orange-600/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      
      {/* Animated background orbs */}
      <FloatingOrbs />

      {/* Auth container */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          
          {/* Header (Logo Removed, kept simple title) */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-400 bg-clip-text text-transparent">
              {title}
            </h2>
          </div>

          {/* Glass card */}
          <div className="glass-card rounded-3xl p-8 backdrop-blur-2xl border border-white/20 shadow-2xl shadow-black/10">
            
            {/* Forgot Password Mode */}
            {mode === 'forgot' ? (
              <>
                <button
                  onClick={() => {
                    setMode('signin');
                    setForgotStep('request');
                    setOtp('');
                    setNewPassword('');
                  }}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to sign in
                </button>

                {forgotStep === 'request' ? (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-12 h-14 rounded-2xl bg-white/5 border-white/10 focus:border-primary/50 focus:ring-primary/20"
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-14 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-400 hover:from-violet-500 hover:via-fuchsia-400 hover:to-orange-300 text-white font-semibold text-lg shadow-xl shadow-fuchsia-500/25 transition-all duration-300 hover:shadow-2xl hover:shadow-fuchsia-500/30 hover:scale-[1.02]"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send OTP'}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleForgotOtpVerify} className="space-y-4">
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="Enter OTP"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="pl-12 h-14 rounded-2xl bg-white/5 border-white/10 focus:border-primary/50 focus:ring-primary/20"
                        required
                      />
                    </div>

                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="New password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pl-12 pr-12 h-14 rounded-2xl bg-white/5 border-white/10 focus:border-primary/50 focus:ring-primary/20"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-14 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-400 hover:from-violet-500 hover:via-fuchsia-400 hover:to-orange-300 text-white font-semibold text-lg shadow-xl shadow-fuchsia-500/25 transition-all duration-300 hover:shadow-2xl hover:shadow-fuchsia-500/30 hover:scale-[1.02]"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify OTP & Reset'}
                    </Button>
                  </form>
                )}
              </>
            ) : (
              <>
                {/* Social Login Buttons */}
                <div className="space-y-3 mb-6">
                  <button
                    onClick={() => handleSocialAuth('oauth_google')}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-300 group"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span className="font-medium text-foreground">Continue with Google</span>
                  </button>

                  <button
                    onClick={() => handleSocialAuth('oauth_facebook')}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-300 group"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    <span className="font-medium text-foreground">Continue with Facebook</span>
                  </button>

                  <button
                    onClick={() => handleSocialAuth('oauth_apple')}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-300 group"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                    <span className="font-medium text-foreground">Continue with Apple</span>
                  </button>
                </div>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-card/50 text-muted-foreground backdrop-blur-sm rounded-full">
                      or continue with email
                    </span>
                  </div>
                </div>

                {/* Email/Password Form */}
                <form onSubmit={handleEmailAuth} className="space-y-4">
                  {mode === 'signup' && (
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Full Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-12 h-14 rounded-2xl bg-white/5 border-white/10 focus:border-primary/50 focus:ring-primary/20"
                        required={mode === 'signup'}
                      />
                    </div>
                  )}
                  
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-12 h-14 rounded-2xl bg-white/5 border-white/10 focus:border-primary/50 focus:ring-primary/20"
                      required
                    />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-12 pr-12 h-14 rounded-2xl bg-white/5 border-white/10 focus:border-primary/50 focus:ring-primary/20"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Clerk CAPTCHA mount */}
                  {mode === 'signup' && <div id="clerk-captcha" className="pt-2" />}

                  {/* Forgot Password Link */}
                  {mode === 'signin' && (
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => setMode('forgot')}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-14 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-400 hover:from-violet-500 hover:via-fuchsia-400 hover:to-orange-300 text-white font-semibold text-lg shadow-xl shadow-fuchsia-500/25 transition-all duration-300 hover:shadow-2xl hover:shadow-fuchsia-500/30 hover:scale-[1.02]"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : mode === 'signup' ? (
                      'Create Account'
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>

                {/* Sign up OTP verification */}
                {mode === 'signup' && signupStep === 'verify' && (
                  <form onSubmit={handleSignupOtpVerify} className="space-y-4 mt-4">
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="Enter OTP from email"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="pl-12 h-14 rounded-2xl bg-white/5 border-white/10 focus:border-primary/50 focus:ring-primary/20"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-14 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-400 hover:from-violet-500 hover:via-fuchsia-400 hover:to-orange-300 text-white font-semibold text-lg shadow-xl shadow-fuchsia-500/25 transition-all duration-300 hover:shadow-2xl hover:shadow-fuchsia-500/30 hover:scale-[1.02]"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify OTP'}
                    </Button>
                  </form>
                )}

                {/* Toggle Sign In/Sign Up */}
                <div className="mt-6 text-center">
                  <button
                    onClick={() => {
                      const next = mode === 'signup' ? 'signin' : 'signup';
                      setMode(next);
                      setSignupStep('form');
                      setOtp('');
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {mode === 'signup'
                      ? 'Already have an account? '
                      : "Don't have an account? "}
                    <span className="font-semibold bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-400 bg-clip-text text-transparent">
                      {mode === 'signup' ? 'Sign in' : 'Sign up'}
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-8">
            By continuing, you agree to our{' '}
            <a href="#" className="underline hover:text-foreground">Terms</a>
            {' '}and{' '}
            <a href="#" className="underline hover:text-foreground">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;

