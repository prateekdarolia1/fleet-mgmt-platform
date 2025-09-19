import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Shield, Bug } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AuthTester from '@/components/debug/AuthTester';
import { supabase } from '@/integrations/supabase/client';

const Login = () => {
  const { user, loading, signIn, signUp, signInWithOtp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('prateek@lilypad.co.in');
  const [password, setPassword] = useState('Lilypad@123');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [showBypass, setShowBypass] = useState(false);

  // Handle URL parameters for auth flows
  useEffect(() => {
    const type = searchParams.get('type');
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    
    console.log('🔍 URL params detected:', { type, hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken });
    
    if (type === 'magiclink' && accessToken && refreshToken) {
      console.log('🔗 Processing magic link login...');
      toast({
        title: "Magic link clicked!",
        description: "Signing you in...",
      });
      // The auth state change will handle the rest
    } else if (type === 'recovery' && accessToken && refreshToken) {
      console.log('🔧 Processing password recovery...');
      toast({
        title: "Password reset link clicked!",
        description: "You can now set a new password.",
      });
    }
  }, [searchParams, toast]);

  // Redirect if already logged in
  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await signIn(email, password);
    if (result.error) {
      const newFailedAttempts = failedAttempts + 1;
      setFailedAttempts(newFailedAttempts);
      
      // Show bypass after 5 failed attempts in development
      if (newFailedAttempts >= 5 && import.meta.env.DEV) {
        setShowBypass(true);
      }
      
      toast({
        title: "Sign in failed",
        description: result.error.message,
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleCreateAdmin = async () => {
    console.log('🔧 Creating/Resetting admin account...');
    setIsLoading(true);
    
    try {
      // First try to reset password via admin API if user exists
      const { data: resetData, error: resetError } = await supabase.auth.resetPasswordForEmail(
        'prateek@lilypad.co.in',
        { 
          redirectTo: `${window.location.origin}/login?type=recovery`,
        }
      );
      
      if (!resetError) {
        console.log('✅ Password reset email sent');
        toast({
          title: "Password Reset Sent",
          description: "Check your email for password reset instructions.",
          variant: "default",
        });
      } else {
        console.log('⚠️ Reset failed, trying sign up:', resetError);
        // If reset fails, try creating new account
        const result = await signUp(email, password, 'Prateek', 'Admin');
        if (!result.error) {
          toast({
            title: "Admin account created!",
            description: "You can now sign in with these credentials.",
          });
        }
      }
    } catch (error) {
      console.error('💥 Admin setup error:', error);
      toast({
        title: "Setup Error",
        description: "Failed to setup admin account. Try manual sign-up.",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await signUp(email, password, firstName, lastName);
    if (result.error) {
      toast({
        title: "Sign up failed",
        description: result.error.message,
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await signInWithOtp(email);
    if (!result.error) {
      toast({ title: 'Magic link sent', description: 'Check your inbox and follow the link.' });
    }
    setIsLoading(false);
  };

  const handleDevBypass = () => {
    // In development, bypass authentication
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-6xl grid gap-6 md:grid-cols-2">
        {/* Login Form */}
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Shield className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Fleet Management</CardTitle>
            <CardDescription>
              Admin access required. Sign in to your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Admin Setup & Password Reset */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center gap-2 text-blue-800 text-sm mb-2">
                <Shield className="h-4 w-4" />
                Admin Account Management
              </div>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCreateAdmin}
                  disabled={isLoading}
                  className="w-full text-blue-700 border-blue-300 hover:bg-blue-100"
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Reset Admin Password
                </Button>
                <p className="text-xs text-blue-600">
                  Sends password reset email to prateek@lilypad.co.in
                </p>
              </div>
            </div>

            {/* Development Bypass */}
            {showBypass && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <div className="flex items-center gap-2 text-amber-800 text-sm mb-2">
                  <Bug className="h-4 w-4" />
                  Development Bypass ({failedAttempts}/5 attempts)
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDevBypass}
                  className="w-full text-amber-700 border-amber-300 hover:bg-amber-100"
                >
                  Skip Authentication
                </Button>
              </div>
            )}
            
            <Tabs defaultValue="magic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="magic">Magic Link</TabsTrigger>
                <TabsTrigger value="signin">Password</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="magic">
                <form onSubmit={handleMagicLink} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="magic-email">Email</Label>
                    <Input
                      id="magic-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Magic Link
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last name"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a password"
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign Up
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Debug Panel */}
        <AuthTester />
      </div>
    </div>
  );
};

export default Login;