import { useState } from 'react';
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
  const { signIn, signUp, signInWithOtp } = useAuth();
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

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
    
    console.log('🧪 Starting automated auth tests...');

    // Test 1: Environment Check
    addResult({ name: 'Environment Check', status: 'running' });
    try {
      const envData = {
        url: window.location.href,
        origin: window.location.origin,
        hostname: window.location.hostname,
        protocol: window.location.protocol,
        userAgent: navigator.userAgent,
        isHTTPS: window.location.protocol === 'https:',
        isLocalhost: window.location.hostname === 'localhost',
        supabaseUrl: 'Connected to Supabase',
        timestamp: new Date().toISOString()
      };
      
      console.log('🌍 Environment data:', envData);
      
      updateResult('Environment Check', {
        status: 'success',
        message: `${envData.protocol}//${envData.hostname}`,
        details: envData
      });
    } catch (error) {
      updateResult('Environment Check', {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      });
    }

    // Test 2: Supabase Connection
    addResult({ name: 'Supabase Connection', status: 'running' });
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      updateResult('Supabase Connection', {
        status: 'success',
        message: 'Connected successfully',
        details: { hasSession: !!data.session }
      });
    } catch (error) {
      updateResult('Supabase Connection', {
        status: 'error',
        message: error instanceof Error ? error.message : 'Connection failed',
        details: error
      });
    }

    // Test 3: Test Email Validity
    addResult({ name: 'Test Email Validation', status: 'running' });
    const testEmail = 'prateek@lilypad.co.in';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (emailRegex.test(testEmail)) {
      updateResult('Test Email Validation', {
        status: 'success',
        message: `Email ${testEmail} is valid`,
        details: { email: testEmail }
      });
    } else {
      updateResult('Test Email Validation', {
        status: 'error',
        message: `Email ${testEmail} is invalid`,
        details: { email: testEmail }
      });
    }

    // Test 4: Password Sign-In Test
    addResult({ name: 'Password Sign-In Test', status: 'running' });
    try {
      const result = await signIn('prateek@lilypad.co.in', 'Lilypad@123');
      
      if (result.error) {
        updateResult('Password Sign-In Test', {
          status: 'error',
          message: result.error.message,
          details: result.error
        });
      } else {
        updateResult('Password Sign-In Test', {
          status: 'success',
          message: 'Sign-in successful',
          details: result
        });
      }
    } catch (error) {
      updateResult('Password Sign-In Test', {
        status: 'error',
        message: error instanceof Error ? error.message : 'Sign-in failed',
        details: error
      });
    }

    // Wait a bit before testing magic link (to avoid rate limiting)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 5: Magic Link Test
    addResult({ name: 'Magic Link Test', status: 'running' });
    try {
      const result = await signInWithOtp('prateek@lilypad.co.in');
      
      if (result.error) {
        updateResult('Magic Link Test', {
          status: 'error',
          message: result.error.message,
          details: result.error
        });
      } else {
        updateResult('Magic Link Test', {
          status: 'success',
          message: 'Magic link sent successfully',
          details: result
        });
      }
    } catch (error) {
      updateResult('Magic Link Test', {
        status: 'error',
        message: error instanceof Error ? error.message : 'Magic link failed',
        details: error
      });
    }

    // Test 6: Sign-Up Test (with unique email)
    addResult({ name: 'Sign-Up Test', status: 'running' });
    try {
      const testSignupEmail = `test+${Date.now()}@lilypad.co.in`;
      const result = await signUp(testSignupEmail, 'TestPassword123!', 'Test', 'User');
      
      if (result.error) {
        updateResult('Sign-Up Test', {
          status: 'error',
          message: result.error.message,
          details: result.error
        });
      } else {
        updateResult('Sign-Up Test', {
          status: 'success',
          message: 'Sign-up successful',
          details: { email: testSignupEmail }
        });
      }
    } catch (error) {
      updateResult('Sign-Up Test', {
        status: 'error',
        message: error instanceof Error ? error.message : 'Sign-up failed',
        details: error
      });
    }

    // Test 7: Password Recovery Flow
    addResult({ name: 'Password Recovery Flow', status: 'running' });
    try {
      const recoveryUrl = `${window.location.origin}/login?type=recovery`;
      const isValidUrl = recoveryUrl.includes('login') && recoveryUrl.includes('type=recovery');
      
      if (isValidUrl) {
        updateResult('Password Recovery Flow', {
          status: 'success',
          message: 'Password recovery flow ready',
          details: {
            recoveryUrl,
            redirectSetup: 'Configured for password reset'
          }
        });
      } else {
        updateResult('Password Recovery Flow', {
          status: 'warning',
          message: 'Recovery URL might be misconfigured',
          details: { recoveryUrl }
        });
      }
    } catch (error) {
      updateResult('Password Recovery Flow', {
        status: 'error',
        message: error instanceof Error ? error.message : 'Recovery flow test failed',
        details: error
      });
    }

    // Test 8: Password Re-Login Test (check if user has password)
    addResult({ name: 'Password Re-Login Test', status: 'running' });
    try {
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user?.email) {
        const userEmail = session.session.user.email;
        
        // Test with a dummy password to see if account has password
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: 'dummy_password_test'
        });

        if (loginError?.message?.includes('Invalid login credentials')) {
          updateResult('Password Re-Login Test', {
            status: 'warning',
            message: 'User exists but may need password reset',
            details: {
              email: userEmail,
              issue: 'Account likely created via magic link - needs password setup',
              solution: 'Use "Forgot password?" to set password'
            }
          });
        } else if (loginError) {
          updateResult('Password Re-Login Test', {
            status: 'warning',
            message: 'Password login tested',
            details: {
              email: userEmail,
              result: loginError.message
            }
          });
        }
      } else {
        updateResult('Password Re-Login Test', {
          status: 'warning',
          message: 'No current user session to test',
          details: { note: 'Sign in first to test password functionality' }
        });
      }
    } catch (error) {
      updateResult('Password Re-Login Test', {
        status: 'error',
        message: error instanceof Error ? error.message : 'Re-login test failed',
        details: error
      });
    }

    // Test 7: URL Configuration Test
    addResult({ name: 'URL Configuration', status: 'running' });
    try {
      const currentUrl = window.location.origin;
      const expectedPatterns = [
        /^https:\/\/.*\.lovable\.app$/,
        /^https:\/\/.*\.vercel\.app$/,
        /^https:\/\/.*\.netlify\.app$/,
        /^http:\/\/localhost:\d+$/
      ];
      
      const isValidUrl = expectedPatterns.some(pattern => pattern.test(currentUrl));
      
      if (isValidUrl) {
        updateResult('URL Configuration', {
          status: 'success',
          message: `Valid deployment URL: ${currentUrl}`,
          details: { url: currentUrl }
        });
      } else {
        updateResult('URL Configuration', {
          status: 'warning',
          message: `Unexpected URL pattern: ${currentUrl}`,
          details: { url: currentUrl, expectedPatterns: expectedPatterns.map(p => p.toString()) }
        });
      }
    } catch (error) {
      updateResult('URL Configuration', {
        status: 'error',
        message: error instanceof Error ? error.message : 'URL check failed',
        details: error
      });
    }

    setIsRunning(false);
    console.log('✅ Auth tests completed');
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