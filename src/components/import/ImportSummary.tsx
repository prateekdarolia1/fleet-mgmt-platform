/**
 * ImportSummary - Shows results after import completion
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, Download, RotateCcw } from 'lucide-react';
import type { ImportWorkflowResult } from '@/lib/import/historicalImport';

interface ImportSummaryProps {
  result: ImportWorkflowResult;
  onReset: () => void;
  onRollback?: () => void;
}

export function ImportSummary({ result, onReset, onRollback }: ImportSummaryProps) {
  const { success, batchId, summary, phases, error } = result;

  const totalDuration = phases.reduce((sum, phase) => sum + phase.duration_ms, 0);

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {success ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            Import {success ? 'Completed' : 'Failed'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {success ? (
            <p className="text-muted-foreground">
              Import batch <code className="bg-muted px-1 rounded">{batchId}</code> completed successfully.
            </p>
          ) : (
            <div className="text-red-500">
              <p className="font-medium">Error: {error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Total Records Processed</TableCell>
                  <TableCell className="text-right">{summary.recordsTotal || 0}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Records Created</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="default">{summary.recordsCreated || 0}</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Records Updated</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">{summary.recordsUpdated || 0}</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Records Skipped</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline">{summary.recordsSkipped || 0}</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Ghost Entities Created</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="warning">{summary.ghostEntitiesCreated || 0}</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Retroactive Events Created</TableCell>
                  <TableCell className="text-right">{summary.retroactiveEventsCreated || 0}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Total Duration</TableCell>
                  <TableCell className="text-right">{(totalDuration / 1000).toFixed(2)}s</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Phase Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Phase Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phase</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {phases.map((phase, index) => (
                <TableRow key={index}>
                  <TableCell className="capitalize">{phase.phase}</TableCell>
                  <TableCell>
                    {phase.success ? (
                      <Badge variant="default" className="bg-green-500">Success</Badge>
                    ) : (
                      <Badge variant="destructive">Failed</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{(phase.duration_ms / 1000).toFixed(2)}s</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {success && onRollback && (
          <Button variant="outline" onClick={onRollback}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Rollback Import
          </Button>
        )}
        <Button variant="outline" onClick={onReset}>
          Import Another File
        </Button>
      </div>
    </div>
  );
}
