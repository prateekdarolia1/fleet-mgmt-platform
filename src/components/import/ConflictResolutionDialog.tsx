/**
 * ConflictResolutionDialog - Dialog for resolving import conflicts
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import type { ReconciliationMatch } from '@/types/historical';

interface ConflictResolutionDialogProps {
  open: boolean;
  conflicts: ReconciliationMatch[];
  onResolve: (resolutions: Record<string, 'csv' | 'db' | 'manual'>) => void;
  onCancel: () => void;
}

export function ConflictResolutionDialog({
  open,
  conflicts,
  onResolve,
  onCancel,
}: ConflictResolutionDialogProps) {
  const [resolutions, setResolutions] = useState<Record<string, string>>({});

  const handleResolutionChange = (field: string, value: 'csv' | 'db' | 'manual') => {
    setResolutions((prev) => ({ ...prev, [field]: value }));
  };

  const handleConfirm = () => {
    // Convert resolutions to expected format
    const formattedResolutions: Record<string, 'csv' | 'db' | 'manual'> = {};
    Object.entries(resolutions).forEach(([key, value]) => {
      formattedResolutions[key] = value as 'csv' | 'db' | 'manual';
    });
    onResolve(formattedResolutions);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Resolve Conflicts ({conflicts.length})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {conflicts.map((conflict, index) => (
            <div key={index} className="border rounded-lg p-4">
              <h4 className="font-medium mb-2">
                Record: {conflict.csvRecord.rider_id || conflict.csvRecord.id || `Row ${index + 1}`}
              </h4>

              {conflict.conflicts && conflict.conflicts.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Field</TableHead>
                      <TableHead>CSV Value</TableHead>
                      <TableHead>DB Value</TableHead>
                      <TableHead>Resolution</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conflict.conflicts.map((conflictField, fieldIndex) => (
                      <TableRow key={fieldIndex}>
                        <TableCell className="font-medium">{conflictField.field}</TableCell>
                        <TableCell>
                          <code className="text-sm bg-muted px-1 rounded">
                            {String(conflictField.csvValue)}
                          </code>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm bg-muted px-1 rounded">
                            {String(conflictField.dbValue)}
                          </code>
                        </TableCell>
                        <TableCell>
                          <RadioGroup
                            value={resolutions[`${index}-${fieldIndex}`] || conflictField.resolution}
                            onValueChange={(value) =>
                              handleResolutionChange(`${index}-${fieldIndex}`, value as 'csv' | 'db' | 'manual')
                            }
                            className="flex gap-4"
                          >
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="csv" id={`csv-${index}-${fieldIndex}`} />
                              <Label htmlFor={`csv-${index}-${fieldIndex}`}>Use CSV</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="db" id={`db-${index}-${fieldIndex}`} />
                              <Label htmlFor={`db-${index}-${fieldIndex}`}>Keep DB</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="manual" id={`manual-${index}-${fieldIndex}`} />
                              <Label htmlFor={`manual-${index}-${fieldIndex}`}>Manual</Label>
                            </div>
                          </RadioGroup>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel Import
          </Button>
          <Button onClick={handleConfirm}>
            Apply Resolutions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
