import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  FileText,
  Plus,
  Minus,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { formatEventTime, getEventDescription } from '@/hooks/useBatteryDetail';
import type { BatteryEvent } from '@/hooks/useBatteryDetail';

interface BatteryDetailHistoryProps {
  events: BatteryEvent[];
  isLoading: boolean;
}

const getEventIcon = (eventType: string) => {
  switch (eventType) {
    case 'CREATE':
      return <Plus className="h-4 w-4 text-green-600" />;
    case 'MAP':
      return <CheckCircle className="h-4 w-4 text-blue-600" />;
    case 'UNMAP':
      return <Minus className="h-4 w-4 text-yellow-600" />;
    case 'UPDATE':
      return <Edit className="h-4 w-4 text-purple-600" />;
    case 'DELETE':
      return <Trash2 className="h-4 w-4 text-red-600" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-600" />;
  }
};

const getEventColor = (eventType: string) => {
  switch (eventType) {
    case 'CREATE':
      return 'bg-green-50 border-green-200';
    case 'MAP':
      return 'bg-blue-50 border-blue-200';
    case 'UNMAP':
      return 'bg-yellow-50 border-yellow-200';
    case 'UPDATE':
      return 'bg-purple-50 border-purple-200';
    case 'DELETE':
      return 'bg-red-50 border-red-200';
    default:
      return 'bg-gray-50 border-gray-200';
  }
};

const getEventBadgeColor = (eventType: string) => {
  switch (eventType) {
    case 'CREATE':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'MAP':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'UNMAP':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'UPDATE':
      return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'DELETE':
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

export const BatteryDetailHistory = ({
  events,
  isLoading
}: BatteryDetailHistoryProps) => {
  if (isLoading) {
    return (
      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Event History</CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Complete append-only timeline of all battery events
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-center py-8">
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Event History</CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          Complete append-only timeline of all battery events
        </p>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="font-medium">No activity recorded yet</p>
            <p className="text-sm mt-1">
              Battery events will appear here as they occur
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event, index) => (
              <div
                key={event.id}
                className={`p-4 rounded-lg border-2 ${getEventColor(event.event_type)}`}
              >
                {/* Timeline connector */}
                {index < events.length - 1 && (
                  <div className="absolute left-5 top-full h-3 border-l-2 border-gray-300"></div>
                )}

                {/* Event header */}
                <div className="flex items-start gap-3 mb-2">
                  <div className="mt-1">{getEventIcon(event.event_type)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        className={`${getEventBadgeColor(event.event_type)} border`}
                      >
                        {event.event_type}
                      </Badge>
                      <p className="text-sm font-semibold text-gray-900">
                        {getEventDescription(event)}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatEventTime(event.created_at)}
                    </p>
                  </div>
                </div>

                {/* Event details */}
                <div className="ml-7 space-y-1 text-sm">
                  {event.vehicle_id && (
                    <p className="text-gray-700">
                      <span className="text-gray-500">Vehicle:</span>{' '}
                      <span className="font-mono font-semibold">{event.vehicle_id}</span>
                    </p>
                  )}

                  {event.previous_vehicle_id && (
                    <p className="text-gray-700">
                      <span className="text-gray-500">Previous Vehicle:</span>{' '}
                      <span className="font-mono font-semibold">
                        {event.previous_vehicle_id}
                      </span>
                    </p>
                  )}

                  {event.reason && (
                    <p className="text-gray-700">
                      <span className="text-gray-500">Reason:</span>{' '}
                      <span className="italic">{event.reason}</span>
                    </p>
                  )}

                  {event.performed_by && (
                    <p className="text-gray-700">
                      <span className="text-gray-500">Performed By:</span>{' '}
                      <span className="font-medium">{event.performed_by}</span>
                    </p>
                  )}

                  {event.changes && Object.keys(event.changes).length > 0 && (
                    <details className="cursor-pointer">
                      <summary className="text-gray-500 hover:text-gray-700">
                        View changes ({Object.keys(event.changes).length} fields)
                      </summary>
                      <div className="mt-2 p-2 bg-white rounded text-xs font-mono space-y-1">
                        {Object.entries(event.changes).map(([key, value]) => (
                          <div key={key} className="text-gray-700">
                            <span className="text-gray-500">{key}:</span>{' '}
                            <span className="text-green-700">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
