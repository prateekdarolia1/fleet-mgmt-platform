/**
 * ImportPreview - Shows preview of import before execution
 */

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import type { DataSource, ImportPreviewReport } from '@/types/historical';
import { generatePreviewReport, getReconciliationSummary } from '@/lib/import/reconciliationEngine';

interface ImportPreviewProps {
  csvContent: string;
  dataSource: DataSource;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ImportPreview({ csvContent, dataSource, onConfirm, onCancel }: ImportPreviewProps) {
  const [report, setReport] = useState<ImportPreviewReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPreview() {
      try {
        setLoading(true);
        // Parse CSV
        const lines = csvContent.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const records: Record<string, unknown>[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          if (values.length === headers.length) {
            const record: Record<string, unknown> = {};
            headers.forEach((header, index) => {
              record[header] = values[index];
            });
            records.push(record);
          }
        }

        // Generate preview report
        const previewReport = generatePreviewReport(
          records,
          [], // No existing records for now
          'rider_id',
          ['name', 'phone', 'status', 'vehicle_assigned'],
          dataSource
        );

        setReport(previewReport);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate preview');
      } finally {
        setLoading(false);
      }
    }

    loadPreview();
  }, [csvContent, dataSource]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Analyzing import data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
        <p className="mt-2 text-red-500">{error}</p>
        <Button variant="outline" onClick={onCancel} className="mt-4">
          Cancel
        </Button>
      </div>
    );
  }

  if (!report) return null;

  const { summary, warnings, needsAttention } = report;

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {needsAttention ? (
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            Import Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{summary}</p>

          {/* Statistics Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Exact Matches
                </TableCell>
                <TableCell className="text-right">{report.exactMatches}</TableCell>
                <TableCell><Badge variant="secondary">Skip</Badge></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Conflicts
                </TableCell>
                <TableCell className="text-right">{report.conflicts}</TableCell>
                <TableCell><Badge variant="warning">Update</Badge></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-500" />
                  New Records
                </TableCell>
                <TableCell className="text-right">{report.newRecords}</TableCell>
                <TableCell><Badge>Create</Badge></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-gray-500" />
                  Missing in CSV
                </TableCell>
                <TableCell className="text-right">{report.missingInCSV}</TableCell>
                <TableCell><Badge variant="outline">No action</Badge></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Warnings */}
      {warnings.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <h4 className="font-medium text-yellow-800 mb-2">Warnings</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              {warnings.map((warning, index) => (
                <li key={index} className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  {warning}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Data Quality Warnings */}
      {report.lowConfidenceRecords > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <h4 className="font-medium text-orange-800 mb-2">Low Confidence Records</h4>
            <p className="text-sm text-orange-700">
              {report.lowConfidenceRecords} records have low confidence scores and may require manual review.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Ghost Records */}
      {report.ghostRecordsNeeded > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <h4 className="font-medium text-blue-800 mb-2">Ghost Records</h4>
            <p className="text-sm text-blue-700">
              {report.ghostRecordsNeeded} placeholder records will be created for referenced entities not in the database.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onConfirm}>
          Proceed with Import
        </Button>
      </div>
    </div>
  );
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}
