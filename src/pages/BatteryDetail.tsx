import { useParams } from 'react-router-dom';
import { useBatteryDetail } from '@/hooks/useBatteryDetail';
import { BatteryDetailHeader } from '@/components/battery/BatteryDetailHeader';
import { BatteryDetailMetadata } from '@/components/battery/BatteryDetailMetadata';
import { BatteryDetailMapping } from '@/components/battery/BatteryDetailMapping';
import { BatteryDetailHistory } from '@/components/battery/BatteryDetailHistory';
import { BatteryDetailActions } from '@/components/battery/BatteryDetailActions';
import { Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function BatteryDetail() {
  const { batteryId } = useParams<{ batteryId: string }>();
  const { data, isLoading, error, refetch } = useBatteryDetail(batteryId || '');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Loading battery details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900">
                    Unable to load battery details
                  </h3>
                  <p className="text-sm text-red-800 mt-2">
                    {error instanceof Error
                      ? error.message
                      : 'An unexpected error occurred. Please try again.'}
                  </p>
                  <button
                    onClick={() => refetch()}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <BatteryDetailHeader battery={data.battery} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Left Column - Metadata (2 columns) */}
          <div className="lg:col-span-2 space-y-6">
            <BatteryDetailMetadata battery={data.battery} />
          </div>

          {/* Right Column - Actions (1 column) */}
          <div>
            <BatteryDetailActions battery={data} onSuccess={() => refetch()} />
          </div>
        </div>

        {/* Current Mapping Section (Full Width) */}
        <div className="mt-6">
          <BatteryDetailMapping battery={data} />
        </div>

        {/* Event History (Full Width) */}
        <div className="mt-6">
          <BatteryDetailHistory events={data.events} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
