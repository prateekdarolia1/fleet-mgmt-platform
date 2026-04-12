/**
 * RiderDetail Page
 * DDD: Rider Aggregate Detail View
 * SOLID: Single Responsibility - Display rider information and event history
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RiderEventHistory } from '@/components/fleet/RiderEventHistory';
import { useRiderEvents } from '@/hooks/useRiderEvents';
import { Loader2, AlertCircle, ArrowLeft, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// DDD: Rider Aggregate
interface Rider {
  id: string;
  rider_id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  status: 'Active' | 'Inactive';
  duty_status: 'LIVE' | 'IDLE';
  vehicle_id: string | null;
  battery_smart_id: string | null;
  created_at: string;
}

export default function RiderDetail() {
  const { riderId } = useParams<{ riderId: string }>();
  const navigate = useNavigate();

  // Fetch rider details (Repository Pattern)
  const { data: rider, isLoading, error, refetch } = useQuery({
    queryKey: ['rider', riderId],
    queryFn: async () => {
      if (!riderId) throw new Error('Rider ID is required');

      const { data, error } = await supabase
        .from('riders')
        .select('*')
        .eq('id', riderId)
        .single();

      if (error) throw new Error(`Failed to fetch rider: ${error.message}`);
      return data as unknown as Rider;
    },
    enabled: !!riderId,
  });

  // Fetch rider events
  const { data: events, isLoading: eventsLoading } = useRiderEvents(riderId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Loading rider details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !rider) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900">
                    Unable to load rider details
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
      'Active': 'bg-green-100 text-green-800 border-green-300',
      'Inactive': 'bg-gray-100 text-gray-800 border-gray-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getDutyStatusBadge = (dutyStatus: string) => {
    const colors: Record<string, string> = {
      'LIVE': 'bg-blue-100 text-blue-800 border-blue-300',
      'IDLE': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    };
    return colors[dutyStatus] || 'bg-gray-100 text-gray-800 border-gray-300';
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
            <div className="p-3 bg-green-100 rounded-lg">
              <User className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {rider.name}
              </h1>
              <p className="text-gray-600 mt-1 font-mono">
                {rider.rider_id}
              </p>
            </div>
            <div className="ml-auto flex gap-2">
              <Badge className={`${getStatusBadge(rider.status)} border`}>
                {rider.status}
              </Badge>
              <Badge className={`${getDutyStatusBadge(rider.duty_status)} border`}>
                {rider.duty_status}
              </Badge>
            </div>
          </div>
        </div>

        {/* Rider Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Contact Details */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-semibold">{rider.phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-semibold">
                  {rider.email || 'Not provided'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Address</p>
                <p className="font-semibold">
                  {rider.address || 'Not provided'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Service Details */}
          <Card>
            <CardHeader>
              <CardTitle>Service Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <Badge className={`${getStatusBadge(rider.status)} border mt-1`}>
                  {rider.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">Duty Status</p>
                <Badge className={`${getDutyStatusBadge(rider.duty_status)} border mt-1`}>
                  {rider.duty_status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">Vehicle Assigned</p>
                <p className="font-semibold">
                  {rider.vehicle_id || 'No vehicle assigned'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">BatterySmart ID</p>
                <p className="font-semibold">
                  {rider.battery_smart_id || 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Registered On</p>
                <p className="font-semibold">
                  {new Date(rider.created_at).toLocaleDateString('en-IN')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Event History */}
        <RiderEventHistory events={events || []} isLoading={eventsLoading} />
      </div>
    </div>
  );
}
