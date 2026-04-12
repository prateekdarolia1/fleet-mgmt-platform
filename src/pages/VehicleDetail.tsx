/**
 * VehicleDetail Page
 * DDD: Vehicle Aggregate Detail View
 * SOLID: Single Responsibility - Display vehicle information and event history
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { VehicleEventHistory } from '@/components/fleet/VehicleEventHistory';
import { useVehicleEvents } from '@/hooks/useVehicleEvents';
import { Loader2, AlertCircle, ArrowLeft, Truck, Battery as BatteryIcon } from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// DDD: Vehicle Aggregate
interface Vehicle {
  id: string;
  vehicle_number: string;
  make: string;
  model: string;
  color: string;
  chassis_number: string;
  motor_serial_number: string;
  vehicle_type: 'High Speed' | 'Low Speed';
  battery_type: 'Fixed' | 'Swappable';
  status: string;
  battery_id: string | null;
  rider_id: string | null;
  rider_name: string | null;
  vendor: string;
  delivery_date: string;
  created_at: string;
}

export default function VehicleDetail() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const navigate = useNavigate();

  // Fetch vehicle details (Repository Pattern)
  const { data: vehicle, isLoading, error, refetch } = useQuery({
    queryKey: ['vehicle', vehicleId],
    queryFn: async () => {
      if (!vehicleId) throw new Error('Vehicle ID is required');

      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', vehicleId)
        .single();

      if (error) throw new Error(`Failed to fetch vehicle: ${error.message}`);
      return data as Vehicle;
    },
    enabled: !!vehicleId,
  });

  // Fetch vehicle events
  const { data: events, isLoading: eventsLoading } = useVehicleEvents(vehicleId);

  // Fetch battery details by looking up which battery has this vehicle_id
  const { data: batteryDetails } = useQuery({
    queryKey: ['vehicle-battery', vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batteries')
        .select('battery_id, battery_smart_id, service_provider, status, zone_id, battery_plan')
        .eq('vehicle_id', vehicleId)
        .maybeSingle();

      if (error) throw new Error(`Failed to fetch battery details: ${error.message}`);
      return data;
    },
    enabled: !!vehicleId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Loading vehicle details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900">
                    Unable to load vehicle details
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

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'Deployed': 'bg-green-100 text-green-800 border-green-300',
      'Ready for Deployment': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'Under Maintenance': 'bg-red-100 text-red-800 border-red-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Fleet
          </Button>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Truck className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {vehicle.vehicle_number}
              </h1>
              <p className="text-gray-600 mt-1">
                {vehicle.make} {vehicle.model} • {vehicle.color}
              </p>
            </div>
            <Badge className={`ml-auto ${getStatusBadge(vehicle.status)} border`}>
              {vehicle.status}
            </Badge>
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Technical Details */}
          <Card>
            <CardHeader>
              <CardTitle>Technical Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Vehicle Type</p>
                  <p className="font-semibold">{vehicle.vehicle_type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Battery Type</p>
                  <p className="font-semibold">{vehicle.battery_type}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Chassis Number</p>
                <p className="font-mono font-semibold">{vehicle.chassis_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Motor Serial Number</p>
                <p className="font-mono font-semibold">{vehicle.motor_serial_number}</p>
              </div>
            </CardContent>
          </Card>

          {/* Assignment Details */}
          <Card>
            <CardHeader>
              <CardTitle>Assignment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Battery Information */}
              <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <BatteryIcon className="h-4 w-4 text-blue-600" />
                  <p className="text-sm font-semibold text-blue-900">Battery Information</p>
                </div>
                {batteryDetails ? (
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-500">Battery ID</p>
                      <p className="font-mono font-semibold text-blue-900">{batteryDetails.battery_id}</p>
                    </div>
                    {batteryDetails.battery_smart_id && (
                      <div>
                        <p className="text-xs text-gray-500">Battery Smart ID</p>
                        <p className="font-mono font-semibold text-blue-900">{batteryDetails.battery_smart_id}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-gray-500">Service Provider</p>
                        <p className="font-semibold">{batteryDetails.service_provider}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Status</p>
                        <Badge className={
                          batteryDetails.status === 'MAPPED'
                            ? 'bg-green-100 text-green-800 border-green-300'
                            : batteryDetails.status === 'ACTIVE'
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                        }>
                          {batteryDetails.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No battery assigned to this vehicle</p>
                )}
              </div>

              {/* Rider Information */}
              <div>
                <p className="text-sm text-gray-500">Rider</p>
                <p className="font-semibold">
                  {vehicle.rider_name || 'No rider assigned'}
                </p>
                {vehicle.rider_id && (
                  <p className="text-xs text-gray-500 font-mono">{vehicle.rider_id}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Vendor</p>
                <p className="font-semibold">{vehicle.vendor}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Delivery Date</p>
                <p className="font-semibold">
                  {formatDate(vehicle.delivery_date)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Event History */}
        <VehicleEventHistory events={events || []} isLoading={eventsLoading} />
      </div>
    </div>
  );
}
