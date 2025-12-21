import { Badge } from '@/components/ui/badge';
import { Battery, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import type { BatteryDetail } from '@/hooks/useBatteryDetail';

interface BatteryDetailHeaderProps {
  battery: BatteryDetail;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'MAPPED':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'UNMAPPED':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'ACTIVE':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'MAPPED':
      return '🟢';
    case 'UNMAPPED':
      return '🟡';
    case 'ACTIVE':
      return '🔵';
    default:
      return '⚪';
  }
};

export const BatteryDetailHeader = ({ battery }: BatteryDetailHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/')}
          className="h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Battery className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Battery ID: <span className="font-mono">{battery.battery_id}</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Lilypad Internal Battery Identifier
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getStatusIcon(battery.status)}</span>
          <Badge className={`${getStatusColor(battery.status)} border`}>
            {battery.status}
          </Badge>
        </div>

        {battery.service_provider && (
          <div className="text-sm">
            <p className="text-gray-500">Service Provider</p>
            <p className="font-semibold">{battery.service_provider}</p>
          </div>
        )}

        {battery.battery_plan && (
          <div className="text-sm">
            <p className="text-gray-500">Battery Plan</p>
            <p className="font-semibold">{battery.battery_plan}</p>
          </div>
        )}
      </div>
    </div>
  );
};
