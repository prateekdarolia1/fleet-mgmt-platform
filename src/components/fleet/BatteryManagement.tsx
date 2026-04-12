/**
 * Battery Management Component
 * DDD: Battery Domain Aggregate Management
 * SOLID: Single Responsibility - Manage battery inventory UI
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '@/lib/dateUtils';
import { useBatteriesList } from '@/hooks/useBatteriesList';
import type { BatteryListResult } from '@/lib/batteries/listBatteries';
import { AddBatteryModal } from './AddBatteryModal';
import { MapBatteryModal } from './MapBatteryModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Search, Loader2, Battery, Eye, Plus, Link } from 'lucide-react';

// DDD: Battery state for mapping operation
interface BatteryForMapping {
  id: string;          // UUID for API call
  battery_id: string;  // Display ID (e.g., "BAT00001")
}

export const BatteryManagement = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'MAPPED' | 'UNMAPPED'>('all');
  const [isAddBatteryModalOpen, setIsAddBatteryModalOpen] = useState(false);

  // SOLID: Single Responsibility - Map modal state management
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [selectedBatteryForMap, setSelectedBatteryForMap] = useState<BatteryForMapping | null>(null);

  // Fetch batteries with filtering
  const { data: batteriesData, isLoading } = useBatteriesList({
    mapped: statusFilter === 'all' ? undefined : (statusFilter === 'MAPPED'),
    search: searchTerm || undefined
  });

  const batteries = (batteriesData as BatteryListResult)?.batteries || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'MAPPED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'UNMAPPED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ACTIVE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Battery className="h-5 w-5 text-blue-600" />
          Battery Inventory
        </CardTitle>
        <CardDescription>
          Manage your fleet of {batteries.length} batteries across different zones
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters and Search */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by battery ID, USC ID, or zone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'all' | 'MAPPED' | 'UNMAPPED')
              }
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="MAPPED">Mapped</option>
              <option value="UNMAPPED">Unmapped</option>
            </select>

            {/* Add Battery Button */}
            <Button
              onClick={() => setIsAddBatteryModalOpen(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Battery
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="ml-3 text-gray-600">Loading batteries...</p>
          </div>
        ) : batteries.length === 0 ? (
          <div className="text-center py-12">
            <Battery className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-600 font-medium">No batteries found</p>
            <p className="text-sm text-gray-500 mt-1">
              {searchTerm
                ? 'Try adjusting your search filters'
                : 'Start by adding batteries to your inventory'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold">Battery ID (Lilypad)</TableHead>
                  <TableHead className="font-semibold">Service Provider</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Zone</TableHead>
                  <TableHead className="font-semibold">Battery Plan</TableHead>
                  <TableHead className="font-semibold">Created</TableHead>
                  <TableHead className="font-semibold text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batteries.map((battery) => (
                  <TableRow
                    key={battery.id}
                    className="cursor-pointer hover:bg-blue-50 transition-colors"
                    onClick={() => navigate(`/batteries/${battery.battery_id}`)}
                  >
                    <TableCell>
                      <div className="font-mono font-semibold text-blue-600">
                        {battery.battery_id}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{battery.service_provider || 'N/A'}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{getStatusIcon(battery.status)}</span>
                        <Badge className={`${getStatusColor(battery.status)} border`}>
                          {battery.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{battery.zone_id || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{battery.battery_plan || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500">
                        {formatDate(battery.created_at)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Map to Vehicle Button - DDD: Battery-Vehicle Mapping Action */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation(); // SOLID: Event delegation control
                            setSelectedBatteryForMap({
                              id: battery.id,
                              battery_id: battery.battery_id
                            });
                            setIsMapModalOpen(true);
                          }}
                          disabled={battery.status === 'MAPPED'}
                          className="gap-1"
                          title={battery.status === 'MAPPED' ? 'Battery is already mapped' : 'Map to vehicle'}
                        >
                          <Link className="h-4 w-4" />
                          Map
                        </Button>

                        {/* View Button */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/batteries/${battery.battery_id}`);
                          }}
                          className="gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Add Battery Modal */}
      <AddBatteryModal
        open={isAddBatteryModalOpen}
        onOpenChange={setIsAddBatteryModalOpen}
        onSuccess={() => {
          // Refresh the batteries list
          // The hook's onSuccess already invalidates the queries
        }}
      />

      {/* Map Battery Modal - DRY: Reusable modal for battery-vehicle mapping */}
      {selectedBatteryForMap && (
        <MapBatteryModal
          open={isMapModalOpen}
          onOpenChange={setIsMapModalOpen}
          batteryId={selectedBatteryForMap.id}
          batteryDisplayId={selectedBatteryForMap.battery_id}
          onSuccess={() => {
            // SOLID: Separation of concerns - modal handles its own success
            // The hook will auto-refresh via query invalidation
            setSelectedBatteryForMap(null);
          }}
        />
      )}
    </Card>
  );
};
