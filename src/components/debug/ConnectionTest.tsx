import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Activity } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export const ConnectionTest = () => {
  const [testResult, setTestResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setTestResult('');
    setShowResult(true);
    let mounted = true;

    try {
      let genericOk = false;
      try {
        const res = await fetch('https://jsonplaceholder.typicode.com/todos/1');
        genericOk = res.ok;
      } catch (_) {}

      let supabaseDomainOk = false;
      try {
        const res = await fetch(SUPABASE_URL + '/rest/v1/healthcheck');
        supabaseDomainOk = res.ok || true;
      } catch (_) {}

      const { error, count } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true });

      if (!mounted) return;

      if (error) {
        setTestResult(`Generic:${genericOk ? 'OK' : 'FAIL'} | Supabase Domain:${supabaseDomainOk ? 'OK' : 'FAIL'} | DB: ERROR - ${error.message}`);
      } else {
        setTestResult(`Generic:${genericOk ? 'OK' : 'FAIL'} | Supabase Domain:${supabaseDomainOk ? 'OK' : 'FAIL'} | DB: OK - ${count ?? 0} rows`);
      }
    } catch (error: unknown) {
      if (!mounted) return;
      setTestResult(`❌ Unexpected failure: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      if (mounted) setLoading(false);
    }
    return () => { mounted = false; };
  };

  return (
    <div className="relative">
      <Button onClick={testConnection} disabled={loading} size="sm" variant="outline" className="gap-2">
        <Activity className="h-4 w-4" />
        {loading ? 'Testing...' : 'Test DB'}
      </Button>
      {showResult && testResult && (
        <div className="absolute top-full right-0 mt-2 p-3 bg-background border rounded-md text-xs font-mono w-80 max-w-sm shadow-lg z-50">
          <button onClick={() => setShowResult(false)} className="absolute top-1 right-1 text-muted-foreground hover:text-foreground">×</button>
          {testResult}
        </div>
      )}
    </div>
  );
};
