/**
 * Type definitions for the ERP-grade Bulk Data Import system
 *
 * This file contains all TypeScript interfaces and types used across the import system.
 * It serves as the foundation for type safety throughout the import pipeline.
 */

// ===== ENTITY TYPES =====

/**
 * Supported entity types for bulk import
 * v1: vehicles (focus)
 * v2: batteries, riders
 */
export type EntityType = 'vehicles' | 'batteries' | 'riders';

// ===== PARSED DATA =====

/**
 * Represents a single row from the parsed CSV file
 */
export interface ParsedRow {
  /** Original row number in the CSV file (0-indexed) */
  rowIndex: number;
  /** Raw CSV data as key-value pairs */
  data: Record<string, any>;
}

// ===== HEADER MAPPING =====

/**
 * Maps CSV column headers to database field names
 * null value means the column is unmapped/ignored
 */
export interface HeaderMapping {
  [csvHeader: string]: string | null;
}

/**
 * Defines the characteristics and validation rules for a single field
 */
export interface FieldDefinition {
  /** Database column name */
  dbField: string;
  /** User-friendly display name */
  displayName: string;
  /** Whether this field is required */
  required: boolean;
  /** Data type of the field */
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'enum';
  /** Allowed values for enum types */
  enumValues?: string[];
  /** Custom validation function */
  validator?: (value: any) => ValidationError | null;
  /** Transformation function to normalize/convert values */
  transformer?: (value: any) => any;
  /** Example value for template generation */
  example: string;
  /** Help text describing the field */
  description?: string;
}

// ===== VALIDATION =====

/**
 * Severity levels for validation messages
 * - error: Blocks import
 * - warning: Allows import with user awareness
 * - info: Informational only
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * Represents a single validation issue
 */
export interface ValidationError {
  /** Field name that has the issue */
  field: string;
  /** Severity level */
  severity: ValidationSeverity;
  /** Machine-readable error code */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Optional suggestion for fixing the error */
  suggestion?: string;
}

/**
 * Represents a validated row with classification
 */
export interface ValidatedRow {
  /** Original row index in CSV */
  rowIndex: number;
  /** Original data from CSV */
  originalData: Record<string, any>;
  /** Transformed and normalized data ready for DB */
  transformedData: Record<string, any>;
  /** List of errors (blocks import) */
  errors: ValidationError[];
  /** List of warnings (allows import) */
  warnings: ValidationError[];
  /** Overall status of the row */
  status: 'valid' | 'warning' | 'invalid';
}

/**
 * Complete validation results for all rows
 */
export interface ValidationResults {
  /** Total number of rows validated */
  totalRows: number;
  /** Rows with 0 errors (may have warnings) */
  validRows: ValidatedRow[];
  /** Rows with warnings but 0 errors */
  warningRows: ValidatedRow[];
  /** Rows with errors (cannot import) */
  invalidRows: ValidatedRow[];
  /** Count of valid rows */
  validCount: number;
  /** Count of rows with warnings */
  warningCount: number;
  /** Count of invalid rows */
  invalidCount: number;
}

// ===== DUPLICATE DETECTION =====

/**
 * Represents a group of duplicate records
 */
export interface DuplicateGroup {
  /** Unique identifier for this duplicate group (e.g., "vehicle_number:DL01AB1234") */
  uniqueKey: string;
  /** Existing record from database (if found) */
  existingRecord?: any;
  /** New records from CSV that conflict */
  newRecords: ValidatedRow[];
  /** Type of conflict */
  conflictType: 'database' | 'csv' | 'both';
}

/**
 * User's choice for handling duplicates
 */
export type DuplicateStrategy = 'reject' | 'skip' | 'update';

/**
 * Resolution details for duplicates
 */
export interface DuplicateResolution {
  /** Strategy chosen by user */
  strategy: DuplicateStrategy;
  /** Row indices affected by this resolution */
  affectedRows: number[];
}

// ===== IMPORT SESSION =====

/**
 * Represents the complete state of an import session
 * Persists across steps in the wizard
 */
export interface ImportSession {
  /** Unique session identifier */
  sessionId: string;
  /** Type of entity being imported */
  entityType: EntityType;
  /** The uploaded CSV file */
  uploadedFile: File | null;
  /** When the file was uploaded */
  uploadTimestamp: Date;
  /** Parsed data from CSV */
  parsedData: ParsedRow[];
  /** Mapping of CSV headers to DB fields */
  headerMapping: HeaderMapping;
  /** Results of validation (if validation step completed) */
  validationResults?: ValidationResults;
  /** Detected duplicate groups */
  duplicateGroups?: DuplicateGroup[];
  /** User's resolution for duplicates */
  duplicateResolution?: DuplicateResolution;
  /** Current step in the wizard (0-7) */
  currentStep: number;
  /** Whether template was downloaded (required before upload) */
  templateDownloaded: boolean;
}

// ===== IMPORT PROGRESS =====

/**
 * Real-time progress tracking during import
 */
export interface ImportProgress {
  /** Total rows to import */
  totalRows: number;
  /** Rows processed so far */
  processedRows: number;
  /** Successful imports */
  successCount: number;
  /** Failed imports */
  failureCount: number;
  /** Current batch being processed */
  currentBatch: number;
  /** Total number of batches */
  totalBatches: number;
  /** Overall import status */
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
  /** Errors encountered during import */
  errors: Array<{
    rowIndex: number;
    error: string;
  }>;
}

// ===== IMPORT RESULT =====

/**
 * Final result of the import operation
 */
export interface ImportResult {
  /** Whether the import was successful overall */
  success: boolean;
  /** Total rows attempted */
  totalAttempted: number;
  /** Successfully imported rows */
  successCount: number;
  /** Failed imports */
  failureCount: number;
  /** Skipped rows (duplicates with skip strategy) */
  skippedCount: number;
  /** Detailed error information */
  errors: Array<{
    rowIndex: number;
    data: Record<string, any>;
    error: string;
  }>;
  /** IDs of newly inserted records */
  insertedIds: string[];
  /** IDs of updated records (if update strategy used) */
  updatedIds: string[];
  /** Duration of import in milliseconds */
  duration: number;
  /** When the import completed */
  timestamp: Date;
}

// ===== CSV TEMPLATE =====

/**
 * Structure for downloadable CSV templates
 */
export interface CSVTemplate {
  /** Filename for the template */
  filename: string;
  /** Column headers */
  headers: string[];
  /** Sample data rows */
  sampleRows: string[][];
  /** Documentation/instructions text */
  instructions: string;
}

// ===== STEP COMPONENT PROPS =====

/**
 * Common props for wizard step components
 */
export interface StepComponentProps {
  /** Current import session state */
  session: ImportSession;
  /** Callback to update session and move to next step */
  onNext: (updates: Partial<ImportSession>) => void;
  /** Callback to go back to previous step */
  onBack: () => void;
  /** Callback to reset the entire wizard */
  onReset: () => void;
}
