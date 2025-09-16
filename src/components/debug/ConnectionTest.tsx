import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Activity } from 'lucide-react';

const SUPABASE_URL = 'https://kkxxnpfwvlbsqvmbirqa.supabase.co';

export const ConnectionTest = () => {
  const [testResult, setTestResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setTestResult('');
    setShowResult(true);
    
    try {
      console.log('Running connectivity diagnostics...');

      // 1) Generic public fetch test (should always succeed)
      let genericOk = false;
      try {
        const r = await fetch('https://jsonplaceholder.typicode.com/todos/1');
        genericOk = r.ok;
      } catch (_) {}

      // 2) Supabase domain reachability without custom headers (no preflight)
      let supabaseDomainOk = false;
      try {
        const r2 = await fetch(SUPABASE_URL, { method: 'GET' });
        // Even a 404 proves network + TLS + CORS path; we only care it didn't throw
        supabaseDomainOk = true;
      } catch (_) {}

      // 3) Actual DB call via Supabase client
      const { error, count } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true });

      if (error) {
        setTestResult(
          `Generic:${genericOk ? 'OK' : 'FAIL'} | Supabase Domain:${supabaseDomainOk ? 'OK' : 'FAIL'} | DB: ERROR - ${error.message}`
        );
      } else {
        setTestResult(
          `Generic:${genericOk ? 'OK' : 'FAIL'} | Supabase Domain:${supabaseDomainOk ? 'OK' : 'FAIL'} | DB: OK - ${count ?? 0} rows`
        );
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      setTestResult(`❌ Unexpected failure: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <Button 
        onClick={testConnection} 
        disabled={loading}
        size="sm"
        variant="outline"
        className="gap-2"
      >
        <Activity className="h-4 w-4" />
        {loading ? 'Testing...' : 'Test DB'}
      </Button>
      {showResult && testResult && (
        <div className="absolute top-full right-0 mt-2 p-3 bg-background border rounded-md text-xs font-mono w-80 max-w-sm shadow-lg z-50">
          <button 
            onClick={() => setShowResult(false)}
            className="absolute top-1 right-1 text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
          {testResult}
        </div>
      )}
    </div>
  );
};