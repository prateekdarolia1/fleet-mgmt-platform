import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

export const ConnectionTest = () => {
  const [testResult, setTestResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setTestResult('');
    
    try {
      console.log('Testing Supabase connection...');
      
      const { data, error, count } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true });

      console.log('Supabase response:', { data, error, count });
      
      if (error) {
        setTestResult(`❌ Supabase Error: ${error.message}`);
      } else {
        setTestResult(`✅ Connection successful! Found ${count} vehicles in database.`);
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      setTestResult(`❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Supabase Connection Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={testConnection} disabled={loading}>
          {loading ? 'Testing...' : 'Test Connection'}
        </Button>
        {testResult && (
          <div className="p-3 bg-muted rounded-md text-sm font-mono">
            {testResult}
          </div>
        )}
      </CardContent>
    </Card>
  );
};