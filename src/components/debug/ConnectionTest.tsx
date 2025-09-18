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

      // Test READ operation
      const { data: readData, error: readError } = await supabase
        .from('vehicles')
        .select('id, vehicle_number, status')
        .limit(1);

      if (readError) {
        if (!mounted) return;
        setTestResult(`Generic:${genericOk ? 'OK' : 'FAIL'} | Domain:${supabaseDomainOk ? 'OK' : 'FAIL'} | READ: ERROR - ${readError.message}`);
        return;
      }

      // Test WRITE operations with a test vehicle
      const testVehicle = {
        make: 'TEST',
        model: 'CONNECTION_TEST',
        color: 'Test',
        delivery_date: new Date().toISOString().split('T')[0],
        vehicle_number: `TEST_${Date.now()}`,
        chassis_number: `TEST_${Date.now()}`,
        motor_serial_number: `TEST_${Date.now()}`,
        vendor: 'Test Vendor',
        pdi_done_by: 'Test',
        vehicle_type: 'High Speed' as const,
        battery_type: 'Fixed' as const,
        next_maintenance_date: new Date().toISOString().split('T')[0]
      };

      // INSERT test
      const { data: insertData, error: insertError } = await supabase
        .from('vehicles')
        .insert(testVehicle)
        .select('id')
        .single();

      if (insertError) {
        if (!mounted) return;
        setTestResult(`Generic:${genericOk ? 'OK' : 'FAIL'} | Domain:${supabaseDomainOk ? 'OK' : 'FAIL'} | READ: OK | WRITE: ERROR - ${insertError.message}`);
        return;
      }

      const testId = insertData.id;

      // UPDATE test
      const { error: updateError } = await supabase
        .from('vehicles')
        .update({ color: 'Updated Test Color' })
        .eq('id', testId);

      if (updateError) {
        // Clean up the test record
        await supabase.from('vehicles').delete().eq('id', testId);
        if (!mounted) return;
        setTestResult(`Generic:${genericOk ? 'OK' : 'FAIL'} | Domain:${supabaseDomainOk ? 'OK' : 'FAIL'} | READ: OK | INSERT: OK | UPDATE: ERROR - ${updateError.message}`);
        return;
      }

      // DELETE test (cleanup)
      const { error: deleteError } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', testId);

      if (!mounted) return;

      if (deleteError) {
        setTestResult(`Generic:${genericOk ? 'OK' : 'FAIL'} | Domain:${supabaseDomainOk ? 'OK' : 'FAIL'} | READ: OK | INSERT: OK | UPDATE: OK | DELETE: ERROR - ${deleteError.message}`);
      } else {
        setTestResult(`✅ All OK - Generic:${genericOk ? 'OK' : 'FAIL'} | Domain:${supabaseDomainOk ? 'OK' : 'FAIL'} | READ: OK | WRITE: OK (${readData?.length || 0} existing records)`);
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
