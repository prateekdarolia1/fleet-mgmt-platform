/**
 * Data Import Page - Main entry point for bulk import
 *
 * Supports multiple entity types: Vehicles, Batteries, Riders
 * Simplified MVP implementation demonstrating the import flow.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Upload, FileText, CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Import utilities
import { generateVehicleTemplate } from '@/lib/import/templates/vehicleTemplate';
import { generateBatteryTemplate } from '@/lib/import/templates/batteryTemplate';
import { downloadCSVTemplate, downloadErrorCSV } from '@/utils/import/csvDownloader';
import { parseCSVFile } from '@/lib/import/csv/parser';
import { validateVehicleRows } from '@/lib/import/validation/vehicleValidator';
import { validateBatteryRows } from '@/lib/import/validation/batteryValidator';
import { classifyValidationResults, getImportableRows } from '@/lib/import/validation/validationEngine';
import { detectAllDuplicates } from '@/lib/import/duplicates/duplicateDetector';
import { processBatchImport } from '@/lib/import/batch/batchProcessor';

import type { ImportProgress, ValidationResults, EntityType } from '@/types/import';

export function DataImportPage() {
  const [entityType, setEntityType] = useState<EntityType>('vehicles');
  const [templateDownloaded, setTemplateDownloaded] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResults | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [importComplete, setImportComplete] = useState(false);

  // Reset state when entity type changes
  const handleEntityTypeChange = (newEntityType: EntityType) => {
    setEntityType(newEntityType);
    setTemplateDownloaded(false);
    setSelectedFile(null);
    setValidationResults(null);
    setImportComplete(false);
    toast.info(`Switched to ${newEntityType} import mode. Download the new template.`);
  };

  // Step 1: Download Template
  const handleDownloadTemplate = () => {
    const template = entityType === 'batteries'
      ? generateBatteryTemplate()
      : generateVehicleTemplate();

    downloadCSVTemplate(template.headers, template.sampleRows, template.filename);
    setTemplateDownloaded(true);
    toast.success('Template downloaded! Fill it out and upload below.');
  };

  // Step 2: Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setValidationResults(null);
      setImportComplete(false);
      toast.info(`Selected: ${file.name}`);
    }
  };

  // Step 3: Validate CSV
  const handleValidate = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first');
      return;
    }

    setIsProcessing(true);
    try {
      // Parse CSV
      const parseResult = await parseCSVFile(selectedFile);
      if (!parseResult.success || !parseResult.data) {
        toast.error(parseResult.error || 'Failed to parse CSV');
        setIsProcessing(false);
        return;
      }

      // Validate rows using appropriate validator
      const rawRows = parseResult.data.map(r => r.data);
      const validatedRows = entityType === 'batteries'
        ? validateBatteryRows(rawRows)
        : validateVehicleRows(rawRows);

      // Classify results
      const results = classifyValidationResults(validatedRows);
      setValidationResults(results);

      toast.success(`Validation complete! ${results.validCount} valid, ${results.warningCount} warnings, ${results.invalidCount} errors`);
    } catch (error) {
      toast.error(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 4: Import data
  const handleImport = async () => {
    if (!validationResults) {
      toast.error('Please validate first');
      return;
    }

    if (validationResults.invalidCount > 0) {
      toast.error(`Cannot import: ${validationResults.invalidCount} rows have errors. Fix them and try again.`);
      return;
    }

    setIsProcessing(true);
    setImportProgress({
      totalRows: validationResults.validCount + validationResults.warningCount,
      processedRows: 0,
      successCount: 0,
      failureCount: 0,
      currentBatch: 0,
      totalBatches: 0,
      status: 'running',
      errors: [],
    });

    try {
      const importableRows = getImportableRows(validationResults);

      // Check for duplicates
      const duplicates = await detectAllDuplicates(importableRows, entityType);
      if (duplicates.length > 0) {
        toast.warning(`Found ${duplicates.length} duplicate(s). For MVP, duplicates will be skipped.`);
        // TODO: Implement duplicate resolution UI in full version
      }

      // Import
      const result = await processBatchImport(
        importableRows,
        entityType,
        (progress) => setImportProgress(progress)
      );

      const entityLabel = entityType === 'batteries' ? 'batteries' : 'vehicles';

      if (result.success) {
        toast.success(`Import complete! ${result.successCount} ${entityLabel} imported successfully.`);
      } else {
        toast.warning(`Import finished with errors: ${result.successCount} succeeded, ${result.failureCount} failed.`);

        // Download error CSV
        if (result.errors.length > 0) {
          const headers = Object.keys(result.errors[0].data);
          downloadErrorCSV(headers, result.errors);
          toast.info('Error report downloaded');
        }
      }

      setImportComplete(true);
    } catch (error) {
      toast.error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const entityLabels = {
    vehicles: 'Vehicle',
    batteries: 'Battery',
    riders: 'Rider',
  };

  const currentLabel = entityLabels[entityType];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Bulk Data Import
          </CardTitle>
          <CardDescription>
            Import {currentLabel.toLowerCase()}s from CSV in 3 simple steps
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 0: Entity Type Selection */}
          <div className="space-y-2">
            <h3 className="font-semibold">Select Import Type</h3>
            <Select value={entityType} onValueChange={handleEntityTypeChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select entity type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vehicles">Vehicles</SelectItem>
                <SelectItem value="batteries">Batteries</SelectItem>
                <SelectItem value="riders" disabled>Riders (Coming Soon)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Choose the type of data you want to import. Each type has its own template and validation rules.
            </p>
          </div>

          {/* Step 1: Download Template */}
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              Step 1: Download Template
              {templateDownloaded && <CheckCircle2 className="h-4 w-4 text-green-600" />}
            </h3>
            <Button
              onClick={handleDownloadTemplate}
              className="gap-2"
              variant={templateDownloaded ? "outline" : "default"}
            >
              <Download className="h-4 w-4" />
              Download {currentLabel} Import Template
            </Button>
          </div>

          {/* Step 2: Upload CSV */}
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              Step 2: Upload Filled CSV
              {selectedFile && <CheckCircle2 className="h-4 w-4 text-green-600" />}
            </h3>
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              disabled={!templateDownloaded}
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          {/* Step 3: Validate */}
          <div className="space-y-2">
            <h3 className="font-semibold">Step 3: Validate & Import</h3>
            <div className="flex gap-2">
              <Button
                onClick={handleValidate}
                disabled={!selectedFile || isProcessing}
                className="gap-2"
              >
                {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                Validate Data
              </Button>

              {validationResults && validationResults.invalidCount === 0 && (
                <Button
                  onClick={handleImport}
                  disabled={isProcessing}
                  variant="default"
                  className="gap-2"
                >
                  {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                  Import {currentLabel}s
                </Button>
              )}
            </div>
          </div>

          {/* Validation Results */}
          {validationResults && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-2xl font-bold">{validationResults.validCount}</p>
                        <p className="text-sm text-muted-foreground">Valid</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <div>
                        <p className="text-2xl font-bold">{validationResults.warningCount}</p>
                        <p className="text-sm text-muted-foreground">Warnings</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="text-2xl font-bold">{validationResults.invalidCount}</p>
                        <p className="text-sm text-muted-foreground">Errors</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {validationResults.invalidCount > 0 && (
                <Alert variant="destructive">
                  <AlertTitle>Cannot Import</AlertTitle>
                  <AlertDescription>
                    {validationResults.invalidCount} row(s) have errors. Please fix them and re-upload.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Import Progress */}
          {importProgress && importProgress.status === 'running' && (
            <div className="space-y-2">
              <h3 className="font-semibold">Importing...</h3>
              <Progress
                value={(importProgress.processedRows / importProgress.totalRows) * 100}
              />
              <p className="text-sm text-muted-foreground">
                {importProgress.processedRows} / {importProgress.totalRows} rows processed
                ({importProgress.successCount} succeeded, {importProgress.failureCount} failed)
              </p>
            </div>
          )}

          {/* Success Message */}
          {importComplete && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Import Complete!</AlertTitle>
              <AlertDescription>
                Your {currentLabel.toLowerCase()}s have been imported successfully. Check the {
                  entityType === 'batteries' ? 'Batteries' : 'Inventory Management'
                } tab to see them.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
