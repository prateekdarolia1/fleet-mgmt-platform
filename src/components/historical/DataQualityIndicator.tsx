/**
 * DataQualityIndicator - Shows data quality/confidence level
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import type { ConfidenceLevel } from '@/types/historical';

interface DataQualityIndicatorProps {
  score: number; // 0.00 - 1.00
  level: ConfidenceLevel;
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const QUALITY_CONFIG: Record<
  ConfidenceLevel,
  {
    label: string;
    color: string;
    bgColor: string;
    icon: typeof CheckCircle;
    description: string;
  }
> = {
  high: {
    label: 'High',
    color: 'text-green-600',
    bgColor: 'bg-green-100 border-green-200',
    icon: CheckCircle,
    description: 'Data verified from reliable sources',
  },
  moderate: {
    label: 'Moderate',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 border-yellow-200',
    icon: AlertTriangle,
    description: 'Data partially estimated, may need review',
  },
  low: {
    label: 'Low',
    color: 'text-red-600',
    bgColor: 'bg-red-100 border-red-200',
    icon: AlertCircle,
    description: 'Data heavily estimated, manual verification recommended',
  },
};

const SIZE_CONFIG = {
  sm: { icon: 'h-3 w-3', text: 'text-xs', padding: 'px-2 py-0.5' },
  md: { icon: 'h-4 w-4', text: 'text-sm', padding: 'px-2.5 py-1' },
  lg: { icon: 'h-5 w-5', text: 'text-base', padding: 'px-3 py-1.5' },
};

export function DataQualityIndicator({
  score,
  level,
  showScore = false,
  size = 'md',
}: DataQualityIndicatorProps) {
  const config = QUALITY_CONFIG[level];
  const sizeConfig = SIZE_CONFIG[size];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`${config.bgColor} ${config.color} ${sizeConfig.padding} cursor-help`}
          >
            <Icon className={`${sizeConfig.icon} mr-1`} />
            <span className={sizeConfig.text}>
              {config.label}
              {showScore && ` (${(score * 100).toFixed(0)}%)`}
            </span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">Confidence: {(score * 100).toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Compact inline quality indicator
 */
export function DataQualityBadge({ score }: { score: number }) {
  const level = getLevelFromScore(score);
  const config = QUALITY_CONFIG[level];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 ${config.color}`}>
      <Icon className="h-3 w-3" />
      <span className="text-xs">{(score * 100).toFixed(0)}%</span>
    </span>
  );
}

/**
 * Progress bar style quality indicator
 */
export function DataQualityBar({ score, className = '' }: { score: number; className?: string }) {
  const level = getLevelFromScore(score);
  const percentage = score * 100;

  const barColor = {
    high: 'bg-green-500',
    moderate: 'bg-yellow-500',
    low: 'bg-red-500',
  }[level];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">{percentage.toFixed(0)}%</span>
    </div>
  );
}

function getLevelFromScore(score: number): ConfidenceLevel {
  if (score >= 0.9) return 'high';
  if (score >= 0.7) return 'moderate';
  return 'low';
}
