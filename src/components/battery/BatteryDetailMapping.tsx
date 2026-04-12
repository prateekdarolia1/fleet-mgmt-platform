import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/dateUtils';
import { Badge } from '@/components/ui/badge';
import { Truck, User, Clock, AlertCircle } from 'lucide-react';
import type { BatteryWithEvents } from '@/hooks/useBatteryDetail';

interface BatteryDetailMappingProps {
  battery: BatteryWithEvents;
}

export const BatteryDetailMapping = ({ battery }: BatteryDetailMappingProps) => {
  const isMapped = battery.battery.vehicle_id !== null && battery.vehicleInfo;

  return (
    <Card className="border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Current Mapping</CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          Where this battery is currently deployed
        </p>
      </CardHeader>
      <CardContent>
        {isMapped && battery.vehicleInfo ? (
          <div className="space-y-4">
            {/* Vehicle Info */}
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <Truck className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Mapped to Vehicle</p>
                <p className="font-semibold text-gray-900 mt-1">
                  {battery.vehicleInfo.vehicle_number}
                </p>
                <p className="text-xs text-gray-500 mt-1">ID: {battery.vehicleInfo.id}</p>
              </div>
            </div>

            {/* Vehicle Status */}
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Badge
                className={
                  battery.vehicleInfo.status === 'Deployed'
                    ? 'bg-green-100 text-green-800'
                    : battery.vehicleInfo.status === 'Ready for Deployment'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-gray-100 text-gray-800'
                }
              >
                {battery.vehicleInfo.status}
              </Badge>
              <p className="text-sm text-gray-600">Vehicle Status</p>
            </div>

            {/* Mapping Details */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500 text-xs mb-1">Mapped Since</p>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <p className="font-mono text-sm">
                    {formatDate(battery.vehicleInfo.created_at)}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Created At</p>
                <p className="font-mono text-sm">
                  {new Date(battery.vehicleInfo.created_at).toLocaleTimeString(
                    'en-IN',
                    { hour: '2-digit', minute: '2-digit' }
                  )}
                </p>
              </div>
            </div>

            {/* Rider Info (if active) */}
            {battery.riderInfo && (
              <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <User className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Active Rider</p>
                  <p className="font-semibold text-gray-900 mt-1">
                    {battery.riderInfo.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Status: <span className="font-medium">{battery.riderInfo.status}</span>
                  </p>
                  {battery.riderInfo.battery_smart_id && (
                    <p className="text-xs text-gray-500 mt-1">
                      Battery Smart ID:{' '}
                      <span className="font-mono">{battery.riderInfo.battery_smart_id}</span>
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-yellow-900">Currently Unmapped</p>
              <p className="text-sm text-yellow-800 mt-1">
                This battery is not currently assigned to any vehicle.
              </p>
              {battery.events.length > 0 && (
                <p className="text-xs text-yellow-700 mt-2">
                  Last activity:{' '}
                  <span className="font-medium">
                    {formatDate(battery.events[0].created_at)}
                  </span>
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
