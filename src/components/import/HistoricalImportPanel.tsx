/**
 * HistoricalImportPanel - Main panel for historical data import
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { ImportPreview } from './ImportPreview';
import { ImportProgress } from './ImportProgress';
import { ImportSummary } from './ImportSummary';
import { executeImportWorkflow, type ImportWorkflowResult } from '@/lib/import/historicalImport';
import type { DataSource } from '@/types/historical';

type ImportPhase = 'idle' | 'upload' | 'preview' | 'importing' | 'complete' | 'error';

export function HistoricalImportPanel() {
  const [phase, setPhase] = useState<ImportPhase>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [batchName, setBatchName] = useState('');
  const [dataSource, setDataSource] = useState<DataSource>('CL87_CSV');
  const [dryRun, setDryRun] = useState(false);
  const [result, setResult] = useState<ImportWorkflowResult | null>(null);
  const [csvContent, setCsvContent] = useState<string>('');
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setBatchName(selectedFile.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handlePreview = async () => {
    if (!file) return;

    setPhase('upload');
    try {
      const content = await file.text();
      setCsvContent(content);
      setPhase('preview');
    } catch (error) {
      toast({
        title: 'Error reading file',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      setPhase('error');
    }
  };

  const handleImport = async () => {
    if (!csvContent) return;

    setPhase('importing');
    try {
      const importResult = await executeImportWorkflow(csvContent, {
        batchName,
        sourceFile: file?.name || 'unknown',
        dataSource,
        createGhostRecords: true,
        applyDateEstimation: true,
        dryRun,
      });

      setResult(importResult);
      setPhase('complete');

      if (importResult.success) {
        toast({
          title: 'Import completed',
          description: `Created ${importResult.summary?.recordsCreated || 0} records`,
        });
      } else {
        toast({
          title: 'Import failed',
          description: importResult.error || 'Unknown error',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      setPhase('error');
    }
  };

  const handleReset = () => {
    setPhase('idle');
    setFile(null);
    setBatchName('');
    setResult(null);
    setCsvContent('');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Historical Data Import</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Phase: Idle - File Upload */}
        {phase === 'idle' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="file">CSV File</Label>
              <Input
                id="file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
              />
            </div>

            <div>
              <Label htmlFor="batchName">Batch Name</Label>
              <Input
                id="batchName"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                placeholder="Enter batch name"
              />
            </div>

            <div>
              <Label htmlFor="dataSource">Data Source</Label>
              <Select value={dataSource} onValueChange={(v) => setDataSource(v as DataSource)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CL87_CSV">CL87 CSV Export</SelectItem>
                  <SelectItem value="EXACT_REVENUE_CSV">Exact Revenue CSV</SelectItem>
                  <SelectItem value="BATTERY_SMART_CSV">Battery Smart Export</SelectItem>
                  <SelectItem value="PAYMENT_RECORDS_CSV">Payment Records CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="dryRun"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="dryRun">Dry Run (preview only, no database changes)</Label>
            </div>

            <Button
              onClick={handlePreview}
              disabled={!file || !batchName}
              className="w-full"
            >
              Preview Import
            </Button>
          </div>
        )}

        {/* Phase: Preview */}
        {phase === 'preview' && csvContent && (
          <ImportPreview
            csvContent={csvContent}
            dataSource={dataSource}
            onConfirm={handleImport}
            onCancel={handleReset}
          />
        )}

        {/* Phase: Importing */}
        {phase === 'importing' && (
          <ImportProgress />
        )}

        {/* Phase: Complete */}
        {phase === 'complete' && result && (
          <ImportSummary
            result={result}
            onReset={handleReset}
          />
        )}

        {/* Phase: Error */}
        {phase === 'error' && (
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">Import failed</p>
            <Button onClick={handleReset}>Try Again</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
