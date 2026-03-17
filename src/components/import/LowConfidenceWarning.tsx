/**
 * LowConfidenceWarning - Shows warnings for low confidence records
 */

import React from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ConfidenceLevel } from '@/types/historical';

interface LowConfidenceRecord {
  id: string;
  type: 'rider' | 'vehicle' | 'battery' | 'payment';
  field: string;
  estimatedValue: unknown;
  confidenceScore: number;
  estimationMethod: string;
  reason: string;
}

interface LowConfidenceWarningProps {
  records: LowConfidenceRecord[];
  onAcceptAll?: () => void;
  onReviewManually?: () => void;
}

export function LowConfidenceWarning({
  records,
  onAcceptAll,
  onReviewManually,
}: LowConfidenceWarningProps) {
  if (records.length === 0) return null;

  const groupedByConfidence = records.reduce(
    (acc, record) => {
      const level = getConfidenceLevel(record.confidenceScore);
      if (!acc[level]) acc[level] = [];
      acc[level].push(record);
      return acc;
    },
    {} as Record<ConfidenceLevel, LowConfidenceRecord[]>
  );

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <AlertTriangle className="h-5 w-5" />
          Low Confidence Records ({records.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-orange-700">
          The following records have estimated or missing data. Please review before proceeding.
        </p>

        {/* Confidence Level Summary */}
        <div className="flex gap-4 flex-wrap">
          {groupedByConfidence.low && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {groupedByConfidence.low.length} Low
            </Badge>
          )}
          {groupedByConfidence.moderate && (
            <Badge variant="warning" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {groupedByConfidence.moderate.length} Moderate
            </Badge>
          )}
          {groupedByConfidence.high && (
            <Badge variant="default" className="flex items-center gap-1 bg-green-500">
              <Info className="h-3 w-3" />
              {groupedByConfidence.high.length} High
            </Badge>
          )}
        </div>

        {/* Records Table */}
        <div className="max-h-60 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Field</TableHead>
                <TableHead>Estimated Value</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Method</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.slice(0, 20).map((record, index) => (
                <TableRow key={index}>
                  <TableCell className="font-mono text-xs">{record.id}</TableCell>
                  <TableCell className="capitalize">{record.type}</TableCell>
                  <TableCell>{record.field}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1 rounded">
                      {String(record.estimatedValue)}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        record.confidenceScore >= 0.9
                          ? 'default'
                          : record.confidenceScore >= 0.7
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
                      {(record.confidenceScore * 100).toFixed(0)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {record.estimationMethod}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {records.length > 20 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              And {records.length - 20} more records...
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          {onReviewManually && (
            <button
              onClick={onReviewManually}
              className="text-sm text-orange-700 hover:text-orange-800 underline"
            >
              Review Manually
            </button>
          )}
          {onAcceptAll && (
            <button
              onClick={onAcceptAll}
              className="text-sm text-orange-700 hover:text-orange-800 underline"
            >
              Accept All Estimates
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 0.9) return 'high';
  if (score >= 0.7) return 'moderate';
  return 'low';
}
