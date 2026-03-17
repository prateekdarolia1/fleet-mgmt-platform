/**
 * HistoricalDashboardToggle - Toggle between current and historical views
 */

import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { History, CalendarIcon } from 'lucide-react';
import { HistoricalMetricsCard } from './HistoricalMetricsCard';
import { useActiveRidersCountAtDate, useDeployedVehiclesCountAtDate } from '@/hooks/usePointInTimeQueries';
import { format } from 'date-fns';

interface HistoricalDashboardToggleProps {
  onDateChange?: (date: Date | null) => void;
}

export function HistoricalDashboardToggle({ onDateChange }: HistoricalDashboardToggleProps) {
  const [isHistoricalMode, setIsHistoricalMode] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const { data: ridersData } = useActiveRidersCountAtDate(selectedDate || new Date());
  const { data: vehiclesData } = useDeployedVehiclesCountAtDate(selectedDate || new Date());

  const handleToggle = (checked: boolean) => {
    setIsHistoricalMode(checked);
    if (!checked) {
      setSelectedDate(null);
      onDateChange?.(null);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      onDateChange?.(date);
      setCalendarOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      {/* Historical Mode Toggle */}
      <div className="flex items-center gap-2">
        <Switch
          id="historical-mode"
          checked={isHistoricalMode}
          onCheckedChange={handleToggle}
        />
        <Label htmlFor="historical-mode" className="flex items-center gap-1">
          <History className="h-4 w-4" />
          Historical View
        </Label>
      </div>

      {/* Date Picker (only shown in historical mode) */}
      {isHistoricalMode && (
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              {selectedDate ? format(selectedDate, 'PPP') : 'Select date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate || undefined}
              onSelect={handleDateSelect}
              disabled={(date) => date > new Date()}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      )}

      {/* Data Quality Indicator */}
      {isHistoricalMode && selectedDate && ridersData && (
        <div className="text-xs text-muted-foreground">
          Confidence: {(ridersData.avg_confidence_score * 100).toFixed(0)}%
        </div>
      )}
    </div>
  );
}

/**
 * Wrapper component that conditionally renders historical or current metrics
 */
interface HistoricalMetricsWrapperProps {
  children: React.ReactNode;
  historicalDate?: Date | null;
}

export function HistoricalMetricsWrapper({
  children,
  historicalDate,
}: HistoricalMetricsWrapperProps) {
  const { data: ridersData, isLoading: ridersLoading } = useActiveRidersCountAtDate(
    historicalDate || new Date()
  );
  const { data: vehiclesData, isLoading: vehiclesLoading } = useDeployedVehiclesCountAtDate(
    historicalDate || new Date()
  );

  // If no historical date, render current view
  if (!historicalDate) {
    return <>{children}</>;
  }

  // Render historical view
  const loading = ridersLoading || vehiclesLoading;

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Loading historical data...</p>
      </div>
    );
  }

  const metrics = {
    activeRiders: ridersData?.active_riders_count || 0,
    deployedVehicles: vehiclesData?.deployed_vehicles_count || 0,
    activeBatteries: 0, // Would need another hook
    totalRevenue: 0, // Would need revenue hook
    avgConfidence: ridersData?.avg_confidence_score || 1,
    dataQuality: ridersData?.data_quality || 'high',
  };

  return <HistoricalMetricsCard date={historicalDate} metrics={metrics} />;
}
