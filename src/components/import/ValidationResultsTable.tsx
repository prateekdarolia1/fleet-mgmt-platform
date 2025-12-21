/**
 * Validation Results Table - Detailed view of validation warnings and errors
 *
 * Shows row-by-row breakdown with expandable details for each issue
 */

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Download,
  Info,
} from 'lucide-react';
import { downloadValidationErrors } from '@/utils/import/csvDownloader';
import type { ValidationResults, ValidatedRow } from '@/types/import';

interface ValidationResultsTableProps {
  results: ValidationResults;
  entityType: 'vehicles' | 'batteries' | 'riders';
}

type FilterType = 'all' | 'valid' | 'warning' | 'invalid';

export function ValidationResultsTable({ results, entityType }: ValidationResultsTableProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Combine all rows (validRows contains all rows with status 'valid' or 'warning', invalidRows contains errors)
  const allRows = React.useMemo(() => {
    return [...results.validRows, ...results.warningRows, ...results.invalidRows];
  }, [results]);

  // Get filtered rows based on current filter
  const getFilteredRows = (): ValidatedRow[] => {
    switch (filter) {
      case 'valid':
        return results.validRows;
      case 'warning':
        return results.warningRows;
      case 'invalid':
        return results.invalidRows;
      default:
        return allRows;
    }
  };

  const filteredRows = getFilteredRows();

  // Toggle row expansion
  const toggleRow = (rowIndex: number) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rowIndex)) {
        newSet.delete(rowIndex);
      } else {
        newSet.add(rowIndex);
      }
      return newSet;
    });
  };

  // Expand all rows with issues
  const expandAllWithIssues = () => {
    const rowsWithIssues = new Set<number>();
    allRows.forEach((row) => {
      if (row.errors.length > 0 || row.warnings.length > 0) {
        rowsWithIssues.add(row.rowIndex);
      }
    });
    setExpandedRows(rowsWithIssues);
  };

  // Collapse all rows
  const collapseAll = () => {
    setExpandedRows(new Set());
  };

  // Download validation errors as CSV
  const handleDownloadErrors = () => {
    const rowsWithErrors = allRows.filter(
      (row) => row.errors.length > 0 || row.warnings.length > 0
    );

    if (rowsWithErrors.length === 0) {
      return;
    }

    const originalHeaders = Object.keys(rowsWithErrors[0].originalData);
    downloadValidationErrors(
      rowsWithErrors.map((row) => ({
        rowIndex: row.rowIndex,
        originalData: row.originalData,
        errors: [...row.errors, ...row.warnings],
      })),
      originalHeaders,
      `${entityType}_validation_errors_${Date.now()}.csv`
    );
  };

  // Get status icon and color
  const getStatusDisplay = (row: ValidatedRow) => {
    if (row.status === 'invalid') {
      return {
        icon: <XCircle className="h-4 w-4" />,
        badge: <Badge variant="destructive">Error</Badge>,
        color: 'text-red-600',
      };
    } else if (row.status === 'warning') {
      return {
        icon: <AlertTriangle className="h-4 w-4" />,
        badge: <Badge variant="outline" className="border-yellow-600 text-yellow-600">Warning</Badge>,
        color: 'text-yellow-600',
      };
    } else {
      return {
        icon: <CheckCircle2 className="h-4 w-4" />,
        badge: <Badge variant="outline" className="border-green-600 text-green-600">Valid</Badge>,
        color: 'text-green-600',
      };
    }
  };

  // Get preview of row data
  const getRowPreview = (row: ValidatedRow): string => {
    const data = row.originalData;
    const keys = Object.keys(data).slice(0, 3);
    const preview = keys.map((key) => {
      const value = String(data[key] || '');
      return value.length > 20 ? value.substring(0, 20) + '...' : value;
    }).join(' | ');
    return preview;
  };

  return (
    <div className="space-y-4">
      {/* Header with Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Validation Results
              </CardTitle>
              <CardDescription>
                Review all validation warnings and errors below
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={expandAllWithIssues}
                disabled={results.warningCount + results.invalidCount === 0}
              >
                Expand Issues
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={collapseAll}
                disabled={expandedRows.size === 0}
              >
                Collapse All
              </Button>
              {(results.warningCount > 0 || results.invalidCount > 0) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadErrors}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Report
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter Tabs */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All ({allRows.length})
            </Button>
            <Button
              variant={filter === 'valid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('valid')}
              className={filter === 'valid' ? '' : 'border-green-600 text-green-600'}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Valid ({results.validCount})
            </Button>
            <Button
              variant={filter === 'warning' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('warning')}
              className={filter === 'warning' ? '' : 'border-yellow-600 text-yellow-600'}
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Warnings ({results.warningCount})
            </Button>
            <Button
              variant={filter === 'invalid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('invalid')}
              className={filter === 'invalid' ? '' : 'border-red-600 text-red-600'}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Errors ({results.invalidCount})
            </Button>
          </div>

          {/* Important Notice for Errors */}
          {results.invalidCount > 0 && (
            <Alert variant="destructive" className="mb-4">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>{results.invalidCount} row(s) have errors and cannot be imported.</strong>
                <br />
                Please fix these errors or remove these rows from your CSV and re-upload.
              </AlertDescription>
            </Alert>
          )}

          {/* Important Notice for Warnings */}
          {results.warningCount > 0 && results.invalidCount === 0 && (
            <Alert className="mb-4 border-yellow-600">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>{results.warningCount} row(s) have warnings but can still be imported.</strong>
                <br />
                Review the warnings below to ensure data quality.
              </AlertDescription>
            </Alert>
          )}

          {/* Results Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="w-16">Row</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead className="w-24 text-center">Issues</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No rows match the current filter
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row) => {
                    const statusDisplay = getStatusDisplay(row);
                    const isExpanded = expandedRows.has(row.rowIndex);
                    const hasIssues = row.errors.length > 0 || row.warnings.length > 0;

                    return (
                      <React.Fragment key={row.rowIndex}>
                        <TableRow
                          className={`cursor-pointer hover:bg-muted/50 ${
                            hasIssues ? 'border-l-4' : ''
                          } ${
                            row.status === 'invalid'
                              ? 'border-l-red-600'
                              : row.status === 'warning'
                              ? 'border-l-yellow-600'
                              : ''
                          }`}
                          onClick={() => hasIssues && toggleRow(row.rowIndex)}
                        >
                          <TableCell>
                            {hasIssues && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleRow(row.rowIndex);
                                }}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {row.rowIndex + 2}
                          </TableCell>
                          <TableCell>
                            <div className={`flex items-center gap-1 ${statusDisplay.color}`}>
                              {statusDisplay.icon}
                              {statusDisplay.badge}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {getRowPreview(row)}
                          </TableCell>
                          <TableCell className="text-center">
                            {row.errors.length > 0 && (
                              <Badge variant="destructive" className="mr-1">
                                {row.errors.length} error{row.errors.length > 1 ? 's' : ''}
                              </Badge>
                            )}
                            {row.warnings.length > 0 && (
                              <Badge variant="outline" className="border-yellow-600 text-yellow-600">
                                {row.warnings.length} warning{row.warnings.length > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>

                        {/* Expanded Details */}
                        {isExpanded && hasIssues && (
                          <TableRow>
                            <TableCell colSpan={5} className="bg-muted/20">
                              <div className="py-4 px-6 space-y-4">
                                {/* Errors */}
                                {row.errors.length > 0 && (
                                  <div className="space-y-2">
                                    <h4 className="font-semibold text-red-600 flex items-center gap-2">
                                      <XCircle className="h-4 w-4" />
                                      Errors ({row.errors.length})
                                    </h4>
                                    <div className="space-y-2">
                                      {row.errors.map((error, idx) => (
                                        <Alert key={idx} variant="destructive">
                                          <AlertDescription>
                                            <div className="space-y-1">
                                              <div className="flex items-start gap-2">
                                                <Badge variant="outline" className="mt-0.5">
                                                  {error.field}
                                                </Badge>
                                                <div className="flex-1">
                                                  <p className="font-medium">{error.message}</p>
                                                  {error.suggestion && (
                                                    <p className="text-sm mt-1 opacity-90">
                                                      💡 {error.suggestion}
                                                    </p>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </AlertDescription>
                                        </Alert>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Warnings */}
                                {row.warnings.length > 0 && (
                                  <div className="space-y-2">
                                    <h4 className="font-semibold text-yellow-600 flex items-center gap-2">
                                      <AlertTriangle className="h-4 w-4" />
                                      Warnings ({row.warnings.length})
                                    </h4>
                                    <div className="space-y-2">
                                      {row.warnings.map((warning, idx) => (
                                        <Alert key={idx} className="border-yellow-600 bg-yellow-50">
                                          <AlertDescription>
                                            <div className="space-y-1">
                                              <div className="flex items-start gap-2">
                                                <Badge
                                                  variant="outline"
                                                  className="mt-0.5 border-yellow-600 text-yellow-600"
                                                >
                                                  {warning.field}
                                                </Badge>
                                                <div className="flex-1 text-yellow-800">
                                                  <p className="font-medium">{warning.message}</p>
                                                  {warning.suggestion && (
                                                    <p className="text-sm mt-1 opacity-90">
                                                      💡 {warning.suggestion}
                                                    </p>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </AlertDescription>
                                        </Alert>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Original Data Preview */}
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-sm text-muted-foreground">
                                    Row Data
                                  </h4>
                                  <div className="bg-muted/50 p-3 rounded-md">
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                      {Object.entries(row.originalData).slice(0, 6).map(([key, value]) => (
                                        <div key={key} className="flex gap-2">
                                          <span className="font-medium text-muted-foreground min-w-[120px]">
                                            {key}:
                                          </span>
                                          <span className="font-mono text-xs">
                                            {String(value || '(empty)')}
                                          </span>
                                        </div>
                                      ))}
                                      {Object.keys(row.originalData).length > 6 && (
                                        <div className="col-span-2 text-muted-foreground text-xs">
                                          ... and {Object.keys(row.originalData).length - 6} more fields
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Summary Footer */}
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredRows.length} of {allRows.length} total rows
            {filter !== 'all' && ` (filtered by ${filter})`}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
