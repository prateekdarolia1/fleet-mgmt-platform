/**
 * HistoricalMetricsCard - Displays metrics for a historical date
 */

import React from 'react';
import { formatDateWithWeekday } from '@/lib/dateUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Truck, Battery, DollarSign } from 'lucide-react';
import type { ConfidenceLevel } from '@/types/historical';
import { DataQualityIndicator } from './DataQualityIndicator';

interface HistoricalMetrics {
  activeRiders: number;
  deployedVehicles: number;
  activeBatteries: number;
  totalRevenue: number;
  avgConfidence: number;
  dataQuality: ConfidenceLevel;
}

interface HistoricalMetricsCardProps {
  date: Date;
  metrics: HistoricalMetrics | null;
  loading?: boolean;
}

export function HistoricalMetricsCard({ date, metrics, loading }: HistoricalMetricsCardProps) {
  const formattedDate = formatDateWithWeekday(date);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            <Skeleton className="h-4 w-48" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">No Data Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No historical data available for {formattedDate}
          </p>
        </CardContent>
      </Card>
    );
  }

  const metricItems = [
    {
      label: 'Active Riders',
      value: metrics.activeRiders,
      icon: Users,
      color: 'text-blue-500',
    },
    {
      label: 'Deployed Vehicles',
      value: metrics.deployedVehicles,
      icon: Truck,
      color: 'text-green-500',
    },
    {
      label: 'Active Batteries',
      value: metrics.activeBatteries,
      icon: Battery,
      color: 'text-orange-500',
    },
    {
      label: 'Total Revenue',
      value: `₹${metrics.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-purple-500',
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-medium">Historical Snapshot</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">{formattedDate}</p>
        </div>
        <DataQualityIndicator
          score={metrics.avgConfidence}
          level={metrics.dataQuality}
        />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metricItems.map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center p-3 rounded-lg bg-muted/50"
            >
              <item.icon className={`h-5 w-5 ${item.color}`} />
              <span className="text-2xl font-bold mt-1">{item.value}</span>
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
