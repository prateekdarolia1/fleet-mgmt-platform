import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'warning';
  message?: string;
  details?: any;
  timestamp?: string;
}

const AuthTester = () => {
  const { signIn, signUp, signInWithOtp, user, session, loading } = useAuth();
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Auto-run test on component mount
  useEffect(() => {
    const autoTest = async () => {
      console.log("🧪 AUTO-RUNNING LOGIN TEST WITH TRACE VERBOSITY");
      await runTests();
    };
    autoTest();
  }, []);

  const updateResult = (name: string, update: Partial<TestResult>) => {
    setResults(prev => 
      prev.map(result => 
        result.name === name 
          ? { ...result, ...update, timestamp: new Date().toISOString() }
          : result
      )
    );
  };

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, { ...result, timestamp: new Date().toISOString() }]);
  };

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);
    
    console.log("🧪 === STARTING COMPREHENSIVE LOGIN TEST ===", {
      timestamp: new Date().toISOString(),
      testEmail: "prateek@lilypad.co.in",
      testPassword: "Lilypad@123",
      location: window.location.href,
      userAgent: navigator.userAgent
    });

    // Environment Check
    addResult({ name: "Environment Check", status: "running" });
    try {
      const supabaseUrl = "https://kkxxnpfwvlbsqvmbirqa.supabase.co";
      const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtreHhucGZ3dmxic3F2bWJpcnFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczOTQ2MDYsImV4cCI6MjA3Mjk3MDYwNn0.Z5JrrxfynbUkuoImR5mFaI1tIERkRRzMqj3Ncp0e02Q";
      
      console.log("🔧 Environment details", {
        supabaseUrl,
        supabaseKeyLength: supabaseKey.length,
        supabaseKeyPrefix: supabaseKey.substring(0, 20),
        clientInstance: !!supabase,
        authInstance: !!supabase.auth
      });

      if (!supabaseUrl || !supabaseKey) {
        updateResult("Environment Check", { 
          status: "error", 
          message: "Missing Supabase configuration", 
          details: "SUPABASE_URL or SUPABASE_ANON_KEY not found"
        });
      } else {
        updateResult("Environment Check", { 
          status: "success", 
          message: "Environment configuration valid", 
          details: `URL: ${supabaseUrl}\nKey: ${supabaseKey.substring(0, 20)}...`
        });
      }
    } catch (error) {
      console.error("🔧 Environment check error", error);
      updateResult("Environment Check", { 
        status: "error", 
        message: `Environment check failed: ${error}`, 
        details: error instanceof Error ? error.stack : 'Unknown error'
      });
    }

    // Supabase Connection Test
    addResult({ name: "Supabase Connection", status: "running" });
    try {
      console.log("🔗 Testing Supabase connection");
      const { data, error } = await supabase.auth.getSession();
      
      console.log("🔗 Connection test result", {
        hasData: !!data,
        hasSession: !!data?.session,
        hasUser: !!data?.session?.user,
        error: error ? {
          message: error.message,
          name: error.name,
          status: error.status
        } : null
      });

      if (error) {
        updateResult("Supabase Connection", { 
          status: "error", 
          message: `Connection failed: ${error.message}`, 
          details: `Error details: ${JSON.stringify(error, null, 2)}`
        });
      } else {
        updateResult("Supabase Connection", { 
          status: "success", 
          message: "Successfully connected to Supabase", 
          details: `Session: ${data.session ? 'Active' : 'None'}\nUser: ${data.session?.user ? data.session.user.email : 'None'}`
        });
      }
    } catch (error) {
      console.error("🔗 Connection test error", error);
      updateResult("Supabase Connection", { 
        status: "error", 
        message: `Connection test failed: ${error}`, 
        details: error instanceof Error ? error.stack : 'Unknown error'
      });
    }

    // Pre-Login State Check
    addResult({ name: "Pre-Login State", status: "running" });
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const { data: userData } = await supabase.auth.getUser();
      
      console.log("🔍 Pre-login state", {
        hasSession: !!sessionData?.session,
        hasUser: !!userData?.user,
        sessionUser: sessionData?.session?.user?.email,
        directUser: userData?.user?.email,
        authProviderUser: user?.email,
        authProviderSession: !!session,
        authProviderLoading: loading
      });

      updateResult("Pre-Login State", { 
        status: "success", 
        message: "Auth state checked", 
        details: `Session: ${sessionData?.session ? 'Present' : 'None'}\nUser: ${userData?.user?.email || 'None'}\nProvider State: ${user?.email || 'None'}`
      });
    } catch (error) {
      console.error("🔍 Pre-login state error", error);
      updateResult("Pre-Login State", { 
        status: "error", 
        message: `State check failed: ${error}`, 
        details: error instanceof Error ? error.stack : 'Unknown error'
      });
    }

    // Direct Supabase Sign-In Test
    addResult({ name: "Direct Supabase Sign-In", status: "running" });
    const testEmail = "prateek@lilypad.co.in";
    const testPassword = "Lilypad@123";
    
    try {
      console.log("🔐 DIRECT SUPABASE SIGN-IN ATTEMPT", {
        email: testEmail,
        passwordLength: testPassword.length,
        timestamp: new Date().toISOString(),
        method: 'supabase.auth.signInWithPassword'
      });

      const startTime = Date.now();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      });
      const endTime = Date.now();

      console.log("🔐 DIRECT SIGN-IN COMPLETE", {
        duration: `${endTime - startTime}ms`,
        hasData: !!data,
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        userId: data?.user?.id,
        userEmail: data?.user?.email,
        userConfirmedAt: data?.user?.email_confirmed_at,
        userCreatedAt: data?.user?.created_at,
        userLastSignIn: data?.user?.last_sign_in_at,
        sessionAccessToken: data?.session?.access_token ? `${data.session.access_token.substring(0, 20)}...` : "missing",
        sessionRefreshToken: data?.session?.refresh_token ? `${data.session.refresh_token.substring(0, 20)}...` : "missing",
        sessionExpiresAt: data?.session?.expires_at,
        sessionTokenType: data?.session?.token_type,
        error: error ? {
          message: error.message,
          name: error.name,
          status: error.status,
          details: error
        } : null
      });

      if (error) {
        updateResult("Direct Supabase Sign-In", { 
          status: "error", 
          message: `❌ SIGN-IN FAILED: ${error.message}`, 
          details: `Status: ${error.status}\nName: ${error.name}\nMessage: ${error.message}\nFull Error: ${JSON.stringify(error, null, 2)}`
        });
      } else if (data.user && data.session) {
        updateResult("Direct Supabase Sign-In", { 
          status: "success", 
          message: "✅ DIRECT SIGN-IN SUCCESSFUL", 
          details: `✅ User ID: ${data.user.id}\n✅ Email: ${data.user.email}\n✅ Confirmed: ${data.user.email_confirmed_at ? 'Yes' : 'No'}\n✅ Last Sign-In: ${data.user.last_sign_in_at}\n✅ Session Valid: ${!!data.session.access_token && !!data.session.refresh_token}\n✅ Expires: ${new Date(data.session.expires_at * 1000).toISOString()}`
        });
        
        // Test immediate sign out
        console.log("🔐 Testing immediate sign-out...");
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) {
          console.error("🔐 Sign-out failed", signOutError);
        } else {
          console.log("🔐 Sign-out successful");
        }
      } else {
        updateResult("Direct Supabase Sign-In", { 
          status: "warning", 
          message: "⚠️ PARTIAL SUCCESS - Missing data", 
          details: `User Present: ${!!data.user}\nSession Present: ${!!data.session}\nRaw Response: ${JSON.stringify(data, null, 2)}`
        });
      }
    } catch (error) {
      console.error("🔐 DIRECT SIGN-IN ERROR", error);
      updateResult("Direct Supabase Sign-In", { 
        status: "error", 
        message: `💥 EXCEPTION: ${error}`, 
        details: error instanceof Error ? error.stack : JSON.stringify(error, null, 2)
      });
    }

    // AuthProvider Sign-In Test
    addResult({ name: "AuthProvider Sign-In", status: "running" });
    try {
      console.log("🔐 AUTH PROVIDER SIGN-IN ATTEMPT", {
        email: testEmail,
        passwordLength: testPassword.length,
        timestamp: new Date().toISOString(),
        method: 'AuthProvider.signIn',
        authProviderAvailable: !!signIn,
        currentUser: user?.email,
        currentSession: !!session
      });

      const startTime = Date.now();
      const result = await signIn(testEmail, testPassword);
      const endTime = Date.now();

      console.log("🔐 AUTH PROVIDER SIGN-IN COMPLETE", {
        duration: `${endTime - startTime}ms`,
        result,
        hasError: !!result?.error,
        errorMessage: result?.error?.message,
        errorStatus: result?.error?.status,
        success: !result?.error,
        newUserState: user?.email,
        newSessionState: !!session
      });

      if (result?.error) {
        updateResult("AuthProvider Sign-In", { 
          status: "error", 
          message: `❌ PROVIDER FAILED: ${result.error.message}`, 
          details: `Status: ${result.error.status || 'unknown'}\nName: ${result.error.name || 'unknown'}\nFull Error: ${JSON.stringify(result.error, null, 2)}`
        });
      } else {
        updateResult("AuthProvider Sign-In", { 
          status: "success", 
          message: "✅ PROVIDER SIGN-IN SUCCESSFUL", 
          details: `✅ No errors returned\n✅ Method completed\n✅ Result: ${JSON.stringify(result, null, 2)}`
        });
      }
    } catch (error) {
      console.error("🔐 AUTH PROVIDER SIGN-IN ERROR", error);
      updateResult("AuthProvider Sign-In", { 
        status: "error", 
        message: `💥 PROVIDER EXCEPTION: ${error}`, 
        details: error instanceof Error ? error.stack : JSON.stringify(error, null, 2)
      });
    }

    // Post-Test State Check
    addResult({ name: "Post-Test State", status: "running" });
    try {
      const { data: finalSessionData } = await supabase.auth.getSession();
      const { data: finalUserData } = await supabase.auth.getUser();
      
      console.log("🔍 Post-test state", {
        hasSession: !!finalSessionData?.session,
        hasUser: !!finalUserData?.user,
        sessionUser: finalSessionData?.session?.user?.email,
        directUser: finalUserData?.user?.email,
        authProviderUser: user?.email,
        authProviderSession: !!session,
        authProviderLoading: loading
      });

      updateResult("Post-Test State", { 
        status: "success", 
        message: "Final auth state checked", 
        details: `Session: ${finalSessionData?.session ? 'Present' : 'None'}\nUser: ${finalUserData?.user?.email || 'None'}\nProvider: ${user?.email || 'None'}\nLoading: ${loading}`
      });
    } catch (error) {
      console.error("🔍 Post-test state error", error);
      updateResult("Post-Test State", { 
        status: "error", 
        message: `Final state check failed: ${error}`, 
        details: error instanceof Error ? error.stack : 'Unknown error'
      });
    }

    console.log("🧪 === LOGIN TEST COMPLETE ===");
    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-300" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants: Record<TestResult['status'], 'default' | 'secondary' | 'destructive'> = {
      pending: 'secondary',
      running: 'default',
      success: 'default',
      error: 'destructive',
      warning: 'secondary'
    };
    
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🧪 Authentication System Tester
            <Button 
              onClick={runTests} 
              disabled={isRunning}
              size="sm"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Run Tests
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {results.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Click "Run Tests" to start automated authentication testing
            </div>
          ) : (
            results.map((result, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                <div className="mt-0.5">
                  {getStatusIcon(result.status)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{result.name}</span>
                    {getStatusBadge(result.status)}
                  </div>
                  {result.message && (
                    <p className="text-sm text-muted-foreground">{result.message}</p>
                  )}
                  {result.details && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground">View Details</summary>
                      <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                  {result.timestamp && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthTester;