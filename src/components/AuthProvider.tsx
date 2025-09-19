import { createContext, ReactNode, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signInWithOtp: (email: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    console.log('🚀 AuthProvider initializing...', {
      timestamp: new Date().toISOString(),
      currentURL: window.location.href,
      userAgent: navigator.userAgent
    });

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change detected:', { 
          event, 
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id,
          userEmail: session?.user?.email,
          timestamp: new Date().toISOString()
        });
        
        if (!mounted) {
          console.log('⚠️ Component unmounted, ignoring auth state change');
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          console.log('👤 User authenticated, fetching role...', { userId: session.user.id });
          
          // Fetch user role
          setTimeout(async () => {
            try {
              const { data: roleData, error } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', session.user.id)
                .single();

              console.log('🎭 User role query result:', { 
                roleData, 
                error: error?.message,
                userId: session.user.id
              });

              if (!error && roleData && mounted) {
                setUserRole(roleData.role);
                console.log('✅ User role set:', roleData.role);
              } else if (error) {
                console.error('❌ Failed to fetch user role:', error);
              }
            } catch (err) {
              console.error('💥 Exception fetching user role:', err);
            }
          }, 0);
        } else {
          console.log('👤 No user session, clearing role');
          setUserRole(null);
        }

        setLoading(false);
      }
    );

    // Check for existing session
    console.log('🔍 Checking for existing session...');
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('🔍 Initial session check result:', { 
        hasSession: !!session,
        hasUser: !!session?.user,
        error: error?.message
      });
      
      if (!mounted) {
        console.log('⚠️ Component unmounted during session check');
        return;
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      console.log('🧹 AuthProvider cleanup');
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Starting password sign-in process...', { 
        email, 
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        currentURL: window.location.href
      });
      
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('🔐 Password sign-in response:', { 
        hasData: !!data,
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        error: error?.message,
        errorCode: error?.status
      });

      if (error) {
        console.error('🚨 Password sign-in failed:', { 
          error: error.message,
          status: error.status,
          name: error.name
        });
        
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      console.log('✅ Password sign-in successful');
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });

      return {};
    } catch (err) {
      console.error('💥 Password sign-in exception:', err);
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  const signInWithOtp = async (email: string) => {
    try {
      console.log('🔗 Starting magic link sign-in process...', { 
        email, 
        timestamp: new Date().toISOString(),
        currentURL: window.location.href,
        origin: window.location.origin,
        hostname: window.location.hostname,
        protocol: window.location.protocol
      });
      
      setLoading(true);
      
      // Use current page URL without query params for better redirect handling
      const baseUrl = `${window.location.protocol}//${window.location.host}`;
      const redirectTo = `${baseUrl}/login?type=magiclink`;
      
      console.log('🔗 Magic link redirect URL:', redirectTo);
      
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: { 
          emailRedirectTo: redirectTo,
          shouldCreateUser: true // Allow creating user if not exists
        }
      });

      console.log('🔗 Magic link response:', { 
        hasData: !!data,
        error: error?.message,
        errorCode: error?.status
      });

      if (error) {
        console.error('🚨 Magic link failed:', { 
          error: error.message,
          status: error.status,
          name: error.name
        });
        
        toast({ 
          title: "Magic link error", 
          description: `${error.message}. Try password sign-in instead.`,
          variant: "destructive" 
        });
        return { error };
      }

      console.log('✅ Magic link sent successfully');
      toast({ 
        title: "Magic link sent!", 
        description: "Check your email. The link will open in the same window.",
        duration: 6000
      });
      return {};
    } catch (err) {
      console.error('💥 Magic link exception:', err);
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      console.log('📝 Starting sign-up process...', { 
        email, 
        firstName,
        lastName,
        timestamp: new Date().toISOString(),
        currentURL: window.location.href,
        origin: window.location.origin
      });
      
      setLoading(true);
      
      const redirectTo = `${window.location.origin}/`;
      console.log('📝 Sign-up redirect URL:', redirectTo);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            first_name: firstName,
            last_name: lastName,
          }
        }
      });

      console.log('📝 Sign-up response:', { 
        hasData: !!data,
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        userConfirmed: data?.user?.email_confirmed_at,
        error: error?.message,
        errorCode: error?.status
      });

      if (error) {
        console.error('🚨 Sign-up failed:', { 
          error: error.message,
          status: error.status,
          name: error.name
        });
        
        toast({
          title: "Registration Failed",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      console.log('✅ Sign-up successful');
      toast({
        title: "Registration Successful",
        description: "Please check your email to verify your account.",
      });

      return {};
    } catch (err) {
      console.error('💥 Sign-up exception:', err);
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setUserRole(null);
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  const authState = {
    user,
    session,
    userRole,
    loading,
    signIn,
    signInWithOtp,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
};